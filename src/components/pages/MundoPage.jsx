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
function DetailChart({ points, color }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !points || points.length < 2) return;
    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const r   = canvas.getBoundingClientRect();
      canvas.width  = r.width  * dpr;
      canvas.height = r.height * dpr;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      const W = r.width, H = r.height;
      const pad = { t: 20, r: 16, b: 32, l: 60 };
      const vals = points.map(p => p.v);
      const times = points.map(p => p.t);
      const mn = Math.min(...vals) * 0.999;
      const mx = Math.max(...vals) * 1.001;
      const range = mx - mn || 1;
      const n = points.length;
      const px = i => pad.l + (i / (n - 1)) * (W - pad.l - pad.r);
      const py = v => H - pad.b - ((v - mn) / range) * (H - pad.t - pad.b);

      // Grid
      for (let g = 0; g <= 3; g++) {
        const v = mn + (range * g / 3);
        const y = py(v);
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 5]);
        ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(154,176,196,0.6)';
        ctx.font = '9px JetBrains Mono,monospace';
        ctx.textAlign = 'right';
        ctx.fillText(v.toLocaleString('es-AR', { maximumFractionDigits: 2 }), pad.l - 5, y + 3);
      }

      // X labels (5 ticks)
      ctx.fillStyle = 'rgba(154,176,196,0.5)';
      ctx.font = '8px JetBrains Mono,monospace';
      ctx.textAlign = 'center';
      const ticks = [0, Math.floor(n * .25), Math.floor(n * .5), Math.floor(n * .75), n - 1];
      ticks.forEach(i => {
        const d = new Date(times[i]);
        const lbl = d.getMonth() + 1 + '/' + d.getDate() + ' ' + String(d.getHours()).padStart(2, '0') + 'h';
        ctx.fillText(lbl, px(i), H - pad.b + 12);
      });

      // Fill
      const grad = ctx.createLinearGradient(0, pad.t, 0, H - pad.b);
      grad.addColorStop(0, color + '30');
      grad.addColorStop(1, color + '00');
      ctx.beginPath();
      ctx.moveTo(px(0), py(vals[0]));
      vals.forEach((v, i) => { if (i > 0) ctx.lineTo(px(i), py(v)); });
      ctx.lineTo(px(n - 1), H - pad.b);
      ctx.lineTo(px(0), H - pad.b);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // Line
      ctx.beginPath();
      ctx.moveTo(px(0), py(vals[0]));
      vals.forEach((v, i) => { if (i > 0) ctx.lineTo(px(i), py(v)); });
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.lineCap  = 'round';
      ctx.stroke();

      // Last dot
      const lv = vals[n - 1];
      ctx.shadowColor = color; ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(px(n - 1), py(lv), 4, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
      ctx.shadowBlur = 0;
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [points, color]);
  return <canvas ref={ref} style={{ width: '100%', height: '200px', display: 'block', cursor: 'crosshair' }} />;
}

// ── Symbol Card ─────────────────────────────────────────────────
function SymbolCard({ item, onClick, isSelected }) {
  const chg = fmtChange(item.change);
  const color = GROUP_COLOR[item.group] || 'var(--accent)';
  return (
    <div
      onClick={() => onClick(item)}
      style={{
        background: isSelected ? 'var(--bg2)' : 'var(--bg1)',
        border: `1px solid ${isSelected ? color + '60' : 'var(--line)'}`,
        borderRadius: '10px',
        padding: '14px 16px',
        cursor: 'pointer',
        transition: 'border-color .15s, background .15s',
      }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = 'var(--line2)'; }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = 'var(--line)'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'var(--mono)', marginBottom: '3px' }}>
            {item.name}
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '16px', fontWeight: 700, color: 'var(--white)' }}>
            {item.price != null ? fmtPrice(item.price, item.group) : 'S/D'}
          </div>
        </div>
        <span style={{
          fontFamily: 'var(--mono)', fontSize: '11px', fontWeight: 700,
          color: chg.cls === 'up' ? 'var(--green)' : chg.cls === 'dn' ? 'var(--red)' : 'var(--text3)',
        }}>
          {chg.txt}
        </span>
      </div>
      <div style={{ height: '36px' }}>
        {item.sparkline?.length > 1
          ? <Sparkline pts={item.sparkline} change={item.change} />
          : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text3)' }}>sin datos</span>
            </div>
        }
      </div>
    </div>
  );
}

