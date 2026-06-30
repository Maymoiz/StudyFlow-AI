import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useGamification } from "../hooks/useGamification";
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { API } from "../config";
import "../styles/flashcards.css";

interface Flashcard {
  id: string;
  front: string;
  back: string;
  subject: string;
  deck: string;
  interval: number; // days until next review (spaced repetition)
  nextReview: string; // ISO date
  easeFactor: number; // SM-2 ease factor
  repetitions: number;
  createdAt: any;
}

interface Deck {
  name: string;
  subject: string;
  count: number;
  dueCount: number;
}

const SUBJECTS = ["Math", "Science", "History", "English", "Computer Science", "Other"];

// SM-2 spaced repetition algorithm
function calculateNextReview(card: Flashcard, quality: 0 | 1 | 2 | 3) {
  // quality: 0=again, 1=hard, 2=good, 3=easy
  let { interval, easeFactor, repetitions } = card;

  if (quality === 0) {
    interval = 1;
    repetitions = 0;
  } else {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * easeFactor);

    easeFactor = Math.max(1.3, easeFactor + 0.1 - (3 - quality) * (0.08 + (3 - quality) * 0.02));
    repetitions += 1;
  }

  const nextReview = new Date(Date.now() + interval * 86400000).toISOString().slice(0, 10);
  return { interval, easeFactor, repetitions, nextReview };
}

