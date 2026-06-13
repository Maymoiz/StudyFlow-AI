import express from "express";
import client from "../sanityClient.js";

const router = express.Router();

router.post("/createUser", async (req, res) => {
  const { uid, email, name } = req.body;

  await client.createOrReplace({
    _id: `user.${uid}`,
    _type: "userProfile",
    uid,
    email,
    name,
  });

  res.json({ success: true });
});

router.post("/syncUser", async (req, res) => {
  const { uid, email, name, photo } = req.body;

  await client.createOrReplace({
    _id: `user.${uid}`,
    _type: "userProfile",
    uid,
    email,
    name,
    photo,
  });

  res.json({ success: true });
});

export default router;
