import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import "../styles/notes.css";

interface Note {
  id: string;
  title: string;
  content: string;
  subject: string;
  createdAt: string;
}

const SUBJECTS = ["Math", "Science", "History", "English", "Computer Science", "Other"];

export default function Notes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [subject, setSubject] = useState("Other");
  const [search, setSearch] = useState("");
  const [filterSubject, setFilterSubject] = useState("All");
  const [activeNote, setActiveNote] = useState<Note | null>(null);

  // Load from localStorage keyed by user
  useEffect(() => {
    if (!user) return;
    const saved = localStorage.getItem(`studyflow_notes_${user.uid}`);
    if (saved) setNotes(JSON.parse(saved));
  }, [user]);

  const save = (updated: Note[]) => {
    setNotes(updated);
    if (user) localStorage.setItem(`studyflow_notes_${user.uid}`, JSON.stringify(updated));
  };

  const handleAdd = () => {
    if (!title.trim() || !content.trim()) return;
    const note: Note = {
      id: crypto.randomUUID(),
      title: title.trim(),
      content: content.trim(),
      subject,
      createdAt: new Date().toISOString(),
    };
    save([note, ...notes]);
    setTitle(""); setContent(""); setSubject("Other"); setShowForm(false);
  };

  const handleDelete = (id: string) => {
    save(notes.filter(n => n.id !== id));
    if (activeNote?.id === id) setActiveNote(null);
  };

  const filtered = notes.filter(n => {
    const matchSearch = n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase());
    const matchSubject = filterSubject === "All" || n.subject === filterSubject;
    return matchSearch && matchSubject;
  });

  return (
    <div className="notes-page">
      <div className="notes-header">
        <div>
          <h1>Notes</h1>
          <p className="notes-sub">{notes.length} note{notes.length !== 1 ? "s" : ""} saved</p>
        </div>
        <button className="notes-add-btn" onClick={() => setShowForm(true)}>+ New Note</button>
      </div>

      <div className="notes-toolbar">
        <input
          className="notes-search"
          placeholder="Search notes…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="notes-filter-pills">
          {["All", ...SUBJECTS].map(s => (
            <button
              key={s}
              className={`filter-pill ${filterSubject === s ? "active" : ""}`}
              onClick={() => setFilterSubject(s)}
            >{s}</button>
          ))}
        </div>
      </div>

      {showForm && (
        <div className="notes-modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="notes-modal" onClick={e => e.stopPropagation()}>
            <h2>New Note</h2>
            <input
              className="notes-input"
              placeholder="Title"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
            <select className="notes-select" value={subject} onChange={e => setSubject(e.target.value)}>
              {SUBJECTS.map(s => <option key={s}>{s}</option>)}
            </select>
            <textarea
              className="notes-textarea"
              placeholder="Write your notes here…"
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={8}
            />
            <div className="notes-modal-actions">
              <button className="notes-cancel-btn" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="notes-save-btn" onClick={handleAdd}>Save Note</button>
            </div>
          </div>
        </div>
      )}

      {activeNote && (
        <div className="notes-modal-backdrop" onClick={() => setActiveNote(null)}>
          <div className="notes-modal notes-view" onClick={e => e.stopPropagation()}>
            <div className="notes-view-header">
              <span className="note-subject-tag">{activeNote.subject}</span>
              <button className="notes-close-btn" onClick={() => setActiveNote(null)}>✕</button>
            </div>
            <h2>{activeNote.title}</h2>
            <p className="notes-view-date">{new Date(activeNote.createdAt).toLocaleDateString("en-ZA", { year: "numeric", month: "long", day: "numeric" })}</p>
            <pre className="notes-view-content">{activeNote.content}</pre>
            <button className="notes-delete-btn" onClick={() => handleDelete(activeNote.id)}>Delete Note</button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="notes-empty">
          <span className="notes-empty-icon">📝</span>
          <p>{notes.length === 0 ? "No notes yet — create your first one." : "No notes match your search."}</p>
        </div>
      ) : (
        <div className="notes-grid">
          {filtered.map(note => (
            <div key={note.id} className="note-card" onClick={() => setActiveNote(note)}>
              <div className="note-card-top">
                <span className="note-subject-tag">{note.subject}</span>
                <button className="note-delete-x" onClick={e => { e.stopPropagation(); handleDelete(note.id); }}>✕</button>
              </div>
              <h3 className="note-card-title">{note.title}</h3>
              <p className="note-card-preview">{note.content}</p>
              <span className="note-card-date">{new Date(note.createdAt).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
