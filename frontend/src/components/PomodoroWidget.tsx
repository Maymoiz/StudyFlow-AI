import { useNavigate, useLocation } from "react-router-dom";
import { usePomodoro } from "../hooks/usePomodoro";
import "../styles/pomodoro.css";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function PomodoroWidget() {
  const { mode, secondsLeft, isRunning, sessionsCompleted, durations, toggle } = usePomodoro();
  const navigate = useNavigate();
  const location = useLocation();

  // Hide on auth pages
  if (location.pathname === "/login" || location.pathname === "/signup") return null;

  // On the timer page itself, show a compact inline bar at the top instead of the floating widget
  if (location.pathname === "/timer") {
    return null;
  }

  // Show widget any time the timer isn't at full reset (i.e. user has interacted with it)
  const isAtReset = !isRunning && secondsLeft === durations[mode] && sessionsCompleted === 0;
  if (isAtReset) return null;

  const progress = 1 - secondsLeft / durations[mode];

  return (
    <div className={`pomo-widget pomo-widget--${mode}`} onClick={() => navigate("/timer")}>
      {/* Circular mini progress ring */}
      <svg className="pomo-widget-ring" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="15" className="pomo-ring-track" />
        <circle
          cx="18" cy="18" r="15"
          className={`pomo-ring-fill pomo-ring--${mode}`}
          style={{
            strokeDasharray: `${2 * Math.PI * 15}`,
            strokeDashoffset: `${2 * Math.PI * 15 * (1 - progress)}`,
          }}
        />
      </svg>

      <div className="pomo-widget-info">
        <span className="pomo-widget-time">{formatTime(secondsLeft)}</span>
        <span className="pomo-widget-label">{mode === "focus" ? "Focus" : mode === "short_break" ? "Short Break" : "Long Break"}</span>
      </div>

      <button
        className="pomo-widget-toggle"
        onClick={e => { e.stopPropagation(); toggle(); }}
        title={isRunning ? "Pause" : "Start"}
      >
        {isRunning ? "⏸" : "▶"}
      </button>
    </div>
  );
}