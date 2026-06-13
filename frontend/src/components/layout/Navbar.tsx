import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "./navbar.css";
import logo from "../../assets/Moi-Tech.png";


export default function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();


  return (
    <nav className="sf-nav">
      {/* LEFT: LOGO + NAME */}
      <div className="sf-left">
        <div className="sf-logo">
          <img src={logo} className="sf-logo-img" />
        </div>
        <span className="sf-title">Studyflow</span>
      </div>

      {/* RIGHT: NAV LINKS */}
      <div className="sf-right">

       <Link 
  to="/" 
  className={`sf-link ${location.pathname === "/" ? "active" : ""}`}
>
  Dashboard
</Link>

        <Link to="/subjects" className={`sf-link ${location.pathname === "/subjects" ? "active" : ""}`}>
  Subjects
</Link>

       <Link to="/notes" className={`sf-link ${location.pathname === "/notes" ? "active" : ""}`}>
  Notes
</Link>

        <Link to="/ai" className={`sf-link ${location.pathname === "/ai" ? "active" : ""}`}>
  AI Tutor
</Link>

        <Link to="/progress" className={`sf-link ${location.pathname === "/progress" ? "active" : ""}`}>
  Progress
</Link>

        {/* AVATAR + DROPDOWN */}
        <div className="sf-avatar-wrapper">
          <img
            src="https://i.pravatar.cc/40"
            alt="avatar"
            className="sf-avatar"
            onClick={() => setOpen(!open)}
          />

          {open && (
            <div className="sf-dropdown">
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
