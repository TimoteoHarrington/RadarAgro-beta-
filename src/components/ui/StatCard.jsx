// ============================================================
// components/ui/SectionTitle.jsx
// ============================================================
import React from 'react';

export function SectionTitle({ children }) {
  return <div className="section-title">{children}</div>;
}

// ============================================================
// components/ui/Pill.jsx
// ============================================================
export function Pill({ direction = 'fl', children }) {
  return <span className={`pill ${direction}`}>{children}</span>;
}

// ============================================================
// components/ui/StatBadge.jsx
// ============================================================
export function StatBadge({ direction = 'fl', children }) {
  return <span className={`stat-badge ${direction}`}>{children}</span>;
}

// ============================================================
// components/ui/StatCard.jsx
// ============================================================
export function StatCard({ color = 'flat', label, badge, badgeDir, value, valueSize, delta, deltaDir, meta }) {
  return (
    <div className={`stat c-${color}`}>
      <div className="stat-label">
        {label}
        {badge && <StatBadge direction={badgeDir}>{badge}</StatBadge>}
      </div>
      <div className={`stat-val${valueSize ? ' ' + valueSize : ''}`}>{value}</div>
      {delta && (
        <div className={`stat-delta ${deltaDir || 'fl'}`}>{delta}</div>
      )}
      {meta && <div className="stat-meta">{meta}</div>}
    </div>
  );
}

// ============================================================
// components/ui/AlertStrip.jsx
// ============================================================
export function AlertStrip({ type = 'warn', icon = 'ℹ', children }) {
  return (
    <div className={`alert-strip ${type}`}>
      <span className="alert-icon">{icon}</span>
      <span className="alert-text">{children}</span>
    </div>
  );
}
