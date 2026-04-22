// HaciendaPage.jsx — Hacienda bovina · Cañuelas MAG
// Paleta y componentes consistentes con el resto del sistema (GranosPage)
// Fuente: /api/hacienda → multi-fuente MAG Cañuelas

import React, { useState, useEffect, useCallback } from 'react';

// ── Helpers ───────────────────────────────────────────────────────────────
const fmtARS = v => v == null ? '—' : `$\u00a0${Math.round(v).toLocaleString('es-AR')}`;

function fmtFecha(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  } catch { return iso; }
}

function fmtFechaLarga(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('es-AR', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    });
  } catch { return iso; }
}

function fmtHora(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

// ¿Es un día de remate MAG? (lunes=1, miércoles=3)
function esDiaRemate(iso) {
  if (!iso) return false;
  const d = new Date(iso);
  return d.getDay() === 1 || d.getDay() === 3;
}

// ── Componentes del sistema ───────────────────────────────────────────────

function Badge({ type = 'live', label }) {
  const S = {
    live:   { c: 'var(--accent)',  bg: 'var(--acc-bg)',          dot: 'var(--accent)',  txt: 'EN VIVO' },
    ref:    { c: 'var(--accent)',  bg: 'var(--acc-bg)',          dot: 'var(--accent)',  txt: 'MAG'     },
    demo:   { c: 'var(--text3)',   bg: 'var(--bg3)',             dot: null,             txt: 'REFERENCIA' },
    ant:    { c: 'var(--text2)',   bg: 'var(--bg2)',             dot: null,             txt: label ?? 'ÚLT. REMATE' },
  };
  const s = S[type] ?? S.live;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontFamily: 'var(--mono)', fontSize: 8, fontWeight: 600,
      letterSpacing: '.08em', textTransform: 'uppercase',
      color: s.c, background: s.bg, padding: '2px 7px', borderRadius: 4,
    }}>
      {s.dot && <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.dot, display: 'inline-block' }}/>}
      {s.txt}
    </span>
  );
}

const Skel = ({ w = '60%', h = 14, mb = 0 }) => (
  <div style={{ height: h, background: 'var(--bg3)', borderRadius: 4, width: w, marginBottom: mb, opacity: .5, animation: 'pulse 1.4s ease-in-out infinite' }}/>
);

// Bloque de metodología — igual que en GranosPage
function MetodologiaBox({ title, items, fuentes }) {
  return (
    <div style={{
      marginTop: 28,
      background: 'var(--bg1)',
      border: '1px solid var(--line)',
      borderLeft: '3px solid var(--accent2)',
      borderRadius: '0 10px 10px 0',
      padding: '16px 20px',
    }}>
      <div style={{
        fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.12em',
        textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 10,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{
          width: 14, height: 14, borderRadius: '50%',
          background: 'var(--acc-bg)', border: '1px solid var(--accent)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 8, color: 'var(--accent)', flexShrink: 0,
        }}>i</span>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{
              fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 600,
              color: 'var(--text2)', background: 'var(--bg3)',
              padding: '1px 6px', borderRadius: 3, flexShrink: 0,
              border: '1px solid var(--line)', marginTop: 1, whiteSpace: 'nowrap',
            }}>{item.term}</span>
            <span style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.55 }}>{item.def}</span>
          </div>
        ))}
      </div>
      {fuentes && (
        <div style={{
          marginTop: 12, paddingTop: 10,
          borderTop: '1px solid var(--line)',
          fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)',
        }}>
          {fuentes}
        </div>
      )}
    </div>
  );
}

// ── Color por grupo ───────────────────────────────────────────────────────
const GRUPO_COLOR = {
  novillos:    'var(--accent)',
  novillitos:  'var(--blue)',
  vaquillonas: '#8fb8f0',
  vacas:       'var(--text)',
  toros:       'var(--text2)',
  mejores:     'var(--text3)',
};

// ── Índices (INMAG / IGMAG / Arrendamiento) ───────────────────────────────
const INDICE_META = {
  'ar.canuelas.inmag':         { color: 'var(--accent)',  label: 'INMAG',         desc: 'Índice Novillo MAGna · precio de referencia novillos especiales · ARS/kg vivo' },
  'ar.canuelas.igmag':         { color: 'var(--blue)',    label: 'IGMAG',         desc: 'Índice General MAGna · promedio ponderado del mercado Cañuelas · ARS/kg vivo'  },
  'ar.canuelas.arrendamiento': { color: '#8fb8f0',        label: 'Arrendamiento', desc: 'Índice de arrendamiento en equivalente hacienda · ARS/ha/año'                  },
};

