import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/subjects.css";

interface Subject {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  topics: string[];
}

const SUBJECTS: Subject[] = [
  {
    id: "math",
    name: "Mathematics",
    icon: "📐",
    color: "#6a5af9",
    description: "Algebra, calculus, geometry and more",
    topics: ["Algebra", "Calculus", "Geometry", "Statistics", "Trigonometry", "Number Theory"],
  },
  {
    id: "science",
    name: "Science",
    icon: "🔬",
    color: "#22d3ee",
    description: "Physics, chemistry, and biology",
    topics: ["Physics", "Chemistry", "Biology", "Astronomy", "Earth Science", "Thermodynamics"],
  },
  {
    id: "history",
    name: "History",
    icon: "📜",
    color: "#f59e0b",
    description: "World history, civilisations, and events",
    topics: ["World War I", "World War II", "Ancient Egypt", "Roman Empire", "Cold War", "South African History"],
  },
  {
    id: "english",
    name: "English",
    icon: "📖",
    color: "#34d399",
    description: "Literature, grammar, and writing",
    topics: ["Essay Writing", "Shakespeare", "Grammar", "Poetry", "Novel Analysis", "Rhetoric"],
  },
  {
    id: "cs",
    name: "Computer Science",
    icon: "💻",
    color: "#b372f3",
    description: "Programming, algorithms, and data structures",
    topics: ["Python", "Algorithms", "Data Structures", "Web Development", "Databases", "Machine Learning"],
  },
  {
    id: "geography",
    name: "Geography",
    icon: "🌍",
    color: "#fb923c",
    description: "Physical and human geography",
    topics: ["Climate Change", "Plate Tectonics", "Population", "Biomes", "Rivers", "Urbanisation"],
  },
];

export default function Subjects() {
  const navigate = useNavigate();
  const [activeSubject, setActiveSubject] = useState<Subject | null>(null);
  const [search, setSearch] = useState("");

  const filtered = SUBJECTS.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.topics.some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

  const askAI = (topic: string) => {
    navigate("/ai", { state: { prefill: `Explain ${topic}` } });
  };

  return (
    <div className="subjects-page">
      <div className="subjects-header">
        <div>
          <h1>Subjects</h1>
          <p className="subjects-sub">Choose a subject to explore topics</p>
        </div>
        <input
          className="subjects-search"
          placeholder="Search subjects or topics…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {activeSubject ? (
        <div className="subject-detail">
          <button className="subject-back-btn" onClick={() => setActiveSubject(null)}>← Back</button>
          <div className="subject-detail-header" style={{ borderColor: activeSubject.color }}>
            <span className="subject-detail-icon">{activeSubject.icon}</span>
            <div>
              <h2>{activeSubject.name}</h2>
              <p>{activeSubject.description}</p>
            </div>
          </div>
          <h3 className="topics-heading">Topics</h3>
          <div className="topics-grid">
            {activeSubject.topics.map(topic => (
              <div key={topic} className="topic-card" style={{ "--accent": activeSubject.color } as React.CSSProperties}>
                <span className="topic-name">{topic}</span>
                <button className="topic-ask-btn" onClick={() => askAI(topic)}>Ask AI →</button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="subjects-grid">
          {filtered.map(subject => (
            <div
              key={subject.id}
              className="subject-card"
              style={{ "--accent": subject.color } as React.CSSProperties}
              onClick={() => setActiveSubject(subject)}
            >
              <div className="subject-card-top">
                <span className="subject-card-icon">{subject.icon}</span>
                <div className="subject-card-dot" style={{ background: subject.color }} />
              </div>
              <h2 className="subject-card-name">{subject.name}</h2>
              <p className="subject-card-desc">{subject.description}</p>
              <div className="subject-card-topics">
                {subject.topics.slice(0, 3).map(t => (
                  <span key={t} className="subject-topic-pill">{t}</span>
                ))}
                {subject.topics.length > 3 && (
                  <span className="subject-topic-pill subject-topic-more">+{subject.topics.length - 3}</span>
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="subjects-empty">
              <p>No subjects match "<strong>{search}</strong>"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
