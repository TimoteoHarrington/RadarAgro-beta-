// ============================================================
// hooks/useNavigation.js
// Manages active page state with localStorage persistence
// ============================================================

import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'ra-last-page';

export const PAGE_IDS = [
  'home', 'granos', 'hacienda', 'financiero', 'macro', 'mundo',
  'insumos', 'indices', 'impuestos', 'feriados', 'ayuda',
];

const PAGE_TITLES = {
  home:       'RadarAgro — Inicio',
  granos:     'RadarAgro — Granos',
  hacienda:   'RadarAgro — Hacienda',
  financiero: 'RadarAgro — Financiero',
  macro:      'RadarAgro — Macroeconomía',
  mundo:      'RadarAgro — Monitor Global',
  insumos:    'RadarAgro — Insumos',
  indices:    'RadarAgro — Índices',
  impuestos:  'RadarAgro — Impuestos',
  feriados:   'RadarAgro — Feriados',
  ayuda:      'RadarAgro — Ayuda',
};

export function useNavigation() {
  const [activePage, setActivePage] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return PAGE_IDS.includes(saved) ? saved : 'home';
    } catch {
      return 'home';
    }
  });

  // Actualizar título de pestaña cuando cambia la página
  useEffect(() => {
    document.title = PAGE_TITLES[activePage] ?? 'RadarAgro';
  }, [activePage]);

  const goPage = useCallback((pageId) => {
    if (!PAGE_IDS.includes(pageId)) return;
    setActivePage(pageId);
    try {
      localStorage.setItem(STORAGE_KEY, pageId);
    } catch {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return { activePage, goPage };
}
