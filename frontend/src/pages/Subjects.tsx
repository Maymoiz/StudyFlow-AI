import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/subjects.css";

interface Subject {
  _id: string;
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

const API = "http://localhost:3000/api";

export default function Subjects() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubject, setActiveSubject] = useState<Subject | null>(null);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Subject | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formIcon, setFormIcon] = useState("📚");
  const [formColor, setFormColor] = useState("#6a5af9");
  const [formDesc, setFormDesc] = useState("");
  const [formTopics, setFormTopics] = useState<string[]>([]);
  const [topicInput, setTopicInput] = useState("");

  // Load subjects from backend
  useEffect(() => {
    if (!user) return;
    fetchSubjects();
  }, [user]);

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/subjects/${user!.uid}`);
      const data = await res.json();
      setSubjects(Array.isArray(data) ? data : []);
    } catch {
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  };

  const openAddForm = () => {
    setEditTarget(null);
    setFormName(""); setFormIcon("📚"); setFormColor("#6a5af9");
    setFormDesc(""); setFormTopics([]); setTopicInput("");
    setShowForm(true);
  };

  const openEditForm = (s: Subject) => {
    setEditTarget(s);
    setFormName(s.name); setFormIcon(s.icon); setFormColor(s.color);
    setFormDesc(s.description); setFormTopics([...s.topics]); setTopicInput("");
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !user) return;
    const payload = {
      uid: user.uid,
      name: formName.trim(),
      icon: formIcon,
      color: formColor,
      description: formDesc.trim(),
      topics: formTopics,
    };

    if (editTarget) {
      await fetch(`${API}/subjects/${editTarget._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch(`${API}/subjects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    setShowForm(false);
    fetchSubjects();
  };

  const handleDelete = async (id: string) => {
    await fetch(`${API}/subjects/${id}`, { method: "DELETE" });
    setActiveSubject(null);
    fetchSubjects();
  };

  const addTopic = () => {
    const t = topicInput.trim();
    if (t && !formTopics.includes(t)) {
      setFormTopics([...formTopics, t]);
    }
    setTopicInput("");
  };

  const removeTopic = (t: string) => setFormTopics(formTopics.filter(x => x !== t));

  const filtered = subjects.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.topics?.some(t => t.toLowerCase().includes(search.toLowerCase()))
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

            <label className="form-label">Name</label>
            <input
              className="form-input"
              placeholder="e.g. Biology"
              value={formName}
              onChange={e => setFormName(e.target.value)}
            />

            <label className="form-label">Description</label>
            <input
              className="form-input"
              placeholder="Short description (optional)"
              value={formDesc}
              onChange={e => setFormDesc(e.target.value)}
            />

            <label className="form-label">Icon</label>
            <div className="icon-grid">
              {ICON_OPTIONS.map(ic => (
                <button
                  key={ic}
                  className={`icon-btn ${formIcon === ic ? "selected" : ""}`}
                  onClick={() => setFormIcon(ic)}
                >{ic}</button>
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
                placeholder="Add a topic…"
                value={topicInput}
                onChange={e => setTopicInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTopic())}
              />
              <button className="topic-add-btn" onClick={addTopic}>Add</button>
            </div>
            <div className="topic-chips">
              {formTopics.map(t => (
                <span key={t} className="topic-chip">
                  {t}
                  <button onClick={() => removeTopic(t)}>✕</button>
                </span>
              ))}
            </div>

            <div className="form-actions">
              <button className="form-cancel-btn" onClick={() => setShowForm(false)}>Cancel</button>
              {editTarget && (
                <button className="form-delete-btn" onClick={() => { handleDelete(editTarget._id); setShowForm(false); }}>
                  Delete
                </button>
              )}
              <button className="form-save-btn" onClick={handleSave} disabled={!formName.trim()}>
                {editTarget ? "Save changes" : "Create subject"}
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
              <p>No topics yet — edit this subject to add some.</p>
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
                  key={subject._id}
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
