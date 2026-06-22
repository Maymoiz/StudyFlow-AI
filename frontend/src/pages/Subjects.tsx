import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  collection, addDoc, getDocs, updateDoc, deleteDoc,
  doc, query, where, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import "../styles/subjects.css";

interface Subject {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  topics: string[];
}

const ICON_OPTIONS = [
  "📚","📐","🔬","📜","💻","🌍","🎨","🎵","⚗️","🧬","🏛️","✏️",
  "🔭","🧮","📊","🗺️","🎭","📖","🧪","💡","🏆","🌱",
];

const COLOR_OPTIONS = [
  "#6a5af9","#b372f3","#22d3ee","#34d399","#f59e0b",
  "#fb923c","#f472b6","#60a5fa","#a3e635","#e879f9",
];

export default function Subjects() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSubject, setActiveSubject] = useState<Subject | null>(null);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Subject | null>(null);
  const [formError, setFormError] = useState("");

  // Form state
  const [formName, setFormName] = useState("");
  const [formIcon, setFormIcon] = useState("📚");
  const [formColor, setFormColor] = useState("#6a5af9");
  const [formDesc, setFormDesc] = useState("");
  const [formTopics, setFormTopics] = useState<string[]>([]);
  const [topicInput, setTopicInput] = useState("");

  useEffect(() => {
    if (user) fetchSubjects();
  }, [user]);

  const fetchSubjects = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, "subjects"),
        where("userId", "==", user.uid)
      );
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Subject));
      // Sort by createdAt client-side to avoid needing a composite index
      data.sort((a: any, b: any) => (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0));
      setSubjects(data);
    } catch (e: any) {
      console.error("Fetch subjects error:", e);
    } finally {
      setLoading(false);
    }
  };

  const openAddForm = () => {
    setEditTarget(null);
    setFormName(""); setFormIcon("📚"); setFormColor("#6a5af9");
    setFormDesc(""); setFormTopics([]); setTopicInput("");
    setFormError("");
    setShowForm(true);
  };

  const openEditForm = (s: Subject) => {
    setEditTarget(s);
    setFormName(s.name); setFormIcon(s.icon); setFormColor(s.color);
    setFormDesc(s.description || ""); setFormTopics([...s.topics]); setTopicInput("");
    setFormError("");
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !user) return;
    setSaving(true);
    setFormError("");
    try {
      if (editTarget) {
        await updateDoc(doc(db, "subjects", editTarget.id), {
          name: formName.trim(),
          icon: formIcon,
          color: formColor,
          description: formDesc.trim(),
          topics: formTopics,
        });
      } else {
        await addDoc(collection(db, "subjects"), {
          userId: user.uid,
          name: formName.trim(),
          icon: formIcon,
          color: formColor,
          description: formDesc.trim(),
          topics: formTopics,
          createdAt: serverTimestamp(),
        });
      }
      setShowForm(false);
      await fetchSubjects();
    } catch (e: any) {
      console.error("Save subject error:", e);
      setFormError("Failed to save — check your internet connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "subjects", id));
      setActiveSubject(null);
      setShowForm(false);
      await fetchSubjects();
    } catch (e) {
      console.error("Delete subject error:", e);
    }
  };

  const addTopic = () => {
    const t = topicInput.trim();
    if (t && !formTopics.includes(t)) setFormTopics(prev => [...prev, t]);
    setTopicInput("");
  };

  const removeTopic = (t: string) => setFormTopics(prev => prev.filter(x => x !== t));

  const filtered = subjects.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.topics || []).some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

  const askAI = (topic: string) => navigate("/ai", { state: { prefill: `Explain ${topic}` } });

  return (
    <div className="subjects-page">
      <div className="subjects-header">
        <div>
          <h1>Subjects</h1>
          <p className="subjects-sub">{subjects.length} subject{subjects.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="subjects-header-right">
          <input
            className="subjects-search"
            placeholder="Search subjects or topics…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button className="subjects-add-btn" onClick={openAddForm}>+ Add Subject</button>
        </div>
      </div>

      {/* ADD / EDIT MODAL */}
      {showForm && (
        <div className="subjects-modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="subjects-modal" onClick={e => e.stopPropagation()}>
            <h2>{editTarget ? "Edit Subject" : "New Subject"}</h2>

            {formError && <p className="subjects-form-error">⚠️ {formError}</p>}

            <label className="form-label">Name</label>
            <input
              className="form-input"
              placeholder="e.g. Biology"
              value={formName}
              onChange={e => setFormName(e.target.value)}
              autoFocus
            />

            <label className="form-label">Description (optional)</label>
            <input
              className="form-input"
              placeholder="Short description"
              value={formDesc}
              onChange={e => setFormDesc(e.target.value)}
            />

            <label className="form-label">Icon</label>
            <div className="icon-grid">
              {ICON_OPTIONS.map(ic => (
                <button key={ic} className={`icon-btn ${formIcon === ic ? "selected" : ""}`} onClick={() => setFormIcon(ic)}>
                  {ic}
                </button>
              ))}
            </div>

            <label className="form-label">Colour</label>
            <div className="color-grid">
              {COLOR_OPTIONS.map(c => (
                <button
                  key={c}
                  className={`color-btn ${formColor === c ? "selected" : ""}`}
                  style={{ background: c }}
                  onClick={() => setFormColor(c)}
                />
              ))}
            </div>

            <label className="form-label">Topics</label>
            <div className="topic-input-row">
              <input
                className="form-input"
                placeholder="Add a topic and press Enter…"
                value={topicInput}
                onChange={e => setTopicInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTopic())}
              />
              <button className="topic-add-btn" onClick={addTopic}>Add</button>
            </div>
            {formTopics.length > 0 && (
              <div className="topic-chips">
                {formTopics.map(t => (
                  <span key={t} className="topic-chip">
                    {t}
                    <button onClick={() => removeTopic(t)}>✕</button>
                  </span>
                ))}
              </div>
            )}

            <div className="form-actions">
              <button className="form-cancel-btn" onClick={() => setShowForm(false)}>Cancel</button>
              {editTarget && (
                <button className="form-delete-btn" onClick={() => handleDelete(editTarget.id)}>
                  Delete
                </button>
              )}
              <button className="form-save-btn" onClick={handleSave} disabled={!formName.trim() || saving}>
                {saving ? <span className="form-spinner" /> : editTarget ? "Save changes" : "Create subject"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUBJECT DETAIL */}
      {activeSubject && !showForm && (
        <div className="subject-detail">
          <div className="subject-detail-nav">
            <button className="subject-back-btn" onClick={() => setActiveSubject(null)}>← Back</button>
            <button className="subject-edit-btn" onClick={() => openEditForm(activeSubject)}>✏️ Edit</button>
          </div>
          <div className="subject-detail-header" style={{ borderColor: activeSubject.color }}>
            <span className="subject-detail-icon">{activeSubject.icon}</span>
            <div>
              <h2>{activeSubject.name}</h2>
              {activeSubject.description && <p>{activeSubject.description}</p>}
            </div>
          </div>
          {activeSubject.topics?.length > 0 ? (
            <>
              <h3 className="topics-heading">Topics</h3>
              <div className="topics-grid">
                {activeSubject.topics.map(topic => (
                  <div key={topic} className="topic-card" style={{ "--accent": activeSubject.color } as React.CSSProperties}>
                    <span className="topic-name">{topic}</span>
                    <button className="topic-ask-btn" onClick={() => askAI(topic)}>Ask AI →</button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="subjects-empty">
              <p>No topics yet.</p>
              <button className="subjects-add-btn" onClick={() => openEditForm(activeSubject)}>Add topics</button>
            </div>
          )}
        </div>
      )}

      {/* SUBJECT GRID */}
      {!activeSubject && (
        <>
          {loading ? (
            <div className="subjects-loading">
              <div className="subjects-spinner" />
              <p>Loading subjects…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="subjects-empty">
              {subjects.length === 0 ? (
                <>
                  <span className="subjects-empty-icon">📚</span>
                  <p>No subjects yet — create your first one.</p>
                  <button className="subjects-add-btn" onClick={openAddForm}>+ Add Subject</button>
                </>
              ) : (
                <p>No subjects match "<strong>{search}</strong>"</p>
              )}
            </div>
          ) : (
            <div className="subjects-grid">
              {filtered.map(subject => (
                <div
                  key={subject.id}
                  className="subject-card"
                  style={{ "--accent": subject.color } as React.CSSProperties}
                  onClick={() => setActiveSubject(subject)}
                >
                  <div className="subject-card-top">
                    <span className="subject-card-icon">{subject.icon}</span>
                    <div className="subject-card-dot" style={{ background: subject.color }} />
                  </div>
                  <h2 className="subject-card-name">{subject.name}</h2>
                  {subject.description && <p className="subject-card-desc">{subject.description}</p>}
                  <div className="subject-card-topics">
                    {(subject.topics || []).slice(0, 3).map(t => (
                      <span key={t} className="subject-topic-pill">{t}</span>
                    ))}
                    {(subject.topics || []).length > 3 && (
                      <span className="subject-topic-pill subject-topic-more">+{subject.topics.length - 3}</span>
                    )}
                    {(subject.topics || []).length === 0 && (
                      <span className="subject-topic-pill" style={{ color: "#555" }}>No topics yet</span>
                    )}
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
