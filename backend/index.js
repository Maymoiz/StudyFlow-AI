import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import userRoutes from "./routes/userRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";
import subjectRoutes from "./routes/subjectRoutes.js";

const app = express();

app.use(cors({
  origin: [
    "https://moisha-studyflow-ai.web.app",
    "https://moisha-studyflow-ai.firebaseapp.com",
    "http://localhost:5173",
    "http://localhost:3000",
  ],
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json());

app.use("/api", userRoutes);
app.use("/api", searchRoutes);
app.use("/api", subjectRoutes);   

app.get("/", (req, res) => {
  res.send("StudyFlow Backend Running");
});

app.listen(3000, () => {
  console.log("Backend running on http://localhost:3000");
});