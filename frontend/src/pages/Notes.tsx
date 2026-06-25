import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  collection, addDoc, getDocs, updateDoc, deleteDoc,
  doc, query, where, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { useGamification } from "../hooks/useGamification";

interface Note {
  id: string;
  title: string;
  content: string;
  subject: string;
  tags: string[];
  pinned: boolean;
  createdAt: any;
  updatedAt?: any;
}

const SUBJECTS = ["Math", "Science", "History", "English", "Computer Science", "Other"];

const SUBJECT_COLORS: Record<string, string> = {
  "Math": "#6a5af9",
  "Science": "#22d3ee",
  "History": "#f59e0b",
  "English": "#34d399",
  "Computer Science": "#b372f3",
  "Other": "#888",
};

export default function Notes() {
  const { user } = useAuth();
  const { awardXP } = useGamification();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Note | null>(null);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [search, setSearch] = useState("");
  const [filterSubject, setFilterSubject] = useState("All");

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [subject, setSubject] = useState("Other");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [pinned, setPinned] = useState(false);

  useEffect(() => { if (user) fetchNotes(); }, [user]);

  const fetchNotes = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(collection(db, "notes"), where("userId", "==", user.uid));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Note));
      data.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        const aTime = a.createdAt?.seconds ?? 0;
        const bTime = b.createdAt?.seconds ?? 0;
        return bTime - aTime;
      });
      setNotes(data);
    } catch (e) {
      console.error("Fetch notes error:", e);
    } finally {
      setLoading(false);
    }
  };

  const openAddForm = () => {
    setEditTarget(null);
    setTitle(""); setContent(""); setSubject("Other");
    setTags([]); setTagInput(""); setPinned(false);
    setShowForm(true);
  };

  const openEditForm = (note: Note) => {
    setEditTarget(note);
    setTitle(note.title); setContent(note.content);
    setSubject(note.subject); setTags([...note.tags]);
    setTagInput(""); setPinned(note.pinned);
    setActiveNote(null);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim() || !user) return;
    setSaving(true);
    try {
      if (editTarget) {
        await updateDoc(doc(db, "notes", editTarget.id), {
          title: title.trim(), content: content.trim(),
          subject, tags, pinned,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, "notes"), {
          userId: user.uid,
          title: title.trim(), content: content.trim(),
          subject, tags, pinned,
          createdAt: serverTimestamp(),
        });
        await awardXP("note");
      }
      setShowForm(false);
      await fetchNotes();
    } catch (e) {
      console.error("Save note error:", e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, "notes", id));
    setActiveNote(null);
    await fetchNotes();
  };

  const handlePin = async (note: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    await updateDoc(doc(db, "notes", note.id), { pinned: !note.pinned });
    await fetchNotes();
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
    setTagInput("");
  };

  const filtered = notes.filter(n => {
    const matchSearch =
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase()) ||
      n.tags?.some(t => t.includes(search.toLowerCase()));
    const matchSubject = filterSubject === "All" || n.subject === filterSubject;
    return matchSearch && matchSubject;
  });

  const pinned_notes = filtered.filter(n => n.pinned);
  const unpinned_notes = filtered.filter(n => !n.pinned);

  return (
    <div className="notes-page">
      <div className="notes-header">
        <div>
          <h1>Notes</h1>
          <p className="notes-sub">{notes.length} note{notes.length !== 1 ? "s" : ""} · synced</p>
        </div>
        <button className="notes-add-btn" onClick={openAddForm}>+ New Note</button>
      </div>

      <div className="notes-toolbar">
        <input
          className="notes-search"
          placeholder="Search notes, tags…"
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

      {/* ADD/EDIT MODAL */}
      {showForm && (
        <div className="notes-modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="notes-modal" onClick={e => e.stopPropagation()}>
            <div className="notes-modal-header">
              <h2>{editTarget ? "Edit Note" : "New Note"}</h2>
              <button className="notes-close-btn" onClick={() => setShowForm(false)}>✕</button>
            </div>

            <input
              className="notes-input"
              placeholder="Title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus
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

            <div className="notes-tag-row">
              <input
                className="notes-input"
                placeholder="Add tag and press Enter…"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag())}
              />
              <button className="notes-tag-add-btn" onClick={addTag}>Add</button>
            </div>

            {tags.length > 0 && (
              <div className="notes-tags">
                {tags.map(t => (
                  <span key={t} className="note-tag">
                    #{t}
                    <button onClick={() => setTags(tags.filter(x => x !== t))}>✕</button>
                  </span>
                ))}
              </div>
            )}

            <label className="notes-pin-label">
              <input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)} />
              📌 Pin this note
            </label>

            <div className="notes-modal-actions">
              <button className="notes-cancel-btn" onClick={() => setShowForm(false)}>Cancel</button>
              {editTarget && (
                <button className="notes-delete-modal-btn" onClick={() => { handleDelete(editTarget.id); setShowForm(false); }}>
                  Delete
                </button>
              )}
              <button
                className="notes-save-btn"
                onClick={handleSave}
                disabled={!title.trim() || !content.trim() || saving}
              >
                {saving ? "Saving…" : editTarget ? "Save changes" : "Save Note"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {activeNote && !showForm && (
        <div className="notes-modal-backdrop" onClick={() => setActiveNote(null)}>
          <div className="notes-modal notes-view" onClick={e => e.stopPropagation()}>
            <div className="notes-view-header">
              <span className="note-subject-tag" style={{ background: `${SUBJECT_COLORS[activeNote.subject]}22`, color: SUBJECT_COLORS[activeNote.subject], borderColor: `${SUBJECT_COLORS[activeNote.subject]}44` }}>
                {activeNote.subject}
              </span>
              <div className="notes-view-actions">
                <button className="notes-view-edit-btn" onClick={() => openEditForm(activeNote)}>✏️ Edit</button>
                <button className="notes-close-btn" onClick={() => setActiveNote(null)}>✕</button>
              </div>
            </div>
            <h2>{activeNote.pinned ? "📌 " : ""}{activeNote.title}</h2>
            <p className="notes-view-date">
              {activeNote.createdAt?.seconds
                ? new Date(activeNote.createdAt.seconds * 1000).toLocaleDateString("en-ZA", { year: "numeric", month: "long", day: "numeric" })
                : "Just now"}
            </p>
            {activeNote.tags?.length > 0 && (
              <div className="notes-tags">
                {activeNote.tags.map(t => <span key={t} className="note-tag">#{t}</span>)}
              </div>
            )}
            <pre className="notes-view-content">{activeNote.content}</pre>
            <button className="notes-delete-btn" onClick={() => handleDelete(activeNote.id)}>Delete Note</button>
          </div>
        </div>
      )}

      {/* NOTES GRID */}
      {loading ? (
        <div className="notes-loading">
          <div className="notes-spinner" />
          <p>Loading notes…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="notes-empty">
          <span className="notes-empty-icon">📝</span>
          <p>{notes.length === 0 ? "No notes yet — create your first one." : "No notes match your search."}</p>
        </div>
      ) : (
        <>
          {pinned_notes.length > 0 && (
            <>
              <p className="notes-section-label">📌 Pinned</p>
              <div className="notes-grid">
                {pinned_notes.map(note => <NoteCard key={note.id} note={note} onClick={() => setActiveNote(note)} onDelete={handleDelete} onPin={handlePin} />)}
              </div>
            </>
          )}
          {unpinned_notes.length > 0 && (
            <>
              {pinned_notes.length > 0 && <p className="notes-section-label">All notes</p>}
              <div className="notes-grid">
                {unpinned_notes.map(note => <NoteCard key={note.id} note={note} onClick={() => setActiveNote(note)} onDelete={handleDelete} onPin={handlePin} />)}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function NoteCard({ note, onClick, onDelete, onPin }: {
  note: Note;
  onClick: () => void;
  onDelete: (id: string) => void;
  onPin: (note: Note, e: React.MouseEvent) => void;
}) {
  const color = SUBJECT_COLORS[note.subject] || "#888";
  return (
    <div className="note-card" onClick={onClick} style={{ "--note-color": color } as React.CSSProperties}>
      <div className="note-card-top">
        <span className="note-subject-tag" style={{ background: `${color}22`, color, borderColor: `${color}44` }}>
          {note.subject}
        </span>
        <div className="note-card-actions">
          <button className={`note-pin-btn ${note.pinned ? "pinned" : ""}`} onClick={e => onPin(note, e)} title={note.pinned ? "Unpin" : "Pin"}>
            📌
          </button>
          <button className="note-delete-x" onClick={e => { e.stopPropagation(); onDelete(note.id); }}>✕</button>
        </div>
      </div>
      <h3 className="note-card-title">{note.title}</h3>
      <p className="note-card-preview">{note.content}</p>
      {note.tags?.length > 0 && (
        <div className="note-card-tags">
          {note.tags.slice(0, 3).map(t => <span key={t} className="note-tag-small">#{t}</span>)}
        </div>
      )}
      <span className="note-card-date">
        {note.createdAt?.seconds
          ? new Date(note.createdAt.seconds * 1000).toLocaleDateString()
          : "Just now"}
      </span>
    </div>
  );
}