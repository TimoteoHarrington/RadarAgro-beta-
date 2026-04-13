import React, { useState, useEffect } from 'react';
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
          const var12m = Math.round(((f.hist[f.hist.length - 1] - f.hist[0]) / f.hist[0]) * 100);
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
                <Spark data={f.hist} color={d === 'dn' ? 'var(--red)' : d === 'up' ? 'var(--green)' : 'var(--text3)'} />
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--text3)', marginBottom: 2 }}>var. 12m</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: 'var(--red)' }}>+{var12m}%</div>
                </div>
              </div>
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

  const histGasoil = [840, 870, 920, 980, 1040, 1080, 1120, 1160, 1200, 1460, 1630, g2?.nucleo?.promedio ?? 1630];

  const cards = [
    {
      id: 'g2-n',
      nombre: 'Gasoil G2',
      subtitulo: 'Más usado en agro · 92% consumo campo',
      ambito: 'Zona Núcleo',
      color: 'var(--accent)',
      valor: g2?.nucleo?.promedio,
      mediana: g2?.nucleo?.mediana,
      min: g2?.nucleo?.min,
      max: g2?.nucleo?.max,
      n: g2?.nucleo?.n,
    },
    {
      id: 'g3-n',
      nombre: 'Gasoil G3',
      subtitulo: 'Premium · Euro V',
      ambito: 'Zona Núcleo',
      color: '#4d9ef0',
      valor: g3?.nucleo?.promedio,
      mediana: g3?.nucleo?.mediana,
      min: g3?.nucleo?.min,
      max: g3?.nucleo?.max,
      n: g3?.nucleo?.n,
    },
    {
      id: 'ns-n',
      nombre: 'Nafta Súper',
      subtitulo: '92–95 RON · uso utilitarios',
      ambito: 'Zona Núcleo',
      color: '#56c97a',
      valor: ns?.nucleo?.promedio,
      mediana: ns?.nucleo?.mediana,
      min: ns?.nucleo?.min,
      max: ns?.nucleo?.max,
      n: ns?.nucleo?.n,
    },
    {
      id: 'np-n',
      nombre: 'Nafta Premium',
      subtitulo: '+95 RON · alta compresión',
      ambito: 'Zona Núcleo',
      color: '#c792ea',
      valor: np?.nucleo?.promedio,
      mediana: np?.nucleo?.mediana,
      min: np?.nucleo?.min,
      max: np?.nucleo?.max,
      n: np?.nucleo?.n,
    },
  ];

  const fechaDisplay = fecha
    ? new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : 'vigentes';

  return (
    <div>
      <div className="alert-strip info" style={{ marginBottom: 20 }}>
        <span className="alert-icon">✓</span>
        <span className="alert-text">
          Precios reales en surtidor · <strong>{fuente}</strong> · Vigentes al {fechaDisplay} · Actualización cada hora
        </span>
      </div>

      {/* KPI cards — formato .stat consistente con el resto de la app */}
      <div className="grid grid-4" style={{ marginBottom: 28 }}>
        {cards.map(c => (
          <div key={c.id} className="stat" style={{ cursor: 'default' }}>
            <div className="stat-label">
              <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, flexShrink: 0, display: 'inline-block' }} />
                {c.nombre}
              </span>
              <span className="stat-badge info">{c.ambito}</span>
            </div>
            <div className="stat-val">{fmt(c.valor)}</div>
            <div className="stat-delta fl" style={{ marginBottom: 8 }}>ARS / litro · surtidor real</div>
            <div className="stat-meta">{c.subtitulo}</div>
            {c.mediana != null && (
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--line)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                <div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--text3)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 2 }}>Mediana</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, color: 'var(--white)' }}>{fmt(c.mediana)}</div>
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--text3)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 2 }}>N est.</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>{fmtN(c.n)}</div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {gnc?.pais?.promedio && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--line)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden', marginBottom: 28 }}>
          {[
            { label: 'GNC · Promedio País',   val: fmt(gnc.pais.promedio),  sub: 'ARS/m³' },
            { label: 'GNC · Mediana',         val: fmt(gnc.pais.mediana),   sub: 'ARS/m³' },
            { label: 'GNC · Dispersión',      val: gnc.pais.min != null ? `${fmt(gnc.pais.min)} – ${fmt(gnc.pais.max)}` : '—', sub: `n = ${fmtN(gnc.pais.n)} estaciones` },
          ].map(item => (
            <div key={item.label} style={{ background: 'var(--bg1)', padding: '14px 18px' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 6 }}>{item.label}</div>
              <div style={{ fontFamily: 'var(--display)', fontSize: 20, fontWeight: 700, color: 'var(--white)', marginBottom: 2 }}>{item.val}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)' }}>{item.sub}</div>
            </div>
          ))}
        </div>
      )}

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

      <div style={{ background: 'var(--bg1)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px 12px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text3)' }}>
            Evolución Gasoil G2 · ARS/litro · zona núcleo · últ. 12 meses
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 20, height: 2, background: 'var(--accent)', borderRadius: 1 }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)' }}>Gasoil G2 promedio</span>
          </div>
        </div>
        <GasoilChart data={histGasoil} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--line)', borderTop: '1px solid var(--line)' }}>
          {[
            { label: 'G2 · Zona Núcleo',     val: fmt(g2?.nucleo?.promedio) },
            { label: 'G3 · Zona Núcleo',     val: fmt(g3?.nucleo?.promedio) },
            { label: 'Nafta Súper · Núcleo', val: fmt(ns?.nucleo?.promedio) },
            { label: 'GNC · País',           val: fmt(gnc?.pais?.promedio)  },
          ].map(item => (
            <div key={item.label} style={{ background: 'var(--bg1)', padding: '12px 16px' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)', marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 700, color: 'var(--white)' }}>{item.val}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="source">Fuente: {fuente} · Zona Núcleo: Santa Fe, Córdoba, Bs. As., Entre Ríos, La Pampa</div>
    </div>
  );
}

function GasoilChart({ data }) {
  const W = 900, H = 140, PAD = { t: 10, r: 20, b: 24, l: 52 };
  const iW = W - PAD.l - PAD.r;
  const iH = H - PAD.t - PAD.b;
  const minV = Math.min(...data) * 0.95;
  const maxV = Math.max(...data) * 1.02;
  const range = maxV - minV;
  const toX = i => PAD.l + (i / (data.length - 1)) * iW;
  const toY = v => PAD.t + iH - ((v - minV) / range) * iH;
  const pts  = data.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');
  const area = `${pts} ${toX(data.length - 1)},${H - PAD.b} ${toX(0)},${H - PAD.b}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 140, display: 'block' }}>
      <defs>
        <linearGradient id="gasoil-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="var(--accent)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((t, i) => {
        const y = PAD.t + iH * t;
        const v = Math.round(maxV - t * range);
        return (
          <g key={i}>
            <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="var(--line)" strokeWidth="1" />
            <text x={PAD.l - 6} y={y + 4} textAnchor="end" fontSize="8" fill="var(--text3)" fontFamily="var(--mono)">{(v / 1000).toFixed(1)}k</text>
          </g>
        );
      })}
      {HIST_MESES.map((m, i) => (
        <text key={m} x={toX(i)} y={H - 6} textAnchor="middle" fontSize="8" fill="var(--text3)" fontFamily="var(--mono)">{m}</text>
      ))}
      <polygon points={area} fill="url(#gasoil-grad)" />
      <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinejoin="round" />
      {data.map((v, i) => (
        <circle key={i} cx={toX(i)} cy={toY(v)} r="2.5" fill="var(--accent)" opacity="0.8" />
      ))}
    </svg>
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
  { id: 'fertilizantes', label: 'Fertilizantes' },
  { id: 'combustibles',  label: 'Combustibles' },
  { id: 'relaciones',    label: 'Relaciones I/P' },
];

export function InsumosPage({ goPage }) {
  const [tab,          setTab]          = useState('fertilizantes');
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
