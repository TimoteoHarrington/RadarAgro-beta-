// HaciendaPage.jsx — Rediseño con API consignatarias.com.ar
import React, { useState, useEffect, useCallback, useRef } from 'react';

// ─── Paleta de grupos ───────────────────────────────────────────────────────
const GRUPO_COLOR = {
  novillos:    '#5b9cf6',
  novillitos:  '#4080d8',
  vaquillonas: '#6faafc',
  vacas:       '#8fb8f0',
  toros:       '#3268c5',
  mejores:     '#94c4ff',
};
const ORDEN_GRUPOS = ['novillos', 'novillitos', 'vaquillonas', 'vacas', 'toros', 'mejores'];
const GRUPO_LABELS = { novillos:'Novillos', novillitos:'Novillitos', vaquillonas:'Vaquillonas', vacas:'Vacas', toros:'Toros', mejores:'Mejores' };

// ─── Helpers ─────────────────────────────────────────────────────────────────
const R    = n => Math.round(n);
const fARS = v => v == null ? '—' : '$ ' + R(v).toLocaleString('es-AR');
const fNum = v => v == null ? '—' : R(v).toLocaleString('es-AR');

function fFechaLarga(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('es-AR', { weekday:'long', day:'numeric', month:'long', year:'numeric' }); }
  catch { return iso; }
}
function fFechaCorta(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric' }); }
  catch { return iso; }
}
function diffDias(iso) {
  if (!iso) return null;
  const d = new Date(iso); d.setHours(0,0,0,0);
  const h = new Date(); h.setHours(0,0,0,0);
  return Math.round((h - d) / 86400000);
}

// ─── Micro components ─────────────────────────────────────────────────────────
const Mono = ({ children, style }) => (
  <span style={{ fontFamily:'var(--mono)', ...style }}>{children}</span>
);
const Skel = ({ w='60%', h=14, mb=0 }) => (
  <div style={{ height:h, background:'var(--bg3)', borderRadius:4, width:w, marginBottom:mb, opacity:.5, animation:'pulse 1.4s ease-in-out infinite' }} />
);

// ─── FechaBanner ─────────────────────────────────────────────────────────────
function FechaBanner({ fecha, fuente }) {
  const dias   = diffDias(fecha);
  const esHoy  = dias === 0;
  const esAyer = dias === 1;
  const color  = esHoy ? 'var(--green)' : esAyer ? 'var(--accent)' : 'var(--text3)';
  const label  = esHoy ? 'Datos de hoy' : esAyer ? 'Datos de ayer' : dias != null ? 'Datos de hace ' + dias + ' días' : '—';

  return (
    <div style={{
      display:'flex', alignItems:'center', gap:16, padding:'12px 20px', marginBottom:28,
      background: esHoy ? 'rgba(74,191,120,.06)' : 'var(--bg1)',
      border:'1px solid ' + (esHoy ? 'rgba(74,191,120,.25)' : 'var(--line)'),
      borderRadius:10, flexWrap:'wrap',
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
        <div style={{ width:7, height:7, borderRadius:'50%', background:color, boxShadow: esHoy ? '0 0 6px var(--green)' : 'none', animation: esHoy ? 'pulse 2s ease-in-out infinite' : 'none' }} />
        <Mono style={{ fontSize:9, fontWeight:700, letterSpacing:'.1em', color:color, textTransform:'uppercase' }}>{label}</Mono>
      </div>
      <div style={{ flex:1 }}>
        <span style={{ fontFamily:'var(--display)', fontSize:15, fontWeight:600, color:'var(--white)', textTransform:'capitalize' }}>
          {fFechaLarga(fecha)}
        </span>
      </div>
      <Mono style={{ fontSize:10, color:'var(--text3)', flexShrink:0 }}>
        {fuente || 'consignatarias.com.ar'}
      </Mono>
    </div>
  );
}

// ─── IndiceCard ───────────────────────────────────────────────────────────────
function IndiceCard({ label, valor, unidad, desc, variacion }) {
  const tieneVar = variacion != null && !isNaN(variacion);
  const varPos   = tieneVar && variacion >= 0;
  const varColor = tieneVar ? (varPos ? 'var(--green)' : 'var(--red)') : 'var(--text3)';

  return (
    <div className="stat" style={{ cursor:'default', borderTop:'2px solid var(--accent)' }}>
      <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:10 }}>
        <span style={{ fontSize:13, fontWeight:500, color:'var(--text2)' }}>{label}</span>
        <Mono style={{ fontSize:9, color:'var(--accent)', background:'var(--acc-bg)', padding:'2px 7px', borderRadius:4, border:'1px solid rgba(91,156,246,.2)' }}>
          {unidad}
        </Mono>
      </div>
      <div className="stat-val" style={{ color:'var(--accent)', marginBottom: tieneVar ? 4 : 6 }}>{fARS(valor)}</div>
      {tieneVar && (
        <div style={{ marginBottom:6 }}>
          <Mono style={{ fontSize:10, color:varColor, fontWeight:600 }}>
            {varPos ? '▲' : '▼'} {Math.abs(variacion).toFixed(1)}% sem.
          </Mono>
        </div>
      )}
      <div className="stat-meta">{desc}</div>
    </div>
  );
}

// ─── BarraRango ───────────────────────────────────────────────────────────────
function BarraRango({ min, max, prom, color }) {
  color = color || 'var(--accent)';
  if (min == null || max == null || prom == null) return null;
  const span = max - min || 1;
  const pct  = ((prom - min) / span) * 100;
  return (
    <div>
      <div style={{ position:'relative', height:6, background:'var(--bg3)', borderRadius:3 }}>
        <div style={{ position:'absolute', left:0, right:0, height:'100%', background:color+'22', borderRadius:3 }} />
        <div style={{ position:'absolute', left:pct.toFixed(1)+'%', transform:'translateX(-50%)', width:4, height:'100%', background:color, borderRadius:2, boxShadow:'0 0 6px '+color+'80' }} />
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:3 }}>
        <Mono style={{ fontSize:9, color:'var(--text3)' }}>{fARS(min)}</Mono>
        <Mono style={{ fontSize:9, color:'var(--text2)', fontWeight:600 }}>▲ {fARS(prom)}</Mono>
        <Mono style={{ fontSize:9, color:'var(--text3)' }}>{fARS(max)}</Mono>
      </div>
    </div>
  );
}

// ─── Sparkline SVG ────────────────────────────────────────────────────────────
function Sparkline({ datos, color }) {
  const ref = useRef(null);
  useEffect(function() {
    if (!ref.current || !datos || datos.length < 2) return;
    var el   = ref.current;
    var W    = el.offsetWidth || 120;
    var H    = 36;
    var vals = datos.map(function(d) { return d.valor != null ? d.valor : (d.inmag != null ? d.inmag : 0); }).filter(function(v) { return v > 0; });
    if (vals.length < 2) return;
    var mn = Math.min.apply(null, vals);
    var mx = Math.max.apply(null, vals);
    var sp = mx - mn || 1;
    var xs = vals.map(function(_, i) { return (i / (vals.length - 1)) * W; });
    var ys = vals.map(function(v) { return H - ((v - mn) / sp) * (H - 6) - 3; });
    var pts = xs.map(function(x, i) { return x.toFixed(1) + ',' + ys[i].toFixed(1); }).join(' ');
    el.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    el.innerHTML = '<polyline points="' + pts + '" fill="none" stroke="' + color + '" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" opacity="0.8"/>';
  }, [datos, color]);
  return React.createElement('svg', { ref:ref, style:{ width:'100%', height:36, display:'block' } });
}

