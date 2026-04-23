// HaciendaPage.jsx — Restauración completa sin remates
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

function fFechaCorta(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric' }); }
  catch { return iso; }
}

const Mono = ({ children, style }) => (
  <span style={{ fontFamily:'var(--mono)', ...style }}>{children}</span>
);

function BarraRango({ min, max, prom, color }) {
  color = color || 'var(--accent)';
  if (min == null || max == null || prom == null) return null;
  const span = max - min || 1;
  const pct  = ((prom - min) / span) * 100;
  return (
    <div>
      <div style={{ position:'relative', height:6, background:'var(--bg3)', borderRadius:3 }}>
        <div style={{ position:'absolute', left:0, right:0, height:'100%', background:color+'22', borderRadius:3 }} />
        <div style={{ position:'absolute', left:pct.toFixed(1)+'%', transform:'translateX(-50%)', width:4, height:'100%', background:color, borderRadius:2 }} />
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:3 }}>
        <Mono style={{ fontSize:9, color:'var(--text3)' }}>{fARS(min)}</Mono>
        <Mono style={{ fontSize:9, color:'var(--text2)', fontWeight:600 }}>▲ {fARS(prom)}</Mono>
        <Mono style={{ fontSize:9, color:'var(--text3)' }}>{fARS(max)}</Mono>
      </div>
    </div>
  );
}

function TabResumen({ categorias, totalCabezas, fecha, stats, historico }) {
  if (!categorias || !categorias.length) return null;

  var mejoresPorGrupo = ORDEN_GRUPOS.map(function(gid) {
    var cats = categorias.filter(function(c) { return c.grupo === gid; });
    if (!cats.length) return null;
    var top = cats.reduce(function(a, b) { return b.promedio > a.promedio ? b : a; }, cats[0]);
    return { gid:gid, label:GRUPO_LABELS[gid], color:GRUPO_COLOR[gid], top:top };
  }).filter(Boolean);

  return (
    <div className="page-enter">
      <div className="grid grid-3" style={{ marginBottom:32 }}>
        <div className="stat">
          <div style={{ fontSize:12, color:'var(--text3)', marginBottom:8, fontFamily:'var(--mono)' }}>CABEZAS HOY</div>
          <div className="stat-val">{fNum(totalCabezas)}</div>
        </div>
        {stats && stats.totalRemates > 0 && (
          <div className="stat">
            <div style={{ fontSize:12, color:'var(--text3)', marginBottom:8, fontFamily:'var(--mono)' }}>REMATES MES</div>
            <div className="stat-val">{fNum(stats.totalRemates)}</div>
          </div>
        )}
      </div>

      <div className="section-title">Mejor precio por categoría</div>
      <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
        {mejoresPorGrupo.map(item => (
          <div key={item.gid} style={{ display:'grid', gridTemplateColumns:'1fr 200px 120px', alignItems:'center', gap:24, padding:'16px 22px', background:'var(--bg1)', border:'1px solid var(--line)', borderRadius:10 }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                <div style={{ width:3, height:20, background:item.color, borderRadius:2 }}></div>
                <span style={{ fontSize:14, fontWeight:600, color:'var(--white)' }}>{item.label}</span>
              </div>
              <span style={{ fontSize:11, color:'var(--text2)' }}>{item.top.nombre}</span>
            </div>
            <BarraRango min={item.top.minimo} max={item.top.maximo} prom={item.top.promedio} color={item.color} />
            <div style={{ textAlign:'right' }}>
              <Mono style={{ fontSize:18, fontWeight:700, color:item.color }}>{fARS(item.top.promedio)}</Mono>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TabTabla({ categorias }) {
  if (!categorias || !categorias.length) return null;
  return (
    <div className="tbl-wrap tbl-scroll">
      <table>
        <thead>
          <tr>
            <th>Categoría</th>
            <th>Rango (mín–máx)</th>
            <th className="r">Promedio</th>
            <th className="r">Cabezas</th>
          </tr>
        </thead>
        <tbody>
          {categorias.sort((a,b) => b.promedio - a.promedio).map((cat, i) => (
            <tr key={i}>
              <td>{cat.nombre}</td>
              <td><BarraRango min={cat.minimo} max={cat.maximo} prom={cat.promedio} color={GRUPO_COLOR[cat.grupo]} /></td>
              <td className="r"><Mono style={{ fontWeight:700, color:GRUPO_COLOR[cat.grupo] }}>{fARS(cat.promedio)}</Mono></td>
              <td className="r">{fNum(cat.cabezas)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

var TABS = [
  { id:'resumen',   label:'Resumen' },
  { id:'tabla',     label:'Tabla completa' },
  { id:'historico', label:'Histórico' },
];

export function HaciendaPage() {
  const [tab, setTab] = useState('resumen');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hacienda');
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setData(json);
      setLoading(false);
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  if (loading) return <div className="page-enter" style={{padding:40, color:'var(--text3)'}}>Cargando RadarAgro...</div>;
  if (error) return <div className="page-enter" style={{padding:40, color:'var(--red)'}}>Error: {error} <button onClick={cargar}>Reintentar</button></div>;

  return (
    <div className="page-enter">
      <div className="ph">
        <div>
          <div className="ph-title">Hacienda</div>
          <div className="ph-sub">Mercado Agropecuario Argentino · {fFechaCorta(data.fecha)}</div>
        </div>
        <button className="btn" onClick={cargar}>↺ Actualizar</button>
      </div>

      <div className="grid grid-3" style={{ marginBottom:32 }}>
        {data.indices.map(idx => (
          <div key={idx.id} className="stat" style={{ borderTop:'2px solid var(--accent)' }}>
            <div style={{ fontSize:13, color:'var(--text2)' }}>{idx.label}</div>
            <div className="stat-val" style={{ color:'var(--accent)' }}>{fARS(idx.valor)}</div>
            <div className="stat-meta">{idx.desc}</div>
          </div>
        ))}
      </div>

      <div className="tabs">
        {TABS.map(t => (
          <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ marginTop:24 }}>
        {tab === 'resumen' && <TabResumen {...data} />}
        {tab === 'tabla' && <TabTabla categorias={data.categorias} />}
        {tab === 'historico' && (
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>Fecha</th><th className="r">Valor</th></tr></thead>
              <tbody>
                {data.historico?.series?.slice().reverse().map((s,i) => (
                  <tr key={i}><td>{fFechaCorta(s.fecha)}</td><td className="r">{fARS(s.valor || s.inmag)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}