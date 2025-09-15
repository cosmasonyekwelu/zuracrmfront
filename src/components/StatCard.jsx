// src/components/StatCard.jsx
export default function StatCard({ theme = "sky", title, value, sub }) {
  return (
    <div className={`stat-card stat-card--${theme}`}>
      <div className="stat-title">{title}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-sub">{sub}</div>
    </div>
  );
}