// ─── TabResumen ───────────────────────────────────────────────────────────────
function TabResumen({ categorias, totalCabezas, fecha, stats, historico }) {
  if (!categorias || !categorias.length) return null;

  var mejoresPorGrupo = ORDEN_GRUPOS.map(function(gid) {
    var cats = categorias.filter(function(c) { return c.grupo === gid; });
    if (!cats.length) return null;
    var top      = cats.reduce(function(a, b) { return b.promedio > a.promedio ? b : a; }, cats[0]);
    var totalCab = cats.reduce(function(s, c) { return s + (c.cabezas || 0); }, 0);
    return { gid:gid, label:GRUPO_LABELS[gid], color:GRUPO_COLOR[gid], top:top, totalCab:totalCab };
  }).filter(Boolean);

  var sparkData = (historico && historico.series) ? historico.series.slice(-14) : [];

  return (
    React.createElement('div', null,
      /* KPIs */
      React.createElement('div', { className:'grid grid-3', style:{ marginBottom:32 } },
        totalCabezas != null && React.createElement('div', { className:'stat', style:{ cursor:'default' } },
          React.createElement('div', { style:{ fontSize:12, color:'var(--text3)', marginBottom:8, fontFamily:'var(--mono)', letterSpacing:'.08em', textTransform:'uppercase' } }, 'Cabezas hoy'),
          React.createElement('div', { className:'stat-val', style:{ fontSize:26 } }, fNum(totalCabezas)),
          React.createElement('div', { className:'stat-meta' }, 'ingresadas · ' + fFechaCorta(fecha))
        ),
        stats && stats.rematesHoy != null && React.createElement('div', { className:'stat', style:{ cursor:'default' } },
          React.createElement('div', { style:{ fontSize:12, color:'var(--text3)', marginBottom:8, fontFamily:'var(--mono)', letterSpacing:'.08em', textTransform:'uppercase' } }, 'Remates hoy'),
          React.createElement('div', { className:'stat-val', style:{ fontSize:26 } }, fNum(stats.rematesHoy)),
          React.createElement('div', { className:'stat-meta' }, 'programados para hoy')
        ),
        stats && stats.rematesProximos7dias != null && React.createElement('div', { className:'stat', style:{ cursor:'default' } },
          React.createElement('div', { style:{ fontSize:12, color:'var(--text3)', marginBottom:8, fontFamily:'var(--mono)', letterSpacing:'.08em', textTransform:'uppercase' } }, 'Próximos 7 días'),
          React.createElement('div', { className:'stat-val', style:{ fontSize:26 } }, fNum(stats.rematesProximos7dias)),
          React.createElement('div', { className:'stat-meta' }, (stats.provinciasActivas || '?') + ' provincias · ' + (stats.consignatariasActivas || '?') + ' consignatarias')
        )
      ),

      /* Sparkline */
      sparkData.length > 1 && React.createElement('div', {
        style:{ marginBottom:32, background:'var(--bg1)', border:'1px solid var(--line)', borderRadius:10, padding:'16px 20px' }
      },
        React.createElement('div', { style:{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:10 } },
          React.createElement(Mono, { style:{ fontSize:9, color:'var(--text3)', letterSpacing:'.1em', textTransform:'uppercase' } }, 'INMAG — últimas 2 semanas'),
          historico && React.createElement('div', { style:{ display:'flex', gap:20 } },
            historico.stats && historico.stats.min && React.createElement(Mono, { style:{ fontSize:10, color:'var(--text3)' } }, 'mín ' + fARS(historico.stats.min)),
            historico.stats && historico.stats.max && React.createElement(Mono, { style:{ fontSize:10, color:'var(--text3)' } }, 'máx ' + fARS(historico.stats.max)),
            historico.stats && historico.stats.avg && React.createElement(Mono, { style:{ fontSize:10, color:'var(--accent)' } }, 'prom ' + fARS(historico.stats.avg))
          )
        ),
        React.createElement(Sparkline, { datos:sparkData, color:'var(--accent)' })
      ),

      /* Mejor precio por grupo */
      React.createElement('div', { className:'section-title' }, 'Mejor precio por categoría'),
      React.createElement('div', { style:{ display:'flex', flexDirection:'column', gap:2 } },
        mejoresPorGrupo.map(function(item) {
          return React.createElement('div', {
            key:item.gid,
            style:{
              display:'grid', gridTemplateColumns:'1fr 200px 120px',
              alignItems:'center', gap:24, padding:'16px 22px',
              background:'var(--bg1)', border:'1px solid var(--line)', borderRadius:10,
            }
          },
            React.createElement('div', null,
              React.createElement('div', { style:{ display:'flex', alignItems:'center', gap:8, marginBottom:4 } },
                React.createElement('div', { style:{ width:3, height:20, background:item.color, borderRadius:2, flexShrink:0 } }),
                React.createElement('span', { style:{ fontSize:14, fontWeight:600, color:'var(--white)', fontFamily:'var(--display)' } }, item.label),
                item.totalCab > 0 && React.createElement(Mono, { style:{ fontSize:10, color:'var(--text3)', background:'var(--bg3)', padding:'1px 6px', borderRadius:3 } }, fNum(item.totalCab) + ' cab.')
              ),
              React.createElement('span', { style:{ fontSize:11, color:'var(--text2)', paddingLeft:11 } },
                item.top.nombreRaw || item.top.nombre,
                item.top.kgProm != null && React.createElement(Mono, { style:{ fontSize:10, color:'var(--text3)', marginLeft:8 } }, '· ' + fNum(item.top.kgProm) + ' kg prom.')
              )
            ),
            React.createElement(BarraRango, { min:item.top.minimo, max:item.top.maximo, prom:item.top.promedio, color:item.color }),
            React.createElement('div', { style:{ textAlign:'right' } },
              React.createElement(Mono, { style:{ fontSize:18, fontWeight:700, color:item.color, display:'block', letterSpacing:'-.01em' } }, fARS(item.top.promedio)),
              item.top.mediana != null && React.createElement(Mono, { style:{ fontSize:10, color:'var(--text3)', display:'block', marginTop:2 } }, 'med. ' + fARS(item.top.mediana))
            )
          );
        })
      ),
      React.createElement('div', { className:'source', style:{ marginTop:10 } }, 'ARS/kg vivo · Fuente: consignatarias.com.ar · INMAG / Cañuelas MAG')
    )
  );
}

// ─── TabTabla ─────────────────────────────────────────────────────────────────
function TabTabla({ categorias }) {
  var [filtroGrupo, setFiltroGrupo] = useState('todos');
  if (!categorias || !categorias.length) return React.createElement('div', { className:'alert-strip warn' }, React.createElement('span', { className:'alert-icon' }, '!'), React.createElement('span', { className:'alert-text' }, 'Sin datos de categorías.'));

  var gruposPresentes = Array.from(new Set(categorias.map(function(c) { return c.grupo; })));
  var filas = filtroGrupo === 'todos' ? categorias : categorias.filter(function(c) { return c.grupo === filtroGrupo; });
  filas = [...filas].sort(function(a, b) {
    var ga = ORDEN_GRUPOS.indexOf(a.grupo), gb = ORDEN_GRUPOS.indexOf(b.grupo);
    return ga !== gb ? ga - gb : b.promedio - a.promedio;
  });

  return (
    React.createElement('div', null,
      React.createElement('div', { style:{ display:'flex', gap:6, marginBottom:20, flexWrap:'wrap', alignItems:'center' } },
        React.createElement(Mono, { style:{ fontSize:9, color:'var(--text3)', letterSpacing:'.08em', marginRight:4 } }, 'FILTRAR'),
        ['todos', ...gruposPresentes].map(function(g) {
          var active = filtroGrupo === g;
          var color  = g === 'todos' ? 'var(--accent)' : (GRUPO_COLOR[g] || 'var(--accent)');
          return React.createElement('button', {
            key:g, onClick:function() { setFiltroGrupo(g); },
            style:{ fontFamily:'var(--mono)', fontSize:10, fontWeight:600, padding:'5px 13px', borderRadius:6, cursor:'pointer', border:'1px solid '+(active?color:'var(--line)'), background:active?color+'18':'transparent', color:active?color:'var(--text3)', transition:'all .15s' }
          }, g === 'todos' ? 'TODOS' : (GRUPO_LABELS[g] || g).toUpperCase());
        })
      ),
      React.createElement('div', { className:'tbl-wrap tbl-scroll' },
        React.createElement('table', null,
          React.createElement('thead', null,
            React.createElement('tr', null,
              React.createElement('th', null, 'Categoría'),
              React.createElement('th', null, 'Rango (mín–máx)'),
              React.createElement('th', { className:'r' }, 'Promedio'),
              React.createElement('th', { className:'r' }, 'Mediana'),
              React.createElement('th', { className:'r' }, 'Cabezas'),
              React.createElement('th', { className:'r' }, 'Peso prom.')
            )
          ),
          React.createElement('tbody', null,
            filas.map(function(cat, i) {
              var color    = GRUPO_COLOR[cat.grupo] || 'var(--accent)';
              var prevGrupo = i > 0 ? filas[i-1].grupo : null;
              var isNew    = cat.grupo !== prevGrupo;
              return React.createElement(React.Fragment, { key:cat.id || i },
                isNew && filtroGrupo === 'todos' && React.createElement('tr', null,
                  React.createElement('td', { colSpan:6, style:{ background:'var(--bg)', padding:'8px 16px 4px', borderBottom:'1px solid var(--line)' } },
                    React.createElement('div', { style:{ display:'flex', alignItems:'center', gap:8 } },
                      React.createElement('div', { style:{ width:3, height:14, background:color, borderRadius:2 } }),
                      React.createElement(Mono, { style:{ fontSize:9, letterSpacing:'.12em', textTransform:'uppercase', color:'var(--text3)', fontWeight:600 } }, GRUPO_LABELS[cat.grupo] || cat.grupo)
                    )
                  )
                ),
                React.createElement('tr', null,
                  React.createElement('td', null,
                    React.createElement('div', { style:{ display:'flex', alignItems:'center', gap:8 } },
                      filtroGrupo !== 'todos' && React.createElement('div', { style:{ width:3, height:14, background:color, borderRadius:2, flexShrink:0 } }),
                      React.createElement('span', { style:{ fontSize:13, color:'var(--text)' } }, cat.nombreRaw || cat.nombre)
                    )
                  ),
                  React.createElement('td', { style:{ minWidth:160 } }, React.createElement(BarraRango, { min:cat.minimo, max:cat.maximo, prom:cat.promedio, color:color })),
                  React.createElement('td', { className:'r' }, React.createElement(Mono, { style:{ fontSize:13, fontWeight:700, color:color } }, fARS(cat.promedio))),
                  React.createElement('td', { className:'r' }, React.createElement(Mono, { style:{ fontSize:12, color:'var(--text2)' } }, fARS(cat.mediana))),
                  React.createElement('td', { className:'r' }, React.createElement(Mono, { style:{ fontSize:12, color:'var(--text)' } }, fNum(cat.cabezas))),
                  React.createElement('td', { className:'r' }, React.createElement(Mono, { style:{ fontSize:12, color:'var(--text2)' } }, cat.kgProm != null ? fNum(cat.kgProm)+' kg' : '—'))
                )
              );
            })
          )
        )
      ),
      React.createElement('div', { className:'source', style:{ marginTop:10 } }, 'ARS/kg vivo · Barra: mín–máx, marca = promedio · Fuente: consignatarias.com.ar')
    )
  );
}

