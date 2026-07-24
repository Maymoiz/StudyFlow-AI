import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@5";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Only requests from our real frontend are allowed to call this function
// from a browser. Anything else gets rejected at the CORS level.
const ALLOWED_ORIGINS = [
  "https://moisha-studyflow-ai-7ec1f.web.app",
];

function corsHeadersFor(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const isAllowed = ALLOWED_ORIGINS.includes(origin);

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : "",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

// Must match the Firebase project the frontend authenticates against.
const FIREBASE_PROJECT_ID = "moisha-studyflow-ai";

// Firebase publishes the public keys used to sign ID tokens at this fixed URL.
const firebaseJWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
);

class AuthError extends Error {}
class RateLimitError extends Error {}

// Verifies the Authorization header against Firebase's public keys.
// Same pattern used in supabase/functions/users/index.ts.
async function requireVerifiedUid(req: Request): Promise<string> {
  const authHeader = req.headers.get("Authorization") || "";
  const match = authHeader.match(/^Bearer (.+)$/);

  if (!match) {
    throw new AuthError("Missing or malformed Authorization header.");
  }

  const idToken = match[1];

  try {
    const { payload } = await jwtVerify(idToken, firebaseJWKS, {
      issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
      audience: FIREBASE_PROJECT_ID,
    });

    if (!payload.sub) {
      throw new AuthError("Token did not contain a subject claim.");
    }

    return payload.sub;
  } catch (err) {
    console.error("Token verification failed:", err);
    throw new AuthError("Invalid or expired token.");
  }
}

// Supabase automatically injects these into every Edge Function, no
// manual setup needed. The service role key is safe to use here because
// this code only ever runs server-side, never shipped to the browser.
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const SEARCH_RATE_LIMIT_PER_HOUR = 20;

// Calls the increment_search_rate_limit database function, which
// atomically checks and increments this user's count for the current
// hour. Throws if the user has hit their limit.
async function enforceRateLimit(uid: string): Promise<void> {
  const { data, error } = await supabase.rpc("increment_search_rate_limit", {
    p_uid: uid,
    p_limit: SEARCH_RATE_LIMIT_PER_HOUR,
  });

  if (error) {
    // If the rate limit check itself fails for an infrastructure reason,
    // we log it but don't block the user, a broken limiter shouldn't
    // take down the whole feature.
    console.error("Rate limit check failed:", error);
    return;
  }

  if (data === false) {
    throw new RateLimitError(
      `You've reached the limit of ${SEARCH_RATE_LIMIT_PER_HOUR} requests per hour. Please try again later.`
    );
  }
}

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
const YOUTUBE_API_KEY = Deno.env.get("YOUTUBE_API_KEY");
const MODEL = "openai/gpt-oss-120b";

// TEMPORARY DIAGNOSTIC — safe to log: only length + masked first/last 4 chars, never the full key.
if (GROQ_API_KEY) {
  console.log(
    `GROQ_API_KEY diagnostic: length=${GROQ_API_KEY.length}, starts="${GROQ_API_KEY.slice(0, 4)}", ends="${GROQ_API_KEY.slice(-4)}", hasWhitespace=${/\s/.test(GROQ_API_KEY)}`
  );
} else {
  console.error("GROQ_API_KEY diagnostic: env var is undefined/empty!");
}

// gpt-oss models can emit hidden reasoning tokens wrapped in <think>/<reasoning>
// tags before the actual content. If left in, JSON.parse() on the response blows up.
// Stripping them here + forcing low reasoning effort keeps output clean and fast.
function stripReasoningTags(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "")
    .trim();
}

