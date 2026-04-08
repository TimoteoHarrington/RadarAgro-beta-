// MundoPage.jsx — Precios Globales
// Datos via /api/mundo (proxy Yahoo Finance)
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { fetchMundoChart } from '../../services/api';

// ── Helpers ────────────────────────────────────────────────────
const fmtPrice = (v, group) => {
  if (v == null) return '—';
  if (group === 'Tasas')   return v.toFixed(3).replace('.', ',') + '%';
  if (group === 'Monedas') return v.toFixed(4).replace('.', ',');
  if (group === 'Crypto')  return v > 1000
    ? '$' + Math.round(v).toLocaleString('es-AR')
    : '$' + v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (group === 'Agro')    return 'u$s ' + v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '/t';
  return v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtChange = v => {
  if (v == null) return { txt: '—', cls: 'fl' };
  const txt = (v > 0 ? '+' : '') + v.toFixed(2).replace('.', ',') + '%';
  return { txt, cls: v > 0 ? 'up' : v < 0 ? 'dn' : 'fl' };
};

const GROUPS_ORDER = ['Agro', 'Índices', 'Energía', 'Metales', 'Monedas', 'Tasas', 'Crypto'];

const GROUP_COLOR = {
  Agro:    '#56c97a',
  Índices: '#4d9ef0',
  Energía: '#f0b840',
  Metales: '#e8a448',
  Monedas: '#9ab0c4',
  Tasas:   '#7c9abf',
  Crypto:  '#b07ef0',
};

// ── Mini Sparkline Canvas ───────────────────────────────────────
function Sparkline({ pts, change }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !pts || pts.length < 2) return;
    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const r   = canvas.getBoundingClientRect();
      canvas.width  = r.width  * dpr;
      canvas.height = r.height * dpr;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      const W = r.width, H = r.height;
      const mn = Math.min(...pts), mx = Math.max(...pts);
      const range = mx - mn || 1;
      const px = i => (i / (pts.length - 1)) * W;
      const py = v => H - ((v - mn) / range) * H * 0.85 - H * 0.05;
      const color = change > 0 ? '#56c97a' : change < 0 ? '#f07070' : '#6a8599';
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, color + '40');
      grad.addColorStop(1, color + '00');
      ctx.beginPath();
      ctx.moveTo(px(0), py(pts[0]));
      pts.forEach((v, i) => { if (i > 0) ctx.lineTo(px(i), py(v)); });
      ctx.lineTo(px(pts.length - 1), H);
      ctx.lineTo(px(0), H);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(px(0), py(pts[0]));
      pts.forEach((v, i) => { if (i > 0) ctx.lineTo(px(i), py(v)); });
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.lineJoin = 'round';
      ctx.lineCap  = 'round';
      ctx.stroke();
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [pts, change]);
  return <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block' }} />;
}

