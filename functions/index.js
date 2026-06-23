const { setGlobalOptions } = require("firebase-functions");
const { onRequest } = require("firebase-functions/https");
const logger = require("firebase-functions/logger");

setGlobalOptions({ maxInstances: 10 });

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const MODEL = "llama-3.3-70b-versatile";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
};

function handleCors(req, res) {
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return true;
  }
  return false;
}

async function callGroq(prompt) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "Groq error");
  return data.choices[0].message.content.trim();
}

async function searchYouTube(query) {
  try {
    const encoded = encodeURIComponent(query.replace(/,/g, " ").trim());
    const url = `https://www.googleapis.com/youtube/v3/search?key=${YOUTUBE_API_KEY}&q=${encoded}&part=snippet&maxResults=6&type=video&videoEmbeddable=true`;
    const res = await fetch(url);
    const data = await res.json();
    return data.items || [];
  } catch (err) {
    logger.error("YouTube error:", err);
    return [];
  }
}

// Search function — replaces /api/search
exports.search = onRequest(async (req, res) => {
  if (handleCors(req, res)) return;

  try {
    const query = req.body?.query || "";
    const fileText = req.body?.fileText || "";

    if (!query.trim() && !fileText.trim()) {
      return res.status(400).json({ error: "Query is required" });
    }

    // 1. Get YouTube keywords
    const keywordPrompt = `Extract the BEST YouTube search keywords for: "${query}". Return ONLY the keywords.`;
    const keywords = await callGroq(keywordPrompt);

    // 2. Fetch YouTube videos
    const videos = await searchYouTube(keywords);

    // 3. Generate AI answer
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

    return res.json({ answer, videos });
  } catch (err) {
    logger.error("Search error:", err);
    return res.status(500).json({ error: "Search failed" });
  }
});

// Users function — replaces /api/createUser, /api/syncUser, /api/getUser
const { createClient } = require("@sanity/client");

const sanity = createClient({
  projectId: "gF6MOm1Dm",
  dataset: "production",
  apiVersion: "2023-01-01",
  token: process.env.SANITY_TOKEN,
  useCdn: false,
});

exports.createUser = onRequest(async (req, res) => {
  if (handleCors(req, res)) return;
  try {
    const { uid, email, name, photo } = req.body;
    await sanity.createIfNotExists({
      _id: uid,
      _type: "userProfile",
      email, name, photo,
      createdAt: new Date().toISOString(),
    });
    return res.json({ success: true });
  } catch (err) {
    logger.error("createUser error:", err);
    return res.status(500).json({ error: "Failed to create user" });
  }
});

exports.syncUser = onRequest(async (req, res) => {
  if (handleCors(req, res)) return;
  try {
    const { uid, email, name, photo } = req.body;
    await sanity.patch(uid).set({ email, name, photo }).commit();
    return res.json({ success: true });
  } catch (err) {
    logger.error("syncUser error:", err);
    return res.status(500).json({ error: "Failed to sync user" });
  }
});

exports.getUser = onRequest(async (req, res) => {
  if (handleCors(req, res)) return;
  try {
    const uid = req.path.split("/").pop();
    const user = await sanity.fetch(`*[_id == $uid][0]`, { uid });
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json(user);
  } catch (err) {
    logger.error("getUser error:", err);
    return res.status(500).json({ error: "Failed to get user" });
  }
});