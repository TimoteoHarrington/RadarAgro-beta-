// HaciendaPage.jsx — Redesigned with full API coverage from Downtack PDF
import React, { useState, useEffect } from 'react';
import { fetchHaciendaReal } from '../../services/api';
import {
  HACIENDA_OVERVIEW,
  HACIENDA_NOVILLOS, HACIENDA_NOVILLITOS, HACIENDA_VAQUILLONAS,
  HACIENDA_VACAS, HACIENDA_TOROS, HACIENDA_MEJORES,
  HACIENDA_CANUELAS, HACIENDA_ROSGAN,
  HIST_MESES_HAC,
  HIST_NOVILLO_ESP, HIST_NOVILLITO_ESP, HIST_VAQUILLONA, HIST_VACA_ESP, HIST_ROSGAN_INV,
} from '../../data/hacienda.js';

// ── Helpers ──────────────────────────────────────────────────
const fmtARS  = v => '$\u00a0' + v.toLocaleString('es-AR');
const fmtPct  = v => (v === 0 ? '= 0%' : (v > 0 ? '+' : '') + v.toFixed(1) + '%');
const dirOf   = v => v > 0 ? 'up' : v < 0 ? 'dn' : 'fl';

function Pill({ d, children }) {
  return <span className={`pill ${d}`}>{children}</span>;
}

// ── Mini Line Chart ──────────────────────────────────────────
function MiniLineChart({ series, labels, height = 200 }) {
  const w = 900, h = height;
  const pad = { t: 14, r: 20, b: 28, l: 58 };
  const allVals = series.flatMap(s => s.data).filter(Number.isFinite);
  const minV = Math.min(...allVals);
  const maxV = Math.max(...allVals);
  const rangeV = maxV - minV || 1;
  const n = labels.length;
  const xPos = i => pad.l + (i / (n - 1)) * (w - pad.l - pad.r);
  const yPos = v => pad.t + (1 - (v - minV) / rangeV) * (h - pad.t - pad.b);
  const mkPath = data => data.map((v, i) => `${i === 0 ? 'M' : 'L'}${xPos(i).toFixed(1)},${yPos(v).toFixed(1)}`).join(' ');
  const mkArea = data => {
    const base = yPos(minV);
    return mkPath(data) + ` L${xPos(n-1).toFixed(1)},${base} L${xPos(0).toFixed(1)},${base} Z`;
  };
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height, display: 'block' }}>
      {[0, 0.25, 0.5, 0.75, 1].map(t => {
        const y = pad.t + (1 - t) * (h - pad.t - pad.b);
        const v = minV + t * rangeV;
        return (
          <g key={t}>
            <line x1={pad.l} y1={y} x2={w - pad.r} y2={y} stroke="var(--line)" strokeWidth="1" />
            <text x={pad.l - 6} y={y + 4} textAnchor="end" fontSize={8} fill="var(--text3)" fontFamily="monospace">{Math.round(v).toLocaleString('es-AR')}</text>
          </g>
        );
      })}
      {labels.map((l, i) => (
        <text key={i} x={xPos(i)} y={h - 4} textAnchor="middle" fontSize={8} fill="var(--text3)" fontFamily="monospace">{l}</text>
      ))}
      {series.map(s => (
        <g key={s.label}>
          <path d={mkArea(s.data)} fill={s.color} opacity={0.07} />
          <path d={mkPath(s.data)} fill="none" stroke={s.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={xPos(n-1)} cy={yPos(s.data[n-1])} r={3} fill={s.color} />
        </g>
      ))}
    </svg>
  );
}

