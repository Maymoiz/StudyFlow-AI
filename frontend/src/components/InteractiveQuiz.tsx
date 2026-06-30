import { useState } from "react";
import "../styles/quiz.css";

export interface QuizQuestion {
  question: string;
  options: Record<string, string>;
  correctAnswer: string;
  explanation: string;
}

interface Props {
  questions: QuizQuestion[];
}

export default function InteractiveQuiz({ questions }: Props) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState<Record<number, boolean>>({});

  if (!questions || questions.length === 0) return null;

  const handleSelect = (qIndex: number, letter: string) => {
    if (submitted[qIndex]) return;
    setAnswers(prev => ({ ...prev, [qIndex]: letter }));
  };

  const handleSubmit = (qIndex: number) => {
    if (!answers[qIndex]) return;
    setSubmitted(prev => ({ ...prev, [qIndex]: true }));
  };

  const score = questions.reduce((acc, q, i) =>
    submitted[i] && answers[i] === q.correctAnswer ? acc + 1 : acc, 0);
  const allSubmitted = questions.every((_, i) => submitted[i]);

  return (
    <div className="quiz-container">
      {allSubmitted && (
        <div className="quiz-score-banner">
          🎯 You scored <strong>{score} / {questions.length}</strong>
        </div>
      )}

      {questions.map((q, qIndex) => {
        const selected = answers[qIndex];
        const isSubmitted = submitted[qIndex];
        const isCorrect = selected === q.correctAnswer;

        return (
          <div key={qIndex} className="quiz-question-card">
            <p className="quiz-question-text">
              <span className="quiz-q-num">Q{qIndex + 1}.</span> {q.question}
            </p>

            <div className="quiz-options">
              {Object.entries(q.options).map(([letter, text]) => {
                let optionClass = "quiz-option";
                if (isSubmitted) {
                  if (letter === q.correctAnswer) optionClass += " correct";
                  else if (letter === selected && letter !== q.correctAnswer) optionClass += " incorrect";
                } else if (letter === selected) {
                  optionClass += " selected";
                }

                return (
                  <button
                    key={letter}
                    className={optionClass}
                    onClick={() => handleSelect(qIndex, letter)}
                    disabled={isSubmitted}
                  >
                    <span className="quiz-option-letter">{letter}</span>
                    <span className="quiz-option-text">{text}</span>
                    {isSubmitted && letter === q.correctAnswer && <span className="quiz-icon">✓</span>}
                    {isSubmitted && letter === selected && letter !== q.correctAnswer && <span className="quiz-icon">✕</span>}
                  </button>
                );
              })}
            </div>

            {!isSubmitted ? (
              <button
                className="quiz-submit-btn"
                onClick={() => handleSubmit(qIndex)}
                disabled={!selected}
              >
                Check Answer
              </button>
            ) : (
              <div className={`quiz-feedback ${isCorrect ? "correct" : "incorrect"}`}>
                <p className="quiz-feedback-title">
                  {isCorrect ? "✓ Correct!" : `✕ Incorrect — the answer is ${q.correctAnswer}`}
                </p>
                {q.explanation && <p className="quiz-feedback-text">{q.explanation}</p>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}