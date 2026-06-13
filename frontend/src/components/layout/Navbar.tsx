import { useState } from "react";
import { Link } from "react-router-dom";
import "./navbar.css";

export default function Navbar() {
  const [open] = useState(false);

  return (
    <nav className="sf-nav">
      {/* LEFT */}
      <div className="sf-left">
        <div className="sf-logo">
        </div>
        <span className="sf-title">Studyflow</span>
      </div>

      {/* RIGHT */}
      <div className="sf-right">
        <div>
  <Link to="/" className="sf-link">Dashboard</Link>
  <Link to="/subjects" className="sf-link">Subjects</Link>
  <Link to="/notes" className="sf-link">Notes</Link>
  <Link to="/ai" className="sf-link">AI Tutor</Link>
  <Link to="/progress" className="sf-link">Progress</Link>
          {open && (
            <div className="sf-dropdown">
              <span className="sf-dropdown-item">Login</span>
              <span className="sf-dropdown-item">Signup</span>
              <span className="sf-dropdown-item">Profile</span>
              <span className="sf-dropdown-item">Settings</span>
              <span className="sf-dropdown-item">Logout</span>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
