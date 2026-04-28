import React, { useState, useEffect, useRef, useCallback } from 'react';
import { fetchInsumosAll, fetchFertilizantes } from '../../services/api';

const RELACIONES = [
  {
    id: 'soja-urea',
    label: 'Soja / Urea',
    valor: 0.94,
    unidad: 'tn soja/tn urea',
    barPct: 47,
    color: 'var(--red)',
    status: 'warn',
    statusLabel: 'bajo presión',
    nota: 'hace 1m: 0,97',
    refPct: 50,
    desc: 'Toneladas de soja necesarias para comprar 1 tn de Urea. Umbral saludable: ≥ 1,0',
  },
  {
    id: 'maiz-urea',
    label: 'Maíz / Urea',
    valor: 0.52,
    unidad: 'tn maíz/tn urea',
    barPct: 26,
    color: 'var(--red)',
    status: 'warn',
    statusLabel: 'bajo presión',
    nota: 'hace 1m: 0,54',
    refPct: 50,
    desc: 'Toneladas de maíz para comprar 1 tn de Urea. Umbral saludable: ≥ 0,6',
  },
  {
    id: 'trigo-map',
    label: 'Trigo / MAP',
    valor: 0.43,
    unidad: 'tn trigo/tn MAP',
    barPct: 21.5,
    color: 'var(--red)',
    status: 'warn',
    statusLabel: 'bajo presión',
    nota: 'hace 1m: 0,45',
    refPct: 50,
    desc: 'Toneladas de trigo para comprar 1 tn de MAP. Umbral saludable: ≥ 0,5',
  },
  {
    id: 'soja-gasoil-rel',
    label: 'Soja / Gasoil',
    valor: '365 L',
    unidad: 'litros/tn soja',
    barPct: 73,
    color: 'var(--accent)',
    status: 'mid',
    statusLabel: 'normal',
    nota: 'hace 1m: 362',
    refPct: null,
    desc: 'Litros de gasoil que se pueden comprar con 1 tn de soja vendida a pizarra.',
  },
  {
    id: 'ternero-gasoil',
    label: 'Ternero / Gasoil',
    valor: '5,46 L',
    unidad: 'litros/kg ternero',
    barPct: 54.6,
    color: 'var(--accent)',
    status: 'mid',
    statusLabel: 'normal',
    nota: 'hace 1m: 5,22',
    refPct: null,
    desc: 'Litros de gasoil equivalentes por kg de ternero al destete.',
  },
];

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