function IndiceCard({ item, esMock }) {
  const meta = INDICE_META[item.id] ?? { color: 'var(--accent)', label: item.nombre, desc: '' };
  return (
    <div className="stat" style={{ cursor: 'default' }}>
      <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text2)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: meta.color, flexShrink: 0 }}/>
        {meta.label}
        <Badge type={esMock ? 'demo' : 'ref'}/>
      </div>
      <div className="stat-val" style={{ fontSize: '26px', marginBottom: 0 }}>
        {fmtARS(item.valor)}
      </div>
      <div style={{ margin: '4px 0', fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text3)' }}>
        {item.unidad}
      </div>
      <div className="stat-meta" style={{ lineHeight: 1.5 }}>{meta.desc}</div>
      <div style={{ marginTop: 6, fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)' }}>
        {fmtFecha(item.fecha)}
      </div>
    </div>
  );
}

// ── Tabla de un grupo de categorías ──────────────────────────────────────
function GrupoTable({ grupo }) {
  const color = GRUPO_COLOR[grupo.id] ?? 'var(--accent)';
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }}/>
        <div className="section-title" style={{ marginBottom: 0 }}>{grupo.label}</div>
      </div>
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>Categoría</th>
              <th className="r">Mín</th>
              <th className="r">Máx</th>
              <th className="r">ARS/kg vivo</th>
              <th className="r">Cabezas</th>
            </tr>
          </thead>
          <tbody>
            {grupo.items.map(item => {
              const spread = (item.minimo != null && item.maximo != null)
                ? Math.round(item.maximo - item.minimo).toLocaleString('es-AR')
                : null;
              return (
                <tr key={item.id}>
                  <td><strong>{item.nombre}</strong></td>
                  <td className="r dim mono" style={{ fontSize: 11 }}>
                    {item.minimo != null ? fmtARS(item.minimo) : '—'}
                  </td>
                  <td className="r dim mono" style={{ fontSize: 11 }}>
                    {item.maximo != null ? fmtARS(item.maximo) : '—'}
                  </td>
                  <td className="r w mono" style={{ color }}>
                    {fmtARS(item.valor)}
                  </td>
                  <td className="r dim" style={{ fontSize: 11 }}>
                    {item.cabezas > 0 ? item.cabezas.toLocaleString('es-AR') : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Tab Faena ─────────────────────────────────────────────────────────────
function TabFaena({ grupos, fecha, esMock, fuenteNombre }) {
  if (!grupos || !grupos.length) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
        Sin datos de categorías disponibles.
      </div>
    );
  }

  const totalCabezas = grupos.reduce((s, g) => s + g.items.reduce((ss, i) => ss + (i.cabezas || 0), 0), 0);
  const totalCategorias = grupos.reduce((s, g) => s + g.items.length, 0);

  return (
    <div>
      <div style={{
        background: 'var(--bg1)', border: '1px solid var(--line)', borderRadius: 10,
        padding: '12px 18px', marginBottom: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text3)' }}>Jornada</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text)', marginTop: 2 }}>{fmtFechaLarga(fecha)}</div>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text3)' }}>Cabezas totales</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text)', marginTop: 2 }}>
              {totalCabezas > 0 ? totalCabezas.toLocaleString('es-AR') : '—'}
            </div>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text3)' }}>Categorías</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text)', marginTop: 2 }}>{totalCategorias}</div>
          </div>
          {fuenteNombre && (
            <div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text3)' }}>Fuente</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>{fuenteNombre}</div>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Badge type={esMock ? 'demo' : 'live'}/>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)' }}>
            Res. 32/2018 APN · ARS/kg vivo
          </span>
        </div>
      </div>

      {grupos.map(g => <GrupoTable key={g.id} grupo={g} />)}

      <MetodologiaBox
        title="Qué estás viendo · Metodología Faena"
        items={[
          { term: 'ARS/kg vivo', def: 'Precio promedio ponderado por cabezas dentro de cada categoría, en pesos argentinos por kilogramo de peso vivo del animal al momento de la faena. No incluye gastos de traslado, comisión ni otros descuentos posteriores.' },
          { term: 'Mín / Máx',  def: 'Rango de precios registrado en esa categoría durante la jornada. Refleja la dispersión entre los lotes de mayor y menor calidad dentro de cada categoría. Una brecha amplia indica heterogeneidad en los lotes.' },
          { term: 'Cabezas',    def: 'Cantidad de animales transaccionados en esa categoría en el remate. Sirve como indicador de liquidez y representatividad del precio promedio: más cabezas = precio más representativo.' },
          { term: 'Categorías', def: 'Clasificación definida por la Resolución 32/2018 de la APN (Autoridad Provincial de Normalización). Ordena al ganado según especie, sexo, edad, conformación y estado de engorde. Es el estándar vigente para el MAG Cañuelas.' },
          { term: 'Remates',    def: 'El MAG Cañuelas realiza remates los lunes y miércoles. Los datos se actualizan en el transcurso de esas jornadas. En días sin remate, se muestra el último remate disponible con indicación explícita de fecha.' },
        ]}
        fuentes={`Fuente: Mercado Agroganadero (MAG) Cañuelas · Resolución 32/2018 APN · Precio promedio ponderado por cabezas · ${esMock ? 'Datos de referencia del último remate conocido' : fuenteNombre ?? 'Tiempo real'}`}
      />
    </div>
  );
}

