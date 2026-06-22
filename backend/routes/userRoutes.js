import express from "express";
import { client } from "../sanityClient.js";

const router = express.Router();

// Create user in Sanity
router.post("/createUser", async (req, res) => {
  try {
    const { uid, email, name, photo } = req.body;

    const user = {
      _id: uid,
      _type: "userProfile",
      email,
      name,
      photo,
      createdAt: new Date().toISOString()
    };

    await client.createIfNotExists(user);

    res.json({ success: true });
  } catch (err) {
    console.error("CreateUser error:", err);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// Get user profile
router.get("/getUser/:uid", async (req, res) => {
  try {
    const { uid } = req.params;

    const user = await client.getDocument(uid);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error("GetUser error:", err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// Sync user (update)
router.post("/syncUser", async (req, res) => {
  try {
    const { uid, email, name, photo } = req.body;

    await client.patch(uid).set({
      email,
      name,
      photo,
      updatedAt: new Date().toISOString()
    }).commit();

    res.json({ success: true });
  } catch (err) {
    console.error("SyncUser error:", err);
    res.status(500).json({ error: "Failed to sync user" });
  }
});

export default router;
