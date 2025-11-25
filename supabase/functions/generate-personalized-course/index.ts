import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { courseId, hobby, language = "english", generateVideoOnly = false } = await req.json();
    
    if (!courseId || !hobby) {
      return new Response(
        JSON.stringify({ error: "courseId and hobby are required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const languageInstruction = language !== "english" 
      ? `\n\nIMPORTANT: Generate ALL content in ${language.charAt(0).toUpperCase() + language.slice(1)} language. All text, questions, answers, and descriptions must be in ${language.charAt(0).toUpperCase() + language.slice(1)}.`
      : "";

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    // Privileged client for server-side inserts (bypasses RLS where needed)
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Fetch course details
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("*")
      .eq("id", courseId)
      .single();

    if (courseError || !course) {
      return new Response(
        JSON.stringify({ error: "Course not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // If generateVideoOnly, just generate and update video
    if (generateVideoOnly) {
      // Video generation with Veo 3 requires a long-running operation with polling
      // This is not suitable for synchronous edge function calls
      // For now, we'll return an informative error
      return new Response(
        JSON.stringify({ 
          error: "Video generation is currently unavailable. The Veo 3 API requires a long-running asynchronous operation that isn't supported in this edge function. Please implement a background worker or use a different video generation service."
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 501 }
      );
    }

    // Fetch existing chapters
    let { data: chapters } = await supabase
      .from("chapters")
      .select("*")
      .eq("course_id", courseId)
      .order("chapter_order");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // If no chapters exist, generate them with AI
    if (!chapters || chapters.length === 0) {
      const chaptersPrompt = `You are an expert curriculum designer. Create 3-4 chapters for a course personalized for someone interested in "${hobby}".

Course: ${course.title}
Description: ${course.description}

Create engaging chapter titles and descriptions that connect the course content to the student's hobby "${hobby}". Make it practical and progressive.${languageInstruction}

Format your response as JSON:
{
  "chapters": [
    {
      "title": "Chapter title (relate to ${hobby})",
      "description": "Brief description of what will be covered",
      "content": "Detailed chapter content in markdown format (2-3 paragraphs)"
    }
  ]
}`;

      const chaptersResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "user", content: chaptersPrompt }
          ],
          response_format: { type: "json_object" }
        }),
      });

      if (chaptersResponse.ok) {
        const chaptersData = await chaptersResponse.json();
        const chaptersContent = JSON.parse(chaptersData.choices[0].message.content);

        // Insert chapters
        const chaptersToInsert = chaptersContent.chapters.map((ch: any, index: number) => ({
          course_id: courseId,
          title: ch.title,
          description: ch.description,
          content: ch.content,
          chapter_order: index + 1
        }));

        const { data: insertedChapters } = await admin
          .from("chapters")
          .insert(chaptersToInsert)
          .select();

        chapters = insertedChapters || [];
      }
    }

    // Define materials prompt for later use
    const materialsPrompt = `You are an expert educational content creator. Generate personalized course handout/notes for a student interested in "${hobby}".

Course: ${course.title}
Description: ${course.description}

Create engaging, personalized course introduction materials that connect the course content to the student's hobby "${hobby}". Make it practical and relatable.${languageInstruction}

Format your response as JSON:
{
  "title": "Introduction to [Course Name] for [Hobby] Enthusiasts",
  "content": "Comprehensive markdown content that includes:\n- Introduction connecting the course to their hobby\n- Key learning objectives\n- Real-world applications related to their hobby\n- Fun facts and motivational content"
}`;

    // Note: Video generation with Veo 3 requires long-running operations
    // which aren't suitable for synchronous edge functions. Skipping for now.
    const videoUrl = null;

    // Enroll the user immediately with video URL
    const { error: enrollError } = await supabase
      .from("enrollments")
      .insert({
        user_id: user.id,
        course_id: courseId,
        video_url: videoUrl
      });

    if (enrollError) {
      console.error("Enrollment error:", enrollError);
      return new Response(
        JSON.stringify({ error: "Failed to enroll in course" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Generate content in background without blocking the response
    const generateContentInBackground = async () => {
      try {
        console.log("Starting background content generation for course:", courseId);
        
        // Generate personalized course materials
        const materialsResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "user", content: materialsPrompt }
            ],
            response_format: { type: "json_object" }
          }),
        });

        if (materialsResponse.ok) {
          const materialsData = await materialsResponse.json();
          const materialsContent = JSON.parse(materialsData.choices[0].message.content);

          await admin
            .from("course_materials")
            .insert({
              course_id: courseId,
              title: materialsContent.title,
              content: materialsContent.content,
              material_order: 1
            });
        }

        // Generate personalized quizzes
        if (chapters && chapters.length > 0) {
          for (const chapter of chapters) {
            const quizPrompt = `You are an expert educator. Create a personalized quiz for a student interested in "${hobby}".

Chapter: ${chapter.title}
Description: ${chapter.description}
Course: ${course.title}

Create 6-7 engaging quiz questions with MIXED types (multiple choice, true/false, fill-in-the-blank) that test understanding while relating to "${hobby}". Include AI-generated explanations for learning.${languageInstruction}

IMPORTANT: Include a mix of question types:
- 3-4 multiple choice questions (4 options each)
- 2-3 true/false questions
- 1-2 fill-in-the-blank questions

Format your response as JSON:
{
  "quiz_title": "Quiz title (include chapter name and make it engaging)",
  "time_limit": 15,
  "questions": [
    {
      "question": "Question text (relate to ${hobby} when possible)",
      "question_type": "multiple_choice" | "true_false" | "fill_in_blank",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": 0,
      "explanation": "Clear explanation of why this is correct and what students should learn",
      "points": 10
    }
  ]
}

For true/false questions, use options: ["True", "False"]
For fill-in-blank, use correct_answer as the expected answer string in options[0]`;

            const quizResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                messages: [
                  { role: "user", content: quizPrompt }
                ],
                response_format: { type: "json_object" }
              }),
            });

            if (quizResponse.ok) {
              const quizData = await quizResponse.json();
              const quizContent = JSON.parse(quizData.choices[0].message.content);

              const { data: quiz } = await admin
                .from("quizzes")
                .insert({
                  course_id: courseId,
                  chapter_id: chapter.id,
                  title: quizContent.quiz_title,
                  description: `Personalized quiz for ${hobby} enthusiasts`,
                  passing_score: 70,
                  reward_amount: 5,
                  time_limit: quizContent.time_limit || null,
                  allow_retakes: true,
                  show_explanations: true
                })
                .select()
                .single();

              if (quiz) {
                const questions = quizContent.questions.map((q: any) => ({
                  quiz_id: quiz.id,
                  question: q.question,
                  question_type: q.question_type || 'multiple_choice',
                  options: q.options,
                  correct_answer: q.correct_answer,
                  explanation: q.explanation,
                  points: q.points
                }));

                await admin.from("quiz_questions").insert(questions);
              }
            }
          }
        }
      } catch (error) {
        console.error("Background content generation error:", error);
      }
    };

    // Start background task without awaiting
    generateContentInBackground().catch(err => {
      console.error("Background content generation failed:", err);
    });

    // Return immediate response
    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Successfully enrolled! Content is being generated and will be available shortly."
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in generate-personalized-course:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
