// HaciendaPage.jsx — Rediseño productor-centric v2
// Estética: Syne + JetBrains Mono + paleta azul/gris oscura del sistema
import React, { useState, useEffect, useCallback, useRef } from 'react';

// ── Paleta de grupos ────────────────────────────────────────────────────
const GRUPO_COLOR = {
  novillos:    '#5b9cf6',
  novillitos:  '#4abf78',
  vaquillonas: '#e8b84b',
  vacas:       '#a78bfa',
  toros:       '#e05c5c',
  mejores:     '#67d5c0',
};

// ── Metadatos de índices ────────────────────────────────────────────────
const INDICE_META = {
  'ar.canuelas.inmag':         { color: '#5b9cf6', label: 'INMAG',    desc: 'Novillo Referencia', unidad: 'ARS/kg vivo', icon: '◆' },
  'ar.canuelas.igmag':         { color: '#4abf78', label: 'IGMAG',    desc: 'Promedio General',   unidad: 'ARS/kg vivo', icon: '◈' },
  'ar.canuelas.arrendamiento': { color: '#e8b84b', label: 'Arrend.',  desc: 'Equiv. Hacienda',    unidad: 'ARS/ha/año',  icon: '◉' },
};

const ORDEN_GRUPOS = ['novillos', 'novillitos', 'vaquillonas', 'vacas', 'toros', 'mejores'];
const GRUPO_LABELS = {
  novillos: 'Novillos', novillitos: 'Novillitos', vaquillonas: 'Vaquillonas',
  vacas: 'Vacas', toros: 'Toros', mejores: 'Mejores',
};

// ── Formatters ──────────────────────────────────────────────────────────
const R    = n => Math.round(n);
const fARS = v => v == null ? '—' : '$ ' + R(v).toLocaleString('es-AR');
const fNum = v => v == null ? '—' : R(v).toLocaleString('es-AR');

function fFecha(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return iso; }
}

// ── Componentes base ────────────────────────────────────────────────────
const Mono = ({ children, style }) => (
  <span style={{ fontFamily: 'var(--mono)', ...style }}>{children}</span>
);

const Skel = ({ w = '60%', h = 14, mb = 0 }) => (
  <div style={{ height: h, background: 'var(--bg3)', borderRadius: 4, width: w, marginBottom: mb, opacity: .45, animation: 'pulse 1.5s ease-in-out infinite' }} />
);

function Badge({ type, label }) {
  const S = {
    live: { c: 'var(--green)',  bg: 'var(--green-bg)', dot: true,  txt: 'EN VIVO' },
    off:  { c: 'var(--text3)', bg: 'var(--bg3)',       dot: false, txt: 'OFFLINE' },
    info: { c: 'var(--accent)', bg: 'var(--acc-bg)',   dot: false, txt: label ?? 'INFO' },
    mag:  { c: '#e8b84b', bg: 'rgba(232,184,75,.12)', dot: false, txt: 'OFICIAL MAG' },
  };
  const s = S[type] ?? S.info;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700,
      letterSpacing: '.09em', textTransform: 'uppercase',
      color: s.c, background: s.bg, padding: '3px 8px', borderRadius: 4,
    }}>
      {s.dot && <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.c, display: 'inline-block' }} />}
      {s.txt}
    </span>
  );
}

