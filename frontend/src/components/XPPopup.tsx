import { useGamification } from "../hooks/useGamification";
import "../styles/gamification.css";

export default function XPPopup() {
  const { xpPopup, newAchievements } = useGamification();

  return (
    <>
      {xpPopup && (
        <div key={xpPopup.id} className="xp-popup">
          +{xpPopup.amount} XP ✨
        </div>
      )}
      {newAchievements.map(a => (
        <div key={a.id} className="achievement-popup">
          <span className="achievement-popup-icon">{a.icon}</span>
          <div>
            <p className="achievement-popup-title">Achievement Unlocked!</p>
            <p className="achievement-popup-name">{a.title}</p>
          </div>
        </div>
      ))}
    </>
  );
}