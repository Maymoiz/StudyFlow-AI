import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Single API now: Groq. Set with:
//   supabase secrets set GROQ_API_KEY=your-groq-key
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
const YOUTUBE_API_KEY = Deno.env.get("YOUTUBE_API_KEY");

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

// Text-generation model for JSON-structured content (quizzes, plans, flashcards).
// Fast, high-quality, no search needed here.
const TEXT_MODEL = "openai/gpt-oss-120b";

// Lightweight model for small/trivial calls (e.g. extracting a few keywords),
// so they don't eat into the 120B model's per-minute token quota.
const LIGHT_MODEL = "openai/gpt-oss-20b";

// Search-capable model — has built-in web_search tool.
const SEARCH_MODEL = "groq/compound-mini";

// ─── AI CALL (Groq, for content/quiz generation — no search) ────
async function callAI(
  prompt: string,
  systemPrompt?: string,
  jsonMode = false,
  model: string = TEXT_MODEL,
  maxTokens: number = 2048
): Promise<string> {
  const messages: any[] = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: prompt });

  const body: any = { model, messages, max_tokens: maxTokens, temperature: 0.7 };
  if (jsonMode) body.response_format = { type: "json_object" };
  // gpt-oss models spend part of max_tokens on internal reasoning before the
  // final answer. Keep reasoning low for small/cheap calls so tokens go to
  // the actual output instead of being silently consumed by "thinking".
  if (model.startsWith("openai/gpt-oss")) body.reasoning_effort = "low";

  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("Groq AI error:", JSON.stringify(data));
    throw new Error(data?.error?.message || `Groq AI error: ${res.status}`);
  }

  let content = data.choices?.[0]?.message?.content?.trim() || "";

  if (jsonMode) {
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) ||
                      content.match(/(\{[\s\S]*\})/) ||
                      content.match(/(\[[\s\S]*\])/);
    if (jsonMatch) content = (jsonMatch[1] || jsonMatch[0]).trim();
  }

  return content;
}

// ─── GROQ WEB SEARCH (real internet search, compound-mini) ──────
async function webSearchGroq(query: string): Promise<{ summary: string; sources: any[] }> {
  try {
    const res = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: SEARCH_MODEL,
        messages: [
          {
            role: "user",
            content: `Search the web for up-to-date, accurate information on: ${query}. Summarize the key facts in a short paragraph.`,
          },
        ],
        compound_custom: {
          tools: { enabled_tools: ["web_search"] },
        },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Groq web search error:", JSON.stringify(data));
      return { summary: "", sources: [] };
    }

    const choice = data.choices?.[0];
    const summary = choice?.message?.content?.trim() || "";
    const sources = choice?.message?.executed_tools?.[0]?.search_results ?? [];

    return { summary, sources };
  } catch (e) {
    console.error("Groq web search exception:", e);
    return { summary: "", sources: [] };
  }
}

// ─── YOUTUBE SEARCH ──────────────────────────────────────────────
async function searchYouTube(query: string) {
  try {
    const encoded = encodeURIComponent(query.replace(/,/g, " ").trim());
    const url = `https://www.googleapis.com/youtube/v3/search?key=${YOUTUBE_API_KEY}&q=${encoded}&part=snippet&maxResults=6&type=video&videoEmbeddable=true`;
    const res = await fetch(url);
    const data = await res.json();
    return data.items || [];
  } catch (e) {
    console.error("YouTube error:", e);
    return [];
  }
}

