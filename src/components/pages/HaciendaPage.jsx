// HaciendaPage.jsx — Rediseño v3 · Estética Financiero · Fuente oficial MAG Cañuelas
import React, { useState, useEffect, useCallback } from 'react';

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
  'ar.canuelas.inmag':         { color: '#5b9cf6', label: 'INMAG',         desc: 'Índice Novillo MAGna · precio de referencia novillos especiales', unidad: 'ARS/kg vivo' },
  'ar.canuelas.igmag':         { color: '#4abf78', label: 'IGMAG',         desc: 'Índice General MAGna · promedio ponderado del mercado',           unidad: 'ARS/kg vivo' },
  'ar.canuelas.arrendamiento': { color: '#e8b84b', label: 'Arrendamiento', desc: 'Índice de arrendamiento en equivalente hacienda',                  unidad: 'ARS/ha/año'  },
};

const ORDEN_GRUPOS = ['novillos', 'novillitos', 'vaquillonas', 'vacas', 'toros', 'mejores'];
const GRUPO_LABELS = { novillos: 'Novillos', novillitos: 'Novillitos', vaquillonas: 'Vaquillonas', vacas: 'Vacas', toros: 'Toros', mejores: 'Mejores' };

// ── Formatters ──────────────────────────────────────────────────────────
const R    = n => Math.round(n);
const fARS = v => v == null ? '—' : '$\u00a0' + R(v).toLocaleString('es-AR');
const fNum = v => v == null ? '—' : R(v).toLocaleString('es-AR');

function fFecha(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}
function fFechaCorta(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return iso; }
}

// ── Componentes base ────────────────────────────────────────────────────
const Mono = ({ children, style }) => (
  <span style={{ fontFamily: 'var(--mono)', ...style }}>{children}</span>
);

function Badge({ type, label }) {
  const S = {
    live: { c: 'var(--green)',  bg: 'var(--green-bg)', dot: true,  txt: 'EN VIVO' },
    off:  { c: 'var(--text3)', bg: 'var(--bg3)',       dot: false, txt: 'OFFLINE' },
    info: { c: 'var(--accent)', bg: 'var(--acc-bg)',   dot: false, txt: label ?? 'INFO' },
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

const Skel = ({ w = '60%', h = 14, mb = 0 }) => (
  <div style={{ height: h, background: 'var(--bg3)', borderRadius: 4, width: w, marginBottom: mb, opacity: .5, animation: 'pulse 1.4s ease-in-out infinite' }} />
);

// ── Barra de rango ──────────────────────────────────────────────────────
function RangeBar({ min, max, prom, mediana, color }) {
  if (min == null || max == null || prom == null) return <span style={{ color: 'var(--text3)', fontSize: 11 }}>—</span>;
  const span    = max - min || 1;
  const promPct = ((prom    - min) / span) * 100;
  const medPct  = mediana != null ? ((mediana - min) / span) * 100 : null;
  return (
    <div style={{ position: 'relative', height: 20, display: 'flex', alignItems: 'center', minWidth: 90 }}>
      <div style={{ position: 'absolute', left: 0, right: 0, height: 4, background: 'var(--bg3)', borderRadius: 2 }} />
      <div style={{ position: 'absolute', left: 0, right: 0, height: 4, background: `${color}22`, borderRadius: 2 }} />
      {medPct != null && (
        <div style={{ position: 'absolute', left: `${medPct.toFixed(1)}%`, width: 2, height: 10, background: `${color}66`, borderRadius: 1, transform: 'translateX(-50%)' }} />
      )}
      <div style={{ position: 'absolute', left: `${promPct.toFixed(1)}%`, width: 3, height: 14, background: color, borderRadius: 2, transform: 'translateX(-50%)', boxShadow: `0 0 4px ${color}80` }} />
    </div>
  );
}

// ── Tarjeta de índice — misma estructura que stat de Financiero ─────────
function IndiceCard({ item }) {
  const meta = INDICE_META[item.id] ?? { color: 'var(--accent)', label: item.nombre, desc: '', unidad: item.unidad };
  return (
    <div className="stat" style={{ cursor: 'default' }}>
      <div style={{ fontSize: 15, fontWeight: 400, color: 'var(--text2)', marginBottom: 8, display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
        {meta.label}
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, background: 'var(--bg3)', color: 'var(--text3)', padding: '1px 6px', borderRadius: 3, border: '1px solid var(--line)' }}>
          {meta.unidad}
        </span>
      </div>
      <div className="stat-val" style={{ fontSize: 24, marginBottom: 0 }}>{fARS(item.valor)}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0' }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)' }}>{fFecha(item.fecha)}</span>
      </div>
      <div className="stat-meta">{meta.desc}</div>
    </div>
  );
}

