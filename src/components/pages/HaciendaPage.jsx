// HaciendaPage.jsx — Hacienda bovina · Cañuelas MAG
// Fuente: /api/hacienda → proveedor externo (estructura Downtack)
// Muestra: índices INMAG/IGMAG/Arrendamiento + todas las categorías de faena
// Sin datos hardcodeados en el frontend.

import React, { useState, useEffect, useCallback } from 'react';

// ── Helpers ───────────────────────────────────────────────────────────────
const fmtARS = v => v == null ? '—' : '$\u00a0' + Math.round(v).toLocaleString('es-AR');

function fmtFecha(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

// Color por grupo
const GRUPO_COLOR = {
  novillos:    '#4d9ef0',
  novillitos:  '#56c97a',
  vaquillonas: '#f0b840',
  vacas:       '#c792ea',
  toros:       '#e87d6f',
  mejores:     '#67d5c0',
};

// Color e ícono por índice Cañuelas
const INDICE_META = {
  'ar.canuelas.inmag':         { color: '#56c97a', label: 'INMAG',         desc: 'Índice Novillo MAGna · precio de referencia novillos especiales' },
  'ar.canuelas.igmag':         { color: '#4d9ef0', label: 'IGMAG',         desc: 'Índice General MAGna · promedio ponderado del mercado Cañuelas'  },
  'ar.canuelas.arrendamiento': { color: '#f0b840', label: 'Arrendamiento', desc: 'Índice de arrendamiento en equivalente hacienda'                  },
};

// ── Pill de variación (solo cuando haya histórico) ────────────────────────
function Pill({ v }) {
  if (v === null || v === undefined) return null;
  const d = v > 0 ? 'up' : v < 0 ? 'dn' : 'fl';
  const txt = (v > 0 ? '+' : '') + v.toFixed(1) + '%';
  return <span className={`pill ${d}`}>{txt}</span>;
}

// ── Badge MOCK ─────────────────────────────────────────────────────────────
function MockBadge() {
  return (
    <span style={{
      fontFamily: 'var(--mono)', fontSize: 8, fontWeight: 700, letterSpacing: '.08em',
      color: '#f0b840', background: 'rgba(240,184,64,.12)',
      border: '1px solid rgba(240,184,64,.3)', borderRadius: 4,
      padding: '2px 7px',
    }}>DEMO</span>
  );
}

// ── Tarjeta de índice (INMAG / IGMAG / Arrendamiento) ────────────────────
function IndiceCard({ item }) {
  const meta  = INDICE_META[item.id] ?? { color: 'var(--accent)', label: item.nombre, desc: '' };
  return (
    <div className="stat" style={{ cursor: 'default' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, letterSpacing: '.08em', color: meta.color, textTransform: 'uppercase' }}>
          {meta.label}
        </div>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: meta.color, marginTop: 2 }} />
      </div>
      <div className="stat-val" style={{ fontSize: 26, marginBottom: 8, color: meta.color }}>
        {fmtARS(item.valor)}
      </div>
      <div className="stat-meta" style={{ lineHeight: 1.5 }}>{meta.desc}</div>
      <div className="stat-meta" style={{ marginTop: 6 }}>{item.unidad}</div>
      <div className="stat-meta" style={{ marginTop: 4, color: 'var(--text3)', fontSize: 9 }}>
        {fmtFecha(item.fecha)}
      </div>
    </div>
  );
}

