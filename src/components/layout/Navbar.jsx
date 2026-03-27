// ============================================================
// components/layout/Navbar.jsx
// Sticky top navigation with logo, page links, clock, theme toggle
// ============================================================

import React from 'react';
import { useClock } from '../../hooks/useClock';
import { useTheme } from '../../hooks/useTheme';

const NAV_ITEMS = [
  { id: 'home',       label: 'Inicio' },
  { id: 'granos',     label: 'Granos' },
  { id: 'hacienda',   label: 'Hacienda' },
  { id: 'financiero', label: 'Financiero' },
  { id: 'macro',      label: 'Macro' },
  { id: 'insumos',    label: 'Insumos' },
  { id: 'indices',    label: 'Índices' },
  { id: 'impuestos',  label: 'Impositivo' },
  { id: 'feriados',   label: 'Feriados' },
];

export function Navbar({ activePage, goPage }) {
  const { timeShort } = useClock();
  const { theme, toggleTheme } = useTheme();

  return (
    <nav>
      {/* Logo */}
      <div className="logo" onClick={() => goPage('home')}>
        <div>
          <div className="logo-name">RadarAgro</div>
          <div className="logo-tag">Dashboard agropecuario</div>
        </div>
      </div>

      {/* Page links */}
      <div className="nav-links">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            className={`nav-btn${activePage === item.id ? ' active' : ''}`}
            onClick={() => goPage(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Right section */}
      <div className="nav-right">
        <button
          className="nav-btn"
          onClick={() => goPage('ayuda')}
          style={{ fontSize: '12px', padding: '0 10px', opacity: 0.7 }}
        >
          Ayuda
        </button>

        <div className="nav-clock">{timeShort}</div>

        <div className="theme-switch" onClick={toggleTheme} title="Cambiar tema">
          <span className="theme-switch-label">
            {theme === 'light' ? 'CLARO' : 'OSCURO'}
          </span>
          <div className="theme-track">
            <div className="theme-thumb" />
          </div>
        </div>
      </div>
    </nav>
  );
}
