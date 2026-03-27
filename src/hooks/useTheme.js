// ============================================================
// hooks/useTheme.js
// Manages dark/light theme toggle with localStorage persistence
// ============================================================

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'ra-theme';

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.setAttribute('data-theme', 'light');
    } else {
      root.removeAttribute('data-theme');
    }
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {}
    // Dispatch custom event so canvas charts can redraw
    document.dispatchEvent(new Event('themechange'));
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, toggleTheme };
}
