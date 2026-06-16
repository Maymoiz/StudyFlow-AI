export async function getLatestModel() {
  const response = await fetch("https://api.groq.com/openai/v1/models", {
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();

  // Only allow chat-compatible models
  const allowed = [
    "llama3-8b-instant",
    "llama3-70b-specdec",
    "mixtral-8x7b",
    "gemma2-9b-it"
  ];

  const chatModels = data.data.filter((m) => allowed.includes(m.id));

  // Sort newest first
  chatModels.sort((a, b) => new Date(b.created) - new Date(a.created));

  // Fallback if something goes wrong
  return chatModels[0]?.id || "llama3-8b-instant";
}
