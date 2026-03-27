// hooks/useWidgets.js — IDs alineados con HTML de referencia
import { useState, useCallback } from 'react';

const STORAGE_KEY = 'ra-widgets-v2';
const ORDER_KEY   = 'ra-widget-order-v1';

export const WIDGET_DEFS = [
  { id: 'granos-pizarra', name: 'Pizarra de granos',           desc: 'Soja, maíz, trigo, girasol — BCR Rosario',           icon: '🌾', defaultOn: true,  allowSizes: ['normal','wide','full'], size: 'wide'   },
  { id: 'hacienda',       name: 'Hacienda',                    desc: 'Faena e invernada — MAG Cañuelas · H&LaFuente',       icon: '🐄', defaultOn: true,  allowSizes: ['normal','wide','full'], size: 'wide'   },
  { id: 'dolar',          name: 'Tipos de cambio',             desc: 'Oficial, MEP, CCL, Blue, Cripto — API Dolar · BCRA',  icon: '💵', defaultOn: true,  allowSizes: ['normal','wide','full'], size: 'normal' },
  { id: 'cbot',           name: 'CBOT Chicago',                desc: 'Soja, maíz, trigo futuros en USD/tn',                 icon: '🌽', defaultOn: true,  allowSizes: ['normal','wide','full'], size: 'normal' },
  { id: 'indices',        name: 'Índices estructurales',       desc: 'Feedlot, cría, soja/urea — calculados',               icon: '📈', defaultOn: true,  allowSizes: ['normal','wide','full'], size: 'normal' },
  { id: 'insumos',        name: 'Insumos',                     desc: 'Urea, MAP, DAP, gasoil — precios actuales',           icon: '⚗️', defaultOn: false, allowSizes: ['normal','wide','full'], size: 'normal' },
  { id: 'macro-kpi',      name: 'Macro — Indicadores',         desc: 'IPC, EMAE, Riesgo país, Reservas, Fiscal',            icon: '📊', defaultOn: false, allowSizes: ['normal','wide','full'], size: 'wide'   },
  { id: 'soja-usd',       name: 'Tasas & UVA',                 desc: 'BADLAR, Plazo fijo, Caución, UVA — BCRA/BYMA',        icon: '🏦', defaultOn: false, allowSizes: ['normal','wide','full'], size: 'normal' },
  { id: 'dolar-agro',     name: 'Dólar · Tipos de cambio',     desc: 'Oficial, MEP, CCL, Blue, Cripto — brechas',           icon: '💱', defaultOn: false, allowSizes: ['normal','wide','full'], size: 'normal' },
  { id: 'retenciones',    name: 'Retenciones · Derechos exp.', desc: 'Alícuotas vigentes 2026 · neto por tn',               icon: '📋', defaultOn: false, allowSizes: ['normal','wide','full'], size: 'normal' },
  { id: 'clima-agro',     name: 'Clima · Zona Núcleo',         desc: 'Temperatura, lluvia, alertas — Rosario / Córdoba',    icon: '🌤', defaultOn: false, allowSizes: ['normal','wide'],        size: 'normal' },
  { id: 'tasas-fin',      name: 'Tasas · Financiamiento agro', desc: 'BADLAR, plazo fijo, créditos rurales — BCRA/BYMA',    icon: '📉', defaultOn: false, allowSizes: ['normal','wide','full'], size: 'normal' },
  { id: 'calcretenc',     name: 'Calculadora retenciones',     desc: 'Neto productor por grano y alícuota',                 icon: '🧮', defaultOn: false, allowSizes: ['normal','wide'],        size: 'normal' },
  { id: 'feriados',       name: 'Próximos feriados',           desc: 'Calendario 2026 · siguiente feriado',                 icon: '📅', defaultOn: false, allowSizes: ['normal'],               size: 'normal' },
];

function loadState() {
  try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s); } catch {}
  const state = {};
  WIDGET_DEFS.forEach(w => { state[w.id] = { active: w.defaultOn, size: w.size || 'normal' }; });
  return state;
}
function saveState(s) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {} }
function loadOrder() {
  try { const s = localStorage.getItem(ORDER_KEY); if (s) return JSON.parse(s); } catch {}
  return WIDGET_DEFS.map(w => w.id);
}
function saveOrder(o) { try { localStorage.setItem(ORDER_KEY, JSON.stringify(o)); } catch {} }

export function useWidgets() {
  const [widgetState, setWidgetState] = useState(() => {
    const state = loadState();
    WIDGET_DEFS.forEach(w => { if (!state[w.id]) state[w.id] = { active: w.defaultOn, size: w.size || 'normal' }; });
    return state;
  });

  const [widgetOrder, setWidgetOrder] = useState(() => {
    const order = loadOrder();
    WIDGET_DEFS.forEach(w => { if (!order.includes(w.id)) order.push(w.id); });
    return order;
  });

  const orderedDefs = widgetOrder
    .map(id => WIDGET_DEFS.find(w => w.id === id))
    .filter(Boolean);

  const toggleWidget = useCallback((id) => {
    setWidgetState(prev => {
      const next = { ...prev, [id]: { ...prev[id], active: !prev[id]?.active } };
      saveState(next); return next;
    });
  }, []);

  const activateWidget = useCallback((id) => {
    setWidgetState(prev => {
      const w = WIDGET_DEFS.find(x => x.id === id);
      const allowed = w?.allowSizes || ['normal','wide','full'];
      const size = allowed.includes(prev[id]?.size) ? prev[id].size : allowed[0];
      const next = { ...prev, [id]: { active: true, size } };
      saveState(next); return next;
    });
  }, []);

  const removeWidget = useCallback((id) => {
    setWidgetState(prev => {
      const next = { ...prev, [id]: { ...prev[id], active: false } };
      saveState(next); return next;
    });
  }, []);

  const setWidgetSize = useCallback((id, size) => {
    setWidgetState(prev => {
      const next = { ...prev, [id]: { ...prev[id], size } };
      saveState(next); return next;
    });
  }, []);

  const reorderWidgets = useCallback((newOrder) => {
    setWidgetOrder(newOrder);
    saveOrder(newOrder);
  }, []);

  return { widgetState, orderedDefs, toggleWidget, activateWidget, removeWidget, setWidgetSize, reorderWidgets };
}