// ── TAB: Resumen — vista rápida para el productor ───────────────────────
function TabResumen({ categorias, totalCabezas, totalImporte, fecha }) {
  if (!categorias?.length) return null;

  const mejoresPorGrupo = ORDEN_GRUPOS.map(gid => {
    const cats = categorias.filter(c => c.grupo === gid);
    if (!cats.length) return null;
    const top      = cats.reduce((a, b) => b.promedio > a.promedio ? b : a, cats[0]);
    const totalCab = cats.reduce((s, c) => s + (c.cabezas ?? 0), 0);
    return { gid, label: GRUPO_LABELS[gid], color: GRUPO_COLOR[gid], top, totalCab };
  }).filter(Boolean);

  return (
    <div>
      {/* Stats de jornada */}
      {(totalCabezas || totalImporte) && (
        <div className="grid grid-3" style={{ maxWidth: 700, marginBottom: 28 }}>
          {totalCabezas && (
            <div className="stat" style={{ cursor: 'default' }}>
              <div style={{ fontSize: 15, fontWeight: 400, color: 'var(--text2)', marginBottom: 8 }}>Cabezas ingresadas</div>
              <div className="stat-val" style={{ fontSize: 24, marginBottom: 0 }}>{fNum(totalCabezas)}</div>
              <div style={{ margin: '4px 0' }}></div>
              <div className="stat-meta">jornada · {fFechaCorta(fecha)}</div>
            </div>
          )}
          {totalImporte && (
            <div className="stat" style={{ cursor: 'default' }}>
              <div style={{ fontSize: 15, fontWeight: 400, color: 'var(--text2)', marginBottom: 8, display: 'flex', alignItems: 'baseline', gap: 6 }}>
                Importe total
                <span style={{ fontFamily: 'var(--mono)', fontSize: 9, background: 'var(--bg3)', color: 'var(--text3)', padding: '1px 6px', borderRadius: 3, border: '1px solid var(--line)' }}>ARS</span>
              </div>
              <div className="stat-val" style={{ fontSize: 24, marginBottom: 0 }}>
                ${'\u00a0'}{R(totalImporte / 1_000_000).toLocaleString('es-AR')} M
              </div>
              <div style={{ margin: '4px 0' }}></div>
              <div className="stat-meta">transaccionados en la jornada</div>
            </div>
          )}
          <div className="stat" style={{ cursor: 'default' }}>
            <div style={{ fontSize: 15, fontWeight: 400, color: 'var(--text2)', marginBottom: 8 }}>Categorías</div>
            <div className="stat-val" style={{ fontSize: 24, marginBottom: 0 }}>{categorias.length}</div>
            <div style={{ margin: '4px 0' }}></div>
            <div className="stat-meta">con precio en la jornada</div>
          </div>
        </div>
      )}

      {/* Mejor por grupo */}
      <div className="section-title">Mejor precio por categoría</div>
      <div style={{ background: 'var(--bg1)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
        {mejoresPorGrupo.map(({ gid, label, color, top, totalCab }, i) => (
          <div key={gid} style={{
            display: 'grid',
            gridTemplateColumns: '120px 1fr auto',
            alignItems: 'center',
            gap: 20,
            padding: '14px 20px',
            borderBottom: i < mejoresPorGrupo.length - 1 ? '1px solid var(--line)' : 'none',
          }}>
            {/* Grupo */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--white)' }}>{label}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', paddingLeft: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {top.nombreRaw ?? top.nombre}
              </div>
              {totalCab > 0 && (
                <Mono style={{ fontSize: 9, color: 'var(--text3)', paddingLeft: 14, display: 'block', marginTop: 2 }}>
                  {fNum(totalCab)} cab.
                </Mono>
              )}
            </div>

            {/* Barra rango */}
            <div>
              <RangeBar min={top.minimo} max={top.maximo} prom={top.promedio} mediana={top.mediana} color={color} />
              {top.minimo != null && top.maximo != null && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                  <Mono style={{ fontSize: 9, color: 'var(--text3)' }}>{fARS(top.minimo)}</Mono>
                  <Mono style={{ fontSize: 9, color: 'var(--text3)' }}>{fARS(top.maximo)}</Mono>
                </div>
              )}
            </div>

            {/* Precio */}
            <div style={{ textAlign: 'right', minWidth: 90 }}>
              <Mono style={{ fontSize: 16, fontWeight: 700, color, display: 'block' }}>{fARS(top.promedio)}</Mono>
              {top.kgProm != null && (
                <Mono style={{ fontSize: 9, color: 'var(--text3)', display: 'block', marginTop: 2 }}>{fNum(top.kgProm)} kg prom.</Mono>
              )}
              {top.mediana != null && (
                <Mono style={{ fontSize: 9, color: 'var(--text3)', display: 'block', marginTop: 1 }}>med. {fARS(top.mediana)}</Mono>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="source" style={{ marginTop: 10 }}>
        Fuente: mercadoagroganadero.com.ar · ARS/kg vivo · Res. 32/2018 APN · mejor precio de cada categoría
      </div>
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

  const gruposPresentes  = [...new Set(categorias.map(c => c.grupo))];
  const allMin = Math.min(...categorias.map(c => c.minimo ?? c.promedio));
  const allMax = Math.max(...categorias.map(c => c.maximo ?? c.promedio));

  return (
    <div>
      {/* Filtro por grupo */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <Mono style={{ fontSize: 9, color: 'var(--text3)', letterSpacing: '.08em', marginRight: 4 }}>FILTRAR</Mono>
        {['todos', ...gruposPresentes].map(g => {
          const active = filtroGrupo === g;
          const color  = g === 'todos' ? 'var(--accent)' : (GRUPO_COLOR[g] ?? 'var(--accent)');
          return (
            <button key={g} onClick={() => setFiltroGrupo(g)} style={{
              fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600,
              padding: '4px 12px', borderRadius: 6, cursor: 'pointer',
              border: `1px solid ${active ? color : 'var(--line)'}`,
              background: active ? `${color}18` : 'transparent',
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
              <th style={{ width: 110 }}>Rango de precio</th>
              <th className="r" style={{ cursor: 'pointer' }} onClick={() => toggleOrden('promedio')}>Promedio{arrow('promedio')}</th>
              <th className="r">Mediana</th>
              <th className="r" style={{ cursor: 'pointer' }} onClick={() => toggleOrden('cabezas')}>Cabezas{arrow('cabezas')}</th>
              <th className="r" style={{ cursor: 'pointer' }} onClick={() => toggleOrden('kgProm')}>Peso prom.{arrow('kgProm')}</th>
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
                        {filtroGrupo !== 'todos' && (
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
                        )}
                        <span style={{ fontSize: 13, color: 'var(--text)' }}>{cat.nombre}</span>
                        {cat.nombreRaw && cat.nombreRaw !== cat.nombre && (
                          <Mono style={{ fontSize: 9, color: 'var(--text3)', background: 'var(--bg3)', padding: '1px 5px', borderRadius: 3 }}>
                            {cat.nombreRaw}
                          </Mono>
                        )}
                      </div>
                    </td>
                    <td>
                      <RangeBar min={cat.minimo} max={cat.maximo} prom={cat.promedio} mediana={cat.mediana} color={color} />
                    </td>
                    <td className="r">
                      <Mono style={{ fontSize: 13, fontWeight: 700, color }}>{fARS(cat.promedio)}</Mono>
                    </td>
                    <td className="r">
                      <Mono style={{ fontSize: 12, color: 'var(--text2)' }}>{fARS(cat.mediana)}</Mono>
                    </td>
                    <td className="r">
                      <Mono style={{ fontSize: 12, color: 'var(--text)' }}>{fNum(cat.cabezas)}</Mono>
                    </td>
                    <td className="r">
                      <Mono style={{ fontSize: 12, color: 'var(--text2)' }}>{cat.kgProm != null ? `${fNum(cat.kgProm)} kg` : '—'}</Mono>
                    </td>
                    <td className="r">
                      <Mono style={{ fontSize: 11, color: 'var(--text3)' }}>
                        {cat.minimo != null ? fARS(cat.minimo) : '—'} / {cat.maximo != null ? fARS(cat.maximo) : '—'}
                      </Mono>
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="source" style={{ marginTop: 10 }}>
        Fuente: mercadoagroganadero.com.ar · ARS/kg vivo · Res. 32/2018 APN · Barra: mín–máx, marca = promedio
      </div>
    </div>
  );
}

// ── TAB: Por grupo ───────────────────────────────────────────────────────
function TabGrupos({ grupos, categorias }) {
  if (!grupos?.length) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {grupos.map(g => {
        const color       = GRUPO_COLOR[g.id] ?? 'var(--accent)';
        const rawDelGrupo = (categorias ?? []).filter(c => c.grupo === g.id);
        const totalCab    = rawDelGrupo.reduce((s, c) => s + (c.cabezas ?? 0), 0);
        const maxProm     = Math.max(...rawDelGrupo.map(c => c.promedio));

        return (
          <div key={g.id} style={{ background: 'var(--bg1)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: `${color}08` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                <span style={{ fontFamily: 'var(--display)', fontSize: 16, fontWeight: 600, color: 'var(--white)' }}>{g.label}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <Mono style={{ fontSize: 9, color: 'var(--text3)', display: 'block' }}>CABEZAS</Mono>
                <Mono style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)' }}>{fNum(totalCab)}</Mono>
              </div>
            </div>

            <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {rawDelGrupo.sort((a, b) => b.promedio - a.promedio).map(cat => {
                const pct = maxProm > 0 ? (cat.promedio / maxProm) * 100 : 0;
                return (
                  <div key={cat.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, color: 'var(--text2)' }}>{cat.nombreRaw}</span>
                        {cat.cabezas > 0 && (
                          <Mono style={{ fontSize: 9, color: 'var(--text3)', background: 'var(--bg3)', padding: '1px 5px', borderRadius: 3 }}>
                            {fNum(cat.cabezas)} cab.
                          </Mono>
                        )}
                        {cat.kgProm != null && (
                          <Mono style={{ fontSize: 9, color: 'var(--text3)', background: 'var(--bg3)', padding: '1px 5px', borderRadius: 3 }}>
                            {fNum(cat.kgProm)} kg
                          </Mono>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                        {cat.mediana && <Mono style={{ fontSize: 11, color: 'var(--text3)' }}>med. {fARS(cat.mediana)}</Mono>}
                        <Mono style={{ fontSize: 13, fontWeight: 700, color }}>{fARS(cat.promedio)}</Mono>
                      </div>
                    </div>
                    <div style={{ position: 'relative', height: 6, background: 'var(--bg3)', borderRadius: 3, overflow: 'visible' }}>
                      <div style={{ position: 'absolute', left: 0, width: `${pct.toFixed(1)}%`, height: '100%', background: `${color}50`, borderRadius: 3, transition: 'width .4s ease' }} />
                      {cat.minimo != null && cat.maximo != null && (
                        <div style={{ position: 'absolute', left: `${((cat.minimo / maxProm) * 100).toFixed(1)}%`, width: `${(((cat.maximo - cat.minimo) / maxProm) * 100).toFixed(1)}%`, height: '100%', background: `${color}30`, borderRadius: 3 }} />
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
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

// ── TAB: Comparativa ─────────────────────────────────────────────────────
function TabComparativa({ categorias }) {
  if (!categorias?.length) return null;

  const sorted    = [...categorias].sort((a, b) => b.promedio - a.promedio);
  const globalMax = sorted[0]?.promedio ?? 1;

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {sorted.map((cat, idx) => {
          const color  = GRUPO_COLOR[cat.grupo] ?? 'var(--accent)';
          const pct    = (cat.promedio / globalMax) * 100;
          const minPct = cat.minimo != null ? (cat.minimo  / globalMax) * 100 : pct;
          const maxPct = cat.maximo != null ? (cat.maximo  / globalMax) * 100 : pct;

          return (
            <div key={cat.id} style={{ display: 'grid', gridTemplateColumns: '200px 1fr 130px', alignItems: 'center', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: 'var(--text2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {cat.nombreRaw}
                </span>
              </div>
              <div style={{ position: 'relative', height: 24, background: 'var(--bg2)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ position: 'absolute', left: `${minPct.toFixed(1)}%`, width: `${(maxPct - minPct).toFixed(1)}%`, height: '100%', background: `${color}18` }} />
                <div style={{ position: 'absolute', left: 0, width: `${pct.toFixed(1)}%`, height: '100%', background: `${color}55`, borderRadius: '0 3px 3px 0', transition: 'width .4s ease' }} />
                {cat.cabezas > 0 && (
                  <div style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)' }}>
                    {fNum(cat.cabezas)} cab.
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <Mono style={{ fontSize: 13, fontWeight: 700, color }}>{fARS(cat.promedio)}</Mono>
                {cat.kgProm != null && (
                  <Mono style={{ fontSize: 9, color: 'var(--text3)', display: 'block' }}>{fNum(cat.kgProm)} kg prom.</Mono>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="source" style={{ marginTop: 14 }}>
        Barras: promedio por categoría (relativo al mayor) · sombreado: rango mín–máx · Fuente: mercadoagroganadero.com.ar
      </div>
    </div>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div>
      <style>{`@keyframes pulse{0%,100%{opacity:.4}50%{opacity:.9}}`}</style>
      <div className="grid grid-3" style={{ marginBottom: 28 }}>
        {[0, 1, 2].map(i => (
          <div key={i} className="stat">
            <Skel w="40%" h={10} mb={16} /><Skel w="70%" h={32} mb={12} /><Skel w="85%" h={10} mb={6} /><Skel w="50%" h={9} />
          </div>
        ))}
      </div>
      <div className="tbl-wrap" style={{ padding: 20 }}>
        {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
          <div key={i} style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
            <Skel w="22%" h={12} /><Skel w="14%" h={12} /><Skel w="10%" h={12} /><Skel w="8%" h={12} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Error ─────────────────────────────────────────────────────────────────
function ErrorState({ error, onRetry }) {
  return (
    <div style={{ padding: '48px 0', textAlign: 'center' }}>
      <div style={{ fontSize: 36, marginBottom: 14 }}>⚠</div>
      <div style={{ fontFamily: 'var(--display)', fontSize: 18, color: 'var(--text)', marginBottom: 10 }}>
        No se pudieron cargar los datos del MAG
      </div>
      <Mono style={{ fontSize: 11, color: 'var(--red)', background: 'var(--red-bg)', border: '1px solid rgba(224,92,92,.3)', borderRadius: 8, padding: '8px 18px', display: 'inline-block', marginBottom: 22 }}>
        {error}
      </Mono>
      <br />
      <button onClick={onRetry} style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, padding: '10px 24px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
        Reintentar
      </button>
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'resumen',     label: 'Resumen'        },
  { id: 'mercado',     label: 'Mercado del día' },
  { id: 'grupos',      label: 'Por grupo'       },
  { id: 'comparativa', label: 'Comparativa'     },
];

// ── Main ──────────────────────────────────────────────────────────────────
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
          {/* Banner fuente */}
          <div className="alert-strip info" style={{ marginBottom: 24 }}>
            <span className="alert-icon">✓</span>
            <span className="alert-text" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <Badge type="info" label="OFICIAL MAG" />
              <span>mercadoagroganadero.com.ar · Último remate: <strong>{fFecha(fecha)}</strong></span>
            </span>
          </div>

          {/* Índices principales */}
          {indices.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div className="section-title">Índices Cañuelas MAG</div>
              <div className="grid grid-3">
                {indices.map(item => <IndiceCard key={item.id} item={item} />)}
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
            {tab === 'resumen'     && <TabResumen      categorias={categorias} totalCabezas={totalCabezas} totalImporte={totalImporte} fecha={fecha} />}
            {tab === 'mercado'     && <TabMercado       categorias={categorias} />}
            {tab === 'grupos'      && <TabGrupos        grupos={grupos} categorias={categorias} />}
            {tab === 'comparativa' && <TabComparativa   categorias={categorias} />}
          </div>
        </>
      )}
    </div>
  );
}
