import React, { useState, useEffect, useRef } from 'react';
import { fetchInsumosAll } from '../../services/api';

// ── Mock data ─────────────────────────────────────────────────

const FERTILIZANTES = [
  {
    id: 'urea',
    nombre: 'Urea Granulada',
    formula: '46-0-0',
    ars: 484000,
    usd: 388,
    varPct: -1.6,
    deltaArs: -8000,
    sojaRel: 0.94,
    relStatus: 'warn',
    nota: 'Nitrógeno · aplicación directa',
    hist: [280, 295, 310, 330, 355, 370, 390, 410, 430, 455, 476, 484],
    uso: 'Cobertura nitrogenada · trigo, maíz, pasturas',
  },
  {
    id: 'map',
    nombre: 'MAP',
    formula: '11-52-0',
    ars: 572000,
    usd: 459,
    varPct: 0,
    deltaArs: 0,
    sojaRel: null,
    relStatus: 'fl',
    nota: 'Fosfato monoamónico · siembra',
    hist: [310, 325, 340, 365, 385, 405, 430, 460, 500, 530, 572, 572],
    uso: 'Arranque fosforado · siembra fina y gruesa',
  },
  {
    id: 'dap',
    nombre: 'DAP',
    formula: '18-46-0',
    ars: 548000,
    usd: 440,
    varPct: 0.7,
    deltaArs: 4000,
    sojaRel: null,
    relStatus: 'fl',
    nota: 'Fosfato diamónico · referencia',
    hist: [300, 315, 332, 350, 368, 390, 415, 445, 490, 520, 544, 548],
    uso: 'Alternativa al MAP · mayor N disponible',
  },
  {
    id: 'uan',
    nombre: 'UAN',
    formula: '28-0-0',
    ars: 312000,
    usd: 250,
    varPct: 0,
    deltaArs: 0,
    sojaRel: null,
    relStatus: 'fl',
    nota: 'Solución nitrogenada · fertiriego',
    hist: [170, 180, 195, 210, 225, 240, 255, 275, 290, 302, 312, 312],
    uso: 'Fertiriego y foliar · trigo y maíz',
  },
];

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

const HIST_MESES = ['Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic', 'Ene', 'Feb'];

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

