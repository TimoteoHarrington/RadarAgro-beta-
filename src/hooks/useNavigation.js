// ============================================================
// hooks/useNavigation.js  — MIGRADO A REACT ROUTER
// ============================================================
// ANTES: manejaba activePage con useState + localStorage.
//        La URL nunca cambiaba → no se podían compartir links,
//        el botón "atrás" no funcionaba y no había SEO.
//
// AHORA: usa useNavigate + useLocation de react-router-dom.
//        Cada página tiene su propia URL (/granos, /financiero…).
//        El hook mantiene la misma API pública { activePage, goPage }
//        para que el resto del código no cambie.
// ============================================================

import { useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

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

// Convierte pathname ("/granos") a pageId ("granos")
function pathnameToPage(pathname) {
  const seg = pathname.replace(/^\//, '') || 'home';
  return PAGE_IDS.includes(seg) ? seg : 'home';
}

export function useNavigation() {
  const navigate  = useNavigate();
  const location  = useLocation();

  const activePage = pathnameToPage(location.pathname);

  // Actualizar título de pestaña cuando cambia la ruta
  useEffect(() => {
    document.title = PAGE_TITLES[activePage] ?? 'RadarAgro';
  }, [activePage]);

  // goPage mantiene la misma firma que antes: goPage('granos')
  const goPage = useCallback((pageId) => {
    if (!PAGE_IDS.includes(pageId)) return;
    const path = pageId === 'home' ? '/' : `/${pageId}`;
    navigate(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [navigate]);

  return { activePage, goPage };
}
