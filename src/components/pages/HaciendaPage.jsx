// HaciendaPage.jsx — Hacienda bovina 100% datos reales
// Fuente única: /api/hacienda → MAGyP · SIO Carnes · datos.gob.ar
// Cero datos hardcodeados ni mocks. Si falla la API, falla con aviso claro.

import React, { useState, useEffect, useCallback } from 'react';

const fmtARS = v =>
  v == null ? '—' : '$\u00a0' + Math.round(v).toLocaleString('es-AR');

const fmtPct = v => {
  if (v === null || v === undefined) return '—';
  return (v > 0 ? '+' : '') + v.toFixed(1) + '%';
};

const dirOf = v => {
  if (v === null || v === undefined) return 'fl';
  return v > 0 ? 'up' : v < 0 ? 'dn' : 'fl';
};

function Pill({ v }) {
  const d = dirOf(v);
  if (v === null || v === undefined) return <span className="dim">—</span>;
  return <span className={`pill ${d}`}>{fmtPct(v)}</span>;
}

const CAT_LABELS = {
  insc:         'INSC · Índice Novillo',
  novillo:      'Novillo',
  novillito:    'Novillito',
  ternero:      'Ternero',
  vaca_conserva:'Vaca Conserva',
  vaquillona:   'Vaquillona',
  toro:         'Toro',
};

const CAT_COLORS = {
  insc:         '#56c97a',
  novillo:      '#4d9ef0',
  novillito:    '#f0b840',
  ternero:      '#e87d6f',
  vaca_conserva:'#c792ea',
  vaquillona:   '#67d5c0',
  toro:         '#a0a8c8',
};

const CAT_ORDER = ['insc', 'novillo', 'novillito', 'ternero', 'vaquillona', 'vaca_conserva', 'toro'];

function fmtFecha(f) {
  if (!f) return '—';
  const m = /(\d{4})-(\d{2})-(\d{2})/.exec(f);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : f;
}

function varPctCalc(a, b) {
  if (!b || b === 0) return null;
  return Math.round(((a - b) / b) * 1000) / 10;
}

// ── Sparkline ─────────────────────────────────────────────────────────────
function Spark({ data, color }) {
  if (!data || data.length < 2) return null;
  const vals = data.map(p => p.valor);
  const min  = Math.min(...vals);
  const max  = Math.max(...vals);
  const rng  = max - min || 1;
  const n    = vals.length;
  const pts  = vals
    .map((v, i) => `${(i / (n - 1)) * 80},${40 - ((v - min) / rng) * 36}`)
    .join(' ');
  return (
    <svg viewBox="0 0 80 40" style={{ width: 60, height: 22, display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color || 'var(--accent)'} strokeWidth="1.5" />
    </svg>
  );
}

// ── SVG Line Chart ─────────────────────────────────────────────────────────
function LineChart({ series, height }) {
  const h = height || 220;
  const allSeries = (series || []).filter(s => s.data && s.data.length >= 2);
  if (!allSeries.length) return null;

  const allDates = allSeries[0].data.map(p => p.fecha);
  const allVals  = allSeries.flatMap(s => s.data.map(p => p.valor)).filter(Number.isFinite);
  if (!allVals.length) return null;

  const w   = 900;
  const pad = { t: 14, r: 20, b: 30, l: 62 };
  const minV = Math.min(...allVals);
  const maxV = Math.max(...allVals);
  const rng  = maxV - minV || 1;
  const n    = allDates.length;

  const xPos = i => pad.l + (i / Math.max(n - 1, 1)) * (w - pad.l - pad.r);
  const yPos = v => pad.t + (1 - (v - minV) / rng) * (h - pad.t - pad.b);
  const mkPath = data => data.map((p, i) => `${i === 0 ? 'M' : 'L'}${xPos(i).toFixed(1)},${yPos(p.valor).toFixed(1)}`).join(' ');
  const mkArea = data => {
    const base = yPos(minV);
    return mkPath(data) + ` L${xPos(n-1).toFixed(1)},${base} L${xPos(0).toFixed(1)},${base} Z`;
  };
  const labelIdxs = [0, Math.floor(n/4), Math.floor(n/2), Math.floor(3*n/4), n-1]
    .filter((v, i, a) => a.indexOf(v) === i);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: h, display: 'block' }}>
      {[0, 0.25, 0.5, 0.75, 1].map(t => {
        const y = pad.t + (1 - t) * (h - pad.t - pad.b);
        return (
          <g key={t}>
            <line x1={pad.l} y1={y} x2={w - pad.r} y2={y} stroke="var(--line)" strokeWidth="1" />
            <text x={pad.l - 6} y={y + 4} textAnchor="end" fontSize={8} fill="var(--text3)" fontFamily="monospace">
              {Math.round(minV + t * rng).toLocaleString('es-AR')}
            </text>
          </g>
        );
      })}
      {labelIdxs.map(i => (
        <text key={i} x={xPos(i)} y={h - 4} textAnchor="middle" fontSize={7.5} fill="var(--text3)" fontFamily="monospace">
          {fmtFecha(allDates[i])}
        </text>
      ))}
      {allSeries.map(s => (
        <g key={s.label}>
          <path d={mkArea(s.data)} fill={s.color} opacity={0.07} />
          <path d={mkPath(s.data)} fill="none" stroke={s.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={xPos(n-1)} cy={yPos(s.data[s.data.length-1].valor)} r={3} fill={s.color} />
        </g>
      ))}
    </svg>
  );
}

