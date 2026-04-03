// IndicesPage.jsx — Relaciones de precios con graficos SVG y datos mock
import React from 'react';

// Mock historico 24 meses
const MESES_IDX = [
  'Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic','Ene','Feb',
  'Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic','Ene','Feb',
];

const FEEDLOT_DATA  = [14.2,14.8,15.1,15.4,15.0,14.6,15.3,16.0,16.8,17.2,17.8,18.0,17.5,17.9,18.4,18.0,17.6,18.2,19.0,19.4,19.1,19.5,19.8,19.8];
const CRIA_DATA     = [1.22,1.24,1.27,1.25,1.26,1.28,1.27,1.29,1.28,1.30,1.31,1.32,1.31,1.30,1.33,1.34,1.32,1.33,1.35,1.34,1.36,1.37,1.36,1.37];
const SOJAUREA_DATA = [1.18,1.15,1.12,1.14,1.11,1.08,1.06,1.04,1.02,1.01,0.99,0.97,0.98,0.97,0.96,0.95,0.94,0.97,0.97,0.96,0.94,0.95,0.97,0.94];
const MAIZ_SOJA     = [0.510,0.515,0.520,0.525,0.530,0.528,0.534,0.536,0.540,0.545,0.548,0.550,0.548,0.544,0.547,0.549,0.551,0.546,0.542,0.548,0.550,0.552,0.548,0.552];
const TRIGO_MAIZ    = [0.960,0.965,0.970,0.975,0.978,0.980,0.982,0.985,0.984,0.986,0.990,0.994,0.992,0.988,0.984,0.986,0.990,0.992,0.990,0.988,0.984,0.990,0.994,0.986];
const GASOIL_SOJA   = [310,318,325,332,338,341,345,350,354,358,360,362,358,355,358,360,362,360,362,363,362,364,365,365];

// SVG line chart
function LineChart({ data, color, threshold, height, yMin, yMax, formatY }) {
  const H = height || 200;
  const W = 860;
  const PAD = { t: 28, r: 24, b: 32, l: 52 };
  const iW = W - PAD.l - PAD.r;
  const iH = H - PAD.t - PAD.b;
  const dMin = Math.min(...data);
  const dMax = Math.max(...data);
  const buf = (dMax - dMin) * 0.15 || 0.05;
  const vMin = yMin != null ? yMin : dMin - buf;
  const vMax = yMax != null ? yMax : dMax + buf;
  const range = vMax - vMin || 1;
  const toX = (i) => PAD.l + (i / (data.length - 1)) * iW;
  const toY = (v) => PAD.t + iH - ((v - vMin) / range) * iH;
  const pts = data.map((v, i) => toX(i) + ',' + toY(v)).join(' ');
  const ab = H - PAD.b;
  const area = toX(0) + ',' + toY(data[0]) + ' ' + pts + ' ' + toX(data.length - 1) + ',' + ab + ' ' + toX(0) + ',' + ab;
  const ticks = [];
  for (let i = 0; i <= 4; i++) {
    ticks.push({ y: toY(vMin + (range / 4) * i), v: vMin + (range / 4) * i });
  }
  const thY = threshold != null ? toY(threshold) : null;
  const lastX = toX(data.length - 1);
  const lastY = toY(data[data.length - 1]);
  const fmt = formatY || ((v) => v.toFixed(2));
  const uid = 'lg' + color.replace(/[^a-zA-Z0-9]/g, '');
  return (
    <svg viewBox={'0 0 ' + W + ' ' + H} style={{ width: '100%', height: H, display: 'block' }}>
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {ticks.map(({ y, v }, i) => (
        <g key={i}>
          <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y}
            stroke="rgba(255,255,255,0.05)" strokeWidth="1"
            strokeDasharray={i === 0 ? undefined : '3,5'} />
          <text x={PAD.l - 6} y={y + 3} textAnchor="end" fontSize="9"
            fill="rgba(154,176,196,0.7)" fontFamily="var(--mono)">{fmt(v)}</text>
        </g>
      ))}
      {MESES_IDX.map((m, i) => {
        if (i % 4 !== 0 && i !== data.length - 1) return null;
        return (
          <text key={i} x={toX(i)} y={H - 6} textAnchor="middle" fontSize="9"
            fill="rgba(154,176,196,0.65)" fontFamily="var(--mono)">{m}</text>
        );
      })}
      <polygon points={area} fill={'url(#' + uid + ')'} />
      {thY != null && (
        <line x1={PAD.l} y1={thY} x2={W - PAD.r} y2={thY}
          stroke="rgba(255,255,255,0.30)" strokeWidth="1.5" strokeDasharray="6,4" />
      )}
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2"
        strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lastX} cy={lastY} r="4.5" fill={color} />
      <circle cx={lastX} cy={lastY} r="8" fill="none"
        stroke={color} strokeWidth="1.5" strokeOpacity="0.3" />
      <text x={lastX - 10} y={lastY - 12} textAnchor="end" fontSize="10"
        fontWeight="700" fill={color} fontFamily="var(--mono)">{fmt(data[data.length - 1])}</text>
    </svg>
  );
}

