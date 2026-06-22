import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import logo from "../../assets/Moi-Tech.png";
import "./navbar.css";

function getInitials(name: string | null, email: string | null): string {
  if (name && name.trim()) {
    return name.trim().split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  }
  if (email) return email[0].toUpperCase();
  return "U";
}

function Avatar({ user }: { user: any }) {
  const [imgError, setImgError] = useState(false);
  const initials = getInitials(user?.displayName, user?.email);

  if (user?.photoURL && !imgError) {
    return (
      <img
        src={user.photoURL}
        className="sf-avatar"
        alt="avatar"
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div className="sf-avatar sf-avatar-initials">
      {initials}
    </div>
  );
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close dropdown on route change
  useEffect(() => { setOpen(false); }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const navLinks = [
    { to: "/", label: "Dashboard" },
    { to: "/subjects", label: "Subjects" },
    { to: "/notes", label: "Notes" },
    { to: "/ai", label: "AI Tutor" },
    { to: "/progress", label: "Progress" },
  ];

  return (
    <nav className="sf-nav">
      <div className="sf-left">
        <img src={logo} className="sf-logo-img" alt="StudyFlow Logo" />
        <span className="sf-title">StudyFlow</span>
      </div>

      <div className="sf-right">
        {navLinks.map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            className={`sf-link ${location.pathname === to ? "active" : ""}`}
          >
            {label}
          </Link>
        ))}

        <div className="sf-avatar-wrapper" ref={dropdownRef}>
          <button className="sf-avatar-btn" onClick={() => setOpen(o => !o)}>
            <Avatar user={user} />
          </button>

          {open && (
            <div className="sf-dropdown">
              {user ? (
                <>
                  {/* User info header */}
                  <div className="sf-dropdown-user">
                    <p className="sf-dropdown-name">{user.displayName || "User"}</p>
                    <p className="sf-dropdown-email">{user.email}</p>
                  </div>
                  <div className="sf-dropdown-divider" />
                  <span className="sf-dropdown-item" onClick={() => { navigate("/profile"); setOpen(false); }}>
                    👤 Profile
                  </span>
                  <div className="sf-dropdown-divider" />
                  <span className="sf-dropdown-item sf-dropdown-signout" onClick={handleSignOut}>
                    🚪 Sign out
                  </span>
                </>
              ) : (
                <>
                  <span className="sf-dropdown-item" onClick={() => { navigate("/login"); setOpen(false); }}>
                    Login
                  </span>
                  <span className="sf-dropdown-item" onClick={() => { navigate("/signup"); setOpen(false); }}>
                    Sign Up
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
