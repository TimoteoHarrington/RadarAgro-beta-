// HaciendaPage.jsx — Rediseño con API consignatarias.com.ar
import React, { useState, useEffect, useCallback, useRef } from 'react';

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

const Mono = ({ children, style }) => (
  <span style={{ fontFamily:'var(--mono)', ...style }}>{children}</span>
);
const Skel = ({ w='60%', h=14, mb=0 }) => (
  <div style={{ height:h, background:'var(--bg3)', borderRadius:4, width:w, marginBottom:mb, opacity:.5, animation:'pulse 1.4s ease-in-out infinite' }} />
);

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
      React.createElement('div', { className:'grid grid-3', style:{ marginBottom:32 } },
        totalCabezas != null && React.createElement('div', { className:'stat', style:{ cursor:'default' } },
          React.createElement('div', { style:{ fontSize:12, color:'var(--text3)', marginBottom:8, fontFamily:'var(--mono)', letterSpacing:'.08em', textTransform:'uppercase' } }, 'Cabezas hoy'),
          React.createElement('div', { className:'stat-val', style:{ fontSize:26 } }, fNum(totalCabezas)),
          React.createElement('div', { className:'stat-meta' }, 'ingresadas · ' + fFechaCorta(fecha))
        ),
        stats && stats.rematesHoy != null && React.createElement('div', { className:'stat', style:{ cursor:'default' } },
          React.createElement('div', { style:{ fontSize:12, color:'var(--text3)', marginBottom:8, fontFamily:'var(--mono)', letterSpacing:'.08em', textTransform:'uppercase' } }, 'Remates hoy'),
          React.createElement('div', { className:'stat-val', style:{ fontSize:26 } }, fNum(stats.rematesHoy)),
          React.createElement('div', { className:'stat-meta' }, 'programados')
        )
      ),

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
                React.createElement('span', { style:{ fontSize:14, fontWeight:600, color:'var(--white)', fontFamily:'var(--display)' } }, item.label)
              ),
              React.createElement('span', { style:{ fontSize:11, color:'var(--text2)', paddingLeft:11 } }, item.top.nombreRaw || item.top.nombre)
            ),
            React.createElement(BarraRango, { min:item.top.minimo, max:item.top.maximo, prom:item.top.promedio, color:item.color }),
            React.createElement('div', { style:{ textAlign:'right' } },
              React.createElement(Mono, { style:{ fontSize:18, fontWeight:700, color:item.color } }, fARS(item.top.promedio))
            )
          );
        })
      )
    )
  );
}

function TabTabla({ categorias }) {
  var [filtroGrupo, setFiltroGrupo] = useState('todos');
  if (!categorias || !categorias.length) return null;

  var gruposPresentes = Array.from(new Set(categorias.map(function(c) { return c.grupo; })));
  var filas = filtroGrupo === 'todos' ? categorias : categorias.filter(function(c) { return c.grupo === filtroGrupo; });
  
  return (
    React.createElement('div', null,
      React.createElement('div', { style:{ display:'flex', gap:6, marginBottom:20, flexWrap:'wrap' } },
        ['todos', ...gruposPresentes].map(function(g) {
          var active = filtroGrupo === g;
          return React.createElement('button', {
            key:g, onClick:function() { setFiltroGrupo(g); },
            style:{ padding:'5px 13px', borderRadius:6, border:'1px solid '+(active?'var(--accent)':'var(--line)'), background:active?'var(--acc-bg)':'transparent', color:active?'var(--accent)':'var(--text3)' }
          }, g.toUpperCase());
        })
      ),
      React.createElement('div', { className:'tbl-wrap tbl-scroll' },
        React.createElement('table', null,
          React.createElement('thead', null,
            React.createElement('tr', null,
              React.createElement('th', null, 'Categoría'),
              React.createElement('th', null, 'Rango'),
              React.createElement('th', { className:'r' }, 'Promedio'),
              React.createElement('th', { className:'r' }, 'Cabezas')
            )
          ),
          React.createElement('tbody', null,
            filas.map(function(cat, i) {
              return React.createElement('tr', { key:cat.id || i },
                React.createElement('td', null, cat.nombreRaw || cat.nombre),
                React.createElement('td', null, React.createElement(BarraRango, { min:cat.minimo, max:cat.maximo, prom:cat.promedio, color:GRUPO_COLOR[cat.grupo] })),
                React.createElement('td', { className:'r' }, React.createElement(Mono, { style:{ fontWeight:700 } }, fARS(cat.promedio))),
                React.createElement('td', { className:'r' }, fNum(cat.cabezas))
              );
            })
          )
        )
      )
    )
  );
}

