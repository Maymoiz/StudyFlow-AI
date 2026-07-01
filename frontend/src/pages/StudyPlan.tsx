import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { API } from "../config";
import {
  collection, addDoc, getDocs, deleteDoc,
  doc, query, where, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import "../styles/studyplan.css";

interface PlanTask {
  time: string;
  activity: string;
  type: "study" | "review" | "practice" | "break" | "assessment";
  subject: string;
  notes?: string;
}

interface PlanDay {
  day: number;
  date: string;
  theme: string;
  tasks: PlanTask[];
  dailyGoal: string;
}

interface StudyPlan {
  id?: string;
  title: string;
  summary: string;
  totalDays: number;
  hoursPerDay: number;
  days: PlanDay[];
  weeklyMilestones: string[];
  tips: string[];
  resources: string[];
  createdAt?: any;
}

const SUBJECTS = ["Math", "Science", "History", "English", "Computer Science", "Other", "Multiple"];
const TASK_COLORS: Record<string, string> = {
  study: "#7c6af7",
  review: "#60a5fa",
  practice: "#34d399",
  break: "#f59e0b",
  assessment: "#f87171",
};

export default function StudyPlan() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [activePlan, setActivePlan] = useState<StudyPlan | null>(null);
  const [activeDay, setActiveDay] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [loadingMsg, setLoadingMsg] = useState("");

  // Form fields
  const [subject, setSubject] = useState("Math");
  const [goal, setGoal] = useState("");
  const [examDate, setExamDate] = useState("");
  const [hoursPerDay, setHoursPerDay] = useState(3);
  const [currentLevel, setCurrentLevel] = useState("beginner");
  const [extraContext, setExtraContext] = useState("");

  useEffect(() => { if (user) fetchPlans(); }, [user]);

  const fetchPlans = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(collection(db, "studyPlans"), where("userId", "==", user.uid));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as StudyPlan));
      data.sort((a: any, b: any) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      setPlans(data);
    } catch (e) { console.error("Fetch plans error:", e); }
    finally { setLoading(false); }
  };

  const daysUntil = (dateStr: string) => {
    if (!dateStr) return 7;
    const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
    return Math.max(1, Math.min(diff, 90));
  };

  const generatePlan = async () => {
    if (!goal.trim() || !user) return;
    setError("");
    setGenerating(true);

    const msgs = ["Analyzing your goals…", "Building your schedule…", "Optimizing study blocks…", "Finalizing your plan…"];
    let i = 0;
    setLoadingMsg(msgs[0]);
    const interval = setInterval(() => { i = (i + 1) % msgs.length; setLoadingMsg(msgs[i]); }, 2000);

    const days = daysUntil(examDate);
    const prompt = `
Subject: ${subject}
Goal: ${goal}
Current level: ${currentLevel}
Available study time: ${hoursPerDay} hours per day
Number of days: ${days}${examDate ? `\nExam/deadline date: ${examDate}` : ""}
${extraContext ? `Additional context: ${extraContext}` : ""}

Create a complete ${days}-day study plan with ${hoursPerDay} hours of study per day.
`;

    try {
      const formData = new FormData();
      formData.append("query", prompt);
      formData.append("mode", "studyplan");

      const res = await fetch(API.studyplan, { method: "POST", body: formData });
      const data = await res.json();

      if (data.error || !data.days) {
        setError(data.error || "Failed to generate plan. Please try again.");
        return;
      }

      // Save to Firestore
      const docRef = await addDoc(collection(db, "studyPlans"), {
        userId: user.uid,
        ...data,
        subject,
        examDate: examDate || null,
        createdAt: serverTimestamp(),
      });

      const saved: StudyPlan = { id: docRef.id, ...data };
      setPlans(prev => [saved, ...prev]);
      setActivePlan(saved);
      setActiveDay(0);
      setShowForm(false);
    } catch (e) {
      setError("Something went wrong. Please try again.");
    } finally {
      clearInterval(interval);
      setGenerating(false);
    }
  };

  const deletePlan = async (id: string) => {
    await deleteDoc(doc(db, "studyPlans", id));
    setPlans(prev => prev.filter(p => p.id !== id));
    if (activePlan?.id === id) setActivePlan(null);
  };

  return (
    <div className="sp-page">
      <div className="sp-header">
        <div>
          <h1>Study Plan</h1>
          <p className="sp-sub">AI-generated personalised study schedules</p>
        </div>
        <button className="sp-new-btn" onClick={() => setShowForm(true)}>✨ Generate Plan</button>
      </div>

      {/* GENERATE FORM */}
      {showForm && (
        <div className="sp-modal-backdrop" onClick={() => !generating && setShowForm(false)}>
          <div className="sp-modal" onClick={e => e.stopPropagation()}>
            <div className="sp-modal-header">
              <h2>Create Study Plan</h2>
              {!generating && <button className="sp-close-btn" onClick={() => setShowForm(false)}>✕</button>}
            </div>

            {generating ? (
              <div className="sp-generating">
                <div className="sp-gen-spinner" />
                <p className="sp-gen-msg">{loadingMsg}</p>
                <p className="sp-gen-sub">This takes about 15 seconds…</p>
              </div>
            ) : (
              <>
                {error && <p className="sp-error">⚠️ {error}</p>}

                <div className="sp-form">
                  <div className="sp-field">
                    <label>Subject</label>
                    <select className="sp-input sp-select" value={subject} onChange={e => setSubject(e.target.value)}>
                      {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>

                  <div className="sp-field">
                    <label>What's your goal?</label>
                    <input
                      className="sp-input"
                      placeholder="e.g. Prepare for my Grade 12 Maths final exam covering calculus and algebra"
                      value={goal}
                      onChange={e => setGoal(e.target.value)}
                      autoFocus
                    />
                  </div>

                  <div className="sp-field-row">
                    <div className="sp-field">
                      <label>Exam / deadline date (optional)</label>
                      <input
                        className="sp-input"
                        type="date"
                        value={examDate}
                        onChange={e => setExamDate(e.target.value)}
                        min={new Date().toISOString().slice(0, 10)}
                      />
                    </div>
                    <div className="sp-field">
                      <label>Hours per day: <strong>{hoursPerDay}h</strong></label>
                      <input
                        type="range" min={1} max={10} step={0.5}
                        value={hoursPerDay}
                        onChange={e => setHoursPerDay(Number(e.target.value))}
                        className="sp-range"
                      />
                    </div>
                  </div>

                  <div className="sp-field">
                    <label>Current level</label>
                    <div className="sp-level-pills">
                      {["beginner", "intermediate", "advanced"].map(l => (
                        <button
                          key={l}
                          className={`sp-level-pill ${currentLevel === l ? "active" : ""}`}
                          onClick={() => setCurrentLevel(l)}
                        >
                          {l.charAt(0).toUpperCase() + l.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="sp-field">
                    <label>Additional context (optional)</label>
                    <textarea
                      className="sp-input sp-textarea"
                      placeholder="e.g. I'm weak on integration, strong on algebra. I study best in the morning."
                      value={extraContext}
                      onChange={e => setExtraContext(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <button
                    className="sp-generate-btn"
                    onClick={generatePlan}
                    disabled={!goal.trim()}
                  >
                    ✨ Generate My Study Plan
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* PLAN DETAIL VIEW */}
      {activePlan ? (
        <div className="sp-detail">
          <button className="sp-back-btn" onClick={() => setActivePlan(null)}>← All Plans</button>

          <div className="sp-detail-header">
            <div>
              <h2>{activePlan.title}</h2>
              <p className="sp-detail-summary">{activePlan.summary}</p>
            </div>
            <div className="sp-detail-meta">
              <span>📅 {activePlan.totalDays} days</span>
              <span>⏱ {activePlan.hoursPerDay}h/day</span>
            </div>
          </div>

          <div className="sp-layout">
            {/* DAY SELECTOR */}
            <div className="sp-day-nav">
              <p className="sp-day-nav-label">Days</p>
              <div className="sp-day-list">
                {activePlan.days.map((d, i) => (
                  <button
                    key={i}
                    className={`sp-day-btn ${activeDay === i ? "active" : ""}`}
                    onClick={() => setActiveDay(i)}
                  >
                    <span className="sp-day-num">Day {d.day}</span>
                    <span className="sp-day-theme">{d.theme}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* DAY DETAIL */}
            <div className="sp-day-detail">
              {activePlan.days[activeDay] && (
                <>
                  <div className="sp-day-header">
                    <h3>Day {activePlan.days[activeDay].day} — {activePlan.days[activeDay].theme}</h3>
                    <div className="sp-daily-goal">
                      🎯 <strong>Goal:</strong> {activePlan.days[activeDay].dailyGoal}
                    </div>
                  </div>

                  <div className="sp-tasks">
                    {activePlan.days[activeDay].tasks.map((task, i) => (
                      <div key={i} className="sp-task" style={{ "--task-color": TASK_COLORS[task.type] || "#7c6af7" } as React.CSSProperties}>
                        <div className="sp-task-time">{task.time}</div>
                        <div className="sp-task-body">
                          <div className="sp-task-top">
                            <span className="sp-task-type" style={{ background: `${TASK_COLORS[task.type]}22`, color: TASK_COLORS[task.type], borderColor: `${TASK_COLORS[task.type]}44` }}>
                              {task.type}
                            </span>
                            <span className="sp-task-subject">{task.subject}</span>
                          </div>
                          <p className="sp-task-activity">{task.activity}</p>
                          {task.notes && <p className="sp-task-notes">💡 {task.notes}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* SIDEBAR */}
            <div className="sp-sidebar">
              {activePlan.weeklyMilestones?.length > 0 && (
                <div className="sp-sidebar-card">
                  <h4>📈 Milestones</h4>
                  <ul className="sp-list">
                    {activePlan.weeklyMilestones.map((m, i) => <li key={i}>{m}</li>)}
                  </ul>
                </div>
              )}
              {activePlan.tips?.length > 0 && (
                <div className="sp-sidebar-card">
                  <h4>💡 Study Tips</h4>
                  <ul className="sp-list">
                    {activePlan.tips.map((t, i) => <li key={i}>{t}</li>)}
                  </ul>
                </div>
              )}
              {activePlan.resources?.length > 0 && (
                <div className="sp-sidebar-card">
                  <h4>📚 Resources</h4>
                  <ul className="sp-list">
                    {activePlan.resources.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* PLANS LIST */
        <>
          {loading ? (
            <div className="sp-loading"><div className="sp-spinner" /><p>Loading plans…</p></div>
          ) : plans.length === 0 ? (
            <div className="sp-empty">
              <span className="sp-empty-icon">📅</span>
              <p>No study plans yet — generate your first one!</p>
              <button className="sp-new-btn" onClick={() => setShowForm(true)}>✨ Generate Plan</button>
            </div>
          ) : (
            <div className="sp-plans-grid">
              {plans.map(plan => (
                <div key={plan.id} className="sp-plan-card" onClick={() => { setActivePlan(plan); setActiveDay(0); }}>
                  <div className="sp-plan-card-top">
                    <span className="sp-plan-badge">{(plan as any).subject || "Study"}</span>
                    <button className="sp-plan-delete" onClick={e => { e.stopPropagation(); deletePlan(plan.id!); }}>✕</button>
                  </div>
                  <h3>{plan.title}</h3>
                  <p className="sp-plan-summary">{plan.summary}</p>
                  <div className="sp-plan-meta">
                    <span>📅 {plan.totalDays} days</span>
                    <span>⏱ {plan.hoursPerDay}h/day</span>
                    <span>📋 {plan.days?.length || 0} sessions</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}