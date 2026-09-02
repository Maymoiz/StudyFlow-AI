import { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useLocation } from "react-router-dom";
import { useChatWidget } from "../context/ChatWidgetContext";
import MarkdownRenderer from "./MarkdownRenderer";
import { API } from "../config";
import "../styles/chatwidget.css";
import { authorizedFetch } from "../lib/authorizedFetch";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

const SUGGESTIONS = [
  "Explain Newton's laws of motion",
  "Summarise the causes of World War I",
  "What is recursion in programming?",
  "How does photosynthesis work?",
];

export default function ChatWidget() {
  const { user } = useAuth();
  const location = useLocation();
  const { isOpen, close, toggle, pendingPrefill, clearPendingPrefill } = useChatWidget();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, isOpen]);

  const logSearch = (query: string) => {
    if (!user) return;
    const key = `studyflow_searches_${user.uid}`;
    const existing = JSON.parse(localStorage.getItem(key) || "[]");
    existing.unshift({ query, subject: "General", timestamp: new Date().toISOString() });
    localStorage.setItem(key, JSON.stringify(existing.slice(0, 50)));
  };

  const sendMessage = async (text: string, attachedFile: File | null) => {
    const trimmed = text.trim();
    if (!trimmed && !attachedFile) return;

    const userMsg: Message = {
      role: "user",
      content: trimmed + (attachedFile ? ` [File: ${attachedFile.name}]` : ""),
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("query", trimmed);
      if (attachedFile) formData.append("file", attachedFile);

      // Send recent conversation history so the backend can relate
      // follow-up questions to what was already discussed.
      const recentHistory = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));
      formData.append("history", JSON.stringify(recentHistory));

      const res = await authorizedFetch(API.search, { method: "POST", body: formData });
      const data = await res.json();

      let content = "Sorry, I couldn't generate a response.";
      if (data.explanation) {
        content = [
          data.overview ? `${data.overview}\n` : "",
          data.explanation,
          `\n**Summary:** ${data.summary}`,
          data.keyNotes?.length ? `\n**Key Notes:**\n${data.keyNotes.map((n: string) => `- ${n}`).join("\n")}` : "",
        ].filter(Boolean).join("\n");
      } else if (data.error) {
        content = `⚠️ ${data.error}`;
      }

      setMessages(prev => [...prev, { role: "assistant", content, timestamp: new Date().toISOString() }]);
      logSearch(trimmed);
    } catch {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "⚠️ Connection error — please try again.",
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  // If another page (e.g. Subjects "Ask AI") requested a prefilled question,
  // open the widget and send it automatically, once. Declared before any
  // early return so hook call order stays consistent across renders.
  useEffect(() => {
    if (pendingPrefill && isOpen) {
      sendMessage(pendingPrefill, null);
      clearPendingPrefill();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPrefill, isOpen]);

  // Hide entirely on auth pages
  if (location.pathname === "/login" || location.pathname === "/signup") return null;
  if (!user) return null;

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed && !file) return;
    setInput("");
    const toSend = file;
    setFile(null);
    sendMessage(trimmed, toSend);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <>
      {/* Floating launcher button */}
      <button
        className={`chatw-launcher ${isOpen ? "chatw-launcher--open" : ""}`}
        onClick={toggle}
        title="AI Tutor"
      >
        {isOpen ? "✕" : "🎓"}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div className="chatw-panel">
          <div className="chatw-header">
            <div className="chatw-header-text">
              <strong>AI Tutor</strong>
              <span>Ask anything. Upload notes. Get explained.</span>
            </div>
            <div className="chatw-header-actions">
              {messages.length > 0 && (
                <button className="chatw-clear-btn" onClick={() => setMessages([])}>Clear</button>
              )}
              <button className="chatw-close-btn" onClick={close}>✕</button>
            </div>
          </div>

          <div className="chatw-body">
            {messages.length === 0 ? (
              <div className="chatw-empty">
                <div className="chatw-empty-icon">🎓</div>
                <p>What do you want to learn today?</p>
                <div className="chatw-suggestions">
                  {SUGGESTIONS.map(s => (
                    <button key={s} className="chatw-suggestion" onClick={() => setInput(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="chatw-messages">
                {messages.map((m, i) => (
                  <div key={i} className={`chatw-msg chatw-msg--${m.role}`}>
                    <span className="chatw-msg-avatar">{m.role === "user" ? "👤" : "🤖"}</span>
                    <div className="chatw-msg-bubble">
                      {m.role === "assistant" ? (
                        <div className="chatw-msg-content">
                          <MarkdownRenderer content={m.content} />
                        </div>
                      ) : (
                        <pre className="chatw-msg-content chatw-msg-content--user">{m.content}</pre>
                      )}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="chatw-msg chatw-msg--assistant">
                    <span className="chatw-msg-avatar">🤖</span>
                    <div className="chatw-msg-bubble chatw-typing">
                      <span /><span /><span />
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          <div className="chatw-input-bar">
            {file && (
              <div className="chatw-file-chip">
                📄 {file.name}
                <button onClick={() => setFile(null)}>✕</button>
              </div>
            )}
            <div className="chatw-input-row">
              <label className="chatw-attach-btn" title="Attach a file">
                📎
                <input type="file" hidden onChange={e => e.target.files?.[0] && setFile(e.target.files[0])} />
              </label>
              <textarea
                className="chatw-textarea"
                placeholder="Ask anything…"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
              />
              <button
                className="chatw-send-btn"
                onClick={handleSend}
                disabled={loading || (!input.trim() && !file)}
              >
                ➜
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}