// Colores por producto (paleta consistente con el resto del sistema)
const FERT_COLORS = {
  urea: '#f0d050',
  map:  '#4d9ef0',
  dap:  '#56c97a',
  uan:  '#e07090',
  sol:  '#f09050',
  clu:  '#a070e0',
};

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
    color:      FERT_COLORS[activeF.id] ?? 'rgba(91,156,246,0.85)',
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
          const color = FERT_COLORS[f.id] ?? 'var(--accent)';
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
      <div className="section-title" style={{ marginTop: 28 }}>Detalle · zona núcleo · ARS/tonelada</div>
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
                    <td className="bold" style={{ color: FERT_COLORS[f.id] }}>{f.nombre}</td>
                    <td className="dim mono" style={{ fontSize: 11 }}>{f.formula}</td>
                    <td className="r w mono">{fmtARS(f.ars)}</td>
                    <td className="r mono">{f.usd ? fmtUSD(f.usd) : '—'}</td>
                    <td className="r">
                      {f.varPct != null ? <Pill d={d}>{fmtPct(f.varPct)}</Pill> : <span className="dim">—</span>}
                    </td>
                    <td className="r">
                      <Spark data={f.hist} color={FERT_COLORS[f.id] ?? (d === 'dn' ? 'var(--red)' : d === 'up' ? 'var(--green)' : 'var(--text3)')} />
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
  const canvasRef = useRef(null);
  const [tooltip, setTooltip] = useState('');
  const [range, setRange]     = useState('MAX');

  // Historial de combustibles (mock fijo — no cambia con IndexMundi)
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

  // Si el card tiene datos reales de la API (fertilizantes), los usamos directamente.
  // Si no (combustibles), caemos al mock hardcodeado.
  const rawSeries = card?.histData
    ? card.histData
    : (HIST_DATA_COMBUSTIBLES[card?.histKey] ?? []);

  const filledSeries = rawSeries
    .map(v => v == null && card?.valor != null ? card.valor : v)
    .filter(v => v != null);

  // Labels: si la API mandó fechas reales las usamos; sino generamos los últimos N meses
  const rawLabels = card?.histLabels?.length
    ? card.histLabels
    : HIST_MESES.slice(HIST_MESES.length - filledSeries.length);

  const getSlice = () => {
    if (!filledSeries.length) return { vals: [], lbls: [] };
    const sliceCount = range === '3M' ? 3 : range === '6M' ? 6 : range === '1A' ? 12 : filledSeries.length;
    return {
      vals: filledSeries.slice(-sliceCount),
      lbls: rawLabels.slice(-sliceCount),
    };
  };

  const { vals: series, lbls: labels } = getSlice();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !series.length) return;

    const toRgba = (c, alpha) => {
      const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      return m ? `rgba(${m[1]},${m[2]},${m[3]},${alpha})` : c;
    };

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width  = rect.width  * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      const W = rect.width, H = rect.height;
      const pad = { t: 18, r: 16, b: 32, l: 62 };
      const vals = series.map(Number);
      const vmin = Math.min(...vals) * 0.96;
      const vmax = Math.max(...vals) * 1.04;
      const n    = vals.length;
      const xS   = (W - pad.l - pad.r) / (n - 1 || 1);
      const yS   = (H - pad.t - pad.b) / (vmax - vmin || 1);
      const px   = i => pad.l + i * xS;
      const py   = v => H - pad.b - (v - vmin) * yS;

      // Grid
      for (let i = 0; i <= 4; i++) {
        const v = vmin + (vmax - vmin) * i / 4;
        const y = py(v);
        ctx.strokeStyle = i === 0 ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 1;
        ctx.setLineDash(i === 0 ? [] : [3, 5]);
        ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(90,101,133,0.75)';
        ctx.font = '9px JetBrains Mono,monospace';
        ctx.textAlign = 'right';
        ctx.fillText('$\u00a0' + Math.round(v).toLocaleString('es-AR'), pad.l - 5, y + 3);
      }

      // Eje X
      ctx.fillStyle = 'rgba(90,101,133,0.6)';
      ctx.font = '8px JetBrains Mono,monospace';
      ctx.textAlign = 'center';
      labels.forEach((l, i) => {
        if (i === 0 || i === n - 1 || i % Math.max(1, Math.floor(n / 6)) === 0) {
          ctx.fillText(l, px(i), H - pad.b + 13);
        }
      });

      // Área
      const color = card?.color ?? 'rgba(91,156,246,0.85)';
      const grad = ctx.createLinearGradient(0, pad.t, 0, H - pad.b);
      grad.addColorStop(0, toRgba(color, 0.18));
      grad.addColorStop(1, toRgba(color, 0.01));
      ctx.beginPath();
      ctx.moveTo(px(0), py(vals[0]));
      vals.forEach((v, i) => { if (i > 0) ctx.lineTo(px(i), py(v)); });
      ctx.lineTo(px(n - 1), H - pad.b);
      ctx.lineTo(px(0), H - pad.b);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // Línea
      ctx.beginPath();
      ctx.moveTo(px(0), py(vals[0]));
      vals.forEach((v, i) => { if (i > 0) ctx.lineTo(px(i), py(v)); });
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Punto final
      const lv = vals[n - 1];
      ctx.beginPath();
      ctx.arc(px(n - 1), py(lv), 3.5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.fillStyle = color;
      ctx.font = 'bold 10px JetBrains Mono,monospace';
      ctx.textAlign = 'right';
      ctx.fillText('$\u00a0' + Math.round(lv).toLocaleString('es-AR'), px(n - 1) - 7, py(lv) - 6);
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [series, card]);

  const handleMouseMove = e => {
    if (!series.length) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const xS = (rect.width - 78) / (series.length - 1 || 1);
    const idx = Math.max(0, Math.min(series.length - 1, Math.round((e.clientX - rect.left - 62) / xS)));
    const v = series[idx];
    const l = labels[idx] ?? `Mes ${idx + 1}`;
    if (v != null) setTooltip(`${l}  ·  $\u00a0${Math.round(v).toLocaleString('es-AR')} ${card?.unidad ?? 'ARS/L'}`);
  };

  if (!card) return null;

  return (
    <div style={{ background: 'var(--bg1)', border: '1px solid var(--accent)', borderRadius: 12, padding: '18px 20px', marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: card.color, flexShrink: 0, display: 'inline-block' }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text3)' }}>
              {card.nombre} — historial
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 8 }}>
            {card.ambito} · {card.unidad}
            {card.fecha && (
              <span style={{ fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, color: 'var(--accent)', background: 'var(--acc-bg)', border: '1px solid rgba(91,156,246,.22)', padding: '1px 8px', borderRadius: 4 }}>
                último dato: {card.fecha}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {['3M', '6M', '1A', 'MAX'].map(r => (
            <button key={r} onClick={() => setRange(r)}
              style={{
                fontFamily: 'var(--mono)', fontSize: 9, padding: '3px 10px', borderRadius: 4,
                border: `1px solid ${r === range ? 'var(--accent)' : 'var(--line2)'}`,
                background: r === range ? 'var(--acc-bg)' : 'transparent',
                color: r === range ? 'var(--accent)' : 'var(--text3)',
                cursor: 'pointer', transition: 'all .12s',
              }}>
              {r}
            </button>
          ))}
          {onClose && (
            <button onClick={onClose}
              style={{
                marginLeft: 6, fontFamily: 'var(--mono)', fontSize: 13, lineHeight: 1,
                padding: '2px 7px', borderRadius: 4,
                border: '1px solid var(--line2)', background: 'transparent',
                color: 'var(--text3)', cursor: 'pointer', transition: 'all .12s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--red)'; e.currentTarget.style.color = 'var(--red)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line2)'; e.currentTarget.style.color = 'var(--text3)'; }}
              title="Cerrar gráfico">
              ×
            </button>
          )}
        </div>
      </div>
      {series.length === 0
        ? <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: 11 }}>Sin datos</div>
        : <>
            <canvas ref={canvasRef}
              style={{ width: '100%', height: '200px', display: 'block', cursor: 'crosshair' }}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setTooltip('')}
            />
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text2)', minHeight: 14, marginTop: 6, textAlign: 'center' }}>{tooltip}</div>
          </>
      }
      <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--text3)', marginTop: 4, textAlign: 'right' }}>
        Fuente: {card.fuente ?? 'Sec. de Energía'}
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



