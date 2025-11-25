import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transaction } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Syncing offline transaction:', transaction);

    // Handle different transaction types
    switch (transaction.type) {
      case 'enrollment':
        await supabase.from('enrollments').upsert(transaction.data);
        break;
      
      case 'quiz_submission':
        await supabase.from('quiz_submissions').insert(transaction.data);
        break;
      
      case 'progress_update':
        await supabase.from('enrollments')
          .update({ progress: transaction.data.progress })
          .eq('id', transaction.data.enrollment_id);
        break;

      default:
        console.log('Unknown transaction type:', transaction.type);
    }

    console.log('Transaction synced successfully');

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error syncing offline data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
