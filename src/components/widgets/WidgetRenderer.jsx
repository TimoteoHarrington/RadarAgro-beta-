// WidgetRenderer.jsx — widgets conectados a datos reales de API
import React from 'react';
import { FERIADOS_2026 } from '../../data/feriados';
import { CLIMA_DIAS } from '../../data/clima';
import {
  GRANOS_OVERVIEW, GRANOS_PIZARRAS, CBOT_DATA,
} from '../../data/granos';
import {
  HACIENDA_OVERVIEW, HACIENDA_NOVILLITOS, HACIENDA_NOVILLOS,
  HACIENDA_VACAS, HACIENDA_FAENA,
} from '../../data/hacienda';

// ── Helpers de formato ────────────────────────────────────────
const fARS = v => v != null ? '$\u00a0' + Math.round(v).toLocaleString('es-AR') : '…';
const fPct = (v, decimals = 1) => {
  if (v == null) return '—';
  return (v > 0 ? '+' : '') + v.toFixed(decimals).replace('.', ',') + '%';
};
const fPb  = v => v != null ? Math.round(v).toLocaleString('es-AR') + ' pb' : '…';
const fNum = (v, suffix = '') => v != null ? v.toLocaleString('es-AR', { maximumFractionDigits: 1 }) + suffix : '…';
const cls  = v => v == null ? 'fl' : v > 0 ? 'up' : v < 0 ? 'dn' : 'fl';

// Loader inline — muestra "cargando…" en rojo cuando no hay dato
function Loading() {
  return <span style={{ color: 'var(--red)', fontFamily: 'var(--mono)', fontSize: 11 }}>cargando…</span>;
}

// ── Componentes de UI compartidos ─────────────────────────────
function WHeader({ title, dotColor, page, goPage, ts }) {
  return (
    <div className="widget-header">
      <span className="widget-title">
        <span className="widget-title-dot" style={dotColor ? { background: dotColor } : {}} />
        {title}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {ts && <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)', letterSpacing: '.06em' }}>{ts}</span>}
        {page && goPage && (
          <button className="widget-link" onClick={() => goPage(page)}>VER TODO →</button>
        )}
      </div>
    </div>
  );
}

function Wkc2({ items }) {
  return (
    <div className="widget-kpi-compact">
      {items.map((it, i) => (
        <div className="wkc-cell" key={i}>
          <div className="wkc-label">{it.label}</div>
          <div className="wkc-val">{it.val ?? <Loading />}</div>
          <div className={`wkc-delta ${it.cls || 'fl'}`}>{it.delta}</div>
        </div>
      ))}
    </div>
  );
}

function GrainRow({ g, goPage, page = 'granos' }) {
  const c = g.cls === 'up' ? 'var(--green)' : g.cls === 'dn' ? 'var(--red)' : 'var(--text3)';
  return (
    <div className="grain-row" onClick={() => goPage && goPage(page)} style={{ cursor: 'pointer' }}>
      <div>
        <div className="grain-name">{g.name}</div>
        <div className="grain-sub">{g.sub}</div>
      </div>
      <svg className="grain-chart" viewBox="0 0 56 22">
        <polyline points={g.pts} fill="none" stroke={c} strokeWidth="1.5" strokeLinejoin="round" />
        <polygon points={`${g.pts} 56,22 0,22`} fill={c} opacity=".25" />
      </svg>
      <div className="grain-price" style={{ color: c }}>{g.price}</div>
      <div className={`grain-badge ${g.cls}`}>{g.badge}</div>
    </div>
  );
}

function GrainRowCompact({ g, goPage, page = 'granos' }) {
  const c = g.cls === 'up' ? 'var(--green)' : g.cls === 'dn' ? 'var(--red)' : '';
  return (
    <div className="grain-row-compact" onClick={() => goPage && goPage(page)} style={{ cursor: 'pointer' }}>
      <div className="grc-left">
        <div className="grc-name">{g.name}</div>
        <div className="grc-sub">{g.sub}</div>
      </div>
      <div className="grc-right">
        <div className="grc-price" style={c ? { color: c } : {}}>{g.price}</div>
        <div className={`grc-badge ${g.cls}`}>{g.badge}</div>
      </div>
    </div>
  );
}

// Granos data → formato widget (usa data/granos.js que ya tiene precios reales del PDF)
const GRANOS_W = GRANOS_OVERVIEW.map(g => ({
  name:  g.nombre,
  sub:   'BCR Rosario · disponible',
  pts:   g.sparkPts,
  price: fARS(g.precioARS),
  badge: fPct(g.variacionPct),
  cls:   g.varDir,
}));

const CBOT_W = CBOT_DATA.map(g => ({
  name:  g.nombre,
  sub:   'USD/tn · CBOT Chicago',
  pts:   '0,12 14,10 28,8 42,9 56,7',
  price: g.usd,
  badge: g.var,
  cls:   g.varDir,
}));

const HACIENDA_W = [
  ...HACIENDA_NOVILLITOS.slice(0, 2).map(h => ({
    name:  h.categoria,
    sub:   `Invernada · ${h.fuente}`,
    pts:   '0,17 14,15 28,12 42,10 56,8',
    price: fARS(h.promedio),
    badge: fPct(h.varPct),
    cls:   h.varDir,
  })),
  ...HACIENDA_NOVILLOS.slice(0, 2).map(h => ({
    name:  h.categoria,
    sub:   `Faena · ${h.fuente}`,
    pts:   '0,16 14,14 28,12 42,11 56,9',
    price: fARS(h.promedio),
    badge: fPct(h.varPct),
    cls:   h.varDir,
  })),
  ...HACIENDA_VACAS.slice(0, 1).map(h => ({
    name:  h.categoria,
    sub:   `Faena · ${h.fuente}`,
    pts:   '0,11 18,11 36,11 56,11',
    price: fARS(h.promedio),
    badge: fPct(h.varPct),
    cls:   h.varDir,
  })),
];

const INS = [
  { name: 'Urea granulada',  sub: 'ARS/tn · USD 388 · semanal', pts: '0,9 14,11 28,10 42,12 56,14',  price: '$484.000', badge: '−1,6%', cls: 'dn' },
  { name: 'MAP 11-52-0',     sub: 'ARS/tn · USD 459 · semanal', pts: '0,11 18,11 36,12 56,11',        price: '$572.000', badge: '0,0%',  cls: 'fl' },
  { name: 'DAP 18-46-0',     sub: 'ARS/tn · USD 440 · semanal', pts: '0,13 14,12 28,10 42,9 56,8',   price: '$548.000', badge: '+0,7%', cls: 'up' },
  { name: 'Gasoil G2 · YPF', sub: 'ARS/litro · semanal',        pts: '0,11 18,11 36,11 56,11',        price: '$1.247',   badge: '0,0%',  cls: 'fl' },
];

// Alícuotas de retenciones — datos normativos fijos (no cambian con el mercado)
const ALICUOTAS = { Soja: 0.33, Maíz: 0.12, Trigo: 0.12, Girasol: 0.07, Sorgo: 0.12, Cebada: 0.12 };

