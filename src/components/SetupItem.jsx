// src/components/SetupItem.jsx
import { Link } from "react-router-dom";

export default function SetupItem({ icon, title, to, cta, done, onOpen }) {
  return (
    <div className={`setup-item ${done ? "is-done" : ""}`} role="button" onClick={onOpen}>
      <div className="setup-icon">{done ? "✅" : icon}</div>
      <div className="setup-content">
        <div className="setup-title">
          {title} {done && <span className="badge">Done</span>}
        </div>
        <div className="setup-desc">{done ? "Completed" : "Continue"}</div>
      </div>
      <div className="setup-cta">
        {cta ? (
          <Link to={to} className="btn btn-outline">{cta}</Link>
        ) : (
          <span className="setup-arrow">›</span>
        )}
      </div>
    </div>
  );
}
