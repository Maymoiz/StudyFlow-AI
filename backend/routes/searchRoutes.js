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
