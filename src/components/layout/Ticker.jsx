// ============================================================
// components/layout/Ticker.jsx
// Scrolling price ticker — top bar (live data)
// ============================================================

import React from 'react';
import { TICKER_ITEMS } from '../../data/ticker';

function fmt(v, dec = 0) {
  if (v == null) return '—';
  return v.toLocaleString('es-AR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

export function Ticker({ dolares, inflacion, riesgoPais, emae }) {
  // Build live items that override statics where data is available
  const liveItems = React.useMemo(() => {
    const base = [...TICKER_ITEMS];

    const override = (sym, val, chg, cls) => {
      const idx = base.findIndex(it => it.sym === sym);
      const item = { sym, val, chg, cls };
      if (idx >= 0) base[idx] = item;
      else base.push(item);
    };

    // Dolares
    if (dolares) {
      if (dolares.pMep != null)
        override('DÓLAR MEP', `$${fmt(dolares.pMep)}`, '', 'fl');
      if (dolares.pBlu != null)
        override('DÓLAR BLUE', `$${fmt(dolares.pBlu)}`, '', 'fl');
      if (dolares.pCcl != null)
        override('DÓLAR CCL', `$${fmt(dolares.pCcl)}`, '', 'fl');
    }

    // Riesgo País — ArgensStats
    if (riesgoPais?.valor != null) {
      const rp    = Math.round(riesgoPais.valor);
      const delta = riesgoPais.delta != null ? Math.round(riesgoPais.delta) : null;
      const chg   = delta != null ? (delta < 0 ? `${delta}` : `+${delta}`) : '';
      const cls   = delta != null ? (delta < 0 ? 'up' : 'dn') : 'fl';
      override('RIESGO PAÍS', `${rp} pb`, chg, cls);
    }

    // IPC — ArgensStats
    if (inflacion?.mensual != null) {
      const m = inflacion.mensual.toFixed(1).replace('.', ',');
      override('IPC MES', `${m}% m/m`, '', 'fl');
    } else if (inflacion?.history?.length) {
      const last = inflacion.history[inflacion.history.length - 1];
      const m = parseFloat(last?.valor || 0).toFixed(1).replace('.', ',');
      const fp = (last?.fecha || '').split('-');
      const MESES = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
      const label = fp[1] ? `IPC ${MESES[+fp[1]]}${fp[0]?.slice(-2) ? `'${fp[0].slice(-2)}` : ''}` : 'IPC';
      override('IPC MES', `${m}% m/m`, '', 'fl');
      // also update the old static key
      const oldIdx = base.findIndex(it => it.sym === 'IPC ENE26');
      if (oldIdx >= 0) base[oldIdx] = { sym: label, val: `${m}% m/m`, chg: '', cls: 'fl' };
    }

    // EMAE — ArgensStats
    if (emae?.anual != null) {
      const v   = emae.anual > 0 ? `+${emae.anual.toFixed(1).replace('.', ',')}%` : `${emae.anual.toFixed(1).replace('.', ',')}%`;
      const cls = emae.anual >= 0 ? 'up' : 'dn';
      override('EMAE', `${v} i.a.`, '', cls);
    }

    return base;
  }, [dolares, inflacion, riesgoPais, emae]);

  // Duplicate for seamless infinite scroll
  const items = [...liveItems, ...liveItems];

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
