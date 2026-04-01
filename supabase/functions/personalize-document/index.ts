import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { text, personalizationType, language, hobby, filename } = await req.json();

    if (!text || !personalizationType) {
      throw new Error("Missing required fields: text and personalizationType");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // If the text is a base64-encoded file, extract text content via AI first
    let documentText = text;
    if (text.startsWith("__BASE64_FILE__:")) {
      const parts = text.split(":");
      const fileBase64 = parts.slice(2).join(":");

      const extractResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "Extract all the text content from this document. Return only the raw text, preserving paragraphs and structure. Do not add any commentary." },
            { role: "user", content: [
              { type: "text", text: "Extract all text from this document:" },
              { type: "image_url", image_url: { url: `data:application/octet-stream;base64,${fileBase64}` } }
            ]},
          ],
        }),
      });

      if (!extractResponse.ok) {
        throw new Error("Failed to extract text from document");
      }

      const extractData = await extractResponse.json();
      documentText = extractData.choices?.[0]?.message?.content || "";

      if (!documentText.trim()) {
        throw new Error("Could not extract text from the uploaded document");
      }
    }

    let systemPrompt = "";
    let userPrompt = "";

    switch (personalizationType) {
      case "hobby_rewrite":
        systemPrompt = `You are an expert educational content personalizer. Rewrite academic content using relatable examples from the student's hobby/interest to make it more engaging and easier to understand. Maintain academic accuracy while making it fun and relatable.`;
        userPrompt = `Rewrite the following academic content using examples and analogies from "${hobby || 'general interests'}". Make it engaging while keeping all the important educational content.\n\nLanguage: ${language || 'english'}\n\nContent:\n${documentText}`;
        break;
      case "translation":
        systemPrompt = `You are a professional academic translator. Translate educational content accurately while preserving technical terms and meaning. Add brief explanations for complex terms in the target language.`;
        userPrompt = `Translate the following academic content to ${language || 'english'}. Preserve all technical terms (you can add translations in parentheses) and maintain the educational structure.\n\nContent:\n${documentText}`;
        break;
      case "simplify":
        systemPrompt = `You are an expert at simplifying complex academic content for different reading levels. Break down difficult concepts into simple, easy-to-understand language while maintaining accuracy. Use bullet points, short sentences, and clear examples.`;
        userPrompt = `Simplify the following academic content for easier understanding. Use simple language, bullet points, and clear examples. Target a secondary school reading level.\n\nLanguage: ${language || 'english'}\n\nContent:\n${documentText}`;
        break;
      default:
        throw new Error("Invalid personalization type");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    const aiData = await response.json();
    const personalizedText = aiData.choices?.[0]?.message?.content || "";

    // Save to database
    const adminClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await adminClient.from("personalized_documents").insert({
      user_id: user.id,
      original_filename: filename || "Uploaded document",
      original_text: documentText.substring(0, 10000),
      personalized_text: personalizedText,
      personalization_type: personalizationType,
      language: language || "english",
      hobby: hobby || null,
      status: "completed",
    });

    return new Response(JSON.stringify({ personalizedText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Personalize document error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