// ── Tab: Relaciones ───────────────────────────────────────────

function TabRelaciones() {
  return (
    <div>
      <div className="alert-strip info" style={{ marginBottom: 24 }}>
        <span className="alert-icon">i</span>
        <span className="alert-text">
          Las relaciones insumo/producto miden el <strong>poder adquisitivo del campo</strong>: cuántas unidades de producto (grano, hacienda) se necesitan para comprar una unidad de insumo. Rojo = presión sobre la rentabilidad.
        </span>
      </div>

      {/* Relaciones Grano / Fertilizante — formato .stat */}
      <div className="section-title" style={{ marginBottom: 12 }}>Relaciones Grano / Fertilizante</div>
      <div className="grid grid-3" style={{ marginBottom: 28 }}>
        {RELACIONES.slice(0, 3).map(r => {
          const badgeCls = r.status === 'warn' ? 'dn' : r.status === 'mid' ? 'info' : 'up';
          const prevVal  = parseFloat(r.nota.replace('hace 1m: ', '').replace(',', '.'));
          const currVal  = typeof r.valor === 'number' ? r.valor : parseFloat(String(r.valor).replace(',', '.'));
          const delta    = !isNaN(prevVal) && !isNaN(currVal) ? currVal - prevVal : null;
          return (
            <div key={r.id} className="stat" style={{ cursor: 'default' }}>
              <div className="stat-label">
                <span>{r.label}</span>
                <span className={`stat-badge ${badgeCls}`}>{r.statusLabel}</span>
              </div>
              <div className="stat-val" style={{ color: r.color, fontSize: 28 }}>{r.valor}</div>
              <div className="stat-delta fl" style={{ marginBottom: 6 }}>{r.unidad}</div>
              {delta !== null && (
                <div className={`stat-delta ${delta > 0 ? 'up' : delta < 0 ? 'dn' : 'fl'}`}>
                  {delta > 0 ? '▲' : delta < 0 ? '▼' : '—'} {Math.abs(delta).toFixed(2)} vs mes anterior
                </div>
              )}
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Presión relativa</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--text3)' }}>{r.barPct}%</span>
                </div>
                <div className="gauge-bar-wrap" style={{ marginBottom: 0 }}>
                  <div className={`gauge-bar-fill ${r.status === 'warn' ? 'warn' : 'mid'}`} style={{ width: `${r.barPct}%` }} />
                  {r.refPct && <div className="gauge-bar-ref" style={{ left: `${r.refPct}%` }} />}
                </div>
              </div>
              <div className="stat-meta" style={{ marginTop: 8 }}>{r.desc}</div>
            </div>
          );
        })}
      </div>

      {/* Relaciones Hacienda / Combustible — formato .stat */}
      <div className="section-title" style={{ marginBottom: 12 }}>Relaciones Hacienda / Combustible</div>
      <div className="grid grid-3" style={{ marginBottom: 28 }}>
        {RELACIONES.slice(3).map(r => {
          const badgeCls = r.status === 'warn' ? 'dn' : r.status === 'mid' ? 'info' : 'up';
          return (
            <div key={r.id} className="stat" style={{ cursor: 'default' }}>
              <div className="stat-label">
                <span>{r.label}</span>
                <span className={`stat-badge ${badgeCls}`}>{r.statusLabel}</span>
              </div>
              <div className="stat-val" style={{ color: r.color, fontSize: 28 }}>{r.valor}</div>
              <div className="stat-delta fl" style={{ marginBottom: 6 }}>{r.unidad}</div>
              <div className="stat-meta">{r.nota}</div>
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Nivel</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--text3)' }}>{r.barPct}%</span>
                </div>
                <div className="gauge-bar-wrap" style={{ marginBottom: 0 }}>
                  <div className="gauge-bar-fill mid" style={{ width: `${r.barPct}%` }} />
                </div>
              </div>
              <div className="stat-meta" style={{ marginTop: 8 }}>{r.desc}</div>
            </div>
          );
        })}
        <div />
      </div>

      <div className="section-title">Detalle · todas las relaciones</div>
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>Relación</th>
              <th className="r">Valor actual</th>
              <th className="r">hace 1m</th>
              <th>Estado</th>
              <th>Descripción</th>
            </tr>
          </thead>
          <tbody>
            {RELACIONES.map(r => (
              <tr key={r.id}>
                <td className="bold">{r.label}</td>
                <td className="r">
                  <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: r.color }}>{r.valor}</span>
                </td>
                <td className="r dim mono" style={{ fontSize: 11 }}>{r.nota.replace('hace 1m: ', '')}</td>
                <td>
                  <span className={`pill ${r.status === 'warn' ? 'dn' : r.status === 'mid' ? 'info' : 'fl'}`}>
                    {r.statusLabel}
                  </span>
                </td>
                <td className="dim" style={{ fontSize: 11 }}>{r.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--bg1)', border: '1px solid var(--line)', borderRadius: 8 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6 }}>Metodología</div>
        <div style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.6 }}>
          Relaciones calculadas sobre precios de pizarra BCR (zona núcleo) y precios YPF al surtidor. La línea vertical en las barras indica el umbral de referencia histórico. Los valores de combustible se calculan en litros por tonelada producida usando el precio del gasoil agro con subsidio.
        </div>
      </div>
      <div className="source">Fuente: BCR · YPF · Fertilizar AC · Feb 2026</div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────

const TABS = [
  { id: 'combustibles',  label: 'Combustibles' },
  { id: 'fertilizantes', label: 'Fertilizantes' },
  { id: 'relaciones',    label: 'Relaciones I/P' },
];

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
          <div className="ph-sub">Fertilizantes · Combustibles · Relaciones insumo/producto</div>
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
        {tab === 'relaciones'    && <TabRelaciones />}
      </div>
    </div>
  );
}
