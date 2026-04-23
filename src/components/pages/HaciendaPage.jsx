// HaciendaPage.jsx — Rediseño productor · Paleta azul/gris · Cañuelas MAG
import React, { useState, useEffect, useCallback } from 'react';

// ── Paleta solo azules/grises (consistente con el resto de la app) ───────
const GRUPO_COLOR = {
  novillos:    '#5b9cf6',   // accent principal
  novillitos:  '#4080d8',   // azul medio
  vaquillonas: '#6faafc',   // azul claro
  vacas:       '#8fb8f0',   // celeste (--gold en dark = azul claro)
  toros:       '#3268c5',   // azul oscuro
  mejores:     '#94c4ff',   // celeste pálido
};

const ORDEN_GRUPOS = ['novillos', 'novillitos', 'vaquillonas', 'vacas', 'toros', 'mejores'];
const GRUPO_LABELS = {
  novillos: 'Novillos', novillitos: 'Novillitos', vaquillonas: 'Vaquillonas',
  vacas: 'Vacas', toros: 'Toros', mejores: 'Mejores',
};
const GRUPO_ICONO = {
  novillos: '🐂', novillitos: '🐃', vaquillonas: '🐄', vacas: '🐄', toros: '🐃', mejores: '⭐',
};

// ── Formatters ────────────────────────────────────────────────
const R    = n => Math.round(n);
const fARS = v => v == null ? '—' : '$ ' + R(v).toLocaleString('es-AR');
const fNum = v => v == null ? '—' : R(v).toLocaleString('es-AR');

function fFechaLarga(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('es-AR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
  } catch { return iso; }
}
function fFechaCorta(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  } catch { return iso; }
}
function esHoy(iso) {
  if (!iso) return false;
  const d = new Date(iso);
  const hoy = new Date();
  return d.getDate() === hoy.getDate() && d.getMonth() === hoy.getMonth() && d.getFullYear() === hoy.getFullYear();
}

// ── Componentes base ──────────────────────────────────────────
const Mono = ({ children, style }) => (
  <span style={{ fontFamily: 'var(--mono)', ...style }}>{children}</span>
);

const Skel = ({ w = '60%', h = 14, mb = 0 }) => (
  <div style={{ height: h, background: 'var(--bg3)', borderRadius: 4, width: w, marginBottom: mb, opacity: .5, animation: 'pulse 1.4s ease-in-out infinite' }} />
);

// ── Banner de fecha del último mercado ────────────────────────
function FechaBanner({ fecha }) {
  const hoy = esHoy(fecha);
  const fechaStr = fFechaLarga(fecha);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '14px 20px', marginBottom: 28,
      background: hoy ? 'var(--acc-bg)' : 'var(--bg1)',
      border: '1px solid ' + (hoy ? 'rgba(91,156,246,.3)' : 'var(--line)'),
      borderRadius: 10, flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {hoy ? (
          <>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 6px var(--green)', animation: 'pulse 2s ease-in-out infinite' }} />
            <Mono style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.1em', color: 'var(--green)', textTransform: 'uppercase' }}>Remate de hoy</Mono>
          </>
        ) : (
          <>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', opacity: .7 }} />
            <Mono style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.1em', color: 'var(--accent)', textTransform: 'uppercase' }}>Último remate disponible</Mono>
          </>
        )}
      </div>
      <div style={{ flex: 1 }}>
        <span style={{ fontFamily: 'var(--display)', fontSize: 15, fontWeight: 600, color: 'var(--white)', textTransform: 'capitalize' }}>
          {fechaStr || '—'}
        </span>
        {!hoy && fecha && (
          <span style={{ marginLeft: 10, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)', background: 'var(--bg3)', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--line)' }}>
            Sin mercado hoy · mostrando último disponible
          </span>
        )}
      </div>
      <Mono style={{ fontSize: 10, color: 'var(--text3)', flexShrink: 0 }}>
        Cañuelas MAG · mercadoagroganadero.com.ar
      </Mono>
    </div>
  );
}

