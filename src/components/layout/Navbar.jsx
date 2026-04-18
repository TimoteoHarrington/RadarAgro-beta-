// ============================================================
// components/layout/Navbar.jsx
// Sticky top navigation — fully responsive
// Desktop: logo | nav-links | clock + theme
// Mobile:  logo | clock | hamburger → slide-down menu
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import { useClock } from '../../hooks/useClock';
import { useTheme } from '../../hooks/useTheme';

const NAV_ITEMS = [
  { id: 'home',       label: 'Inicio' },
  { id: 'granos',     label: 'Granos' },
  { id: 'hacienda',   label: 'Hacienda' },
  { id: 'financiero', label: 'Financiero' },
  { id: 'macro',      label: 'Macro' },
  { id: 'mundo',      label: 'Monitor Global' },
  { id: 'insumos',    label: 'Insumos' },
  { id: 'indices',    label: 'Índices' },
  { id: 'impuestos',  label: 'Impositivo' },
  { id: 'feriados',   label: 'Feriados' },
  { id: 'ayuda',      label: 'Ayuda' },
];

export function Navbar({ activePage, goPage }) {
  const { timeShort } = useClock();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  function handleNav(id) {
    goPage(id);
    setMenuOpen(false);
  }

  return (
    <nav ref={menuRef}>
      {/* Logo */}
      <div className="logo" onClick={() => handleNav('home')}>
        <div>
          <div className="logo-name">RadarAgro</div>
          <div className="logo-tag">Dashboard agropecuario</div>
        </div>
      </div>

      {/* Desktop nav links */}
      <div className="nav-links nav-links--desktop">
        {NAV_ITEMS.filter(i => i.id !== 'ayuda').map(item => (
          <button
            key={item.id}
            className={`nav-btn${activePage === item.id ? ' active' : ''}`}
            onClick={() => handleNav(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Right section */}
      <div className="nav-right">
        <button
          className="nav-btn nav-ayuda--desktop"
          onClick={() => handleNav('ayuda')}
          style={{ fontSize: '12px', padding: '0 10px', opacity: 0.7 }}
        >
          Ayuda
        </button>

        <div className="nav-clock">{timeShort}</div>

        <div className="theme-switch theme-switch--desktop" onClick={toggleTheme} title="Cambiar tema">
          <span className="theme-switch-label">
            {theme === 'light' ? 'CLARO' : 'OSCURO'}
          </span>
          <div className="theme-track">
            <div className="theme-thumb" />
          </div>
        </div>

        {/* Hamburger — mobile only */}
        <button
          className="nav-hamburger"
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Menú"
          aria-expanded={menuOpen}
        >
          <span className={`ham-bar${menuOpen ? ' open' : ''}`} />
          <span className={`ham-bar${menuOpen ? ' open' : ''}`} />
          <span className={`ham-bar${menuOpen ? ' open' : ''}`} />
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="nav-mobile-menu">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`nav-mobile-btn${activePage === item.id ? ' active' : ''}`}
              onClick={() => handleNav(item.id)}
            >
              {item.label}
            </button>
          ))}
          <div className="nav-mobile-theme" onClick={toggleTheme}>
            <span>Tema: {theme === 'light' ? 'Claro' : 'Oscuro'}</span>
            <div className="theme-track" style={{ marginLeft: 'auto' }}>
              <div className="theme-thumb" />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
