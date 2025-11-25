import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, courseId, language = 'english' } = await req.json();
    
    if (!message) {
      throw new Error('Message is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get course context if courseId is provided
    let courseContext = '';
    if (courseId) {
      const { data: course } = await supabase
        .from('courses')
        .select('*, chapters(*), course_materials(*)')
        .eq('id', courseId)
        .single();

      if (course) {
        courseContext = `
Course: ${course.title}
Description: ${course.description}

Chapters:
${course.chapters?.map((ch: any) => `- ${ch.title}: ${ch.description}`).join('\n')}

Materials:
${course.course_materials?.map((m: any) => `- ${m.title}`).join('\n')}
`;
      }
    }

    const systemPrompt = `You are a helpful AI tutor for a learning platform. You help students understand course content, answer questions, and provide explanations. 
${courseContext ? `\nCurrent course context:\n${courseContext}` : ''}
Always respond in ${language}.
Be encouraging, clear, and educational. Break down complex topics into simple explanations.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('AI API error:', error);
      throw new Error('Failed to get AI response');
    }

    const data = await response.json();
    const aiMessage = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ message: aiMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-chat function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});