// ── Tabla de categorías de faena ──────────────────────────────────────────
function GrupoTable({ grupo }) {
  const color = GRUPO_COLOR[grupo.id] ?? 'var(--accent)';
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
        <div className="section-title" style={{ marginBottom: 0 }}>{grupo.label}</div>
      </div>
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>Categoría</th>
              <th className="r">ARS/kg vivo</th>
              <th className="r">Actualización</th>
            </tr>
          </thead>
          <tbody>
            {grupo.items.map(item => (
              <tr key={item.id}>
                <td><strong>{item.nombre}</strong></td>
                <td className="r w mono" style={{ color }}>{fmtARS(item.valor)}</td>
                <td className="r dim" style={{ fontSize: 11 }}>{fmtFecha(item.fecha)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Tab: Faena completa ───────────────────────────────────────────────────
function TabFaena({ grupos, fecha }) {
  if (!grupos || !grupos.length) {
    return <div className="alert-strip warn"><span className="alert-icon">!</span><span className="alert-text">Sin datos de categorías.</span></div>;
  }
  return (
    <div className="section">
      <div className="alert-strip info" style={{ marginBottom: 20 }}>
        <span className="alert-icon">ℹ</span>
        <span className="alert-text">
          Precios en <strong>ARS/kg vivo</strong> · Cañuelas MAG · Resolución 32/2018 APN · Último: <strong>{fmtFecha(fecha)}</strong>
        </span>
      </div>
      {grupos.map(g => <GrupoTable key={g.id} grupo={g} />)}
    </div>
  );
}

// ── Tab: Vista resumen (tabla única ordenada por precio) ──────────────────
function TabResumen({ grupos }) {
  const [ordenDir, setOrdenDir] = useState('desc');
  const [ordenCol, setOrdenCol] = useState('valor');

  if (!grupos || !grupos.length) return null;

  // Aplanar todos los items con su grupo
  const todos = grupos.flatMap(g =>
    g.items.map(item => ({ ...item, grupoId: g.id, grupoLabel: g.label }))
  );

  const sorted = [...todos].sort((a, b) => {
    const mult = ordenDir === 'desc' ? -1 : 1;
    if (ordenCol === 'valor') return (a.valor - b.valor) * mult;
    return a.nombre.localeCompare(b.nombre) * mult;
  });

  const toggleOrden = col => {
    if (ordenCol === col) setOrdenDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setOrdenCol(col); setOrdenDir('desc'); }
  };

  const arrow = col => ordenCol === col ? (ordenDir === 'desc' ? ' ↓' : ' ↑') : '';

  return (
    <div>
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ cursor: 'pointer' }} onClick={() => toggleOrden('nombre')}>
                Categoría{arrow('nombre')}
              </th>
              <th>Grupo</th>
              <th className="r" style={{ cursor: 'pointer' }} onClick={() => toggleOrden('valor')}>
                ARS/kg vivo{arrow('valor')}
              </th>
              <th className="r">Actualización</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(item => {
              const color = GRUPO_COLOR[item.grupoId] ?? 'var(--accent)';
              return (
                <tr key={item.id}>
                  <td><strong>{item.nombre}</strong></td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
                      <span className="dim" style={{ fontSize: 12 }}>{item.grupoLabel}</span>
                    </span>
                  </td>
                  <td className="r w mono" style={{ color }}>{fmtARS(item.valor)}</td>
                  <td className="r dim" style={{ fontSize: 11 }}>{fmtFecha(item.fecha)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="source">Fuente: Cañuelas MAG · Resolución 32/2018 APN</div>
    </div>
  );
}

// ── Tab: Comparativa visual por grupos ────────────────────────────────────
function TabComparativa({ grupos }) {
  if (!grupos || !grupos.length) return null;

  // Encontrar max global para barras relativas
  const todos  = grupos.flatMap(g => g.items);
  const maxVal = Math.max(...todos.map(i => i.valor));

  return (
    <div>
      {grupos.map(g => {
        const color = GRUPO_COLOR[g.id] ?? 'var(--accent)';
        // Ordenar por valor desc dentro del grupo
        const items = [...g.items].sort((a, b) => b.valor - a.valor);
        return (
          <div key={g.id} style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
              <div className="section-title" style={{ marginBottom: 0 }}>{g.label}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map(item => {
                const pct = (item.valor / maxVal) * 100;
                return (
                  <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '220px 1fr 110px', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.nombre}
                    </div>
                    <div style={{ background: 'var(--bg3)', borderRadius: 4, height: 20, overflow: 'hidden' }}>
                      <div style={{
                        width: `${pct.toFixed(1)}%`, height: '100%',
                        background: color, opacity: .75, borderRadius: 4,
                        transition: 'width .4s ease',
                      }} />
                    </div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color, textAlign: 'right' }}>
                      {fmtARS(item.valor)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      <div className="source">Fuente: Cañuelas MAG · ARS/kg vivo · barras relativas al mayor precio</div>
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────
function Skeleton() {
  const bar = (w, h, mb) => (
    <div style={{ width: w, height: h || 14, borderRadius: 4, background: 'var(--bg3)', marginBottom: mb || 0, animation: 'pulse 1.4s ease-in-out infinite' }} />
  );
  return (
    <div>
      <style>{`@keyframes pulse{0%,100%{opacity:.55}50%{opacity:1}}`}</style>
      {/* Índices skeleton */}
      <div className="grid grid-3" style={{ marginBottom: 28 }}>
        {[0,1,2].map(i => (
          <div key={i} className="stat">{bar('55%',11,12)}{bar('70%',30,10)}{bar('80%',10,6)}{bar('40%',9)}</div>
        ))}
      </div>
      {/* Tabla skeleton */}
      <div style={{ background: 'var(--bg1)', border: '1px solid var(--line)', borderRadius: 10, padding: '20px 20px' }}>
        {[0,1,2,3,4,5].map(i => (
          <div key={i} style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
            {bar('35%',12)}{bar('15%',12)}{bar('12%',12)}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Error state ───────────────────────────────────────────────────────────
function ErrorState({ error, onRetry }) {
  return (
    <div style={{ padding: '48px 0', textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>⚠</div>
      <div style={{ fontFamily: 'var(--display)', fontSize: 18, color: 'var(--text)', marginBottom: 12 }}>
        Error al cargar datos de hacienda
      </div>
      <div style={{
        fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--red)',
        background: 'var(--red-bg)', border: '1px solid var(--red)',
        borderRadius: 8, padding: '10px 20px', display: 'inline-block', marginBottom: 24,
      }}>
        {error}
      </div>
      <br />
      <button onClick={onRetry} style={{
        fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700,
        padding: '10px 24px', background: 'var(--accent)', color: '#fff',
        border: 'none', borderRadius: 8, cursor: 'pointer',
      }}>
        Reintentar
      </button>
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'faena',       label: 'Faena'       },
  { id: 'resumen',     label: 'Resumen'     },
  { id: 'comparativa', label: 'Comparativa' },
];

// ── Main ──────────────────────────────────────────────────────────────────
export function HaciendaPage({ goPage }) {
  const [tab,       setTab]       = useState('faena');
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
      if (!json.ok) throw new Error(json.error || 'Error desconocido');
      setData(json);
      setEstado('ok');
      setLastFetch(new Date());
    } catch (err) {
      setError(err.message);
      setEstado('error');
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const indices = data?.indices ?? [];
  const grupos  = data?.grupos  ?? [];
  const fecha   = data?.fecha;
  const fuente  = data?.fuente ?? 'Cañuelas MAG';
  const esMock  = data?.esMock ?? false;

  return (
    <div className="page-enter">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="ph">
        <div>
          <div className="ph-title">
            Hacienda{' '}
            <span className="help-pip" onClick={() => goPage('ayuda', 'glosario-hacienda')} title="Ayuda">?</span>
          </div>
          <div className="ph-sub">Novillos · Novillitos · Vacas · Vaquillonas · Toros · Cañuelas MAG</div>
        </div>
        <div className="ph-right" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {estado === 'ok' && !esMock && (
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--green)', letterSpacing: '.06em' }}>
              LIVE · {grupos.reduce((s, g) => s + g.items.length, 0) + indices.length} precios
            </div>
          )}
          {estado === 'ok' && esMock && <MockBadge />}
          {estado === 'loading' && (
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)' }}>cargando…</div>
          )}
          {estado === 'error' && (
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--red)' }}>ERROR</div>
          )}
          <button
            onClick={cargar} disabled={estado === 'loading'} title="Actualizar"
            style={{ background: 'var(--bg2)', border: '1px solid var(--line)', color: 'var(--text3)', borderRadius: 6, padding: '5px 10px', fontFamily: 'var(--mono)', fontSize: 10, cursor: 'pointer', opacity: estado === 'loading' ? .5 : 1 }}
          >↺</button>
        </div>
      </div>

      {/* ── Estados ────────────────────────────────────────────────────── */}
      {estado === 'loading' && <Skeleton />}
      {estado === 'error'   && <ErrorState error={error} onRetry={cargar} />}

      {estado === 'ok' && (
        <>
          {/* ── Banner de estado ─────────────────────────────────────────── */}
          {esMock ? (
            <div className="alert-strip warn" style={{ marginBottom: 20 }}>
              <span className="alert-icon">⚠</span>
              <span className="alert-text">
                Mostrando <strong>datos de ejemplo</strong> · Para datos en tiempo real configurá{' '}
                <code style={{ fontFamily: 'var(--mono)', fontSize: 10 }}>DOWNTACK_API_URL</code> y{' '}
                <code style={{ fontFamily: 'var(--mono)', fontSize: 10 }}>DOWNTACK_API_KEY</code> en Vercel
              </span>
            </div>
          ) : (
            <div className="alert-strip info" style={{ marginBottom: 20 }}>
              <span className="alert-icon">✓</span>
              <span className="alert-text">
                {fuente} · Último: <strong>{fmtFecha(fecha)}</strong>
                {lastFetch && (
                  <span style={{ color: 'var(--text3)' }}>
                    {' '}· Consultado: {lastFetch.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </span>
            </div>
          )}

          {/* ── Índices Cañuelas (INMAG / IGMAG / Arrendamiento) ─────────── */}
          {indices.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <div className="section-title">Índices Cañuelas MAG</div>
              <div className="grid grid-3">
                {indices.map(item => <IndiceCard key={item.id} item={item} />)}
              </div>
            </div>
          )}

          {/* ── Tabs ─────────────────────────────────────────────────────── */}
          <div className="tabs">
            {TABS.map(t => (
              <button key={t.id} className={`tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>

          <div>
            {tab === 'faena'       && <TabFaena       grupos={grupos} fecha={fecha} />}
            {tab === 'resumen'     && <TabResumen      grupos={grupos} />}
            {tab === 'comparativa' && <TabComparativa  grupos={grupos} />}
          </div>
        </>
      )}
    </div>
  );
}
