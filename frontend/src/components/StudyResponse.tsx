import { useState } from "react";
import InteractiveQuiz from "./InteractiveQuiz";
import type { QuizQuestion } from "./InteractiveQuiz";
import "../styles/studyresponse.css";

interface Video {
  id: { videoId: string };
  snippet: { title: string; channelTitle: string; thumbnails: { high: { url: string } } };
}

export interface StudyData {
  overview?: string;
  explanation: string;
  summary: string;
  keyNotes: string[];
  quiz: QuizQuestion[];
  videos?: Video[];
  fileName?: string;
  extractedLength?: number;
  userQuery?: string | null;
}

interface Props {
  data: StudyData;
  onCopy?: () => void;
  onSaveNote?: () => void;
  copied?: boolean;
}

export default function StudyResponse({ data, onCopy, onSaveNote, copied }: Props) {
  const [showVideos, setShowVideos] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);

  return (
    <div className="study-response">
      {data.fileName && (
        <div className="study-source-banner">
          📄 Generated from <strong>{data.fileName}</strong>
          {data.extractedLength ? <span className="study-chars">{data.extractedLength.toLocaleString()} characters extracted</span> : null}
        </div>
      )}

      {data.userQuery && (
        <div className="study-userq-banner">
          💬 Your question: <strong>{data.userQuery}</strong>
        </div>
      )}

      <div className="study-card">
        <div className="study-card-header">
          <span className="study-card-badge">🤖 AI Answer</span>
          <div className="study-card-actions">
            {onCopy && <button className="study-action-btn" onClick={onCopy}>{copied ? "✓ Copied" : "Copy"}</button>}
            {onSaveNote && <button className="study-action-btn" onClick={onSaveNote}>📝 Save Note</button>}
          </div>
        </div>

        <div className="study-card-body">
          {data.overview && (
            <section className="study-section">
              <h2 className="study-h2">📄 Document Overview</h2>
              <p className="study-p">{data.overview}</p>
            </section>
          )}

          <section className="study-section">
            <h2 className="study-h2">📖 Explanation</h2>
            {data.explanation.split("\n\n").filter(Boolean).map((para, i) => (
              <p key={i} className="study-p">{para}</p>
            ))}
          </section>

          <section className="study-section">
            <h2 className="study-h2">📝 Summary</h2>
            <p className="study-p">{data.summary}</p>
          </section>

          {data.keyNotes?.length > 0 && (
            <section className="study-section">
              <h2 className="study-h2">🔑 Key Notes</h2>
              <ul className="study-ul">
                {data.keyNotes.map((note, i) => <li key={i}>{note}</li>)}
              </ul>
            </section>
          )}
        </div>
      </div>

      {/* OPTIONAL VIDEOS TOGGLE */}
      {data.videos && data.videos.length > 0 && (
        <div className="study-toggle-section">
          <button className="study-toggle-btn" onClick={() => setShowVideos(v => !v)}>
            <span>📺 Related Videos ({data.videos.length})</span>
            <span className={`study-chevron ${showVideos ? "open" : ""}`}>▾</span>
          </button>
          {showVideos && (
            <div className="video-grid">
              {data.videos.map((v, i) => (
                <a key={i} href={`https://www.youtube.com/watch?v=${v.id.videoId}`} target="_blank" rel="noreferrer" className="video-card">
                  <div className="video-thumb-wrap">
                    <img src={v.snippet.thumbnails.high.url} alt={v.snippet.title} />
                    <span className="video-play-overlay">▶</span>
                  </div>
                  <div className="video-info">
                    <h4>{v.snippet.title}</h4>
                    <p>{v.snippet.channelTitle}</p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* OPTIONAL QUIZ TOGGLE */}
      {data.quiz && data.quiz.length > 0 && (
        <div className="study-toggle-section">
          <button className="study-toggle-btn" onClick={() => setShowQuiz(v => !v)}>
            <span>❓ Quiz ({data.quiz.length} questions)</span>
            <span className={`study-chevron ${showQuiz ? "open" : ""}`}>▾</span>
          </button>
          {showQuiz && <InteractiveQuiz questions={data.quiz} />}
        </div>
      )}
    </div>
  );
}