export default function Flashcards() {
  const { user } = useAuth();
  const { awardXP } = useGamification();

  const [cards, setCards] = useState<Flashcard[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const [view, setView] = useState<"decks" | "study" | "generate" | "browse">("decks");
  const [activeDeck, setActiveDeck] = useState<string | null>(null);
  const [studyCards, setStudyCards] = useState<Flashcard[]>([]);
  const [studyIndex, setStudyIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [studyComplete, setStudyComplete] = useState(false);

  // Generate form
  const [genTopic, setGenTopic] = useState("");
  const [genSubject, setGenSubject] = useState("Other");
  const [genDeck, setGenDeck] = useState("");
  const [genCount, setGenCount] = useState(10);
  const [genFile, setGenFile] = useState<File | null>(null);
  const [genError, setGenError] = useState("");

  useEffect(() => { if (user) fetchCards(); }, [user]);

  const fetchCards = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(collection(db, "flashcards"), where("userId", "==", user.uid));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Flashcard));
      setCards(data);

      // Build decks
      const today = new Date().toISOString().slice(0, 10);
      const deckMap: Record<string, Deck> = {};
      data.forEach(card => {
        if (!deckMap[card.deck]) {
          deckMap[card.deck] = { name: card.deck, subject: card.subject, count: 0, dueCount: 0 };
        }
        deckMap[card.deck].count++;
        if (!card.nextReview || card.nextReview <= today) deckMap[card.deck].dueCount++;
      });
      setDecks(Object.values(deckMap));
    } catch (e) { console.error("Fetch cards error:", e); }
    finally { setLoading(false); }
  };

  const generateCards = async () => {
    if (!genTopic.trim() && !genFile) return;
    if (!genDeck.trim()) { setGenError("Please enter a deck name."); return; }
    if (!user) return;

    setGenerating(true);
    setGenError("");

    try {
      const formData = new FormData();
      formData.append("query", `Generate exactly ${genCount} flashcards about: ${genTopic}. 

Return ONLY a JSON array with no other text, no markdown, no explanation. Format:
[{"front": "Question here?", "back": "Answer here"}, ...]

Make the questions clear and the answers concise (1-3 sentences max). Cover different aspects of the topic.`);
      formData.append("mode", "flashcard");
      if (genFile) formData.append("file", genFile);

      const res = await fetch(API.search, { method: "POST", body: formData });
      const data = await res.json();

      // Parse the JSON from the AI response
      let parsed: { front: string; back: string }[] = [];
      try {
        const text = (data.answer || "").trim();
        // Try direct parse first (json_object mode may wrap in {cards: [...]} or return array directly)
        let candidate: any = null;
        try { candidate = JSON.parse(text); } catch { /* fall through to regex */ }

        if (Array.isArray(candidate)) {
          parsed = candidate;
        } else if (candidate && Array.isArray(candidate.cards)) {
          parsed = candidate.cards;
        } else if (candidate && Array.isArray(candidate.flashcards)) {
          parsed = candidate.flashcards;
        } else {
          const jsonMatch = text.match(/\[[\s\S]*\]/);
          if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
        }
      } catch {
        setGenError("Could not parse flashcards. Please try again.");
        return;
      }

      if (parsed.length === 0) {
        setGenError("No flashcards generated. Try a more specific topic.");
        return;
      }

      // Save to Firestore
      const today = new Date().toISOString().slice(0, 10);
      const batch = parsed.map(card =>
        addDoc(collection(db, "flashcards"), {
          userId: user.uid,
          front: card.front,
          back: card.back,
          subject: genSubject,
          deck: genDeck.trim(),
          interval: 1,
          nextReview: today,
          easeFactor: 2.5,
          repetitions: 0,
          createdAt: serverTimestamp(),
        })
      );
      await Promise.all(batch);
      await awardXP("search");
      await fetchCards();
      setView("decks");
      setGenTopic(""); setGenDeck(""); setGenFile(null);
    } catch (e) {
      setGenError("Something went wrong. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const startStudy = (deckName: string) => {
    const today = new Date().toISOString().slice(0, 10);
    const dueCards = cards.filter(c =>
      c.deck === deckName && (!c.nextReview || c.nextReview <= today)
    );
    if (dueCards.length === 0) {
      // Study all cards if none are due
      const allCards = cards.filter(c => c.deck === deckName);
      setStudyCards(allCards.sort(() => Math.random() - 0.5));
    } else {
      setStudyCards(dueCards.sort(() => Math.random() - 0.5));
    }
    setStudyIndex(0);
    setFlipped(false);
    setStudyComplete(false);
    setActiveDeck(deckName);
    setView("study");
  };

  const handleAnswer = async (quality: 0 | 1 | 2 | 3) => {
    const card = studyCards[studyIndex];
    const updates = calculateNextReview(card, quality);

    try {
      await updateDoc(doc(db, "flashcards", card.id), updates);
    } catch (e) { console.error("Update card error:", e); }

    if (studyIndex + 1 >= studyCards.length) {
      setStudyComplete(true);
    } else {
      setStudyIndex(i => i + 1);
      setFlipped(false);
    }
  };

  const deleteDeck = async (deckName: string) => {
    const deckCards = cards.filter(c => c.deck === deckName);
    await Promise.all(deckCards.map(c => deleteDoc(doc(db, "flashcards", c.id))));
    await fetchCards();
  };

  const currentCard = studyCards[studyIndex];
  const totalDue = decks.reduce((sum, d) => sum + d.dueCount, 0);

  return (
    <div className="flashcards-page">
      {/* HEADER */}
      <div className="fc-header">
        <div>
          <h1>Flashcards</h1>
          <p className="fc-sub">
            {decks.length} deck{decks.length !== 1 ? "s" : ""} · {totalDue} card{totalDue !== 1 ? "s" : ""} due today
          </p>
        </div>
        <div className="fc-header-actions">
          {view !== "decks" && (
            <button className="fc-back-btn" onClick={() => { setView("decks"); fetchCards(); }}>← Back</button>
          )}
          {view === "decks" && (
            <button className="fc-generate-btn" onClick={() => setView("generate")}>✨ Generate Cards</button>
          )}
        </div>
      </div>

      {/* DECKS VIEW */}
      {view === "decks" && (
        <>
          {loading ? (
            <div className="fc-loading"><div className="fc-spinner" /><p>Loading decks…</p></div>
          ) : decks.length === 0 ? (
            <div className="fc-empty">
              <span className="fc-empty-icon">🃏</span>
              <p>No flashcard decks yet — generate your first set!</p>
              <button className="fc-generate-btn" onClick={() => setView("generate")}>✨ Generate Cards</button>
            </div>
          ) : (
            <div className="fc-decks-grid">
              {decks.map(deck => (
                <div key={deck.name} className="fc-deck-card">
                  <div className="fc-deck-top">
                    <span className="fc-deck-subject">{deck.subject}</span>
                    <button className="fc-deck-delete" onClick={() => deleteDeck(deck.name)}>✕</button>
                  </div>
                  <h2 className="fc-deck-name">{deck.name}</h2>
                  <div className="fc-deck-stats">
                    <span>{deck.count} cards</span>
                    {deck.dueCount > 0 && <span className="fc-due-badge">{deck.dueCount} due</span>}
                  </div>
                  <button className="fc-study-btn" onClick={() => startStudy(deck.name)}>
                    {deck.dueCount > 0 ? `Study ${deck.dueCount} due` : "Review all"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* GENERATE VIEW */}
      {view === "generate" && (
        <div className="fc-generate">
          <h2>Generate Flashcards</h2>
          <p className="fc-generate-sub">Enter a topic or upload a PDF and AI will create flashcards for you.</p>

          {genError && <p className="fc-error">⚠️ {genError}</p>}

          <div className="fc-form">
            <div className="fc-field">
              <label>Topic</label>
              <input
                className="fc-input"
                placeholder="e.g. Photosynthesis, World War II, Newton's Laws…"
                value={genTopic}
                onChange={e => setGenTopic(e.target.value)}
                autoFocus
              />
            </div>

            <div className="fc-field">
              <label>Or upload a PDF</label>
              <div className="fc-file-row">
                <label className="fc-file-btn">
                  📄 {genFile ? genFile.name : "Choose file"}
                  <input type="file" accept=".pdf,.txt" hidden onChange={e => e.target.files?.[0] && setGenFile(e.target.files[0])} />
                </label>
                {genFile && <button className="fc-file-remove" onClick={() => setGenFile(null)}>✕</button>}
              </div>
            </div>

            <div className="fc-field-row">
              <div className="fc-field">
                <label>Deck name</label>
                <input
                  className="fc-input"
                  placeholder="e.g. Biology Chapter 3"
                  value={genDeck}
                  onChange={e => setGenDeck(e.target.value)}
                />
              </div>
              <div className="fc-field">
                <label>Subject</label>
                <select className="fc-input fc-select" value={genSubject} onChange={e => setGenSubject(e.target.value)}>
                  {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="fc-field">
              <label>Number of cards: <strong>{genCount}</strong></label>
              <input
                type="range"
                min={5} max={30} step={5}
                value={genCount}
                onChange={e => setGenCount(Number(e.target.value))}
                className="fc-range"
              />
              <div className="fc-range-labels"><span>5</span><span>10</span><span>15</span><span>20</span><span>25</span><span>30</span></div>
            </div>

            <button
              className="fc-generate-submit"
              onClick={generateCards}
              disabled={generating || (!genTopic.trim() && !genFile) || !genDeck.trim()}
            >
              {generating ? <><span className="fc-spinner-inline" /> Generating {genCount} cards…</> : `✨ Generate ${genCount} Flashcards`}
            </button>
          </div>
        </div>
      )}

      {/* STUDY VIEW */}
      {view === "study" && (
        <div className="fc-study">
          {studyComplete ? (
            <div className="fc-complete">
              <span className="fc-complete-icon">🎉</span>
              <h2>Session Complete!</h2>
              <p>You reviewed {studyCards.length} card{studyCards.length !== 1 ? "s" : ""} from <strong>{activeDeck}</strong>.</p>
              <div className="fc-complete-actions">
                <button className="fc-study-btn" onClick={() => startStudy(activeDeck!)}>Study again</button>
                <button className="fc-back-btn" onClick={() => { setView("decks"); fetchCards(); }}>Back to decks</button>
              </div>
            </div>
          ) : currentCard ? (
            <>
              <div className="fc-progress-bar">
                <div className="fc-progress-fill" style={{ width: `${(studyIndex / studyCards.length) * 100}%` }} />
              </div>
              <p className="fc-progress-label">{studyIndex + 1} / {studyCards.length}</p>

              <div className={`fc-card ${flipped ? "flipped" : ""}`} onClick={() => setFlipped(f => !f)}>
                <div className="fc-card-inner">
                  <div className="fc-card-front">
                    <span className="fc-card-side-label">Question</span>
                    <p className="fc-card-text">{currentCard.front}</p>
                    <p className="fc-card-hint">Tap to reveal answer</p>
                  </div>
                  <div className="fc-card-back">
                    <span className="fc-card-side-label">Answer</span>
                    <p className="fc-card-text">{currentCard.back}</p>
                  </div>
                </div>
              </div>

              {flipped && (
                <div className="fc-answer-btns">
                  <p className="fc-answer-label">How well did you know this?</p>
                  <div className="fc-quality-btns">
                    <button className="fc-quality-btn again" onClick={() => handleAnswer(0)}>
                      <span>😕</span> Again
                      <span className="fc-interval">&lt;1d</span>
                    </button>
                    <button className="fc-quality-btn hard" onClick={() => handleAnswer(1)}>
                      <span>😐</span> Hard
                      <span className="fc-interval">~2d</span>
                    </button>
                    <button className="fc-quality-btn good" onClick={() => handleAnswer(2)}>
                      <span>🙂</span> Good
                      <span className="fc-interval">~{Math.round(currentCard.interval * 2.5)}d</span>
                    </button>
                    <button className="fc-quality-btn easy" onClick={() => handleAnswer(3)}>
                      <span>😄</span> Easy
                      <span className="fc-interval">~{Math.round(currentCard.interval * 3)}d</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}