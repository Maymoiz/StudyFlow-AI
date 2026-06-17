import { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useLocation } from "react-router-dom";
import "../styles/aitutor.css";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export default function AITutor() {
  const { user } = useAuth();
  const location = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState((location.state as any)?.prefill || "");
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const logSearch = (query: string) => {
    if (!user) return;
    const key = `studyflow_searches_${user.uid}`;
    const existing = JSON.parse(localStorage.getItem(key) || "[]");
    existing.unshift({ query, subject: "General", timestamp: new Date().toISOString() });
    localStorage.setItem(key, JSON.stringify(existing.slice(0, 50)));
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed && !file) return;

    const userMsg: Message = {
      role: "user",
      content: trimmed + (file ? ` [File: ${file.name}]` : ""),
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("query", trimmed);
      if (file) formData.append("file", file);
      setFile(null);

      const res = await fetch("http://localhost:3000/api/search", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      const assistantMsg: Message = {
        role: "assistant",
        content: data.answer || "Sorry, I couldn't generate a response.",
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMsg]);
      logSearch(trimmed);
    } catch {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "⚠️ Connection error — make sure the backend is running on port 3000.",
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const SUGGESTIONS = [
    "Explain Newton's laws of motion",
    "Summarise the causes of World War I",
    "What is recursion in programming?",
    "How does photosynthesis work?",
  ];

  return (
    <div className="ai-page">
      <div className="ai-header">
        <div className="ai-header-text">
          <h1>AI Tutor</h1>
          <p>Ask anything. Upload notes. Get explained.</p>
        </div>
        {messages.length > 0 && (
          <button className="ai-clear-btn" onClick={() => setMessages([])}>Clear chat</button>
        )}
      </div>

      <div className="ai-chat-area">
        {messages.length === 0 ? (
          <div className="ai-empty">
            <div className="ai-empty-icon">🎓</div>
            <h2>What do you want to learn today?</h2>
            <div className="ai-suggestions">
              {SUGGESTIONS.map(s => (
                <button key={s} className="ai-suggestion" onClick={() => { setInput(s); }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="ai-messages">
            {messages.map((m, i) => (
              <div key={i} className={`ai-msg ai-msg--${m.role}`}>
                <span className="ai-msg-avatar">{m.role === "user" ? "👤" : "🤖"}</span>
                <div className="ai-msg-bubble">
                  <pre className="ai-msg-content">{m.content}</pre>
                  <span className="ai-msg-time">
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            ))}
            {loading && (
              <div className="ai-msg ai-msg--assistant">
                <span className="ai-msg-avatar">🤖</span>
                <div className="ai-msg-bubble ai-typing">
                  <span /><span /><span />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="ai-input-bar">
        {file && (
          <div className="ai-file-chip">
            📄 {file.name}
            <button onClick={() => setFile(null)}>✕</button>
          </div>
        )}
        <div className="ai-input-row">
          <label className="ai-attach-btn" title="Attach a file">
            📎
            <input type="file" hidden onChange={e => e.target.files?.[0] && setFile(e.target.files[0])} />
          </label>
          <textarea
            className="ai-textarea"
            placeholder="Ask anything… (Enter to send, Shift+Enter for new line)"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <button
            className="ai-send-btn"
            onClick={handleSend}
            disabled={loading || (!input.trim() && !file)}
          >
            ➜
          </button>
        </div>
      </div>
    </div>
  );
}