function MultiLineChart({ series, height, formatY }) {
  const H = height || 200;
  const W = 860;
  const PAD = { t: 24, r: 24, b: 32, l: 52 };
  const iW = W - PAD.l - PAD.r;
  const iH = H - PAD.t - PAD.b;
  const allV = series.flatMap((s) => s.data);
  const dMin = Math.min(...allV);
  const dMax = Math.max(...allV);
  const buf = (dMax - dMin) * 0.12 || 0.05;
  const vMin = dMin - buf;
  const vMax = dMax + buf;
  const range = vMax - vMin || 1;
  const n = series[0].data.length;
  const toX = (i) => PAD.l + (i / (n - 1)) * iW;
  const toY = (v) => PAD.t + iH - ((v - vMin) / range) * iH;
  const ticks = [];
  for (let i = 0; i <= 4; i++) {
    ticks.push({ y: toY(vMin + (range / 4) * i), v: vMin + (range / 4) * i });
  }
  const fmt = formatY || ((v) => v.toFixed(3));
  return (
    <svg viewBox={'0 0 ' + W + ' ' + H} style={{ width: '100%', height: H, display: 'block' }}>
      {ticks.map(({ y, v }, i) => (
        <g key={i}>
          <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y}
            stroke="rgba(255,255,255,0.05)" strokeWidth="1"
            strokeDasharray={i === 0 ? undefined : '3,5'} />
          <text x={PAD.l - 6} y={y + 3} textAnchor="end" fontSize="9"
            fill="rgba(154,176,196,0.7)" fontFamily="var(--mono)">{fmt(v)}</text>
        </g>
      ))}
      {MESES_IDX.map((m, i) => {
        if (i % 4 !== 0 && i !== n - 1) return null;
        return (
          <text key={i} x={toX(i)} y={H - 6} textAnchor="middle" fontSize="9"
            fill="rgba(154,176,196,0.65)" fontFamily="var(--mono)">{m}</text>
        );
      })}
      {series.map((s, si) => {
        const pts = s.data.map((v, i) => toX(i) + ',' + toY(v)).join(' ');
        const lx = toX(s.data.length - 1);
        const ly = toY(s.data[s.data.length - 1]);
        return (
          <g key={si}>
            <polyline points={pts} fill="none" stroke={s.color} strokeWidth="1.8"
              strokeLinejoin="round" strokeLinecap="round" opacity="0.9" />
            <circle cx={lx} cy={ly} r="3.5" fill={s.color} />
          </g>
        );
      })}
    </svg>
  );
}

