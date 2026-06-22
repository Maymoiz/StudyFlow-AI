import express from "express";
import { client } from "../sanityClient.js";

const router = express.Router();

// Create a subject
router.post("/subjects", async (req, res) => {
  try {
    const { uid, name, icon, color, description, topics } = req.body;
    if (!uid || !name) return res.status(400).json({ error: "uid and name required" });

    const doc = {
      _type: "subject",
      _id: `subject_${uid}_${Date.now()}`,
      userId: uid,
      name,
      icon: icon || "📚",
      color: color || "#6a5af9",
      description: description || "",
      topics: topics || [],
      createdAt: new Date().toISOString(),
    };

    const created = await client.createIfNotExists(doc);
    res.json(created);
  } catch (err) {
    console.error("Create subject error:", err);
    res.status(500).json({ error: "Failed to create subject" });
  }
});

// Get all subjects for a user
router.get("/subjects/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    const subjects = await client.fetch(
      `*[_type == "subject" && userId == $uid] | order(createdAt asc)`,
      { uid }
    );
    res.json(subjects);
  } catch (err) {
    console.error("Get subjects error:", err);
    res.status(500).json({ error: "Failed to fetch subjects" });
  }
});

// Update a subject (name, icon, color, description, topics)
router.patch("/subjects/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, icon, color, description, topics } = req.body;

    const updated = await client.patch(id).set({
      ...(name !== undefined && { name }),
      ...(icon !== undefined && { icon }),
      ...(color !== undefined && { color }),
      ...(description !== undefined && { description }),
      ...(topics !== undefined && { topics }),
      updatedAt: new Date().toISOString(),
    }).commit();

    res.json(updated);
  } catch (err) {
    console.error("Update subject error:", err);
    res.status(500).json({ error: "Failed to update subject" });
  }
});

// Delete a subject
router.delete("/subjects/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await client.delete(id);
    res.json({ success: true });
  } catch (err) {
    console.error("Delete subject error:", err);
    res.status(500).json({ error: "Failed to delete subject" });
  }
});

export default router;