// ─── TabRemates ───────────────────────────────────────────────────────────────
function TabRemates({ rematesHoy, rematesProximos }) {
  var [vista, setVista] = useState('hoy');
  var lista = vista === 'hoy' ? (rematesHoy || []) : (rematesProximos || []);

  return React.createElement('div', null,
    React.createElement('div', { style:{ display:'flex', gap:6, marginBottom:20 } },
      [{ id:'hoy', label:'Hoy' }, { id:'proximos', label:'Próximos 7 días' }].map(function(v) {
        var active = vista === v.id;
        return React.createElement('button', {
          key:v.id, onClick:function() { setVista(v.id); },
          style:{ fontFamily:'var(--mono)', fontSize:10, fontWeight:600, padding:'5px 14px', borderRadius:6, cursor:'pointer', border:'1px solid '+(active?'var(--accent)':'var(--line)'), background:active?'var(--acc-bg)':'transparent', color:active?'var(--accent)':'var(--text3)', transition:'all .15s' }
        },
          v.label.toUpperCase(),
          v.id === 'hoy' && rematesHoy && rematesHoy.length > 0 && React.createElement('span', { style:{ marginLeft:6, fontSize:9, background:'var(--accent)', color:'#fff', borderRadius:8, padding:'1px 5px' } }, rematesHoy.length)
        );
      })
    ),

    !lista.length && React.createElement('div', { style:{ padding:'40px 0', textAlign:'center' } },
      React.createElement(Mono, { style:{ fontSize:12, color:'var(--text3)' } },
        vista === 'hoy' ? 'Sin remates programados para hoy' : 'Sin remates próximos disponibles'
      )
    ),

    React.createElement('div', { style:{ display:'flex', flexDirection:'column', gap:6 } },
      lista.map(function(r, i) {
        var fechaR   = r.fecha || r.date;
        var cabezas  = r.cabezas || r.heads;
        var consig   = r.consignataria || r.organizer || r.consignatariaNombre;
        var lugar    = r.lugar || r.location || r.localidad;
        var provincia = r.provincia || r.province;
        var tipo     = r.tipo || r.type;

        return React.createElement('div', {
          key:r.id || i,
          style:{ display:'grid', gridTemplateColumns:'1fr auto', gap:16, padding:'14px 20px', background:'var(--bg1)', border:'1px solid var(--line)', borderRadius:10, alignItems:'center' }
        },
          React.createElement('div', null,
            React.createElement('div', { style:{ display:'flex', alignItems:'center', gap:10, marginBottom:5, flexWrap:'wrap' } },
              React.createElement('span', { style:{ fontFamily:'var(--display)', fontSize:14, fontWeight:600, color:'var(--white)' } }, consig || 'Remate'),
              tipo && React.createElement(Mono, { style:{ fontSize:9, color:'var(--accent)', background:'var(--acc-bg)', padding:'2px 7px', borderRadius:4, border:'1px solid rgba(91,156,246,.2)' } }, tipo.toUpperCase())
            ),
            React.createElement('div', { style:{ display:'flex', gap:12, flexWrap:'wrap' } },
              lugar && React.createElement(Mono, { style:{ fontSize:10, color:'var(--text2)' } }, '📍 ' + lugar + (provincia ? ', ' + provincia : '')),
              fechaR && React.createElement(Mono, { style:{ fontSize:10, color:'var(--text3)' } }, '📅 ' + fFechaCorta(fechaR)),
              r.hora && React.createElement(Mono, { style:{ fontSize:10, color:'var(--text3)' } }, '🕐 ' + r.hora)
            )
          ),
          cabezas != null && React.createElement('div', { style:{ textAlign:'right', flexShrink:0 } },
            React.createElement(Mono, { style:{ fontSize:18, fontWeight:700, color:'var(--accent)', display:'block' } }, fNum(cabezas)),
            React.createElement(Mono, { style:{ fontSize:9, color:'var(--text3)', display:'block' } }, 'CABEZAS')
          )
        );
      })
    ),
    React.createElement('div', { className:'source', style:{ marginTop:10 } }, 'Calendario de remates · Fuente: consignatarias.com.ar')
  );
}

// ─── TabHistorico ─────────────────────────────────────────────────────────────
function TabHistorico({ historico, categorias }) {
  var gruposData = ORDEN_GRUPOS.map(function(gid) {
    var cats = (categorias || []).filter(function(c) { return c.grupo === gid; });
    if (!cats.length) return null;
    var prom = cats.reduce(function(s, c) { return s + (c.promedio || 0); }, 0) / cats.length;
    var cab  = cats.reduce(function(s, c) { return s + (c.cabezas || 0); }, 0);
    return { gid:gid, label:GRUPO_LABELS[gid], color:GRUPO_COLOR[gid], prom:prom, cabezas:cab };
  }).filter(Boolean);

  var maxProm = Math.max.apply(null, gruposData.map(function(g) { return g.prom; }));

  return React.createElement('div', null,
    gruposData.length > 0 && React.createElement('div', { style:{ marginBottom:32 } },
      React.createElement('div', { className:'section-title' }, 'Precio promedio por grupo · jornada actual'),
      React.createElement('div', { style:{ display:'flex', flexDirection:'column', gap:10 } },
        [...gruposData].sort(function(a,b){return b.prom-a.prom;}).map(function(g) {
          var pct = maxProm > 0 ? (g.prom / maxProm) * 100 : 0;
          return React.createElement('div', { key:g.gid, style:{ display:'grid', gridTemplateColumns:'120px 1fr 130px', alignItems:'center', gap:16 } },
            React.createElement('div', { style:{ display:'flex', alignItems:'center', gap:8 } },
              React.createElement('div', { style:{ width:3, height:16, background:g.color, borderRadius:2, flexShrink:0 } }),
              React.createElement('span', { style:{ fontSize:12, color:'var(--text2)' } }, g.label)
            ),
            React.createElement('div', { style:{ position:'relative', height:20, background:'var(--bg3)', borderRadius:4, overflow:'hidden' } },
              React.createElement('div', { style:{ position:'absolute', left:0, top:0, bottom:0, width:pct.toFixed(1)+'%', background:g.color+'40', borderRadius:4, transition:'width .4s ease' } })
            ),
            React.createElement('div', { style:{ textAlign:'right', display:'flex', justifyContent:'flex-end', gap:12, alignItems:'baseline' } },
              g.cabezas > 0 && React.createElement(Mono, { style:{ fontSize:9, color:'var(--text3)' } }, fNum(g.cabezas) + ' cab.'),
              React.createElement(Mono, { style:{ fontSize:13, fontWeight:700, color:g.color } }, fARS(g.prom))
            )
          );
        })
      )
    ),

    historico ? React.createElement('div', null,
      React.createElement('div', { className:'section-title' }, 'Histórico INMAG'),
      historico.stats && React.createElement('div', { className:'grid grid-3', style:{ marginBottom:20 } },
        [
          { label:'Mínimo', val:historico.stats.min, color:'var(--red)' },
          { label:'Promedio', val:historico.stats.avg, color:'var(--accent)' },
          { label:'Máximo', val:historico.stats.max, color:'var(--green)' },
        ].map(function(s) {
          return React.createElement('div', { key:s.label, className:'stat', style:{ cursor:'default', padding:'12px 16px' } },
            React.createElement('div', { style:{ fontSize:11, color:'var(--text3)', marginBottom:6, fontFamily:'var(--mono)', letterSpacing:'.08em', textTransform:'uppercase' } }, s.label),
            React.createElement('div', { style:{ fontSize:20, fontWeight:700, color:s.color, fontFamily:'var(--mono)' } }, fARS(s.val))
          );
        })
      ),
      historico.series && historico.series.length > 0 && React.createElement('div', { className:'tbl-wrap tbl-scroll', style:{ maxHeight:320 } },
        React.createElement('table', null,
          React.createElement('thead', null,
            React.createElement('tr', null,
              React.createElement('th', null, 'Fecha'),
              React.createElement('th', { className:'r' }, 'INMAG'),
              React.createElement('th', { className:'r' }, 'Var. día')
            )
          ),
          React.createElement('tbody', null,
            [...historico.series].reverse().map(function(s, i, arr) {
              var prev   = arr[i+1];
              var varPct = prev && prev.valor ? ((s.valor - prev.valor) / prev.valor) * 100 : null;
              var varPos = varPct != null && varPct >= 0;
              return React.createElement('tr', { key:s.fecha || i },
                React.createElement('td', null, React.createElement(Mono, { style:{ fontSize:12 } }, fFechaCorta(s.fecha))),
                React.createElement('td', { className:'r' }, React.createElement(Mono, { style:{ fontSize:12, fontWeight:600, color:'var(--accent)' } }, fARS(s.valor != null ? s.valor : s.inmag))),
                React.createElement('td', { className:'r' },
                  varPct != null
                    ? React.createElement(Mono, { style:{ fontSize:11, color:varPos?'var(--green)':'var(--red)', fontWeight:600 } }, (varPos?'▲':'▼') + ' ' + Math.abs(varPct).toFixed(1) + '%')
                    : React.createElement(Mono, { style:{ fontSize:11, color:'var(--text3)' } }, '—')
                )
              );
            })
          )
        )
      )
    ) : React.createElement('div', { className:'alert-strip warn' }, React.createElement('span', { className:'alert-icon' }, '!'), React.createElement('span', { className:'alert-text' }, 'Sin datos históricos.')),

    React.createElement('div', { className:'source', style:{ marginTop:10 } }, 'INMAG: Índice Novillo MAG · Fuente: consignatarias.com.ar')
  );
}

// ─── Skeleton & Error ─────────────────────────────────────────────────────────
function Skeleton() {
  return React.createElement('div', null,
    React.createElement('style', null, '@keyframes pulse{0%,100%{opacity:.4}50%{opacity:.9}}'),
    React.createElement('div', { style:{ padding:'12px 20px', marginBottom:28, background:'var(--bg1)', border:'1px solid var(--line)', borderRadius:10 } },
      React.createElement(Skel, { w:'45%', h:14 })
    ),
    React.createElement('div', { className:'grid grid-3', style:{ marginBottom:28 } },
      [0,1,2].map(function(i) {
        return React.createElement('div', { key:i, className:'stat' },
          React.createElement(Skel, { w:'40%', h:10, mb:14 }),
          React.createElement(Skel, { w:'70%', h:28, mb:10 }),
          React.createElement(Skel, { w:'85%', h:9 })
        );
      })
    ),
    [0,1,2,3,4].map(function(i) {
      return React.createElement('div', { key:i, style:{ padding:'16px 22px', marginBottom:2, background:'var(--bg1)', border:'1px solid var(--line)', borderRadius:10, display:'flex', gap:24, alignItems:'center' } },
        React.createElement('div', { style:{ flex:1 } }, React.createElement(Skel, { w:'50%', h:12, mb:6 }), React.createElement(Skel, { w:'70%', h:9 })),
        React.createElement(Skel, { w:'180px', h:18 }),
        React.createElement(Skel, { w:'80px', h:20 })
      );
    })
  );
}