function TabFertilizantes() {
  return (
    <div>
      <div className="grid grid-4" style={{ marginBottom: 28 }}>
        {FERTILIZANTES.map(f => {
          const d = dir(f.varPct);
          const varTxt = (f.varPct > 0 ? '+' : '') + f.varPct.toFixed(1).replace('.', ',') + '%';
          return (
            <div key={f.id} className="stat" style={{ cursor: 'default' }}>
              <div className="stat-label">
                <span>{f.nombre}</span>
                <span className={`stat-badge ${d}`}>{varTxt}</span>
              </div>
              <div className="stat-val">{fmtARS(f.ars)}</div>
              {f.deltaArs !== 0 ? (
                <div className={`stat-delta ${d}`}>
                  {d === 'up' ? '▲' : '▼'} {fmtARS(Math.abs(f.deltaArs))} vs sem. ant.
                </div>
              ) : (
                <div className="stat-delta fl">— Sin cambios esta semana</div>
              )}
              <div className="stat-meta" style={{ marginTop: 6 }}>{fmtUSD(f.usd)}/tn · Fórmula {f.formula}</div>
              <div className="stat-meta">{f.uso}</div>
            </div>
          );
        })}
      </div>

      <div className="section-title">Detalle · zona núcleo · ARS/tonelada</div>
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
              {FERTILIZANTES.map(f => {
                const d = dir(f.varPct);
                return (
                  <tr key={f.id}>
                    <td className="bold">{f.nombre}</td>
                    <td className="dim mono" style={{ fontSize: 11 }}>{f.formula}</td>
                    <td className="r w mono">{fmtARS(f.ars)}</td>
                    <td className="r mono">{fmtUSD(f.usd)}</td>
                    <td className="r"><Pill d={d}>{fmtPct(f.varPct)}</Pill></td>
                    <td className="r">
                      <Spark data={f.hist} color={d === 'dn' ? 'var(--red)' : d === 'up' ? 'var(--green)' : 'var(--text3)'} />
                    </td>
                    <td className="dim" style={{ fontSize: 11 }}>{f.nota}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ background: 'var(--bg1)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px 12px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text3)' }}>
            Evolución ARS/tn · Mar 2025 – Feb 2026 · zona núcleo
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {[['Urea', '#f0d050'], ['MAP', '#4d9ef0'], ['DAP', '#56c97a'], ['UAN', '#e07090']].map(([l, c]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 20, height: 2, background: c, borderRadius: 1 }} />
                <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)' }}>{l}</span>
              </div>
            ))}
          </div>
        </div>
        <HistLineChart />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--line)', borderTop: '1px solid var(--line)' }}>
          {[
            { label: 'Urea var. 12m', val: '+75,5%', color: '#f0d050' },
            { label: 'MAP var. 12m',  val: '+84,5%', color: '#4d9ef0' },
            { label: 'DAP var. 12m',  val: '+82,7%', color: '#56c97a' },
            { label: 'UAN var. 12m',  val: '+83,5%', color: '#e07090' },
          ].map(item => (
            <div key={item.label} style={{ background: 'var(--bg1)', padding: '12px 16px' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)', marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 700, color: item.color }}>{item.val}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="source">Fuente: Fertilizar AC · CIAFA · datos mock · Feb 2026</div>
    </div>
  );
}

function HistLineChart() {
  const W = 900, H = 180, PAD = { t: 12, r: 20, b: 28, l: 52 };
  const iW = W - PAD.l - PAD.r;
  const iH = H - PAD.t - PAD.b;
  const series = [
    { data: FERTILIZANTES[0].hist, color: '#f0d050' },
    { data: FERTILIZANTES[1].hist, color: '#4d9ef0' },
    { data: FERTILIZANTES[2].hist, color: '#56c97a' },
    { data: FERTILIZANTES[3].hist, color: '#e07090' },
  ];
  const all   = series.flatMap(s => s.data);
  const minV  = Math.min(...all);
  const maxV  = Math.max(...all);
  const range = maxV - minV || 1;
  const toX = i  => PAD.l + (i / (HIST_MESES.length - 1)) * iW;
  const toY = v  => PAD.t + iH - ((v - minV) / range) * iH;
  const gridLines = 4;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 180, display: 'block' }}>
      {Array.from({ length: gridLines + 1 }).map((_, i) => {
        const y = PAD.t + (iH / gridLines) * i;
        const v = Math.round(maxV - (i / gridLines) * range);
        return (
          <g key={i}>
            <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="var(--line)" strokeWidth="1" />
            <text x={PAD.l - 6} y={y + 4} textAnchor="end" fontSize="8" fill="var(--text3)" fontFamily="var(--mono)">{(v / 1000).toFixed(0)}k</text>
          </g>
        );
      })}
      {HIST_MESES.map((m, i) => (
        <text key={m} x={toX(i)} y={H - 6} textAnchor="middle" fontSize="8" fill="var(--text3)" fontFamily="var(--mono)">{m}</text>
      ))}
      {series.map((s, si) => {
        const pts = s.data.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');
        return (
          <g key={si}>
            <polyline points={pts} fill="none" stroke={s.color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" opacity="0.85" />
            {s.data.map((v, i) => (
              <circle key={i} cx={toX(i)} cy={toY(v)} r="2.5" fill={s.color} opacity="0.7" />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

// ── Canvas chart para combustibles (estética MacroPage) ───────

function CombustibleLineChart({ series, labels, color }) {
  const canvasRef = useRef(null);
  const [tooltip, setTooltip] = useState('');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !series?.length) return;
    const data = series;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width  = rect.width  * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      const W = rect.width, H = rect.height;
      const pad = { t: 18, r: 16, b: 32, l: 58 };
      const vals  = data.map(Number);
      const vmin  = Math.min(...vals) * 0.96;
      const vmax  = Math.max(...vals) * 1.03;
      const range = vmax - vmin || 1;
      const n     = data.length;
      const px    = i => pad.l + (i / (n - 1)) * (W - pad.l - pad.r);
      const py    = v => pad.t + (H - pad.t - pad.b) - ((v - vmin) / range) * (H - pad.t - pad.b);

      // Grid lines
      for (let i = 0; i <= 4; i++) {
        const v = vmin + (range * i) / 4;
        const y = py(v);
        ctx.strokeStyle = i === 0 ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 1;
        ctx.setLineDash(i === 0 ? [] : [3, 5]);
        ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(90,101,133,0.75)';
        ctx.font = '9px JetBrains Mono,monospace';
        ctx.textAlign = 'right';
        ctx.fillText('$' + Math.round(v).toLocaleString('es-AR'), pad.l - 5, y + 3);
      }

      // X labels
      ctx.fillStyle = 'rgba(90,101,133,0.6)';
      ctx.font = '8px JetBrains Mono,monospace';
      ctx.textAlign = 'center';
      if (labels?.length) {
        labels.forEach((l, i) => {
          if (i === 0 || i === n - 1 || i % Math.max(1, Math.floor(n / 6)) === 0) {
            ctx.fillText(l, px(i), H - pad.b + 13);
          }
        });
      }

      // Area fill
      const grad = ctx.createLinearGradient(0, pad.t, 0, H - pad.b);
      // Convierte cualquier formato rgb/rgba a rgba con la opacidad deseada
      const toRgba = (c, alpha) => {
        const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        return m ? `rgba(${m[1]},${m[2]},${m[3]},${alpha})` : c;
      };
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

      // Line
      ctx.beginPath();
      ctx.moveTo(px(0), py(vals[0]));
      vals.forEach((v, i) => { if (i > 0) ctx.lineTo(px(i), py(v)); });
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Last point dot
      const lv = vals[n - 1];
      ctx.beginPath();
      ctx.arc(px(n - 1), py(lv), 3.5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [series, labels, color]);

  const handleMouseMove = e => {
    if (!series?.length) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const n = series.length;
    const xS = (rect.width - 74) / (n - 1 || 1);
    const idx = Math.max(0, Math.min(n - 1, Math.round((e.clientX - rect.left - 58) / xS)));
    const v = series[idx];
    const l = labels?.[idx] ?? `Período ${idx + 1}`;
    if (v != null) setTooltip(`${l}  ·  $ ${Math.round(v).toLocaleString('es-AR')}`);
  };

  return (
    <div>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '180px', display: 'block', cursor: 'crosshair' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip('')}
      />
      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text2)', minHeight: 14, marginTop: 6, textAlign: 'center' }}>{tooltip}</div>
    </div>
  );
}

// ── Tab: Combustibles ─────────────────────────────────────────

function TabCombustibles({ prefetch = {} }) {
  const [data,    setData]    = useState(prefetch.data  ?? null);
  const [loading, setLoading] = useState(!prefetch.ready);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (prefetch.ready) {
      setData(prefetch.data ?? null);
      if (!prefetch.data) setError('Sin datos de combustibles');
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchInsumosAll()
      .then(({ data: d, error: e }) => {
        if (e) { setError(e); return; }
        if (!d?.gasoil) { setError('Sin datos de combustibles'); return; }
        setData(d);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [prefetch.ready, prefetch.data]);

  const fmt  = v => v == null ? '—' : '$\u00a0' + v.toLocaleString('es-AR');
  const fmtN = v => v == null ? '—' : v.toLocaleString('es-AR');

  if (loading) {
    return (
      <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: 11 }}>
        Consultando Secretaría de Energía…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="alert-strip" style={{ marginBottom: 24 }}>
        <span className="alert-icon">!</span>
        <span className="alert-text">No se pudo conectar con datos.energia.gob.ar: {error}</span>
      </div>
    );
  }

  const { gasoil, nafta, fuente, fecha } = data;
  const g2  = gasoil?.g2;
  const g3  = gasoil?.g3;
  const ns  = nafta?.super;
  const np  = nafta?.premium;
  const gnc = nafta?.gnc;

  // Fecha del último dato del informe (no de la consulta a la API)
  const fechaInforme = fecha
    ? new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null;

  // Histórico mock G2 (12 meses) — se reemplaza con datos reales cuando la API los provea
  const histG2     = [840, 870, 920, 980, 1040, 1080, 1120, 1160, 1200, 1460, 1630, g2?.nucleo?.promedio ?? 1630];
  const histLabels = HIST_MESES;

  // Delta vs valor anterior en historial (último vs penúltimo)
  const g2Prev  = histG2[histG2.length - 2];
  const g2Cur   = histG2[histG2.length - 1];
  const g2Delta = g2Cur != null && g2Prev != null ? g2Cur - g2Prev : null;
  const g2DeltaPct = g2Delta != null && g2Prev ? ((g2Delta / g2Prev) * 100) : null;

  // Delta pais vs nucleo como señal de dispersión geográfica
  const g2PaisDelta  = g2?.pais?.promedio  != null && g2?.nucleo?.promedio  != null ? g2.pais.promedio  - g2.nucleo.promedio  : null;
  const nsPaisDelta  = ns?.pais?.promedio  != null && ns?.nucleo?.promedio  != null ? ns.pais.promedio  - ns.nucleo.promedio  : null;

  const cards = [
    {
      id: 'g2-n',
      nombre: 'Gasoil G2',
      subtitulo: 'Más usado en agro · 92% consumo campo',
      ambito: 'Zona Núcleo',
      color: 'rgba(91,156,246,0.85)',
      valor: g2?.nucleo?.promedio,
      pais: g2?.pais?.promedio,
      paisDelta: g2PaisDelta,
      delta: g2Delta,
      deltaPct: g2DeltaPct,
      n: g2?.nucleo?.n,
    },
    {
      id: 'g3-n',
      nombre: 'Gasoil G3',
      subtitulo: 'Premium · Euro V',
      ambito: 'Zona Núcleo',
      color: 'rgba(77,158,240,0.85)',
      valor: g3?.nucleo?.promedio,
      pais: g3?.pais?.promedio,
      paisDelta: g3?.pais?.promedio != null && g3?.nucleo?.promedio != null ? g3.pais.promedio - g3.nucleo.promedio : null,
      delta: null,
      deltaPct: null,
      n: g3?.nucleo?.n,
    },
    {
      id: 'ns-n',
      nombre: 'Nafta Súper',
      subtitulo: '92–95 RON · uso utilitarios',
      ambito: 'Zona Núcleo',
      color: 'rgba(86,201,122,0.85)',
      valor: ns?.nucleo?.promedio,
      pais: ns?.pais?.promedio,
      paisDelta: nsPaisDelta,
      delta: null,
      deltaPct: null,
      n: ns?.nucleo?.n,
    },
    {
      id: 'np-n',
      nombre: 'Nafta Premium',
      subtitulo: '+95 RON · alta compresión',
      ambito: 'Zona Núcleo',
      color: 'rgba(199,146,234,0.85)',
      valor: np?.nucleo?.promedio,
      pais: np?.pais?.promedio,
      paisDelta: np?.pais?.promedio != null && np?.nucleo?.promedio != null ? np.pais.promedio - np.nucleo.promedio : null,
      delta: null,
      deltaPct: null,
      n: np?.nucleo?.n,
    },
  ];

  return (
    <div>
      {/* Header con fecha del dato del informe */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, padding: '10px 16px', background: 'var(--bg1)', border: '1px solid var(--line)', borderRadius: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Fuente</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text2)', fontWeight: 600 }}>{fuente ?? 'Secretaría de Energía'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {fechaInforme && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Último dato del informe</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, color: 'var(--accent)', background: 'var(--acc-bg)', border: '1px solid rgba(91,156,246,.22)', padding: '2px 10px', borderRadius: 5 }}>{fechaInforme}</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Actualización</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)' }}>cada hora</span>
          </div>
        </div>
      </div>

      {/* KPI cards con delta y fecha */}
      <div className="grid grid-4" style={{ marginBottom: 28 }}>
        {cards.map(c => {
          const deltaUp  = c.delta != null ? c.delta > 0 : null;
          const deltaTxt = c.deltaPct != null
            ? (c.deltaPct > 0 ? '+' : '') + c.deltaPct.toFixed(1).replace('.', ',') + '%'
            : null;
          return (
            <div key={c.id} className="stat" style={{ cursor: 'default' }}>
              {/* Label + fecha */}
              <div className="stat-label">
                <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, flexShrink: 0, display: 'inline-block' }} />
                  {c.nombre}
                </span>
                {fechaInforme && (
                  <span style={{
                    fontFamily: 'var(--mono)', fontSize: 8, fontWeight: 700,
                    color: 'var(--accent)', background: 'var(--acc-bg)',
                    border: '1px solid rgba(91,156,246,.2)', padding: '1px 6px', borderRadius: 4,
                  }}>{fechaInforme}</span>
                )}
              </div>

              {/* Precio principal */}
              <div className="stat-val">{fmt(c.valor)}</div>

              {/* Delta vs mes anterior */}
              {deltaTxt != null ? (
                <div style={{
                  fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600,
                  color: deltaUp ? 'var(--red)' : 'var(--green)',
                  background: deltaUp ? 'var(--red-bg)' : 'var(--green-bg)',
                  padding: '2px 8px', borderRadius: 4, display: 'inline-block', marginBottom: 8,
                }}>
                  {deltaUp ? '▲' : '▼'} {deltaTxt} vs mes ant.
                </div>
              ) : (
                <div className="stat-delta fl" style={{ marginBottom: 8 }}>ARS / litro</div>
              )}

              <div className="stat-meta">{c.subtitulo}</div>

              {/* Dispersión núcleo vs país */}
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

      {/* GNC aparte */}
      {gnc?.pais?.promedio && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--line)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden', marginBottom: 28 }}>
          {[
            { label: 'GNC · Promedio País',  val: fmt(gnc.pais.promedio),  sub: 'ARS/m³' },
            { label: 'GNC · Mediana',        val: fmt(gnc.pais.mediana),   sub: 'ARS/m³' },
            { label: 'GNC · Dispersión',     val: gnc.pais.min != null ? `${fmt(gnc.pais.min)} – ${fmt(gnc.pais.max)}` : '—', sub: `n = ${fmtN(gnc.pais.n)} estaciones` },
          ].map(item => (
            <div key={item.label} style={{ background: 'var(--bg1)', padding: '14px 18px' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 6 }}>{item.label}</div>
              <div style={{ fontFamily: 'var(--display)', fontSize: 20, fontWeight: 700, color: 'var(--white)', marginBottom: 2 }}>{item.val}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)' }}>{item.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Gráfico evolución G2 — estética MacroPage */}
      <div style={{ background: 'var(--bg1)', border: '1px solid var(--line)', borderRadius: 12, padding: '18px 20px', marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text3)' }}>
              Gasoil G2 · Zona Núcleo · Evolución ARS/litro
            </div>
            <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 3 }}>Últimos 12 meses · hover para ver valor</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 20, height: 2, background: 'rgba(91,156,246,0.85)', borderRadius: 1 }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)' }}>Promedio zona núcleo</span>
          </div>
        </div>
        <CombustibleLineChart series={histG2} labels={histLabels} color="rgba(91,156,246,0.85)" />
        <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--text3)', marginTop: 4, textAlign: 'right' }}>
          Fuente: {fuente ?? 'Sec. de Energía'} · datos mock históricos · datos reales requieren endpoint de serie temporal
        </div>
      </div>

      {/* Tabla detalle */}
      <div className="section-title">Detalle completo por producto y ámbito</div>
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
                <th className="r">N est.</th>
              </tr>
            </thead>
            <tbody>
              {[
                { producto: 'Gasoil G2',      unidad: 'ARS/L',  ambito: 'Zona Núcleo', precio: g2?.nucleo?.promedio, mediana: g2?.nucleo?.mediana, min: g2?.nucleo?.min, max: g2?.nucleo?.max, n: g2?.nucleo?.n },
                { producto: 'Gasoil G2',      unidad: 'ARS/L',  ambito: 'País',        precio: g2?.pais?.promedio,   mediana: g2?.pais?.mediana,   min: g2?.pais?.min,   max: g2?.pais?.max,   n: g2?.pais?.n   },
                { producto: 'Gasoil G3',      unidad: 'ARS/L',  ambito: 'Zona Núcleo', precio: g3?.nucleo?.promedio, mediana: g3?.nucleo?.mediana, min: g3?.nucleo?.min, max: g3?.nucleo?.max, n: g3?.nucleo?.n },
                { producto: 'Gasoil G3',      unidad: 'ARS/L',  ambito: 'País',        precio: g3?.pais?.promedio,   mediana: g3?.pais?.mediana,   min: g3?.pais?.min,   max: g3?.pais?.max,   n: g3?.pais?.n   },
                { producto: 'Nafta Súper',    unidad: 'ARS/L',  ambito: 'Zona Núcleo', precio: ns?.nucleo?.promedio, mediana: ns?.nucleo?.mediana, min: ns?.nucleo?.min, max: ns?.nucleo?.max, n: ns?.nucleo?.n },
                { producto: 'Nafta Súper',    unidad: 'ARS/L',  ambito: 'País',        precio: ns?.pais?.promedio,   mediana: ns?.pais?.mediana,   min: ns?.pais?.min,   max: ns?.pais?.max,   n: ns?.pais?.n   },
                { producto: 'Nafta Premium',  unidad: 'ARS/L',  ambito: 'Zona Núcleo', precio: np?.nucleo?.promedio, mediana: np?.nucleo?.mediana, min: np?.nucleo?.min, max: np?.nucleo?.max, n: np?.nucleo?.n },
                { producto: 'Nafta Premium',  unidad: 'ARS/L',  ambito: 'País',        precio: np?.pais?.promedio,   mediana: np?.pais?.mediana,   min: np?.pais?.min,   max: np?.pais?.max,   n: np?.pais?.n   },
                { producto: 'GNC',            unidad: 'ARS/m³', ambito: 'País',        precio: gnc?.pais?.promedio,  mediana: gnc?.pais?.mediana,  min: gnc?.pais?.min,  max: gnc?.pais?.max,  n: gnc?.pais?.n  },
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

      <div className="source">Fuente: {fuente} · Zona Núcleo: Santa Fe, Córdoba, Bs. As., Entre Ríos, La Pampa</div>
    </div>
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
      <div className="source">Fuente: BCR · YPF · Fertilizar AC · datos mock · Feb 2026</div>
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

  useEffect(() => {
    fetchInsumosAll()
      .then(({ data: d }) => { if (d?.gasoil || d?.nafta) setInsumosData(d); })
      .finally(() => setInsumosReady(true));
  }, []);

  const g2Nucleo  = insumosData?.gasoil?.g2?.nucleo?.promedio ?? null;
  const g3Nucleo  = insumosData?.gasoil?.g3?.nucleo?.promedio ?? null;
  const fmtKpi = v => v == null ? '…' : '$\u00a0' + Math.round(v).toLocaleString('es-AR');

  // KPIs superiores: 2 fertilizantes clave + 2 combustibles reales
  const topKpis = [
    { label: 'Urea Granulada', val: fmtKpi(484000), sub: 'ARS/tn · fertilizante',   delta: '-1,6%',     deltaDir: 'dn', tag: '46-0-0' },
    { label: 'MAP',            val: fmtKpi(572000), sub: 'ARS/tn · fertilizante',   delta: '= 0%',      deltaDir: 'fl', tag: '11-52-0' },
    { label: 'Gasoil G2',      val: insumosReady ? fmtKpi(g2Nucleo) : '…', sub: 'ARS/L · zona núcleo', delta: insumosReady && g2Nucleo ? 'LIVE · Sec. Energía' : 'cargando…', deltaDir: 'fl', tag: null },
    { label: 'Gasoil G3',      val: insumosReady ? fmtKpi(g3Nucleo) : '…', sub: 'ARS/L · zona núcleo', delta: insumosReady && g3Nucleo ? 'LIVE · Sec. Energía' : 'cargando…', deltaDir: 'fl', tag: null },
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
            {insumosReady
              ? (insumosData ? 'LIVE · Sec. de Energía' : 'FALLBACK · sin conexión')
              : 'cargando…'}
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