// ── Detail Chart (línea con timestamps) ────────────────────────
function DetailChart({ points }) {
  const ref      = useRef(null);
  const overlayRef = useRef(null);
  const [tooltip, setTooltip] = useState(null); // { x, y, val, time, idx }

  const LINE_COLOR  = 'rgba(154,176,196,0.9)';
  const FILL_START  = 'rgba(154,176,196,0.12)';
  const FILL_END    = 'rgba(154,176,196,0.00)';
  const PAD = { t: 20, r: 16, b: 32, l: 60 };

  // Dibuja el gráfico base (sin cursor)
  const draw = useCallback((canvas, hoverIdx = null) => {
    if (!canvas || !points || points.length < 2) return;
    const dpr = window.devicePixelRatio || 1;
    const r   = canvas.getBoundingClientRect();
    canvas.width  = r.width  * dpr;
    canvas.height = r.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    const W = r.width, H = r.height;
    const pad = PAD;
    const vals  = points.map(p => p.v);
    const mn    = Math.min(...vals) * 0.999;
    const mx    = Math.max(...vals) * 1.001;
    const rng   = mx - mn || 1;
    const n     = points.length;
    const pxi   = i => pad.l + (i / (n - 1)) * (W - pad.l - pad.r);
    const pyv   = v => H - pad.b - ((v - mn) / rng) * (H - pad.t - pad.b);

    // Grid horizontal
    for (let g = 0; g <= 3; g++) {
      const v = mn + (rng * g / 3);
      const y = pyv(v);
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 5]);
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(154,176,196,0.55)';
      ctx.font = '9px JetBrains Mono,monospace';
      ctx.textAlign = 'right';
      ctx.fillText(v.toLocaleString('es-AR', { maximumFractionDigits: 2 }), pad.l - 5, y + 3);
    }

    // X labels
    ctx.fillStyle = 'rgba(154,176,196,0.45)';
    ctx.font = '8px JetBrains Mono,monospace';
    ctx.textAlign = 'center';
    const ticks = [0, Math.floor(n * .25), Math.floor(n * .5), Math.floor(n * .75), n - 1];
    ticks.forEach(i => {
      const d   = new Date(points[i].t);
      const lbl = d.getMonth() + 1 + '/' + d.getDate() + ' ' + String(d.getHours()).padStart(2, '0') + 'h';
      ctx.fillText(lbl, pxi(i), H - pad.b + 12);
    });

    // Fill
    const grad = ctx.createLinearGradient(0, pad.t, 0, H - pad.b);
    grad.addColorStop(0, FILL_START);
    grad.addColorStop(1, FILL_END);
    ctx.beginPath();
    ctx.moveTo(pxi(0), pyv(vals[0]));
    vals.forEach((v, i) => { if (i > 0) ctx.lineTo(pxi(i), pyv(v)); });
    ctx.lineTo(pxi(n - 1), H - pad.b);
    ctx.lineTo(pxi(0), H - pad.b);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Línea
    ctx.beginPath();
    ctx.moveTo(pxi(0), pyv(vals[0]));
    vals.forEach((v, i) => { if (i > 0) ctx.lineTo(pxi(i), pyv(v)); });
    ctx.strokeStyle = LINE_COLOR;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.lineCap  = 'round';
    ctx.stroke();

    // Punto final
    const lv = vals[n - 1];
    ctx.beginPath();
    ctx.arc(pxi(n - 1), pyv(lv), 3, 0, Math.PI * 2);
    ctx.fillStyle = LINE_COLOR;
    ctx.fill();

    // Cursor interactivo
    if (hoverIdx !== null) {
      const hx = pxi(hoverIdx);
      const hy = pyv(vals[hoverIdx]);

      // Línea vertical
      ctx.beginPath();
      ctx.moveTo(hx, pad.t);
      ctx.lineTo(hx, H - pad.b);
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Punto de hover
      ctx.beginPath();
      ctx.arc(hx, hy, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(hx, hy, 3, 0, Math.PI * 2);
      ctx.fillStyle = LINE_COLOR;
      ctx.fill();
    }
  }, [points]);

  // Redibuja cuando cambian los puntos
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    draw(canvas, null);
    const ro = new ResizeObserver(() => draw(canvas, null));
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [points, draw]);

  const handleMouseMove = useCallback((e) => {
    const canvas = ref.current;
    if (!canvas || !points || points.length < 2) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const W = rect.width;
    const n = points.length;
    const chartW = W - PAD.l - PAD.r;
    const rawIdx = (mouseX - PAD.l) / chartW * (n - 1);
    const idx = Math.max(0, Math.min(n - 1, Math.round(rawIdx)));
    const pt  = points[idx];
    const val = pt.v;
    const d   = new Date(pt.t);
    const timeStr = d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }) +
                    ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + 'h';
    const x = PAD.l + (idx / (n - 1)) * chartW;
    setTooltip({ x, val, time: timeStr, idx });
    draw(canvas, idx);
  }, [points, draw]);

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
    draw(ref.current, null);
  }, [draw]);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <canvas
        ref={ref}
        style={{ width: '100%', height: '200px', display: 'block', cursor: 'crosshair' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
      {/* Tooltip flotante */}
      {tooltip && (
        <div style={{
          position: 'absolute',
          left: Math.min(tooltip.x + 12, 999),
          top: '12px',
          background: 'var(--bg2)',
          border: '1px solid var(--line2)',
          borderRadius: '6px',
          padding: '5px 10px',
          pointerEvents: 'none',
          fontFamily: 'var(--mono)',
          whiteSpace: 'nowrap',
          zIndex: 10,
        }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--white)' }}>
            {tooltip.val.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '9px', color: 'var(--text3)', marginTop: '1px' }}>{tooltip.time}</div>
        </div>
      )}
    </div>
  );
}

