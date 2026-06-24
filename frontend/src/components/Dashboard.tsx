import { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import MarkdownRenderer from "./MarkdownRenderer";
import { API } from "../config";
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
  mode?: string;
  fileName?: string;
  extractedLength?: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"search" | "pdf">("search");
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const LOADING_MSGS = {
    search: ["Thinking…", "Generating explanation…", "Building your quiz…"],
    pdf: ["Reading your PDF…", "Extracting content…", "Generating study materials…"],
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() && !file) return;

    setLoading(true);
    setError("");
    setResponse(null);

    // Cycle loading messages
    let msgIdx = 0;
    const msgs = LOADING_MSGS[file && mode === "pdf" ? "pdf" : "search"];
    setLoadingMsg(msgs[0]);
    const msgInterval = setInterval(() => {
      msgIdx = (msgIdx + 1) % msgs.length;
      setLoadingMsg(msgs[msgIdx]);
    }, 2500);

    const formData = new FormData();
    formData.append("query", query);
    formData.append("mode", file && !query.trim() ? "pdf" : "search");
    if (file) formData.append("file", file);

    try {
      const res = await fetch(API.search, { method: "POST", body: formData });
      const data = await res.json();
      if (data.error) { setError(`⚠️ ${data.error}`); return; }
      setResponse(data);

      if (user) {
        const key = `studyflow_searches_${user.uid}`;
        const existing = JSON.parse(localStorage.getItem(key) || "[]");
        existing.unshift({ query: query || file?.name || "PDF upload", subject: "General", timestamp: new Date().toISOString() });
        localStorage.setItem(key, JSON.stringify(existing.slice(0, 50)));
      }
    } catch (err) {
      setError("⚠️ Could not reach the AI — please try again in a moment.");
    } finally {
      clearInterval(msgInterval);
      setLoading(false);
    }
  };

  const handleFile = (f: File) => {
    setFile(f);
    if (f.type === "application/pdf" || f.name.endsWith(".pdf")) {
      setMode("pdf");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const startVoice = () => {
    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = "en-US";
    recognition.start();
    setListening(true);
    recognition.onresult = (event: any) => { setQuery(event.results[0][0].transcript); setListening(false); };
    recognition.onerror = () => setListening(false);
  };

  const handleCopy = () => {
    if (response) {
      navigator.clipboard.writeText(response.answer);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveAsNote = () => {
    if (!response || !user) return;
    const key = `studyflow_notes_${user.uid}`;
    const existing = JSON.parse(localStorage.getItem(key) || "[]");
    existing.unshift({
      id: crypto.randomUUID(),
      title: query || response.fileName || "AI Generated Note",
      content: response.answer,
      subject: "Other",
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem(key, JSON.stringify(existing));
    alert("Saved to Notes!");
  };

  return (
    <div className="dashboard">
      <div className="dashboard-hero">
        <h1>What do you want to study today?</h1>
        <p className="dashboard-sub">Ask a question, upload a PDF, or use your voice.</p>
      </div>

      {/* MODE TABS */}
      <div className="dash-tabs">
        <button className={`dash-tab ${mode === "search" ? "active" : ""}`} onClick={() => { setMode("search"); setFile(null); }}>
          🔍 Ask a question
        </button>
        <button className={`dash-tab ${mode === "pdf" ? "active" : ""}`} onClick={() => setMode("pdf")}>
          📄 Upload PDF
        </button>
      </div>

      {/* SEARCH MODE */}
      {mode === "search" && (
        <form className="search-box" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Ask anything — e.g. 'Explain Newton's laws of motion'"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
          <label className="upload-btn" title="Attach a file">
            <input type="file" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            📎
          </label>
          <button type="button" className="voice-btn" onClick={startVoice} title="Voice input">🎤</button>
          <button type="submit" className="go-btn" disabled={loading || (!query.trim() && !file)}>
            {loading ? <span className="go-spinner" /> : "➜"}
          </button>
        </form>
      )}

      {/* PDF MODE */}
      {mode === "pdf" && (
        <div className="pdf-section">
          <div
            className={`pdf-dropzone ${dragOver ? "drag-over" : ""} ${file ? "has-file" : ""}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.doc,.docx"
              hidden
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            {file ? (
              <div className="pdf-file-preview">
                <span className="pdf-file-icon">📄</span>
                <div>
                  <p className="pdf-file-name">{file.name}</p>
                  <p className="pdf-file-size">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <button className="pdf-file-remove" onClick={e => { e.stopPropagation(); setFile(null); }}>✕</button>
              </div>
            ) : (
              <div className="pdf-dropzone-inner">
                <span className="pdf-dropzone-icon">📄</span>
                <p className="pdf-dropzone-title">Drop your PDF here</p>
                <p className="pdf-dropzone-sub">or click to browse — PDF, TXT, DOC supported</p>
              </div>
            )}
          </div>

          {file && (
            <div className="pdf-query-row">
              <input
                className="pdf-query-input"
                placeholder="Optional: ask a specific question about this document…"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </div>
          )}

          <button
            className="pdf-generate-btn"
            onClick={handleSubmit as any}
            disabled={loading || !file}
          >
            {loading ? <><span className="go-spinner" /> {loadingMsg}</> : "✨ Generate Study Materials"}
          </button>
        </div>
      )}

      {/* File chip for search mode */}
      {mode === "search" && file && (
        <p className="file-info">📎 {file.name} <span onClick={() => setFile(null)}>✕</span></p>
      )}
      {listening && <p className="listening">🎤 Listening…</p>}
      {error && <p className="dashboard-error">{error}</p>}

      {/* LOADING */}
      {loading && mode === "search" && (
        <div className="dashboard-loading">
          <p className="loading-msg">{loadingMsg}</p>
          <div className="dashboard-skeleton" />
          <div className="dashboard-skeleton dashboard-skeleton--short" />
          <div className="dashboard-skeleton" />
        </div>
      )}

      {/* RESPONSE */}
      {response && !loading && (
        <div className="response-box">
          {response.mode === "pdf" && (
            <div className="pdf-source-banner">
              📄 Generated from <strong>{response.fileName}</strong>
              <span className="pdf-chars">{response.extractedLength?.toLocaleString()} characters extracted</span>
            </div>
          )}

          <div className="ai-answer-card">
            <div className="ai-answer-header">
              <span className="ai-answer-badge">🤖 AI Answer</span>
              <div className="ai-answer-actions">
                <button className="ai-copy-btn" onClick={handleCopy}>
                  {copied ? "✓ Copied" : "Copy"}
                </button>
                <button className="ai-save-btn" onClick={handleSaveAsNote} title="Save to Notes">
                  📝 Save Note
                </button>
              </div>
            </div>
            <div className="ai-answer-body">
              <MarkdownRenderer content={response.answer} />
            </div>
          </div>

          {response.videos?.length > 0 && (
            <div className="videos-section">
              <h3 className="videos-heading">📺 Related Videos</h3>
              <div className="video-grid">
                {response.videos.map((v, i) => (
                  <a key={i} href={`https://www.youtube.com/watch?v=${v.id.videoId}`} target="_blank" rel="noreferrer" className="video-card">
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