// ── Tarjeta de índice ─────────────────────────────────────────
function IndiceCard({ item }) {
  const META = {
    'ar.canuelas.inmag':         { label: 'INMAG',         desc: 'Índice Novillo MAGna · referencia novillos especiales', unidad: 'ARS/kg vivo' },
    'ar.canuelas.igmag':         { label: 'IGMAG',         desc: 'Índice General MAGna · promedio ponderado del mercado', unidad: 'ARS/kg vivo' },
    'ar.canuelas.arrendamiento': { label: 'Arrendamiento', desc: 'Equivalente hacienda para arrendamientos',              unidad: 'ARS/ha/año'  },
  };
  const meta = META[item.id] ?? { label: item.nombre, desc: '', unidad: item.unidad };

  return (
    <div className="stat" style={{ cursor: 'default', borderTop: '2px solid var(--accent)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text2)' }}>{meta.label}</span>
        <Mono style={{ fontSize: 9, color: 'var(--accent)', background: 'var(--acc-bg)', padding: '2px 7px', borderRadius: 4, border: '1px solid rgba(91,156,246,.2)' }}>
          {meta.unidad}
        </Mono>
      </div>
      <div className="stat-val" style={{ color: 'var(--accent)', marginBottom: 6 }}>{fARS(item.valor)}</div>
      <div className="stat-meta">{meta.desc}</div>
    </div>
  );
}