// ── Symbol Card ─────────────────────────────────────────────────
function SymbolCard({ item, onClick, isSelected, clickable = true }) {
  const chg   = fmtChange(item.change);
  const price = item.price != null ? fmtPrice(item.price, item.group) : 'S/D';
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="stat"
      onClick={clickable ? () => onClick(item) : undefined}
      onMouseEnter={clickable ? () => setHovered(true) : undefined}
      onMouseLeave={clickable ? () => setHovered(false) : undefined}
      style={{
        cursor: clickable ? 'pointer' : 'default',
        borderColor: isSelected ? 'var(--accent)' : hovered && clickable ? 'var(--line2)' : undefined,
        background: isSelected ? 'var(--bg2)' : undefined,
        transition: 'border-color .15s, background .15s',
        position: 'relative',
      }}
    >
      {/* Título */}
      <div style={{
        fontSize: '15px', fontWeight: 400, color: 'var(--text2)',
        marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      }}>
        <span>{item.name}</span>
        {/* Hint de gráfico — solo en modo clickeable y no seleccionado */}
        {clickable && !isSelected && (
          <span style={{
            fontFamily: 'var(--mono)', fontSize: '8px', color: 'var(--text3)',
            opacity: hovered ? 0.8 : 0.35,
            display: 'flex', alignItems: 'center', gap: '3px',
            transition: 'opacity .15s', flexShrink: 0, marginLeft: '6px', paddingTop: '1px',
          }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
            ver
          </span>
        )}
        {/* Badge GRAF cuando está seleccionado */}
        {isSelected && (
          <span style={{ fontFamily: 'var(--mono)', fontSize: '7px', background: 'var(--acc-bg)', color: 'var(--accent)', padding: '1px 5px', borderRadius: '3px', border: '1px solid rgba(91,156,246,.2)', flexShrink: 0, marginLeft: '6px' }}>
            GRAF ▾
          </span>
        )}
      </div>

      {/* Precio + variación en la misma línea */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
        <div className="stat-val" style={{ fontSize: '24px', marginBottom: 0 }}>
          {price}
        </div>
        {item.change != null ? (
          <span style={{
            fontFamily: 'var(--mono)', fontSize: '11px', fontWeight: 600,
            color:       chg.cls === 'up' ? 'var(--green)' : chg.cls === 'dn' ? 'var(--red)' : 'var(--text3)',
            background:  chg.cls === 'up' ? 'var(--green-bg)' : chg.cls === 'dn' ? 'var(--red-bg)' : 'transparent',
            padding:     chg.cls === 'fl' ? '0' : '2px 8px',
            borderRadius: '4px',
          }}>
            {chg.txt}
          </span>
        ) : (
          <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text3)' }}>—</span>
        )}
      </div>

      <div className="stat-meta">Yahoo Finance · futuros</div>
    </div>
  );
}

