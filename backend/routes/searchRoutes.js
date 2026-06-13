import express from "express";
import multer from "multer";
import { client } from "../sanityClient.js";

const router = express.Router();
const upload = multer();

router.post("/search", upload.single("file"), async (req, res) => {
  const { query } = req.body;
  const file = req.file;

  let text = "";

  if (file) {
    text = file.buffer.toString("utf-8");
  }

  const finalPrompt = `
User query: ${query}
Uploaded content: ${text}

Provide a clear, helpful study explanation.
`;

  // Replace this with your AI model call
  res.json({
    answer: "AI response will go here once we connect your model.",
  });
});

export default router;
