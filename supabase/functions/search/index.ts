import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
const YOUTUBE_API_KEY = Deno.env.get("YOUTUBE_API_KEY");
const MODEL = "llama-3.3-70b-versatile";

async function callGroq(prompt: string, systemPrompt?: string): Promise<string> {
  const messages: any[] = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: prompt });

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({ model: MODEL, messages, max_tokens: 4000 }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Groq request failed");
  return data.choices[0].message.content.trim();
}

async function searchYouTube(query: string) {
  try {
    const encoded = encodeURIComponent(query.replace(/,/g, " ").trim());
    const url = `https://www.googleapis.com/youtube/v3/search?key=${YOUTUBE_API_KEY}&q=${encoded}&part=snippet&maxResults=6&type=video&videoEmbeddable=true`;
    const res = await fetch(url);
    const data = await res.json();
    return data.items || [];
  } catch {
    return [];
  }
}

// Extract text from PDF using a simple byte-level approach
// Works for most text-based PDFs without native PDF libs
async function extractPdfText(bytes: Uint8Array): Promise<string> {
  try {
    const text = new TextDecoder("latin1").decode(bytes);

    // Extract text between BT and ET markers (PDF text objects)
    const lines: string[] = [];
    const btEtRegex = /BT([\s\S]*?)ET/g;
    let match;

    while ((match = btEtRegex.exec(text)) !== null) {
      const block = match[1];
      // Extract strings in parentheses (Tj/TJ operators)
      const strRegex = /\(((?:[^()\\]|\\.)*)\)\s*(?:Tj|TJ|'|")/g;
      let strMatch;
      while ((strMatch = strRegex.exec(block)) !== null) {
        const s = strMatch[1]
          .replace(/\\n/g, "\n")
          .replace(/\\r/g, "")
          .replace(/\\t/g, " ")
          .replace(/\\\(/g, "(")
          .replace(/\\\)/g, ")")
          .replace(/\\\\/g, "\\")
          .replace(/[^\x20-\x7E\n]/g, " ")
          .trim();
        if (s.length > 1) lines.push(s);
      }
    }

    const extracted = lines.join(" ").replace(/\s+/g, " ").trim();

    // If extraction got very little, fall back to raw text scanning
    if (extracted.length < 100) {
      const rawText = text
        .replace(/[^\x20-\x7E\n]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      return rawText.slice(0, 12000);
    }

    return extracted.slice(0, 12000);
  } catch {
    return "";
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    let query = "";
    let fileText = "";
    let isPdf = false;
    let fileName = "";
    let mode = "search"; // "search" | "pdf"

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      query = (formData.get("query") as string) || "";
      mode = (formData.get("mode") as string) || "search";
      const file = formData.get("file") as File | null;

      if (file) {
        fileName = file.name;
        const fileType = file.type || "";
        const bytes = new Uint8Array(await file.arrayBuffer());

        if (fileType === "application/pdf" || fileName.endsWith(".pdf")) {
          isPdf = true;
          fileText = await extractPdfText(bytes);
          if (!fileText || fileText.length < 50) {
            return new Response(JSON.stringify({
              error: "Could not extract text from this PDF. Make sure it's a text-based PDF, not a scanned image."
            }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        } else {
          fileText = new TextDecoder().decode(bytes).slice(0, 12000);
        }
      }
    } else {
      const body = await req.json();
      query = body.query || "";
      fileText = body.fileText || "";
      mode = body.mode || "search";
    }

    const hasContent = query.trim() || fileText.trim();
    if (!hasContent) {
      return new Response(JSON.stringify({ error: "Please provide a question or upload a file." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PDF MODE — generate comprehensive study material from document
    if (mode === "pdf" || (isPdf && !query.trim())) {
      const systemPrompt = `You are an expert study assistant. You receive text extracted from a PDF document and generate comprehensive study materials from it. Always respond in clean markdown.`;

      const aiPrompt = `
Here is text extracted from a PDF document called "${fileName || "uploaded document"}":

---
${fileText}
---

Generate comprehensive study materials from this document. Use EXACTLY this structure:

## 📄 Document Overview
Write 2-3 sentences describing what this document is about.

## 📖 Explanation
Write 3-4 paragraphs explaining the main concepts covered in the document.

## 📝 Summary
One concise paragraph summarising the key takeaway from the entire document.

## 🔑 Key Notes
- Extract the most important points as bullet points
- Include 8-10 bullet points
- Each point should capture a distinct key idea from the document

## ❓ Quiz
Create 5 quiz questions based specifically on the content of this document.

**Q1. Question text here?**
- A) Option one
- B) Option two
- C) Option three
- D) Option four

✅ **Answer: B) Option two**

Repeat for Q2 through Q5. Base all questions on the actual document content.
`;
      const answer = await callGroq(aiPrompt, systemPrompt);

      // Get YouTube videos based on document topic
      const topicPrompt = `What is the main topic of this text? Give me 3-5 keywords only: ${fileText.slice(0, 500)}`;
      const keywords = await callGroq(topicPrompt);
      const videos = await searchYouTube(keywords);

      return new Response(JSON.stringify({
        answer,
        videos,
        mode: "pdf",
        fileName,
        extractedLength: fileText.length,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SEARCH MODE — regular query with optional file context
    const keywordPrompt = `Extract the BEST YouTube search keywords for: "${query}". ${fileText ? `Context: ${fileText.slice(0, 200)}` : ""}. Return ONLY keywords.`;
    const keywords = await callGroq(keywordPrompt);
    const videos = await searchYouTube(keywords);

    const aiPrompt = `
You are a helpful study tutor. The user wants to learn about: "${query}"
${fileText ? `\nContext from uploaded file:\n${fileText.slice(0, 3000)}` : ""}

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
**Q1. Question text here?**
- A) Option one
- B) Option two
- C) Option three
- D) Option four

✅ **Answer: B) Option two**

Repeat for Q2 through Q5. Do not add any extra text outside this structure.
`;
    const answer = await callGroq(aiPrompt);

    return new Response(JSON.stringify({ answer, videos, mode: "search" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Search error:", err);
    return new Response(JSON.stringify({ error: "Something went wrong. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});