import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase";
import logo from "../../assets/Moi-Tech.png";
import "./navbar.css";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="sf-nav">
      <div className="sf-left">
        <img src={logo} className="sf-logo-img" alt="Studyflow Logo" />
        <span className="sf-title">Studyflow</span>
      </div>

      <div className="sf-right">
        <Link to="/" className={`sf-link ${location.pathname === "/" ? "active" : ""}`}>Dashboard</Link>
        <Link to="/subjects" className={`sf-link ${location.pathname === "/subjects" ? "active" : ""}`}>Subjects</Link>
        <Link to="/notes" className={`sf-link ${location.pathname === "/notes" ? "active" : ""}`}>Notes</Link>
        <Link to="/ai" className={`sf-link ${location.pathname === "/ai" ? "active" : ""}`}>AI Tutor</Link>
        <Link to="/progress" className={`sf-link ${location.pathname === "/progress" ? "active" : ""}`}>Progress</Link>

        <div className="sf-avatar-wrapper">
          <img
            src={user?.photoURL || "https://i.pravatar.cc/40"}
            className="sf-avatar"
            onClick={() => setOpen(!open)}
          />

          {open && (
            <div className="sf-dropdown">
              {!user && (
                <>
                  <span className="sf-dropdown-item" onClick={() => navigate("/login")}>Login</span>
                  <span className="sf-dropdown-item" onClick={() => navigate("/signup")}>Sign Up</span>
                </>
              )}

              {user && (
                <>
                  <span className="sf-dropdown-item" onClick={() => navigate("/profile")}>Profile</span>
                  <span className="sf-dropdown-item" onClick={() => navigate("/settings")}>Settings</span>
                  <span className="sf-dropdown-item" onClick={() => signOut(auth)}>Logout</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