// ── Barra de rango visual ───────────────────────────────────────────────
function RangeBar({ min, max, prom, mediana, color, height = 6 }) {
  if (min == null || max == null || prom == null) return <Mono style={{ color: 'var(--text3)', fontSize: 11 }}>—</Mono>;
  const span    = max - min || 1;
  const promPct = ((prom    - min) / span) * 100;
  const medPct  = mediana != null ? ((mediana - min) / span) * 100 : null;
  return (
    <div style={{ position: 'relative', height: height + 6, display: 'flex', alignItems: 'center' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, height: height, background: 'var(--bg3)', borderRadius: 3 }} />
      <div style={{ position: 'absolute', left: 0, right: 0, height: height, background: `${color}20`, borderRadius: 3 }} />
      {medPct != null && (
        <div style={{ position: 'absolute', left: `${medPct.toFixed(1)}%`, width: 2, height: height + 4, background: `${color}55`, borderRadius: 1, transform: 'translateX(-50%)', top: -2 }} />
      )}
      <div style={{ position: 'absolute', left: `${promPct.toFixed(1)}%`, width: 3, height: height + 6, background: color, borderRadius: 2, transform: 'translateX(-50%)', top: -3, boxShadow: `0 0 6px ${color}60` }} />
    </div>
  );
}

// ── Mini sparkline canvas ───────────────────────────────────────────────
function MiniSpark({ values, color, width = 60, height = 24 }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !values?.length || values.length < 2) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = width  * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);
    const mn = Math.min(...values), mx = Math.max(...values);
    const range = mx - mn || 1;
    const pad = 3;
    const pts = values.map((v, i) => ({
      x: pad + (i / (values.length - 1)) * (width - pad * 2),
      y: height - pad - ((v - mn) / range) * (height - pad * 2),
    }));
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, `${color}40`);
    grad.addColorStop(1, `${color}00`);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, height);
    pts.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(pts[pts.length - 1].x, height);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.beginPath();
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }, [values, color, width, height]);
  return <canvas ref={ref} style={{ width, height, display: 'block' }} />;
}

