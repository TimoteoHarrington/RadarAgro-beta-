// HaciendaPage.jsx — 100% live · MAGyP / SIO Carnes · datos.gob.ar
// Sin mocks: si la API falla, la sección no muestra datos.
import React, { useState, useEffect } from 'react';
import { fetchHaciendaReal } from '../../services/api';

// ── Helpers ──────────────────────────────────────────────────
const fmtARS = v => v == null ? '—' : '$\u00a0' + Math.round(v).toLocaleString('es-AR');
const fmtPct = v => v == null ? '—' : (v > 0 ? '+' : '') + v.toFixed(1).replace('.', ',') + '%';
const dirOf  = v => v == null ? 'fl' : v > 0 ? 'up' : v < 0 ? 'dn' : 'fl';

function Pill({ v }) {
  const d = dirOf(v);
  return <span className={`pill ${d}`}>{fmtPct(v)}</span>;
}

// ── Sparkline SVG inline ──────────────────────────────────────
function Spark({ data, color = 'var(--accent)' }) {
  if (!data || data.length < 2) return null;
  const W = 80, H = 32;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * W},${H - ((v - min) / range) * (H - 4) - 2}`)
    .join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: 64, height: 28, display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ── Mini Line Chart (histórico 30d) ──────────────────────────
function LineChart30({ data, color = 'var(--accent)', label = '' }) {
  if (!data || data.length < 2) return null;
  const W = 900, H = 160;
  const pad = { t: 12, r: 20, b: 28, l: 62 };
  const iW = W - pad.l - pad.r, iH = H - pad.t - pad.b;
  const min = Math.min(...data) * 0.98;
  const max = Math.max(...data) * 1.01;
  const range = max - min || 1;
  const toX = i => pad.l + (i / (data.length - 1)) * iW;
  const toY = v => pad.t + iH - ((v - min) / range) * iH;
  const pts  = data.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');
  const area = `${pts} ${toX(data.length - 1)},${H - pad.b} ${toX(0)},${H - pad.b}`;
  const ticks = 4;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, display: 'block' }}>
      <defs>
        <linearGradient id={`hac-grad-${label}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {Array.from({ length: ticks + 1 }).map((_, i) => {
        const y = pad.t + (iH / ticks) * i;
        const v = Math.round(max - (i / ticks) * range);
        return (
          <g key={i}>
            <line x1={pad.l} y1={y} x2={W - pad.r} y2={y} stroke="var(--line)" strokeWidth="1" />
            <text x={pad.l - 6} y={y + 4} textAnchor="end" fontSize="8"
              fill="var(--text3)" fontFamily="var(--mono)">{v.toLocaleString('es-AR')}</text>
          </g>
        );
      })}
      {/* Etiquetas día: cada 5 puntos */}
      {data.map((_, i) => {
        if (i % 5 !== 0 && i !== data.length - 1) return null;
        const label = `d-${data.length - 1 - i}`;
        return (
          <text key={i} x={toX(i)} y={H - 6} textAnchor="middle"
            fontSize="7" fill="var(--text3)" fontFamily="var(--mono)">{label}</text>
        );
      })}
      <polygon points={area} fill={`url(#hac-grad-${label})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" />
      {/* Punto final */}
      <circle cx={toX(data.length - 1)} cy={toY(data[data.length - 1])}
        r="3" fill={color} />
    </svg>
  );
}

// ── Estado de carga / error ───────────────────────────────────
function LoadingState() {
  return (
    <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text3)',
      fontFamily: 'var(--mono)', fontSize: 11 }}>
      Consultando MAGyP · SIO Carnes · datos.gob.ar…
    </div>
  );
}

function ErrorState({ msg }) {
  return (
    <div className="alert-strip" style={{ margin: '24px 0' }}>
      <span className="alert-icon">!</span>
      <span className="alert-text">
        Sin datos de hacienda · {msg ?? 'No se pudo conectar con datos.gob.ar'}
      </span>
    </div>
  );
}

// ── Categorías que mostramos ──────────────────────────────────
const CATS = [
  { key: 'insc',          label: 'INSC · Índice Novillo',  color: '#56c97a', unidad: 'ARS/kg (índice)' },
  { key: 'novillo',       label: 'Novillo',                color: '#4d9ef0', unidad: 'ARS/kg vivo' },
  { key: 'ternero',       label: 'Ternero',                color: '#f0b840', unidad: 'ARS/kg vivo' },
  { key: 'vaca_conserva', label: 'Vaca Conserva',          color: '#f07070', unidad: 'ARS/kg vivo' },
  { key: 'vaquillona',    label: 'Vaquillona',             color: '#c792ea', unidad: 'ARS/kg vivo' },
];

// ── Tab: Indicadores ──────────────────────────────────────────
function TabIndicadores({ data }) {
  const { precios, hist30, fecha, fuente } = data;

  const fechaDisplay = fecha
    ? new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : 'último disponible';

  return (
    <div>
      <div className="alert-strip info" style={{ marginBottom: 20 }}>
        <span className="alert-icon">✓</span>
        <span className="alert-text">
          Datos reales · <strong>{fuente}</strong> · {fechaDisplay} · Actualización diaria (días hábiles)
        </span>
      </div>

      {/* KPI cards */}
      <div className="grid grid-3" style={{ marginBottom: 28 }}>
        {CATS.map(cat => {
          const p = precios[cat.key];
          if (!p) return null;
          const dD = dirOf(p.varDia);
          const dS = dirOf(p.varSemana);
          return (
            <div key={cat.key} className="stat" style={{ cursor: 'default' }}>
              <div style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text2)',
                marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{cat.label}</span>
                <span style={{ width: 8, height: 8, borderRadius: '50%',
                  background: cat.color, display: 'inline-block' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10,
                flexWrap: 'wrap', marginBottom: 8 }}>
                <div className="stat-val" style={{ fontSize: 22, marginBottom: 0 }}>
                  {fmtARS(p.valor)}
                </div>
                {p.varDia != null && (
                  <span style={{
                    fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600,
                    color: dD === 'up' ? 'var(--green)' : dD === 'dn' ? 'var(--red)' : 'var(--text3)',
                    background: dD === 'up' ? 'var(--green-bg)' : dD === 'dn' ? 'var(--red-bg)' : 'transparent',
                    padding: dD === 'fl' ? 0 : '2px 8px', borderRadius: 4,
                  }}>
                    {fmtPct(p.varDia)} día
                  </span>
                )}
              </div>
              <div className="stat-meta">{cat.unidad}</div>
              {p.varSemana != null && (
                <div className="stat-meta" style={{ marginTop: 2 }}>
                  Semana: <span style={{ color: dS === 'up' ? 'var(--green)' : dS === 'dn' ? 'var(--red)' : 'var(--text3)' }}>
                    {fmtPct(p.varSemana)}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Tabla resumen */}
      <div className="section-title">Resumen · ARS/kg</div>
      <div className="tbl-wrap" style={{ marginBottom: 28 }}>
        <table>
          <thead>
            <tr>
              <th>Categoría</th>
              <th className="r">Precio</th>
              <th className="r">Var. día</th>
              <th className="r">Var. semana</th>
              <th className="r">Tendencia 30d</th>
              <th>Unidad</th>
            </tr>
          </thead>
          <tbody>
            {CATS.map(cat => {
              const p = precios[cat.key];
              if (!p) return null;
              return (
                <tr key={cat.key}>
                  <td className="bold" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%',
                      background: cat.color, display: 'inline-block', flexShrink: 0 }} />
                    {cat.label}
                  </td>
                  <td className="r w mono">{fmtARS(p.valor)}</td>
                  <td className="r"><Pill v={p.varDia} /></td>
                  <td className="r"><Pill v={p.varSemana} /></td>
                  <td className="r">
                    <Spark data={hist30[cat.key]} color={cat.color} />
                  </td>
                  <td className="dim" style={{ fontSize: 11 }}>{cat.unidad}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="source">Fuente: {fuente} · Actualización diaria (días hábiles)</div>
    </div>
  );
}

// ── Tab: Histórico 30 días ────────────────────────────────────
function TabHistorico({ data }) {
  const { hist30, precios, fuente } = data;
  const [sel, setSel] = useState('insc');

  const cat    = CATS.find(c => c.key === sel) ?? CATS[0];
  const hdata  = hist30[sel] ?? [];
  const p      = precios[sel];

  // Variación del período completo
  const varPeriodo = hdata.length >= 2
    ? ((hdata[hdata.length - 1] - hdata[0]) / hdata[0] * 100)
    : null;

  return (
    <div>
      {/* Selector de categoría */}
      <div className="toggle" style={{ marginBottom: 24 }}>
        {CATS.filter(c => hist30[c.key]?.length > 1).map(c => (
          <button key={c.key} className={`tg${sel === c.key ? ' active' : ''}`}
            onClick={() => setSel(c.key)}>
            {c.label}
          </button>
        ))}
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1,
        background: 'var(--line)', border: '1px solid var(--line)',
        borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}>
        {[
          { label: 'Precio actual',    val: fmtARS(p?.valor),          color: 'var(--white)',  sub: cat.unidad },
          { label: 'Var. día',         val: fmtPct(p?.varDia),         color: p?.varDia  > 0 ? 'var(--green)' : p?.varDia  < 0 ? 'var(--red)' : 'var(--text3)', sub: 'vs día anterior' },
          { label: 'Var. semana',      val: fmtPct(p?.varSemana),      color: p?.varSemana > 0 ? 'var(--green)' : p?.varSemana < 0 ? 'var(--red)' : 'var(--text3)', sub: 'vs hace 7 días' },
          { label: 'Var. período 30d', val: varPeriodo != null ? fmtPct(varPeriodo) : '—', color: varPeriodo > 0 ? 'var(--green)' : varPeriodo < 0 ? 'var(--red)' : 'var(--text3)', sub: `${hdata.length} datos disponibles` },
        ].map(item => (
          <div key={item.label} style={{ background: 'var(--bg1)', padding: '16px 18px' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)',
              letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>{item.label}</div>
            <div style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 700,
              color: item.color, letterSpacing: '-.02em' }}>{item.val}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)', marginTop: 4 }}>{item.sub}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      {hdata.length > 1 ? (
        <div style={{ background: 'var(--bg1)', border: '1px solid var(--line)',
          borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ padding: '14px 20px 12px', borderBottom: '1px solid var(--line)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.12em',
              textTransform: 'uppercase', color: 'var(--text3)' }}>
              {cat.label} · ARS/kg · últimos {hdata.length} días hábiles
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 20, height: 2, background: cat.color, borderRadius: 1 }} />
              <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)' }}>{cat.label}</span>
            </div>
          </div>
          <LineChart30 data={hdata} color={cat.color} label={sel} />
          {/* Min / Max / Último */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1,
            background: 'var(--line)', borderTop: '1px solid var(--line)' }}>
            {[
              { label: 'Mínimo 30d',  val: fmtARS(Math.min(...hdata)) },
              { label: 'Máximo 30d',  val: fmtARS(Math.max(...hdata)) },
              { label: 'Último',      val: fmtARS(hdata[hdata.length - 1]) },
            ].map(item => (
              <div key={item.label} style={{ background: 'var(--bg1)', padding: '12px 16px' }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)', marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 700, color: 'var(--white)' }}>{item.val}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text3)',
          fontFamily: 'var(--mono)', fontSize: 11 }}>
          Sin suficientes datos históricos para {cat.label}
        </div>
      )}

      {/* Tabla comparativa todas las categorías */}
      <div className="section-title">Comparativa entre categorías · dato más reciente</div>
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>Categoría</th>
              <th className="r">Precio actual</th>
              <th className="r">Var. día</th>
              <th className="r">Var. semana</th>
              <th className="r">Mín. 30d</th>
              <th className="r">Máx. 30d</th>
            </tr>
          </thead>
          <tbody>
            {CATS.map(cat => {
              const p = precios[cat.key];
              const h = hist30[cat.key] ?? [];
              if (!p) return null;
              return (
                <tr key={cat.key}>
                  <td className="bold" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%',
                      background: cat.color, flexShrink: 0, display: 'inline-block' }} />
                    {cat.label}
                  </td>
                  <td className="r w mono">{fmtARS(p.valor)}</td>
                  <td className="r"><Pill v={p.varDia} /></td>
                  <td className="r"><Pill v={p.varSemana} /></td>
                  <td className="r dim mono">{h.length ? fmtARS(Math.min(...h)) : '—'}</td>
                  <td className="r dim mono">{h.length ? fmtARS(Math.max(...h)) : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="source">Fuente: {fuente} · Actualización diaria (días hábiles)</div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────
const TABS = [
  { id: 'indicadores', label: 'Indicadores' },
  { id: 'historico',   label: 'Histórico 30d' },
];

export function HaciendaPage({ goPage }) {
  const [activeTab, setActiveTab] = useState('indicadores');
  const [data,      setData]      = useState(null);   // null = cargando, false = error
  const [loading,   setLoading]   = useState(true);
  const [errMsg,    setErrMsg]    = useState(null);

  useEffect(() => {
    fetchHaciendaReal()
      .then(({ data: d, error: e }) => {
        if (e || !d?.ok || !d?.precios) {
          setErrMsg(e ?? d?.error ?? 'Sin datos');
          setData(null);
        } else {
          setData(d);
        }
      })
      .catch(e => setErrMsg(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Precios de overview para el header (hasta que cargan: '…')
  const p = data?.precios;
  const fmtH = v => v == null ? '…' : '$\u00a0' + Math.round(v).toLocaleString('es-AR');

  return (
    <div className="page-enter">
      {/* Header */}
      <div className="ph">
        <div>
          <div className="ph-title">
            Hacienda
            <span className="help-pip" onClick={() => goPage('ayuda', 'glosario-hacienda')} title="Ayuda">?</span>
          </div>
          <div className="ph-sub">
            INSC · Novillo · Ternero · Vaca Conserva · Vaquillona · MAGyP · SIO Carnes
          </div>
        </div>
        <div className="ph-right">
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)', letterSpacing: '.06em' }}>
            {loading ? 'cargando…' : data ? 'LIVE · MAGyP · SIO Carnes' : 'SIN DATOS · API no disponible'}
          </div>
        </div>
      </div>

      {/* KPI strip del header — siempre visible */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 1,
        background: 'var(--line)', border: '1px solid var(--line)',
        borderRadius: 12, overflow: 'hidden', marginBottom: 28 }}>
        {CATS.map(cat => {
          const pr = p?.[cat.key];
          const d = dirOf(pr?.varDia);
          return (
            <div key={cat.key} style={{ background: 'var(--bg1)', padding: '14px 16px' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.08em',
                textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 8,
                display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%',
                  background: cat.color, display: 'inline-block' }} />
                {cat.label}
              </div>
              <div style={{ fontFamily: 'var(--display)', fontSize: 18, fontWeight: 700,
                color: 'var(--white)', letterSpacing: '-.02em', lineHeight: 1, marginBottom: 4 }}>
                {loading ? '…' : fmtH(pr?.valor)}
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10,
                color: d === 'up' ? 'var(--green)' : d === 'dn' ? 'var(--red)' : 'var(--text3)' }}>
                {pr?.varDia != null ? fmtPct(pr.varDia) + ' día' : loading ? '' : '—'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="tabs">
        {TABS.map(t => (
          <button key={t.id} className={`tab${activeTab === t.id ? ' active' : ''}`}
            onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      <div className="section">
        {loading && <LoadingState />}
        {!loading && !data && <ErrorState msg={errMsg} />}
        {!loading && data && activeTab === 'indicadores' && <TabIndicadores data={data} />}
        {!loading && data && activeTab === 'historico'   && <TabHistorico   data={data} />}
      </div>
    </div>
  );
}