function ChartPanel({ title, legend, children, stats, footer }) {
  return (
    <div style={{ background: 'var(--bg1)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px 10px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text3)' }}>{title}</div>
        {legend && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            {legend.map(([color, label, dashed]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 20, height: dashed ? 0 : 2, borderTop: dashed ? '1.5px dashed rgba(255,255,255,0.3)' : 'none', background: dashed ? 'none' : color, borderRadius: 1 }} />
                <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text3)' }}>{label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ padding: '12px 20px 8px' }}>{children}</div>
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(' + stats.length + ',1fr)', gap: 1, background: 'var(--line)', borderTop: '1px solid var(--line)' }}>
          {stats.map(([label, val, c]) => (
            <div key={label} style={{ background: 'var(--bg2)', padding: '10px 14px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '8px', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '16px', fontWeight: 700, color: c || 'var(--white)' }}>{val}</div>
            </div>
          ))}
        </div>
      )}
      {footer && <div className="source">{footer}</div>}
    </div>
  );
}

const RELACIONES = [
  { id: 'soja-urea',     label: 'Soja / Urea',      valor: '0,94',  unidad: 'tn soja/tn urea',    barPct: 47, color: 'var(--red)',    status: 'warn', statusLabel: 'bajo presion', nota: 'hace 1m: 0,97',  refPct: 50, desc: 'Umbral saludable: >= 1,0' },
  { id: 'maiz-urea',     label: 'Maiz / Urea',       valor: '0,52',  unidad: 'tn maiz/tn urea',    barPct: 26, color: 'var(--red)',    status: 'warn', statusLabel: 'bajo presion', nota: 'hace 1m: 0,54',  refPct: 50, desc: 'Umbral saludable: >= 0,6' },
  { id: 'trigo-map',     label: 'Trigo / MAP',        valor: '0,43',  unidad: 'tn trigo/tn MAP',     barPct: 21, color: 'var(--red)',    status: 'warn', statusLabel: 'bajo presion', nota: 'hace 1m: 0,45',  refPct: 50, desc: 'Umbral saludable: >= 0,5' },
  { id: 'soja-gasoil',   label: 'Soja / Gasoil',     valor: '365 L', unidad: 'litros/tn soja',     barPct: 73, color: 'var(--accent)', status: 'mid',  statusLabel: 'normal',       nota: 'hace 1m: 362',   refPct: null, desc: 'Litros gasoil por tn de soja a pizarra' },
  { id: 'ternero-gas',   label: 'Ternero / Gasoil',  valor: '5,46 L',unidad: 'litros/kg ternero',  barPct: 55, color: 'var(--accent)', status: 'mid',  statusLabel: 'normal',       nota: 'hace 1m: 5,22',  refPct: null, desc: 'Litros equivalentes por kg ternero al destete' },
  { id: 'novillo-gas',   label: 'Novillo / Gasoil',  valor: '3,82 L',unidad: 'litros/kg novillo',  barPct: 38, color: 'var(--accent)', status: 'mid',  statusLabel: 'normal',       nota: 'hace 1m: 3,74',  refPct: null, desc: 'Litros equivalentes por kg novillo gordo' },
];

export function IndicesPage({ goPage }) {
  return (
    <div className="page-enter">
      <div className="ph">
        <div>
          <div className="ph-title">
            Indices &amp; Precios Relativos{' '}
            <span className="help-pip" onClick={() => goPage('ayuda', 'glosario-indices')} title="Ayuda">?</span>
          </div>
          <div className="ph-sub">Relaciones de precios clave del sector · Rosario spot · Feb 2026</div>
        </div>
      </div>

      {/* Resumen */}
      <div className="section">
        <div className="section-title">Resumen · estado actual</div>
        <div className="grid grid-4">
          <div className="stat c-green">
            <div className="stat-label">Feedlot · Novillo/Maiz <span className="stat-badge up">VIABLE</span></div>
            <div className="stat-val">19,8</div>
            <div className="stat-delta up">+4,8 sobre umbral (15)</div>
            <div className="stat-meta">Promedio historico: 16,4 · Tendencia ↑</div>
          </div>
          <div className="stat c-green">
            <div className="stat-label">Cria · Ternero/Novillo <span className="stat-badge up">POSITIVO</span></div>
            <div className="stat-val">1,37</div>
            <div className="stat-delta up">+0,07 sobre umbral (1,30)</div>
            <div className="stat-meta">Promedio historico: 1,30 · Tendencia →</div>
          </div>
          <div className="stat c-red">
            <div className="stat-label">Soja / Urea <span className="stat-badge dn">PRESION</span></div>
            <div className="stat-val">0,94</div>
            <div className="stat-delta dn">-0,06 bajo umbral (1,0)</div>
            <div className="stat-meta">Promedio historico: 1,10 · Tendencia ↓</div>
          </div>
          <div className="stat c-flat">
            <div className="stat-label">Gasoil / Soja <span className="stat-badge fl">REF</span></div>
            <div className="stat-val">365 L</div>
            <div className="stat-delta dn">+23 L vs anio anterior</div>
            <div className="stat-meta">Litros de gasoil por tonelada de soja producida</div>
          </div>
        </div>
      </div>

      {/* 1. Feedlot */}
      <div className="section">
        <div className="section-title">Feedlot — Novillo / Maiz · kg vivo por tonelada de maiz</div>
        <ChartPanel
          title="Ratio Novillo (ARS/kg) ÷ Maiz (ARS/tn) · ultimos 24 meses"
          legend={[['#56c97a', 'Feedlot'], [null, 'Umbral 15', true]]}
          stats={[['Actual', '19,8', 'var(--green)'], ['Hace 6 meses', '18,4', null], ['Hace 12 meses', '15,2', null], ['Umbral viable', '15,0', 'var(--text3)']]}
          footer="Fuente: MAG Canuelas (novillo) · BCR Rosario (maiz) · datos mock"
        >
          <LineChart data={FEEDLOT_DATA} color="#56c97a" threshold={15} height={200} yMin={12} yMax={22} formatY={(v) => v.toFixed(1)} />
        </ChartPanel>
      </div>

      {/* 2. Cria */}
      <div className="section">
        <div className="section-title">Cria — Ternero / Novillo · ratio de precios</div>
        <ChartPanel
          title="Precio Ternero ÷ Precio Novillo · ultimos 24 meses"
          legend={[['#4d9ef0', 'Ternero/Novillo'], [null, 'Umbral 1,30', true]]}
          stats={[['Actual', '1,37', 'var(--green)'], ['Hace 6 meses', '1,33', null], ['Hace 12 meses', '1,29', null], ['Umbral favorable', '1,30', 'var(--text3)']]}
          footer="Fuente: MAG Canuelas · datos mock"
        >
          <LineChart data={CRIA_DATA} color="#4d9ef0" threshold={1.30} height={200} yMin={1.18} yMax={1.42} formatY={(v) => v.toFixed(2)} />
        </ChartPanel>
      </div>

      {/* 3. Soja/Urea */}
      <div className="section">
        <div className="section-title">Insumos — Soja / Urea · toneladas de soja por tonelada de urea</div>
        <ChartPanel
          title="Precio Soja ÷ Precio Urea · ultimos 24 meses"
          legend={[['#f0b840', 'Soja/Urea'], [null, 'Umbral 1,0', true]]}
          stats={[['Actual', '0,94', 'var(--red)'], ['Hace 6 meses', '0,97', null], ['Hace 12 meses', '1,08', null], ['Umbral rentable', '1,00', 'var(--text3)']]}
          footer="Fuente: BCR Rosario (soja) · zona nucleo (urea) · datos mock"
        >
          <LineChart data={SOJAUREA_DATA} color="#f0b840" threshold={1.0} height={200} yMin={0.88} yMax={1.24} formatY={(v) => v.toFixed(2)} />
        </ChartPanel>
      </div>

      {/* 4. Precios relativos multi-serie */}
      <div className="section">
        <div className="section-title">Precios relativos — Maiz/Soja · Trigo/Maiz · Gasoil/Soja</div>
        <ChartPanel
          title="Ratios de precios entre granos y combustible · ultimos 24 meses"
          legend={[['#56c97a', 'Maiz/Soja'], ['#4d9ef0', 'Trigo/Maiz'], ['#f07070', 'Gasoil/Soja (div 1000 L)']]}
          footer="Fuente: BCR Rosario · YPF / Secretaria de Energia · datos mock"
        >
          <MultiLineChart
            series={[
              { data: MAIZ_SOJA, color: '#56c97a' },
              { data: TRIGO_MAIZ, color: '#4d9ef0' },
              { data: GASOIL_SOJA.map((v) => v / 1000), color: '#f07070' },
            ]}
            height={200}
            formatY={(v) => v.toFixed(3)}
          />
        </ChartPanel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginTop: 12 }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 10, padding: '12px 16px' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '8px', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 6 }}>Maiz / Soja</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '18px', fontWeight: 700, color: 'var(--white)' }}>0,552</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text3)', marginTop: 3 }}>hace 1a: 0,534 · hace 1m: 0,548</div>
            <div style={{ fontSize: '10px', color: 'var(--text2)', marginTop: 4 }}>1 tn maiz = 55% del precio de 1 tn soja</div>
          </div>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 10, padding: '12px 16px' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '8px', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 6 }}>Trigo / Maiz</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '18px', fontWeight: 700, color: 'var(--white)' }}>0,986</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text3)', marginTop: 3 }}>hace 1a: 0,978 · hace 1m: 0,994</div>
            <div style={{ fontSize: '10px', color: 'var(--text2)', marginTop: 4 }}>Paridad casi perfecta · leve caida</div>
          </div>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 10, padding: '12px 16px' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '8px', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 6 }}>Gasoil / Soja</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '18px', fontWeight: 700, color: 'var(--red)' }}>365 L/tn</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text3)', marginTop: 3 }}>hace 1a: 342 L · hace 1m: 358 L</div>
            <div style={{ fontSize: '10px', color: 'var(--text2)', marginTop: 4 }}>Combustible mas caro relativo a la soja</div>
          </div>
        </div>
      </div>

      {/* 5. Relaciones I/P */}
      <div className="section">
        <div className="section-title">Relaciones insumo/producto · poder adquisitivo del campo</div>
        <div className="alert-strip info" style={{ marginBottom: 24 }}>
          <span className="alert-icon">i</span>
          <span className="alert-text">
            Las relaciones insumo/producto miden el <strong>poder adquisitivo del campo</strong>: cuantas unidades de producto (grano, hacienda) se necesitan para comprar una unidad de insumo. Rojo = presion sobre la rentabilidad.
          </span>
        </div>

        <div className="gauge-grid" style={{ marginBottom: 20 }}>
          {RELACIONES.slice(0, 3).map((r) => (
            <div key={r.id} className="gauge-card">
              <div className="gauge-label">{r.label}</div>
              <div className="gauge-val-row">
                <span className="gauge-val" style={{ color: r.color }}>{r.valor}</span>
                <span className="gauge-unit">{r.unidad}</span>
              </div>
              <span className={'gauge-status ' + r.status}>{r.statusLabel}</span>
              <div className="gauge-bar-wrap">
                <div className={'gauge-bar-fill warn'} style={{ width: r.barPct + '%' }} />
                {r.refPct != null && <div className="gauge-bar-ref" style={{ left: r.refPct + '%' }} />}
              </div>
              <div className="gauge-meta">{r.nota} · {r.desc}</div>
            </div>
          ))}
        </div>

        <div className="gauge-grid" style={{ marginBottom: 24 }}>
          {RELACIONES.slice(3).map((r) => (
            <div key={r.id} className="gauge-card">
              <div className="gauge-label">{r.label}</div>
              <div className="gauge-val-row">
                <span className="gauge-val" style={{ color: r.color }}>{r.valor}</span>
                <span className="gauge-unit">{r.unidad}</span>
              </div>
              <span className={'gauge-status ' + r.status}>{r.statusLabel}</span>
              <div className="gauge-bar-wrap">
                <div className={'gauge-bar-fill mid'} style={{ width: r.barPct + '%' }} />
              </div>
              <div className="gauge-meta">{r.nota} · {r.desc}</div>
            </div>
          ))}
        </div>

        <div className="tbl-wrap">
          <div className="tbl-scroll">
            <table>
              <thead>
                <tr>
                  <th>Relacion</th>
                  <th className="r">Valor actual</th>
                  <th className="r">hace 1m</th>
                  <th>Estado</th>
                  <th>Descripcion</th>
                </tr>
              </thead>
              <tbody>
                {RELACIONES.map((r) => (
                  <tr key={r.id}>
                    <td className="bold">{r.label}</td>
                    <td className="r">
                      <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: r.color }}>{r.valor}</span>
                    </td>
                    <td className="r dim mono" style={{ fontSize: 11 }}>{r.nota.replace('hace 1m: ', '')}</td>
                    <td>
                      <span className={'pill ' + (r.status === 'warn' ? 'dn' : r.status === 'mid' ? 'info' : 'fl')}>
                        {r.statusLabel}
                      </span>
                    </td>
                    <td className="dim" style={{ fontSize: 11 }}>{r.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--bg1)', border: '1px solid var(--line)', borderRadius: 8 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6 }}>Metodologia</div>
          <div style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.6 }}>
            Relaciones calculadas sobre precios de pizarra BCR (zona nucleo) y precios YPF al surtidor. La linea punteada en los graficos indica el umbral de referencia historico. Los valores de combustible se calculan en litros por tonelada producida usando el precio del gasoil agro con subsidio.
          </div>
        </div>
        <div className="source">Fuente: BCR Rosario · YPF · Fertilizar AC · datos mock · Feb 2026</div>
      </div>
    </div>
  );
}
