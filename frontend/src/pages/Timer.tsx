import { useState, useEffect } from "react";
import { usePomodoro } from "../hooks/usePomodoro";
import type { PomodoroMode } from "../hooks/usePomodoro";
import { useAuth } from "../context/AuthContext";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import "../styles/timer.css";

interface SessionLog {
  id: string;
  mode: PomodoroMode;
  durationMinutes: number;
  label: string | null;
  completedAt: any;
}

const MODE_LABELS: Record<PomodoroMode, string> = {
  focus: "Focus",
  short_break: "Short Break",
  long_break: "Long Break",
};

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function Timer() {
  const { user } = useAuth();
  const {
    mode, secondsLeft, isRunning, sessionsCompleted, label,
    toggle, reset, skip, setLabel, setCustomDuration, durations,
  } = usePomodoro();

  const [history, setHistory] = useState<SessionLog[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => { if (user) fetchHistory(); }, [user, secondsLeft]);

  const fetchHistory = async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, "pomodoroSessions"),
        where("userId", "==", user.uid),
      );
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as SessionLog));
      data.sort((a, b) => (b.completedAt?.seconds ?? 0) - (a.completedAt?.seconds ?? 0));
      setHistory(data.slice(0, 10));
    } catch (e) { console.error("Fetch history error:", e); }
    finally { setLoadingHistory(false); }
  };

  const totalFocusMinutesToday = history
    .filter(h => h.mode === "focus" && h.completedAt?.seconds &&
      new Date(h.completedAt.seconds * 1000).toDateString() === new Date().toDateString())
    .reduce((sum, h) => sum + h.durationMinutes, 0);

  const progress = 1 - secondsLeft / durations[mode];
  const circumference = 2 * Math.PI * 120;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="timer-page">
      <div className="timer-header">
        <h1>Study Timer</h1>
        <p className="timer-sub">Stay focused with the Pomodoro technique</p>
      </div>

      <div className="timer-layout">
        {/* MAIN TIMER */}
        <div className="timer-main">
          <div className="timer-mode-pills">
            {(["focus", "short_break", "long_break"] as PomodoroMode[]).map(m => (
              <span key={m} className={`timer-mode-pill ${mode === m ? "active" : ""}`}>
                {MODE_LABELS[m]}
              </span>
            ))}
          </div>

          <div className="timer-circle-wrap">
            <svg className="timer-svg" viewBox="0 0 260 260">
              <circle cx="130" cy="130" r="120" className="timer-track" />
              <circle
                cx="130" cy="130" r="120"
                className={`timer-progress ${mode}`}
                style={{
                  strokeDasharray: circumference,
                  strokeDashoffset,
                }}
              />
            </svg>
            <div className="timer-display">
              <span className="timer-time">{formatTime(secondsLeft)}</span>
              <span className="timer-mode-label">{MODE_LABELS[mode]}</span>
            </div>
          </div>

          <input
            className="timer-label-input"
            placeholder="What are you working on? (optional)"
            value={label}
            onChange={e => setLabel(e.target.value)}
          />

          <div className="timer-controls">
            <button className="timer-btn-secondary" onClick={reset}>↺ Reset</button>
            <button className="timer-btn-primary" onClick={toggle}>
              {isRunning ? "⏸ Pause" : "▶ Start"}
            </button>
            <button className="timer-btn-secondary" onClick={skip}>⏭ Skip</button>
          </div>

          <div className="timer-footer">
            <span>🍅 {sessionsCompleted} session{sessionsCompleted !== 1 ? "s" : ""} completed</span>
            <button className="timer-settings-btn" onClick={() => setShowSettings(s => !s)}>⚙️ Durations</button>
          </div>

          {showSettings && (
            <div className="timer-settings">
              {(["focus", "short_break", "long_break"] as PomodoroMode[]).map(m => (
                <div key={m} className="timer-setting-row">
                  <label>{MODE_LABELS[m]}</label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={Math.round(durations[m] / 60)}
                    onChange={e => setCustomDuration(m, Number(e.target.value))}
                  />
                  <span>min</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SIDEBAR */}
        <div className="timer-sidebar">
          <div className="timer-stat-card">
            <span className="timer-stat-icon">🔥</span>
            <div>
              <p className="timer-stat-value">{totalFocusMinutesToday}</p>
              <p className="timer-stat-label">Minutes focused today</p>
            </div>
          </div>

          <div className="timer-history-card">
            <h3>Recent Sessions</h3>
            {loadingHistory ? (
              <p className="timer-empty-msg">Loading…</p>
            ) : history.length === 0 ? (
              <p className="timer-empty-msg">No sessions yet — start your first Pomodoro!</p>
            ) : (
              <div className="timer-history-list">
                {history.map(h => (
                  <div key={h.id} className="timer-history-item">
                    <span className="timer-history-icon">{h.mode === "focus" ? "🍅" : "☕"}</span>
                    <div className="timer-history-text">
                      <p className="timer-history-label">{h.label || MODE_LABELS[h.mode]}</p>
                      <p className="timer-history-meta">
                        {h.durationMinutes} min · {h.completedAt?.seconds ? new Date(h.completedAt.seconds * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}