// ─── FILE TEXT EXTRACTION ────────────────────────────────────────
function extractPdfText(bytes: Uint8Array): string {
  try {
    const text = new TextDecoder("latin1").decode(bytes);
    const lines: string[] = [];
    const btEtRegex = /BT([\s\S]*?)ET/g;
    let match;
    while ((match = btEtRegex.exec(text)) !== null) {
      const block = match[1];
      const strRegex = /\(((?:[^()\\]|\\.)*)\)\s*(?:Tj|TJ|'|")/g;
      let strMatch;
      while ((strMatch = strRegex.exec(block)) !== null) {
        const s = strMatch[1]
          .replace(/\\n/g, "\n").replace(/\\r/g, "").replace(/\\t/g, " ")
          .replace(/\\\(/g, "(").replace(/\\\)/g, ")").replace(/\\\\/g, "\\")
          .replace(/[^\x20-\x7E\n]/g, " ").trim();
        if (s.length > 1) lines.push(s);
      }
    }
    const extracted = lines.join(" ").replace(/\s+/g, " ").trim();
    if (extracted.length < 100) {
      return text.replace(/[^\x20-\x7E\n]/g, " ").replace(/\s+/g, " ").trim().slice(0, 14000);
    }
    return extracted.slice(0, 14000);
  } catch { return ""; }
}

function extractDocxText(bytes: Uint8Array): string {
  try {
    const text = new TextDecoder("latin1").decode(bytes);
    const wtRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    const lines: string[] = [];
    let match;
    while ((match = wtRegex.exec(text)) !== null) {
      if (match[1]) lines.push(match[1]);
    }
    return lines.join(" ").replace(/\s+/g, " ").trim().slice(0, 14000);
  } catch { return ""; }
}

function extractPlainText(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8").decode(bytes).slice(0, 14000);
  } catch {
    return new TextDecoder("latin1").decode(bytes).replace(/[^\x20-\x7E\n]/g, " ").slice(0, 14000);
  }
}

async function extractFileText(file: File): Promise<{ text: string; type: string }> {
  const fileName = file.name.toLowerCase();
  const fileType = file.type || "";
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (fileType === "application/pdf" || fileName.endsWith(".pdf")) {
    return { text: extractPdfText(bytes), type: "pdf" };
  }
  if (fileName.endsWith(".docx") || fileType.includes("wordprocessingml")) {
    return { text: extractDocxText(bytes), type: "docx" };
  }
  return { text: extractPlainText(bytes), type: "text" };
}

// ─── QUIZ JSON SCHEMA ────────────────────────────────────────────
const QUIZ_SCHEMA = `
Return a JSON object with EXACTLY this shape — no extra text, no markdown:
{
  "overview": "1-2 sentence overview (documents only, otherwise empty string)",
  "explanation": "2-4 paragraphs separated by \\n\\n",
  "summary": "One concise paragraph",
  "keyNotes": ["point 1", "point 2", "point 3", "point 4", "point 5"],
  "quiz": [
    {
      "question": "Question?",
      "options": { "A": "option", "B": "option", "C": "option", "D": "option" },
      "correctAnswer": "B",
      "explanation": "Why this is correct"
    }
  ]
}
Include 5-7 keyNotes and exactly 5 quiz questions.`;