// ── Detail Panel ────────────────────────────────────────────────
function DetailPanel({ item, onClose }) {
  const [range, setRange] = useState('5d');
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const color = GROUP_COLOR[item.group] || '#4d9ef0';
  const chg = fmtChange(item.change);

  const loadChart = useCallback(async (r) => {
    setLoading(true);
    const { data, error } = await fetchMundoChart(item.id, r);
    if (!error && data?.points) setChartData(data.points);
    setLoading(false);
  }, [item.id]);

  useEffect(() => { loadChart(range); }, [range, loadChart]);

  const RANGES = ['1d', '5d', '1mo', '3mo', '1y'];

  return (
    <div style={{
      background: 'var(--bg1)',
      border: `1px solid ${color}40`,
      borderRadius: '12px',
      overflow: 'hidden',
      marginBottom: '24px',
    }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
            <span style={{ fontFamily: 'var(--display)', fontSize: '18px', fontWeight: 700, color: 'var(--white)' }}>
              {item.name}
            </span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '22px', fontWeight: 700, color: 'var(--white)' }}>
              {fmtPrice(item.price, item.group)}
            </span>
            <span style={{
              fontFamily: 'var(--mono)', fontSize: '14px', fontWeight: 700,
              color: chg.cls === 'up' ? 'var(--green)' : chg.cls === 'dn' ? 'var(--red)' : 'var(--text3)',
            }}>
              {chg.txt}
            </span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '3px', fontFamily: 'var(--mono)' }}>
            {item.group} · Yahoo Finance · Futuros
          </div>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: '1px solid var(--line)', borderRadius: '6px', color: 'var(--text3)', padding: '4px 10px', cursor: 'pointer', fontSize: '11px', fontFamily: 'var(--mono)' }}
        >
          cerrar ×
        </button>
      </div>

      {/* Range selector */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--line)', display: 'flex', gap: '6px' }}>
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
      </div>

      {/* Chart */}
      <div style={{ padding: '20px 20px 8px' }}>
        {loading
          ? <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: '11px' }}>
              Cargando…
            </div>
          : chartData?.length > 1
            ? <DetailChart points={chartData} color={color} />
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
function GroupSection({ group, items, selected, onSelect }) {
  const color = GROUP_COLOR[group] || 'var(--accent)';
  return (
    <div className="section">
      <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
        {group}
      </div>
      <div className="grid grid-3">
        {items.map(item => (
          <SymbolCard
            key={item.id}
            item={item}
            onClick={onSelect}
            isSelected={selected?.id === item.id}
          />
        ))}
      </div>
      {selected && items.find(i => i.id === selected.id) && (
        <div style={{ marginTop: '16px' }}>
          <DetailPanel item={selected} onClose={() => onSelect(null)} />
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
            background: filter === g ? (GROUP_COLOR[g] ? GROUP_COLOR[g] + '20' : 'var(--acc-bg)') : 'none',
            border: `1px solid ${filter === g ? (GROUP_COLOR[g] || 'var(--accent)') + '50' : 'var(--line)'}`,
            borderRadius: '20px',
            color: filter === g ? (GROUP_COLOR[g] || 'var(--accent)') : 'var(--text3)',
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
                Fuente: Yahoo Finance · Futuros · Datos con hasta 15 min de demora · Clic en cualquier activo para ver gráfico histórico
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
