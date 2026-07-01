import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";
import { useAuth } from "../context/AuthContext";
import { useGamification } from "./useGamification";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

export type PomodoroMode = "focus" | "short_break" | "long_break";

const DURATIONS: Record<PomodoroMode, number> = {
  focus: 25 * 60,
  short_break: 5 * 60,
  long_break: 15 * 60,
};

interface PomodoroState {
  mode: PomodoroMode;
  secondsLeft: number;
  isRunning: boolean;
  sessionsCompleted: number;
  label: string;
  toggle: () => void;
  reset: () => void;
  skip: () => void;
  setLabel: (l: string) => void;
  setCustomDuration: (mode: PomodoroMode, minutes: number) => void;
  durations: Record<PomodoroMode, number>;
}

const PomodoroContext = createContext<PomodoroState | null>(null);

export function PomodoroProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { awardXP } = useGamification();

  const [durations, setDurations] = useState<Record<PomodoroMode, number>>(DURATIONS);
  const [mode, setMode] = useState<PomodoroMode>("focus");
  const [secondsLeft, setSecondsLeft] = useState(DURATIONS.focus);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [label, setLabel] = useState("");
  const intervalRef = useRef<number | null>(null);
  const audioRef = useRef<AudioContext | null>(null);

  const playChime = () => {
    try {
      if (!audioRef.current) audioRef.current = new AudioContext();
      const ctx = audioRef.current;
      [0, 0.15, 0.3].forEach((delay, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = 523.25 * (i === 2 ? 2 : 1);
        gain.gain.setValueAtTime(0.15, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.4);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.4);
      });
    } catch {}
  };

  const logSession = useCallback(async (completedMode: PomodoroMode, durationSec: number) => {
    if (!user) return;
    try {
      await addDoc(collection(db, "pomodoroSessions"), {
        userId: user.uid,
        mode: completedMode,
        durationMinutes: Math.round(durationSec / 60),
        label: label.trim() || null,
        completedAt: serverTimestamp(),
      });
      if (completedMode === "focus") {
        await awardXP("pomodoro");
      }
    } catch (e) { console.error("Log pomodoro error:", e); }
  }, [user, label, awardXP]);

  const switchMode = useCallback((next: PomodoroMode) => {
    setMode(next);
    setSecondsLeft(durations[next]);
    setIsRunning(false);
  }, [durations]);

  const handleComplete = useCallback(() => {
    playChime();
    logSession(mode, durations[mode]);

    if (mode === "focus") {
      const newCount = sessionsCompleted + 1;
      setSessionsCompleted(newCount);
      switchMode(newCount % 4 === 0 ? "long_break" : "short_break");
    } else {
      switchMode("focus");
    }
  }, [mode, sessionsCompleted, durations, switchMode, logSession]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = window.setInterval(() => {
        setSecondsLeft(s => {
          if (s <= 1) {
            handleComplete();
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, handleComplete]);

  const toggle = () => setIsRunning(r => !r);

  const reset = () => {
    setIsRunning(false);
    setSecondsLeft(durations[mode]);
  };

  const skip = () => {
    setIsRunning(false);
    if (mode === "focus") {
      const newCount = sessionsCompleted + 1;
      setSessionsCompleted(newCount);
      switchMode(newCount % 4 === 0 ? "long_break" : "short_break");
    } else {
      switchMode("focus");
    }
  };

  const setCustomDuration = (m: PomodoroMode, minutes: number) => {
    const seconds = Math.max(60, minutes * 60);
    setDurations(prev => {
      const next = { ...prev, [m]: seconds };
      if (m === mode && !isRunning) setSecondsLeft(seconds);
      return next;
    });
  };

  // Browser tab title shows countdown
  useEffect(() => {
    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;
    const timeStr = `${mins}:${secs.toString().padStart(2, "0")}`;
    document.title = isRunning ? `${timeStr} · ${mode === "focus" ? "Focus" : "Break"} — StudyFlow` : "StudyFlow AI";
    return () => { document.title = "StudyFlow AI"; };
  }, [secondsLeft, isRunning, mode]);

  return (
    <PomodoroContext.Provider value={{
      mode, secondsLeft, isRunning, sessionsCompleted, label,
      toggle, reset, skip, setLabel, setCustomDuration, durations,
    }}>
      {children}
    </PomodoroContext.Provider>
  );
}

export function usePomodoro() {
  const ctx = useContext(PomodoroContext);
  if (!ctx) throw new Error("usePomodoro must be used inside PomodoroProvider");
  return ctx;
}