// ─── MAIN HANDLER ────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    let query = "";
    let fileText = "";
    let fileName = "";
    let mode = "search";
    let history: { role: string; content: string }[] = [];

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      query = (formData.get("query") as string) || "";
      mode = (formData.get("mode") as string) || "search";
      const rawHistory = formData.get("history") as string | null;
      if (rawHistory) {
        try { history = JSON.parse(rawHistory); } catch { history = []; }
      }
      const file = formData.get("file") as File | null;
      if (file) {
        fileName = file.name;
        const { text } = await extractFileText(file);
        fileText = text;
        if (!fileText || fileText.length < 30) {
          return json({ error: "Could not extract text from this file." }, 400);
        }
      }
    } else {
      const body = await req.json();
      query = body.query || "";
      fileText = body.fileText || "";
      mode = body.mode || "search";
      history = Array.isArray(body.history) ? body.history : [];
    }

    if (!query.trim() && !fileText.trim()) {
      return json({ error: "Please provide a question or upload a file." }, 400);
    }

    // ── STUDY PLAN MODE ─────────────────────────────────────────
    if (mode === "studyplan") {
      const systemPrompt = `You are an expert academic coach. Create detailed realistic study plans. Respond with valid JSON only.`;
      const planPrompt = `Create a study plan for: ${query}

Return this exact JSON structure:
{
  "title": "Study plan title",
  "summary": "2-3 sentence overview",
  "totalDays": 7,
  "hoursPerDay": 3,
  "days": [
    {
      "day": 1,
      "date": "Day 1",
      "theme": "Theme",
      "tasks": [
        { "time": "09:00-10:30", "activity": "Activity", "type": "study", "subject": "Subject", "notes": "Tip" }
      ],
      "dailyGoal": "What to achieve today"
    }
  ],
  "weeklyMilestones": ["Milestone 1"],
  "tips": ["Tip 1"],
  "resources": ["Resource 1"]
}`;
      const raw = await callAI(planPrompt, systemPrompt, true, TEXT_MODEL, 3500);
      let parsed;
      try { parsed = JSON.parse(raw); } catch (e) {
        console.error("Study plan parse error:", e, raw.slice(0, 300));
        return json({ error: "Failed to generate study plan. Please try again." }, 500);
      }
      return json({ ...parsed, mode: "studyplan" });
    }

    // ── FLASHCARD MODE ──────────────────────────────────────────
    if (mode === "flashcard") {
      const systemPrompt = `You are a flashcard generator. Return ONLY a valid JSON array. No markdown. Format: [{"front": "question", "back": "answer"}]`;
      const answer = await callAI(
        query + (fileText ? `\n\nContext:\n${fileText.slice(0, 4000)}` : ""),
        systemPrompt
      );
      return json({ answer, videos: [], mode: "flashcard" });
    }

    // ── DOCUMENT MODE ───────────────────────────────────────────
    if (mode === "pdf" || (fileText && !query.trim())) {
      const systemPrompt = `You are an expert study assistant. Generate study materials from documents. ${QUIZ_SCHEMA}`;
      const userNote = query.trim() ? `\nUser question: "${query.trim()}" — address this in the explanation.` : "";
      const aiPrompt = `Document: "${fileName}"\n\nContent:\n${fileText.slice(0, 8000)}\n${userNote}\n\nGenerate the JSON response now.`;

      const raw = await callAI(aiPrompt, systemPrompt, true);
      let parsed;
      try { parsed = JSON.parse(raw); } catch (e) {
        console.error("Document parse error:", e, raw.slice(0, 300));
        return json({ error: "Failed to generate study materials. Please try again." }, 500);
      }
      const keywords = await callAI(`3-5 YouTube search keywords only for: ${fileText.slice(0, 300)}`, undefined, false, LIGHT_MODEL, 200);
      const videos = await searchYouTube(keywords.trim() || fileName || "study guide");
      return json({ ...parsed, videos, mode: "pdf", fileName, extractedLength: fileText.length, userQuery: query.trim() || null });
    }

    // ── SEARCH MODE (grounded with real Groq web search) ────────
    // Fold recent history into the search query itself, so a bare follow-up
    // like "what about side effects?" actually searches with context
    // instead of that literal fragment.
    const searchQuery = history.length > 0
      ? `Context: ${history.slice(-4).map(h => h.content).join(" | ")}\n\nFollow-up question: ${query}`
      : query;
    const { summary: webSummary, sources } = await webSearchGroq(searchQuery);

    const systemPrompt = `You are a helpful study tutor. ${QUIZ_SCHEMA}`;
    const groundingBlock = webSummary
      ? `\n\nCurrent web search findings (use these to keep facts accurate and up to date):\n${webSummary}`
      : "";

    // Give the model the recent conversation so it can relate a follow-up
    // question ("what about its long-term effects?") back to what was
    // already discussed, instead of treating every message as a fresh topic.
    const historyBlock = history.length > 0
      ? `\n\nConversation so far (most recent last) — use this to understand what "it", "that", or a short follow-up question refers to:\n${history
          .slice(-6)
          .map(h => `${h.role === "user" ? "Student" : "Tutor"}: ${h.content.slice(0, 500)}`)
          .join("\n")}`
      : "";

    const aiPrompt = `Topic/question: "${query}"${fileText ? `\nContext: ${fileText.slice(0, 3000)}` : ""}${historyBlock}${groundingBlock}\n\nGenerate the JSON study response, addressing the topic/question above in light of the conversation so far. Set "overview" to empty string.`;

    const raw = await callAI(aiPrompt, systemPrompt, true);
    let parsed;
    try { parsed = JSON.parse(raw); } catch (e) {
      console.error("Search parse error:", e, raw.slice(0, 300));
      return json({ error: "Failed to generate a response. Please try again." }, 500);
    }
    const keywords = await callAI(`YouTube keywords for: "${query}". Return keywords only.`, undefined, false, LIGHT_MODEL, 200);
    const videos = await searchYouTube(keywords.trim() || query);
    return json({ ...parsed, videos, sources, mode: "search" });

  } catch (err) {
    console.error("Function error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});