// ── Barra de rango precio ─────────────────────────────────────
function BarraRango({ min, max, prom, color }) {
  color = color || 'var(--accent)';
  if (min == null || max == null || prom == null) return null;
  const span    = max - min || 1;
  const promPct = ((prom - min) / span) * 100;

  return (
    <div>
      <div style={{ position: 'relative', height: 6, background: 'var(--bg3)', borderRadius: 3 }}>
        <div style={{ position: 'absolute', left: 0, right: 0, height: '100%', background: color + '22', borderRadius: 3 }} />
        <div style={{
          position: 'absolute', left: promPct.toFixed(1) + '%', transform: 'translateX(-50%)',
          width: 4, height: '100%', background: color, borderRadius: 2, boxShadow: '0 0 6px ' + color + '80',
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
        <Mono style={{ fontSize: 9, color: 'var(--text3)' }}>{fARS(min)}</Mono>
        <Mono style={{ fontSize: 9, color: 'var(--text2)', fontWeight: 600 }}>▲ {fARS(prom)}</Mono>
        <Mono style={{ fontSize: 9, color: 'var(--text3)' }}>{fARS(max)}</Mono>
      </div>
    </div>
  );
}

// ── TAB: Resumen ──────────────────────────────────────────────
function TabResumen({ categorias, totalCabezas, totalImporte, fecha }) {
  if (!categorias || !categorias.length) return null;

  const mejoresPorGrupo = ORDEN_GRUPOS.map(function(gid) {
    const cats = categorias.filter(function(c) { return c.grupo === gid; });
    if (!cats.length) return null;
    const top = cats.reduce(function(a, b) { return b.promedio > a.promedio ? b : a; }, cats[0]);
    const totalCab = cats.reduce(function(s, c) { return s + (c.cabezas || 0); }, 0);
    return { gid: gid, label: GRUPO_LABELS[gid], color: GRUPO_COLOR[gid], top: top, totalCab: totalCab };
  }).filter(Boolean);

  return (
    <div>
      {/* Stats de jornada */}
      {(totalCabezas || totalImporte) ? (
        <div className="grid grid-3" style={{ maxWidth: 700, marginBottom: 32 }}>
          {totalCabezas != null && (
            <div className="stat" style={{ cursor: 'default' }}>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8, fontFamily: 'var(--mono)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Cabezas ingresadas</div>
              <div className="stat-val" style={{ fontSize: 26 }}>{fNum(totalCabezas)}</div>
              <div className="stat-meta">en la jornada · {fFechaCorta(fecha)}</div>
            </div>
          )}
          {totalImporte != null && (
            <div className="stat" style={{ cursor: 'default' }}>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8, fontFamily: 'var(--mono)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Importe total</div>
              <div className="stat-val" style={{ fontSize: 26 }}>${'\u00a0'}{R(totalImporte / 1000000).toLocaleString('es-AR')} M</div>
              <div className="stat-meta">ARS transaccionados en la jornada</div>
            </div>
          )}
          <div className="stat" style={{ cursor: 'default' }}>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8, fontFamily: 'var(--mono)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Categorías</div>
            <div className="stat-val" style={{ fontSize: 26 }}>{categorias.length}</div>
            <div className="stat-meta">con precio en la jornada</div>
          </div>
        </div>
      ) : null}

      {/* Mejor precio por grupo */}
      <div className="section-title">Mejor precio por categoría</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {mejoresPorGrupo.map(function(item) {
          var gid = item.gid, label = item.label, color = item.color, top = item.top, totalCab = item.totalCab;
          return (
            <div key={gid} style={{
              display: 'grid', gridTemplateColumns: '1fr 200px 120px',
              alignItems: 'center', gap: 24, padding: '16px 22px',
              background: 'var(--bg1)', border: '1px solid var(--line)', borderRadius: 10,
            }}>
              {/* Grupo */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <div style={{ width: 3, height: 20, background: color, borderRadius: 2, flexShrink: 0 }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--white)', fontFamily: 'var(--display)' }}>{label}</span>
                  {totalCab > 0 && (
                    <Mono style={{ fontSize: 10, color: 'var(--text3)', background: 'var(--bg3)', padding: '1px 6px', borderRadius: 3 }}>
                      {fNum(totalCab)} cab.
                    </Mono>
                  )}
                </div>
                <span style={{ fontSize: 11, color: 'var(--text2)', paddingLeft: 11 }}>
                  {top.nombreRaw || top.nombre}
                  {top.kgProm != null && (
                    <Mono style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 8 }}>· {fNum(top.kgProm)} kg prom.</Mono>
                  )}
                </span>
              </div>

              {/* Barra de rango */}
              <BarraRango min={top.minimo} max={top.maximo} prom={top.promedio} color={color} />

              {/* Precio */}
              <div style={{ textAlign: 'right' }}>
                <Mono style={{ fontSize: 18, fontWeight: 700, color: color, display: 'block', letterSpacing: '-.01em' }}>
                  {fARS(top.promedio)}
                </Mono>
                {top.mediana != null && (
                  <Mono style={{ fontSize: 10, color: 'var(--text3)', display: 'block', marginTop: 2 }}>
                    mediana {fARS(top.mediana)}
                  </Mono>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="source" style={{ marginTop: 10 }}>
        ARS/kg vivo · mejor precio por categoría · Fuente: mercadoagroganadero.com.ar · Res. 32/2018 APN
      </div>
    </div>
  );
}

// ── TAB: Tabla completa ───────────────────────────────────────
function TabTabla({ categorias }) {
  const [filtroGrupo, setFiltroGrupo] = useState('todos');

  if (!categorias || !categorias.length) return (
    <div className="alert-strip warn">
      <span className="alert-icon">!</span>
      <span className="alert-text">Sin datos de categorías.</span>
    </div>
  );

  const gruposPresentes = [...new Set(categorias.map(function(c) { return c.grupo; }))];
  var filas = filtroGrupo === 'todos' ? categorias : categorias.filter(function(c) { return c.grupo === filtroGrupo; });

  filas = [...filas].sort(function(a, b) {
    var ga = ORDEN_GRUPOS.indexOf(a.grupo), gb = ORDEN_GRUPOS.indexOf(b.grupo);
    return ga !== gb ? ga - gb : b.promedio - a.promedio;
  });

  return (
    <div>
      {/* Filtro */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <Mono style={{ fontSize: 9, color: 'var(--text3)', letterSpacing: '.08em', marginRight: 4 }}>FILTRAR</Mono>
        {['todos', ...gruposPresentes].map(function(g) {
          var active = filtroGrupo === g;
          var color  = g === 'todos' ? 'var(--accent)' : (GRUPO_COLOR[g] || 'var(--accent)');
          return (
            <button key={g} onClick={function() { setFiltroGrupo(g); }} style={{
              fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600,
              padding: '5px 13px', borderRadius: 6, cursor: 'pointer',
              border: '1px solid ' + (active ? color : 'var(--line)'),
              background: active ? color + '18' : 'transparent',
              color: active ? color : 'var(--text3)', transition: 'all .15s',
            }}>
              {g === 'todos' ? 'TODOS' : (GRUPO_LABELS[g] ? GRUPO_LABELS[g].toUpperCase() : g.toUpperCase())}
            </button>
          );
        })}
      </div>

      <div className="tbl-wrap tbl-scroll">
        <table>
          <thead>
            <tr>
              <th>Categoría</th>
              <th>Rango (mín–máx)</th>
              <th className="r">Promedio</th>
              <th className="r">Mediana</th>
              <th className="r">Cabezas</th>
              <th className="r">Peso prom.</th>
            </tr>
          </thead>
          <tbody>
            {filas.map(function(cat, i) {
              var color = GRUPO_COLOR[cat.grupo] || 'var(--accent)';
              var prevGrupo = i > 0 ? filas[i - 1].grupo : null;
              var isNewGrupo = cat.grupo !== prevGrupo;
              return (
                <React.Fragment key={cat.id}>
                  {isNewGrupo && filtroGrupo === 'todos' && (
                    <tr>
                      <td colSpan={6} style={{ background: 'var(--bg)', padding: '8px 16px 4px', borderBottom: '1px solid var(--line)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 3, height: 14, background: color, borderRadius: 2 }} />
                          <Mono style={{ fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text3)', fontWeight: 600 }}>
                            {GRUPO_LABELS[cat.grupo] || cat.grupo}
                          </Mono>
                        </div>
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {filtroGrupo !== 'todos' && (
                          <div style={{ width: 3, height: 14, background: color, borderRadius: 2, flexShrink: 0 }} />
                        )}
                        <span style={{ fontSize: 13, color: 'var(--text)' }}>{cat.nombreRaw || cat.nombre}</span>
                      </div>
                    </td>
                    <td style={{ minWidth: 160 }}>
                      <BarraRango min={cat.minimo} max={cat.maximo} prom={cat.promedio} color={color} />
                    </td>
                    <td className="r">
                      <Mono style={{ fontSize: 13, fontWeight: 700, color: color }}>{fARS(cat.promedio)}</Mono>
                    </td>
                    <td className="r">
                      <Mono style={{ fontSize: 12, color: 'var(--text2)' }}>{fARS(cat.mediana)}</Mono>
                    </td>
                    <td className="r">
                      <Mono style={{ fontSize: 12, color: 'var(--text)' }}>{fNum(cat.cabezas)}</Mono>
                    </td>
                    <td className="r">
                      <Mono style={{ fontSize: 12, color: 'var(--text2)' }}>
                        {cat.kgProm != null ? fNum(cat.kgProm) + ' kg' : '—'}
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
        ARS/kg vivo · Res. 32/2018 APN · Barra: mín–máx, marca = promedio · Fuente: mercadoagroganadero.com.ar
      </div>
    </div>
  );
}

// ── TAB: Por grupo ────────────────────────────────────────────
function TabGrupos({ grupos, categorias }) {
  if (!grupos || !grupos.length) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {grupos.map(function(g) {
        var color = GRUPO_COLOR[g.id] || 'var(--accent)';
        var rawDelGrupo = (categorias || []).filter(function(c) { return c.grupo === g.id; });
        var totalCab = rawDelGrupo.reduce(function(s, c) { return s + (c.cabezas || 0); }, 0);
        var maxProm = Math.max.apply(null, rawDelGrupo.map(function(c) { return c.promedio; }));

        return (
          <div key={g.id} style={{ background: 'var(--bg1)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{
              padding: '13px 20px', borderBottom: '1px solid var(--line)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderTop: '3px solid ' + color,
            }}>
              <span style={{ fontFamily: 'var(--display)', fontSize: 15, fontWeight: 700, color: 'var(--white)' }}>
                {GRUPO_ICONO[g.id]} {g.label}
              </span>
              <div style={{ textAlign: 'right' }}>
                <Mono style={{ fontSize: 9, color: 'var(--text3)', display: 'block', letterSpacing: '.08em' }}>CABEZAS</Mono>
                <Mono style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{fNum(totalCab)}</Mono>
              </div>
            </div>

            <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {rawDelGrupo.sort(function(a, b) { return b.promedio - a.promedio; }).map(function(cat) {
                var pct = maxProm > 0 ? (cat.promedio / maxProm) * 100 : 0;
                return (
                  <div key={cat.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, color: 'var(--text2)' }}>{cat.nombreRaw || cat.nombre}</span>
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
                      <div style={{ display: 'flex', gap: 16, alignItems: 'baseline' }}>
                        {cat.mediana != null && (
                          <Mono style={{ fontSize: 10, color: 'var(--text3)' }}>med. {fARS(cat.mediana)}</Mono>
                        )}
                        <Mono style={{ fontSize: 14, fontWeight: 700, color: color }}>{fARS(cat.promedio)}</Mono>
                      </div>
                    </div>
                    <div style={{ position: 'relative', height: 6, background: 'var(--bg3)', borderRadius: 3 }}>
                      <div style={{ position: 'absolute', left: 0, width: pct.toFixed(1) + '%', height: '100%', background: color + '60', borderRadius: 3, transition: 'width .4s ease' }} />
                      {cat.minimo != null && cat.maximo != null && maxProm > 0 && (
                        <div style={{
                          position: 'absolute',
                          left: ((cat.minimo / maxProm) * 100).toFixed(1) + '%',
                          width: (((cat.maximo - cat.minimo) / maxProm) * 100).toFixed(1) + '%',
                          height: '100%', background: color + '30', borderRadius: 3,
                        }} />
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
      <div className="source">ARS/kg vivo · Res. 32/2018 APN · Fuente: mercadoagroganadero.com.ar</div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────
function Skeleton() {
  return (
    <div>
      <style>{`@keyframes pulse{0%,100%{opacity:.4}50%{opacity:.9}}`}</style>
      <div style={{ padding: '14px 20px', marginBottom: 28, background: 'var(--bg1)', border: '1px solid var(--line)', borderRadius: 10 }}>
        <Skel w="45%" h={14} />
      </div>
      <div className="grid grid-3" style={{ marginBottom: 28 }}>
        {[0,1,2].map(function(i) { return (
          <div key={i} className="stat">
            <Skel w="40%" h={10} mb={14} />
            <Skel w="70%" h={28} mb={10} />
            <Skel w="85%" h={9} />
          </div>
        ); })}
      </div>
      <div className="section-title">Mejor precio por categoría</div>
      {[0,1,2,3,4].map(function(i) { return (
        <div key={i} style={{ padding: '16px 22px', marginBottom: 2, background: 'var(--bg1)', border: '1px solid var(--line)', borderRadius: 10, display: 'flex', gap: 24, alignItems: 'center' }}>
          <div style={{ flex: 1 }}><Skel w="50%" h={12} mb={6} /><Skel w="70%" h={9} /></div>
          <Skel w="180px" h={18} />
          <Skel w="80px" h={20} />
        </div>
      ); })}
    </div>
  );
}

// ── Estado de error ───────────────────────────────────────────
function ErrorState({ error, onRetry }) {
  return (
    <div style={{ padding: '48px 0', textAlign: 'center' }}>
      <div style={{ fontSize: 32, marginBottom: 14 }}>⚠</div>
      <div style={{ fontFamily: 'var(--display)', fontSize: 17, color: 'var(--text)', marginBottom: 10 }}>
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

// ── Tabs config ───────────────────────────────────────────────
const TABS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'tabla',   label: 'Tabla completa' },
  { id: 'grupos',  label: 'Por grupo' },
];

// ── Main ──────────────────────────────────────────────────────
export function HaciendaPage({ goPage }) {
  const [tab,       setTab]       = useState('resumen');
  const [estado,    setEstado]    = useState('loading');
  const [data,      setData]      = useState(null);
  const [error,     setError]     = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  const cargar = useCallback(async function() {
    setEstado('loading');
    setError(null);
    try {
      const res  = await fetch('/api/hacienda');
      if (!res.ok) throw new Error('HTTP ' + res.status);
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

  useEffect(function() { cargar(); }, [cargar]);

  const indices      = (data && data.indices)      || [];
  const grupos       = (data && data.grupos)       || [];
  const categorias   = (data && data.categorias)   || [];
  const fecha        = data && data.fecha;
  const totalCabezas = data && data.totalCabezas;
  const totalImporte = data && data.totalImporte;

  return (
    <div className="page-enter">

      {/* Header */}
      <div className="ph">
        <div>
          <div className="ph-title">
            Hacienda{' '}
            <span className="help-pip" onClick={function() { goPage && goPage('ayuda', 'glosario-hacienda'); }} title="Ayuda">?</span>
          </div>
          <div className="ph-sub">Novillos · Novillitos · Vacas · Vaquillonas · Toros · Mercado Agroganadero Cañuelas</div>
        </div>
        <div className="ph-right">
          {estado === 'ok' && (
            <Mono style={{ fontSize: 10, color: 'var(--text3)' }}>
              {categorias.length + indices.length} precios · act. {lastFetch && lastFetch.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
            </Mono>
          )}
          {estado === 'loading' && <Mono style={{ fontSize: 10, color: 'var(--text3)' }}>cargando…</Mono>}
          {estado === 'error'   && <Mono style={{ fontSize: 10, color: 'var(--red)' }}>SIN DATOS</Mono>}
          <button
            onClick={cargar} disabled={estado === 'loading'} title="Actualizar"
            style={{ background: 'var(--bg2)', border: '1px solid var(--line)', color: 'var(--text3)', borderRadius: 6, padding: '5px 12px', fontFamily: 'var(--mono)', fontSize: 11, cursor: 'pointer', opacity: estado === 'loading' ? .5 : 1 }}
          >
            ↺ Actualizar
          </button>
        </div>
      </div>

      {estado === 'loading' && <Skeleton />}
      {estado === 'error'   && <ErrorState error={error} onRetry={cargar} />}

      {estado === 'ok' && (
        <>
          {/* Banner fecha del último mercado — siempre visible */}
          <FechaBanner fecha={fecha} />

          {/* Índices principales MAG */}
          {indices.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <div className="section-title">Índices Cañuelas MAG</div>
              <div className="grid grid-3">
                {indices.map(function(item) { return <IndiceCard key={item.id} item={item} />; })}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="tabs">
            {TABS.map(function(t) { return (
              <button key={t.id} className={'tab' + (tab === t.id ? ' active' : '')} onClick={function() { setTab(t.id); }}>
                {t.label}
              </button>
            ); })}
          </div>

          <div>
            {tab === 'resumen' && <TabResumen categorias={categorias} totalCabezas={totalCabezas} totalImporte={totalImporte} fecha={fecha} />}
            {tab === 'tabla'   && <TabTabla categorias={categorias} />}
            {tab === 'grupos'  && <TabGrupos grupos={grupos} categorias={categorias} />}
          </div>
        </>
      )}
    </div>
  );
}
