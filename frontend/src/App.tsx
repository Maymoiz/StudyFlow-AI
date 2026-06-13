import { Routes, Route } from "react-router-dom";
import DashboardLayout from "./components/layout/DashboardLayout";

import Dashboard from "./components/Dashboard";
import Subjects from "./pages/Subjects";
import Notes from "./pages/Notes";
import AITutor from "./pages/AITutor";
import Progress from "./pages/Progress";

export default function App() {
  return (
    <DashboardLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/subjects" element={<Subjects />} />
        <Route path="/notes" element={<Notes />} />
        <Route path="/ai" element={<AITutor />} />
        <Route path="/progress" element={<Progress />} />
      </Routes>
    </DashboardLayout>
  );
}