// ─────────────────────────────────────────────────────────────
// WIDGET: Granos Pizarra
// Datos: data/granos.js (precios reales de BCR del PDF Downtack)
// ─────────────────────────────────────────────────────────────
function GranosPizarraWidget({ size, goPage }) {
  if (size === 'normal') return (
    <>
      <WHeader title="Pizarra BCR · ARS/tn · Rosario" page="granos" goPage={goPage} />
      <Wkc2 items={GRANOS_W.slice(0, 4).map(g => ({ label: g.name, val: g.price, delta: g.badge, cls: g.cls }))} />
      {GRANOS_W.slice(0, 3).map((g, i) => <GrainRowCompact key={i} g={g} goPage={goPage} />)}
    </>
  );
  if (size === 'wide') return (
    <>
      <WHeader title="Pizarra BCR · ARS/tn · Rosario" page="granos" goPage={goPage} />
      <div className="widget-hero">
        {GRANOS_W.slice(0, 4).map(g => (
          <div className="widget-kpi" key={g.name}>
            <div className="widget-kpi-label">{g.name}</div>
            <div className="widget-kpi-val">{g.price}</div>
            <div className={`widget-kpi-delta ${g.cls}`}>{g.badge}</div>
          </div>
        ))}
      </div>
      {GRANOS_W.slice(0, 5).map((g, i) => <GrainRow key={i} g={g} goPage={goPage} />)}
    </>
  );
  return (
    <>
      <WHeader title="Pizarra BCR · ARS/tn · Rosario" page="granos" goPage={goPage} />
      <div className="widget-hero" style={{ gridTemplateColumns: 'repeat(6,1fr)' }}>
        {GRANOS_W.map(g => (
          <div className="widget-kpi" key={g.name}>
            <div className="widget-kpi-label">{g.name}</div>
            <div className="widget-kpi-val">{g.price}</div>
            <div className={`widget-kpi-delta ${g.cls}`}>{g.badge}</div>
          </div>
        ))}
      </div>
      {GRANOS_W.map((g, i) => <GrainRow key={i} g={g} goPage={goPage} />)}
      <div style={{ padding: '14px 18px 8px', borderTop: '1px solid var(--line)', background: 'var(--bg2)' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: '10px' }}>Comparativa de plazas · ARS/tn</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead><tr style={{ borderBottom: '1px solid var(--line)' }}>
              {['Producto', 'Rosario', 'Bs. Aires', 'Bahía Blanca', 'Quequén', 'Var. diaria'].map((h, i) => (
                <th key={h} style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text3)', padding: '6px 12px', textAlign: i > 0 ? 'right' : 'left', fontWeight: 400 }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {GRANOS_PIZARRAS.map(row => (
                <tr key={row.producto} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 500, color: 'var(--white)' }}>{row.producto}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--white)' }}>{fARS(row.rosario)}</td>
                  {[row.bsas, row.bahia, row.queq].map((v, i) => (
                    <td key={i} style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--mono)', color: v ? 'var(--text)' : 'var(--text3)' }}>{v ? fARS(v) : 'S/C'}</td>
                  ))}
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', background: `var(--${row.varDir === 'up' ? 'green' : 'red'}-bg)`, color: `var(--${row.varDir === 'up' ? 'green' : 'red'})`, padding: '2px 6px', borderRadius: '4px' }}>{fPct(row.varPct)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text3)', marginTop: '8px' }}>Fuente: BCR · Cámara Arbitral de Cereales</div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// WIDGET: Hacienda
// Datos: data/hacienda.js (precios reales del PDF Downtack)
// ─────────────────────────────────────────────────────────────
function HaciendaWidget({ size, goPage }) {
  const overview = HACIENDA_OVERVIEW;
  const hdr = <WHeader title="Hacienda · ARS/kg vivo · Cañuelas" dotColor="var(--green)" page="hacienda" goPage={goPage} />;

  if (size === 'normal') return (
    <>
      {hdr}
      <Wkc2 items={[
        { label: 'Novillito Esp.', val: fARS(overview[1]?.precio), delta: fPct(overview[1]?.var), cls: overview[1]?.varDir },
        { label: 'Novillo Esp.',   val: fARS(overview[0]?.precio), delta: fPct(overview[0]?.var), cls: overview[0]?.varDir },
      ]} />
      {HACIENDA_W.slice(0, 3).map((g, i) => <GrainRowCompact key={i} g={g} goPage={goPage} page="hacienda" />)}
    </>
  );
  if (size === 'wide') return (
    <>
      {hdr}
      <div className="widget-hero">
        {overview.slice(0, 4).map(h => (
          <div className="widget-kpi" key={h.id}>
            <div className="widget-kpi-label">{h.nombre}</div>
            <div className="widget-kpi-val">{fARS(h.precio)}</div>
            <div className={`widget-kpi-delta ${h.varDir}`}>{fPct(h.var)}</div>
          </div>
        ))}
      </div>
      {HACIENDA_W.slice(0, 4).map((g, i) => <GrainRow key={i} g={g} goPage={goPage} page="hacienda" />)}
    </>
  );
  return (
    <>
      {hdr}
      <div className="widget-hero" style={{ gridTemplateColumns: 'repeat(5,1fr)' }}>
        {overview.slice(0, 5).map(h => (
          <div className="widget-kpi" key={h.id}>
            <div className="widget-kpi-label">{h.nombre}</div>
            <div className="widget-kpi-val">{fARS(h.precio)}</div>
            <div className={`widget-kpi-delta ${h.varDir}`}>{fPct(h.var)}</div>
          </div>
        ))}
      </div>
      {HACIENDA_W.map((g, i) => <GrainRow key={i} g={g} goPage={goPage} page="hacienda" />)}
      <div style={{ padding: '14px 18px 8px', borderTop: '1px solid var(--line)', background: 'var(--bg2)' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: '10px' }}>Vientres · ARS/cabeza (estimado)</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
          {[['Vaca con cría', '$1.900.000', '+2,7%'], ['Vaca usada c/cría', '$1.550.000', '+3,3%'], ['Vaquillona c/cría', '$1.900.000', '+4,4%']].map(([l, v, d]) => (
            <div key={l} style={{ background: 'var(--bg1)', borderRadius: '8px', padding: '12px 14px', border: '1px solid var(--line)' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '8px', color: 'var(--text3)', marginBottom: '4px' }}>{l}</div>
              <div style={{ fontFamily: 'var(--display)', fontSize: '15px', fontWeight: 600, color: 'var(--white)' }}>{v}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--green)' }}>{d}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// WIDGET: Dólar
// Datos: dolares (API BCRA/cotizaciones — datos en tiempo real)
// ─────────────────────────────────────────────────────────────
function DolarWidget({ size, goPage, dolares }) {
  const D = dolares || {};
  const f$ = v => v ? '$' + Math.round(v).toLocaleString('es-AR') : null;
  const hasData = !!D.pOf;
  const hdr = <WHeader title="Dólar · ARS/USD" dotColor="var(--blue)" page="financiero" goPage={goPage} />;

  if (size === 'normal') return (
    <>
      {hdr}
      <Wkc2 items={[
        { label: 'Oficial',    val: f$(D.pOf),  delta: 'BCRA oficial',               cls: 'fl' },
        { label: 'MEP / Bolsa',val: f$(D.pMep), delta: D.bMep != null ? fPct(D.bMep) + ' brecha' : '…', cls: cls(D.bMep) },
        { label: 'CCL',        val: f$(D.pCcl), delta: D.bCcl != null ? fPct(D.bCcl) + ' brecha' : '…', cls: cls(D.bCcl) },
        { label: 'Blue',       val: f$(D.pBlu), delta: D.bBlu != null ? fPct(D.bBlu) + ' brecha' : '…', cls: cls(D.bBlu) },
      ]} />
      <div className="dolar-list">
        <div className="dolar-row">
          <div className="dr-name">Mayorista</div>
          <div className="dr-val">{f$(D.pMay) ?? <Loading />}</div>
          <div className="dr-chg fl">BCRA mayorista</div>
        </div>
        <div className="dolar-row">
          <div className="dr-name">Cripto (USDT)</div>
          <div className="dr-val">{f$(D.pCry) ?? <Loading />}</div>
          <div className={`dr-chg ${cls(D.bCry)}`}>{D.bCry != null ? fPct(D.bCry) + ' br.' : '…'}</div>
        </div>
        {hasData && (
          <div className="dolar-row" style={{ background: 'var(--bg2)' }}>
            <div className="dr-name" style={{ color: 'var(--text2)' }}>Brecha MEP vs Oficial</div>
            <div className="dr-val" style={{ color: 'var(--accent)', fontSize: '14px' }}>{fPct(D.bMep)}</div>
            <div className="dr-chg" />
          </div>
        )}
      </div>
    </>
  );

  if (size === 'wide') {
    const cells = [
      { name: 'Oficial',   val: f$(D.pOf),  chg: 'BCRA',        cls_: 'fl', featured: true },
      { name: 'MEP',       val: f$(D.pMep), chg: fPct(D.bMep),  cls_: cls(D.bMep) },
      { name: 'CCL',       val: f$(D.pCcl), chg: fPct(D.bCcl),  cls_: cls(D.bCcl) },
      { name: 'Blue',      val: f$(D.pBlu), chg: fPct(D.bBlu),  cls_: cls(D.bBlu) },
      { name: 'Mayorista', val: f$(D.pMay), chg: 'BCRA',        cls_: 'fl' },
      { name: 'Cripto',    val: f$(D.pCry), chg: fPct(D.bCry),  cls_: cls(D.bCry) },
    ];
    return (
      <>
        {hdr}
        <div className="dolar-strip" style={{ gridTemplateColumns: 'repeat(6,1fr)' }}>
          {cells.map(c => (
            <div key={c.name} className={`dolar-strip-cell${c.featured ? ' featured' : ''}`}>
              <div className="dsc-name">{c.name}</div>
              <div className="dsc-val">{c.val ?? <Loading />}</div>
              <div className={`dsc-chg ${c.cls_}`}>{c.chg}</div>
            </div>
          ))}
        </div>
        <div className="dolar-list">
          {[['MEP', D.bMep, 'var(--accent)'], ['Blue', D.bBlu, 'var(--red)']].map(([n, b, col]) => (
            <div className="dolar-row" key={n}>
              <div className="dr-name">Brecha {n} vs Oficial</div>
              <div style={{ flex: 1, height: '4px', background: 'var(--bg3)', borderRadius: '2px', overflow: 'hidden', margin: '0 16px' }}>
                <div style={{ width: `${Math.min(Math.abs(b || 0), 80)}%`, height: '100%', background: col, borderRadius: '2px', transition: 'width .6s' }} />
              </div>
              <div className="dr-val" style={{ color: col }}>{fPct(b)}</div>
            </div>
          ))}
        </div>
      </>
    );
  }

  // FULL
  const bl = D.pOf && D.pMep ? D.pOf * 0.8 + D.pMep * 0.2 : null;
  const bBl = D.pOf && bl ? (bl - D.pOf) / D.pOf * 100 : null;
  return (
    <>
      {hdr}
      <div className="dolar-strip" style={{ gridTemplateColumns: 'repeat(6,1fr)' }}>
        {[
          { n: 'Oficial',    v: f$(D.pOf),  c: 'BCRA',       cls_: 'fl', featured: true },
          { n: 'MEP',        v: f$(D.pMep), c: fPct(D.bMep), cls_: cls(D.bMep) },
          { n: 'CCL',        v: f$(D.pCcl), c: fPct(D.bCcl), cls_: cls(D.bCcl) },
          { n: 'Blue',       v: f$(D.pBlu), c: fPct(D.bBlu), cls_: cls(D.bBlu) },
          { n: 'Mayorista',  v: f$(D.pMay), c: 'BCRA',       cls_: 'fl' },
          { n: 'Cripto',     v: f$(D.pCry), c: fPct(D.bCry), cls_: cls(D.bCry) },
        ].map(d => (
          <div key={d.n} className={`dolar-strip-cell${d.featured ? ' featured' : ''}`}>
            <div className="dsc-name">{d.n}</div>
            <div className="dsc-val">{d.v ?? <Loading />}</div>
            <div className={`dsc-chg ${d.cls_}`}>{d.c}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: '14px 18px 10px' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: '12px' }}>Brechas vs oficial</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[['MEP', D.bMep, 'var(--blue)'], ['CCL', D.bCcl, 'var(--blue)'], ['Blue', D.bBlu, 'var(--red)'], ['Cripto', D.bCry, 'var(--text2)']].map(([n, b, col]) => (
            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: 'var(--text2)', minWidth: '80px', fontSize: '12px' }}>{n}</span>
              <div style={{ flex: 1, height: '5px', background: 'var(--bg3)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(Math.abs(b || 0), 80)}%`, height: '100%', background: col, borderRadius: '3px', transition: 'width .6s ease' }} />
              </div>
              <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: col, minWidth: '52px', textAlign: 'right' }}>{fPct(b)}</span>
            </div>
          ))}
        </div>
      </div>
      {bl != null && (
        <div style={{ padding: '0 18px 14px', borderTop: '1px solid var(--line)', marginTop: '8px' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text3)', margin: '12px 0 10px' }}>Dólar blend agro · 80% oficial + 20% MEP</div>
          <div style={{ background: 'var(--bg2)', borderRadius: '8px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text3)', marginBottom: '3px' }}>BLEND AGRO</div>
              <div style={{ fontFamily: 'var(--display)', fontSize: '22px', fontWeight: 700, color: 'var(--white)' }}>{f$(bl)}</div>
            </div>
            <div style={{ flex: 1, textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text3)' }}>Brecha vs oficial</div>
              <div style={{ fontFamily: 'var(--display)', fontSize: '18px', fontWeight: 700, color: 'var(--accent)' }}>{fPct(bBl)}</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// WIDGET: CBOT Chicago
// Datos: data/granos.js CBOT_DATA (precios reales del PDF)
// ─────────────────────────────────────────────────────────────
function CbotWidget({ size, goPage }) {
  const hdr = <WHeader title="CBOT · Disponible · USD/tn" dotColor="var(--accent)" page="granos" goPage={goPage} />;
  if (size === 'normal') return (
    <>
      {hdr}
      <Wkc2 items={CBOT_W.map(g => ({ label: g.name, val: g.price, delta: g.badge, cls: g.cls }))} />
      {CBOT_W.map((g, i) => <GrainRowCompact key={i} g={g} goPage={goPage} />)}
    </>
  );
  if (size === 'wide') return (
    <>
      {hdr}
      <div className="widget-hero" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        {CBOT_W.map(g => (
          <div className="widget-kpi" key={g.name}>
            <div className="widget-kpi-label">{g.name}</div>
            <div className="widget-kpi-val">{g.price}</div>
            <div className={`widget-kpi-delta ${g.cls}`}>{g.badge}</div>
          </div>
        ))}
      </div>
      {CBOT_W.map((g, i) => <GrainRow key={i} g={g} goPage={goPage} />)}
    </>
  );
  return (
    <>
      {hdr}
      <div className="widget-hero" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        {CBOT_W.map(g => (
          <div className="widget-kpi" key={g.name}>
            <div className="widget-kpi-label">{g.name}</div>
            <div className="widget-kpi-val">{g.price}</div>
            <div className={`widget-kpi-delta ${g.cls}`}>{g.badge}</div>
          </div>
        ))}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead><tr style={{ borderBottom: '1px solid var(--line)' }}>
            {['Contrato', 'USD/tn', 'Var.', 'Apertura', 'Máx.', 'Mín.'].map((h, i) => (
              <th key={h} style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text3)', padding: '8px 14px', textAlign: i > 0 ? 'right' : 'left', fontWeight: 400 }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {CBOT_DATA.map(g => (
              <tr key={g.nombre} style={{ borderBottom: '1px solid var(--line)' }}>
                <td style={{ padding: '8px 14px', fontWeight: 500, color: 'var(--white)' }}>{g.nombre}</td>
                <td style={{ padding: '8px 14px', textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--white)' }}>{g.usd}</td>
                <td style={{ padding: '8px 14px', textAlign: 'right' }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', background: `var(--${g.varDir === 'up' ? 'green' : 'red'}-bg)`, color: `var(--${g.varDir === 'up' ? 'green' : 'red'})`, padding: '2px 6px', borderRadius: '4px' }}>{g.var}</span>
                </td>
                {[g.open, g.max, g.min].map((v, i) => (
                  <td key={i} style={{ padding: '8px 14px', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--text3)' }}>{v}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ padding: '6px 14px 10px', fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text3)' }}>CME Group (CBOT) · 1 bu soja ≈ 27,22 kg · 1 bu maíz ≈ 25,40 kg</div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// WIDGET: Macro KPI
// Datos: inflacion, riesgoPais, indec (APIs reales)
// ─────────────────────────────────────────────────────────────
function MacroWidget({ size, goPage, inflacion, riesgoPais, indec, bcra }) {
  const hdr = <WHeader title="Macroeconomía · INDEC / BCRA / JP Morgan" dotColor="var(--accent)" page="macro" goPage={goPage} />;

  // Extraer valores resueltos (BCRA primary, ArgentinaDatos fallback — enriquecidos en useLiveData)
  const ipcVal   = inflacion?.ipcMensual    != null ? fPct(inflacion.ipcMensual)    :
                   inflacion?.valor          != null ? fPct(inflacion.valor)          : null;
  const ipcFecha = inflacion?.ipcFecha ? inflacion.ipcFecha.slice(0, 7) :
                   inflacion?.fecha    ? inflacion.fecha.slice(0, 7)    : '—';
  const ipcIA    = inflacion?.ipcInteranual ?? (
    inflacion?.iaHistory?.length
      ? parseFloat(inflacion.iaHistory[inflacion.iaHistory.length - 1]?.valor ?? 0)
      : null
  );

  const rpVal     = riesgoPais?.valor != null ? fPb(riesgoPais.valor) : null;
  const rpDelta   = riesgoPais?.delta != null ? (riesgoPais.delta > 0 ? '+' : '') + Math.round(riesgoPais.delta) + ' pb' : null;

  const emaeIA    = indec?.emae?.ia != null ? fPct(indec.emae.ia) : null;
  const emaeFecha = indec?.emae?.fecha ? indec.emae.fecha.slice(0, 7) : '—';

  // Reservas BCRA — dato real de la API del BCRA (variable id=1, en MM USD)
  const resRaw  = bcra?.byKey?.reservas;
  const resVal  = resRaw?.valor != null
    ? 'USD ' + (resRaw.valor / 1000).toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'B'
    : null;
  const resFecha = resRaw?.fecha ? resRaw.fecha.slice(0, 10) : null;

  const rows = [
    {
      lbl: 'IPC General',
      sub: ipcFecha,
      val: ipcVal ?? <Loading />,
      delta: ipcIA != null ? `i.a. ${fPct(ipcIA)}` : '—',
      dcls: ipcVal ? 'dn' : 'fl',
    },
    {
      lbl: 'EMAE',
      sub: emaeFecha,
      val: emaeIA ?? <Loading />,
      delta: emaeIA ? 'var. interanual' : '—',
      dcls: emaeIA ? (indec?.emae?.ia > 0 ? 'up' : 'dn') : 'fl',
    },
    {
      lbl: 'Riesgo País',
      sub: 'EMBI+',
      val: rpVal ?? <Loading />,
      delta: rpDelta ?? '—',
      dcls: riesgoPais?.delta != null ? (riesgoPais.delta < 0 ? 'dn' : 'up') : 'fl',
    },
    {
      lbl: 'Reservas BCRA',
      sub: resFecha ?? 'Brutas',
      val: resVal ?? <Loading />,
      delta: 'Dato BCRA',
      dcls: 'fl',
    },
  ];

  const mkRow = (m, showNote) => (
    <div className="macro-row" key={m.lbl} onClick={() => goPage('macro')} style={{ cursor: 'pointer' }}>
      <div className="macro-row-left">
        <span className="macro-row-lbl">{m.lbl}</span>
        <span className="macro-row-sub"> · {m.sub}</span>
      </div>
      <div className="macro-row-right">
        <div className="macro-row-val">{m.val}</div>
        <div className={`macro-row-delta ${m.dcls}`}>{m.delta}</div>
      </div>
    </div>
  );

  if (size === 'normal') return (
    <>
      {hdr}
      <Wkc2 items={[
        { label: 'IPC',         val: ipcVal,  delta: ipcIA != null ? `i.a. ${fPct(ipcIA)}` : '…', cls: 'dn' },
        { label: 'EMAE',        val: emaeIA,  delta: 'interanual',                                 cls: emaeIA ? (indec?.emae?.ia > 0 ? 'up' : 'dn') : 'fl' },
        { label: 'Riesgo País', val: rpVal,   delta: rpDelta ?? '…',                               cls: riesgoPais?.delta != null ? (riesgoPais.delta < 0 ? 'dn' : 'up') : 'fl' },
        { label: 'Reservas',    val: resVal,  delta: 'brutas BCRA',                                cls: 'fl' },
      ]} />
    </>
  );
  if (size === 'wide') return <>{hdr}{rows.map(m => mkRow(m, false))}</>;
  return <>{hdr}{rows.map(m => mkRow(m, true))}</>;
}

// ─────────────────────────────────────────────────────────────
// WIDGET: Índices estructurales
// Datos: calculados desde granos/hacienda (data estática)
// ─────────────────────────────────────────────────────────────
function IndicesWidget({ size, goPage }) {
  // Calcular índices en tiempo real desde los datos de granos y hacienda
  const soja  = GRANOS_OVERVIEW.find(g => g.id === 'soja');
  const maiz  = GRANOS_OVERVIEW.find(g => g.id === 'maiz');
  const nov   = HACIENDA_OVERVIEW.find(h => h.id === 'novillo');
  const novit = HACIENDA_OVERVIEW.find(h => h.id === 'novillito');

  const urea    = 484000;  // ARS/tn
  const ternero = HACIENDA_OVERVIEW.find(h => h.id === 'rosgan-inv')?.precio ?? 6250;

  const feedlot = nov && maiz ? (nov.precio * 1000) / maiz.precioARS : null;
  const criaRat = novit && nov ? novit.precio / nov.precio : null;
  const sojaUre = soja && urea ? soja.precioARS / urea : null;
  const maizTer = maiz && ternero ? (maiz.precioARS / 1000) / (ternero / 1000) : null;
  const maizSoj = maiz && soja ? maiz.precioARS / soja.precioARS : null;

  const IDX = [
    {
      name: 'Feedlot · Novillo/Maíz',
      desc: 'kg novillo / tn maíz · umbral: 15',
      val:  feedlot != null ? feedlot.toFixed(1).replace('.', ',') : '…',
      bar:  feedlot != null ? Math.min((feedlot / 25) * 100, 100) : 0,
      clr:  feedlot != null ? (feedlot >= 15 ? 'var(--green)' : 'var(--red)') : 'var(--text3)',
      st:   feedlot != null ? (feedlot >= 15 ? 'FAVORABLE' : 'PRESIÓN') : '…',
    },
    {
      name: 'Cría · Novillito/Novillo',
      desc: 'ratio precio · favorable: >1,10',
      val:  criaRat != null ? criaRat.toFixed(2).replace('.', ',') : '…',
      bar:  criaRat != null ? Math.min((criaRat / 1.5) * 100, 100) : 0,
      clr:  criaRat != null ? (criaRat >= 1.1 ? 'var(--green)' : 'var(--red)') : 'var(--text3)',
      st:   criaRat != null ? (criaRat >= 1.1 ? 'POSITIVO' : 'NEUTRAL') : '…',
    },
    {
      name: 'Soja / Urea',
      desc: 'tn soja / tn urea · rentable: >1,0',
      val:  sojaUre != null ? sojaUre.toFixed(2).replace('.', ',') : '…',
      bar:  sojaUre != null ? Math.min(sojaUre * 50, 100) : 0,
      clr:  sojaUre != null ? (sojaUre >= 1 ? 'var(--green)' : 'var(--red)') : 'var(--text3)',
      st:   sojaUre != null ? (sojaUre >= 1 ? 'RENTABLE' : 'PRESIÓN') : '…',
    },
    {
      name: 'Maíz / Ternero',
      desc: 'tn maíz por kg de ternero',
      val:  maizTer != null ? maizTer.toFixed(1).replace('.', ',') : '…',
      bar:  maizTer != null ? Math.min(maizTer * 2, 100) : 0,
      clr:  'var(--accent)',
      st:   'kg/tn',
    },
    {
      name: 'Maíz / Soja',
      desc: 'ratio de precios relativo',
      val:  maizSoj != null ? maizSoj.toFixed(3).replace('.', ',') : '…',
      bar:  maizSoj != null ? Math.min(maizSoj * 100, 100) : 0,
      clr:  'var(--text2)',
      st:   'ratio',
    },
  ];

  const hdr = <WHeader title="Índices & Relaciones clave" dotColor="var(--green)" page="indices" goPage={goPage} />;
  const mkRow = x => (
    <div className="idx-widget-row" key={x.name} onClick={() => goPage('indices')} style={{ cursor: 'pointer' }}>
      <div className="idx-widget-info">
        <div className="idx-widget-name">{x.name}</div>
        <div className="idx-widget-desc">{x.desc}</div>
      </div>
      <div style={{ textAlign: 'right', minWidth: '60px' }}>
        <div className="idx-widget-val" style={{ color: x.clr }}>{x.val}</div>
        <div className="idx-widget-status" style={{ color: x.clr }}>{x.st}</div>
      </div>
    </div>
  );

  if (size === 'normal') return (
    <>
      {hdr}
      <Wkc2 items={[
        { label: 'Feedlot', val: IDX[0].val, delta: IDX[0].st, cls: feedlot != null && feedlot >= 15 ? 'up' : 'dn' },
        { label: 'Soja/Urea', val: IDX[2].val, delta: IDX[2].st, cls: sojaUre != null && sojaUre >= 1 ? 'up' : 'dn' },
      ]} />
      {IDX.slice(0, 3).map(mkRow)}
    </>
  );
  if (size === 'wide') return <>{hdr}{IDX.slice(0, 4).map(mkRow)}</>;
  return <>{hdr}{IDX.map(mkRow)}</>;
}

// ─────────────────────────────────────────────────────────────
// WIDGET: Insumos
// Datos: estáticos (no hay API de insumos disponible)
// ─────────────────────────────────────────────────────────────
function InsumosWidget({ size, goPage }) {
  const hdr = <WHeader title="Insumos · ARS/tn y ARS/litro" dotColor="var(--accent)" page="insumos" goPage={goPage} />;
  const insClr = x => x.cls === 'up' ? 'var(--green)' : x.cls === 'dn' ? 'var(--red)' : 'var(--text3)';

  if (size === 'normal') return (
    <>
      {hdr}
      <Wkc2 items={[
        { label: 'Urea gran.', val: '$484k',   delta: '−1,6%', cls: 'dn' },
        { label: 'MAP',        val: '$572k',   delta: '= 0%',  cls: 'fl' },
        { label: 'DAP',        val: '$548k',   delta: '+0,7%', cls: 'up' },
        { label: 'Gasoil G2',  val: '$1.247',  delta: '= 0%',  cls: 'fl' },
      ]} />
      {INS.map((x, i) => <GrainRowCompact key={i} g={x} goPage={goPage} page="insumos" />)}
    </>
  );
  if (size === 'wide') return (
    <>
      {hdr}
      <div className="widget-hero" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        {INS.map(x => (
          <div className="widget-kpi" key={x.name}>
            <div className="widget-kpi-label">{x.name.split(' ')[0]}</div>
            <div className="widget-kpi-val" style={{ color: insClr(x) }}>{x.price}</div>
            <div className={`widget-kpi-delta ${x.cls}`}>{x.badge}</div>
          </div>
        ))}
      </div>
      {INS.map((x, i) => <GrainRow key={i} g={x} goPage={goPage} page="insumos" />)}
    </>
  );
  return (
    <>
      {hdr}
      <div className="widget-hero" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        {INS.map(x => (
          <div className="widget-kpi" key={x.name}>
            <div className="widget-kpi-label">{x.name.split(' ')[0]}</div>
            <div className="widget-kpi-val" style={{ color: insClr(x) }}>{x.price}</div>
            <div className={`widget-kpi-delta ${x.cls}`}>{x.badge}</div>
          </div>
        ))}
      </div>
      {INS.map((x, i) => <GrainRow key={i} g={x} goPage={goPage} page="insumos" />)}
      <div style={{ padding: '14px 18px', borderTop: '1px solid var(--line)', background: 'var(--bg2)' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '.1em', color: 'var(--text3)', marginBottom: '10px', textTransform: 'uppercase' }}>Relaciones insumo/producto</div>
        {[['Soja / Urea', '47%', 'var(--red)', '0,94'], ['Maíz / Urea', '26%', 'var(--red)', '0,52'], ['Soja / Gasoil', '73%', 'var(--accent)', '365 L/tn']].map(([lbl, w, clr, v]) => (
          <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{ color: 'var(--text2)', minWidth: '120px' }}>{lbl}</span>
            <div style={{ flex: 1, height: '5px', background: 'var(--bg3)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: w, height: '100%', background: clr, borderRadius: '3px', opacity: .85 }} />
            </div>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: clr, fontWeight: 600, minWidth: '44px', textAlign: 'right' }}>{v}</span>
          </div>
        ))}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// WIDGET: Retenciones
// Datos: alícuotas fijas (normativa) + precios reales de granos
// ─────────────────────────────────────────────────────────────
function RetencionesWidget({ size, goPage }) {
  const hdr = <WHeader title="Retenciones · Vigentes 2026" dotColor="var(--red)" page="impuestos" goPage={goPage} />;

  // Calcular retenciones desde precios reales de granos
  const RET = GRANOS_OVERVIEW.map(g => {
    const ali = ALICUOTAS[g.nombre] ?? 0;
    const piz = g.precioARS;
    const retMonto = Math.round(piz * ali);
    const neto = piz - retMonto;
    return {
      n:    g.nombre,
      ali:  `${Math.round(ali * 100)}%`,
      piz:  fARS(piz),
      ret:  '−' + fARS(retMonto),
      neto: fARS(neto),
      cls:  ali > 0.2 ? 'dn' : ali > 0.1 ? 'fl' : 'up',
    };
  });

  const retRow = (r, showNeto) => (
    <div className="grain-row" key={r.n} onClick={() => goPage('impuestos')} style={{ cursor: 'pointer' }}>
      <div>
        <div className="grain-name">{r.n}</div>
        <div className="grain-sub">Pizarra: {r.piz}</div>
      </div>
      <div style={{ flexShrink: 0, textAlign: 'right' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', fontWeight: 700, color: 'var(--red)' }}>{r.ali}</div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--text3)' }}>{r.ret}/tn</div>
        {showNeto && <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--green)' }}>neto: {r.neto}</div>}
      </div>
    </div>
  );

  if (size === 'normal') return (
    <>
      {hdr}
      <Wkc2 items={RET.slice(0, 4).map(r => ({ label: r.n, val: r.ali, delta: r.ret + '/tn', cls: r.cls }))} />
      {RET.slice(0, 3).map(r => retRow(r, false))}
    </>
  );
  if (size === 'wide') return (
    <>
      {hdr}
      {RET.map(r => retRow(r, false))}
      <div style={{ padding: '8px 18px', fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text3)' }}>Derechos de exportación · Res. MECON · Pizarras BCR Rosario actuales</div>
    </>
  );
  return (
    <>
      {hdr}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ borderBottom: '1px solid var(--line)' }}>
            {['Producto', 'Alícuota', 'Pizarra', 'Retención /tn', 'Neto productor'].map((h, i) => (
              <th key={h} style={{ textAlign: i === 0 ? 'left' : 'right', padding: '9px 14px', fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text3)', fontWeight: 400, letterSpacing: '.08em', textTransform: 'uppercase' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {RET.map(r => (
              <tr key={r.n} style={{ borderBottom: '1px solid var(--line)' }}>
                <td style={{ padding: '10px 14px', fontWeight: 500, color: 'var(--white)' }}>{r.n}</td>
                <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: '13px', fontWeight: 700, color: 'var(--red)' }}>{r.ali}</td>
                <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--text2)' }}>{r.piz}</td>
                <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--red)' }}>{r.ret}</td>
                <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: '13px', fontWeight: 600, color: 'var(--green)' }}>{r.neto}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ padding: '8px 18px', fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text3)' }}>Res. MECON · Pizarras BCR Rosario · Sin IVA ni comisiones</div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// WIDGET: Tasas & UVA
// Datos: tasas de la API BCRA (cuando disponible)
// ─────────────────────────────────────────────────────────────
function TasasWidget({ size, goPage, tasas }) {
  const hdr = <WHeader title="Tasas & UVA · BCRA / BYMA" dotColor="var(--red)" page="financiero" goPage={goPage} />;

  // Intentar extraer tasas reales desde el hook
  const pfTasa = tasas?.plazoFijo?.length
    ? parseFloat(tasas.plazoFijo[tasas.plazoFijo.length - 1]?.valor ?? 29)
    : 29;
  const depTasa = tasas?.depositos?.length
    ? parseFloat(tasas.depositos[tasas.depositos.length - 1]?.valor ?? 31.5)
    : 31.5;

  const TASAS_DATA = [
    { n: 'Plazo Fijo TNA', tna: `${pfTasa.toFixed(1)}%`,    tea: `${(pfTasa * 1.138).toFixed(1)}%`,  real: '—', dcls: 'fl' },
    { n: 'BADLAR',         tna: `${depTasa.toFixed(1)}%`,   tea: `${(depTasa * 1.16).toFixed(1)}%`,  real: '—', dcls: 'fl' },
    { n: 'TAMAR',          tna: '32,8%',  tea: '38,4%', real: '—', dcls: 'fl' },
    { n: 'Caución 1d',     tna: '28,4%',  tea: '32,1%', real: '—', dcls: 'fl' },
  ];

  if (size === 'normal') return (
    <>
      {hdr}
      <Wkc2 items={[
        { label: 'Plazo Fijo', val: TASAS_DATA[0].tna, delta: 'TNA 30d',      cls: 'fl' },
        { label: 'BADLAR',     val: TASAS_DATA[1].tna, delta: 'TNA mayorista', cls: 'fl' },
        { label: 'TAMAR',      val: TASAS_DATA[2].tna, delta: 'TNA',           cls: 'fl' },
        { label: 'Caución 1d', val: TASAS_DATA[3].tna, delta: 'TNA',           cls: 'fl' },
      ]} />
      {TASAS_DATA.slice(0, 2).map(t => (
        <div className="macro-row" key={t.n} onClick={() => goPage && goPage('financiero')} style={{ cursor: 'pointer' }}>
          <div className="macro-row-left"><span className="macro-row-lbl">{t.n}</span></div>
          <div className="macro-row-right">
            <div className="macro-row-val">{t.tna}</div>
            <div className={`macro-row-delta ${t.dcls}`}>TEA {t.tea}</div>
          </div>
        </div>
      ))}
    </>
  );
  return (
    <>
      {hdr}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead><tr style={{ borderBottom: '1px solid var(--line)' }}>
            {['Tasa', 'TNA', 'TEA'].map((h, i) => (
              <th key={h} style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text3)', padding: '8px 14px', textAlign: i > 0 ? 'right' : 'left', fontWeight: 400 }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {TASAS_DATA.map(t => (
              <tr key={t.n} style={{ borderBottom: '1px solid var(--line)' }}>
                <td style={{ padding: '8px 14px', fontWeight: 500, color: 'var(--white)' }}>{t.n}</td>
                <td style={{ padding: '8px 14px', textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--white)' }}>{t.tna}</td>
                <td style={{ padding: '8px 14px', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--text3)' }}>{t.tea}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ padding: '6px 14px 10px', fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text3)' }}>BCRA / BYMA · Tasas de referencia vigentes</div>
    </>
  );
}

function DolarAgroWidget({ size, goPage, dolares }) {
  return <DolarWidget size={size} goPage={goPage} dolares={dolares} />;
}

// ─────────────────────────────────────────────────────────────
// WIDGET: Clima
// Datos: estáticos — no hay API de clima disponible
// ─────────────────────────────────────────────────────────────
function ClimaWidget({ size, goPage }) {
  const ESTACIONES = [
    { loc: 'Rosario',      temp: '28°', min: '19°', max: '31°', lluvia: '0 mm',  humedad: '62%', viento: '18 km/h NE', ico: '☀', alerta: '' },
    { loc: 'Córdoba',      temp: '25°', min: '16°', max: '28°', lluvia: '0 mm',  humedad: '55%', viento: '12 km/h N',  ico: '⛅', alerta: '' },
    { loc: 'Pergamino',    temp: '27°', min: '18°', max: '30°', lluvia: '2 mm',  humedad: '70%', viento: '15 km/h E',  ico: '🌦', alerta: 'ALERTA' },
    { loc: 'Bahía Blanca', temp: '22°', min: '14°', max: '25°', lluvia: '8 mm',  humedad: '80%', viento: '32 km/h SW', ico: '🌧', alerta: 'LLUVIAS' },
  ];
  const PRONOSTICO = [
    { d: 'Mié', ico: '☀', max: '29°', min: '18°', ll: '2 mm' },
    { d: 'Jue', ico: '🌦', max: '24°', min: '15°', ll: '18 mm' },
    { d: 'Vie', ico: '🌧', max: '21°', min: '13°', ll: '22 mm' },
    { d: 'Sáb', ico: '⛅', max: '26°', min: '16°', ll: '5 mm' },
    { d: 'Dom', ico: '☀', max: '31°', min: '18°', ll: '0 mm' },
    { d: 'Lun', ico: '☀', max: '33°', min: '20°', ll: '0 mm' },
  ];
  const hdr = <WHeader title="Clima · Zona Núcleo pampeana" dotColor="#56b8e6" />;
  if (size === 'normal') return (
    <>
      {hdr}
      <div style={{ padding: '14px 18px 4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text3)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '4px' }}>Rosario · hoy</div>
            <div style={{ fontFamily: 'var(--display)', fontSize: '42px', fontWeight: 700, color: 'var(--white)', lineHeight: 1 }}>28°<span style={{ fontSize: '20px', color: 'var(--text2)' }}>C</span></div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--text3)', marginTop: '3px' }}>Min 19° · Máx 31° · Hum 62%</div>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', borderTop: '1px solid var(--line)' }}>
        {PRONOSTICO.slice(0, 5).map(p => (
          <div key={p.d} style={{ flex: 1, padding: '8px 4px', textAlign: 'center', borderRight: '1px solid var(--line)' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text3)' }}>{p.d}</div>
            <div style={{ fontSize: '14px', margin: '3px 0' }}>{p.ico}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--white)', fontWeight: 600 }}>{p.max}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text3)' }}>{p.min}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: '#56b8e6', marginTop: '2px' }}>{p.ll}</div>
          </div>
        ))}
      </div>
    </>
  );
  return (
    <>
      {hdr}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1px', background: 'var(--line)', borderBottom: '1px solid var(--line)' }}>
        {ESTACIONES.map(e => (
          <div key={e.loc} style={{ background: 'var(--bg1)', padding: '12px 14px' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text3)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: '6px' }}>{e.loc}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <div style={{ fontFamily: 'var(--display)', fontSize: '26px', fontWeight: 700, color: 'var(--white)' }}>{e.temp}</div>
              <div style={{ fontSize: '18px' }}>{e.ico}</div>
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text3)', marginTop: '4px' }}>{e.min}–{e.max} · {e.lluvia}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text3)' }}>{e.viento}</div>
            {e.alerta && <div style={{ marginTop: '5px', fontFamily: 'var(--mono)', fontSize: '8px', color: 'var(--accent2)', letterSpacing: '.06em' }}>{e.alerta}</div>}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex' }}>
        {PRONOSTICO.map(p => (
          <div key={p.d} style={{ flex: 1, padding: '10px 4px', textAlign: 'center', borderRight: '1px solid var(--line)' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text3)' }}>{p.d}</div>
            <div style={{ fontSize: '16px', margin: '4px 0' }}>{p.ico}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--white)', fontWeight: 600 }}>{p.max}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text3)' }}>{p.min}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: '#56b8e6', marginTop: '3px' }}>{p.ll}</div>
          </div>
        ))}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// WIDGET: Calculadora de retenciones
// Conectado al dólar oficial real
// ─────────────────────────────────────────────────────────────
function CalcRetencWidget({ goPage, dolares }) {
  const [bruto, setBruto]   = React.useState('');
  const [alic, setAlic]     = React.useState(0.33);
  const [flete, setFlete]   = React.useState('');
  const [comis, setComis]   = React.useState(1);
  const [result, setResult] = React.useState(null);

  // Usa el dólar oficial real de la API
  const dolar = dolares?.pOf ?? 1245;

  const calc = () => {
    const b = parseFloat(bruto) || 0;
    if (!b) { setResult(null); return; }
    const ret = b * alic, fl = parseFloat(flete) || 0, co = b * (parseFloat(comis) || 0) / 100;
    const neto = b - ret - fl - co;
    const pct = ((ret + fl + co) / b * 100).toFixed(1);
    setResult({ bruto: b, ret, fl, co, neto, netusd: neto / dolar, pct });
  };

  const fmt = v => '$' + Math.round(v).toLocaleString('es-AR');

  return (
    <>
      <WHeader title="Calculadora · Neto Productor" dotColor="var(--gold)" />
      <div className="calc-body" style={{ padding: '16px' }}>
        <div className="calc-fields" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
          <div className="field">
            <label>Producto</label>
            <select value={alic} onChange={e => setAlic(parseFloat(e.target.value))}>
              <option value={0.33}>Soja (33%)</option>
              <option value={0.12}>Maíz/Trigo (12%)</option>
              <option value={0.07}>Girasol (7%)</option>
              <option value={0.09}>Carne (9%)</option>
              <option value={0}>Sin retención</option>
            </select>
          </div>
          <div className="field">
            <label>Precio ARS/tn</label>
            <input type="number" value={bruto} onChange={e => setBruto(e.target.value)} placeholder="456000" onKeyDown={e => e.key === 'Enter' && calc()} />
          </div>
          <div className="field">
            <label>Flete ARS/tn</label>
            <input type="number" value={flete} onChange={e => setFlete(e.target.value)} placeholder="18000" />
          </div>
          <div className="field">
            <label>Dólar oficial {dolares?.pOf ? `(${fARS(dolares.pOf)})` : '(cargando…)'}</label>
            <input type="number" value={dolar} readOnly style={{ opacity: 0.6, cursor: 'not-allowed' }} />
          </div>
        </div>
        <button onClick={calc} style={{ width: '100%', background: 'var(--accent)', border: 'none', color: '#fff', fontFamily: 'var(--mono)', fontSize: '11px', letterSpacing: '.08em', padding: '9px', borderRadius: '8px', cursor: 'pointer', marginBottom: '16px' }}>CALCULAR</button>
        {result && (
          <div className="calc-out">
            <div className="cout"><div className="cout-label">Precio bruto</div><div className="cout-val">{fmt(result.bruto)}</div><div className="cout-unit">ARS/tn</div></div>
            <div className="cout"><div className="cout-label">Retención</div><div className="cout-val dn">−{fmt(result.ret)}</div><div className="cout-unit">ARS/tn</div></div>
            <div className="cout"><div className="cout-label">Flete</div><div className="cout-val dn">−{fmt(result.fl)}</div><div className="cout-unit">ARS/tn</div></div>
            <div className="cout highlight"><div className="cout-label">Neto ARS/tn</div><div className="cout-val">{fmt(result.neto)}</div><div className="cout-unit">ARS/tn</div></div>
            <div className="cout highlight"><div className="cout-label">Neto USD/tn</div><div className="cout-val">{result.netusd.toFixed(0)}</div><div className="cout-unit">USD/tn</div></div>
            <div className="cout"><div className="cout-label">Presión total</div><div className="cout-val dn">{result.pct}%</div><div className="cout-unit">% del bruto</div></div>
          </div>
        )}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// WIDGET: Feriados
// Datos: API de feriados (data real)
// ─────────────────────────────────────────────────────────────
function FeriadosWidget({ goPage, feriados }) {
  const hoy = new Date();
  const lista = (feriados && Array.isArray(feriados))
    ? feriados.filter(f => new Date(f.fecha) >= hoy).slice(0, 5)
    : FERIADOS_2026.filter(f => {
        const [d, m] = f.fecha.split('/').map(Number);
        return new Date(2026, m - 1, d) >= hoy;
      }).slice(0, 5);

  const formatF = f => {
    if (f.fecha && f.fecha.includes('-')) {
      const d = new Date(f.fecha + 'T00:00:00');
      return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
    }
    return f.fecha;
  };

  // Días hasta el próximo feriado
  const getDias = f => {
    const fecha = f.fecha.includes('-')
      ? new Date(f.fecha + 'T00:00:00')
      : (() => { const [d, m] = f.fecha.split('/').map(Number); return new Date(2026, m - 1, d); })();
    const diff = Math.ceil((fecha - hoy) / (1000 * 60 * 60 * 24));
    return diff === 0 ? 'Hoy' : diff === 1 ? 'Mañana' : `En ${diff} días`;
  };

  const next = lista[0];
  return (
    <>
      <WHeader title="Próximos feriados 2026" dotColor="var(--accent)" page="feriados" goPage={goPage} />
      {next && (
        <div style={{ margin: '12px 18px', background: 'var(--acc-bg)', border: '1px solid rgba(77,158,240,.2)', borderRadius: '10px', padding: '14px 16px' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--accent)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '6px' }}>PRÓXIMO FERIADO · {getDias(next)}</div>
          <div style={{ fontFamily: 'var(--display)', fontSize: '18px', fontWeight: 700, color: 'var(--white)', marginBottom: '4px' }}>{formatF(next)}</div>
          <div style={{ fontSize: '13px', color: 'var(--text2)' }}>{next.nombre}</div>
        </div>
      )}
      <div style={{ paddingBottom: '8px' }}>
        {lista.slice(1, 5).map((f, i) => (
          <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '9px 18px', borderBottom: '1px solid var(--line)' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--accent)', minWidth: '60px' }}>{formatF(f)}</span>
            <span style={{ fontSize: '12px', color: 'var(--text2)', flex: 1 }}>{f.nombre}</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text3)' }}>{getDias(f)}</span>
          </div>
        ))}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Main WidgetRenderer — pasa todos los datos reales a cada widget
// ─────────────────────────────────────────────────────────────
export function WidgetRenderer({ widgetId, size, goPage, dolares, feriados, inflacion, riesgoPais, indec, tasas, bcra }) {
  switch (widgetId) {
    case 'granos-pizarra': return <GranosPizarraWidget size={size} goPage={goPage} />;
    case 'hacienda':       return <HaciendaWidget      size={size} goPage={goPage} />;
    case 'dolar':          return <DolarWidget          size={size} goPage={goPage} dolares={dolares} />;
    case 'cbot':           return <CbotWidget           size={size} goPage={goPage} />;
    case 'indices':        return <IndicesWidget        size={size} goPage={goPage} />;
    case 'insumos':        return <InsumosWidget        size={size} goPage={goPage} />;
    case 'macro-kpi':      return <MacroWidget          size={size} goPage={goPage} inflacion={inflacion} riesgoPais={riesgoPais} indec={indec} bcra={bcra} />;
    case 'soja-usd':       return <TasasWidget          size={size} goPage={goPage} tasas={tasas} />;
    case 'dolar-agro':     return <DolarAgroWidget      size={size} goPage={goPage} dolares={dolares} />;
    case 'retenciones':    return <RetencionesWidget    size={size} goPage={goPage} />;
    case 'clima-agro':     return <ClimaWidget          size={size} goPage={goPage} />;
    case 'tasas-fin':      return <TasasWidget          size={size} goPage={goPage} tasas={tasas} />;
    case 'calcretenc':     return <CalcRetencWidget     goPage={goPage} dolares={dolares} />;
    case 'feriados':       return <FeriadosWidget       goPage={goPage} feriados={feriados} />;
    // Legacy
    case 'granos':         return <GranosPizarraWidget  size={size} goPage={goPage} />;
    case 'dolares':        return <DolarWidget          size={size} goPage={goPage} dolares={dolares} />;
    case 'macro':          return <MacroWidget          size={size} goPage={goPage} inflacion={inflacion} riesgoPais={riesgoPais} indec={indec} bcra={bcra} />;
    case 'clima':          return <ClimaWidget          size={size} goPage={goPage} />;
    case 'tasas':          return <TasasWidget          size={size} goPage={goPage} tasas={tasas} />;
    case 'bonos':          return <MacroWidget          size={size} goPage={goPage} inflacion={inflacion} riesgoPais={riesgoPais} indec={indec} bcra={bcra} />;
    default: return <div style={{ padding: '20px', color: 'var(--text3)' }}>Widget: {widgetId}</div>;
  }
}
