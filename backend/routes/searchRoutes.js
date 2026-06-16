import express from "express";
import multer from "multer";
import { searchYouTube } from "../utils/youtubeSearch.js";
import Groq from "groq-sdk";

const router = express.Router();
const upload = multer();

router.post("/search", upload.single("file"), async (req, res) => {
  try {
    console.log("🔥 /search route hit");
    console.log("Incoming query:", req.body.query);

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const { query } = req.body;
    const file = req.file;

    let fileText = "";
    if (file) fileText = file.buffer.toString("utf-8");

    const model = "llama-3.3-70b-versatile";

    // 1. Extract YouTube keywords
    const keywordPrompt = `
User query: ${query}
Uploaded text: ${fileText}

Extract the BEST YouTube search keywords for this topic.
Return ONLY the keywords.
`;

    const keywordResponse = await groq.chat.completions.create({
      model,
      messages: [{ role: "user", content: keywordPrompt }],
    });

    const keywords = keywordResponse.choices[0].message.content.trim();

    // 2. Fetch YouTube videos
    const videos = await searchYouTube(keywords);

    // 3. Generate explanation + summary + notes + quiz
    const aiPrompt = `
User query: ${query}
Uploaded text: ${fileText}

Provide:
1. A clear explanation
2. A short summary
3. Key notes
4. A 5-question quiz
`;

    const aiResponse = await groq.chat.completions.create({
      model,
      messages: [{ role: "user", content: aiPrompt }],
    });

    const answer = aiResponse.choices[0].message.content;
    console.log("VIDEOS SENT TO FRONTEND:", JSON.stringify(videos, null, 2));
    console.log("AI RESPONSE:", JSON.stringify(answer, null, 2));
    res.json({
      answer,
      videos,
    });

  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: "Search failed" });
  }
});

export default router;
