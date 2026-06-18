import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import MarkdownRenderer from "./MarkdownRenderer";
import "../styles/dashboard.css";

interface Video {
  id: { videoId: string };
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails: { high: { url: string } };
  };
}

interface SearchResponse {
  answer: string;
  videos: Video[];
}

export default function Dashboard() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query && !file) return;

    setLoading(true);
    setError("");
    setResponse(null);

    const formData = new FormData();
    formData.append("query", query);
    if (file) formData.append("file", file);

    try {
      const res = await fetch("http://localhost:3000/api/search", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setResponse(data);

      // Log to progress tracker
      if (user) {
        const key = `studyflow_searches_${user.uid}`;
        const existing = JSON.parse(localStorage.getItem(key) || "[]");
        existing.unshift({ query, subject: "General", timestamp: new Date().toISOString() });
        localStorage.setItem(key, JSON.stringify(existing.slice(0, 50)));
      }
    } catch {
      setError("⚠️ Could not reach the backend — make sure it's running on port 3000.");
    } finally {
      setLoading(false);
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };

  const startVoice = () => {
    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = "en-US";
    recognition.start();
    setListening(true);
    recognition.onresult = (event: any) => {
      setQuery(event.results[0][0].transcript);
      setListening(false);
    };
    recognition.onerror = () => setListening(false);
  };

  return (
    <div className="dashboard">
      <div className="dashboard-hero">
        <h1>What do you want to study today?</h1>
        <p className="dashboard-sub">Ask a question, upload notes, or use your voice.</p>
      </div>

      <form className="search-box" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Ask anything…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <label className="upload-btn" title="Upload a file">
          <input type="file" onChange={handleFile} />
          📄
        </label>
        <button type="button" className="voice-btn" onClick={startVoice} title="Voice input">
          🎤
        </button>
        <button type="submit" className="go-btn" disabled={loading || (!query && !file)}>
          {loading ? <span className="go-spinner" /> : "➜"}
        </button>
      </form>

      {file && <p className="file-info">📎 {file.name} <span onClick={() => setFile(null)}>✕</span></p>}
      {listening && <p className="listening">Listening… 🎤</p>}
      {error && <p className="dashboard-error">{error}</p>}

      {loading && (
        <div className="dashboard-loading">
          <div className="dashboard-skeleton" />
          <div className="dashboard-skeleton dashboard-skeleton--short" />
          <div className="dashboard-skeleton" />
        </div>
      )}

      {response && !loading && (
        <div className="response-box">
          {/* AI Answer */}
          <div className="ai-answer-card">
            <div className="ai-answer-header">
              <span className="ai-answer-badge">🤖 AI Answer</span>
              <button
                className="ai-copy-btn"
                onClick={() => navigator.clipboard.writeText(response.answer)}
                title="Copy answer"
              >
                Copy
              </button>
            </div>
            <div className="ai-answer-body">
              <MarkdownRenderer content={response.answer} />
            </div>
          </div>

          {/* Videos */}
          {response.videos?.length > 0 && (
            <div className="videos-section">
              <h3 className="videos-heading">📺 Related Videos</h3>
              <div className="video-grid">
                {response.videos.map((v, i) => (
                  <a
                    key={i}
                    href={`https://www.youtube.com/watch?v=${v.id.videoId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="video-card"
                  >
                    <div className="video-thumb-wrap">
                      <img src={v.snippet.thumbnails.high.url} alt={v.snippet.title} />
                      <span className="video-play-overlay">▶</span>
                    </div>
                    <div className="video-info">
                      <h4>{v.snippet.title}</h4>
                      <p>{v.snippet.channelTitle}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