// ── Tabla estándar de hacienda ────────────────────────────────
function HacTable({ rows }) {
  return (
    <div className="tbl-wrap" style={{ marginBottom: 24 }}>
      <table>
        <thead>
          <tr>
            <th>Categoría</th>
            <th className="r">Mín. ARS/kg</th>
            <th className="r">Máx. ARS/kg</th>
            <th className="r">Promedio</th>
            <th className="r">Sem. anterior</th>
            <th className="r">Var. %</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.categoria}>
              <td className="bold">{row.categoria}</td>
              <td className="r mono">{fmtARS(row.minimo)}</td>
              <td className="r mono">{fmtARS(row.maximo)}</td>
              <td className="r w mono">{fmtARS(row.promedio)}</td>
              <td className="r dim mono">{fmtARS(row.semAnterior)}</td>
              <td className="r"><Pill d={row.varDir}>{fmtPct(row.varPct)}</Pill></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Overview cards ───────────────────────────────────────────
// Usa la API real del MAGyP cuando está disponible; cae al mock si no.
function OverviewCards({ apiData, apiReady }) {
  const fmt = v => '$\u00a0' + Math.round(v).toLocaleString('es-AR');

  // Si la API devolvió datos, sobreescribimos los mocks de INSC/novillo/ternero/vaca
  const precios = apiData?.precios ?? {};

  const items = HACIENDA_OVERVIEW.map(item => {
    let precio = item.precio;
    let varPct  = item.var;
    let fuente  = item.fuente;
    let esReal  = false;

    // Mapeo id del mock → clave de la API
    const apiKeyMap = {
      novillo:    precios.novillo     ?? precios.insc,
      novillito:  precios.novillo,
      vaquillona: precios.vaquillona,
      vaca:       precios.vaca_conserva,
    };

    const apiVal = apiKeyMap[item.id];
    if (apiReady && apiVal?.valor) {
      precio  = apiVal.valor;
      varPct  = apiVal.varSemana ?? apiVal.varDia ?? 0;
      fuente  = 'MAGyP · SIO Carnes · real';
      esReal  = true;
    }

    return { ...item, precio, var: varPct, fuente, esReal };
  });

  return (
    <div>
      {/* Badge de estado de datos */}
      <div className="alert-strip info" style={{ marginBottom: 16 }}>
        <span className="alert-icon">{apiReady ? (apiData ? '✓' : '!') : '…'}</span>
        <span className="alert-text">
          {!apiReady
            ? 'Consultando MAGyP · SIO Carnes…'
            : apiData
              ? <>Indicadores económicos <strong>reales</strong> · MAGyP · SIO Carnes · {apiData.fecha ?? 'último disponible'}</>
              : 'Sin conexión con MAGyP — mostrando datos de referencia (mock)'}
        </span>
      </div>

      <div className="grid grid-3" style={{ marginBottom: 28 }}>
        {items.map(item => {
          const d = dirOf(item.var);
          const varTxt = (item.var > 0 ? '+' : '') + item.var.toFixed(1).replace('.', ',') + '%';
          return (
            <div key={item.id} className="stat" style={{ cursor: 'default' }}>
              <div style={{ fontSize: '14px', fontWeight: 400, color: 'var(--text2)', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span>{item.nombre}</span>
                {item.esReal && (
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--green)', background: 'var(--green-bg)', padding: '2px 6px', borderRadius: 4 }}>LIVE</span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
                <div className="stat-val" style={{ fontSize: '22px', marginBottom: 0 }}>{fmtARS(item.precio)}</div>
                <span style={{
                  fontFamily: 'var(--mono)', fontSize: '11px', fontWeight: 600,
                  color:      d === 'up' ? 'var(--green)' : d === 'dn' ? 'var(--red)' : 'var(--text3)',
                  background: d === 'up' ? 'var(--green-bg)' : d === 'dn' ? 'var(--red-bg)' : 'transparent',
                  padding:    d === 'fl' ? '0' : '2px 8px',
                  borderRadius: '4px',
                }}>
                  {varTxt}
                </span>
              </div>
              <div className="stat-meta">{item.subcategoria} · {item.unidad}</div>
              <div className="stat-meta" style={{ marginTop: 2 }}>Fuente: {item.fuente}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── TAB: Faena ───────────────────────────────────────────────
function TabFaena() {
  return (
    <div className="section">
      <div className="alert-strip info" style={{ marginBottom: 20 }}>
        <span className="alert-icon">ℹ</span>
        <span className="alert-text">
          Precios expresados como rango <strong>mínimo – máximo</strong> en <strong>ARS/kg vivo</strong> ·
          Fuente: Cañuelas MAG · 30/03/2026 · La variación se calcula sobre el promedio del rango vs. semana anterior
        </span>
      </div>

      <div className="section-title">Novillos</div>
      <HacTable rows={HACIENDA_NOVILLOS} />

      <div className="section-title">Novillitos</div>
      <HacTable rows={HACIENDA_NOVILLITOS} />

      <div className="section-title">Vaquillonas</div>
      <HacTable rows={HACIENDA_VAQUILLONAS} />

      <div className="section-title">Vacas</div>
      <HacTable rows={HACIENDA_VACAS} />

      <div className="section-title">Toros</div>
      <HacTable rows={HACIENDA_TOROS} />

      <div className="section-title">Mejores</div>
      <HacTable rows={HACIENDA_MEJORES} />

      <div className="source">Fuente: Cañuelas MAG · 30/03/2026</div>
    </div>
  );
}

// ── TAB: Cañuelas ────────────────────────────────────────────
function TabCanuelas() {
  const [sel, setSel] = useState('inmag');
  const ind = HACIENDA_CANUELAS.find(c => c.id === sel) || HACIENDA_CANUELAS[0];
  const d = dirOf(ind.var1s);

  return (
    <div>
      <div className="toggle" style={{ marginBottom: 24 }}>
        {HACIENDA_CANUELAS.map(c => (
          <button key={c.id} className={`tg${sel === c.id ? ' active' : ''}`} onClick={() => setSel(c.id)}>
            {c.nombre}
          </button>
        ))}
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, background: 'var(--line)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}>
        {[
          { label: 'Precio actual',    valor: fmtARS(ind.precio),       color: 'var(--white)',  sub: ind.unidad || 'ARS/kg vivo' },
          { label: 'Var. semanal',     valor: fmtPct(ind.var1s),        color: d === 'up' ? 'var(--green)' : d === 'dn' ? 'var(--red)' : 'var(--text3)', sub: 'vs semana anterior' },
          { label: 'Var. mensual',     valor: '+' + ind.var1m + '%',    color: 'var(--accent)', sub: 'vs mes anterior' },
          { label: 'Var. trimestral',  valor: '+' + ind.var3m + '%',    color: 'var(--accent)', sub: 'vs 3 meses atrás' },
        ].map(item => (
          <div key={item.label} style={{ background: 'var(--bg1)', padding: '16px 18px' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>{item.label}</div>
            <div style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 700, color: item.color, letterSpacing: '-.02em' }}>{item.valor}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)', marginTop: 4 }}>{item.sub}</div>
          </div>
        ))}
      </div>

      {/* Description */}
      <div style={{ background: 'var(--bg1)', border: '1px solid var(--line)', borderRadius: 10, padding: '14px 18px', marginBottom: 24, fontSize: 13, color: 'var(--text2)', lineHeight: 1.55 }}>
        <strong style={{ color: 'var(--white)' }}>{ind.nombre}</strong> — {ind.descripcion}
      </div>

      {/* Historical chart */}
      <div style={{ background: 'var(--bg1)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ padding: '14px 20px 12px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text3)' }}>Evolución {ind.nombre} · últimos 12 meses</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 20, height: 2, background: '#56c97a', borderRadius: 1 }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)' }}>{ind.nombre}</span>
          </div>
        </div>
        <MiniLineChart
          series={[{ data: ind.histPrecio, color: '#56c97a', label: ind.nombre }]}
          labels={HIST_MESES_HAC}
          height={180}
        />
      </div>

      {/* Comparativo semana anterior */}
      <div style={{ background: 'var(--bg1)', border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--line)', fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text3)' }}>Comparativo de períodos</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1, background: 'var(--line)' }}>
          {[
            { label: 'Sem. anterior', valor: fmtARS(ind.semAnterior) },
            { label: 'Mes anterior',  valor: fmtARS(ind.mesAnterior) },
            { label: 'Actual',        valor: fmtARS(ind.precio) },
          ].map(item => (
            <div key={item.label} style={{ background: 'var(--bg1)', padding: '12px 16px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)', marginBottom: 6 }}>{item.label}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 700, color: 'var(--white)' }}>{item.valor}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="source" style={{ marginTop: 10 }}>Fuente: Cañuelas MAG · 30/03/2026</div>
    </div>
  );
}

// ── TAB: ROSGAN ──────────────────────────────────────────────
function TabRosgan() {
  const [sel, setSel] = useState('invernada');
  const ind = HACIENDA_ROSGAN.find(r => r.id === sel) || HACIENDA_ROSGAN[0];
  const d = dirOf(ind.var1s);

  return (
    <div>
      <div className="toggle" style={{ marginBottom: 24 }}>
        {HACIENDA_ROSGAN.map(r => (
          <button key={r.id} className={`tg${sel === r.id ? ' active' : ''}`} onClick={() => setSel(r.id)}>
            {r.nombre}
          </button>
        ))}
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, background: 'var(--line)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}>
        {[
          { label: 'Precio actual',   valor: fmtARS(ind.precio),     color: 'var(--white)',  sub: 'ARS/kg vivo' },
          { label: 'Var. semanal',    valor: fmtPct(ind.var1s),      color: d === 'up' ? 'var(--green)' : 'var(--red)', sub: 'vs semana anterior' },
          { label: 'Var. mensual',    valor: '+' + ind.var1m + '%',  color: 'var(--accent)', sub: 'vs mes anterior' },
          { label: 'Var. trimestral', valor: '+' + ind.var3m + '%',  color: 'var(--accent)', sub: 'vs 3 meses atrás' },
        ].map(item => (
          <div key={item.label} style={{ background: 'var(--bg1)', padding: '16px 18px' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>{item.label}</div>
            <div style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 700, color: item.color, letterSpacing: '-.02em' }}>{item.valor}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)', marginTop: 4 }}>{item.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--bg1)', border: '1px solid var(--line)', borderRadius: 10, padding: '14px 18px', marginBottom: 24, fontSize: 13, color: 'var(--text2)', lineHeight: 1.55 }}>
        <strong style={{ color: 'var(--white)' }}>{ind.nombre}</strong> — {ind.descripcion}
      </div>

      {/* Composición si disponible */}
      {ind.composicion && (
        <div style={{ marginBottom: 24 }}>
          <div className="section-title">Composición del índice</div>
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>Categoría</th><th className="r">Peso (%)</th><th className="r">Precio ref. (ARS/kg)</th></tr></thead>
              <tbody>
                {ind.composicion.map(c => (
                  <tr key={c.cat}>
                    <td className="bold">{c.cat}</td>
                    <td className="r mono">{c.peso}%</td>
                    <td className="r w mono">{fmtARS(c.precio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Chart */}
      <div style={{ background: 'var(--bg1)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ padding: '14px 20px 12px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text3)' }}>Evolución {ind.nombre} · últimos 12 meses</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 20, height: 2, background: '#4d9ef0', borderRadius: 1 }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)' }}>{ind.nombre}</span>
          </div>
        </div>
        <MiniLineChart
          series={[{ data: ind.histPrecio, color: '#4d9ef0', label: ind.nombre }]}
          labels={HIST_MESES_HAC}
          height={180}
        />
      </div>

      <div className="source">Fuente: ROSGAN — Bolsa de Comercio de Rosario · 30/03/2026</div>
    </div>
  );
}

// ── TAB: Histórico ────────────────────────────────────────────
function TabHistorico() {
  const series = [
    { data: HIST_NOVILLO_ESP,   color: '#56c97a', label: 'Novillo Esp.' },
    { data: HIST_NOVILLITO_ESP, color: '#4d9ef0', label: 'Novillito Esp.' },
    { data: HIST_VAQUILLONA,    color: '#f0b840', label: 'Vaquillona' },
    { data: HIST_VACA_ESP,      color: '#f07070', label: 'Vaca Esp.' },
    { data: HIST_ROSGAN_INV,    color: '#c792ea', label: 'ROSGAN Inv.' },
  ];

  return (
    <div>
      <div style={{ background: 'var(--bg1)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden', marginBottom: 28 }}>
        <div style={{ padding: '14px 20px 12px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text3)' }}>
            Evolución de precios · ARS/kg vivo · Mar 2025 – Feb 2026
          </div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {series.map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 20, height: 2, background: s.color, borderRadius: 1 }} />
                <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)' }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
        <MiniLineChart series={series} labels={HIST_MESES_HAC} height={240} />
        {/* Stats strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 1, background: 'var(--line)', borderTop: '1px solid var(--line)' }}>
          {series.map(s => {
            const last = s.data[s.data.length - 1];
            const first = s.data[0];
            const varPct = ((last - first) / first * 100).toFixed(1);
            return (
              <div key={s.label} style={{ background: 'var(--bg2)', padding: '10px 12px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--text3)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700, color: s.color }}>{fmtARS(last)}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: varPct > 0 ? 'var(--green)' : 'var(--red)', marginTop: 2 }}>+{varPct}% en 12m</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Comparativa por categoría */}
      <div className="section-title">Comparativa actual por categoría</div>
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>Categoría</th>
              <th className="r">Precio actual (ARS/kg)</th>
              <th className="r">Hace 6 meses</th>
              <th className="r">Var. 6m</th>
              <th className="r">Hace 12 meses</th>
              <th className="r">Var. 12m</th>
            </tr>
          </thead>
          <tbody>
            {series.map(s => {
              const last = s.data[s.data.length - 1];
              const m6   = s.data[6];
              const m12  = s.data[0];
              const v6   = ((last - m6)  / m6  * 100).toFixed(1);
              const v12  = ((last - m12) / m12 * 100).toFixed(1);
              return (
                <tr key={s.label}>
                  <td className="bold">{s.label}</td>
                  <td className="r w mono">{fmtARS(last)}</td>
                  <td className="r dim mono">{fmtARS(m6)}</td>
                  <td className="r"><span className={`pill ${parseFloat(v6) >= 0 ? 'up' : 'dn'}`}>{v6 > 0 ? '+' : ''}{v6}%</span></td>
                  <td className="r dim mono">{fmtARS(m12)}</td>
                  <td className="r"><span className={`pill ${parseFloat(v12) >= 0 ? 'up' : 'dn'}`}>{v12 > 0 ? '+' : ''}{v12}%</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="source">Fuente: Cañuelas MAG · ROSGAN · BCR · 30/03/2026</div>
    </div>
  );
}

// ── Main HaciendaPage ────────────────────────────────────────
const TABS = [
  { id: 'faena',     label: 'Faena' },
  { id: 'canuelas',  label: 'Cañuelas' },
  { id: 'rosgan',    label: 'ROSGAN' },
  { id: 'historico', label: 'Histórico' },
];

export function HaciendaPage({ goPage }) {
  const [activeTab,   setActiveTab]   = useState('faena');
  const [apiData,     setApiData]     = useState(null);
  const [apiReady,    setApiReady]    = useState(false);

  useEffect(() => {
    fetchHaciendaReal()
      .then(({ data: d }) => { if (d?.precios) setApiData(d); })
      .finally(() => setApiReady(true));
  }, []);

  return (
    <div className="page-enter">
      <div className="ph">
        <div>
          <div className="ph-title">Hacienda <span className="help-pip" onClick={() => goPage('ayuda', 'glosario-hacienda')} title="Ayuda">?</span></div>
          <div className="ph-sub">Novillos · Novillitos · Vacas · Vaquillonas · Toros · Cañuelas INMAG/IGMAG · ROSGAN</div>
        </div>
        <div className="ph-right">
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)', letterSpacing: '.06em' }}>
            {apiReady
              ? (apiData ? 'LIVE · MAGyP · SIO Carnes' : 'FALLBACK · sin conexión')
              : 'cargando…'}
          </div>
        </div>
      </div>

      <OverviewCards apiData={apiData} apiReady={apiReady} />

      <div className="tabs">
        {TABS.map(t => (
          <button key={t.id} className={`tab${activeTab === t.id ? ' active' : ''}`} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div>
        {activeTab === 'faena'     && <TabFaena />}
        {activeTab === 'canuelas'  && <TabCanuelas />}
        {activeTab === 'rosgan'    && <TabRosgan />}
        {activeTab === 'historico' && <TabHistorico />}
      </div>
    </div>
  );
}
