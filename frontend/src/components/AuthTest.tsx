import { useState } from "react";
import { login, signup, logout } from "../auth/authActions";
import { useAuth } from "../auth/useAuth";

export default function AuthTest() {
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (loading) return <p>Loading...</p>;

  if (user)
    return (
      <div>
        <h2>Logged in as {user.email}</h2>
        <button onClick={logout}>Logout</button>
      </div>
    );

  return (
    <div>
      <h2>Login / Signup Test</h2>

      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button onClick={() => login(email, password)}>Login</button>
      <button onClick={() => signup(email, password)}>Signup</button>
    </div>
  );
}
