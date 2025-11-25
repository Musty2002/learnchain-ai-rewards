import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Compute SHA256 hash
async function computeHash(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, approved } = await req.json();
    console.log('Verifying project:', projectId, 'approved:', approved);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Check if user is teacher or admin
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isAuthorized = roles?.some(r => r.role === 'teacher' || r.role === 'admin');
    if (!isAuthorized) {
      throw new Error('Only teachers and admins can verify projects');
    }

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*, wallets(id)')
      .eq('id', projectId)
      .single();

    if (projectError) throw projectError;

    // Compute proof hash (immutable proof for future on-chain verification)
    const hashInput = `${projectId}:${project.user_id}:${project.title}:${Date.now()}`;
    const proofHash = await computeHash(hashInput);

    // Update project status
    const { error: updateError } = await supabase
      .from('projects')
      .update({
        status: approved ? 'approved' : 'rejected',
        verified_by: user.id,
        verified_at: new Date().toISOString(),
        proof_hash: approved ? proofHash : null
      })
      .eq('id', projectId);

    if (updateError) throw updateError;

    // If approved, issue reward
    if (approved) {
      const { data: wallet } = await supabase
        .from('wallets')
        .select('id, balance')
        .eq('user_id', project.user_id)
        .single();

      if (wallet) {
        // Insert reward transaction
        const { error: txError } = await supabase
          .from('transactions')
          .insert({
            wallet_id: wallet.id,
            type: 'reward',
            amount: project.reward_amount,
            project_id: projectId,
            metadata: { proof_hash: proofHash }
          });

        if (txError) throw txError;

        // Update wallet balance
        const { error: balanceError } = await supabase
          .from('wallets')
          .update({ balance: wallet.balance + project.reward_amount })
          .eq('id', wallet.id);

        if (balanceError) throw balanceError;

        console.log(`Issued ${project.reward_amount} LCT to user ${project.user_id}`);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      proofHash: approved ? proofHash : null 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in verify-project:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});