function ErrorState({ error, onRetry }) {
  return React.createElement('div', { style:{ padding:'48px 0', textAlign:'center' } },
    React.createElement('div', { style:{ fontSize:32, marginBottom:14 } }, '⚠'),
    React.createElement('div', { style:{ fontFamily:'var(--display)', fontSize:17, color:'var(--text)', marginBottom:10 } }, 'No se pudieron cargar los datos'),
    React.createElement(Mono, { style:{ fontSize:11, color:'var(--red)', background:'var(--red-bg)', border:'1px solid rgba(224,92,92,.3)', borderRadius:8, padding:'8px 18px', display:'inline-block', marginBottom:22 } }, error),
    React.createElement('br'),
    React.createElement('button', { onClick:onRetry, style:{ fontFamily:'var(--mono)', fontSize:11, fontWeight:700, padding:'10px 24px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:8, cursor:'pointer' } }, 'Reintentar')
  );
}

// ─── TabFrigorificos ──────────────────────────────────────────────────────────
var CAT_COLOR = {
  novillos:    '#5b9cf6',
  novillitos:  '#4080d8',
  vacas:       '#8fb8f0',
  vaquillonas: '#6faafc',
  terneros:    '#94c4ff',
};
var CAT_LABELS = { novillos:'Novillos', novillitos:'Novillitos', vacas:'Vacas', vaquillonas:'Vaquillonas', terneros:'Terneros' };
var MESES_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function MiniBarChart({ data, colorKey }) {
  var maxVal = Math.max.apply(null, data.map(function(d){ return d.value||0; }));
  return React.createElement('div', { style:{ display:'flex', alignItems:'flex-end', gap:3, height:48 } },
    data.map(function(d, i) {
      var pct = maxVal > 0 ? (d.value / maxVal) * 100 : 0;
      var color = colorKey || 'var(--accent)';
      return React.createElement('div', { key:i, style:{ display:'flex', flexDirection:'column', alignItems:'center', flex:1, gap:2 } },
        React.createElement('div', {
          style:{ width:'100%', background:color, borderRadius:'2px 2px 0 0', height:pct.toFixed(0)+'%', minHeight: pct > 0 ? 3 : 0, transition:'height .3s ease', opacity:.85 }
        }),
        React.createElement('div', { style:{ fontSize:7, color:'var(--text3)', fontFamily:'var(--mono)', textAlign:'center', lineHeight:1 } }, d.label)
      );
    })
  );
}

function LineChart({ series, color }) {
  var ref = useRef(null);
  useEffect(function() {
    if (!ref.current || !series || series.length < 2) return;
    var el = ref.current;
    var W  = el.offsetWidth || 400;
    var H  = 64;
    var vals = series.map(function(d){ return d.cabezas||d.total||d.value||0; });
    var mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals);
    var sp = mx - mn || 1;
    var pts = vals.map(function(v, i) {
      var x = (i / (vals.length - 1)) * W;
      var y = H - ((v - mn) / sp) * (H - 8) - 4;
      return x.toFixed(1) + ',' + y.toFixed(1);
    }).join(' ');
    el.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    var xN = W;
    var areaStart = '0,' + H + ' ';
    var areaEnd   = ' ' + xN + ',' + H;
    el.innerHTML = [
      '<defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="'+color+'" stop-opacity="0.25"/><stop offset="100%" stop-color="'+color+'" stop-opacity="0.02"/></linearGradient></defs>',
      '<polygon points="'+areaStart+pts+areaEnd+'" fill="url(#lg)"/>',
      '<polyline points="'+pts+'" fill="none" stroke="'+color+'" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>',
    ].join('');
  }, [series, color]);
  return React.createElement('svg', { ref:ref, style:{ width:'100%', height:64, display:'block' } });
}

function FrigKpi({ label, value, sub, color }) {
  return React.createElement('div', { className:'stat', style:{ cursor:'default' } },
    React.createElement('div', { style:{ fontSize:11, color:'var(--text3)', fontFamily:'var(--mono)', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:8 } }, label),
    React.createElement('div', { className:'stat-val', style:{ fontSize:22, color: color||'var(--accent)' } }, value),
    sub && React.createElement('div', { className:'stat-meta' }, sub)
  );
}

// Barra horizontal proporcional
function BarraHoriz({ label, value, maxValue, color, sublabel }) {
  var pct = maxValue > 0 ? Math.min((value / maxValue) * 100, 100) : 0;
  return React.createElement('div', { style:{ marginBottom:10 } },
    React.createElement('div', { style:{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:4 } },
      React.createElement('span', { style:{ fontSize:12, fontWeight:500, color:'var(--text)', fontFamily:'var(--body)' } }, label),
      React.createElement('div', { style:{ display:'flex', alignItems:'baseline', gap:8 } },
        React.createElement(Mono, { style:{ fontSize:12, fontWeight:700, color: color||'var(--accent)' } }, sublabel || ''),
        React.createElement(Mono, { style:{ fontSize:10, color:'var(--text3)' } }, pct.toFixed(1) + '%')
      )
    ),
    React.createElement('div', { style:{ position:'relative', height:6, background:'var(--bg3)', borderRadius:3, overflow:'hidden' } },
      React.createElement('div', {
        style:{ position:'absolute', left:0, top:0, bottom:0, width: pct.toFixed(1)+'%',
          background: color || 'var(--accent)', borderRadius:3, transition:'width .5s ease', opacity:.85 }
      })
    )
  );
}

// Badge de variación
function VarBadge({ val, suffix }) {
  if (val == null || isNaN(val)) return null;
  var pos = val >= 0;
  return React.createElement(Mono, {
    style:{ fontSize:10, fontWeight:700,
      color: pos ? 'var(--green)' : 'var(--red)',
      background: pos ? 'rgba(74,191,120,.10)' : 'rgba(224,92,92,.10)',
      border: '1px solid ' + (pos ? 'rgba(74,191,120,.25)' : 'rgba(224,92,92,.25)'),
      padding:'2px 6px', borderRadius:4 }
  }, (pos ? '▲ +' : '▼ ') + Math.abs(val).toFixed(1) + (suffix||'%'));
}

// Chip de mercado destino
function MercadoChip({ label }) {
  return React.createElement(Mono, {
    style:{ fontSize:9, color:'var(--text2)', background:'var(--bg3)',
      border:'1px solid var(--line)', padding:'2px 7px', borderRadius:12 }
  }, label);
}

function TabFrigorificos({ frigData, loadingFrig, errorFrig, onRetry }) {
  var [vista, setVista] = useState('resumen');
  var [periodoIdx, setPeriodoIdx] = useState(1); // default: 2025 completo

  if (loadingFrig) return React.createElement('div', { style:{ padding:'48px 0', textAlign:'center' } },
    React.createElement('div', { style:{ fontSize:28, marginBottom:12, opacity:.4 } }, '🥩'),
    React.createElement(Mono, { style:{ fontSize:12, color:'var(--text3)' } }, 'Cargando datos de faena y frigoríficos…')
  );
  if (errorFrig || !frigData) return React.createElement('div', { style:{ padding:'32px 0', textAlign:'center' } },
    React.createElement('div', { style:{ fontSize:28, marginBottom:12 } }, '⚠'),
    React.createElement(Mono, { style:{ fontSize:11, color:'var(--red)', display:'block', marginBottom:18 } }, errorFrig || 'Sin datos'),
    React.createElement('button', { onClick:onRetry, style:{ fontFamily:'var(--mono)', fontSize:11, padding:'8px 20px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:8, cursor:'pointer' } }, 'Reintentar')
  );

  var kpis        = frigData.kpis            || {};
  var histAn      = frigData.historicoAnual  || [];
  var mensualRec  = frigData.mensualReciente || [];
  var cats        = frigData.categorias      || [];
  var topFrig     = frigData.topFrigorificos || [];
  var provincias  = frigData.faenaPorProvincia || [];
  var analisis    = frigData.analisis         || {};
  var dir         = frigData.directorio       || {};
  var meta        = frigData.meta             || {};

  // Usar campos dinámicos de la API
  var anioRef        = kpis.anioRef       || 2025;
  var faenaRef       = kpis.faenaAnualRef || 13230000;
  var varAnual       = kpis.varAnual;
  var pesoResRef     = kpis.pesoResRef    || 231;
  var produccionRef  = kpis.produccionRef || 3060;
  var ultimoMes      = kpis.ultimoMes;
  var ultimoMesCab   = kpis.ultimoMesCabezas;
  var ultimoMesPeso  = kpis.ultimoMesPeso;

  // Badge de fuente: verde = datos vivos, amarillo = fallback
  var esFallback    = meta.usandoFallback;
  var fuenteLabel   = meta.fuentePrimaria || 'MAGYP · DNCCA · SENASA · Consorcio ABC';
  var ultimoDato    = meta.ultimoDatoDisponible || ultimoMes;

  // Períodos para análisis mensual
  var PERIODOS = [
    { label:'2026 (YTD)', meses: mensualRec.filter(function(m){ return m.mes && m.mes.startsWith('2026'); }) },
    { label:'2025',       meses: mensualRec.filter(function(m){ return m.mes && m.mes.startsWith('2025'); }) },
    { label:'Últ. 12m',  meses: mensualRec.slice(-12) },
    { label:'Últ. 24m',  meses: mensualRec.slice(-24) },
  ];
  var periodoActual = PERIODOS[periodoIdx];
  var mesesPeriodo  = periodoActual ? (periodoActual.meses || []) : [];
  var totalPeriodo  = mesesPeriodo.reduce(function(s,m){ return s + (m.total||0); }, 0);
  var promedioMes   = mesesPeriodo.length > 0 ? Math.round(totalPeriodo / mesesPeriodo.length) : 0;
  var pesoPromPeriodo = (function(){
    var mCon = mesesPeriodo.filter(function(m){return m.pesoRes;});
    return mCon.length ? (mCon.reduce(function(s,m){return s+(m.pesoRes||0);},0)/mCon.length).toFixed(1) : null;
  })();

  // Ciclo ganadero
  var hPct = analisis.hembras2025pct || 47.4;
  var faseCiclo = analisis.faseCiclo || (hPct < 46 ? 'retencion' : hPct > 48.5 ? 'liquidacion' : 'retencion_leve');
  var faseColor = faseCiclo === 'liquidacion' || faseCiclo === 'liquidación' ? 'var(--red)'
                : faseCiclo === 'retencion'   || faseCiclo === 'retención'   ? 'var(--green)' : 'var(--accent)';
  var faseLabel = { retencion:'Retención', retencion_leve:'Retención leve', liquidacion:'Liquidación',
                    'retención':'Retención', 'retención_leve':'Retención leve', 'liquidación':'Liquidación' }[faseCiclo] || '—';

  var VISTAS = [
    { id:'resumen',    label:'Resumen' },
    { id:'faena',      label:'Faena mensual' },
    { id:'provincias', label:'Por provincia' },
    { id:'directorio', label:'Directorio' },
    { id:'ciclo',      label:'Ciclo ganadero' },
    { id:'historico',  label:'Serie histórica' },
  ];

  return React.createElement('div', null,

    // Banner fuente con estado en vivo vs fallback
    React.createElement('div', {
      style:{ display:'flex', alignItems:'center', gap:10, padding:'9px 16px', marginBottom:20,
        background: esFallback ? 'rgba(232,160,32,.06)' : 'rgba(74,191,120,.04)',
        border:'1px solid '+(esFallback ? 'rgba(232,160,32,.25)' : 'rgba(74,191,120,.15)'),
        borderRadius:8, flexWrap:'wrap' }
    },
      React.createElement('div', {
        style:{ width:7, height:7, borderRadius:'50%', flexShrink:0,
          background: esFallback ? '#e8a020' : 'var(--green)',
          boxShadow:'0 0 6px '+(esFallback ? '#e8a020' : 'var(--green)') }
      }),
      React.createElement(Mono, { style:{ fontSize:9, color:'var(--text3)', letterSpacing:'.09em', textTransform:'uppercase' } },
        fuenteLabel
      ),
      ultimoDato && React.createElement(Mono, { style:{ fontSize:9, color:'var(--text3)', marginLeft:'auto' } },
        'Último dato: ' + ultimoDato + (esFallback ? ' · fallback' : ' · en vivo')
      )
    ),

    // KPIs principales (siempre visibles)
    React.createElement('div', { className:'grid grid-3', style:{ marginBottom:24 } },
      React.createElement('div', { className:'stat', style:{ cursor:'default' } },
        React.createElement(Mono, { style:{ fontSize:9, color:'var(--text3)', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:8 } },
          'Faena anual ' + anioRef
        ),
        React.createElement('div', { className:'stat-val', style:{ fontSize:22, color:'var(--accent)' } },
          (faenaRef/1e6).toFixed(2)+' M'
        ),
        React.createElement('div', { className:'stat-meta' },
          'cab. · ',
          varAnual != null
            ? React.createElement('span', { style:{ color: varAnual >= 0 ? 'var(--green)' : 'var(--red)' } },
                (varAnual >= 0 ? '▲ +' : '▼ ') + Math.abs(varAnual).toFixed(1) + '% i/a'
              )
            : '—'
        )
      ),
      React.createElement('div', { className:'stat', style:{ cursor:'default' } },
        React.createElement(Mono, { style:{ fontSize:9, color:'var(--text3)', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:8 } },
          'Peso prom. res ' + anioRef
        ),
        React.createElement('div', { className:'stat-val', style:{ fontSize:22, color:'var(--green)' } },
          (pesoResRef || '—') + ' kg'
        ),
        React.createElement('div', { className:'stat-meta' }, 'kg res con hueso · promedio anual')
      ),
      React.createElement('div', { className:'stat', style:{ cursor:'default' } },
        React.createElement(Mono, { style:{ fontSize:9, color:'var(--text3)', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:8 } }, 'Producción ' + anioRef),
        React.createElement('div', { className:'stat-val', style:{ fontSize:22 } },
          (produccionRef||'—') + ' k tn'
        ),
        React.createElement('div', { className:'stat-meta' }, 'miles de tn equiv. res')
      ),
      React.createElement('div', { className:'stat', style:{ cursor:'default' } },
        React.createElement(Mono, { style:{ fontSize:9, color:'var(--text3)', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:8 } }, 'Establecimientos'),
        React.createElement('div', { className:'stat-val', style:{ fontSize:22 } },
          (kpis.frigoriificosActivos || '—').toLocaleString ? (kpis.frigoriificosActivos || 364).toLocaleString('es-AR') : '364'
        ),
        React.createElement('div', { className:'stat-meta' }, 'habilitados SENASA · tráfico federal')
      ),
      React.createElement('div', { className:'stat', style:{ cursor:'default' } },
        React.createElement(Mono, { style:{ fontSize:9, color:'var(--text3)', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:8 } }, '% Hembras 2025'),
        React.createElement('div', { className:'stat-val', style:{ fontSize:22, color: faseColor } }, hPct + '%'),
        React.createElement('div', { className:'stat-meta' },
          'ciclo: ', React.createElement('span', { style:{ color:faseColor, fontWeight:600 } }, faseLabel)
        )
      ),
      ultimoMesCab != null && React.createElement('div', { className:'stat', style:{ cursor:'default' } },
        React.createElement(Mono, { style:{ fontSize:9, color:'var(--text3)', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:8 } },
          'Último dato · ' + (ultimoDato || '—')
        ),
        React.createElement('div', { className:'stat-val', style:{ fontSize:22 } },
          Math.round(ultimoMesCab/1000)+' k'
        ),
        React.createElement('div', { className:'stat-meta' },
          'cab. faenadas' + (ultimoMesPeso ? ' · ' + ultimoMesPeso + ' kg/res' : '')
        )
      )
    ),

    // Selector de vista
    React.createElement('div', { style:{ display:'flex', gap:4, marginBottom:20, flexWrap:'wrap' } },
      VISTAS.map(function(v) {
        var active = vista === v.id;
        return React.createElement('button', {
          key:v.id, onClick:function(){ setVista(v.id); },
          style:{ fontFamily:'var(--mono)', fontSize:10, fontWeight:600, padding:'5px 12px', borderRadius:6, cursor:'pointer',
            border:'1px solid '+(active?'var(--accent)':'var(--line)'),
            background: active?'var(--acc-bg)':'transparent',
            color: active?'var(--accent)':'var(--text3)', transition:'all .15s' }
        }, v.label.toUpperCase());
      })
    ),

    // ════════════════════════════════════════════════════════════════════════
    // VISTA: RESUMEN
    // ════════════════════════════════════════════════════════════════════════
    vista === 'resumen' && React.createElement('div', null,

      analisis.contexto2025 && React.createElement('div', {
        style:{ padding:'18px 22px', background:'var(--bg1)', border:'1px solid var(--line)', borderRadius:12, marginBottom:20 }
      },
        React.createElement('div', { className:'section-title', style:{ marginBottom:10 } }, '📊 Contexto ' + anioRef + '–' + (anioRef+1)),
        React.createElement('p', { style:{ fontSize:13, color:'var(--text)', lineHeight:1.7, marginBottom: analisis.contexto2026 ? 10 : 0 } },
          analisis.contexto2025
        ),
        analisis.contexto2026 && React.createElement('p', { style:{ fontSize:13, color:'var(--text2)', lineHeight:1.7 } },
          analisis.contexto2026
        )
      ),

      // Comparativa últimos 5 años
      React.createElement('div', { className:'section-title' }, 'Faena anual · comparativa'),
      React.createElement('div', { style:{ display:'flex', flexDirection:'column', gap:6, marginBottom:24 } },
        (function(){
          var sliced = histAn.slice(-5);
          var maxCab = Math.max.apply(null, sliced.map(function(x){ return x.cabezas; }));
          return sliced.reverse().map(function(d, i) {
            var origIdx = sliced.length - 1 - i;
            var prev = histAn[histAn.length - 5 + origIdx - 1];
            var varPct = prev && prev.cabezas ? ((d.cabezas - prev.cabezas)/prev.cabezas)*100 : null;
            var isLatest = i === 0;
            return React.createElement('div', { key:d.anio,
              style:{ display:'grid', gridTemplateColumns:'56px 1fr 90px 80px', gap:12, alignItems:'center',
                padding:'10px 16px',
                background: isLatest ? 'rgba(91,156,246,.06)' : 'var(--bg1)',
                border:'1px solid '+(isLatest?'var(--accent)':'var(--line)'), borderRadius:8 }
            },
              React.createElement(Mono, { style:{ fontSize:13, fontWeight:700, color: isLatest?'var(--accent)':'var(--white)' } }, d.anio),
              React.createElement('div', { style:{ position:'relative', height:8, background:'var(--bg3)', borderRadius:4, overflow:'hidden' } },
                React.createElement('div', { style:{ position:'absolute', left:0, top:0, bottom:0, borderRadius:4,
                  width:((d.cabezas/maxCab)*100).toFixed(1)+'%',
                  background:['#5b9cf6','#4d8fec','#3e82e0','#2e74d4','#1e67c8'][i] || 'var(--accent)',
                  opacity:.8, transition:'width .5s ease' } })
              ),
              React.createElement(Mono, { style:{ fontSize:13, fontWeight:700, color:'var(--text)', textAlign:'right' } },
                (d.cabezas/1e6).toFixed(2)+' M'
              ),
              varPct != null
                ? React.createElement(Mono, { style:{ fontSize:10, fontWeight:700, textAlign:'right',
                    color:varPct>=0?'var(--green)':'var(--red)' } },
                    (varPct>=0?'▲ +':'▼ ')+Math.abs(varPct).toFixed(1)+'%'
                  )
                : React.createElement(Mono, { style:{ fontSize:10, color:'var(--text3)' } }, '—')
            );
          });
        })()
      ),

      // Participación por categoría (datos agregados 2025)
      cats.length > 0 && React.createElement('div', null,
        React.createElement('div', { className:'section-title' }, 'Participación por categoría · faena 2025'),
        React.createElement('div', { style:{ display:'flex', flexDirection:'column', gap:6, marginBottom:16 } },
          cats.map(function(cat) {
            var color = CAT_COLOR[cat.nombre] || 'var(--accent)';
            var label = CAT_LABELS[cat.nombre] || cat.nombre;
            return React.createElement('div', { key:cat.nombre,
              style:{ display:'grid', gridTemplateColumns:'100px 1fr 55px', alignItems:'center', gap:12,
                padding:'10px 16px', background:'var(--bg1)', border:'1px solid var(--line)', borderRadius:8 }
            },
              React.createElement('div', { style:{ display:'flex', alignItems:'center', gap:6 } },
                React.createElement('div', { style:{ width:3, height:14, background:color, borderRadius:2 } }),
                React.createElement('span', { style:{ fontSize:12, fontWeight:500, color:'var(--text)' } }, label)
              ),
              React.createElement('div', { style:{ position:'relative', height:8, background:'var(--bg3)', borderRadius:4, overflow:'hidden' } },
                React.createElement('div', { style:{ position:'absolute', left:0, top:0, bottom:0,
                  width:cat.participacion.toFixed(1)+'%', background:color, opacity:.7, borderRadius:4, transition:'width .4s ease' } })
              ),
              React.createElement(Mono, { style:{ fontSize:12, fontWeight:700, color:color, textAlign:'right' } },
                cat.participacion.toFixed(1)+'%'
              )
            );
          })
        )
      ),

      React.createElement('div', { className:'source' }, 'Fuente: MAGYP · DNCCA · SENASA · Consorcio ABC · datos.magyp.gob.ar')
    ),

    // ════════════════════════════════════════════════════════════════════════
    // VISTA: FAENA MENSUAL
    // ════════════════════════════════════════════════════════════════════════
    vista === 'faena' && React.createElement('div', null,

      // Selector de período
      React.createElement('div', { style:{ display:'flex', gap:6, marginBottom:16, alignItems:'center', flexWrap:'wrap' } },
        React.createElement(Mono, { style:{ fontSize:9, color:'var(--text3)', letterSpacing:'.08em', textTransform:'uppercase' } }, 'Período:'),
        PERIODOS.map(function(p, idx) {
          var active = periodoIdx === idx;
          return React.createElement('button', { key:idx, onClick:function(){ setPeriodoIdx(idx); },
            style:{ fontFamily:'var(--mono)', fontSize:10, padding:'4px 10px', borderRadius:6, cursor:'pointer',
              border:'1px solid '+(active?'var(--accent)':'var(--line)'),
              background: active?'var(--acc-bg)':'transparent',
              color: active?'var(--accent)':'var(--text3)' }
          }, p.label);
        })
      ),

      // KPIs del período
      mesesPeriodo.length > 0 && React.createElement('div', { style:{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 } },
        React.createElement('div', { style:{ padding:'12px 16px', background:'var(--bg1)', border:'1px solid var(--line)', borderRadius:10 } },
          React.createElement(Mono, { style:{ fontSize:9, color:'var(--text3)', display:'block', marginBottom:5, letterSpacing:'.08em', textTransform:'uppercase' } }, 'Total período'),
          React.createElement('div', { style:{ fontSize:18, fontWeight:700, color:'var(--accent)', fontFamily:'var(--mono)' } }, (totalPeriodo/1e6).toFixed(2)+' M'),
          React.createElement(Mono, { style:{ fontSize:9, color:'var(--text3)' } }, mesesPeriodo.length+' meses')
        ),
        React.createElement('div', { style:{ padding:'12px 16px', background:'var(--bg1)', border:'1px solid var(--line)', borderRadius:10 } },
          React.createElement(Mono, { style:{ fontSize:9, color:'var(--text3)', display:'block', marginBottom:5, letterSpacing:'.08em', textTransform:'uppercase' } }, 'Prom. mensual'),
          React.createElement('div', { style:{ fontSize:18, fontWeight:700, color:'var(--text)', fontFamily:'var(--mono)' } }, Math.round(promedioMes/1000)+' k'),
          React.createElement(Mono, { style:{ fontSize:9, color:'var(--text3)' } }, 'cab./mes')
        ),
        React.createElement('div', { style:{ padding:'12px 16px', background:'var(--bg1)', border:'1px solid var(--line)', borderRadius:10 } },
          React.createElement(Mono, { style:{ fontSize:9, color:'var(--text3)', display:'block', marginBottom:5, letterSpacing:'.08em', textTransform:'uppercase' } }, 'Peso prom. res'),
          React.createElement('div', { style:{ fontSize:18, fontWeight:700, color:'var(--green)', fontFamily:'var(--mono)' } }, pesoPromPeriodo ? pesoPromPeriodo+' kg' : '—'),
          React.createElement(Mono, { style:{ fontSize:9, color:'var(--text3)' } }, 'promedio período')
        )
      ),

      // Gráfico
      mesesPeriodo.length >= 2 && React.createElement('div', {
        style:{ background:'var(--bg1)', border:'1px solid var(--line)', borderRadius:10, padding:'16px 20px', marginBottom:14 }
      },
        React.createElement('div', { style:{ marginBottom:6, display:'flex', justifyContent:'space-between', alignItems:'baseline' } },
          React.createElement(Mono, { style:{ fontSize:9, color:'var(--text3)', letterSpacing:'.1em', textTransform:'uppercase' } }, 'Evolución · cabezas faenadas'),
          React.createElement(Mono, { style:{ fontSize:9, color:'var(--accent)' } }, periodoActual.label)
        ),
        React.createElement(LineChart, { series: mesesPeriodo.map(function(m){ return { cabezas:m.total }; }), color:'var(--accent)' }),
        React.createElement('div', { style:{ display:'flex', justifyContent:'space-between', marginTop:3 } },
          mesesPeriodo.map(function(m, i) {
            var partes = (m.mes||'').split('-');
            return React.createElement(Mono, { key:i,
              style:{ fontSize:7, color:'var(--text3)', flex:1, textAlign:'center', overflow:'hidden' } },
              MESES_SHORT[parseInt(partes[1]||'1',10)-1]
            );
          })
        )
      ),

      // Tabla — columnas reducidas para evitar overflow
      mesesPeriodo.length > 0 && React.createElement('div', { className:'tbl-wrap tbl-scroll', style:{ maxHeight:380 } },
        React.createElement('table', { style:{ minWidth:600 } },
          React.createElement('thead', null,
            React.createElement('tr', null,
              React.createElement('th', { style:{ minWidth:90 } }, 'Mes'),
              React.createElement('th', { className:'r', style:{ minWidth:75 } }, 'Total'),
              React.createElement('th', { className:'r', style:{ minWidth:65 } }, 'Var. m/m'),
              React.createElement('th', { className:'r', style:{ minWidth:70 } }, 'Novillos'),
              React.createElement('th', { className:'r', style:{ minWidth:65 } }, 'Vacas'),
              React.createElement('th', { className:'r', style:{ minWidth:75 } }, 'Peso res'),
              React.createElement('th', { className:'r', style:{ minWidth:75 } }, '% Hembras')
            )
          ),
          React.createElement('tbody', null,
            [...mesesPeriodo].reverse().map(function(m, i, arr) {
              var prev = arr[i+1];
              var varPct = prev && prev.total ? ((m.total - prev.total)/prev.total)*100 : null;
              var partes = (m.mes||'').split('-');
              var mesLabel = (MESES_SHORT[parseInt(partes[1]||'1',10)-1]||'')+' '+(partes[0]||'');
              return React.createElement('tr', { key:m.mes },
                React.createElement('td', null, React.createElement(Mono, { style:{ fontSize:12 } }, mesLabel)),
                React.createElement('td', { className:'r' },
                  React.createElement(Mono, { style:{ fontSize:13, fontWeight:700, color:'var(--accent)' } },
                    Math.round((m.total||0)/1000)+'k'
                  )
                ),
                React.createElement('td', { className:'r' },
                  varPct != null
                    ? React.createElement(Mono, { style:{ fontSize:10, fontWeight:700,
                        color:varPct>=0?'var(--green)':'var(--red)' } },
                        (varPct>=0?'▲ +':'▼ ')+Math.abs(varPct).toFixed(1)+'%'
                      )
                    : React.createElement(Mono, { style:{ fontSize:10, color:'var(--text3)' } }, '—')
                ),
                React.createElement('td', { className:'r' },
                  React.createElement(Mono, { style:{ fontSize:11, color:CAT_COLOR.novillos } },
                    m.novillos != null ? Math.round(m.novillos/1000)+'k' : '—'
                  )
                ),
                React.createElement('td', { className:'r' },
                  React.createElement(Mono, { style:{ fontSize:11, color:CAT_COLOR.vacas } },
                    m.vacas != null ? Math.round(m.vacas/1000)+'k' : '—'
                  )
                ),
                React.createElement('td', { className:'r' },
                  React.createElement(Mono, { style:{ fontSize:11, color:'var(--green)' } },
                    m.pesoRes != null ? m.pesoRes+' kg' : '—'
                  )
                ),
                React.createElement('td', { className:'r' },
                  React.createElement(Mono, {
                    style:{ fontSize:11,
                      color: m.hembras_pct > 48.5 ? 'var(--red)' : m.hembras_pct < 46 ? 'var(--green)' : 'var(--text2)' }
                  }, m.hembras_pct != null ? m.hembras_pct+'%' : '—')
                )
              );
            })
          )
        )
      ),
      React.createElement('div', { className:'source', style:{ marginTop:8 } },
        'Faena mensual bovina · Fuente: MAGYP/DNCCA · SIF-SIGICA · Consorcio ABC'
      )
    ),

    // ════════════════════════════════════════════════════════════════════════
    // VISTA: POR PROVINCIA
    // ════════════════════════════════════════════════════════════════════════
    vista === 'provincias' && React.createElement('div', null,
      React.createElement('div', { className:'section-title' }, 'Distribución de faena por provincia · datos MAGYP 2024'),
      React.createElement('div', {
        style:{ padding:'10px 16px', marginBottom:16, background:'rgba(91,156,246,.06)',
          border:'1px solid rgba(91,156,246,.2)', borderRadius:8 }
      },
        React.createElement(Mono, { style:{ fontSize:10, color:'var(--text3)' } },
          'Participación % de faena y cantidad de establecimientos habilitados SENASA por provincia. '
          + 'Los % corresponden a datos agregados publicados por MAGYP 2024.'
        )
      ),
      provincias.length > 0 && React.createElement('div', { style:{ display:'flex', flexDirection:'column', gap:8, marginBottom:20 } },
        provincias.map(function(p) {
          return React.createElement('div', { key:p.provincia,
            style:{ display:'grid', gridTemplateColumns:'140px 1fr 50px 90px', gap:12, alignItems:'center',
              padding:'12px 16px', background:'var(--bg1)', border:'1px solid var(--line)', borderRadius:10 }
          },
            React.createElement('span', { style:{ fontSize:12, fontWeight:600, color:'var(--white)', fontFamily:'var(--display)' } }, p.provincia),
            React.createElement('div', { style:{ position:'relative', height:8, background:'var(--bg3)', borderRadius:4, overflow:'hidden' } },
              React.createElement('div', { style:{ position:'absolute', left:0, top:0, bottom:0, borderRadius:4,
                width:(p.pctFaena||p.pct||0).toFixed(0)+'%', background:'var(--accent)', opacity:.75, transition:'width .5s ease' } })
            ),
            React.createElement(Mono, { style:{ fontSize:12, fontWeight:700, color:'var(--accent)', textAlign:'right' } },
              (p.pctFaena||p.pct||0)+'%'
            ),
            React.createElement(Mono, { style:{ fontSize:10, color:'var(--text3)', textAlign:'right' } },
              (p.establecimientos||0)+' estab.'
            )
          );
        })
      ),
      React.createElement('div', { className:'source' },
        'Fuente: SENASA (registro habilitados) · MAGYP (informe sectorial 2024) · datos.magyp.gob.ar'
      )
    ),

    // ════════════════════════════════════════════════════════════════════════
    // VISTA: DIRECTORIO
    // ════════════════════════════════════════════════════════════════════════
    vista === 'directorio' && React.createElement('div', null,
      React.createElement('div', { style:{ display:'flex', alignItems:'center', gap:12, marginBottom:16,
        padding:'12px 16px', background:'var(--bg1)', border:'1px solid var(--line)', borderRadius:10 } },
        React.createElement(Mono, { style:{ fontSize:9, color:'var(--text3)', letterSpacing:'.1em', textTransform:'uppercase' } }, 'Total habilitados SENASA'),
        React.createElement(Mono, { style:{ fontSize:18, fontWeight:700, color:'var(--accent)', marginLeft:'auto' } },
          (dir.total || kpis.frigoriificosActivos || 364)+' establecimientos'
        ),
        React.createElement(Mono, { style:{ fontSize:10, color:'var(--text3)' } }, 'tráfico federal')
      ),
      React.createElement('div', {
        style:{ padding:'10px 16px', marginBottom:14, background:'rgba(91,156,246,.06)',
          border:'1px solid rgba(91,156,246,.2)', borderRadius:8 }
      },
        React.createElement(Mono, { style:{ fontSize:10, color:'var(--text3)' } },
          'Muestra del registro SENASA/MAGYP. Solo se incluyen datos del registro oficial: nombre, matrícula, provincia y habilitación de exportación.'
        )
      ),
      React.createElement('div', { className:'section-title' }, 'Establecimientos del registro oficial'),
      React.createElement('div', { style:{ display:'flex', flexDirection:'column', gap:4 } },
        (dir.muestra || topFrig).map(function(f, i) {
          return React.createElement('div', { key:i,
            style:{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px',
              background:'var(--bg1)', border:'1px solid var(--line)', borderRadius:10, flexWrap:'wrap' }
          },
            React.createElement('div', { style:{ flex:1, minWidth:0 } },
              React.createElement('div', { style:{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:3 } },
                React.createElement('span', { style:{ fontSize:13, fontWeight:600, color:'var(--white)', fontFamily:'var(--display)' } },
                  f.nombre || f.razon_social || '—'
                ),
                f.exportador && React.createElement(Mono, {
                  style:{ fontSize:8, color:'var(--green)', background:'rgba(74,191,120,.1)',
                    border:'1px solid rgba(74,191,120,.25)', padding:'1px 6px', borderRadius:4 }
                }, 'EXPORTADOR')
              ),
              React.createElement('div', { style:{ display:'flex', gap:10, flexWrap:'wrap' } },
                f.provincia && React.createElement(Mono, { style:{ fontSize:10, color:'var(--text2)' } }, '📍 '+f.provincia),
                f.etapa && React.createElement(Mono, { style:{ fontSize:10, color:'var(--text3)' } }, f.etapa)
              )
            ),
            f.matricula && React.createElement(Mono, {
              style:{ fontSize:10, color:'var(--accent)', background:'var(--acc-bg)',
                padding:'3px 8px', borderRadius:5, border:'1px solid rgba(91,156,246,.2)', flexShrink:0 }
            }, 'Mat. '+f.matricula),
            React.createElement('div', { style:{ width:4, height:4, borderRadius:'50%', background:'var(--green)', flexShrink:0 } })
          );
        })
      ),
      React.createElement('div', { className:'source', style:{ marginTop:12 } },
        'Registro SENASA · Dirección de Industria Alimentaria · MAGYP · datos.consignatarias.com.ar'
      )
    ),

    // ════════════════════════════════════════════════════════════════════════
    // VISTA: CICLO GANADERO
    // ════════════════════════════════════════════════════════════════════════
    vista === 'ciclo' && React.createElement('div', null,

      // Semáforo de fase
      React.createElement('div', {
        style:{ padding:'18px 22px', marginBottom:20, borderRadius:12,
          background: faseColor === 'var(--green)' ? 'rgba(74,191,120,.06)'
                    : faseColor === 'var(--red)'   ? 'rgba(224,92,92,.06)' : 'rgba(91,156,246,.06)',
          border:'1px solid '+(faseColor === 'var(--green)' ? 'rgba(74,191,120,.2)'
                             : faseColor === 'var(--red)'   ? 'rgba(224,92,92,.2)' : 'rgba(91,156,246,.2)') }
      },
        React.createElement('div', { style:{ display:'flex', alignItems:'center', gap:10, marginBottom:10 } },
          React.createElement('div', { style:{ width:10, height:10, borderRadius:'50%', background:faseColor, boxShadow:'0 0 8px '+faseColor } }),
          React.createElement('span', { style:{ fontFamily:'var(--display)', fontSize:15, fontWeight:700, color:'var(--white)' } },
            'Ciclo ganadero 2025: ', React.createElement('span', { style:{ color:faseColor } }, faseLabel.toUpperCase())
          )
        ),
        React.createElement('p', { style:{ fontSize:13, color:'var(--text)', lineHeight:1.7 } },
          analisis.interpretacion ||
          'Participación de hembras ~47.4% en 2025: leve retención. El rodeo comienza a recomponerse luego del récord de liquidación de 2023. Ciclo en transición hacia menor oferta futura.'
        )
      ),

      // Indicadores
      React.createElement('div', { className:'grid grid-3', style:{ marginBottom:24 } },
        React.createElement('div', { className:'stat', style:{ cursor:'default' } },
          React.createElement(Mono, { style:{ fontSize:9, color:'var(--text3)', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:8 } }, '% Hembras 2025'),
          React.createElement('div', { className:'stat-val', style:{ fontSize:26, color:faseColor } }, hPct+'%'),
          React.createElement('div', { className:'stat-meta' }, faseLabel+' · vacas + vaquillonas')
        ),
        analisis.hembras2026pct != null && React.createElement('div', { className:'stat', style:{ cursor:'default' } },
          React.createElement(Mono, { style:{ fontSize:9, color:'var(--text3)', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:8 } }, '% Hembras 2026 YTD'),
          React.createElement('div', { className:'stat-val', style:{ fontSize:26, color:'var(--accent)' } },
            analisis.hembras2026pct+'%'
          ),
          React.createElement('div', { className:'stat-meta' }, 'promedio ene–mar 2026')
        ),
        React.createElement('div', { className:'stat', style:{ cursor:'default' } },
          React.createElement(Mono, { style:{ fontSize:9, color:'var(--text3)', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:8 } }, 'Tendencia peso res'),
          React.createElement('div', { className:'stat-val', style:{ fontSize:20, color:'var(--green)' } }, '↗ creciente'),
          React.createElement('div', { className:'stat-meta' }, '231 kg en 2025 · récord histórico')
        )
      ),

      // Guía de lectura
      React.createElement('div', { className:'section-title' }, 'Guía: % de hembras en faena como indicador de ciclo'),
      React.createElement('div', { style:{ display:'flex', flexDirection:'column', gap:6 } },
        [
          { rango:'< 44%',   label:'Retención fuerte',        color:'var(--green)',  desc:'Stock en recomposición acelerada. Oferta futura en ascenso, precios firmes por escasez actual.' },
          { rango:'44–46%',  label:'Retención moderada',      color:'#4abf78',       desc:'Señal de retención clara. El productor invierte en vientres para el ciclo siguiente.' },
          { rango:'46–48%',  label:'Zona neutra / ret. leve', color:'var(--accent)', desc:'Mercado en equilibrio o leve retención post-liquidación. Precios estables.' },
          { rango:'48–50%',  label:'Zona de alerta',          color:'#e8a020',       desc:'Inicio de liquidación. Presión bajista de corto plazo sobre precios.' },
          { rango:'> 50%',   label:'Liquidación activa',      color:'var(--red)',    desc:'Salida masiva de vientres. Oferta elevada hoy, escasez futura garantizada. Crisis de stock.' },
        ].map(function(item) {
          var actual = (item.rango === '46–48%' && (faseCiclo==='retencion_leve'||faseCiclo==='retención_leve'))
                    || (item.rango === '< 44%'  && (faseCiclo==='retencion'||faseCiclo==='retención'))
                    || (item.rango === '> 50%'  && (faseCiclo==='liquidacion'||faseCiclo==='liquidación'));
          return React.createElement('div', { key:item.rango,
            style:{ padding: actual ? '12px 16px' : '8px 16px',
              background: actual ? item.color+'12' : 'var(--bg1)',
              border:'1px solid '+(actual ? item.color+'40' : 'var(--line)'), borderRadius:8 }
          },
            React.createElement('div', { style:{ display:'flex', alignItems:'center', gap:10 } },
              React.createElement('div', { style:{ width:7, height:7, borderRadius:'50%', background:item.color, flexShrink:0 } }),
              React.createElement(Mono, { style:{ fontSize:10, fontWeight:700, color:item.color, width:70, flexShrink:0 } }, item.rango),
              React.createElement('span', { style:{ fontSize:12, fontWeight: actual ? 600 : 400, color: actual ? 'var(--white)' : 'var(--text2)', flex:1 } }, item.label),
              actual && React.createElement(Mono, { style:{ fontSize:8, color:item.color, background:item.color+'18', border:'1px solid '+item.color+'40', padding:'2px 7px', borderRadius:4 } }, '← HOY')
            ),
            actual && React.createElement('p', { style:{ fontSize:12, color:'var(--text)', lineHeight:1.6, marginTop:6, marginLeft:17 } }, item.desc)
          );
        })
      ),
      React.createElement('div', { className:'source', style:{ marginTop:16 } },
        'Análisis ciclo ganadero · Fuente: MAGYP / DNCCA / Consorcio ABC / SENASA'
      )
    ),

    // ════════════════════════════════════════════════════════════════════════
    // VISTA: SERIE HISTÓRICA
    // ════════════════════════════════════════════════════════════════════════
    vista === 'historico' && React.createElement('div', null,
      React.createElement('div', { className:'section-title' }, 'Serie histórica · Faena anual 1990–2025'),
      histAn.length >= 2 && React.createElement('div', {
        style:{ background:'var(--bg1)', border:'1px solid var(--line)', borderRadius:10, padding:'18px 22px', marginBottom:14 }
      },
        React.createElement('div', { style:{ marginBottom:6, display:'flex', justifyContent:'space-between', alignItems:'baseline' } },
          React.createElement(Mono, { style:{ fontSize:9, color:'var(--text3)', letterSpacing:'.1em', textTransform:'uppercase' } }, 'Cabezas faenadas · evolución anual'),
          React.createElement(Mono, { style:{ fontSize:9, color:'var(--text3)' } }, '1990 – 2025')
        ),
        React.createElement(LineChart, { series: histAn.map(function(d){ return { cabezas:d.cabezas }; }), color:'#5b9cf6' }),
        React.createElement('div', { style:{ display:'flex', justifyContent:'space-between', marginTop:4 } },
          ['1990','1995','2000','2005','2010','2015','2020','2025'].map(function(y) {
            return React.createElement(Mono, { key:y, style:{ fontSize:9, color:'var(--text3)' } }, y);
          })
        )
      ),

      // Tabla histórica
      React.createElement('div', { className:'tbl-wrap tbl-scroll', style:{ maxHeight:400 } },
        React.createElement('table', { style:{ minWidth:480 } },
          React.createElement('thead', null,
            React.createElement('tr', null,
              React.createElement('th', { style:{ minWidth:60 } }, 'Año'),
              React.createElement('th', { className:'r', style:{ minWidth:100 } }, 'Cabezas'),
              React.createElement('th', { className:'r', style:{ minWidth:80 } }, 'Variación'),
              React.createElement('th', { className:'r', style:{ minWidth:90 } }, 'Peso res'),
              React.createElement('th', { className:'r', style:{ minWidth:100 } }, 'Producción')
            )
          ),
          React.createElement('tbody', null,
            [...histAn].reverse().map(function(d, i, arr) {
              var prev = arr[i+1];
              var varPct = prev && prev.cabezas ? ((d.cabezas - prev.cabezas)/prev.cabezas)*100 : null;
              return React.createElement('tr', { key:d.anio },
                React.createElement('td', null, React.createElement(Mono, { style:{ fontSize:13, fontWeight:700, color:'var(--white)' } }, d.anio)),
                React.createElement('td', { className:'r' },
                  React.createElement(Mono, { style:{ fontSize:13, fontWeight:600, color:'var(--accent)' } },
                    (d.cabezas/1e6).toFixed(2)+' M'
                  )
                ),
                React.createElement('td', { className:'r' },
                  varPct != null
                    ? React.createElement(Mono, { style:{ fontSize:11, fontWeight:600, color:varPct>=0?'var(--green)':'var(--red)' } },
                        (varPct>=0?'▲':'▼')+' '+Math.abs(varPct).toFixed(1)+'%'
                      )
                    : React.createElement(Mono, { style:{ fontSize:11, color:'var(--text3)' } }, '—')
                ),
                React.createElement('td', { className:'r' },
                  d.pesoRes != null
                    ? React.createElement(Mono, { style:{ fontSize:11, color:'var(--text2)' } }, d.pesoRes+' kg')
                    : React.createElement(Mono, { style:{ fontSize:11, color:'var(--text3)' } }, '—')
                ),
                React.createElement('td', { className:'r' },
                  d.produccion != null
                    ? React.createElement(Mono, { style:{ fontSize:11, color:'var(--text2)' } }, d.produccion.toLocaleString('es-AR')+' kt')
                    : React.createElement(Mono, { style:{ fontSize:11, color:'var(--text3)' } }, '—')
                )
              );
            })
          )
        )
      ),
      React.createElement('div', { className:'source', style:{ marginTop:8 } },
        'Fuente: MAGYP · DNCCA · SENASA · ex Junta Nacional de Carnes · 1990–2025'
      )
    )

  );
}
// ─── Tabs config ──────────────────────────────────────────────────────────────
var TABS = [
  { id:'resumen',      label:'Resumen' },
  { id:'tabla',        label:'Tabla completa' },
  { id:'remates',      label:'Remates' },
  { id:'historico',    label:'Histórico' },
  { id:'frigorificos', label:'Frigoríficos & Faena' },
];

// ─── Main ─────────────────────────────────────────────────────────────────────
export function HaciendaPage({ goPage }) {
  var [tab,       setTab]       = useState('resumen');
  var [estado,    setEstado]    = useState('loading');
  var [data,      setData]      = useState(null);
  var [error,     setError]     = useState(null);
  var [lastFetch, setLastFetch] = useState(null);

  // Estado separado para datos de frigoríficos/faena
  var [frigData,    setFrigData]    = useState(null);
  var [loadingFrig, setLoadingFrig] = useState(false);
  var [errorFrig,   setErrorFrig]   = useState(null);

  var cargarFrig = useCallback(async function() {
    setLoadingFrig(true);
    setErrorFrig(null);
    try {
      var res  = await fetch('/api/frigorificos');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Error');
      setFrigData(json);
    } catch (err) {
      setErrorFrig(err.message);
    } finally {
      setLoadingFrig(false);
    }
  }, []);

  // Cargar datos de frigoríficos al primer click en ese tab
  useEffect(function() {
    if (tab === 'frigorificos' && !frigData && !loadingFrig && !errorFrig) {
      cargarFrig();
    }
  }, [tab, frigData, loadingFrig, errorFrig, cargarFrig]);

  var cargar = useCallback(async function() {
    setEstado('loading');
    setError(null);
    try {
      var res  = await fetch('/api/hacienda');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var json = await res.json();
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

  var indices      = (data && data.indices)          || [];
  var categorias   = (data && data.categorias)       || [];
  var fecha        = data && data.fecha;
  var totalCabezas = data && data.totalCabezas;
  var stats        = data && data.stats;
  var historico    = data && data.historico;
  var rematesHoy   = (data && data.rematesHoy)       || [];
  var rematesProx  = (data && data.rematesProximos)  || [];

  return React.createElement('div', { className:'page-enter' },

    /* Header */
    React.createElement('div', { className:'ph' },
      React.createElement('div', null,
        React.createElement('div', { className:'ph-title' },
          'Hacienda ',
          React.createElement('span', { className:'help-pip', onClick:function() { goPage && goPage('ayuda', 'glosario-hacienda'); }, title:'Ayuda' }, '?')
        ),
        React.createElement('div', { className:'ph-sub' }, 'Novillos · Novillitos · Vacas · Vaquillonas · Toros · Remates · consignatarias.com.ar')
      ),
      React.createElement('div', { className:'ph-right' },
        estado === 'ok' && React.createElement(Mono, { style:{ fontSize:10, color:'var(--text3)' } },
          (categorias.length + indices.length) + ' precios · act. ' + (lastFetch && lastFetch.toLocaleTimeString('es-AR', { hour:'2-digit', minute:'2-digit' }))
        ),
        estado === 'loading' && React.createElement(Mono, { style:{ fontSize:10, color:'var(--text3)' } }, 'cargando…'),
        estado === 'error'   && React.createElement(Mono, { style:{ fontSize:10, color:'var(--red)' } }, 'SIN DATOS'),
        React.createElement('button', {
          onClick:cargar, disabled:estado === 'loading', title:'Actualizar',
          style:{ background:'var(--bg2)', border:'1px solid var(--line)', color:'var(--text3)', borderRadius:6, padding:'5px 12px', fontFamily:'var(--mono)', fontSize:11, cursor:'pointer', opacity:estado==='loading'?.5:1 }
        }, '↺ Actualizar')
      )
    ),

    estado === 'loading' && React.createElement(Skeleton),
    estado === 'error'   && React.createElement(ErrorState, { error:error, onRetry:cargar }),

    estado === 'ok' && React.createElement(React.Fragment, null,
      React.createElement(FechaBanner, { fecha:fecha, fuente:'consignatarias.com.ar · INMAG / Cañuelas MAG' }),

      /* Índices */
      indices.length > 0 && React.createElement('div', { style:{ marginBottom:32 } },
        React.createElement('div', { className:'section-title' }, 'Índices INMAG'),
        React.createElement('div', { className:'grid grid-3' },
          indices.map(function(item) {
            return React.createElement(IndiceCard, {
              key:item.id,
              label:item.label || item.nombre,
              valor:item.valor,
              unidad:item.unidad,
              desc:item.descripcion || item.desc || '',
              variacion:item.variacionSemanal,
            });
          })
        )
      ),

      /* Tabs */
      React.createElement('div', { className:'tabs' },
        TABS.map(function(t) {
          return React.createElement('button', {
            key:t.id, className:'tab' + (tab === t.id ? ' active' : ''), onClick:function() { setTab(t.id); }
          },
            t.label,
            t.id === 'remates' && rematesHoy.length > 0 && React.createElement('span', { style:{ marginLeft:6, fontSize:9, background:'var(--accent)', color:'#fff', borderRadius:8, padding:'1px 5px' } }, rematesHoy.length)
          );
        })
      ),

      React.createElement('div', null,
        tab === 'resumen'      && React.createElement(TabResumen,      { categorias:categorias, totalCabezas:totalCabezas, fecha:fecha, stats:stats, historico:historico }),
        tab === 'tabla'        && React.createElement(TabTabla,        { categorias:categorias }),
        tab === 'remates'      && React.createElement(TabRemates,      { rematesHoy:rematesHoy, rematesProximos:rematesProx }),
        tab === 'historico'    && React.createElement(TabHistorico,    { historico:historico, categorias:categorias }),
        tab === 'frigorificos' && React.createElement(TabFrigorificos, { frigData:frigData, loadingFrig:loadingFrig, errorFrig:errorFrig, onRetry:cargarFrig })
      )
    )
  );
}
