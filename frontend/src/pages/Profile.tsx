import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { API } from "../config";
import "../styles/profile.css";


interface UserProfile {
  name: string;
  email: string;
  grade?: string;
  photo?: string;
  createdAt?: string;
}

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

 useEffect(() => {
  if (!user) return; // <-- fixes the error
  const uid = user.uid;

  async function fetchProfile() {
    try {
      const res = await fetch(API.getUser(uid));
      const data = await res.json();
      setProfile(data);
    } catch (err) {
      console.error("Failed to load profile:", err);
    } finally {
      setLoading(false);
    }
  }

  fetchProfile();
}, [user]);


  if (loading) {
    return <div className="profile-container">Loading profile...</div>;
  }

  if (!profile) {
    return <div className="profile-container">Profile not found.</div>;
  }

  return (
    <div className="profile-container">
      <div className="profile-card">
        <img
          src={profile.photo || "/default-avatar.png"}
          alt="Profile"
          className="profile-photo"
        />

        <h2>{profile.name}</h2>
        <p className="email">{profile.email}</p>

        {profile.grade && <p className="grade">Grade: {profile.grade}</p>}

        {profile.createdAt && (
          <p className="joined">
            Joined: {new Date(profile.createdAt).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
}
