// ============================================================
// utils/formatters.js
// Utility functions migrated from inline JS in index.html
// ============================================================

/** Format ARS number: $456.000 */
export const fmt$ = (n) =>
  n != null ? '$\u00a0' + Math.round(n).toLocaleString('es-AR') : '—';

/** Format with decimals: $1.245,50 */
export const fmtD = (n) =>
  n != null
    ? '$' + n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '—';

/** Format percentage: +1,4 % */
export const fmtP = (n) =>
  n != null ? (n > 0 ? '+' : '') + n.toFixed(1).replace('.', ',') + ' %' : '—';

/** Format percentage no sign: 2,4 % */
export const fmtPA = (n) =>
  n != null ? n.toFixed(1).replace('.', ',') + ' %' : '—';

/** CSS class for numeric direction */
export const cls = (n) => (n > 0 ? 'up' : n < 0 ? 'dn' : 'fl');

/** Arrow symbol for direction */
export const arrow = (n) => (n > 0 ? '▲' : n < 0 ? '▼' : '=');

/** Format ARS compact: $456k */
export const fmtK = (n) => {
  if (n == null) return '—';
  if (Math.abs(n) >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(n) >= 1_000) return '$' + Math.round(n / 1000) + 'k';
  return '$' + n;
};

/** Current Argentine date string */
export const fechaHoy = () => {
  return new Date().toLocaleDateString('es-AR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
};

/** Get day name */
export const diaSemana = () => {
  return new Date().toLocaleDateString('es-AR', { weekday: 'long' });
};

/** Format time HH:MM */
export const fmtHora = (date = new Date()) =>
  date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