async function callGroq(prompt: string, systemPrompt?: string, jsonMode = false): Promise<string> {
  const messages: any[] = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: prompt });

  const body: any = { model: MODEL, messages, max_tokens: 5000, reasoning_effort: "low" };
  if (jsonMode) body.response_format = { type: "json_object" };

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    console.error("Groq API error - full response:", JSON.stringify(data));
    console.error("Groq API error - status:", res.status, res.statusText);
    throw new Error(data?.error?.message || "Groq request failed");
  }

  const raw = data.choices?.[0]?.message?.content ?? "";
  const cleaned = stripReasoningTags(raw);

  if (!cleaned) {
    console.error("Groq returned empty content after stripping reasoning tags. Raw:", raw.slice(0, 500));
    throw new Error("Groq returned an empty response");
  }

  return cleaned;
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

// Extract text from PDF using byte-level parsing (no native libs needed)
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
  } catch {
    return "";
  }
}

// Extract text from DOCX (zip-based XML format) — minimal parser
async function extractDocxText(bytes: Uint8Array): Promise<string> {
  try {
    const text = new TextDecoder("latin1").decode(bytes);
    const wtRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    const lines: string[] = [];
    let match;
    while ((match = wtRegex.exec(text)) !== null) {
      if (match[1]) lines.push(match[1]);
    }
    const extracted = lines.join(" ").replace(/\s+/g, " ").trim();
    return extracted.slice(0, 14000);
  } catch {
    return "";
  }
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
    return { text: await extractDocxText(bytes), type: "docx" };
  }
  if (fileName.endsWith(".doc")) {
    return { text: extractPlainText(bytes).replace(/[^\x20-\x7E\n]/g, " "), type: "doc" };
  }
  return { text: extractPlainText(bytes), type: "text" };
}

const QUIZ_JSON_INSTRUCTIONS = `
Return a JSON object with this EXACT shape (no extra commentary, no markdown):
{
  "overview": "1-2 sentence overview (only for documents, otherwise empty string)",
  "explanation": "2-4 paragraphs of plain text explaining the topic, separated by \\n\\n",
  "summary": "One concise paragraph summary",
  "keyNotes": ["point 1", "point 2", "..."],
  "quiz": [
    {
      "question": "Question text?",
      "options": { "A": "option text", "B": "option text", "C": "option text", "D": "option text" },
      "correctAnswer": "B",
      "explanation": "One sentence explaining why this is correct"
    }
  ]
}
Include 5-7 keyNotes bullet points (8-10 for documents) and exactly 5 quiz questions.
`;