// ── Detail Panel ────────────────────────────────────────────────
function DetailPanel({ item, onClose, isDefault = false }) {
  const [range, setRange] = useState('5d');
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const color = 'rgba(154,176,196,0.85)';

  const loadChart = useCallback(async (r) => {
    setLoading(true);
    setChartData(null); // limpiar datos anteriores para evitar flash de contenido viejo/vacío
    const { data, error } = await fetchMundoChart(item.id, r);
    if (!error && data?.points) setChartData(data.points);
    setLoading(false);
  }, [item.id]);

  useEffect(() => { loadChart(range); }, [range, loadChart]);

  const RANGES = ['1d', '5d', '1mo', '3mo', '1y'];
  const RANGE_LABEL = { '1d': '1 día', '5d': '5 días', '1mo': '1 mes', '3mo': '3 meses', '1y': '1 año' };

  // Variación del período: en 1d usa item.change (vs cierre anterior, igual que la card)
  // En otros rangos calcula desde el primer al último punto del gráfico
  const rangeChg = (() => {
    let pct, abs;
    if (range === '1d' && item.change != null) {
      pct = item.change;
      // abs: estimamos desde precio actual
      abs = item.price != null ? item.price * pct / 100 : null;
    } else {
      if (!chartData || chartData.length < 2) return null;
      const first = chartData[0].v;
      const last  = chartData[chartData.length - 1].v;
      if (!first) return null;
      pct = ((last - first) / first) * 100;
      abs = last - first;
    }
    const sign = pct > 0 ? '+' : '';
    return {
      pct:   sign + pct.toFixed(2).replace('.', ',') + '%',
      abs:   abs != null ? sign + abs.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : null,
      up:    pct > 0,
      dn:    pct < 0,
      color: pct > 0 ? 'var(--green)' : pct < 0 ? 'var(--red)' : 'var(--text3)',
      bg:    pct > 0 ? 'var(--green-bg)' : pct < 0 ? 'var(--red-bg)' : 'transparent',
    };
  })();

  return (
    <div style={{
      background: 'var(--bg1)',
      border: '1px solid var(--line)',
      borderRadius: '12px',
      overflow: 'hidden',
      marginBottom: '24px',
    }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--display)', fontSize: '18px', fontWeight: 700, color: 'var(--white)' }}>
              {item.name}
            </span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '22px', fontWeight: 700, color: 'var(--white)' }}>
              {fmtPrice(item.price, item.group)}
            </span>
            {rangeChg && (
              <span style={{
                fontFamily: 'var(--mono)', fontSize: '13px', fontWeight: 700,
                color: rangeChg.color, background: rangeChg.bg,
                padding: '2px 8px', borderRadius: '4px',
              }}>
                {rangeChg.up ? '▲' : rangeChg.dn ? '▼' : ''} {rangeChg.pct}
              </span>
            )}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '3px', fontFamily: 'var(--mono)' }}>
            {item.group} · Yahoo Finance · Futuros
            {rangeChg && (
              <span style={{ marginLeft: '8px', color: rangeChg.color }}>
                · {rangeChg.abs} en {RANGE_LABEL[range]}
              </span>
            )}
          </div>
        </div>
        {!isDefault && onClose && (
          <button
            onClick={onClose}
            style={{ background: 'none', border: '1px solid var(--line)', borderRadius: '6px', color: 'var(--text3)', padding: '4px 10px', cursor: 'pointer', fontSize: '11px', fontFamily: 'var(--mono)' }}
          >
            cerrar ×
          </button>
        )}
        {isDefault && (
          <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--text3)', fontStyle: 'italic' }}>
            seleccioná una card para ver otro activo
          </span>
        )}
      </div>

      {/* Range selector + variación del período */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--line)', display: 'flex', gap: '6px', alignItems: 'center' }}>
        {RANGES.map(r => (
          <button key={r} onClick={() => setRange(r)} style={{
            background: range === r ? color + '20' : 'none',
            border: `1px solid ${range === r ? color + '60' : 'var(--line)'}`,
            borderRadius: '6px', color: range === r ? color : 'var(--text3)',
            padding: '4px 12px', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: '11px',
            transition: 'all .15s',
          }}>
            {r}
          </button>
        ))}
        {!loading && rangeChg && (
          <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: '12px', fontWeight: 700, color: rangeChg.color }}>
            {rangeChg.up ? '▲' : rangeChg.dn ? '▼' : ''} {rangeChg.pct}
            <span style={{ fontWeight: 400, fontSize: '10px', color: 'var(--text3)', marginLeft: '5px' }}>en {RANGE_LABEL[range]}</span>
          </span>
        )}
        {loading && (
          <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--text3)' }}>cargando…</span>
        )}
      </div>

      {/* Chart */}
      <div style={{ padding: '20px 20px 8px' }}>
        {loading
          ? <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: '11px' }}>
              Cargando…
            </div>
          : chartData?.length > 1
            ? <DetailChart points={chartData} />
            : <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: '11px' }}>
                Sin datos para el rango seleccionado
              </div>
        }
      </div>
      <div style={{ padding: '8px 20px 14px', textAlign: 'right' }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: '8px', color: 'var(--text3)' }}>
          Fuente: Yahoo Finance · Futuros · Datos con 15 min de demora
        </span>
      </div>
    </div>
  );
}

