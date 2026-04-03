import React, { useState } from 'react';

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
  },
];

const COMBUSTIBLES = [
  {
    id: 'g2',
    nombre: 'Gasoil G2',
    subtitulo: 'YPF · al surtidor',
    ars: 1247,
    unidad: 'ARS/litro',
    varPct: 0,
    nota: 'Precio bomba sin beneficio agro',
    badge: null,
  },
  {
    id: 'agro',
    nombre: 'Gasoil Agro',
    subtitulo: 'Con beneficio agropecuario',
    ars: 1180,
    unidad: 'ARS/litro',
    varPct: 0,
    nota: 'Subsidio sectorial vigente',
    badge: { label: 'SUBSIDIO', cls: 'info' },
  },
  {
    id: 'usd',
    nombre: 'Gasoil en USD',
    subtitulo: 'Equivalente dólar MEP',
    ars: null,
    usd: 1.00,
    unidad: 'USD/litro',
    varPct: 0,
    nota: '$1.247 / $1.245 MEP',
    badge: null,
  },
  {
    id: 'soja-gasoil',
    nombre: 'Soja / Gasoil',
    subtitulo: 'Relación productiva',
    ars: null,
    valor: '365 L',
    unidad: 'litros / tn de soja',
    varPct: 0.8,
    nota: 'hace 1m: 362 L · +0,8%',
    badge: null,
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

// Mini SVG sparkline
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
      {/* Overview cards */}
      <div className="grid grid-4" style={{ marginBottom: 28 }}>
        {FERTILIZANTES.map(f => {
          const d = dir(f.varPct);
          return (
            <div key={f.id} className={`stat c-${d === 'dn' ? 'red' : d === 'up' ? 'green' : 'flat'}`}>
              <div className="stat-label">
                <span>{f.nombre}</span>
                <span className={`stat-badge ${d}`}>{fmtPct(f.varPct)}</span>
              </div>
              <div className="stat-val">{fmtARS(f.ars)}</div>
              <div className={`stat-delta ${d}`}>
                {f.deltaArs !== 0
                  ? (f.deltaArs > 0 ? '+' : '') + fmtARS(f.deltaArs) + ' hoy'
                  : '= sin cambios'}
              </div>
              <div className="stat-meta">
                {fmtUSD(f.usd)}/tn · Fórmula {f.formula}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabla detallada */}
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
                <th className="r">Tendencia</th>
                <th>Uso</th>
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

      {/* Histórico evolución */}
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

// Mini line chart puro SVG (sin canvas)
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
      {/* Grid lines */}
      {Array.from({ length: gridLines + 1 }).map((_, i) => {
        const y = PAD.t + (iH / gridLines) * i;
        const v = Math.round(maxV - (i / gridLines) * range);
        return (
          <g key={i}>
            <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="var(--line)" strokeWidth="1" />
            <text x={PAD.l - 6} y={y + 4} textAnchor="end" fontSize="8" fill="var(--text3)" fontFamily="var(--mono)">
              {(v / 1000).toFixed(0)}k
            </text>
          </g>
        );
      })}

      {/* Month labels */}
      {HIST_MESES.map((m, i) => (
        <text key={m} x={toX(i)} y={H - 6} textAnchor="middle" fontSize="8" fill="var(--text3)" fontFamily="var(--mono)">{m}</text>
      ))}

      {/* Series lines */}
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

function TabCombustibles() {
  const histGasoil = [840, 870, 920, 980, 1040, 1080, 1120, 1160, 1200, 1230, 1247, 1247];

  return (
    <div>
      <div className="grid grid-4" style={{ marginBottom: 28 }}>
        {COMBUSTIBLES.map(c => {
          const d = dir(c.varPct);
          const valDisplay = c.usd != null
            ? `USD ${c.usd.toFixed(2)}`
            : c.valor != null
              ? c.valor
              : fmtARS(c.ars);
          return (
            <div key={c.id} className="stat c-flat">
              <div className="stat-label">
                <span>{c.nombre}</span>
                {c.badge
                  ? <span className={`stat-badge ${c.badge.cls}`}>{c.badge.label}</span>
                  : <span className={`stat-badge ${d}`}>{fmtPct(c.varPct)}</span>
                }
              </div>
              <div className="stat-val sm">{valDisplay}</div>
              <div className="stat-meta" style={{ marginTop: 6 }}>{c.subtitulo}</div>
              <div className="stat-meta">{c.nota}</div>
            </div>
          );
        })}
      </div>

      {/* Tabla detallada */}
      <div className="section-title">Detalle por variante</div>
      <div className="tbl-wrap" style={{ marginBottom: 28 }}>
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th className="r">Precio</th>
              <th>Unidad</th>
              <th className="r">Var. %</th>
              <th>Referencia</th>
            </tr>
          </thead>
          <tbody>
            {COMBUSTIBLES.map(c => {
              const d = dir(c.varPct);
              const valDisplay = c.usd != null
                ? `USD ${c.usd.toFixed(2)}`
                : c.valor != null
                  ? c.valor
                  : fmtARS(c.ars);
              return (
                <tr key={c.id}>
                  <td className="bold">{c.nombre}</td>
                  <td className="r w mono">{valDisplay}</td>
                  <td className="dim" style={{ fontSize: 11 }}>{c.unidad}</td>
                  <td className="r"><Pill d={d}>{fmtPct(c.varPct)}</Pill></td>
                  <td className="dim" style={{ fontSize: 11 }}>{c.nota}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Evolución gasoil */}
      <div style={{ background: 'var(--bg1)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px 12px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text3)' }}>
            Evolución Gasoil G2 · ARS/litro · Mar 2025 – Feb 2026
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 20, height: 2, background: 'var(--accent)', borderRadius: 1 }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)' }}>Gasoil G2 YPF</span>
          </div>
        </div>
        <GasoilChart data={histGasoil} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--line)', borderTop: '1px solid var(--line)' }}>
          {[
            { label: 'Precio actual', val: '$1.247/L' },
            { label: 'Var. 12 meses', val: '+48,5%' },
            { label: 'En USD (MEP)',   val: 'USD 1,00/L' },
          ].map(item => (
            <div key={item.label} style={{ background: 'var(--bg1)', padding: '12px 16px' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)', marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 700, color: 'var(--white)' }}>{item.val}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="source">Fuente: YPF · Secretaría de Energía · datos mock · Feb 2026</div>
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

      {/* Gauge cards */}
      <div className="gauge-grid" style={{ marginBottom: 28 }}>
        {RELACIONES.slice(0, 3).map(r => (
          <div key={r.id} className="gauge-card">
            <div className="gauge-label">{r.label}</div>
            <div className="gauge-val-row">
              <span className="gauge-val" style={{ color: r.color }}>{r.valor}</span>
              <span className="gauge-unit">{r.unidad}</span>
            </div>
            <span className={`gauge-status ${r.status}`}>{r.statusLabel}</span>
            <div className="gauge-bar-wrap">
              <div className="gauge-bar-fill warn" style={{ width: `${r.barPct}%` }} />
              {r.refPct && <div className="gauge-bar-ref" style={{ left: `${r.refPct}%` }} />}
            </div>
            <div className="gauge-meta">{r.nota}</div>
          </div>
        ))}
      </div>

      <div className="gauge-grid" style={{ marginBottom: 28 }}>
        {RELACIONES.slice(3).map(r => (
          <div key={r.id} className="gauge-card">
            <div className="gauge-label">{r.label}</div>
            <div className="gauge-val-row">
              <span className="gauge-val" style={{ color: r.color }}>{r.valor}</span>
              <span className="gauge-unit">{r.unidad}</span>
            </div>
            <span className={`gauge-status ${r.status}`}>{r.statusLabel}</span>
            <div className="gauge-bar-wrap">
              <div className="gauge-bar-fill mid" style={{ width: `${r.barPct}%` }} />
            </div>
            <div className="gauge-meta">{r.nota}</div>
          </div>
        ))}
        {/* Spacer para mantener la grilla */}
        <div />
      </div>

      {/* Tabla detallada con descripción */}
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

      {/* Nota metodológica */}
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
  const [tab, setTab] = useState('fertilizantes');

  return (
    <div className="page-enter">
      {/* Header */}
      <div className="ph">
        <div>
          <div className="ph-title">
            Insumos
            <span className="help-pip" onClick={() => goPage('ayuda', 'glosario-insumos')} title="Ayuda">?</span>
          </div>
          <div className="ph-sub">Fertilizantes · Combustibles · Relaciones insumo/producto · Feb 2026</div>
        </div>
        <div className="ph-right">
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)', letterSpacing: '.06em' }}>
            MOCK DATA · zona núcleo
          </div>
        </div>
      </div>

      {/* KPIs resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--line)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden', marginBottom: 28 }}>
        {[
          { label: 'Urea Gran.',   val: '$484.000', delta: '−1,6% hoy', cls: 'dn', sub: 'ARS/tn · zona núcleo' },
          { label: 'Gasoil G2',   val: '$1.247',   delta: '= sin cambios', cls: 'fl', sub: 'ARS/litro · YPF' },
          { label: 'Soja/Urea',   val: '0,94',     delta: 'bajo umbral 1,0', cls: 'dn', sub: 'tn soja/tn urea' },
          { label: 'Maíz/Urea',   val: '0,52',     delta: 'hace 1m: 0,54', cls: 'dn', sub: 'tn maíz/tn urea' },
        ].map(item => (
          <div key={item.label} style={{ background: 'var(--bg1)', padding: '14px 18px' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 8 }}>{item.label}</div>
            <div style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 700, color: 'var(--white)', letterSpacing: '-.02em', lineHeight: 1, marginBottom: 4 }}>{item.val}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: item.cls === 'dn' ? 'var(--red)' : item.cls === 'up' ? 'var(--green)' : 'var(--text3)' }}>{item.delta}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)', marginTop: 2 }}>{item.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
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

      {/* Tab content */}
      <div className="section">
        {tab === 'fertilizantes' && <TabFertilizantes />}
        {tab === 'combustibles'  && <TabCombustibles />}
        {tab === 'relaciones'    && <TabRelaciones />}
      </div>
    </div>
  );
}
