import express from "express";
import cors from "cors";
import userRoutes from "./routes/userRoutes.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", userRoutes);

app.get("/", (req, res) => {
  res.send("StudyFlow Backend Running");
});

app.listen(3000, () => {
  console.log("Backend running on http://localhost:3000");
});
