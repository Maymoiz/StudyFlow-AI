import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { updateProfile } from "firebase/auth";
import { auth } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import "../styles/profile.css";

function getInitials(name: string | null, email: string | null): string {
  if (name?.trim()) return name.trim().split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  if (email) return email[0].toUpperCase();
  return "U";
}

export default function Profile() {
  const { user, signOut } = useAuth();
  const [subjectCount, setSubjectCount] = useState(0);
  const [noteCount, setNoteCount] = useState(0);
  const [searchCount, setSearchCount] = useState(0);
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState(user?.displayName || "");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Fetch subject count from Firestore
    const fetchSubjects = async () => {
      const q = query(collection(db, "subjects"), where("userId", "==", user.uid));
      const snap = await getDocs(q);
      setSubjectCount(snap.size);
    };

    // Fetch note count from localStorage
    const notes = JSON.parse(localStorage.getItem(`studyflow_notes_${user.uid}`) || "[]");
    setNoteCount(notes.length);

    // Fetch search count from localStorage
    const searches = JSON.parse(localStorage.getItem(`studyflow_searches_${user.uid}`) || "[]");
    setSearchCount(searches.length);

    fetchSubjects();
  }, [user]);

  const handleSaveName = async () => {
    if (!newName.trim() || !user) return;
    setSaving(true);
    try {
      await updateProfile(auth.currentUser!, { displayName: newName.trim() });
      setSaveMsg("Name updated!");
      setEditing(false);
      setTimeout(() => setSaveMsg(""), 3000);
    } catch (err) {
      setSaveMsg("Failed to update name.");
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  const initials = getInitials(user.displayName, user.email);
  const joinedDate = user.metadata.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString("en-ZA", { year: "numeric", month: "long", day: "numeric" })
    : null;

  return (
    <div className="profile-page">
      <div className="profile-top">
        {/* AVATAR */}
        <div className="profile-avatar-wrap">
          {user.photoURL && !imgError ? (
            <img
              src={user.photoURL}
              className="profile-avatar-img"
              alt="avatar"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="profile-avatar-initials">{initials}</div>
          )}
        </div>

        {/* NAME & EMAIL */}
        <div className="profile-info">
          {editing ? (
            <div className="profile-edit-row">
              <input
                className="profile-name-input"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSaveName()}
                autoFocus
              />
              <button className="profile-save-btn" onClick={handleSaveName} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </button>
              <button className="profile-cancel-btn" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          ) : (
            <div className="profile-name-row">
              <h1>{user.displayName || "User"}</h1>
              <button className="profile-edit-btn" onClick={() => { setEditing(true); setNewName(user.displayName || ""); }}>
                ✏️ Edit
              </button>
            </div>
          )}
          {saveMsg && <p className="profile-save-msg">{saveMsg}</p>}
          <p className="profile-email">{user.email}</p>
          {joinedDate && <p className="profile-joined">Joined {joinedDate}</p>}
        </div>
      </div>

      {/* STATS */}
      <div className="profile-stats">
        <div className="profile-stat">
          <span className="profile-stat-value">{subjectCount}</span>
          <span className="profile-stat-label">Subjects</span>
        </div>
        <div className="profile-stat">
          <span className="profile-stat-value">{noteCount}</span>
          <span className="profile-stat-label">Notes</span>
        </div>
        <div className="profile-stat">
          <span className="profile-stat-value">{searchCount}</span>
          <span className="profile-stat-label">AI Sessions</span>
        </div>
      </div>

      {/* ACCOUNT SECTION */}
      <div className="profile-section">
        <h2>Account</h2>
        <div className="profile-detail-row">
          <span className="profile-detail-label">Email</span>
          <span className="profile-detail-value">{user.email}</span>
        </div>
        <div className="profile-detail-row">
          <span className="profile-detail-label">Provider</span>
          <span className="profile-detail-value">
            {user.providerData[0]?.providerId === "google.com" ? "Google" : "Email & Password"}
          </span>
        </div>
        <div className="profile-detail-row">
          <span className="profile-detail-label">User ID</span>
          <span className="profile-detail-value profile-detail-mono">{user.uid}</span>
        </div>
      </div>

      {/* SIGN OUT */}
      <button className="profile-signout-btn" onClick={signOut}>
        🚪 Sign out
      </button>
    </div>
  );
}