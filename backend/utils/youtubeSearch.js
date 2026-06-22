import axios from "axios";

export async function searchYouTube(query) {
  try {
    console.log("🔥 searchYouTube CALLED with:", query);

    const cleaned = query.replace(/,/g, " ").replace(/\s+/g, " ").trim();
    const encodedQuery = encodeURIComponent(cleaned);

    const url = `https://www.googleapis.com/youtube/v3/search?key=${process.env.YOUTUBE_API_KEY}&q=${encodedQuery}&part=snippet&maxResults=6&type=video&videoEmbeddable=true`;

    const response = await axios.get(url);

    console.log("🔥 RAW YOUTUBE RESPONSE:", JSON.stringify(response.data, null, 2));

    return response.data.items || [];
  } catch (err) {
    console.error("🔥 YouTube API error:", err.response?.data || err);
    return [];
  }
}
