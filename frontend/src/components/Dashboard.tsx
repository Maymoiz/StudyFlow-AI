import { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import StudyResponse from "./StudyResponse";
import type { StudyData } from "./StudyResponse";
import { API } from "../config";
import { useGamification } from "../hooks/useGamification";
import "../styles/dashboard.css";
import { authorizedFetch } from "../lib/authorizedFetch";

const ACCEPTED_FILE_TYPES = ".pdf,.txt,.doc,.docx,.md,.csv,.json,.rtf";

export default function Dashboard() {
  const { user } = useAuth();
  const { awardXP } = useGamification();

  const [query, setQuery] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [response, setResponse] = useState<StudyData | null>(null);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"search" | "pdf">("search");
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const LOADING_MSGS = {
    search: ["Thinking…", "Generating explanation…", "Building your quiz…"],
    pdf: ["Reading your document…", "Extracting content…", "Generating study materials…"],
  };

  const isFileMode = (f: File | null) => !!f;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() && !file) return;

    setLoading(true);
    setError("");
    setResponse(null);

    let msgIdx = 0;
    const msgs = LOADING_MSGS[isFileMode(file) ? "pdf" : "search"];
    setLoadingMsg(msgs[0]);
    const msgInterval = setInterval(() => {
      msgIdx = (msgIdx + 1) % msgs.length;
      setLoadingMsg(msgs[msgIdx]);
    }, 2500);

    const formData = new FormData();
    formData.append("query", query.trim());
    formData.append("mode", isFileMode(file) ? "pdf" : "search");
    if (file) formData.append("file", file);

    try {
      const res = await authorizedFetch(API.search, { method: "POST", body: formData });
      const data = await res.json();
      if (data.error) { setError(`⚠️ ${data.error}`); return; }
      setResponse(data);
      await awardXP(isFileMode(file) ? "pdf" : "search");

      if (user) {
        const key = `studyflow_searches_${user.uid}`;
        const existing = JSON.parse(localStorage.getItem(key) || "[]");
        existing.unshift({ query: query.trim() || file?.name || "Document upload", subject: "General", timestamp: new Date().toISOString() });
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
    setMode("pdf");
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
    if (!response) return;
    const text = `${response.explanation}\n\n${response.summary}\n\n${response.keyNotes?.join("\n")}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveAsNote = () => {
    if (!response || !user) return;
    const key = `studyflow_notes_${user.uid}`;
    const existing = JSON.parse(localStorage.getItem(key) || "[]");
    const content = [
      response.overview ? `${response.overview}\n` : "",
      response.explanation,
      "\nSummary:\n" + response.summary,
      "\nKey Notes:\n" + (response.keyNotes || []).map(n => `• ${n}`).join("\n"),
    ].join("\n");
    existing.unshift({
      id: crypto.randomUUID(),
      title: query.trim() || response.fileName || "AI Generated Note",
      content,
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
        <p className="dashboard-sub">Ask a question, upload a document, or use your voice.</p>
      </div>

      <div className="dash-tabs">
        <button className={`dash-tab ${mode === "search" ? "active" : ""}`} onClick={() => { setMode("search"); setFile(null); }}>
          🔍 Ask a question
        </button>
        <button className={`dash-tab ${mode === "pdf" ? "active" : ""}`} onClick={() => setMode("pdf")}>
          📄 Upload Document
        </button>
      </div>

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
            <input type="file" accept={ACCEPTED_FILE_TYPES} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            📎
          </label>
          <button type="button" className="voice-btn" onClick={startVoice} title="Voice input">🎤</button>
          <button type="submit" className="go-btn" disabled={loading || (!query.trim() && !file)}>
            {loading ? <span className="go-spinner" /> : "➜"}
          </button>
        </form>
      )}

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
              accept={ACCEPTED_FILE_TYPES}
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
                <p className="pdf-dropzone-title">Drop your document here</p>
                <p className="pdf-dropzone-sub">or click to browse — PDF, DOC, DOCX, TXT, MD, CSV supported</p>
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
              <p className="pdf-query-hint">Your question will be answered directly using this document's content.</p>
            </div>
          )}

          <button className="pdf-generate-btn" onClick={handleSubmit as any} disabled={loading || !file}>
            {loading ? <><span className="go-spinner" /> {loadingMsg}</> : "✨ Generate Study Materials"}
          </button>
        </div>
      )}

      {listening && <p className="listening">🎤 Listening…</p>}
      {error && <p className="dashboard-error">{error}</p>}

      {loading && mode === "search" && (
        <div className="dashboard-loading">
          <p className="loading-msg">{loadingMsg}</p>
          <div className="dashboard-skeleton" />
          <div className="dashboard-skeleton dashboard-skeleton--short" />
          <div className="dashboard-skeleton" />
        </div>
      )}

      {response && !loading && (
        <StudyResponse data={response} onCopy={handleCopy} onSaveNote={handleSaveAsNote} copied={copied} />
      )}
    </div>
  );
}