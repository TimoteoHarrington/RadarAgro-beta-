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

// ============================================================
// components/ui/ApiErrorBanner.jsx
// Muestra un banner de error cuando alguna API de la página falla.
// Uso: <ApiErrorBanner keys={['dolares','uva']} apiStatus={apiStatus} onRetry={loadDolares} />
// - keys: array de claves de apiStatus a monitorear
// - labels: objeto opcional { clave: 'Nombre legible' }
// - onRetry: función a llamar al hacer click en Reintentar
// ============================================================
export function ApiErrorBanner({ keys = [], apiStatus = {}, labels = {}, onRetry }) {
  const failed = keys.filter(k => apiStatus[k] === 'error');
  if (!failed.length) return null;

  const names = failed.map(k => labels[k] || k).join(', ');

  return (
    <div className="alert-strip error" role="alert">
      <span className="alert-icon">⚠</span>
      <span className="alert-text">
        <strong>Error al cargar datos</strong>
        {' · '}{names}
        {' · Verificá tu conexión o intentá de nuevo.'}
      </span>
      {onRetry && (
        <button className="alert-strip-retry" onClick={onRetry}>
          Reintentar
        </button>
      )}
    </div>
  );
}
