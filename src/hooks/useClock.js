// ============================================================
// hooks/useClock.js
// Real-time clock that updates every second
// ============================================================

import { useState, useEffect } from 'react';

export function useClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const timeStr = now.toLocaleTimeString('es-AR', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  const timeShort = now.toLocaleTimeString('es-AR', {
    hour: '2-digit', minute: '2-digit',
  });

  const dateStr = now.toLocaleDateString('es-AR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const weekday = now.toLocaleDateString('es-AR', { weekday: 'long' });

  return { now, timeStr, timeShort, dateStr, weekday };
}
