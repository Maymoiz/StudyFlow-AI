import { useEffect, useState, useCallback } from "react";
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

export interface Achievement {
  id: string;
  icon: string;
  title: string;
  description: string;
  unlockedAt?: string;
}

export interface GameStats {
  xp: number;
  level: number;
  streak: number;
  lastStudyDate: string;
  totalNotes: number;
  totalSessions: number;
  totalSubjects: number;
  totalPomodoros: number;
  achievements: Achievement[];
  xpToNextLevel: number;
  xpProgress: number;
}

export interface LeaderboardEntry {
  uid: string;
  name: string;
  xp: number;
  level: number;
  streak: number;
}

export const XP_REWARDS = {
  search: 20,
  note: 30,
  subject: 50,
  pdf: 75,
  streak: 10,
  pomodoro: 40,
};

const LEVEL_THRESHOLDS = [
  0, 100, 250, 500, 900, 1400, 2000, 2750, 3700, 5000,
  6500, 8500, 11000, 14000, 18000, 23000, 29000, 36000, 45000, 55000,
];

export const ALL_ACHIEVEMENTS: Achievement[] = [
  { id: "first_search", icon: "🔍", title: "First Search", description: "Ask your first question" },
  { id: "first_note", icon: "📝", title: "Note Taker", description: "Create your first note" },
  { id: "first_subject", icon: "📚", title: "Scholar", description: "Create your first subject" },
  { id: "first_pdf", icon: "📄", title: "PDF Pro", description: "Upload your first PDF" },
  { id: "streak_3", icon: "🔥", title: "On Fire", description: "Study 3 days in a row" },
  { id: "streak_7", icon: "⚡", title: "Week Warrior", description: "Study 7 days in a row" },
  { id: "streak_30", icon: "💎", title: "Diamond Mind", description: "Study 30 days in a row" },
  { id: "notes_5", icon: "✏️", title: "Note Master", description: "Create 5 notes" },
  { id: "notes_20", icon: "📖", title: "Bookworm", description: "Create 20 notes" },
  { id: "sessions_10", icon: "🤖", title: "AI Addict", description: "Complete 10 AI sessions" },
  { id: "sessions_50", icon: "🧠", title: "Deep Thinker", description: "Complete 50 AI sessions" },
  { id: "level_5", icon: "⭐", title: "Rising Star", description: "Reach level 5" },
  { id: "level_10", icon: "🏆", title: "Champion", description: "Reach level 10" },
  { id: "subjects_5", icon: "🌍", title: "Polymath", description: "Create 5 subjects" },
  { id: "xp_1000", icon: "💫", title: "XP Hunter", description: "Earn 1000 XP total" },
  { id: "first_pomodoro", icon: "🍅", title: "Focused", description: "Complete your first Pomodoro session" },
  { id: "pomodoro_10", icon: "⏱️", title: "Time Master", description: "Complete 10 Pomodoro sessions" },
  { id: "pomodoro_50", icon: "🧘", title: "Deep Focus", description: "Complete 50 Pomodoro sessions" },
];

function calculateLevel(xp: number): { level: number; xpToNext: number; progress: number } {
  let level = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextThreshold = LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const xpInLevel = xp - currentThreshold;
  const xpNeeded = nextThreshold - currentThreshold;
  return {
    level,
    xpToNext: nextThreshold - xp,
    progress: Math.min(100, Math.round((xpInLevel / xpNeeded) * 100)),
  };
}

