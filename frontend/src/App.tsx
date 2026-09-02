import { Routes, Route } from "react-router-dom";
import Navbar from "./components/layout/Navbar";
import Dashboard from "./components/Dashboard";
import Subjects from "./pages/Subjects";
import Notes from "./pages/Notes";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ProtectedRoute from "./auth/ProtectedRoute";
import Profile from "./pages/Profile";
import Progress from "./pages/Progress";
import Flashcards from "./pages/flashcards";
import Timer from "./pages/Timer";
import StudyPlan from "./pages/StudyPlan";
import XPPopup from "./components/XPPopup";
import PomodoroWidget from "./components/PomodoroWidget";
import ChatWidget from "./components/ChatWidget";
import { PomodoroProvider } from "./hooks/usePomodoro";
import { ChatWidgetProvider } from "./context/ChatWidgetContext";

function App() {
  return (
    <PomodoroProvider>
      <ChatWidgetProvider>
        <Navbar />
        <XPPopup />
        <PomodoroWidget />
        <ChatWidget />
        <Routes>
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/subjects" element={<ProtectedRoute><Subjects /></ProtectedRoute>} />
          <Route path="/notes" element={<ProtectedRoute><Notes /></ProtectedRoute>} />
          <Route path="/progress" element={<ProtectedRoute><Progress /></ProtectedRoute>} />
          <Route path="/flashcards" element={<ProtectedRoute><Flashcards /></ProtectedRoute>} />
          <Route path="/timer" element={<ProtectedRoute><Timer /></ProtectedRoute>} />
          <Route path="/studyplan" element={<ProtectedRoute><StudyPlan /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
        </Routes>
      </ChatWidgetProvider>
    </PomodoroProvider>
  );
}

export default App;