// ── Group Section ───────────────────────────────────────────────
function GroupSection({ group, items, selected, onSelect, clickable = true }) {
  const groupSelected = selected && items.find(i => i.id === selected.id) ? selected : null;

  return (
    <div className="section">
      <div className="section-title">
        {group}
      </div>
      <div className="grid grid-3">
        {items.map(item => (
          <SymbolCard
            key={item.id}
            item={item}
            onClick={onSelect}
            isSelected={selected?.id === item.id}
            clickable={clickable}
          />
        ))}
      </div>
      {/* Gráfico: solo si hay uno seleccionado. Si no, muestra hint */}
      {clickable && (
        <div style={{ marginTop: '16px' }}>
          {groupSelected ? (
            <DetailPanel
              key={groupSelected.id}
              item={groupSelected}
              onClose={() => onSelect(null)}
              isDefault={false}
            />
          ) : (
            <div style={{
              background: 'var(--bg1)',
              border: '1px dashed var(--line2)',
              borderRadius: '12px',
              padding: '22px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: 'var(--text3)',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.5 }}>
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
              <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '.08em', textTransform: 'uppercase' }}>
                Tocá un activo para ver su gráfico histórico
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────
export function MundoPage({ goPage, mundo, loadMundo }) {
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('Todos');

  // Carga bajo demanda: solo cuando se navega a esta página
  useEffect(() => {
    if (!mundo) loadMundo();
  }, [mundo, loadMundo]);

  const handleSelect = useCallback((item) => {
    setSelected(prev => prev?.id === item?.id ? null : item);
  }, []);

  const byGroup = mundo?.byGroup ?? {};
  const updated = mundo?.updated ? new Date(mundo.updated) : null;
  const updatedStr = updated
    ? updated.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + ' hs'
    : '—';

  const activeGroups = filter === 'Todos'
    ? GROUPS_ORDER.filter(g => byGroup[g])
    : GROUPS_ORDER.filter(g => g === filter && byGroup[g]);

  return (
    <div className="page-enter">
      {/* Header */}
      <div className="ph">
        <div>
          <div className="ph-title">
            Monitor Global
            <span className="help-pip" onClick={() => goPage('ayuda', 'glosario-mundo')} title="Ayuda">?</span>
          </div>
          <div className="ph-sub">Índices · Energía · Metales · Agro · Crypto · Monedas · Yahoo Finance</div>
        </div>
        <div className="ph-right" style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text3)', textAlign: 'right' }}>
          {mundo
            ? <><span style={{ color: 'var(--green)' }}>●</span> {updatedStr}</>
            : <span>cargando…</span>
          }
        </div>
      </div>

      {/* Filtro por grupo */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '24px' }}>
        {['Todos', ...GROUPS_ORDER].map(g => (
          <button key={g} onClick={() => { setFilter(g); setSelected(null); }} style={{
            background: filter === g ? 'var(--acc-bg)' : 'none',
            border: `1px solid ${filter === g ? 'var(--accent)' : 'var(--line)'}`,
            borderRadius: '20px',
            color: filter === g ? 'var(--accent)' : 'var(--text3)',
            padding: '5px 14px', cursor: 'pointer',
            fontFamily: 'var(--mono)', fontSize: '11px',
            transition: 'all .15s',
          }}>
            {g}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {!mundo && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: '16px' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '13px', color: 'var(--text3)' }}>
            Consultando Yahoo Finance…
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text3)', opacity: 0.6 }}>
            Puede tardar unos segundos
          </div>
        </div>
      )}

      {/* Grupos */}
      {activeGroups.map(group => (
        <GroupSection
          key={group}
          group={group}
          items={byGroup[group]}
          selected={selected}
          onSelect={handleSelect}
          clickable={filter !== 'Todos'}
        />
      ))}

      {/* Resumen global — solo en vista "Todos" */}
      {filter === 'Todos' && mundo && (
        <div className="section">
          <div className="section-title">Resumen del día</div>
          <div style={{ background: 'var(--bg1)', border: '1px solid var(--line)', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', padding: '16px 20px', gap: '16px', borderBottom: '1px solid var(--line)' }}>
              {(() => {
                const allItems = mundo.items.filter(i => i.change != null);
                const gainers = allItems.filter(i => i.change > 0).length;
                const losers  = allItems.filter(i => i.change < 0).length;
                const flat    = allItems.length - gainers - losers;
                const bestItem   = [...allItems].sort((a, b) => b.change - a.change)[0];
                const worstItem  = [...allItems].sort((a, b) => a.change - b.change)[0];
                return (
                  <>
                    <div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text3)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '8px' }}>Mercado hoy</div>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: '15px', fontWeight: 700, color: 'var(--green)' }}>↑ {gainers}</span>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: '15px', fontWeight: 700, color: 'var(--red)' }}>↓ {losers}</span>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: '13px', color: 'var(--text3)' }}>— {flat}</span>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text3)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '8px' }}>Mayor suba</div>
                      {bestItem && (
                        <div>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--white)' }}>{bestItem.name}</span>
                          <span style={{ fontFamily: 'var(--mono)', fontSize: '13px', color: 'var(--green)', marginLeft: '8px' }}>
                            +{bestItem.change.toFixed(2).replace('.', ',')}%
                          </span>
                        </div>
                      )}
                    </div>
                    <div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text3)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '8px' }}>Mayor baja</div>
                      {worstItem && (
                        <div>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--white)' }}>{worstItem.name}</span>
                          <span style={{ fontFamily: 'var(--mono)', fontSize: '13px', color: 'var(--red)', marginLeft: '8px' }}>
                            {worstItem.change.toFixed(2).replace('.', ',')}%
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
            <div style={{ padding: '8px 20px', background: 'var(--bg2)' }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: '8px', color: 'var(--text3)' }}>
                Fuente: Yahoo Finance · Futuros · Datos con hasta 15 min de demora · Seleccioná un grupo para ver gráficos
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
