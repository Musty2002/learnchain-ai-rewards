import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { courseId, hobby } = await req.json();
    console.log('Generating projects for course:', courseId, 'hobby:', hobby);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

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

    // Get course details
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (courseError) throw courseError;

    // Create AI prompt
    const systemPrompt = `You are an educational AI mentor for LearnChain. Generate 3 personalized micro-projects for students.

Rules:
1. Each project MUST relate to their hobby: "${hobby}"
2. Projects should teach concepts from the course: "${course.title}"
3. Make it fun, practical, and achievable
4. Each project takes 15-30 minutes
5. Return ONLY valid JSON, no extra text

Response format (strict JSON):
{
  "projects": [
    {
      "title": "Project name (max 60 chars)",
      "description": "What to do (2-3 sentences)",
      "reward": 10
    }
  ]
}`;

    const userPrompt = `Generate 3 micro-projects for a student learning "${course.title}" (${course.category} level) who loves ${hobby}.`;

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'generate_projects',
            description: 'Generate personalized learning projects',
            parameters: {
              type: 'object',
              properties: {
                projects: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      description: { type: 'string' },
                      reward: { type: 'number' }
                    },
                    required: ['title', 'description', 'reward']
                  }
                }
              },
              required: ['projects']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'generate_projects' } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits depleted. Please contact support.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI API error: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI response:', JSON.stringify(aiData));

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call in AI response');
    }

    const parsedProjects = JSON.parse(toolCall.function.arguments);
    const projects = parsedProjects.projects;

    // Save projects to database
    const projectsToInsert = projects.map((p: any) => ({
      user_id: user.id,
      course_id: courseId,
      title: p.title,
      description: p.description,
      hobby_context: hobby,
      reward_amount: p.reward || 10,
      status: 'pending'
    }));

    const { data: insertedProjects, error: insertError } = await supabase
      .from('projects')
      .insert(projectsToInsert)
      .select();

    if (insertError) throw insertError;

    console.log('Projects created:', insertedProjects.length);

    return new Response(JSON.stringify({ projects: insertedProjects }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-projects:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});