export function useGamification() {
  const { user } = useAuth();
  const [stats, setStats] = useState<GameStats | null>(null);
  const [xpPopup, setXpPopup] = useState<{ amount: number; id: number } | null>(null);
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  const loadStats = useCallback(async () => {
    if (!user) return;
    const ref = doc(db, "gamification", user.uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      const initial = {
        uid: user.uid,
        name: user.displayName || "User",
        xp: 0, level: 1, streak: 0, lastStudyDate: "",
        totalNotes: 0, totalSessions: 0, totalSubjects: 0, totalPomodoros: 0, achievements: [],
      };
      await setDoc(ref, initial);
      setStats({ ...initial, xpToNextLevel: LEVEL_THRESHOLDS[1], xpProgress: 0 });
      return;
    }

    const data = snap.data();
    const { level, xpToNext, progress } = calculateLevel(data.xp || 0);
    setStats({
      xp: data.xp || 0, level,
      streak: data.streak || 0,
      lastStudyDate: data.lastStudyDate || "",
      totalNotes: data.totalNotes || 0,
      totalSessions: data.totalSessions || 0,
      totalSubjects: data.totalSubjects || 0,
      totalPomodoros: data.totalPomodoros || 0,
      achievements: data.achievements || [],
      xpToNextLevel: xpToNext,
      xpProgress: progress,
    });
  }, [user]);

  useEffect(() => { loadStats(); }, [loadStats]);

  const awardXP = useCallback(async (action: keyof typeof XP_REWARDS) => {
    if (!user) return;
    const xpAmount = XP_REWARDS[action];
    const ref = doc(db, "gamification", user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data();

    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    let newStreak = data.streak || 0;
    let streakBonus = 0;

    if (data.lastStudyDate !== today) {
      newStreak = data.lastStudyDate === yesterday ? newStreak + 1 : 1;
      streakBonus = XP_REWARDS.streak * Math.min(newStreak, 30);
    }

    const totalXP = (data.xp || 0) + xpAmount + streakBonus;
    const { level } = calculateLevel(totalXP);

    const unlockedIds = new Set((data.achievements || []).map((a: Achievement) => a.id));
    const newUnlocked: Achievement[] = [];

    const check = (id: string) => {
      if (!unlockedIds.has(id)) {
        const a = ALL_ACHIEVEMENTS.find(x => x.id === id);
        if (a) { newUnlocked.push({ ...a, unlockedAt: new Date().toISOString() }); unlockedIds.add(id); }
      }
    };

    const newTotals = {
      totalNotes: (data.totalNotes || 0) + (action === "note" ? 1 : 0),
      totalSessions: (data.totalSessions || 0) + (action === "search" ? 1 : 0),
      totalSubjects: (data.totalSubjects || 0) + (action === "subject" ? 1 : 0),
      totalPomodoros: (data.totalPomodoros || 0) + (action === "pomodoro" ? 1 : 0),
    };

    if (action === "search" && newTotals.totalSessions === 1) check("first_search");
    if (action === "note" && newTotals.totalNotes === 1) check("first_note");
    if (action === "subject" && newTotals.totalSubjects === 1) check("first_subject");
    if (action === "pomodoro" && newTotals.totalPomodoros === 1) check("first_pomodoro");
    if (newTotals.totalPomodoros >= 10) check("pomodoro_10");
    if (newTotals.totalPomodoros >= 50) check("pomodoro_50");
    if (action === "pdf") check("first_pdf");
    if (newStreak >= 3) check("streak_3");
    if (newStreak >= 7) check("streak_7");
    if (newStreak >= 30) check("streak_30");
    if (newTotals.totalNotes >= 5) check("notes_5");
    if (newTotals.totalNotes >= 20) check("notes_20");
    if (newTotals.totalSessions >= 10) check("sessions_10");
    if (newTotals.totalSessions >= 50) check("sessions_50");
    if (level >= 5) check("level_5");
    if (level >= 10) check("level_10");
    if (newTotals.totalSubjects >= 5) check("subjects_5");
    if (totalXP >= 1000) check("xp_1000");

    await updateDoc(ref, {
      xp: totalXP, level, streak: newStreak, lastStudyDate: today,
      name: user.displayName || "User",
      ...newTotals,
      achievements: [...(data.achievements || []), ...newUnlocked],
    });

    setXpPopup({ amount: xpAmount + streakBonus, id: Date.now() });
    setTimeout(() => setXpPopup(null), 2500);
    if (newUnlocked.length > 0) {
      setNewAchievements(newUnlocked);
      setTimeout(() => setNewAchievements([]), 4000);
    }
    await loadStats();
  }, [user, loadStats]);

  const loadLeaderboard = useCallback(async () => {
    try {
      const q = query(collection(db, "gamification"), orderBy("xp", "desc"), limit(10));
      const snap = await getDocs(q);
      setLeaderboard(snap.docs.map(d => {
        const data = d.data();
        return { uid: d.id, name: data.name || "Anonymous", xp: data.xp || 0, level: data.level || 1, streak: data.streak || 0 };
      }));
    } catch (e) { console.error("Leaderboard error:", e); }
  }, []);

  return { stats, xpPopup, newAchievements, leaderboard, awardXP, loadLeaderboard, loadStats };
}