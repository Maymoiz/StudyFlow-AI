import { client } from "../lib/sanity";

export async function syncUserToSanity(user: any) {
  if (!user) return;

  const doc = {
    _type: "userProfile",
    _id: `user-${user.uid}`,
    uid: user.uid,
    name: user.displayName || "",
    grade: "",
    weakAreas: [],
    recommendedVideos: []
  };

  try {
    await client.createIfNotExists(doc);
    console.log("User synced to Sanity");
  } catch (err) {
    console.error("Sanity sync error:", err);
  }
}
