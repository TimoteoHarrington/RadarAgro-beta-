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
  // data: [{label, value}]
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
    // area
    var first = vals[0], last = vals[vals.length-1];
    var x0 = 0, xN = W;
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

function TabFrigorificos({ frigData, loadingFrig, errorFrig, onRetry }) {
  var [vista, setVista] = useState('faena');

  if (loadingFrig) return React.createElement('div', { style:{ padding:'40px 0', textAlign:'center' } },
    React.createElement(Mono, { style:{ fontSize:12, color:'var(--text3)' } }, 'Cargando datos de faena…')
  );
  if (errorFrig || !frigData) return React.createElement('div', { style:{ padding:'32px 0', textAlign:'center' } },
    React.createElement('div', { style:{ fontSize:28, marginBottom:12 } }, '⚠'),
    React.createElement(Mono, { style:{ fontSize:11, color:'var(--red)', display:'block', marginBottom:18 } }, errorFrig || 'Sin datos'),
    React.createElement('button', { onClick:onRetry, style:{ fontFamily:'var(--mono)', fontSize:11, padding:'8px 20px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:8, cursor:'pointer' } }, 'Reintentar')
  );

  var kpis   = frigData.kpis || {};
  var histAn = frigData.historicoAnual || [];
  var mens24 = frigData.mensual2024 || [];
  var cats   = frigData.categorias || [];
  var topFrig = frigData.topFrigorificos || [];
  var dir     = frigData.directorio || {};

  // chart mensual
  var mensualChart = mens24.map(function(m) {
    var partes = m.mes.split('-');
    return { label: MESES_SHORT[parseInt(partes[1],10)-1], value: m.total };
  });

  // chart anual - últimos 15 años
  var anualChart = histAn.slice(-15).map(function(d) {
    return { label: String(d.anio).slice(2), value: d.cabezas };
  });

  var varAnual = kpis.variacionAnual;
  var varColor = varAnual == null ? 'var(--text3)' : varAnual >= 0 ? 'var(--green)' : 'var(--red)';

  return React.createElement('div', null,

    // ── KPIs ──────────────────────────────────────────────────────────────────
    React.createElement('div', { className:'grid grid-3', style:{ marginBottom:28 } },
      React.createElement(FrigKpi, {
        label:'Faena anual 2024',
        value: kpis.faenaAnual2024 != null ? (kpis.faenaAnual2024 / 1e6).toFixed(1) + ' M cab.' : '—',
        sub: varAnual != null ? ((varAnual>=0?'▲ ':'▼ ') + Math.abs(varAnual).toFixed(1) + '% vs 2023') : 'millones de cabezas',
        color: varColor,
      }),
      React.createElement(FrigKpi, {
        label:'Promedio mensual',
        value: kpis.promMensual != null ? Math.round(kpis.promMensual/1000) + ' k cab.' : '—',
        sub: 'cabezas por mes · 2024',
      }),
      React.createElement(FrigKpi, {
        label:'Peso prom. res',
        value: kpis.pesoPromRes != null ? kpis.pesoPromRes + ' kg' : '—',
        sub: 'res bovina · kg limpio',
      }),
      React.createElement(FrigKpi, {
        label:'Frigoríficos activos',
        value: kpis.frigoriificosActivos != null ? kpis.frigoriificosActivos : '364',
        sub: 'habilitados SENASA · todo el país',
      }),
      React.createElement(FrigKpi, {
        label:'Faena de hembras',
        value: cats.filter(function(c){return c.nombre==='vacas'||c.nombre==='vaquillonas';}).reduce(function(s,c){return s+(c.participacion||0);},0).toFixed(0) + '%',
        sub: 'vacas + vaquillonas · 2024',
        color: 'var(--text)',
      }),
      React.createElement(FrigKpi, {
        label:'Macho pesado',
        value: cats.filter(function(c){return c.nombre==='novillos'||c.nombre==='novillitos';}).reduce(function(s,c){return s+(c.participacion||0);},0).toFixed(0) + '%',
        sub: 'novillos + novillitos · 2024',
        color: 'var(--accent)',
      })
    ),

    // ── Vista selector ────────────────────────────────────────────────────────
    React.createElement('div', { style:{ display:'flex', gap:6, marginBottom:20, flexWrap:'wrap' } },
      [
        { id:'faena',    label:'Faena por mes' },
        { id:'historico', label:'Serie histórica' },
        { id:'categorias', label:'Por categoría' },
        { id:'directorio', label:'Directorio' },
      ].map(function(v) {
        var active = vista === v.id;
        return React.createElement('button', {
          key:v.id, onClick:function(){ setVista(v.id); },
          style:{ fontFamily:'var(--mono)', fontSize:10, fontWeight:600, padding:'5px 13px', borderRadius:6, cursor:'pointer',
            border:'1px solid '+(active?'var(--accent)':'var(--line)'),
            background: active?'var(--acc-bg)':'transparent',
            color: active?'var(--accent)':'var(--text3)', transition:'all .15s' }
        }, v.label.toUpperCase());
      })
    ),

    // ── FAENA MENSUAL 2024 ────────────────────────────────────────────────────
    vista === 'faena' && React.createElement('div', null,
      React.createElement('div', { className:'section-title' }, 'Faena mensual 2024 · cabezas totales'),
      React.createElement('div', {
        style:{ background:'var(--bg1)', border:'1px solid var(--line)', borderRadius:10, padding:'20px 24px', marginBottom:16 }
      },
        React.createElement('div', { style:{ marginBottom:8, display:'flex', justifyContent:'space-between', alignItems:'baseline' } },
          React.createElement(Mono, { style:{ fontSize:9, color:'var(--text3)', letterSpacing:'.1em', textTransform:'uppercase' } }, 'Evolución mensual'),
          React.createElement(Mono, { style:{ fontSize:10, color:'var(--accent)' } },
            'Total: ' + (mens24.reduce(function(s,m){return s+m.total;},0)/1e6).toFixed(2) + ' M cab.'
          )
        ),
        React.createElement(LineChart, { series: mens24.map(function(m,i){ return { cabezas:m.total, label:MESES_SHORT[i] }; }), color:'var(--accent)' }),
        React.createElement('div', { style:{ display:'flex', justifyContent:'space-between', marginTop:4 } },
          mensualChart.map(function(m,i){ return React.createElement(Mono, { key:i, style:{ fontSize:7, color:'var(--text3)', textAlign:'center', flex:1 } }, m.label); })
        )
      ),
      React.createElement('div', { className:'tbl-wrap tbl-scroll', style:{ maxHeight:340 } },
        React.createElement('table', null,
          React.createElement('thead', null,
            React.createElement('tr', null,
              React.createElement('th', null, 'Mes'),
              React.createElement('th', { className:'r' }, 'Total'),
              React.createElement('th', { className:'r' }, 'Novillos'),
              React.createElement('th', { className:'r' }, 'Novillitos'),
              React.createElement('th', { className:'r' }, 'Vacas'),
              React.createElement('th', { className:'r' }, 'Vaquillonas'),
              React.createElement('th', { className:'r' }, 'Terneros')
            )
          ),
          React.createElement('tbody', null,
            mens24.map(function(m, i) {
              var prev = i > 0 ? mens24[i-1] : null;
              var varPct = prev && prev.total ? ((m.total - prev.total)/prev.total)*100 : null;
              var partes = m.mes.split('-');
              var mesLabel = MESES_SHORT[parseInt(partes[1],10)-1] + ' ' + partes[0];
              return React.createElement('tr', { key:m.mes },
                React.createElement('td', null, React.createElement(Mono, { style:{ fontSize:12 } }, mesLabel)),
                React.createElement('td', { className:'r' },
                  React.createElement('div', { style:{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:2 } },
                    React.createElement(Mono, { style:{ fontSize:13, fontWeight:700, color:'var(--accent)' } }, Math.round(m.total/1000) + ' k'),
                    varPct != null && React.createElement(Mono, { style:{ fontSize:9, color: varPct>=0?'var(--green)':'var(--red)' } },
                      (varPct>=0?'▲':'▼') + ' ' + Math.abs(varPct).toFixed(1) + '%'
                    )
                  )
                ),
                React.createElement('td', { className:'r' }, React.createElement(Mono, { style:{ fontSize:11, color:CAT_COLOR.novillos } }, Math.round(m.novillos/1000)+'k')),
                React.createElement('td', { className:'r' }, React.createElement(Mono, { style:{ fontSize:11, color:CAT_COLOR.novillitos } }, Math.round(m.novillitos/1000)+'k')),
                React.createElement('td', { className:'r' }, React.createElement(Mono, { style:{ fontSize:11, color:CAT_COLOR.vacas } }, Math.round(m.vacas/1000)+'k')),
                React.createElement('td', { className:'r' }, React.createElement(Mono, { style:{ fontSize:11, color:CAT_COLOR.vaquillonas } }, Math.round(m.vaquillonas/1000)+'k')),
                React.createElement('td', { className:'r' }, React.createElement(Mono, { style:{ fontSize:11, color:CAT_COLOR.terneros } }, Math.round(m.terneros/1000)+'k'))
              );
            })
          )
        )
      ),
      React.createElement('div', { className:'source', style:{ marginTop:8 } }, 'Faena mensual 2024 en cabezas · Fuente: MAGYP/DNCCA · SIF-SIGICA')
    ),

    // ── HISTÓRICO ANUAL ───────────────────────────────────────────────────────
    vista === 'historico' && React.createElement('div', null,
      React.createElement('div', { className:'section-title' }, 'Serie histórica · Faena anual 1990–2024'),
      React.createElement('div', {
        style:{ background:'var(--bg1)', border:'1px solid var(--line)', borderRadius:10, padding:'20px 24px', marginBottom:16 }
      },
        React.createElement('div', { style:{ marginBottom:8, display:'flex', justifyContent:'space-between', alignItems:'baseline' } },
          React.createElement(Mono, { style:{ fontSize:9, color:'var(--text3)', letterSpacing:'.1em', textTransform:'uppercase' } }, 'Cabezas faenadas — evolución anual'),
          React.createElement(Mono, { style:{ fontSize:10, color:'var(--text3)' } }, '1990 – 2024')
        ),
        React.createElement(LineChart, { series: histAn, color:'#5b9cf6' }),
        React.createElement('div', { style:{ display:'flex', justifyContent:'space-between', marginTop:4 } },
          React.createElement(Mono, { style:{ fontSize:9, color:'var(--text3)' } }, '1990'),
          React.createElement(Mono, { style:{ fontSize:9, color:'var(--text3)' } }, '2000'),
          React.createElement(Mono, { style:{ fontSize:9, color:'var(--text3)' } }, '2010'),
          React.createElement(Mono, { style:{ fontSize:9, color:'var(--text3)' } }, '2020'),
          React.createElement(Mono, { style:{ fontSize:9, color:'var(--text3)' } }, '2024')
        )
      ),
      React.createElement('div', { className:'tbl-wrap tbl-scroll', style:{ maxHeight:380 } },
        React.createElement('table', null,
          React.createElement('thead', null,
            React.createElement('tr', null,
              React.createElement('th', null, 'Año'),
              React.createElement('th', { className:'r' }, 'Cabezas faenadas'),
              React.createElement('th', { className:'r' }, 'Variación'),
              React.createElement('th', { className:'r' }, 'Peso res (kg)')
            )
          ),
          React.createElement('tbody', null,
            [...histAn].reverse().map(function(d, i, arr) {
              var prev = arr[i+1];
              var varPct = prev && prev.cabezas ? ((d.cabezas - prev.cabezas)/prev.cabezas)*100 : null;
              var varPos = varPct != null && varPct >= 0;
              return React.createElement('tr', { key:d.anio },
                React.createElement('td', null, React.createElement(Mono, { style:{ fontSize:13, fontWeight:700, color:'var(--white)' } }, d.anio)),
                React.createElement('td', { className:'r' },
                  React.createElement(Mono, { style:{ fontSize:13, fontWeight:600, color:'var(--accent)' } },
                    (d.cabezas/1e6).toFixed(2) + ' M'
                  )
                ),
                React.createElement('td', { className:'r' },
                  varPct != null
                    ? React.createElement(Mono, { style:{ fontSize:11, color:varPos?'var(--green)':'var(--red)', fontWeight:600 } },
                        (varPos?'▲':'▼') + ' ' + Math.abs(varPct).toFixed(1) + '%'
                      )
                    : React.createElement(Mono, { style:{ fontSize:11, color:'var(--text3)' } }, '—')
                ),
                React.createElement('td', { className:'r' },
                  d.pesoRes != null
                    ? React.createElement(Mono, { style:{ fontSize:11, color:'var(--text2)' } }, d.pesoRes + ' kg')
                    : React.createElement(Mono, { style:{ fontSize:11, color:'var(--text3)' } }, '—')
                )
              );
            })
          )
        )
      ),
      React.createElement('div', { className:'source', style:{ marginTop:8 } }, 'Fuente: MAGYP · DNCCA · SENASA · ex Junta Nacional de Carnes · 1990–2024')
    ),

    // ── CATEGORÍAS ────────────────────────────────────────────────────────────
    vista === 'categorias' && React.createElement('div', null,
      React.createElement('div', { className:'section-title' }, 'Participación por categoría · faena 2024'),
      React.createElement('div', { style:{ display:'flex', flexDirection:'column', gap:8, marginBottom:24 } },
        cats.map(function(cat) {
          var color = CAT_COLOR[cat.nombre] || 'var(--accent)';
          var label = CAT_LABELS[cat.nombre] || cat.nombre;
          return React.createElement('div', {
            key:cat.nombre,
            style:{ display:'grid', gridTemplateColumns:'110px 1fr 80px 100px', alignItems:'center', gap:16,
              padding:'14px 20px', background:'var(--bg1)', border:'1px solid var(--line)', borderRadius:10 }
          },
            React.createElement('div', { style:{ display:'flex', alignItems:'center', gap:8 } },
              React.createElement('div', { style:{ width:3, height:18, background:color, borderRadius:2, flexShrink:0 } }),
              React.createElement('span', { style:{ fontSize:13, fontWeight:500, color:'var(--text)' } }, label)
            ),
            React.createElement('div', { style:{ position:'relative', height:18, background:'var(--bg3)', borderRadius:4, overflow:'hidden' } },
              React.createElement('div', {
                style:{ position:'absolute', left:0, top:0, bottom:0, width:cat.participacion.toFixed(1)+'%',
                  background:color+'50', borderRadius:4, transition:'width .4s ease' }
              })
            ),
            React.createElement(Mono, { style:{ fontSize:12, fontWeight:600, color:color, textAlign:'right' } },
              cat.participacion.toFixed(1) + '%'
            ),
            React.createElement(Mono, { style:{ fontSize:11, color:'var(--text3)', textAlign:'right' } },
              (cat.cabezas/1e6).toFixed(2) + ' M cab.'
            )
          );
        })
      ),
      // Mini barras por mes y categoría
      React.createElement('div', { className:'section-title' }, 'Evolución mensual por categoría · 2024'),
      React.createElement('div', { style:{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 } },
        Object.keys(CAT_COLOR).map(function(catKey) {
          var color = CAT_COLOR[catKey];
          var label = CAT_LABELS[catKey] || catKey;
          var dataSerie = mens24.map(function(m, i) {
            return { label: MESES_SHORT[i], value: m[catKey] || 0 };
          });
          var total = dataSerie.reduce(function(s,d){return s+d.value;},0);
          return React.createElement('div', {
            key:catKey,
            style:{ background:'var(--bg1)', border:'1px solid var(--line)', borderRadius:10, padding:'14px 16px' }
          },
            React.createElement('div', { style:{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:8 } },
              React.createElement('span', { style:{ fontSize:12, fontWeight:500, color:'var(--text)', display:'flex', gap:6, alignItems:'center' } },
                React.createElement('div', { style:{ width:3, height:14, background:color, borderRadius:2 } }),
                label
              ),
              React.createElement(Mono, { style:{ fontSize:10, color:'var(--text3)' } }, (total/1e6).toFixed(2)+' M')
            ),
            React.createElement(MiniBarChart, { data:dataSerie, colorKey:color })
          );
        })
      ),
      React.createElement('div', { className:'source', style:{ marginTop:10 } }, 'Cabezas faenadas por categoría · Fuente: MAGYP/DNCCA · 2024')
    ),

    // ── DIRECTORIO ────────────────────────────────────────────────────────────
    vista === 'directorio' && React.createElement('div', null,
      React.createElement('div', { className:'section-title' },
        'Principales frigoríficos · Registro SENASA/MAGYP'
      ),
      React.createElement('div', { style:{ display:'flex', alignItems:'center', gap:12, marginBottom:16,
        padding:'10px 16px', background:'var(--bg1)', border:'1px solid var(--line)', borderRadius:8 } },
        React.createElement(Mono, { style:{ fontSize:9, color:'var(--text3)', letterSpacing:'.1em', textTransform:'uppercase' } }, 'Total habilitados'),
        React.createElement(Mono, { style:{ fontSize:18, fontWeight:700, color:'var(--accent)', marginLeft:'auto' } },
          (dir.total || 364) + ' establecimientos'
        ),
        React.createElement(Mono, { style:{ fontSize:10, color:'var(--text3)' } }, 'SENASA · tráfico federal')
      ),
      React.createElement('div', { style:{ display:'flex', flexDirection:'column', gap:4, marginBottom:20 } },
        (dir.muestra || []).map(function(f, i) {
          return React.createElement('div', {
            key:i,
            style:{ display:'grid', gridTemplateColumns:'1fr auto auto', gap:16, alignItems:'center',
              padding:'12px 18px', background:'var(--bg1)', border:'1px solid var(--line)', borderRadius:10 }
          },
            React.createElement('div', null,
              React.createElement('div', { style:{ display:'flex', alignItems:'center', gap:8, marginBottom:3 } },
                React.createElement('span', { style:{ fontSize:13, fontWeight:600, color:'var(--white)', fontFamily:'var(--display)' } },
                  f.nombre || f.razon_social || '—'
                ),
                f.exportador && React.createElement(Mono, {
                  style:{ fontSize:8, color:'var(--green)', background:'rgba(74,191,120,.1)', border:'1px solid rgba(74,191,120,.25)',
                    padding:'1px 6px', borderRadius:4 }
                }, 'EXPORTADOR')
              ),
              React.createElement('div', { style:{ display:'flex', gap:10, flexWrap:'wrap' } },
                f.provincia && React.createElement(Mono, { style:{ fontSize:10, color:'var(--text2)' } }, '📍 ' + f.provincia),
                f.etapa && React.createElement(Mono, { style:{ fontSize:10, color:'var(--text3)' } }, f.etapa)
              )
            ),
            f.matricula && React.createElement(Mono, {
              style:{ fontSize:10, color:'var(--accent)', background:'var(--acc-bg)', padding:'3px 8px', borderRadius:5, border:'1px solid rgba(91,156,246,.2)', flexShrink:0 }
            }, 'Mat. ' + f.matricula),
            React.createElement('div', { style:{ width:4, height:4, borderRadius:'50%', background:'var(--green)', flexShrink:0 } })
          );
        })
      ),
      React.createElement('div', { className:'source' },
        'Directorio de frigoríficos habilitados · Fuente: Registro SENASA/MAGYP · datos.consignatarias.com.ar'
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
