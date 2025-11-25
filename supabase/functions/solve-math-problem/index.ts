import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageData, language, userId, imageUrl } = await req.json();
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const languageInstructions = {
      english: 'Respond in English',
      hausa: 'Respond in Hausa language',
      yoruba: 'Respond in Yoruba language',
      igbo: 'Respond in Igbo language'
    };

    const systemPrompt = `You are an expert math tutor. ${languageInstructions[language as keyof typeof languageInstructions]}.

When given an image of a math problem:
1. Extract the problem accurately
2. Identify the math concepts involved (algebra, geometry, calculus, etc.)
3. Solve step-by-step with clear explanations
4. Show all work and calculations
5. Provide the final answer

Format your response with these sections:
**Problem**: [extracted problem text]
**Type**: [subject area like Algebra, Geometry, etc.]
**Solution**:
Step 1: [detailed explanation]
Step 2: [detailed explanation]
...
**Answer**: [final answer clearly stated]
**Key Concepts**: [list the main concepts used]

Be encouraging and educational. Explain WHY each step is necessary.`;

    console.log('Calling Lovable AI Gateway with Gemini Vision...');
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: systemPrompt },
              { 
                type: 'image_url', 
                image_url: { 
                  url: imageData
                } 
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const solution = data.choices[0].message.content;

    console.log('Solution generated successfully');

    // Store in database
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (supabaseUrl && supabaseKey) {
      await fetch(`${supabaseUrl}/rest/v1/math_solutions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          user_id: userId,
          image_url: imageUrl,
          solution,
          language
        })
      });
    }

    return new Response(JSON.stringify({ solution }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in solve-math-problem function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