function TabHistorico({ historico, categorias }) {
  return React.createElement('div', null,
    historico && React.createElement('div', null,
      React.createElement('div', { className:'section-title' }, 'Histórico INMAG'),
      React.createElement('div', { className:'tbl-wrap tbl-scroll' },
        React.createElement('table', null,
          React.createElement('thead', null,
            React.createElement('tr', null,
              React.createElement('th', null, 'Fecha'),
              React.createElement('th', { className:'r' }, 'Valor')
            )
          ),
          React.createElement('tbody', null,
            [...historico.series].reverse().map(function(s, i) {
              return React.createElement('tr', { key:i },
                React.createElement('td', null, fFechaCorta(s.fecha)),
                React.createElement('td', { className:'r' }, React.createElement(Mono, { style:{ fontWeight:600, color:'var(--accent)' } }, fARS(s.valor || s.inmag)))
              );
            })
          )
        )
      )
    )
  );
}

function Skeleton() {
  return React.createElement('div', null,
    React.createElement('style', null, '@keyframes pulse{0%,100%{opacity:.4}50%{opacity:.9}}'),
    React.createElement('div', { style:{ padding:'12px 20px', marginBottom:28, background:'var(--bg1)', border:'1px solid var(--line)', borderRadius:10 } },
      React.createElement(Skel, { w:'45%', h:14 })
    )
  );
}

function ErrorState({ error, onRetry }) {
  return React.createElement('div', { style:{ padding:'48px 0', textAlign:'center' } },
    React.createElement('div', { style:{ fontSize:32, marginBottom:14 } }, '⚠'),
    React.createElement(Mono, { style:{ fontSize:11, color:'var(--red)' } }, error),
    React.createElement('br'),
    React.createElement('button', { onClick:onRetry, style:{ marginTop:20, padding:'10px 24px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:8 } }, 'Reintentar')
  );
}

// COMENTADO: Se eliminó la pestaña de remates
var TABS = [
  { id:'resumen',   label:'Resumen' },
  { id:'tabla',     label:'Tabla completa' },
  { id:'historico', label:'Histórico' },
];

export function HaciendaPage({ goPage }) {
  var [tab,       setTab]       = useState('resumen');
  var [estado,    setEstado]    = useState('loading');
  var [data,      setData]      = useState(null);
  var [error,     setError]     = useState(null);

  var cargar = useCallback(async function() {
    setEstado('loading');
    setError(null);
    try {
      var res  = await fetch('/api/hacienda');
      if (!res.ok) throw new Error('Error al conectar con la API');
      var json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Error desconocido');
      setData(json);
      setEstado('ok');
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

  return React.createElement('div', { className:'page-enter' },
    React.createElement('div', { className:'ph' },
      React.createElement('div', null,
        React.createElement('div', { className:'ph-title' }, 'Hacienda'),
        React.createElement('div', { className:'ph-sub' }, 'Mercado Agropecuario Argentino')
      ),
      React.createElement('button', { onClick:cargar, style:{ cursor:'pointer' } }, '↺ Actualizar')
    ),

    estado === 'loading' && React.createElement(Skeleton),
    estado === 'error'   && React.createElement(ErrorState, { error:error, onRetry:cargar }),

    estado === 'ok' && React.createElement(React.Fragment, null,
      React.createElement(FechaBanner, { fecha:fecha }),

      indices.length > 0 && React.createElement('div', { style:{ marginBottom:32 } },
        React.createElement('div', { className:'section-title' }, 'Índices INMAG'),
        React.createElement('div', { className:'grid grid-3' },
          indices.map(function(item) {
            return React.createElement(IndiceCard, { key:item.id, label:item.label, valor:item.valor, unidad:item.unidad, desc:item.desc, variacion:item.variacionSemanal });
          })
        )
      ),

      React.createElement('div', { className:'tabs' },
        TABS.map(function(t) {
          return React.createElement('button', { key:t.id, className:'tab' + (tab === t.id ? ' active' : ''), onClick:function() { setTab(t.id); } }, t.label);
        })
      ),

      React.createElement('div', null,
        tab === 'resumen'   && React.createElement(TabResumen,   { categorias:categorias, totalCabezas:totalCabezas, fecha:fecha, stats:stats, historico:historico }),
        tab === 'tabla'     && React.createElement(TabTabla,     { categorias:categorias }),
        tab === 'historico' && React.createElement(TabHistorico, { historico:historico })
      )
    )
  );
}