Deno.serve(async (req: Request) => {
  const corsHeaders = corsHeadersFor(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Every request must come from a verified, logged-in user, and must
    // stay within their hourly rate limit, before we spend anything on
    // Groq or YouTube API calls.
    const verifiedUid = await requireVerifiedUid(req);
    await enforceRateLimit(verifiedUid);

    let query = "";
    let fileText = "";
    let fileName = "";
    let mode = "search";

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      query = (formData.get("query") as string) || "";
      mode = (formData.get("mode") as string) || "search";
      const file = formData.get("file") as File | null;

      if (file) {
        fileName = file.name;
        const { text } = await extractFileText(file);
        fileText = text;
        if (!fileText || fileText.length < 30) {
          return new Response(JSON.stringify({
            error: "Could not extract text from this file. If it's a scanned PDF or image-based document, text extraction isn't supported."
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
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

    // STUDY PLAN MODE
    if (mode === "studyplan") {
      const systemPrompt = `You are an expert academic coach who creates detailed, realistic study plans. Always respond with valid JSON only — no markdown, no explanation.`;

      const planPrompt = `
Create a detailed study plan based on this information:
${query}

Return a JSON object with EXACTLY this structure:
{
  "title": "Study plan title",
  "summary": "2-3 sentence overview of the plan and approach",
  "totalDays": <number>,
  "hoursPerDay": <number>,
  "days": [
    {
      "day": 1,
      "date": "Day 1",
      "theme": "Short theme for this day",
      "tasks": [
        {
          "time": "09:00 - 10:30",
          "activity": "Activity description",
          "type": "study|review|practice|break|assessment",
          "subject": "Subject or topic name",
          "notes": "Optional tip or note"
        }
      ],
      "dailyGoal": "What should be achieved by end of this day"
    }
  ],
  "weeklyMilestones": ["Milestone after week 1", "Milestone after week 2"],
  "tips": ["Study tip 1", "Study tip 2", "Study tip 3"],
  "resources": ["Resource suggestion 1", "Resource suggestion 2"]
}

Make the plan realistic, specific, and actionable. Include short breaks. Vary activity types across the day.
`;
      const raw = await callGroq(planPrompt, systemPrompt, true);
      let parsed;
      try { parsed = JSON.parse(raw); } catch (e) {
        console.error("Study plan JSON parse failed:", e, "Raw:", raw.slice(0, 500));
        return new Response(JSON.stringify({ error: "Failed to generate study plan. Please try again." }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ ...parsed, mode: "studyplan" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // FLASHCARD MODE
    if (mode === "flashcard") {
      const systemPrompt = `You are a flashcard generator. Return ONLY a valid JSON array of flashcard objects in this exact format, nothing else: [{"front": "question text", "back": "answer text"}]`;
      const answer = await callGroq(query + (fileText ? `\n\nContext:\n${fileText.slice(0, 4000)}` : ""), systemPrompt, false);
      return new Response(JSON.stringify({ answer, videos: [], mode: "flashcard" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DOCUMENT MODE — file uploaded, generate structured study materials
    if (mode === "pdf" || (fileText && !query.trim())) {
      const systemPrompt = `You are an expert study assistant analyzing an uploaded document. Generate comprehensive, structured study materials strictly from the document content. ${QUIZ_JSON_INSTRUCTIONS}`;

      const userQuestionNote = query.trim()
        ? `\nThe user also asked this specific question about the document — make sure to address it directly within the explanation: "${query.trim()}"`
        : "";

      const aiPrompt = `
Document name: "${fileName || "uploaded document"}"

Document content:
---
${fileText}
---
${userQuestionNote}

Generate the JSON response now, basing the overview, explanation, summary, key notes, and quiz entirely on this document's actual content.
`;
      const raw = await callGroq(aiPrompt, systemPrompt, true);
      let parsed;
      try { parsed = JSON.parse(raw); } catch (e) {
        console.error("Document JSON parse failed:", e, "Raw:", raw.slice(0, 500));
        parsed = null;
      }

      if (!parsed) {
        return new Response(JSON.stringify({ error: "Failed to generate study materials. Please try again." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const topicPrompt = `Main topic in 3-5 keywords only, no punctuation: ${fileText.slice(0, 500)}`;
      const keywords = await callGroq(topicPrompt);
      const videos = await searchYouTube(keywords);

      return new Response(JSON.stringify({
        ...parsed,
        videos,
        mode: "pdf",
        fileName,
        extractedLength: fileText.length,
        userQuery: query.trim() || null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SEARCH MODE
    const systemPrompt = `You are a helpful, encouraging study tutor. ${QUIZ_JSON_INSTRUCTIONS}`;
    const aiPrompt = `
The user wants to learn about: "${query}"
${fileText ? `\nAdditional context from an uploaded file:\n${fileText.slice(0, 3000)}` : ""}

Generate the JSON response now. Leave "overview" as an empty string since this isn't a document upload.
`;
    const raw = await callGroq(aiPrompt, systemPrompt, true);
    let parsed;
    try { parsed = JSON.parse(raw); } catch (e) {
      console.error("Search JSON parse failed:", e, "Raw:", raw.slice(0, 500));
      parsed = null;
    }

    if (!parsed) {
      return new Response(JSON.stringify({ error: "Failed to generate a response. Please try again." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const keywordPrompt = `Extract the BEST YouTube search keywords for: "${query}". Return ONLY keywords, no punctuation.`;
    const keywords = await callGroq(keywordPrompt);
    const videos = await searchYouTube(keywords);

    return new Response(JSON.stringify({ ...parsed, videos, mode: "search" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    if (err instanceof AuthError) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (err instanceof RateLimitError) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.error("Search error:", err);
    return new Response(JSON.stringify({ error: "Something went wrong. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});