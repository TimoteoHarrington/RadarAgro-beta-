// ============================================================
// components/layout/Ticker.jsx
// Scrolling price ticker — top bar
// ============================================================

import React from 'react';
import { TICKER_ITEMS } from '../../data/ticker';

export function Ticker() {
  // Duplicate items for seamless infinite scroll
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];

  return (
    <div className="ticker">
      <div className="ticker-track">
        {items.map((item, i) => (
          <div className="tick-item" key={i}>
            <span className="tick-sym">{item.sym}</span>
            <span className="tick-val">{item.val}</span>
            {item.chg && (
              <span className={`tick-chg ${item.cls}`}>{item.chg}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