// ── Overview cards ─────────────────────────────────────────────────────────
function OverviewCards({ precios, historico }) {
  const cats = CAT_ORDER.filter(k => precios[k]);
  return (
    <div className="grid grid-3" style={{ marginBottom: 28 }}>
      {cats.map(clave => {
        const p     = precios[clave];
        const hist  = historico && historico[clave];
        const color = CAT_COLORS[clave] || 'var(--accent)';
        const varDisplay = p.varSemana !== null ? p.varSemana : p.varDia;
        return (
          <div key={clave} className="stat" style={{ cursor: 'default' }}>
            <div style={{ fontSize: 13, fontWeight: 400, color: 'var(--text2)', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span>{CAT_LABELS[clave] || clave}</span>
              <Spark data={hist} color={color} />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
              <div className="stat-val" style={{ fontSize: 22, marginBottom: 0 }}>{fmtARS(p.valor)}</div>
              {varDisplay !== null && <Pill v={varDisplay} />}
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
              {p.varDia !== null && (
                <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)' }}>
                  Día: <span style={{ color: dirOf(p.varDia) === 'up' ? 'var(--green)' : dirOf(p.varDia) === 'dn' ? 'var(--red)' : 'var(--text3)' }}>{fmtPct(p.varDia)}</span>
                </span>
              )}
              {p.varSemana !== null && (
                <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)' }}>
                  Sem: <span style={{ color: dirOf(p.varSemana) === 'up' ? 'var(--green)' : dirOf(p.varSemana) === 'dn' ? 'var(--red)' : 'var(--text3)' }}>{fmtPct(p.varSemana)}</span>
                </span>
              )}
              {p.varMes !== null && (
                <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)' }}>
                  Mes: <span style={{ color: dirOf(p.varMes) === 'up' ? 'var(--green)' : dirOf(p.varMes) === 'dn' ? 'var(--red)' : 'var(--text3)' }}>{fmtPct(p.varMes)}</span>
                </span>
              )}
            </div>
            <div className="stat-meta">{p.unidad}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── Tab: Precios actuales ──────────────────────────────────────────────────
function TabPrecios({ precios, fecha, fuente }) {
  const cats = CAT_ORDER.filter(k => precios[k]);
  if (!cats.length) return <div className="alert-strip warn"><span className="alert-text">Sin datos de precios.</span></div>;
  return (
    <div className="section">
      <div className="alert-strip info" style={{ marginBottom: 20 }}>
        <span className="alert-icon">ℹ</span>
        <span className="alert-text">
          Precios en <strong>ARS/kg vivo</strong> · Fuente: {fuente} · Último registro: <strong>{fmtFecha(fecha)}</strong>
        </span>
      </div>
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>Categoría</th>
              <th className="r">Precio actual</th>
              <th className="r">Var. día</th>
              <th className="r">Var. semanal</th>
              <th className="r">Var. mensual</th>
              <th>Unidad</th>
            </tr>
          </thead>
          <tbody>
            {cats.map(clave => {
              const p = precios[clave];
              return (
                <tr key={clave}>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: CAT_COLORS[clave] || 'var(--accent)', flexShrink: 0 }} />
                      <strong>{CAT_LABELS[clave] || clave}</strong>
                    </span>
                  </td>
                  <td className="r w mono">{fmtARS(p.valor)}</td>
                  <td className="r"><Pill v={p.varDia} /></td>
                  <td className="r"><Pill v={p.varSemana} /></td>
                  <td className="r"><Pill v={p.varMes} /></td>
                  <td className="dim" style={{ fontSize: 11 }}>{p.unidad}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="source">Fuente: {fuente} · {fmtFecha(fecha)}</div>
    </div>
  );
}

// ── Tab: Histórico ─────────────────────────────────────────────────────────
function TabHistorico({ historico }) {
  const cats = CAT_ORDER.filter(k => historico && historico[k] && historico[k].length >= 2);
  const [activas, setActivas] = useState(null);

  useEffect(() => {
    if (cats.length && !activas) setActivas(new Set(cats.slice(0, 4)));
  }, [cats.length]);

  if (!cats.length) return <div className="alert-strip warn"><span className="alert-icon">!</span><span className="alert-text">Sin datos históricos disponibles.</span></div>;

  const sel = activas || new Set(cats.slice(0, 4));
  const toggleCat = k => {
    const next = new Set(sel);
    if (next.has(k)) { if (next.size > 1) next.delete(k); }
    else next.add(k);
    setActivas(next);
  };

  const series = cats.filter(k => sel.has(k)).map(k => ({ label: CAT_LABELS[k] || k, data: historico[k], color: CAT_COLORS[k] }));

  const resumen = cats.map(k => {
    const serie = historico[k];
    const first = serie[0].valor;
    const last  = serie[serie.length - 1].valor;
    const mid   = serie[Math.floor(serie.length / 2)].valor;
    return {
      clave: k,
      last,
      first,
      v15: varPctCalc(last, mid),
      v30: varPctCalc(last, first),
    };
  });

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {cats.map(k => {
          const on = sel.has(k);
          return (
            <button key={k} onClick={() => toggleCat(k)} style={{
              fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600, letterSpacing: '.06em',
              padding: '5px 12px', borderRadius: 6,
              border: `1px solid ${on ? CAT_COLORS[k] : 'var(--line)'}`,
              background: on ? CAT_COLORS[k] + '22' : 'var(--bg1)',
              color: on ? CAT_COLORS[k] : 'var(--text3)',
              cursor: 'pointer', transition: 'all .15s',
            }}>
              {CAT_LABELS[k] || k}
            </button>
          );
        })}
      </div>

      <div style={{ background: 'var(--bg1)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ padding: '14px 20px 12px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text3)' }}>
            Evolución de precios · ARS/kg · últimos 90 días hábiles disponibles
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {series.map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 20, height: 2, background: s.color, borderRadius: 1 }} />
                <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--text3)' }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
        <LineChart series={series} height={240} />
      </div>

      <div className="section-title">Resumen del período</div>
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>Categoría</th>
              <th className="r">Último (ARS/kg)</th>
              <th className="r">Inicio período</th>
              <th className="r">Var. ~15 días</th>
              <th className="r">Var. ~30 días</th>
            </tr>
          </thead>
          <tbody>
            {resumen.map(r => (
              <tr key={r.clave}>
                <td>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: CAT_COLORS[r.clave] || 'var(--accent)', flexShrink: 0 }} />
                    <strong>{CAT_LABELS[r.clave] || r.clave}</strong>
                  </span>
                </td>
                <td className="r w mono">{fmtARS(r.last)}</td>
                <td className="r dim mono">{fmtARS(r.first)}</td>
                <td className="r"><Pill v={r.v15} /></td>
                <td className="r"><Pill v={r.v30} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Tab: Serie de datos ────────────────────────────────────────────────────
function TabSerie({ historico, fecha }) {
  const cats = CAT_ORDER.filter(k => historico && historico[k] && historico[k].length >= 2);
  const [catSel, setCatSel] = useState(null);
  const [pag, setPag]       = useState(0);
  const POR_PAG = 20;

  useEffect(() => { if (cats.length && !catSel) setCatSel(cats[0]); }, [cats.length]);

  if (!cats.length) return <div className="alert-strip warn"><span className="alert-icon">!</span><span className="alert-text">Sin datos históricos disponibles.</span></div>;

  const cat   = catSel || cats[0];
  const serie = historico[cat] ? [...historico[cat]].reverse() : [];
  const total = serie.length;
  const pags  = Math.ceil(total / POR_PAG);
  const slice = serie.slice(pag * POR_PAG, (pag + 1) * POR_PAG);

  const handleCat = k => { setCatSel(k); setPag(0); };

  return (
    <div>
      <div className="toggle" style={{ marginBottom: 20 }}>
        {cats.map(k => (
          <button key={k} className={`tg${cat === k ? ' active' : ''}`} onClick={() => handleCat(k)}>
            {CAT_LABELS[k] || k}
          </button>
        ))}
      </div>

      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th className="r">Precio (ARS/kg)</th>
              <th className="r">Var. vs anterior</th>
            </tr>
          </thead>
          <tbody>
            {slice.map((p, i) => {
              const prev = slice[i + 1];
              const varD = prev ? varPctCalc(p.valor, prev.valor) : null;
              return (
                <tr key={p.fecha}>
                  <td className="mono">{fmtFecha(p.fecha)}</td>
                  <td className="r w mono">{fmtARS(p.valor)}</td>
                  <td className="r"><Pill v={varD} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pags > 1 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'center' }}>
          <button onClick={() => setPag(p => Math.max(0, p - 1))} disabled={pag === 0} style={{ fontFamily: 'var(--mono)', fontSize: 10, padding: '5px 14px', background: 'var(--bg2)', border: '1px solid var(--line)', color: pag === 0 ? 'var(--text3)' : 'var(--text)', borderRadius: 6, cursor: pag === 0 ? 'default' : 'pointer' }}>← Ant.</button>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)', display: 'flex', alignItems: 'center' }}>{pag + 1} / {pags}</span>
          <button onClick={() => setPag(p => Math.min(pags - 1, p + 1))} disabled={pag >= pags - 1} style={{ fontFamily: 'var(--mono)', fontSize: 10, padding: '5px 14px', background: 'var(--bg2)', border: '1px solid var(--line)', color: pag >= pags - 1 ? 'var(--text3)' : 'var(--text)', borderRadius: 6, cursor: pag >= pags - 1 ? 'default' : 'pointer' }}>Sig. →</button>
        </div>
      )}
      <div className="source" style={{ marginTop: 14 }}>{total} registros · MAGyP · SIO Carnes · datos.gob.ar · Último: {fmtFecha(fecha)}</div>
    </div>
  );
}

// ── Loading skeleton ───────────────────────────────────────────────────────
function LoadingSkeleton() {
  const bar = (w, h, mb) => <div style={{ width: w, height: h || 14, borderRadius: 4, background: 'var(--bg3)', marginBottom: mb || 0, animation: 'pulse 1.4s ease-in-out infinite' }} />;
  return (
    <div>
      <style>{`@keyframes pulse{0%,100%{opacity:.6}50%{opacity:1}}`}</style>
      <div className="grid grid-3" style={{ marginBottom: 28 }}>
        {[0,1,2,3,4,5].map(i => (
          <div key={i} className="stat">{bar('60%', 12, 10)}{bar('80%', 28, 8)}{bar('50%', 10, 0)}</div>
        ))}
      </div>
      <div style={{ background: 'var(--bg1)', border: '1px solid var(--line)', borderRadius: 12, padding: 20 }}>
        {bar('30%', 10, 16)}{bar('100%', 200)}
      </div>
    </div>
  );
}

// ── Error state ────────────────────────────────────────────────────────────
function ErrorState({ error, onRetry }) {
  return (
    <div style={{ padding: '40px 0', textAlign: 'center' }}>
      <div style={{ fontSize: 36, marginBottom: 16 }}>⚠</div>
      <div style={{ fontFamily: 'var(--display)', fontSize: 18, color: 'var(--text)', marginBottom: 10 }}>
        Error al cargar datos de hacienda
      </div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--red)', background: 'var(--red-bg)', border: '1px solid var(--red)', borderRadius: 8, padding: '10px 18px', display: 'inline-block', marginBottom: 20 }}>
        {error}
      </div>
      <br />
      <button onClick={onRetry} style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, padding: '9px 22px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
        Reintentar
      </button>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'precios',   label: 'Precios actuales' },
  { id: 'historico', label: 'Histórico'        },
  { id: 'serie',     label: 'Serie de datos'   },
];

export function HaciendaPage({ goPage }) {
  const [tab,       setTab]       = useState('precios');
  const [estado,    setEstado]    = useState('loading');
  const [data,      setData]      = useState(null);
  const [error,     setError]     = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  const cargar = useCallback(async () => {
    setEstado('loading');
    setError(null);
    try {
      const res  = await fetch('/api/hacienda');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'La API devolvió ok=false');
      setData(json);
      setEstado('ok');
      setLastFetch(new Date());
    } catch (err) {
      setError(err.message);
      setEstado('error');
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const precios   = data && data.precios   ? data.precios   : {};
  const historico = data && data.historico ? data.historico : {};
  const fecha     = data && data.fecha;
  const fuente    = (data && data.fuente) || 'MAGyP · SIO Carnes · datos.gob.ar';
  const catsCount = Object.keys(precios).length;

  return (
    <div className="page-enter">
      <div className="ph">
        <div>
          <div className="ph-title">
            Hacienda{' '}
            <span className="help-pip" onClick={() => goPage('ayuda', 'glosario-hacienda')} title="Ayuda">?</span>
          </div>
          <div className="ph-sub">Ganadería bovina · SIO Carnes · MAGyP · datos.gob.ar</div>
        </div>
        <div className="ph-right" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {estado === 'ok'      && <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--green)', letterSpacing: '.06em' }}>LIVE · {catsCount} categorías</div>}
          {estado === 'loading' && <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)', letterSpacing: '.06em' }}>cargando…</div>}
          {estado === 'error'   && <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--red)',   letterSpacing: '.06em' }}>ERROR</div>}
          <button onClick={cargar} disabled={estado === 'loading'} title="Actualizar" style={{ background: 'var(--bg2)', border: '1px solid var(--line)', color: 'var(--text3)', borderRadius: 6, padding: '5px 10px', fontFamily: 'var(--mono)', fontSize: 10, cursor: 'pointer', opacity: estado === 'loading' ? .5 : 1 }}>↺</button>
        </div>
      </div>

      {estado === 'ok' && (
        <div className="alert-strip info" style={{ marginBottom: 16 }}>
          <span className="alert-icon">✓</span>
          <span className="alert-text">
            Datos reales · <strong>{fuente}</strong> · Último registro: <strong>{fmtFecha(fecha)}</strong>
            {lastFetch && <span style={{ color: 'var(--text3)' }}> · Consultado: {lastFetch.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span>}
          </span>
        </div>
      )}

      {estado === 'loading' && <LoadingSkeleton />}
      {estado === 'error'   && <ErrorState error={error} onRetry={cargar} />}

      {estado === 'ok' && (
        <>
          <OverviewCards precios={precios} historico={historico} />

          <div className="tabs">
            {TABS.map(t => (
              <button key={t.id} className={`tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
            ))}
          </div>

          <div>
            {tab === 'precios'   && <TabPrecios  precios={precios} fecha={fecha} fuente={fuente} />}
            {tab === 'historico' && <TabHistorico historico={historico} />}
            {tab === 'serie'     && <TabSerie    historico={historico} fecha={fecha} />}
          </div>

          <div style={{ marginTop: 32, padding: '12px 16px', background: 'var(--bg1)', border: '1px solid var(--line)', borderRadius: 8, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)', letterSpacing: '.1em', textTransform: 'uppercase' }}>Dataset</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text2)' }}>
              <span style={{ color: 'var(--accent)' }}>{data && data.dataset}</span>
            </div>
            {data && data.resource && (
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)' }}>
                Resource: {data.resource.slice(0, 8)}…
              </div>
            )}
            {data && data.camposDisponibles && data.camposDisponibles.length > 0 && (
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)' }}>
                Campos: {data.camposDisponibles.join(' · ')}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
