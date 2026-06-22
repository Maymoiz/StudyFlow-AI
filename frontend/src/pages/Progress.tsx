import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import "../styles/progress.css";

interface Note {
  id: string;
  subject: string;
  createdAt: string;
}

interface SearchEntry {
  query: string;
  subject: string;
  timestamp: string;
}

const SUBJECT_COLORS: Record<string, string> = {
  "Math": "#6a5af9",
  "Science": "#22d3ee",
  "History": "#f59e0b",
  "English": "#34d399",
  "Computer Science": "#b372f3",
  "Other": "#888",
};

function getWeekLabel(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 7) return "This week";
  if (diffDays < 14) return "Last week";
  return "Older";
}

export default function Progress() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [searches, setSearches] = useState<SearchEntry[]>([]);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (!user) return;
    const savedNotes = localStorage.getItem(`studyflow_notes_${user.uid}`);
    if (savedNotes) setNotes(JSON.parse(savedNotes));

    const savedSearches = localStorage.getItem(`studyflow_searches_${user.uid}`);
    if (savedSearches) setSearches(JSON.parse(savedSearches));

    // Calculate streak (days with at least one activity)
    const allDates = [
      ...(savedNotes ? JSON.parse(savedNotes) : []).map((n: Note) => n.createdAt.slice(0, 10)),
      ...(savedSearches ? JSON.parse(savedSearches) : []).map((s: SearchEntry) => s.timestamp.slice(0, 10)),
    ];
    const uniqueDates = [...new Set(allDates)].sort().reverse();
    let s = 0;
    const today = new Date().toISOString().slice(0, 10);
    for (let i = 0; i < uniqueDates.length; i++) {
      const expected = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      if (uniqueDates[i] === expected || (i === 0 && uniqueDates[0] === today)) { s++; }
      else break;
    }
    setStreak(s);
  }, [user]);

  // Notes by subject
  const notesBySubject: Record<string, number> = {};
  notes.forEach(n => { notesBySubject[n.subject] = (notesBySubject[n.subject] || 0) + 1; });

  // Notes over time (last 7 days)
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en-ZA", { weekday: "short" });
    const count = notes.filter(n => n.createdAt.slice(0, 10) === key).length;
    return { label, count, key };
  });

  const maxCount = Math.max(...last7.map(d => d.count), 1);

  // Recent searches
  const recentSearches = searches.slice(0, 5);

  // Total stats
  const totalSessions = searches.length;

  return (
    <div className="progress-page">
      <div className="progress-header">
        <h1>Progress</h1>
        <p className="progress-sub">Your study activity at a glance</p>
      </div>

      {/* Stat cards */}
      <div className="stat-cards">
        <div className="stat-card">
          <span className="stat-icon">📝</span>
          <div>
            <p className="stat-value">{notes.length}</p>
            <p className="stat-label">Notes Created</p>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🔍</span>
          <div>
            <p className="stat-value">{totalSessions}</p>
            <p className="stat-label">AI Sessions</p>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🔥</span>
          <div>
            <p className="stat-value">{streak}</p>
            <p className="stat-label">Day Streak</p>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">📚</span>
          <div>
            <p className="stat-value">{Object.keys(notesBySubject).length}</p>
            <p className="stat-label">Subjects Active</p>
          </div>
        </div>
      </div>

      <div className="progress-grid">
        {/* Notes per day chart */}
        <div className="progress-card">
          <h2>Notes this week</h2>
          <div className="bar-chart">
            {last7.map(day => (
              <div key={day.key} className="bar-col">
                <span className="bar-count">{day.count > 0 ? day.count : ""}</span>
                <div
                  className="bar"
                  style={{ height: `${(day.count / maxCount) * 120 + (day.count > 0 ? 4 : 0)}px` }}
                />
                <span className="bar-label">{day.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Notes by subject */}
        <div className="progress-card">
          <h2>Notes by subject</h2>
          {Object.keys(notesBySubject).length === 0 ? (
            <p className="progress-empty-msg">No notes yet — start taking notes to see your subject breakdown.</p>
          ) : (
            <div className="subject-bars">
              {Object.entries(notesBySubject).sort((a, b) => b[1] - a[1]).map(([subj, count]) => {
                const pct = Math.round((count / notes.length) * 100);
                return (
                  <div key={subj} className="subject-bar-row">
                    <span className="subject-bar-label">{subj}</span>
                    <div className="subject-bar-track">
                      <div
                        className="subject-bar-fill"
                        style={{ width: `${pct}%`, background: SUBJECT_COLORS[subj] || "#6a5af9" }}
                      />
                    </div>
                    <span className="subject-bar-count">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent searches */}
        <div className="progress-card full-width">
          <h2>Recent AI sessions</h2>
          {recentSearches.length === 0 ? (
            <p className="progress-empty-msg">No AI sessions yet — ask the AI Tutor something to get started.</p>
          ) : (
            <div className="recent-list">
              {recentSearches.map((s, i) => (
                <div key={i} className="recent-item">
                  <span className="recent-icon">🤖</span>
                  <div className="recent-text">
                    <p className="recent-query">{s.query}</p>
                    <p className="recent-time">{new Date(s.timestamp).toLocaleString()}</p>
                  </div>
                  <span className="recent-week">{getWeekLabel(s.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
