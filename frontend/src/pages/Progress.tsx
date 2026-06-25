import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useGamification, ALL_ACHIEVEMENTS } from "../hooks/useGamification";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import "../styles/progress.css";
import "../styles/gamification.css";

interface SearchEntry { query: string; subject: string; timestamp: string; }

function getWeekLabel(dateStr: string) {
  const diffDays = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (diffDays < 7) return "This week";
  if (diffDays < 14) return "Last week";
  return "Older";
}

const LEVEL_TITLES: Record<number, string> = {
  1: "Beginner", 2: "Learner", 3: "Student", 4: "Scholar", 5: "Apprentice",
  6: "Practitioner", 7: "Expert", 8: "Master", 9: "Grandmaster", 10: "Legend",
};

export default function Progress() {
  const { user } = useAuth();
  const { stats, leaderboard, loadLeaderboard } = useGamification();
  const [searches, setSearches] = useState<SearchEntry[]>([]);
  const [noteCount, setNoteCount] = useState(0);
  const [subjectCount, setSubjectCount] = useState(0);
  const [activeTab, setActiveTab] = useState<"overview" | "achievements" | "leaderboard">("overview");

  useEffect(() => {
    if (!user) return;
    const saved = localStorage.getItem(`studyflow_searches_${user.uid}`);
    if (saved) setSearches(JSON.parse(saved));

    // Fetch real counts from Firestore
    getDocs(query(collection(db, "notes"), where("userId", "==", user.uid)))
      .then(snap => setNoteCount(snap.size));
    getDocs(query(collection(db, "subjects"), where("userId", "==", user.uid)))
      .then(snap => setSubjectCount(snap.size));
  }, [user]);

  useEffect(() => {
    if (activeTab === "leaderboard") loadLeaderboard();
  }, [activeTab]);

  const unlockedIds = new Set(stats?.achievements.map(a => a.id) || []);

  return (
    <div className="progress-page">
      <div className="progress-header">
        <h1>Progress</h1>
        <p className="progress-sub">Track your study journey</p>
      </div>

      {/* LEVEL CARD */}
      {stats && (
        <div className="level-card">
          <div className="level-card-left">
            <div className="level-badge">
              <span className="level-num">{stats.level}</span>
              <span className="level-label">LVL</span>
            </div>
            <div>
              <p className="level-title">{LEVEL_TITLES[stats.level] || "Legend"}</p>
              <p className="level-xp">{stats.xp.toLocaleString()} XP total</p>
            </div>
          </div>
          <div className="level-card-right">
            <div className="level-progress-bar">
              <div className="level-progress-fill" style={{ width: `${stats.xpProgress}%` }} />
            </div>
            <p className="level-next">{stats.xpToNextLevel} XP to next level</p>
          </div>
          <div className="level-streak">
            <span className="streak-fire">🔥</span>
            <span className="streak-num">{stats.streak}</span>
            <span className="streak-label">day streak</span>
          </div>
        </div>
      )}

      {/* TABS */}
      <div className="progress-tabs">
        {(["overview", "achievements", "leaderboard"] as const).map(tab => (
          <button
            key={tab}
            className={`progress-tab ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "overview" ? "📊 Overview" : tab === "achievements" ? "🏆 Achievements" : "🌍 Leaderboard"}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === "overview" && (
        <>
          <div className="stat-cards">
            {[
              { icon: "📝", value: noteCount, label: "Notes" },
              { icon: "🔍", value: searches.length, label: "AI Sessions" },
              { icon: "📚", value: subjectCount, label: "Subjects" },
              { icon: "🏅", value: stats?.achievements.length || 0, label: "Achievements" },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <span className="stat-icon">{s.icon}</span>
                <div>
                  <p className="stat-value">{s.value}</p>
                  <p className="stat-label">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="progress-card full-width">
            <h2>Recent AI sessions</h2>
            {searches.length === 0 ? (
              <p className="progress-empty-msg">No AI sessions yet — ask the AI Tutor something to get started.</p>
            ) : (
              <div className="recent-list">
                {searches.slice(0, 5).map((s, i) => (
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
        </>
      )}

      {/* ACHIEVEMENTS TAB */}
      {activeTab === "achievements" && (
        <div className="achievements-grid">
          {ALL_ACHIEVEMENTS.map(a => {
            const unlocked = unlockedIds.has(a.id);
            const unlockedData = stats?.achievements.find(x => x.id === a.id);
            return (
              <div key={a.id} className={`achievement-card ${unlocked ? "unlocked" : "locked"}`}>
                <span className="achievement-icon">{a.icon}</span>
                <div className="achievement-info">
                  <p className="achievement-title">{a.title}</p>
                  <p className="achievement-desc">{a.description}</p>
                  {unlocked && unlockedData?.unlockedAt && (
                    <p className="achievement-date">
                      {new Date(unlockedData.unlockedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                {unlocked ? (
                  <span className="achievement-check">✓</span>
                ) : (
                  <span className="achievement-lock">🔒</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* LEADERBOARD TAB */}
      {activeTab === "leaderboard" && (
        <div className="leaderboard">
          <div className="leaderboard-list">
            {leaderboard.length === 0 ? (
              <p className="progress-empty-msg">No leaderboard data yet — start studying to appear here!</p>
            ) : (
              leaderboard.map((entry, i) => (
                <div key={entry.uid} className={`leaderboard-row ${entry.uid === user?.uid ? "me" : ""}`}>
                  <span className={`leaderboard-rank rank-${i + 1}`}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                  </span>
                  <div className="leaderboard-info">
                    <p className="leaderboard-name">
                      {entry.name} {entry.uid === user?.uid ? "(you)" : ""}
                    </p>
                    <p className="leaderboard-level">Level {entry.level} · 🔥 {entry.streak} streak</p>
                  </div>
                  <span className="leaderboard-xp">{entry.xp.toLocaleString()} XP</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}