// ── Hero: Índice con sparkline ──────────────────────────────────────────
function IndiceHero({ item }) {
  const meta = INDICE_META[item.id] ?? { color: 'var(--accent)', label: item.nombre, desc: '', unidad: item.unidad, icon: '◆' };
  const hist = item.hist ?? [];
  return (
    <div className="stat" style={{ cursor: 'default', borderTop: `3px solid ${meta.color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <Mono style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.12em', color: meta.color, textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>
            {meta.icon} {meta.label}
          </Mono>
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>{meta.desc}</div>
        </div>
        {hist.length > 1 && <MiniSpark values={hist} color={meta.color} />}
      </div>
      <div style={{ fontFamily: 'var(--display)', fontSize: 32, fontWeight: 800, color: 'var(--white)', letterSpacing: '-.03em', lineHeight: 1, marginBottom: 10 }}>
        {fARS(item.valor)}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid var(--line)' }}>
        <Mono style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{meta.unidad}</Mono>
        <Mono style={{ fontSize: 9, color: 'var(--text3)' }}>{fFecha(item.fecha)}</Mono>
      </div>
    </div>
  );
}

// ── TAB: Resumen — vista productor ──────────────────────────────────────
function TabResumen({ categorias, grupos, totalCabezas, totalImporte, fecha }) {
  if (!categorias?.length) return null;

  const mejoresPorGrupo = ORDEN_GRUPOS.map(gid => {
    const cats = categorias.filter(c => c.grupo === gid);
    if (!cats.length) return null;
    const top = cats.reduce((a, b) => b.promedio > a.promedio ? b : a, cats[0]);
    const totalCab = cats.reduce((s, c) => s + (c.cabezas ?? 0), 0);
    return { gid, label: GRUPO_LABELS[gid], color: GRUPO_COLOR[gid], top, totalCab, cats };
  }).filter(Boolean);

  const globalMax = Math.max(...mejoresPorGrupo.map(g => g.top.promedio));

  return (
    <div>
      {/* Jornada stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: 12, marginBottom: 28 }}>
        {totalCabezas && (
          <div style={{ background: 'var(--bg2)', borderRadius: 10, padding: '14px 18px', border: '1px solid var(--line)' }}>
            <Mono style={{ fontSize: 9, color: 'var(--text3)', letterSpacing: '.1em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Cabezas ingresadas</Mono>
            <div style={{ fontFamily: 'var(--display)', fontSize: 26, fontWeight: 700, color: 'var(--white)', letterSpacing: '-.02em', lineHeight: 1 }}>{fNum(totalCabezas)}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>en la jornada · {fFecha(fecha)}</div>
          </div>
        )}
        {totalImporte && (
          <div style={{ background: 'var(--bg2)', borderRadius: 10, padding: '14px 18px', border: '1px solid var(--line)' }}>
            <Mono style={{ fontSize: 9, color: 'var(--text3)', letterSpacing: '.1em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Importe total</Mono>
            <div style={{ fontFamily: 'var(--display)', fontSize: 26, fontWeight: 700, color: 'var(--white)', letterSpacing: '-.02em', lineHeight: 1 }}>$ {R(totalImporte / 1_000_000).toLocaleString('es-AR')} M</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>ARS transaccionados</div>
          </div>
        )}
        <div style={{ background: 'var(--bg2)', borderRadius: 10, padding: '14px 18px', border: '1px solid var(--line)' }}>
          <Mono style={{ fontSize: 9, color: 'var(--text3)', letterSpacing: '.1em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Categorías</Mono>
          <div style={{ fontFamily: 'var(--display)', fontSize: 26, fontWeight: 700, color: 'var(--white)', letterSpacing: '-.02em', lineHeight: 1 }}>{categorias.length}</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>con precio en la jornada</div>
        </div>
      </div>

      {/* Mejor por grupo */}
      <div className="section-title">Mejor precio por categoría</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {mejoresPorGrupo.map(({ gid, label, color, top, totalCab, cats }) => {
          const pct    = (top.promedio / globalMax) * 100;
          const minPct = top.minimo != null ? (top.minimo / globalMax) * 100 : pct;
          const maxPct = top.maximo != null ? (top.maximo / globalMax) * 100 : pct;

          return (
            <div key={gid} style={{
              background: 'var(--bg1)', border: '1px solid var(--line)', borderRadius: 10,
              padding: '14px 18px', borderLeft: `3px solid ${color}`,
              display: 'grid', gridTemplateColumns: '130px 1fr auto', gap: 16, alignItems: 'center',
            }}>
              <div>
                <div style={{ fontFamily: 'var(--display)', fontSize: 13, fontWeight: 600, color: 'var(--white)', marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{top.nombreRaw ?? top.nombre}</div>
                {totalCab > 0 && (
                  <Mono style={{ fontSize: 9, color: 'var(--text3)', display: 'block', marginTop: 3 }}>{fNum(totalCab)} cab. total</Mono>
                )}
              </div>

              <div>
                <div style={{ position: 'relative', height: 26, background: 'var(--bg3)', borderRadius: 5, overflow: 'hidden', marginBottom: 4 }}>
                  <div style={{ position: 'absolute', left: `${minPct.toFixed(1)}%`, width: `${(maxPct - minPct).toFixed(1)}%`, height: '100%', background: `${color}25` }} />
                  <div style={{ position: 'absolute', left: 0, width: `${pct.toFixed(1)}%`, height: '100%', background: `${color}45`, borderRadius: '0 4px 4px 0', transition: 'width .5s ease' }} />
                  {top.cabezas > 0 && (
                    <Mono style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 9, color: 'var(--text3)' }}>{fNum(top.cabezas)} cab.</Mono>
                  )}
                </div>
                {/* Mini barras por sub-categoría */}
                <div style={{ display: 'flex', gap: 3 }}>
                  {cats.slice(0, 6).map(cat => (
                    <div key={cat.id} title={`${cat.nombreRaw}: ${fARS(cat.promedio)}`} style={{
                      height: 4, flex: 1, borderRadius: 2,
                      background: color,
                      opacity: 0.2 + 0.8 * (cat.promedio / globalMax),
                    }} />
                  ))}
                </div>
              </div>

              <div style={{ textAlign: 'right', minWidth: 100 }}>
                <Mono style={{ fontSize: 16, fontWeight: 700, color, display: 'block', letterSpacing: '-.01em' }}>{fARS(top.promedio)}</Mono>
                {top.kgProm != null && (
                  <Mono style={{ fontSize: 9, color: 'var(--text3)', display: 'block', marginTop: 2 }}>{fNum(top.kgProm)} kg prom.</Mono>
                )}
                {top.minimo != null && top.maximo != null && (
                  <Mono style={{ fontSize: 9, color: 'var(--text3)', display: 'block', marginTop: 1 }}>{fARS(top.minimo)} – {fARS(top.maximo)}</Mono>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="source">Fuente: mercadoagroganadero.com.ar · ARS/kg vivo · Cañuelas MAG · Res. 32/2018 APN</div>
    </div>
  );
}

// ── TAB: Mercado del día ─────────────────────────────────────────────────
function TabMercado({ categorias }) {
  const [ordenCol, setOrdenCol]       = useState('grupo');
  const [ordenDir, setOrdenDir]       = useState('asc');
  const [filtroGrupo, setFiltroGrupo] = useState('todos');

  if (!categorias?.length) return (
    <div className="alert-strip warn"><span className="alert-icon">!</span><span className="alert-text">Sin datos de categorías.</span></div>
  );

  const toggleOrden = col => {
    if (ordenCol === col) setOrdenDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setOrdenCol(col); setOrdenDir(col === 'grupo' ? 'asc' : 'desc'); }
  };
  const arrow = col => ordenCol === col ? (ordenDir === 'asc' ? ' ↑' : ' ↓') : '';

  let rows = filtroGrupo === 'todos' ? categorias : categorias.filter(c => c.grupo === filtroGrupo);
  rows = [...rows].sort((a, b) => {
    const mult = ordenDir === 'asc' ? 1 : -1;
    if (ordenCol === 'grupo') {
      const ga = ORDEN_GRUPOS.indexOf(a.grupo), gb = ORDEN_GRUPOS.indexOf(b.grupo);
      return ga !== gb ? (ga - gb) * mult : (b.promedio - a.promedio);
    }
    if (ordenCol === 'promedio') return (a.promedio - b.promedio) * mult;
    if (ordenCol === 'cabezas')  return ((a.cabezas ?? 0) - (b.cabezas ?? 0)) * mult;
    if (ordenCol === 'kgProm')   return ((a.kgProm ?? 0) - (b.kgProm ?? 0)) * mult;
    return 0;
  });

  const gruposPresentes = [...new Set(categorias.map(c => c.grupo))];
  const globalMin = Math.min(...categorias.map(c => c.minimo ?? c.promedio));
  const globalMax = Math.max(...categorias.map(c => c.maximo ?? c.promedio));

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <Mono style={{ fontSize: 9, color: 'var(--text3)', letterSpacing: '.08em', marginRight: 4 }}>FILTRAR</Mono>
        {['todos', ...gruposPresentes].map(g => {
          const active = filtroGrupo === g;
          const color  = g === 'todos' ? 'var(--accent)' : (GRUPO_COLOR[g] ?? 'var(--accent)');
          return (
            <button key={g} onClick={() => setFiltroGrupo(g)} style={{
              fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600, padding: '4px 12px', borderRadius: 6, cursor: 'pointer',
              border: `1px solid ${active ? color : 'var(--line)'}`, background: active ? `${color}18` : 'transparent',
              color: active ? color : 'var(--text3)', transition: 'all .15s',
            }}>
              {g === 'todos' ? 'TODOS' : GRUPO_LABELS[g]?.toUpperCase() ?? g.toUpperCase()}
            </button>
          );
        })}
      </div>

      <div className="tbl-wrap tbl-scroll">
        <table>
          <thead>
            <tr>
              <th style={{ cursor: 'pointer' }} onClick={() => toggleOrden('grupo')}>Categoría{arrow('grupo')}</th>
              <th style={{ minWidth: 120 }}>Rango</th>
              <th className="r" style={{ cursor: 'pointer' }} onClick={() => toggleOrden('promedio')}>Promedio{arrow('promedio')}</th>
              <th className="r">Mediana</th>
              <th className="r" style={{ cursor: 'pointer' }} onClick={() => toggleOrden('cabezas')}>Cabezas{arrow('cabezas')}</th>
              <th className="r" style={{ cursor: 'pointer' }} onClick={() => toggleOrden('kgProm')}>Kg prom.{arrow('kgProm')}</th>
              <th className="r">Mín / Máx</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((cat, i) => {
              const color      = GRUPO_COLOR[cat.grupo] ?? 'var(--accent)';
              const prevGrupo  = i > 0 ? rows[i - 1].grupo : null;
              const isNewGrupo = cat.grupo !== prevGrupo;
              return (
                <React.Fragment key={cat.id}>
                  {isNewGrupo && filtroGrupo === 'todos' && (
                    <tr>
                      <td colSpan={7} style={{ padding: '8px 16px 4px', background: 'var(--bg)', borderBottom: '1px solid var(--line)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                          <Mono style={{ fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text3)', fontWeight: 600 }}>
                            {GRUPO_LABELS[cat.grupo] ?? cat.grupo}
                          </Mono>
                        </div>
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {filtroGrupo !== 'todos' && <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />}
                        <span style={{ fontSize: 13, color: 'var(--text)' }}>{cat.nombre}</span>
                        {cat.nombreRaw && cat.nombreRaw !== cat.nombre && (
                          <Mono style={{ fontSize: 9, color: 'var(--text3)', background: 'var(--bg3)', padding: '1px 5px', borderRadius: 3 }}>{cat.nombreRaw}</Mono>
                        )}
                      </div>
                    </td>
                    <td><RangeBar min={globalMin} max={globalMax} prom={cat.promedio} mediana={cat.mediana} color={color} height={5} /></td>
                    <td className="r"><Mono style={{ fontSize: 13, fontWeight: 700, color }}>{fARS(cat.promedio)}</Mono></td>
                    <td className="r"><Mono style={{ fontSize: 12, color: 'var(--text2)' }}>{fARS(cat.mediana)}</Mono></td>
                    <td className="r"><Mono style={{ fontSize: 12, color: 'var(--text)' }}>{fNum(cat.cabezas)}</Mono></td>
                    <td className="r"><Mono style={{ fontSize: 12, color: 'var(--text2)' }}>{cat.kgProm != null ? `${fNum(cat.kgProm)} kg` : '—'}</Mono></td>
                    <td className="r"><Mono style={{ fontSize: 11, color: 'var(--text3)' }}>{cat.minimo != null ? fARS(cat.minimo) : '—'} / {cat.maximo != null ? fARS(cat.maximo) : '—'}</Mono></td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="source" style={{ marginTop: 10 }}>
        Fuente: mercadoagroganadero.com.ar · ARS/kg vivo · Res. 32/2018 APN · Barra: posición promedio en rango global mín–máx
      </div>
    </div>
  );
}

// ── TAB: Por grupo ───────────────────────────────────────────────────────
function TabGrupos({ grupos, categorias }) {
  if (!grupos?.length) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {grupos.map(g => {
        const color       = GRUPO_COLOR[g.id] ?? 'var(--accent)';
        const rawDelGrupo = (categorias ?? []).filter(c => c.grupo === g.id);
        const sorted      = [...rawDelGrupo].sort((a, b) => b.promedio - a.promedio);
        const maxProm     = sorted[0]?.promedio ?? 1;
        const totalCab    = rawDelGrupo.reduce((s, c) => s + (c.cabezas ?? 0), 0);

        return (
          <div key={g.id} style={{ background: 'var(--bg1)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: `${color}08` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                <span style={{ fontFamily: 'var(--display)', fontSize: 16, fontWeight: 600, color: 'var(--white)' }}>{g.label}</span>
                <Mono style={{ fontSize: 10, color, background: `${color}18`, padding: '2px 8px', borderRadius: 4 }}>{sorted.length} cat.</Mono>
              </div>
              <div style={{ textAlign: 'right' }}>
                <Mono style={{ fontSize: 9, color: 'var(--text3)', display: 'block' }}>TOTAL CABEZAS</Mono>
                <Mono style={{ fontSize: 14, fontWeight: 700, color: 'var(--text2)' }}>{fNum(totalCab)}</Mono>
              </div>
            </div>
            <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {sorted.map((cat, idx) => {
                const pct = maxProm > 0 ? (cat.promedio / maxProm) * 100 : 0;
                return (
                  <div key={cat.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'baseline' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {idx === 0 && <Mono style={{ fontSize: 8, color, background: `${color}18`, padding: '1px 5px', borderRadius: 3, letterSpacing: '.06em' }}>TOP</Mono>}
                        <span style={{ fontSize: 12, color: 'var(--text2)' }}>{cat.nombreRaw ?? cat.nombre}</span>
                        {cat.cabezas > 0 && <Mono style={{ fontSize: 9, color: 'var(--text3)', background: 'var(--bg3)', padding: '1px 5px', borderRadius: 3 }}>{fNum(cat.cabezas)} cab.</Mono>}
                        {cat.kgProm != null && <Mono style={{ fontSize: 9, color: 'var(--text3)', background: 'var(--bg3)', padding: '1px 5px', borderRadius: 3 }}>{fNum(cat.kgProm)} kg</Mono>}
                      </div>
                      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                        {cat.mediana != null && <Mono style={{ fontSize: 11, color: 'var(--text3)' }}>med. {fARS(cat.mediana)}</Mono>}
                        <Mono style={{ fontSize: 14, fontWeight: 700, color }}>{fARS(cat.promedio)}</Mono>
                      </div>
                    </div>
                    <div style={{ position: 'relative', height: 6, background: 'var(--bg3)', borderRadius: 3 }}>
                      <div style={{ position: 'absolute', left: 0, width: `${pct.toFixed(1)}%`, height: '100%', background: `${color}55`, borderRadius: 3, transition: 'width .4s ease' }} />
                      {cat.minimo != null && cat.maximo != null && (
                        <div style={{ position: 'absolute', left: `${((cat.minimo / maxProm) * 100).toFixed(1)}%`, width: `${(((cat.maximo - cat.minimo) / maxProm) * 100).toFixed(1)}%`, height: '100%', background: `${color}25`, borderRadius: 3 }} />
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                      <Mono style={{ fontSize: 9, color: 'var(--text3)' }}>mín {fARS(cat.minimo)}</Mono>
                      <Mono style={{ fontSize: 9, color: 'var(--text3)' }}>máx {fARS(cat.maximo)}</Mono>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      <div className="source">Fuente: mercadoagroganadero.com.ar · ARS/kg vivo · Res. 32/2018 APN</div>
    </div>
  );
}

// ── TAB: Comparativa heat-ranked ────────────────────────────────────────
function TabComparativa({ categorias }) {
  if (!categorias?.length) return null;

  const sorted    = [...categorias].sort((a, b) => b.promedio - a.promedio);
  const globalMax = sorted[0]?.promedio ?? 1;
  const globalMin = sorted[sorted.length - 1]?.promedio ?? 0;
  const range     = globalMax - globalMin || 1;

  const heatColor = v => {
    const t = (v - globalMin) / range;
    if (t > 0.8) return '#4abf78';
    if (t > 0.6) return '#5b9cf6';
    if (t > 0.4) return '#e8b84b';
    if (t > 0.2) return '#a78bfa';
    return '#e05c5c';
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <Mono style={{ fontSize: 9, color: 'var(--text3)', letterSpacing: '.08em' }}>RANKING PRECIO</Mono>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {[{ label: 'Mayor', c: '#4abf78' }, { label: '↑', c: '#5b9cf6' }, { label: '~', c: '#e8b84b' }, { label: '↓', c: '#a78bfa' }, { label: 'Menor', c: '#e05c5c' }].map(({ label, c }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
              <Mono style={{ fontSize: 9, color: 'var(--text3)' }}>{label}</Mono>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {sorted.map((cat, idx) => {
          const color   = heatColor(cat.promedio);
          const pct     = (cat.promedio / globalMax) * 100;
          const minPct  = cat.minimo != null ? (cat.minimo  / globalMax) * 100 : pct;
          const maxPct  = cat.maximo != null ? (cat.maximo  / globalMax) * 100 : pct;
          const grupClr = GRUPO_COLOR[cat.grupo] ?? 'var(--accent)';

          return (
            <div key={cat.id} style={{
              display: 'grid', gridTemplateColumns: '28px 190px 1fr 130px',
              alignItems: 'center', gap: 12, padding: '5px 0',
              borderBottom: '1px solid var(--line)',
            }}>
              <Mono style={{ fontSize: 10, color: 'var(--text3)', textAlign: 'right' }}>
                {String(idx + 1).padStart(2, '0')}
              </Mono>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: grupClr, flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cat.nombreRaw ?? cat.nombre}</div>
                  <Mono style={{ fontSize: 9, color: 'var(--text3)' }}>{GRUPO_LABELS[cat.grupo]}{cat.cabezas > 0 ? ` · ${fNum(cat.cabezas)} cab.` : ''}</Mono>
                </div>
              </div>
              <div style={{ position: 'relative', height: 22, background: 'var(--bg2)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ position: 'absolute', left: `${minPct.toFixed(1)}%`, width: `${(maxPct - minPct).toFixed(1)}%`, height: '100%', background: `${color}18` }} />
                <div style={{ position: 'absolute', left: 0, width: `${pct.toFixed(1)}%`, height: '100%', background: `${color}40`, borderRadius: '0 3px 3px 0', transition: 'width .4s ease' }} />
              </div>
              <div style={{ textAlign: 'right' }}>
                <Mono style={{ fontSize: 13, fontWeight: 700, color, letterSpacing: '-.01em' }}>{fARS(cat.promedio)}</Mono>
                {cat.kgProm != null && <Mono style={{ fontSize: 9, color: 'var(--text3)', display: 'block' }}>{fNum(cat.kgProm)} kg</Mono>}
              </div>
            </div>
          );
        })}
      </div>
      <div className="source" style={{ marginTop: 14 }}>
        Ranking completo · color = calor de precio relativo · sombra mín–máx · ARS/kg vivo · Fuente: mercadoagroganadero.com.ar
      </div>
    </div>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div>
      <style>{`@keyframes pulse{0%,100%{opacity:.35}50%{opacity:.8}}`}</style>
      <div className="grid grid-3" style={{ marginBottom: 28 }}>
        {[0,1,2].map(i => <div key={i} className="stat"><Skel w="45%" h={10} mb={14} /><Skel w="75%" h={34} mb={14} /><Skel w="55%" h={9} /></div>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
        {[0,1,2].map(i => <div key={i} style={{ height: 80, background: 'var(--bg2)', borderRadius: 10, opacity: .4, animation: 'pulse 1.5s ease-in-out infinite' }} />)}
      </div>
      {[0,1,2,3,4,5].map(i => (
        <div key={i} style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
          <Skel w={130} h={48} /><div style={{ flex: 1 }}><Skel w="100%" h={26} mb={6} /><Skel w="60%" h={10} /></div><Skel w={100} h={48} />
        </div>
      ))}
    </div>
  );
}

// ── Error ─────────────────────────────────────────────────────────────────
function ErrorState({ error, onRetry }) {
  return (
    <div style={{ padding: '48px 0', textAlign: 'center' }}>
      <div style={{ fontSize: 36, marginBottom: 14 }}>⚠</div>
      <div style={{ fontFamily: 'var(--display)', fontSize: 18, color: 'var(--text)', marginBottom: 10 }}>No se pudieron cargar los datos del MAG</div>
      <Mono style={{ fontSize: 11, color: 'var(--red)', background: 'var(--red-bg)', border: '1px solid rgba(224,92,92,.3)', borderRadius: 8, padding: '8px 18px', display: 'inline-block', marginBottom: 22 }}>{error}</Mono>
      <br />
      <button onClick={onRetry} style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, padding: '10px 24px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', marginTop: 10 }}>
        Reintentar
      </button>
    </div>
  );
}

// ── TABS ──────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'resumen',     label: 'Resumen'        },
  { id: 'mercado',     label: 'Mercado del día' },
  { id: 'grupos',      label: 'Por grupo'       },
  { id: 'comparativa', label: 'Comparativa'     },
];

// ── MAIN ──────────────────────────────────────────────────────────────────
export function HaciendaPage({ goPage }) {
  const [tab,       setTab]       = useState('resumen');
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

  const indices      = data?.indices      ?? [];
  const grupos       = data?.grupos       ?? [];
  const categorias   = data?.categorias   ?? [];
  const fecha        = data?.fecha;
  const totalCabezas = data?.totalCabezas;
  const totalImporte = data?.totalImporte;
  const totalPrecios = categorias.length + indices.length;

  return (
    <div className="page-enter">

      {/* Header */}
      <div className="ph">
        <div>
          <div className="ph-title">
            Hacienda{' '}
            <span className="help-pip" onClick={() => goPage?.('ayuda', 'glosario-hacienda')} title="Ayuda">?</span>
          </div>
          <div className="ph-sub">Novillos · Novillitos · Vacas · Vaquillonas · Toros · Cañuelas MAG</div>
        </div>
        <div className="ph-right">
          {estado === 'ok'      && <Badge type="live" />}
          {estado === 'ok'      && <Badge type="mag" />}
          {estado === 'ok'      && (
            <Mono style={{ fontSize: 10, color: 'var(--text3)' }}>
              {totalPrecios} precios · {lastFetch?.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
            </Mono>
          )}
          {estado === 'loading' && <Mono style={{ fontSize: 10, color: 'var(--text3)' }}>cargando…</Mono>}
          {estado === 'error'   && <Mono style={{ fontSize: 10, color: 'var(--red)' }}>SIN DATOS</Mono>}
          <button
            onClick={cargar} disabled={estado === 'loading'} title="Actualizar"
            style={{ background: 'var(--bg2)', border: '1px solid var(--line)', color: 'var(--text3)', borderRadius: 6, padding: '5px 10px', fontFamily: 'var(--mono)', fontSize: 10, cursor: 'pointer', opacity: estado === 'loading' ? .5 : 1 }}
          >↺</button>
        </div>
      </div>

      {estado === 'loading' && <Skeleton />}
      {estado === 'error'   && <ErrorState error={error} onRetry={cargar} />}

      {estado === 'ok' && (
        <>
          {/* Índices hero */}
          {indices.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <div className="section-title">Índices Cañuelas MAG</div>
              <div className="grid grid-3">
                {indices.map(item => <IndiceHero key={item.id} item={item} />)}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="tabs">
            {TABS.map(t => (
              <button key={t.id} className={`tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>

          <div>
            {tab === 'resumen'     && <TabResumen     categorias={categorias} grupos={grupos} totalCabezas={totalCabezas} totalImporte={totalImporte} fecha={fecha} />}
            {tab === 'mercado'     && <TabMercado      categorias={categorias} />}
            {tab === 'grupos'      && <TabGrupos       grupos={grupos} categorias={categorias} />}
            {tab === 'comparativa' && <TabComparativa  categorias={categorias} />}
          </div>
        </>
      )}
    </div>
  );
}
