
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!GEMINI_API_KEY) {
      throw new Error("Missing Gemini API key");
    }

    const { subject, topic, difficultyLevel, grade } = await req.json();

    if (!subject || !topic) {
      throw new Error("Subject and topic are required");
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const prompt = `
      Create an educational assignment for students on the subject of ${subject}, 
      specifically about ${topic}.
      
      Difficulty level: ${difficultyLevel || "Intermediate"}
      Grade level: ${grade || "High School"}
      
      Please provide:
      1. A clear title for the assignment
      2. A detailed description that explains what students need to do
      3. Learning objectives (3-5 bullet points)
      4. Requirements for completion 
      5. Grading criteria
      6. Suggested resources for students
      
      Format the response in a clear, well-structured way that's ready to be presented to students.
    `;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    return new Response(
      JSON.stringify({
        assignment: {
          title: extractTitle(text),
          description: text,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error generating assignment:", error);
    
    return new Response(
      JSON.stringify({ error: error.message || "Failed to generate assignment" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Helper function to extract a title from the generated content
function extractTitle(content: string): string {
  // Try to find the title from the first line
  const lines = content.split('\n');
  for (const line of lines.slice(0, 3)) {
    const cleanLine = line.trim();
    if (cleanLine && cleanLine.length < 100 && !cleanLine.startsWith('-') && !cleanLine.startsWith('*')) {
      return cleanLine.replace(/[:#]/g, '').trim();
    }
  }
  
  // Fallback to a default title
  return "AI-Generated Assignment";
}
