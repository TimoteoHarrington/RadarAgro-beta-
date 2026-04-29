import React, { useState, useEffect, useRef, useCallback } from 'react';
import { fetchInsumosAll, fetchFertilizantes } from '../../services/api';

// Genera dinámicamente los últimos 12 meses (ej. termina en 'Abr' si estamos en Abril)
const HIST_MESES = (() => {
  const nombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const hoy = new Date();
  const meses = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    meses.push(nombres[d.getMonth()]);
  }
  return meses;
})();

// ── Color único — igual que gráficos de granos (MundoPage) ──────────────────
const CHART_COLOR = 'rgba(91,156,246,0.85)';  // azul accent — igual que resto del sistema
const CHART_FILL  = 'rgba(91,156,246,0.10)';

// ── Helpers ───────────────────────────────────────────────────

const fmtARS = v => v == null ? '—' : '$\u00a0' + v.toLocaleString('es-AR');
const fmtUSD = v => v == null ? '—' : 'USD\u00a0' + v.toLocaleString('es-AR');
const fmtPct = v => v === 0 ? '= 0%' : (v > 0 ? '+' : '') + v.toFixed(1) + '%';
const dir    = v => v > 0 ? 'up' : v < 0 ? 'dn' : 'fl';

function Pill({ d, children }) {
  return <span className={`pill ${d}`}>{children}</span>;
}