// ── Tab Resumen ───────────────────────────────────────────────────────────
function TabResumen({ grupos }) {
  const [ordenDir, setOrdenDir] = useState('desc');
  const [ordenCol, setOrdenCol] = useState('valor');

  if (!grupos || !grupos.length) return null;

  const todos = grupos.flatMap(g =>
    g.items.map(item => ({ ...item, grupoId: g.id, grupoLabel: g.label }))
  );

  const sorted = [...todos].sort((a, b) => {
    const mult = ordenDir === 'desc' ? -1 : 1;
    if (ordenCol === 'valor') return (a.valor - b.valor) * mult;
    if (ordenCol === 'cab')   return ((a.cabezas||0) - (b.cabezas||0)) * mult;
    return a.nombre.localeCompare(b.nombre) * mult;
  });

  const toggleOrden = col => {
    if (ordenCol === col) setOrdenDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setOrdenCol(col); setOrdenDir('desc'); }
  };
  const arrow = col => ordenCol === col ? (ordenDir === 'desc' ? ' ↓' : ' ↑') : '';

  const maxVal = Math.max(...todos.map(i => i.valor));
  const minVal = Math.min(...todos.map(i => i.valor));

  return (
    <div>
      <div className="tbl-wrap" style={{ marginBottom: 20 }}>
        <table>
          <thead>
            <tr>
              <th style={{ cursor: 'pointer' }} onClick={() => toggleOrden('nombre')}>Categoría{arrow('nombre')}</th>
              <th>Grupo</th>
              <th className="r" style={{ cursor: 'pointer' }} onClick={() => toggleOrden('valor')}>ARS/kg vivo{arrow('valor')}</th>
              <th className="r">Mín</th>
              <th className="r">Máx</th>
              <th className="r">Spread</th>
              <th className="r" style={{ cursor: 'pointer' }} onClick={() => toggleOrden('cab')}>Cabezas{arrow('cab')}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(item => {
              const color = GRUPO_COLOR[item.grupoId] ?? 'var(--accent)';
              const spread = (item.minimo != null && item.maximo != null)
                ? Math.round(item.maximo - item.minimo)
                : null;
              const esMax = item.valor === maxVal;
              const esMin = item.valor === minVal;
              return (
                <tr key={item.id}>
                  <td>
                    <strong>{item.nombre}</strong>
                    {esMax && <span style={{ marginLeft: 6, fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--accent)', background: 'var(--acc-bg)', padding: '1px 5px', borderRadius: 3 }}>MAYOR</span>}
                    {esMin && <span style={{ marginLeft: 6, fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--text3)', background: 'var(--bg3)', padding: '1px 5px', borderRadius: 3 }}>MENOR</span>}
                  </td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }}/>
                      <span className="dim" style={{ fontSize: 11 }}>{item.grupoLabel}</span>
                    </span>
                  </td>
                  <td className="r w mono" style={{ color }}>{fmtARS(item.valor)}</td>
                  <td className="r dim mono" style={{ fontSize: 11 }}>{item.minimo != null ? fmtARS(item.minimo) : '—'}</td>
                  <td className="r dim mono" style={{ fontSize: 11 }}>{item.maximo != null ? fmtARS(item.maximo) : '—'}</td>
                  <td className="r dim mono" style={{ fontSize: 11 }}>
                    {spread != null ? `$\u00a0${spread.toLocaleString('es-AR')}` : '—'}
                  </td>
                  <td className="r dim" style={{ fontSize: 11 }}>
                    {item.cabezas > 0 ? item.cabezas.toLocaleString('es-AR') : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="source">Fuente: Cañuelas MAG · Resolución 32/2018 APN · clic en encabezado para ordenar</div>
    </div>
  );
}

// ── Tab Comparativa visual ────────────────────────────────────────────────
function TabComparativa({ grupos }) {
  if (!grupos || !grupos.length) return null;

  const todos  = grupos.flatMap(g => g.items);
  const maxVal = Math.max(...todos.map(i => i.valor));

  return (
    <div>
      {grupos.map(g => {
        const color = GRUPO_COLOR[g.id] ?? 'var(--accent)';
        const items = [...g.items].sort((a, b) => b.valor - a.valor);
        return (
          <div key={g.id} style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }}/>
              <div className="section-title" style={{ marginBottom: 0 }}>{g.label}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {items.map(item => {
                const pct = (item.valor / maxVal) * 100;
                return (
                  <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '220px 1fr 120px', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.nombre}
                    </div>
                    <div style={{ background: 'var(--bg3)', borderRadius: 4, height: 20, overflow: 'hidden' }}>
                      <div style={{
                        width: `${pct.toFixed(1)}%`, height: '100%',
                        background: color, opacity: .6, borderRadius: 4,
                        transition: 'width .4s ease',
                      }}/>
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
      <div className="source">Fuente: Cañuelas MAG · ARS/kg vivo · barras relativas al mayor precio del remate</div>

      <MetodologiaBox
        title="Cómo leer la comparativa"
        items={[
          { term: 'Barras relativas', def: 'El largo de cada barra representa el precio de esa categoría en relación al precio máximo de todo el remate (barra completa = categoría más cara). Permite comparar categorías entre grupos visualmente.' },
          { term: 'Orden',            def: 'Dentro de cada grupo las categorías se ordenan de mayor a menor precio promedio ponderado. El orden entre grupos (Novillos → Novillitos → ... → Toros) sigue la convención de la Resolución 32/2018 APN.' },
        ]}
        fuentes="Fuente: Cañuelas MAG · ARS/kg vivo promedio ponderado por cabezas"
      />
    </div>
  );
}

// ── Skeleton de carga ─────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div>
      <style>{`@keyframes pulse{0%,100%{opacity:.45}50%{opacity:.9}}`}</style>
      <div className="grid grid-3" style={{ marginBottom: 28 }}>
        {[0,1,2].map(i => (
          <div key={i} className="stat">
            <Skel w="55%" h={11} mb={12}/><Skel w="70%" h={28} mb={10}/>
            <Skel w="40%" h={9} mb={6}/><Skel w="80%" h={10}/>
          </div>
        ))}
      </div>
      <div style={{ background: 'var(--bg1)', border: '1px solid var(--line)', borderRadius: 10, padding: '20px' }}>
        {[0,1,2,3,4,5,6].map(i => (
          <div key={i} style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
            <Skel w="35%" h={12}/><Skel w="12%" h={12}/><Skel w="12%" h={12}/><Skel w="12%" h={12}/>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Estado de error ───────────────────────────────────────────────────────
function ErrorState({ error, onRetry }) {
  return (
    <div style={{ padding: '48px 0', textAlign: 'center' }}>
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
      <br/>
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

  const indices      = data?.indices       ?? [];
  const grupos       = data?.grupos        ?? [];
  const fecha        = data?.fecha;
  const esMock       = data?.esMock        ?? false;
  const fuenteNombre = data?._meta?.fuente ?? null;
  const erroresMeta  = data?._meta?.errores ?? [];

  // ¿El dato es de hoy o de un remate anterior?
  const hoy = new Date().toISOString().slice(0, 10);
  const fechaDato = fecha ? new Date(fecha).toISOString().slice(0, 10) : null;
  const esDatoDia = fechaDato === hoy;
  const esRemateDia = esDiaRemate(new Date().toISOString());

  // Stats de resumen rápido para KPI cards
  const novilloProm = grupos.find(g => g.id === 'novillos')?.items?.[0]?.valor ?? null;
  const novillitoProm = grupos.find(g => g.id === 'novillitos')?.items?.[0]?.valor ?? null;
  const vaquillonaProm = grupos.find(g => g.id === 'vaquillonas')?.items?.[0]?.valor ?? null;
  const vacaBuena = grupos.find(g => g.id === 'vacas')?.items?.find(i => /joven.*\+|buena|\+.*430/i.test(i.nombre))?.valor ?? null;
  const totalCabezas = grupos.reduce((s, g) => s + g.items.reduce((ss, i) => ss + (i.cabezas || 0), 0), 0);

  const KPI = [
    { lbl: 'Novillo Esp.',    sub: 'Esp.Joven + 430kg', v: novilloProm,    color: 'var(--accent)',  grupo: 'novillos' },
    { lbl: 'Novillito Esp.', sub: 'Esp. h 390kg',       v: novillitoProm,  color: 'var(--blue)',    grupo: 'novillitos' },
    { lbl: 'Vaquillona Esp.', sub: 'Esp. h 390kg',      v: vaquillonaProm, color: '#8fb8f0',        grupo: 'vaquillonas' },
    { lbl: 'Vaca Buena',      sub: 'Esp.Joven + 430kg', v: vacaBuena,      color: 'var(--text)',    grupo: 'vacas' },
  ];

  return (
    <div className="page-enter">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="ph">
        <div>
          <div className="ph-title">
            Hacienda{' '}
            <span className="help-pip" onClick={() => goPage('ayuda', 'glosario-hacienda')} title="Ayuda">?</span>
          </div>
          <div className="ph-sub" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span>Novillos · Novillitos · Vacas · Vaquillonas · Toros · Cañuelas MAG</span>
            {estado === 'ok' && !esMock && <><Badge type="live"/><span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)' }}>{fmtFecha(fecha)}</span></>}
            {estado === 'ok' && esMock  && <Badge type="demo"/>}
          </div>
        </div>
        <div className="ph-right" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {estado === 'ok' && !esMock && (
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--accent)', letterSpacing: '.06em' }}>
              LIVE · {grupos.reduce((s, g) => s + g.items.length, 0) + indices.length} precios
            </div>
          )}
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
      {estado === 'loading' && <Skeleton/>}
      {estado === 'error'   && <ErrorState error={error} onRetry={cargar}/>}

      {estado === 'ok' && (
        <>
          {/* ── Banner de estado — no hay amarillo, usa paleta del sistema ── */}
          {esMock ? (
            <div style={{
              background: 'var(--bg1)', border: '1px solid var(--line)',
              borderLeft: '3px solid var(--text3)',
              borderRadius: '0 10px 10px 0', padding: '12px 18px', marginBottom: 20,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, color: 'var(--text2)', letterSpacing: '.08em', marginBottom: 4 }}>
                    DATOS DE REFERENCIA
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>
                    No se pudo conectar con ninguna fuente del MAG en este momento.
                    Mostrando el último remate disponible: <strong style={{ color: 'var(--text2)' }}>{fmtFechaLarga(fecha)}</strong>.
                    {!esRemateDia && ' Hoy no hay remate programado (lunes y miércoles).'}
                    {' '}Los precios pueden no reflejar el mercado actual.
                  </div>
                </div>
                <Badge type="demo"/>
              </div>
              {erroresMeta.length > 0 && (
                <details style={{ marginTop: 10 }}>
                  <summary style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)', cursor: 'pointer' }}>
                    Detalle de errores ({erroresMeta.length} fuentes intentadas)
                  </summary>
                  <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {erroresMeta.map((e, i) => (
                      <div key={i} style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--red)' }}>✗ {e}</div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          ) : !esDatoDia ? (
            // Hay datos en vivo pero son de un remate anterior (día sin mercado)
            <div style={{
              background: 'var(--bg1)', border: '1px solid var(--line)',
              borderLeft: '3px solid var(--accent2)',
              borderRadius: '0 10px 10px 0', padding: '12px 18px', marginBottom: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            }}>
              <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, color: 'var(--text2)', letterSpacing: '.08em', display: 'block', marginBottom: 3 }}>ÚLTIMO REMATE DISPONIBLE</span>
                {!esRemateDia
                  ? 'Hoy no hubo remate (el MAG opera lunes y miércoles). '
                  : 'Remate de hoy aún no publicado. '}
                Datos del{' '}<strong style={{ color: 'var(--text)' }}>{fmtFechaLarga(fecha)}</strong>
                {fuenteNombre && <span style={{ color: 'var(--text3)' }}> · {fuenteNombre}</span>}
              </div>
              <Badge type="ant" label={fmtFecha(fecha)}/>
            </div>
          ) : (
            // Datos del día actual
            <div style={{
              background: 'var(--bg1)', border: '1px solid var(--line)',
              borderRadius: 10, padding: '10px 18px', marginBottom: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text2)' }}>
                Cañuelas MAG · <strong>{fmtFechaLarga(fecha)}</strong>
                {fuenteNombre && <span style={{ color: 'var(--text3)' }}> · {fuenteNombre}</span>}
                {lastFetch && <span style={{ color: 'var(--text3)' }}> · consultado {lastFetch.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span>}
              </div>
              <Badge type="live"/>
            </div>
          )}

          {/* ── KPI Cards ────────────────────────────────────────────────── */}
          <div className="section">
            <div className="section-title">Indicadores clave · resumen</div>
            <div className="grid grid-4">
              {KPI.map((k, i) => (
                <div key={i} className="stat"
                  style={{ cursor: 'pointer', transition: 'border-color .15s, background .15s' }}
                  onClick={() => setTab('faena')}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--line2)'; e.currentTarget.style.background = 'var(--bg2)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)';  e.currentTarget.style.background = ''; }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text2)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: k.color, flexShrink: 0 }}/>
                    {k.lbl}
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', background: 'var(--bg3)', color: 'var(--text3)', padding: '1px 6px', borderRadius: '3px', border: '1px solid var(--line)' }}>
                      {fmtFecha(fecha)}
                    </span>
                  </div>
                  <div className="stat-val" style={{ fontSize: '24px', marginBottom: 0 }}>
                    {k.v != null ? fmtARS(k.v) : '—'}
                  </div>
                  <div style={{ margin: '4px 0', fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text3)' }}>
                    ARS/kg vivo
                  </div>
                  <div className="stat-meta">{k.sub} · Cañuelas MAG</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Índices Cañuelas (INMAG / IGMAG / Arrendamiento) ─────────── */}
          {indices.length > 0 && (
            <div className="section">
              <div className="section-title">Índices Cañuelas MAG</div>
              <div className="grid grid-3">
                {indices.map(item => <IndiceCard key={item.id} item={item} esMock={esMock}/>)}
              </div>
              <MetodologiaBox
                title="Qué son los índices MAG"
                items={[
                  { term: 'INMAG', def: 'Índice de Novillo MAGna. Precio promedio ponderado por cabezas de la categoría Novillos Especiales Joven + 430kg. Es la referencia principal del mercado de Cañuelas y se usa como base para contratos de arrendamiento y otros acuerdos comerciales agropecuarios.' },
                  { term: 'IGMAG', def: 'Índice General MAGna. Promedio ponderado del conjunto del mercado Cañuelas, excluyendo la categoría "Mejores". Representa el precio medio de la hacienda bovina transaccionada en el remate. Calculado en RadarAgro como promedio ponderado por cabezas de todas las categorías.' },
                  { term: 'Arrendamiento', def: 'Índice de arrendamiento en equivalente hacienda. Expresa en ARS/ha/año cuánto vale arrendar un campo medido en kilos de novillo al precio del INMAG. En RadarAgro se estima como INMAG × 0,994 (relación histórica promedio del mercado Cañuelas). Para valores contractuales exactos, consultar las publicaciones oficiales del MAG.' },
                ]}
                fuentes="Fuente: Cañuelas MAG · Metodología oficial MAG para INMAG e IGMAG · Índice de arrendamiento: estimación RadarAgro basada en relación histórica INMAG"
              />
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

          <div className="section">
            {tab === 'faena'       && <TabFaena       grupos={grupos} fecha={fecha} esMock={esMock} fuenteNombre={fuenteNombre}/>}
            {tab === 'resumen'     && <TabResumen      grupos={grupos}/>}
            {tab === 'comparativa' && <TabComparativa  grupos={grupos}/>}
          </div>
        </>
      )}
    </div>
  );
}
