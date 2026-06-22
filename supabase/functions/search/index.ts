// Supabase Edge Function — replaces backend/routes/searchRoutes.js
// Deploy with: supabase functions deploy search

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
const YOUTUBE_API_KEY = Deno.env.get("YOUTUBE_API_KEY");
const MODEL = "llama-3.3-70b-versatile";

async function callGroq(prompt: string): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Groq request failed");
  return data.choices[0].message.content.trim();
}

async function searchYouTube(query: string) {
  try {
    const cleaned = query.replace(/,/g, " ").replace(/\s+/g, " ").trim();
    const encoded = encodeURIComponent(cleaned);
    const url = `https://www.googleapis.com/youtube/v3/search?key=${YOUTUBE_API_KEY}&q=${encoded}&part=snippet&maxResults=6&type=video&videoEmbeddable=true`;
    const res = await fetch(url);
    const data = await res.json();
    return data.items || [];
  } catch (err) {
    console.error("YouTube API error:", err);
    return [];
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    let query = "";
    let fileText = "";

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      query = (formData.get("query") as string) || "";
      const file = formData.get("file") as File | null;
      if (file) fileText = await file.text();
    } else {
      const body = await req.json();
      query = body.query || "";
      fileText = body.fileText || "";
    }

    if (!query.trim() && !fileText.trim()) {
      return new Response(JSON.stringify({ error: "Query is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Extract YouTube keywords
    const keywordPrompt = `
User query: ${query}
Uploaded text: ${fileText}

Extract the BEST YouTube search keywords for this topic.
Return ONLY the keywords.
`;
    const keywords = await callGroq(keywordPrompt);

    // 2. Fetch YouTube videos
    const videos = await searchYouTube(keywords);

    // 3. Generate explanation + summary + notes + quiz
    const aiPrompt = `
You are a helpful study tutor. The user wants to learn about: "${query}"
${fileText ? `\nUploaded notes:\n${fileText}` : ""}

Respond using ONLY clean markdown. Use exactly this structure:

## 📖 Explanation
Write 2-3 clear paragraphs explaining the topic.

## 📝 Summary
One concise paragraph summarising the key idea.

## 🔑 Key Notes
- Use bullet points
- Each point should be short and clear
- Include 5-7 bullet points

## ❓ Quiz
For each question use this exact format:

**Q1. Question text here?**
- A) Option one
- B) Option two
- C) Option three
- D) Option four

✅ **Answer: B) Option two**

Repeat for Q2 through Q5. Do not add any extra text outside this structure.
`;
    const answer = await callGroq(aiPrompt);

    return new Response(JSON.stringify({ answer, videos }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Search error:", err);
    return new Response(JSON.stringify({ error: "Search failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