function Spark({ data, color }) {
  if (!data || data.length < 2) return null;
  const min  = Math.min(...data);
  const max  = Math.max(...data);
  const range = max - min || 1;
  const W = 80, H = 32;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * W},${H - ((v - min) / range) * H}`)
    .join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: 64, height: 28, display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ── Tab: Fertilizantes ────────────────────────────────────────

// Badge de fuente — muestra de dónde viene el dato
function FuenteBadge({ fuente }) {
  const cfg = {
    agrofy:      { label: 'AGROFY · EN VIVO',         color: 'var(--green)',  bg: 'rgba(70,185,110,.12)' },
    bcr:         { label: 'BCR · EN VIVO',             color: 'var(--green)',  bg: 'rgba(70,185,110,.12)' },
    indexmundi:  { label: 'WORLD BANK · MENSUAL',      color: 'var(--accent)', bg: 'rgba(91,156,246,.12)' },
  };
  const c = cfg[fuente] ?? { label: 'EN VIVO', color: 'var(--green)', bg: 'rgba(70,185,110,.12)' };
  return (
    <span style={{
      fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700,
      color: c.color, background: c.bg,
      border: `1px solid ${c.color}33`,
      padding: '2px 10px', borderRadius: 5, letterSpacing: '.06em',
    }}>
      {c.label}
    </span>
  );
}

function TabFertilizantes() {
  const [fertilizantes, setFertilizantes] = useState([]);
  const [fuente,        setFuente]        = useState(null);
  const [dolarMay,      setDolarMay]      = useState(null);
  const [fecha,         setFecha]         = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [selectedId,    setSelectedId]    = useState(null);

  const doFetch = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchFertilizantes()
      .then(({ data, error: e }) => {
        if (e || !data?.productos?.length) {
          setError(e || 'Sin datos de fertilizantes');
          setLoading(false);
          return;
        }
        setFertilizantes(data.productos);
        setFuente(data.fuente);
        setDolarMay(data.dolarMayorista);
        setFecha(data.timestamp ? data.timestamp.slice(0, 10) : null);
        setLoading(false);
      })
      .catch(err => { setError(err?.message ?? 'Error de red'); setLoading(false); });
  }, []);

  useEffect(() => { doFetch(); }, [doFetch]);

  const activeF = fertilizantes.find(f => f.id === selectedId) ?? null;
  const activeCard = activeF ? {
    histKey:    activeF.id,
    nombre:     activeF.nombre,
    ambito:     'FOB Internacional',
    unidad:     activeF.ars ? 'ARS/tn' : 'USD/tn',
    color:      CHART_COLOR,
    valor:      activeF.ars ?? activeF.usd,
    fuente:     'IndexMundi · World Bank Pink Sheet',
    fecha:      activeF.fecha ?? fecha,
    // datos reales del historial — el chart los usa directamente si están presentes
    histData:   activeF.hist?.length ? activeF.hist : null,
    histLabels: activeF.histFechas?.length ? activeF.histFechas : null,
    estimado:   activeF.estimado ?? false,
  } : null;

  // ── Loading ──
  if (loading) {
    return (
      <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: 11 }}>
        Consultando precios de fertilizantes…
      </div>
    );
  }

  // ── Error ──
  if (error || !fertilizantes.length) {
    return (
      <div style={{ padding: '32px 20px', textAlign: 'center', background: 'var(--bg1)', border: '1px solid var(--line)', borderRadius: 12 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--red)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 10 }}>
          Error al cargar fertilizantes
        </div>
        <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 20 }}>
          {error || 'Sin datos disponibles'}
        </div>
        <button onClick={doFetch} style={{ fontFamily: 'var(--mono)', fontSize: 10, padding: '8px 20px', borderRadius: 6, border: '1px solid var(--accent)', background: 'var(--acc-bg)', color: 'var(--accent)', cursor: 'pointer' }}>
          Reintentar
        </button>
      </div>
    );
  }

  // ── Datos OK ──
  return (
    <div>
      {/* Header fuente */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, padding: '10px 16px', background: 'var(--bg1)', border: '1px solid var(--line)', borderRadius: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Fuente</span>
          <FuenteBadge fuente={fuente} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {dolarMay && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)' }}>
              USD may. <span style={{ color: 'var(--text)', fontWeight: 600 }}>${Math.round(dolarMay).toLocaleString('es-AR')}</span>
            </span>
          )}
          {fecha && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, color: 'var(--accent)', background: 'var(--acc-bg)', border: '1px solid rgba(91,156,246,.22)', padding: '2px 10px', borderRadius: 5 }}>
              {fecha}
            </span>
          )}
        </div>
      </div>

      {/* Cards seleccionables */}
      <div className="grid grid-4" style={{ marginBottom: 0 }}>
        {fertilizantes.map(f => {
          const d = dir(f.varPct ?? 0);
          const varTxt = f.varPct != null
            ? (f.varPct > 0 ? '+' : '') + f.varPct.toFixed(1).replace('.', ',') + '%'
            : '—';
          const isSelected = selectedId === f.id;
          const color = CHART_COLOR;
          return (
            <div key={f.id} className="stat"
              onClick={() => setSelectedId(isSelected ? null : f.id)}
              style={{ cursor: 'pointer', borderColor: isSelected ? color : '', transition: 'border-color .15s' }}
              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = 'var(--line2)'; }}
              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = ''; }}>

              <div className="stat-label">
                <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0, display: 'inline-block' }} />
                  {f.nombre}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  {isSelected && (
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 7, background: 'var(--acc-bg)', color: 'var(--accent)', padding: '1px 5px', borderRadius: 3, border: '1px solid rgba(91,156,246,.2)' }}>
                      GRAF ▾
                    </span>
                  )}
                  {f.varPct != null && <span className={`stat-badge ${d}`}>{varTxt}</span>}
                </span>
              </div>

              <div className="stat-val">{fmtARS(f.ars)}</div>
              {f.deltaArs && f.deltaArs !== 0 ? (
                <div className={`stat-delta ${d}`}>
                  {d === 'up' ? '▲' : '▼'} {fmtARS(Math.abs(f.deltaArs))} vs sem. ant.
                </div>
              ) : (
                <div className="stat-delta fl">— Sin cambios esta semana</div>
              )}

              {/* USD si disponible */}
              {f.usd ? (
                <div className="stat-meta" style={{ marginTop: 6 }}>
                  {fmtUSD(f.usd)}/tn · <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)' }}>{f.formula}</span>
                </div>
              ) : (
                <div className="stat-meta" style={{ marginTop: 6 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)' }}>{f.formula}</span>
                </div>
              )}
              <div className="stat-meta">{f.uso}</div>
            </div>
          );
        })}
      </div>

      {/* Gráfico historial o placeholder */}
      {activeCard
        ? <InsumosHistorialChart card={activeCard} onClose={() => setSelectedId(null)} />
        : (
          <div style={{ marginTop: 16, background: 'var(--bg1)', border: '1px dashed var(--line2)', borderRadius: 12, padding: '28px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text3)' }}>
              Seleccioná un fertilizante para ver el histórico
            </span>
          </div>
        )
      }

      {/* Tabla detalle */}
      <div className="section-title" style={{ marginTop: 28 }}>Detalle · FOB internacional · USD/tn → ARS/tn (dólar mayorista)</div>
      <div className="tbl-wrap" style={{ marginBottom: 28 }}>
        <div className="tbl-scroll">
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Fórmula</th>
                <th className="r">ARS/tn</th>
                <th className="r">USD/tn</th>
                <th className="r">Var. %</th>
                <th className="r">Tendencia 12m</th>
                <th>Uso principal</th>
              </tr>
            </thead>
            <tbody>
              {fertilizantes.map(f => {
                const d = dir(f.varPct ?? 0);
                return (
                  <tr key={f.id}
                    style={{ cursor: 'pointer', opacity: selectedId && selectedId !== f.id ? 0.6 : 1, transition: 'opacity .15s' }}
                    onClick={() => setSelectedId(selectedId === f.id ? null : f.id)}>
                    <td className="bold" style={{ color: 'var(--white)' }}>{f.nombre}</td>
                    <td className="dim mono" style={{ fontSize: 11 }}>{f.formula}</td>
                    <td className="r w mono">{fmtARS(f.ars)}</td>
                    <td className="r mono">{f.usd ? fmtUSD(f.usd) : '—'}</td>
                    <td className="r">
                      {f.varPct != null ? <Pill d={d}>{fmtPct(f.varPct)}</Pill> : <span className="dim">—</span>}
                    </td>
                    <td className="r">
                      <Spark data={f.hist} color={CHART_COLOR} />
                    </td>
                    <td className="dim" style={{ fontSize: 11 }}>{f.nota}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="source">
        Fuente: IndexMundi · World Bank Pink Sheet (FOB internacional, USD/tn · conversión dólar mayorista)
        {fertilizantes.some(f => f.estimado) && ' · MAP y UAN estimados por correlación'}
      </div>
    </div>
  );
}

// ── Canvas chart de historial (estética MacroPage) ────────────

const MESES_C = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function InsumosHistorialChart({ card, onClose }) {
  const canvasRef  = useRef(null);
  const [tooltip, setTooltip] = useState(null); // { x, val, label }
  const [range, setRange]     = useState('MAX');

  // ── datos base ──────────────────────────────────────────────
  const HIST_DATA_COMBUSTIBLES = {
    'g2-nucleo': [1325, 1397, 1463, 1531, 1576, 1654, 1749, 1783, 1812, 2042, 2306, null],
    'g3-nucleo': [1506, 1585, 1664, 1736, 1780, 1865, 1949, 1973, 2027, 2250, 2498, null],
    'ns-nucleo': [1310, 1375, 1444, 1510, 1549, 1635, 1723, 1722, 1729, 1929, 2125, null],
    'np-nucleo': [1536, 1621, 1699, 1782, 1824, 1910, 1992, 1980, 1995, 2179, 2354, null],
    'g2-pais':   [1327, 1399, 1468, 1535, 1579, 1658, 1753, 1786, 1813, 2040, 2302, null],
    'g3-pais':   [1510, 1591, 1671, 1745, 1788, 1870, 1954, 1975, 2028, 2252, 2494, null],
    'ns-pais':   [1285, 1349, 1422, 1489, 1520, 1614, 1702, 1695, 1706, 1910, 2109, null],
    'np-pais':   [1511, 1596, 1679, 1762, 1795, 1889, 1970, 1953, 1976, 2163, 2344, null],
  };

  const rawVals = card?.histData
    ? card.histData
    : (HIST_DATA_COMBUSTIBLES[card?.histKey] ?? []);

  const rawLabels = card?.histLabels?.length
    ? card.histLabels
    : HIST_MESES.slice(HIST_MESES.length - rawVals.length);

  const allVals   = rawVals.map(v => v == null && card?.valor != null ? card.valor : v).filter(v => v != null);
  const allLabels = rawLabels.slice(rawLabels.length - allVals.length);

  const sliceCount = range === '3M' ? 3 : range === '6M' ? 6 : range === '1A' ? 12 : allVals.length;
  const series = allVals.slice(-sliceCount);
  const labels = allLabels.slice(-sliceCount);
  const n = series.length;

  // ── variación del período ────────────────────────────────────
  const rangeChg = (() => {
    if (series.length < 2) return null;
    const first = series[0], last = series[series.length - 1];
    if (!first) return null;
    const pct = ((last - first) / first) * 100;
    const abs = last - first;
    const sign = pct > 0 ? '+' : '';
    return {
      pct:   sign + pct.toFixed(1).replace('.', ',') + '%',
      abs:   (abs > 0 ? '+' : '') + Math.round(abs).toLocaleString('es-AR'),
      color: pct > 0 ? 'var(--green)' : pct < 0 ? 'var(--red)' : 'var(--text3)',
      up: pct > 0, dn: pct < 0,
    };
  })();

  const RANGE_LABEL = { '3M': '3 meses', '6M': '6 meses', '1A': '1 año', 'MAX': 'máx. disponible' };

  // ── canvas draw ──────────────────────────────────────────────
  // Usa las constantes globales del módulo
  const LINE_COLOR = CHART_COLOR;
  const FILL_START = CHART_FILL;
  const FILL_END   = 'rgba(91,156,246,0.00)';
  const PAD = { t: 20, r: 18, b: 32, l: 70 };

  const draw = useCallback((canvas, hoverIdx = null) => {
    if (!canvas || series.length < 2) return;
    const dpr  = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width  = rect.width  * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    const W = rect.width, H = rect.height;
    const vals = series.map(Number);
    const mn   = Math.min(...vals) * 0.997;
    const mx   = Math.max(...vals) * 1.003;
    const rng  = mx - mn || 1;
    const pxi  = i => PAD.l + (i / (n - 1)) * (W - PAD.l - PAD.r);
    const pyv  = v => H - PAD.b - ((v - mn) / rng) * (H - PAD.t - PAD.b);

    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const gridClr  = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    const lblColor = isDark ? 'rgba(154,176,196,0.55)' : 'rgba(90,110,130,0.65)';

    // Grid horizontal
    for (let g = 0; g <= 3; g++) {
      const v = mn + (rng * g / 3);
      const y = pyv(v);
      ctx.strokeStyle = gridClr;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 5]);
      ctx.beginPath(); ctx.moveTo(PAD.l, y); ctx.lineTo(W - PAD.r, y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = lblColor;
      ctx.font = '9px JetBrains Mono,monospace';
      ctx.textAlign = 'right';
      ctx.fillText('$ ' + Math.round(v).toLocaleString('es-AR'), PAD.l - 5, y + 3);
    }

    // Eje X — mostrar hasta 6 etiquetas bien espaciadas
    ctx.fillStyle = lblColor;
    ctx.font = '8px JetBrains Mono,monospace';
    ctx.textAlign = 'center';
    const ticks = n <= 6
      ? Array.from({ length: n }, (_, i) => i)
      : [0, Math.floor(n * .2), Math.floor(n * .4), Math.floor(n * .6), Math.floor(n * .8), n - 1];
    ticks.forEach(i => ctx.fillText(labels[i] ?? '', pxi(i), H - PAD.b + 12));

    // Fill
    const grad = ctx.createLinearGradient(0, PAD.t, 0, H - PAD.b);
    grad.addColorStop(0, FILL_START);
    grad.addColorStop(1, FILL_END);
    ctx.beginPath();
    ctx.moveTo(pxi(0), pyv(vals[0]));
    vals.forEach((v, i) => { if (i > 0) ctx.lineTo(pxi(i), pyv(v)); });
    ctx.lineTo(pxi(n - 1), H - PAD.b);
    ctx.lineTo(pxi(0), H - PAD.b);
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
    ctx.beginPath();
    ctx.arc(pxi(n - 1), pyv(vals[n - 1]), 3, 0, Math.PI * 2);
    ctx.fillStyle = LINE_COLOR;
    ctx.fill();

    // Cursor hover
    if (hoverIdx !== null) {
      const hx = pxi(hoverIdx);
      const hy = pyv(vals[hoverIdx]);
      ctx.beginPath();
      ctx.moveTo(hx, PAD.t);
      ctx.lineTo(hx, H - PAD.b);
      ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(hx, hy, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = isDark ? 'rgba(20,22,35,1)' : 'rgba(255,255,255,1)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(hx, hy, 3, 0, Math.PI * 2);
      ctx.fillStyle = LINE_COLOR;
      ctx.fill();
    }
  }, [series, labels, n]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    draw(canvas, null);
    const ro = new ResizeObserver(() => draw(canvas, null));
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [draw]);

  const handleMouseMove = useCallback(e => {
    const canvas = canvasRef.current;
    if (!canvas || n < 2) return;
    const rect   = canvas.getBoundingClientRect();
    const chartW = rect.width - PAD.l - PAD.r;
    const rawIdx = (e.clientX - rect.left - PAD.l) / chartW * (n - 1);
    const idx    = Math.max(0, Math.min(n - 1, Math.round(rawIdx)));
    const x      = PAD.l + (idx / (n - 1)) * chartW;
    setTooltip({ x, val: series[idx], label: labels[idx] ?? '' });
    draw(canvas, idx);
  }, [series, labels, n, draw]);

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
    draw(canvasRef.current, null);
  }, [draw]);

  if (!card) return null;

  return (
    <div style={{
      background: 'var(--bg1)',
      border: '1px solid var(--line)',
      borderRadius: 12,
      overflow: 'hidden',
      marginTop: 16,
    }}>
      {/* Header — igual a DetailPanel de MundoPage */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--display)', fontSize: 16, fontWeight: 700, color: 'var(--white)' }}>
              {card.nombre}
            </span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 700, color: 'var(--white)' }}>
              {'$ '}{card.valor != null ? Math.round(card.valor).toLocaleString('es-AR') : '—'}
            </span>
            {rangeChg && (
              <span style={{
                fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700,
                color: rangeChg.color,
                padding: '2px 7px', borderRadius: 4,
                background: rangeChg.up ? 'var(--green-bg)' : rangeChg.dn ? 'var(--red-bg)' : 'transparent',
              }}>
                {rangeChg.up ? '▲' : rangeChg.dn ? '▼' : ''} {rangeChg.pct}
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3, fontFamily: 'var(--mono)' }}>
            {card.ambito} · {card.fuente ?? 'IndexMundi'}
            {rangeChg && (
              <span style={{ marginLeft: 8, color: rangeChg.color }}>
                · {rangeChg.abs} en {RANGE_LABEL[range]}
              </span>
            )}
            {card.estimado && (
              <span style={{ marginLeft: 8, color: 'var(--text3)', fontStyle: 'italic' }}>· estimado</span>
            )}
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{ background: 'none', border: '1px solid var(--line)', borderRadius: 6, color: 'var(--text3)', padding: '4px 10px', cursor: 'pointer', fontSize: 11, fontFamily: 'var(--mono)' }}
          >
            cerrar ×
          </button>
        )}
      </div>

      {/* Range selector */}
      <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 6, alignItems: 'center' }}>
        {['3M', '6M', '1A', 'MAX'].map(r => (
          <button key={r} onClick={() => setRange(r)} style={{
            background: range === r ? 'var(--acc-bg)' : 'none',
            border: `1px solid ${range === r ? 'var(--accent)' : 'var(--line)'}`,
            borderRadius: 6, color: range === r ? 'var(--accent)' : 'var(--text3)',
            padding: '4px 12px', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 11,
            transition: 'all .15s',
          }}>
            {r}
          </button>
        ))}
        {rangeChg && (
          <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: rangeChg.color }}>
            {rangeChg.up ? '▲' : rangeChg.dn ? '▼' : ''} {rangeChg.pct}
            <span style={{ fontWeight: 400, fontSize: 10, color: 'var(--text3)', marginLeft: 5 }}>en {RANGE_LABEL[range]}</span>
          </span>
        )}
      </div>

      {/* Chart */}
      <div style={{ padding: '20px 20px 4px', position: 'relative' }}>
        {series.length < 2
          ? <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: 11 }}>Sin datos</div>
          : <>
              <canvas
                ref={canvasRef}
                style={{ width: '100%', height: '200px', display: 'block', cursor: 'crosshair' }}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              />
              {tooltip && (() => {
                // Si el cursor está en el 60% derecho del chart → mostrar tooltip a la izquierda
                const canvasW = canvasRef.current?.getBoundingClientRect().width ?? 600;
                const flipLeft = (tooltip.x + PAD.l) > canvasW * 0.55;
                return (
                <div style={{
                  position: 'absolute',
                  ...(flipLeft
                    ? { right: `calc(100% - ${tooltip.x + PAD.l - 10}px)` }
                    : { left: tooltip.x + PAD.l + 10 }),
                  top: 24,
                  background: 'var(--bg2)',
                  border: '1px solid var(--line2)',
                  borderRadius: 6,
                  padding: '5px 10px',
                  pointerEvents: 'none',
                  fontFamily: 'var(--mono)',
                  whiteSpace: 'nowrap',
                  zIndex: 10,
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--white)' }}>
                    {'$ '}{Math.round(tooltip.val).toLocaleString('es-AR')}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 1 }}>{tooltip.label}</div>
                </div>
                );
              })()}
            </>
        }
      </div>

      {/* Footer fuente */}
      <div style={{ padding: '4px 20px 12px', textAlign: 'right' }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--text3)' }}>
          {card.fuente ?? 'IndexMundi · World Bank Pink Sheet'}{card.unidad ? ' · ' + card.unidad : ''}
          {card.fecha ? ' · último dato: ' + card.fecha : ''}
        </span>
      </div>
    </div>
  );
}

// ── Tab: Combustibles ─────────────────────────────────────────

function TabCombustibles({ prefetch = {} }) {
  const [data,    setData]    = useState(prefetch.data?.gasoil ? prefetch.data : null);
  const [loading, setLoading] = useState(!(prefetch.ready && prefetch.data?.gasoil));
  // FIX 10: Agregar estado de error — antes se quedaba cargando para siempre si la API fallaba.
  const [error,   setError]   = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);

  const doFetch = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchInsumosAll()
      .then(({ data: d, error: e }) => {
        if (e || !d?.gasoil) {
          setError(e || 'La API no devolvió datos de combustibles');
          setLoading(false);
          return;
        }
        setData(d);
        setLoading(false);
      })
      .catch(err => {
        setError(err?.message || 'Error de red');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (prefetch.ready) {
      if (prefetch.data?.gasoil) {
        setData(prefetch.data);
        setLoading(false);
      } else if (prefetch.ready) {
        // El prefetch terminó pero no tiene datos válidos — intentar fetch propio
        doFetch();
      }
      return;
    }
    doFetch();
  }, [prefetch.ready, prefetch.data, doFetch]);

  const fmt  = v => v == null ? '—' : '$\u00a0' + v.toLocaleString('es-AR');
  const fmtN = v => v == null ? '—' : v.toLocaleString('es-AR');

  // FIX 10b: Mostrar error con botón de reintento en vez de quedarse cargando para siempre
  if (loading) {
    return (
      <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: 11 }}>
        Consultando Secretaría de Energía…
      </div>
    );
  }

  if (error || !data?.gasoil) {
    return (
      <div style={{ padding: '32px 20px', textAlign: 'center', background: 'var(--bg1)', border: '1px solid var(--line)', borderRadius: 12 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--red)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 10 }}>
          Error al cargar datos de combustibles
        </div>
        <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 20, maxWidth: 400, margin: '0 auto 20px' }}>
          {error || 'No se pudieron obtener los datos de la Secretaría de Energía.'}<br />
          <span style={{ color: 'var(--text3)', fontSize: 10 }}>Fuente: datos.energia.gob.ar · Res. 314/2016</span>
        </div>
        <button
          onClick={doFetch}
          style={{
            fontFamily: 'var(--mono)', fontSize: 10, padding: '8px 20px', borderRadius: 6,
            border: '1px solid var(--accent)', background: 'var(--acc-bg)',
            color: 'var(--accent)', cursor: 'pointer', letterSpacing: '.06em',
          }}>
          Reintentar
        </button>
      </div>
    );
  }

  const { gasoil, nafta, fuente, fecha, stale } = data;
  const g2  = gasoil?.g2;
  const g3  = gasoil?.g3;
  const ns  = nafta?.super;
  const np  = nafta?.premium;
  const gnc = nafta?.gnc;

  const fechaInforme = fecha
    ? new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null;

  const cards = [
    {
      id: 'g2-nucleo', histKey: 'g2-nucleo',
      nombre: 'Gasoil G2', subtitulo: '92% consumo agro', ambito: 'Zona Núcleo',
      color: 'rgba(91,156,246,0.85)', unidad: 'ARS/L',
      valor: g2?.nucleo?.promedio,
      pais: g2?.pais?.promedio,
      paisDelta: g2?.pais?.promedio != null && g2?.nucleo?.promedio != null ? g2.pais.promedio - g2.nucleo.promedio : null,
      n: g2?.nucleo?.n,
      fuente, fecha: fechaInforme,
    },
    {
      id: 'g3-nucleo', histKey: 'g3-nucleo',
      nombre: 'Gasoil G3', subtitulo: 'Premium · Euro V', ambito: 'Zona Núcleo',
      color: 'rgba(77,158,240,0.85)', unidad: 'ARS/L',
      valor: g3?.nucleo?.promedio,
      pais: g3?.pais?.promedio,
      paisDelta: g3?.pais?.promedio != null && g3?.nucleo?.promedio != null ? g3.pais.promedio - g3.nucleo.promedio : null,
      n: g3?.nucleo?.n,
      fuente, fecha: fechaInforme,
    },
    {
      id: 'ns-nucleo', histKey: 'ns-nucleo',
      nombre: 'Nafta Súper', subtitulo: '92–95 RON', ambito: 'Zona Núcleo',
      color: 'rgba(86,201,122,0.85)', unidad: 'ARS/L',
      valor: ns?.nucleo?.promedio,
      pais: ns?.pais?.promedio,
      paisDelta: ns?.pais?.promedio != null && ns?.nucleo?.promedio != null ? ns.pais.promedio - ns.nucleo.promedio : null,
      n: ns?.nucleo?.n,
      fuente, fecha: fechaInforme,
    },
    {
      id: 'np-nucleo', histKey: 'np-nucleo',
      nombre: 'Nafta Premium', subtitulo: '+95 RON', ambito: 'Zona Núcleo',
      color: 'rgba(199,146,234,0.85)', unidad: 'ARS/L',
      valor: np?.nucleo?.promedio,
      pais: np?.pais?.promedio,
      paisDelta: np?.pais?.promedio != null && np?.nucleo?.promedio != null ? np.pais.promedio - np.nucleo.promedio : null,
      n: np?.nucleo?.n,
      fuente, fecha: fechaInforme,
    },
  ];

  const activeCard = cards.find(c => c.id === selectedCard) ?? null;

  return (
    <div>
      {/* Header fuente — muestra aviso si los datos son del caché (portal caído) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: data?.stale ? 8 : 20, padding: '10px 16px', background: 'var(--bg1)', border: '1px solid var(--line)', borderRadius: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Fuente</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text2)', fontWeight: 600 }}>{fuente ?? 'Secretaría de Energía'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {fechaInforme && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Último dato</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, color: 'var(--accent)', background: 'var(--acc-bg)', border: '1px solid rgba(91,156,246,.22)', padding: '2px 10px', borderRadius: 5 }}>{fechaInforme}</span>
            </div>
          )}
        </div>
      </div>
      {data?.stale && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, padding: '8px 14px', background: 'rgba(224,176,48,0.08)', border: '1px solid rgba(224,176,48,0.25)', borderRadius: 8 }}>
          <span style={{ fontSize: 13 }}>⚠</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'rgba(224,176,48,0.9)', letterSpacing: '.04em' }}>
            Secretaría de Energía no disponible ahora — mostrando última consulta exitosa
          </span>
          <button onClick={doFetch} style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 9, padding: '3px 10px', borderRadius: 4, border: '1px solid rgba(224,176,48,0.4)', background: 'transparent', color: 'rgba(224,176,48,0.85)', cursor: 'pointer' }}>
            Reintentar
          </button>
        </div>
      )}

      {/* Cards seleccionables — igual que MacroPage */}
      <div className="grid grid-4" style={{ marginBottom: 0 }}>
        {cards.map(c => {
          const isSelected = selectedCard === c.id;
          return (
            <div key={c.id} className="stat"
              onClick={() => setSelectedCard(isSelected ? null : c.id)}
              style={{ cursor: 'pointer', borderColor: isSelected ? 'var(--accent)' : '', transition: 'border-color .15s' }}
              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = 'var(--line2)'; }}
              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = ''; }}>

              <div className="stat-label">
                <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, flexShrink: 0, display: 'inline-block' }} />
                  {c.nombre}
                </span>
                {isSelected && (
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 7, background: 'var(--acc-bg)', color: 'var(--accent)', padding: '1px 5px', borderRadius: 3, border: '1px solid rgba(91,156,246,.2)' }}>
                    GRAF ▾
                  </span>
                )}
              </div>

              <div className="stat-val">{fmt(c.valor)}</div>
              <div className="stat-delta fl" style={{ marginBottom: 6 }}>ARS / litro</div>
              <div className="stat-meta">{c.subtitulo} · {c.ambito}</div>

              {c.paisDelta != null && (
                <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Promedio país</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, color: 'var(--white)' }}>
                    {fmt(c.pais)}
                    <span style={{ fontSize: 9, color: c.paisDelta > 0 ? 'var(--red)' : 'var(--green)', marginLeft: 6 }}>
                      {c.paisDelta > 0 ? '+' : ''}{Math.round(c.paisDelta).toLocaleString('es-AR')}
                    </span>
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Gráfico historial o placeholder */}
      {activeCard
        ? <InsumosHistorialChart card={activeCard} onClose={() => setSelectedCard(null)} />
        : (
          <div style={{ marginTop: 16, background: 'var(--bg1)', border: '1px dashed var(--line2)', borderRadius: 12, padding: '28px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text3)' }}>
              Seleccioná un combustible para ver el histórico
            </span>
          </div>
        )
      }

      {/* GNC aparte */}
      {gnc?.pais?.promedio && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--line)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden', marginTop: 28, marginBottom: 28 }}>
          {[
            { label: 'GNC · Promedio País', val: fmt(gnc.pais.promedio), sub: 'ARS/m³' },
            { label: 'GNC · Mediana',       val: fmt(gnc.pais.mediana),  sub: 'ARS/m³' },
            { label: 'GNC · Dispersión',    val: gnc.pais.min != null ? `${fmt(gnc.pais.min)} – ${fmt(gnc.pais.max)}` : '—', sub: `n = ${fmtN(gnc.pais.n)} estaciones (act. 30d)` },
          ].map(item => (
            <div key={item.label} style={{ background: 'var(--bg1)', padding: '14px 18px' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 6 }}>{item.label}</div>
              <div style={{ fontFamily: 'var(--display)', fontSize: 20, fontWeight: 700, color: 'var(--white)', marginBottom: 2 }}>{item.val}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)' }}>{item.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabla detalle */}
      <div className="section-title" style={{ marginTop: gnc?.pais?.promedio ? 0 : 28 }}>Detalle completo por producto y ámbito</div>
      <div className="tbl-wrap" style={{ marginBottom: 28 }}>
        <div className="tbl-scroll">
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Unidad</th>
                <th>Ámbito</th>
                <th className="r">Promedio</th>
                <th className="r">Mediana</th>
                <th className="r">Mínimo</th>
                <th className="r">Máximo</th>
                <th className="r" title="Estaciones que actualizaron precios en los últimos 30 días">N est. (30d)</th>              </tr>
            </thead>
            <tbody>
              {[
                { producto: 'Gasoil G2',     unidad: 'ARS/L',  ambito: 'Zona Núcleo', precio: g2?.nucleo?.promedio, mediana: g2?.nucleo?.mediana, min: g2?.nucleo?.min, max: g2?.nucleo?.max, n: g2?.nucleo?.n },
                { producto: 'Gasoil G2',     unidad: 'ARS/L',  ambito: 'País',        precio: g2?.pais?.promedio,   mediana: g2?.pais?.mediana,   min: g2?.pais?.min,   max: g2?.pais?.max,   n: g2?.pais?.n   },
                { producto: 'Gasoil G3',     unidad: 'ARS/L',  ambito: 'Zona Núcleo', precio: g3?.nucleo?.promedio, mediana: g3?.nucleo?.mediana, min: g3?.nucleo?.min, max: g3?.nucleo?.max, n: g3?.nucleo?.n },
                { producto: 'Gasoil G3',     unidad: 'ARS/L',  ambito: 'País',        precio: g3?.pais?.promedio,   mediana: g3?.pais?.mediana,   min: g3?.pais?.min,   max: g3?.pais?.max,   n: g3?.pais?.n   },
                { producto: 'Nafta Súper',   unidad: 'ARS/L',  ambito: 'Zona Núcleo', precio: ns?.nucleo?.promedio, mediana: ns?.nucleo?.mediana, min: ns?.nucleo?.min, max: ns?.nucleo?.max, n: ns?.nucleo?.n },
                { producto: 'Nafta Súper',   unidad: 'ARS/L',  ambito: 'País',        precio: ns?.pais?.promedio,   mediana: ns?.pais?.mediana,   min: ns?.pais?.min,   max: ns?.pais?.max,   n: ns?.pais?.n   },
                { producto: 'Nafta Premium', unidad: 'ARS/L',  ambito: 'Zona Núcleo', precio: np?.nucleo?.promedio, mediana: np?.nucleo?.mediana, min: np?.nucleo?.min, max: np?.nucleo?.max, n: np?.nucleo?.n },
                { producto: 'Nafta Premium', unidad: 'ARS/L',  ambito: 'País',        precio: np?.pais?.promedio,   mediana: np?.pais?.mediana,   min: np?.pais?.min,   max: np?.pais?.max,   n: np?.pais?.n   },
                { producto: 'GNC',           unidad: 'ARS/m³', ambito: 'País',        precio: gnc?.pais?.promedio,  mediana: gnc?.pais?.mediana,  min: gnc?.pais?.min,  max: gnc?.pais?.max,  n: gnc?.pais?.n  },
              ].map((f, i) => (
                <tr key={i}>
                  <td className="bold">{f.producto}</td>
                  <td className="dim mono" style={{ fontSize: 10 }}>{f.unidad}</td>
                  <td className="dim" style={{ fontSize: 11 }}>{f.ambito}</td>
                  <td className="r w mono">{fmt(f.precio)}</td>
                  <td className="r mono">{fmt(f.mediana)}</td>
                  <td className="r mono dim">{fmt(f.min)}</td>
                  <td className="r mono dim">{fmt(f.max)}</td>
                  <td className="r mono dim" style={{ fontSize: 11 }}>{fmtN(f.n)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    <div className="source">Fuente: {fuente} · Se excluyen estaciones sin actualizar en los últimos 30 días para evitar sesgos. Zona Núcleo: SF, CBA, BA, ER, LP.</div>    </div>
  );
}



export function InsumosPage({ goPage }) {
  const [tab,          setTab]          = useState('combustibles');
  const [insumosData,  setInsumosData]  = useState(null);
  const [insumosReady, setInsumosReady] = useState(false);
  const [fertData,     setFertData]     = useState(null);   // ← nuevo: datos fertilizantes para KPIs

  useEffect(() => {
    // FIX 11: En caso de fallo la UI mostrará "—" en los KPIs pero no se quedará
    //          bloqueada — setInsumosReady(true) se llama siempre para desbloquear
    //          el render aunque no haya datos (TabCombustibles tiene su propio manejo de error).
    fetchInsumosAll()
      .then(({ data: d }) => {
        if (d?.gasoil || d?.nafta) {
          setInsumosData(d);
        }
        setInsumosReady(true);
      })
      .catch(() => {
        setInsumosReady(true); // desbloquear render aunque fallen los datos
      });

    // Cargar fertilizantes para los KPIs del header
    fetchFertilizantes()
      .then(({ data }) => { if (data?.productos?.length) setFertData(data); })
      .catch(() => {});
  }, []);

  const g2Nucleo  = insumosData?.gasoil?.g2?.nucleo?.promedio ?? null;
  const g3Nucleo  = insumosData?.gasoil?.g3?.nucleo?.promedio ?? null;
  const fmtKpi = v => v == null ? '…' : '$\u00a0' + Math.round(v).toLocaleString('es-AR');

  // KPIs: 2 fertilizantes desde la API (con fallback a valores de referencia) + 2 combustibles reales
  const ureaLive = fertData?.productos?.find(p => p.id === 'urea');
  const mapLive  = fertData?.productos?.find(p => p.id === 'map');

  const topKpis = [
    {
      label: ureaLive?.nombre ?? 'Urea Granulada',
      val:      fmtKpi(ureaLive?.ars ?? null),
      sub:      'ARS/tn · fertilizante',
      delta:    ureaLive?.varPct != null
        ? (ureaLive.varPct > 0 ? '+' : '') + ureaLive.varPct.toFixed(1) + '%'
        : fertData ? '= 0%' : '…',
      deltaDir: ureaLive?.varPct != null
        ? (ureaLive.varPct > 0 ? 'up' : ureaLive.varPct < 0 ? 'dn' : 'fl')
        : 'fl',
      tag: ureaLive?.formula ?? '46-0-0',
    },
    {
      label: mapLive?.nombre ?? 'MAP',
      val:      fmtKpi(mapLive?.ars ?? null),
      sub:      'ARS/tn · fertilizante',
      delta:    mapLive?.varPct != null
        ? (mapLive.varPct > 0 ? '+' : '') + mapLive.varPct.toFixed(1) + '%'
        : fertData ? '= 0%' : '…',
      deltaDir: mapLive?.varPct != null
        ? (mapLive.varPct > 0 ? 'up' : mapLive.varPct < 0 ? 'dn' : 'fl')
        : 'fl',
      tag: mapLive?.formula ?? '11-52-0',
    },
    {
      label: 'Gasoil G2',
      val: insumosReady ? fmtKpi(g2Nucleo) : '…',
      sub: 'ARS/L · zona núcleo',
      delta: insumosReady && g2Nucleo ? 'LIVE · Sec. Energía' : 'cargando…',
      deltaDir: 'fl',
      tag: null,
    },
    {
      label: 'Gasoil G3',
      val: insumosReady ? fmtKpi(g3Nucleo) : '…',
      sub: 'ARS/L · zona núcleo',
      delta: insumosReady && g3Nucleo ? 'LIVE · Sec. Energía' : 'cargando…',
      deltaDir: 'fl',
      tag: null,
    },
  ];

  return (
    <div className="page-enter">
      <div className="ph">
        <div>
          <div className="ph-title">
            Insumos
            <span className="help-pip" onClick={() => goPage('ayuda', 'glosario-insumos')} title="Ayuda">?</span>
          </div>
          <div className="ph-sub">Fertilizantes · Combustibles</div>
        </div>
        <div className="ph-right">
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)', letterSpacing: '.06em' }}>
            {insumosReady && insumosData ? 'LIVE · Sec. de Energía' : 'cargando…'}
          </div>
        </div>
      </div>

      {/* KPIs resumen superiores — formato .stat consistente */}
      <div className="grid grid-4" style={{ marginBottom: 28 }}>
        {topKpis.map(k => (
          <div key={k.label} className="stat" style={{ cursor: 'default' }}>
            <div className="stat-label">
              <span>{k.label}</span>
              {k.tag && (
                <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)', background: 'var(--bg3)', padding: '2px 6px', borderRadius: 4 }}>{k.tag}</span>
              )}
            </div>
            <div className="stat-val">{k.val}</div>
            <div className={`stat-delta ${k.deltaDir}`} style={{ marginBottom: 6 }}>{k.delta}</div>
            <div className="stat-meta">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`tab${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="section">
        {tab === 'fertilizantes' && <TabFertilizantes />}
        {tab === 'combustibles'  && <TabCombustibles prefetch={{ data: insumosData, ready: insumosReady }} />}

      </div>
    </div>
  );
}
