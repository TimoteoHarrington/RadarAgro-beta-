// HaciendaPage.jsx — Live data: MAG Cañuelas scraping + MAGYP XLS faena
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { DATA } from '../../data/haciendaXLS.js';
import { fetchHaciendaFaena } from '../../services/api.js';

// ── Helpers ──────────────────────────────────────────────────────────────────
const fARS = v => v == null ? '—' : '$ ' + Math.round(v).toLocaleString('es-AR');
const fNum = v => v == null ? '—' : Math.round(v).toLocaleString('es-AR');
const fK   = v => v == null ? '—' : (v >= 1e6 ? (v/1e6).toFixed(2)+' M' : Math.round(v/1000)+'k');
const fPct = v => v == null ? '—' : v.toFixed(1)+'%';
const Mono = ({children, style}) => <span style={{fontFamily:'var(--mono)',...style}}>{children}</span>;
const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const parseFecha = f => { const [y,m] = f.split('-'); return {y:+y, m:+m, label: MESES[+m-1]+' '+y}; };

// ── Datos procesados ──────────────────────────────────────────────────────────
const historico = DATA.historico.filter(d => d.fa != null);
const faena     = DATA.faena.filter(d => d.t != null);
const precios   = DATA.precios;
const cabezas   = DATA.cabezas;

// Últimos datos disponibles
const lastHist   = historico[historico.length-1];
const lastFaena  = faena[faena.length-1];
const lastPrecio = precios[precios.length-1];
const lastCabeza = cabezas[cabezas.length-1];
const prevPrecio = precios[precios.length-2];

// Faena anual agregada
const faenaAnual = (() => {
  const m = {};
  historico.forEach(d => {
    const y = d.f.slice(0,4);
    if (!m[y]) m[y] = {anio:+y, fa:0, meses:0, ph:[], pr:[], pk:[]};
    m[y].fa += d.fa; m[y].meses++;
    if (d.ph != null) m[y].ph.push(d.ph);
    if (d.pr != null) m[y].pr.push(d.pr);
    if (d.pk != null) m[y].pk.push(d.pk);
  });
  return Object.values(m)
    .filter(x => x.meses >= 12 || x.anio <= 2025)
    .map(x => ({
      anio: x.anio,
      fa: x.fa,
      ph: x.ph.length ? +(x.ph.reduce((a,b)=>a+b,0)/x.ph.length).toFixed(1) : null,
      pr: x.pr.length ? +(x.pr.reduce((a,b)=>a+b,0)/x.pr.length).toFixed(1) : null,
      pk: x.pk.length ? +(x.pk.reduce((a,b)=>a+b,0)/x.pk.length).toFixed(1) : null,
    }))
    .sort((a,b) => a.anio-b.anio);
})();

const lastAnual = faenaAnual[faenaAnual.length-1];
const prevAnual = faenaAnual[faenaAnual.length-2];

// Variación % mes a mes precio
const varPrecio = (lastPrecio && prevPrecio && prevPrecio.ig)
  ? ((lastPrecio.ig - prevPrecio.ig) / prevPrecio.ig * 100) : null;

// Ciclo ganadero
const cicloFase = (() => {
  const ph = lastFaena?.ph;
  if (ph == null) return { label:'—', color:'var(--text3)', desc:'Sin datos' };
  if (ph < 44)    return { label:'Retención fuerte', color:'var(--green)', desc:'Rodeo en recomposición acelerada' };
  if (ph < 46)    return { label:'Retención moderada', color:'#4abf78', desc:'Señal de retención activa' };
  if (ph < 48.5)  return { label:'Retención leve', color:'var(--accent)', desc:'Mercado en equilibrio' };
  if (ph < 50)    return { label:'Zona de alerta', color:'#e8a020', desc:'Inicio de presión liquidadora' };
  return { label:'Liquidación', color:'var(--red)', desc:'Salida masiva de vientres' };
})();

// ── Sparkline ─────────────────────────────────────────────────────────────────
function Sparkline({ data, color = 'var(--accent)', height = 48 }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || !data || data.length < 2) return;
    const el = ref.current;
    const W = el.offsetWidth || 300, H = height;
    const vals = data.filter(v => v != null);
    if (vals.length < 2) return;
    const mn = Math.min(...vals), mx = Math.max(...vals), sp = mx - mn || 1;
    const pts = vals.map((v, i) =>
      `${(i/(vals.length-1)*W).toFixed(1)},${(H - ((v-mn)/sp)*(H-8)-4).toFixed(1)}`
    ).join(' ');
    el.setAttribute('viewBox', `0 0 ${W} ${H}`);
    el.innerHTML = `
      <defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.2"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
      </linearGradient></defs>
      <polygon points="0,${H} ${pts} ${W},${H}" fill="url(#sg)"/>
      <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>
    `;
  }, [data, color, height]);
  return <svg ref={ref} style={{ width:'100%', height, display:'block' }} />;
}

// ── BarH ──────────────────────────────────────────────────────────────────────
function BarH({ label, value, max, color, sub }) {
  const pct = max > 0 ? Math.min(100, (value/max)*100) : 0;
  return (
    <div style={{ marginBottom:8 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
        <span style={{ fontSize:12, color:'var(--text)' }}>{label}</span>
        <Mono style={{ fontSize:12, fontWeight:700, color }}>{sub}</Mono>
      </div>
      <div style={{ height:6, background:'var(--bg3)', borderRadius:3, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${pct.toFixed(1)}%`, background:color, opacity:.8, borderRadius:3, transition:'width .5s ease' }}/>
      </div>
    </div>
  );
}

// ── KpiCard ───────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color, accent }) {
  return (
    <div className="stat" style={{ cursor:'default', borderTop:`2px solid ${accent||'var(--accent)'}` }}>
      <Mono style={{ fontSize:9, color:'var(--text3)', letterSpacing:'.08em', textTransform:'uppercase', display:'block', marginBottom:8 }}>{label}</Mono>
      <div className="stat-val" style={{ color: color||'var(--accent)', fontSize:22 }}>{value}</div>
      {sub && <div className="stat-meta" style={{ marginTop:4 }}>{sub}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: RESUMEN
// ─────────────────────────────────────────────────────────────────────────────
function TabResumen() {
  const ph = lastFaena?.ph;
  const varFaenaAnual = (lastAnual && prevAnual)
    ? ((lastAnual.fa - prevAnual.fa) / prevAnual.fa * 100) : null;

  return (
    <div>
      {/* KPIs principales */}
      <div className="grid grid-3" style={{ marginBottom:28 }}>
        <KpiCard
          label={`IGMAG · ${parseFecha(lastPrecio.f).label}`}
          value={fARS(lastPrecio.ig)}
          sub={varPrecio != null ? <span style={{color: varPrecio>=0?'var(--green)':'var(--red)', fontWeight:600}}>
            {varPrecio>=0?'▲ +':'▼ '}{Math.abs(varPrecio).toFixed(1)}% m/m
          </span> : 'ARS/kg vivo · Mercado MAG'}
          accent="var(--accent)"
        />
        <KpiCard
          label={`Novillo · ${parseFecha(lastPrecio.f).label}`}
          value={fARS(lastPrecio.no)}
          sub="ARS/kg vivo · Cañuelas"
          color="var(--accent)" accent="var(--accent)"
        />
        <KpiCard
          label={`Novillito · ${parseFecha(lastPrecio.f).label}`}
          value={fARS(lastPrecio.nt)}
          sub="ARS/kg vivo · Cañuelas"
          color="#6faafc" accent="#6faafc"
        />
        <KpiCard
          label="Faena anual total"
          value={fK(lastAnual?.fa)}
          sub={varFaenaAnual != null ? <span style={{color:varFaenaAnual>=0?'var(--green)':'var(--red)'}}>
            {varFaenaAnual>=0?'▲ +':'▼ '}{Math.abs(varFaenaAnual).toFixed(1)}% vs {prevAnual?.anio}
          </span> : `año ${lastAnual?.anio}`}
          color="var(--text)" accent="var(--line)"
        />
        <KpiCard
          label={`Peso prom. res · ${lastAnual?.anio}`}
          value={`${lastAnual?.pr ?? '—'} kg`}
          sub="kg res con hueso · promedio anual"
          color="var(--green)" accent="var(--green)"
        />
        <KpiCard
          label="% Hembras en faena"
          value={fPct(ph)}
          sub={<span style={{color:cicloFase.color, fontWeight:600}}>{cicloFase.label}</span>}
          color={cicloFase.color} accent={cicloFase.color}
        />
      </div>

      {/* Precios por categoría — último mes MAG */}
      <div className="section-title">Precios por categoría · {parseFecha(lastPrecio.f).label} · ARS/kg vivo</div>
      <div style={{ display:'flex', flexDirection:'column', gap:4, marginBottom:28 }}>
        {[
          { key:'no', label:'Novillos',    color:'#5b9cf6' },
          { key:'nt', label:'Novillitos',  color:'#4080d8' },
          { key:'vq', label:'Vaquillonas', color:'#6faafc' },
          { key:'va', label:'Vacas',       color:'#8fb8f0' },
          { key:'to', label:'Toros',       color:'#3268c5' },
          { key:'me', label:'MEJ',         color:'#94c4ff' },
        ].filter(c => lastPrecio[c.key] != null).map(cat => {
          const val = lastPrecio[cat.key];
          const prev = prevPrecio?.[cat.key];
          const vr = (prev && val) ? ((val-prev)/prev*100) : null;
          const maxVal = Math.max(...precios.slice(-12).map(p => p[cat.key]||0));
          return (
            <div key={cat.key} style={{
              display:'grid', gridTemplateColumns:'130px 1fr 110px 70px',
              alignItems:'center', gap:16, padding:'12px 20px',
              background:'var(--bg1)', border:'1px solid var(--line)', borderRadius:10
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:3, height:18, background:cat.color, borderRadius:2, flexShrink:0 }}/>
                <span style={{ fontSize:13, fontWeight:600, color:'var(--white)', fontFamily:'var(--display)' }}>{cat.label}</span>
              </div>
              <div style={{ height:6, background:'var(--bg3)', borderRadius:3, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${Math.min(100,(val/maxVal)*100).toFixed(0)}%`, background:cat.color, opacity:.7, borderRadius:3 }}/>
              </div>
              <Mono style={{ fontSize:16, fontWeight:700, color:cat.color, textAlign:'right', letterSpacing:'-.01em' }}>{fARS(val)}</Mono>
              {vr != null
                ? <Mono style={{ fontSize:10, fontWeight:700, textAlign:'right', color:vr>=0?'var(--green)':'var(--red)' }}>
                    {vr>=0?'▲ +':'▼ '}{Math.abs(vr).toFixed(1)}%
                  </Mono>
                : <span/>}
            </div>
          );
        })}
      </div>

      {/* Sparkline IGMAG últimos 12 meses */}
      <div style={{ background:'var(--bg1)', border:'1px solid var(--line)', borderRadius:10, padding:'16px 20px', marginBottom:28 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:10 }}>
          <Mono style={{ fontSize:9, color:'var(--text3)', letterSpacing:'.1em', textTransform:'uppercase' }}>IGMAG · últimos 12 meses</Mono>
          <div style={{ display:'flex', gap:20 }}>
            {['mín','máx','últ'].map((l,i) => {
              const vals12 = precios.slice(-12).map(p=>p.ig).filter(Boolean);
              const v = i===0?Math.min(...vals12):i===1?Math.max(...vals12):vals12[vals12.length-1];
              return <Mono key={l} style={{ fontSize:10, color: i===1?'var(--green)':i===2?'var(--accent)':'var(--text3)' }}>{l} {fARS(v)}</Mono>;
            })}
          </div>
        </div>
        <Sparkline data={precios.slice(-12).map(p => p.ig)} color="var(--accent)"/>
        <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
          {precios.slice(-12).map((p,i) => (
            <Mono key={i} style={{ fontSize:7, color:'var(--text3)', flex:1, textAlign:'center' }}>
              {MESES[+p.f.slice(5)-1]}
            </Mono>
          ))}
        </div>
      </div>

      <div className="source">ARS/kg vivo · Fuente: MAGYP · Mercado Agroganadero (MAG) Cañuelas · datos.gob.ar</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: datos live del endpoint /api/hacienda (scraping MAG Cañuelas)
// ─────────────────────────────────────────────────────────────────────────────
function useHaciendaLive() {
  const [data,   setData]   = useState(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ok' | 'fallback' | 'error'

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const res = await fetch('/api/hacienda');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? 'sin datos');
      setData(json);
      setStatus(json.esFallback ? 'fallback' : 'ok');
    } catch (err) {
      console.warn('[HaciendaPage] /api/hacienda:', err.message);
      setData(null);
      setStatus('error');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { data, status, reload: load };
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: datos de faena desde /api/hacienda-faena (XLS MAGYP)
// Solo se carga cuando el usuario abre el tab Faena
// ─────────────────────────────────────────────────────────────────────────────
function useHaciendaFaena(enabled) {
  const [data,   setData]   = useState(null);
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'ok' | 'fallback' | 'error'

  useEffect(() => {
    if (!enabled || status !== 'idle') return;
    setStatus('loading');
    fetchHaciendaFaena()
      .then(({ data: json, error }) => {
        if (error || !json?.ok) throw new Error(error ?? 'sin datos');
        setData(json);
        setStatus(json.esFallback ? 'fallback' : 'ok');
      })
      .catch(err => {
        console.warn('[HaciendaPage] /api/hacienda-faena:', err.message);
        setStatus('error');
      });
  }, [enabled, status]);

  return { data, status };
}
// ─────────────────────────────────────────────────────────────────────────────
const GRUPO_COLORS = {
  novillos:    '#5b9cf6',
  novillitos:  '#4080d8',
  vaquillonas: '#6faafc',
  vacas:       '#8fb8f0',
  toros:       '#3268c5',
  mej:         '#94c4ff',
  terneros:    '#c8d8f8',
};

function TablaRemateLive({ liveData, status }) {
  const [grupoAbierto, setGrupoAbierto] = useState(null);

  if (status === 'loading') {
    return (
      <div style={{ padding:'32px 0', textAlign:'center' }}>
        <Mono style={{ fontSize:10, color:'var(--text3)', letterSpacing:'.1em' }}>CARGANDO DATOS DEL REMATE…</Mono>
      </div>
    );
  }

  if (status === 'error' || !liveData) {
    return (
      <div style={{ padding:'16px', background:'rgba(255,80,80,.04)', border:'1px solid rgba(255,80,80,.15)', borderRadius:10, marginBottom:24 }}>
        <Mono style={{ fontSize:10, color:'var(--red)' }}>No se pudo conectar con el MAG. Revisá la consola o volvé a intentar más tarde.</Mono>
      </div>
    );
  }

  const { fecha, igmag, cabezasHoy, grupos, totalCabezas, fuente, esFallback } = liveData;
  const fechaLabel = fecha ? fecha.split('-').reverse().join('/') : '—';

  return (
    <div style={{ marginBottom: 28 }}>
      {/* Banner estado */}
      <div style={{
        display:'flex', alignItems:'center', gap:10, padding:'10px 16px', marginBottom:20,
        background: esFallback ? 'rgba(232,160,32,.05)' : 'rgba(74,191,120,.05)',
        border:`1px solid ${esFallback ? 'rgba(232,160,32,.2)' : 'rgba(74,191,120,.2)'}`,
        borderRadius:10, flexWrap:'wrap',
      }}>
        <div style={{ width:7, height:7, borderRadius:'50%', flexShrink:0,
          background: esFallback ? '#e8a020' : 'var(--green)',
          boxShadow: `0 0 6px ${esFallback ? '#e8a020' : 'var(--green)'}` }}/>
        <Mono style={{ fontSize:9, fontWeight:700, letterSpacing:'.1em', color: esFallback ? '#e8a020' : 'var(--green)', textTransform:'uppercase' }}>
          {esFallback ? 'Fallback' : 'Live'}
        </Mono>
        <Mono style={{ fontSize:10, color:'var(--text2)' }}>
          Remate {fechaLabel} · IGMAG <strong style={{ color:'var(--accent)' }}>$ {igmag?.toLocaleString('es-AR', {minimumFractionDigits:2, maximumFractionDigits:2})}</strong> / kg vivo
        </Mono>
        <Mono style={{ fontSize:9, color:'var(--text3)', marginLeft:'auto' }}>{fuente}</Mono>
      </div>

      {/* KPIs del remate */}
      <div className="grid grid-3" style={{ marginBottom:20 }}>
        <div className="stat" style={{ cursor:'default', borderTop:'2px solid var(--accent)' }}>
          <Mono style={{ fontSize:9, color:'var(--text3)', letterSpacing:'.08em', textTransform:'uppercase', display:'block', marginBottom:8 }}>IGMAG · {fechaLabel}</Mono>
          <div className="stat-val" style={{ color:'var(--accent)', fontSize:22 }}>
            {igmag != null ? `$ ${Math.round(igmag).toLocaleString('es-AR')}` : '—'}
          </div>
          <div className="stat-meta">ARS / kg vivo · promedio ponderado</div>
        </div>
        <div className="stat" style={{ cursor:'default', borderTop:'2px solid #5b9cf6' }}>
          <Mono style={{ fontSize:9, color:'var(--text3)', letterSpacing:'.08em', textTransform:'uppercase', display:'block', marginBottom:8 }}>Novillito EyB 300/390</Mono>
          <div className="stat-val" style={{ color:'#5b9cf6', fontSize:22 }}>
            {(() => {
              const g = grupos.find(g => g.id === 'novillitos');
              const cat = g?.items?.find(c => /300\/390/i.test(c.nombre));
              return cat ? `$ ${Math.round(cat.promedio).toLocaleString('es-AR')}` : '—';
            })()}
          </div>
          <div className="stat-meta">ARS / kg vivo · categoría líder</div>
        </div>
        <div className="stat" style={{ cursor:'default', borderTop:'2px solid var(--line)' }}>
          <Mono style={{ fontSize:9, color:'var(--text3)', letterSpacing:'.08em', textTransform:'uppercase', display:'block', marginBottom:8 }}>Cabezas ingresadas</Mono>
          <div className="stat-val" style={{ fontSize:22 }}>
            {(cabezasHoy ?? totalCabezas)?.toLocaleString('es-AR') ?? '—'}
          </div>
          <div className="stat-meta">cabezas · remate {fechaLabel}</div>
        </div>
      </div>

      {/* Tabla por grupos — acordeón */}
      <div className="section-title" style={{ marginBottom:12 }}>Precios por categoría · ARS/kg vivo · {fechaLabel}</div>
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {grupos.map(grupo => {
          const color    = GRUPO_COLORS[grupo.id] ?? 'var(--accent)';
          const abierto  = grupoAbierto === grupo.id;
          const maxProm  = Math.max(...grupo.items.map(c => c.promedio ?? 0));

          return (
            <div key={grupo.id} style={{
              border:'1px solid var(--line)', borderRadius:10, overflow:'hidden',
              background:'var(--bg1)',
            }}>
              {/* Cabecera del grupo — clickeable */}
              <button
                onClick={() => setGrupoAbierto(abierto ? null : grupo.id)}
                style={{
                  width:'100%', display:'grid', gridTemplateColumns:'3px 1fr auto auto',
                  alignItems:'center', gap:16, padding:'12px 16px',
                  background:'transparent', border:'none', cursor:'pointer', textAlign:'left',
                }}
              >
                <div style={{ height:'100%', background:color, borderRadius:2 }}/>
                <div style={{ display:'flex', alignItems:'baseline', gap:10 }}>
                  <span style={{ fontSize:13, fontWeight:700, color:'var(--white)', fontFamily:'var(--display)' }}>
                    {grupo.label}
                  </span>
                  <Mono style={{ fontSize:9, color:'var(--text3)' }}>
                    {grupo.items.reduce((s,c)=>s+(c.cabezas??0),0).toLocaleString('es-AR')} cab.
                  </Mono>
                </div>
                {grupo.promedioPonderado != null && (
                  <Mono style={{ fontSize:13, fontWeight:700, color }}>
                    $ {grupo.promedioPonderado.toLocaleString('es-AR')}
                  </Mono>
                )}
                <Mono style={{ fontSize:10, color:'var(--text3)', userSelect:'none' }}>
                  {abierto ? '▲' : '▼'}
                </Mono>
              </button>

              {/* Detalle de categorías */}
              {abierto && (
                <div style={{ borderTop:'1px solid var(--line)' }}>
                  {grupo.items.map((cat, i) => {
                    const pct = maxProm > 0 ? (cat.promedio / maxProm) * 100 : 0;
                    return (
                      <div key={i} style={{
                        display:'grid',
                        gridTemplateColumns:'1fr 90px 90px 80px 70px 60px',
                        alignItems:'center', gap:8,
                        padding:'10px 16px 10px 22px',
                        borderBottom: i < grupo.items.length-1 ? '1px solid var(--line)' : 'none',
                        fontSize:11,
                      }}>
                        {/* Nombre + barra */}
                        <div>
                          <div style={{ color:'var(--text)', marginBottom:4 }}>{cat.nombre}</div>
                          <div style={{ height:3, background:'var(--bg3)', borderRadius:2, overflow:'hidden' }}>
                            <div style={{ height:'100%', width:`${pct.toFixed(1)}%`, background:color, opacity:.6, borderRadius:2 }}/>
                          </div>
                        </div>
                        <Mono style={{ color:'var(--text3)', textAlign:'right', fontSize:10 }}>
                          {cat.minimo != null ? `$ ${Math.round(cat.minimo).toLocaleString('es-AR')}` : '—'}
                        </Mono>
                        <Mono style={{ color:'var(--text3)', textAlign:'right', fontSize:10 }}>
                          {cat.maximo != null ? `$ ${Math.round(cat.maximo).toLocaleString('es-AR')}` : '—'}
                        </Mono>
                        <Mono style={{ color, fontWeight:700, textAlign:'right' }}>
                          {cat.promedio != null ? `$ ${Math.round(cat.promedio).toLocaleString('es-AR')}` : '—'}
                        </Mono>
                        <Mono style={{ color:'var(--text3)', textAlign:'right', fontSize:10 }}>
                          {cat.cabezas?.toLocaleString('es-AR') ?? '—'}
                        </Mono>
                        <Mono style={{ color:'var(--text3)', textAlign:'right', fontSize:10 }}>
                          {cat.kgProm != null ? `${Math.round(cat.kgProm)} kg` : '—'}
                        </Mono>
                      </div>
                    );
                  })}
                  {/* Encabezado de columnas — va al final para no confundir */}
                  <div style={{
                    display:'grid', gridTemplateColumns:'1fr 90px 90px 80px 70px 60px',
                    gap:8, padding:'6px 16px 6px 22px',
                    background:'var(--bg2)', borderTop:'1px solid var(--line)',
                  }}>
                    {['Categoría','Mínimo','Máximo','Promedio','Cabezas','Kg prom'].map((h,i) => (
                      <Mono key={i} style={{ fontSize:8, color:'var(--text3)', letterSpacing:'.06em', textTransform:'uppercase', textAlign: i===0?'left':'right' }}>{h}</Mono>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="source" style={{ marginTop:10 }}>Fuente: Mercado Agroganadero S.A. · mercadoagroganadero.com.ar</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: PRECIOS — Live (remate) + Histórico (XLS)
// ─────────────────────────────────────────────────────────────────────────────
function TabPrecios() {
  const { data: liveData, status, reload } = useHaciendaLive();
  const [vista, setVista] = useState('remate'); // 'remate' | 'historico'
  const [cat, setCat] = useState('ig');
  const CATS = [
    { key:'ig', label:'IGMAG',      color:'var(--accent)' },
    { key:'no', label:'Novillos',   color:'#5b9cf6' },
    { key:'nt', label:'Novillitos', color:'#4080d8' },
    { key:'vq', label:'Vaquillonas',color:'#6faafc' },
    { key:'va', label:'Vacas',      color:'#8fb8f0' },
    { key:'to', label:'Toros',      color:'#3268c5' },
  ];
  const sel = CATS.find(c=>c.key===cat);
  // datos históricos para la vista de series
  const data = precios.filter(p => p[cat] != null);
  const vals = data.map(p => p[cat]);
  const maxV = Math.max(...vals), minV = Math.min(...vals);

  return (
    <div>
      {/* Selector de vista — Remate live vs Histórico mensual */}
      <div style={{ display:'flex', gap:6, marginBottom:20, alignItems:'center', flexWrap:'wrap' }}>
        {[
          { id:'remate',    label:'Último remate · Live' },
          { id:'historico', label:'Histórico mensual' },
        ].map(v => (
          <button key={v.id} onClick={() => setVista(v.id)} style={{
            fontFamily:'var(--mono)', fontSize:10, fontWeight:600,
            padding:'6px 14px', borderRadius:6, cursor:'pointer',
            border:`1px solid ${vista===v.id ? 'var(--accent)' : 'var(--line)'}`,
            background: vista===v.id ? 'rgba(var(--accent-rgb),.12)' : 'transparent',
            color: vista===v.id ? 'var(--accent)' : 'var(--text3)',
            transition:'all .15s',
          }}>{v.label}</button>
        ))}
        {vista === 'remate' && status !== 'loading' && (
          <button onClick={reload} style={{
            fontFamily:'var(--mono)', fontSize:9, padding:'4px 10px', borderRadius:5,
            border:'1px solid var(--line)', background:'transparent',
            color:'var(--text3)', cursor:'pointer', marginLeft:'auto',
          }}>↻ Actualizar</button>
        )}
      </div>

      {/* ── Vista: Último remate ── */}
      {vista === 'remate' && (
        <TablaRemateLive liveData={liveData} status={status} />
      )}

      {/* ── Vista: Histórico mensual ── */}
      {vista === 'historico' && (
        <div>
          {/* Selector de categoría */}
          <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
            <Mono style={{ fontSize:9, color:'var(--text3)', letterSpacing:'.08em', marginRight:4 }}>SERIE</Mono>
            {CATS.map(c => {
              const active = cat === c.key;
              return (
                <button key={c.key} onClick={() => setCat(c.key)} style={{
                  fontFamily:'var(--mono)', fontSize:10, fontWeight:600,
                  padding:'5px 12px', borderRadius:6, cursor:'pointer',
                  border:`1px solid ${active ? c.color : 'var(--line)'}`,
                  background: active ? c.color+'18' : 'transparent',
                  color: active ? c.color : 'var(--text3)',
                  transition:'all .15s',
                }}>{c.label}</button>
              );
            })}
          </div>

          {/* Stats */}
          <div className="grid grid-3" style={{ marginBottom:16 }}>
            {[
              { l:'Mínimo histórico', v:fARS(minV), c:'var(--red)' },
              { l:'Máximo histórico', v:fARS(maxV), c:'var(--green)' },
              { l:'Último mes',       v:fARS(vals[vals.length-1]), c:sel.color },
            ].map((s, i) => (
              <div key={i} className="stat" style={{ cursor:'default', padding:'12px 16px' }}>
                <Mono style={{ fontSize:9, color:'var(--text3)', display:'block', marginBottom:6, letterSpacing:'.08em', textTransform:'uppercase' }}>{s.l}</Mono>
                <div style={{ fontSize:20, fontWeight:700, color:s.c, fontFamily:'var(--mono)' }}>{s.v}</div>
              </div>
            ))}
          </div>

          {/* Sparkline */}
          <div style={{ background:'var(--bg1)', border:'1px solid var(--line)', borderRadius:10, padding:'16px 20px', marginBottom:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:8 }}>
              <Mono style={{ fontSize:9, color:'var(--text3)', letterSpacing:'.1em', textTransform:'uppercase' }}>
                {sel.label} · 2016–2026 · ARS/kg vivo
              </Mono>
              <Mono style={{ fontSize:9, color:'var(--text3)' }}>
                {data[0]?.f} – {data[data.length-1]?.f}
              </Mono>
            </div>
            <Sparkline data={vals} color={sel.color} height={72}/>
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
              {['2016','2018','2020','2022','2024','2026'].map(y => (
                <Mono key={y} style={{ fontSize:9, color:'var(--text3)' }}>{y}</Mono>
              ))}
            </div>
          </div>

          {/* Tabla últimos 24 meses */}
          <div className="section-title">Histórico mensual · últimos 24 meses</div>
          <div className="tbl-wrap tbl-scroll" style={{ maxHeight:360 }}>
            <table>
              <thead>
                <tr>
                  <th>Mes</th>
                  <th className="r">IGMAG</th>
                  <th className="r">Novillos</th>
                  <th className="r">Novillitos</th>
                  <th className="r">Vacas</th>
                  <th className="r">Vaquillonas</th>
                  <th className="r">Var. m/m</th>
                </tr>
              </thead>
              <tbody>
                {[...precios.slice(-24)].reverse().map((p, i, arr) => {
                  const prev = arr[i+1];
                  const vr = (prev && prev.ig) ? ((p.ig - prev.ig) / prev.ig * 100) : null;
                  const { label } = parseFecha(p.f);
                  return (
                    <tr key={p.f}>
                      <td><Mono style={{ fontSize:12 }}>{label}</Mono></td>
                      <td className="r"><Mono style={{ fontSize:12, fontWeight:700, color:'var(--accent)' }}>{fARS(p.ig)}</Mono></td>
                      <td className="r"><Mono style={{ fontSize:11, color:'#5b9cf6' }}>{fARS(p.no)}</Mono></td>
                      <td className="r"><Mono style={{ fontSize:11, color:'#4080d8' }}>{fARS(p.nt)}</Mono></td>
                      <td className="r"><Mono style={{ fontSize:11, color:'#8fb8f0' }}>{fARS(p.va)}</Mono></td>
                      <td className="r"><Mono style={{ fontSize:11, color:'#6faafc' }}>{fARS(p.vq)}</Mono></td>
                      <td className="r">
                        {vr != null
                          ? <Mono style={{ fontSize:10, fontWeight:700, color:vr>=0?'var(--green)':'var(--red)' }}>
                              {vr>=0?'▲ +':'▼ '}{Math.abs(vr).toFixed(1)}%
                            </Mono>
                          : <Mono style={{ color:'var(--text3)', fontSize:10 }}>—</Mono>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="source" style={{ marginTop:8 }}>
            Fuente: Mercado Agroganadero SA · Comercialización MAG 2016–2026
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: FAENA & PRODUCCIÓN
// ─────────────────────────────────────────────────────────────────────────────
function TabFaena({ faenaLive, faenaStatus }) {
  const [vista, setVista] = useState('mensual');

  // Usar datos live si están disponibles, sino el XLS estático como fallback visual
  const faenaData   = faenaLive?.faena ?? faena;
  const esFallback  = !faenaLive || faenaStatus === 'error' || faenaStatus === 'idle' || faenaStatus === 'loading';
  const ultimoLive  = faenaLive?.ultimo ?? null;

  const faena12 = faenaData.slice(-12);
  const totalFaena12 = faenaLive?.kpis?.faena12meses ?? faena12.reduce((s,d) => s+(d.t||0), 0);
  const pesoPromFaena12 = (() => {
    const r = faena12.filter(d => d.pr);
    return r.length ? (r.reduce((s,d)=>s+d.pr,0)/r.length).toFixed(1) : null;
  })();
  const phPromFaena12 = (() => {
    const r = faena12.filter(d => d.ph);
    return r.length ? (r.reduce((s,d)=>s+d.ph,0)/r.length).toFixed(1) : null;
  })();
  const cicloFaseActual = faenaLive?.kpis?.cicloGanadero ?? cicloFase;

  return (
    <div>
      {/* Banner estado fuente */}
      {faenaStatus === 'loading' && (
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px', marginBottom:16,
          background:'rgba(90,150,246,.05)', border:'1px solid rgba(90,150,246,.15)', borderRadius:8 }}>
          <Mono style={{ fontSize:9, color:'var(--accent)' }}>CARGANDO DATOS DE FAENA DEL MAGYP…</Mono>
        </div>
      )}
      {faenaStatus === 'ok' && (
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px', marginBottom:16,
          background:'rgba(74,191,120,.05)', border:'1px solid rgba(74,191,120,.15)', borderRadius:8 }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--green)', boxShadow:'0 0 5px var(--green)' }}/>
          <Mono style={{ fontSize:9, color:'var(--green)', fontWeight:700, letterSpacing:'.08em' }}>LIVE</Mono>
          <Mono style={{ fontSize:9, color:'var(--text2)' }}>{faenaLive.fuente}</Mono>
        </div>
      )}
      {faenaStatus === 'fallback' && (
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px', marginBottom:16,
          background:'rgba(232,160,32,.05)', border:'1px solid rgba(232,160,32,.2)', borderRadius:8 }}>
          <Mono style={{ fontSize:9, color:'#e8a020' }}>⚠ FALLBACK · {faenaLive?.fuente}</Mono>
        </div>
      )}

      {/* Tabs internas */}
      <div style={{ display:'flex', gap:6, marginBottom:20, flexWrap:'wrap' }}>
        {[{id:'mensual',label:'Mensual 2019–2026'},{id:'anual',label:'Serie anual 1990–2025'},{id:'ciclo',label:'Ciclo ganadero'}].map(v => {
          const active = vista===v.id;
          return <button key={v.id} onClick={()=>setVista(v.id)} style={{
            fontFamily:'var(--mono)', fontSize:10, fontWeight:600, padding:'5px 14px', borderRadius:6, cursor:'pointer',
            border:`1px solid ${active?'var(--accent)':'var(--line)'}`,
            background: active?'var(--acc-bg)':'transparent',
            color: active?'var(--accent)':'var(--text3)', transition:'all .15s'
          }}>{v.label.toUpperCase()}</button>;
        })}
      </div>

      {/* ── VISTA: MENSUAL ── */}
      {vista === 'mensual' && (
        <div>
          <div className="grid grid-3" style={{ marginBottom:20 }}>
            <KpiCard label="Últimos 12 meses" value={fK(totalFaena12)} sub="cabezas faenadas" accent="var(--accent)" color="var(--accent)"/>
            <KpiCard label="Peso prom. res" value={pesoPromFaena12?pesoPromFaena12+' kg':'—'} sub="promedio últimos 12m" color="var(--green)" accent="var(--green)"/>
            <KpiCard label="% Hembras prom." value={phPromFaena12?phPromFaena12+'%':'—'} sub={cicloFaseActual.label} color={cicloFaseActual.color} accent={cicloFaseActual.color}/>
          </div>

          {/* Chart faena */}
          <div style={{ background:'var(--bg1)', border:'1px solid var(--line)', borderRadius:10, padding:'16px 20px', marginBottom:16 }}>
            <Mono style={{ fontSize:9, color:'var(--text3)', letterSpacing:'.1em', textTransform:'uppercase', display:'block', marginBottom:10 }}>Faena total · cabezas mensuales</Mono>
            <Sparkline data={faenaData.map(d=>d.t)} color="var(--accent)" height={60}/>
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
              {['2019','2020','2021','2022','2023','2024','2025','2026'].map(y => (
                <Mono key={y} style={{ fontSize:9, color:'var(--text3)' }}>{y}</Mono>
              ))}
            </div>
          </div>

          {/* Tabla */}
          <div className="tbl-wrap tbl-scroll" style={{ maxHeight:380 }}>
            <table>
              <thead>
                <tr>
                  <th>Mes</th>
                  <th className="r">Total</th>
                  <th className="r">Var.</th>
                  <th className="r">Novillitos</th>
                  <th className="r">Vacas</th>
                  <th className="r">Vaquillonas</th>
                  <th className="r">Novillos</th>
                  <th className="r">Peso res</th>
                  <th className="r">% Hembras</th>
                </tr>
              </thead>
              <tbody>
                {[...faenaData].reverse().map((d, i, arr) => {
                  const prev = arr[i+1];
                  const vr = (prev && prev.t) ? ((d.t - prev.t)/prev.t*100) : null;
                  return (
                    <tr key={d.f}>
                      <td><Mono style={{ fontSize:12 }}>{parseFecha(d.f).label}</Mono></td>
                      <td className="r"><Mono style={{ fontSize:13, fontWeight:700, color:'var(--accent)' }}>{fK(d.t)}</Mono></td>
                      <td className="r">
                        {vr != null
                          ? <Mono style={{ fontSize:10, fontWeight:700, color:vr>=0?'var(--green)':'var(--red)' }}>{vr>=0?'▲ +':'▼ '}{Math.abs(vr).toFixed(1)}%</Mono>
                          : <Mono style={{ color:'var(--text3)', fontSize:10 }}>—</Mono>}
                      </td>
                      <td className="r"><Mono style={{ fontSize:11, color:'#4080d8' }}>{fK(d.nt)}</Mono></td>
                      <td className="r"><Mono style={{ fontSize:11, color:'#8fb8f0' }}>{fK(d.va)}</Mono></td>
                      <td className="r"><Mono style={{ fontSize:11, color:'#6faafc' }}>{fK(d.vq)}</Mono></td>
                      <td className="r"><Mono style={{ fontSize:11, color:'#5b9cf6' }}>{fK(d.no)}</Mono></td>
                      <td className="r"><Mono style={{ fontSize:11, color:'var(--green)' }}>{d.pr != null ? d.pr+' kg' : '—'}</Mono></td>
                      <td className="r">
                        <Mono style={{ fontSize:11, color: d.ph>48.5?'var(--red)':d.ph<46?'var(--green)':'var(--text2)' }}>
                          {d.ph != null ? d.ph+'%' : '—'}
                        </Mono>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="source" style={{ marginTop:8 }}>Fuente: MAGYP/DNCCA · Faena Bovina 2019–2026</div>
        </div>
      )}

      {/* ── VISTA: ANUAL ── */}
      {vista === 'anual' && (
        <div>
          <div style={{ background:'var(--bg1)', border:'1px solid var(--line)', borderRadius:10, padding:'16px 20px', marginBottom:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:10 }}>
              <Mono style={{ fontSize:9, color:'var(--text3)', letterSpacing:'.1em', textTransform:'uppercase' }}>Faena anual · cabezas totales · 1990–2025</Mono>
              <Mono style={{ fontSize:9, color:'var(--text3)' }}>récord: {fK(Math.max(...faenaAnual.map(x=>x.fa)))}</Mono>
            </div>
            <Sparkline data={faenaAnual.map(x=>x.fa)} color="var(--accent)" height={80}/>
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
              {['1990','1995','2000','2005','2010','2015','2020','2025'].map(y => (
                <Mono key={y} style={{ fontSize:9, color:'var(--text3)' }}>{y}</Mono>
              ))}
            </div>
          </div>

          <div className="tbl-wrap tbl-scroll" style={{ maxHeight:400 }}>
            <table>
              <thead>
                <tr>
                  <th>Año</th>
                  <th className="r">Cabezas</th>
                  <th className="r">Var. a/a</th>
                  <th className="r">Peso res</th>
                  <th className="r">% Hembras</th>
                  <th className="r">Producción</th>
                </tr>
              </thead>
              <tbody>
                {[...faenaAnual].reverse().map((d, i, arr) => {
                  const prev = arr[i+1];
                  const vr = (prev && prev.fa) ? ((d.fa - prev.fa)/prev.fa*100) : null;
                  return (
                    <tr key={d.anio}>
                      <td><Mono style={{ fontSize:13, fontWeight:700, color:'var(--white)' }}>{d.anio}</Mono></td>
                      <td className="r"><Mono style={{ fontSize:13, fontWeight:600, color:'var(--accent)' }}>{(d.fa/1e6).toFixed(2)} M</Mono></td>
                      <td className="r">
                        {vr != null
                          ? <Mono style={{ fontSize:11, fontWeight:600, color:vr>=0?'var(--green)':'var(--red)' }}>{vr>=0?'▲':'▼'} {Math.abs(vr).toFixed(1)}%</Mono>
                          : <Mono style={{ color:'var(--text3)', fontSize:11 }}>—</Mono>}
                      </td>
                      <td className="r"><Mono style={{ fontSize:11, color:'var(--green)' }}>{d.pr != null ? d.pr+' kg' : '—'}</Mono></td>
                      <td className="r">
                        <Mono style={{ fontSize:11, color: d.ph>48.5?'var(--red)':d.ph<46?'var(--green)':'var(--text2)' }}>
                          {d.ph != null ? d.ph+'%' : '—'}
                        </Mono>
                      </td>
                      <td className="r"><Mono style={{ fontSize:11, color:'var(--text2)' }}>{d.pk != null ? d.pk.toFixed(0)+' kt' : '—'}</Mono></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="source" style={{ marginTop:8 }}>Fuente: MAGYP/DNCCA · ex Junta Nacional de Carnes · 1990–2025</div>
        </div>
      )}

      {/* ── VISTA: CICLO GANADERO ── */}
      {vista === 'ciclo' && (
        <div>
          <div style={{
            padding:'18px 22px', marginBottom:20, borderRadius:12,
            background: cicloFase.color==='var(--green)'?'rgba(74,191,120,.06)':cicloFase.color==='var(--red)'?'rgba(224,92,92,.06)':'rgba(91,156,246,.06)',
            border:`1px solid ${cicloFase.color==='var(--green)'?'rgba(74,191,120,.2)':cicloFase.color==='var(--red)'?'rgba(224,92,92,.2)':'rgba(91,156,246,.2)'}`
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
              <div style={{ width:10, height:10, borderRadius:'50%', background:cicloFase.color, boxShadow:`0 0 8px ${cicloFase.color}` }}/>
              <span style={{ fontFamily:'var(--display)', fontSize:15, fontWeight:700, color:'var(--white)' }}>
                Ciclo ganadero · <span style={{ color:cicloFase.color }}>{cicloFase.label.toUpperCase()}</span>
              </span>
            </div>
            <p style={{ fontSize:13, color:'var(--text)', lineHeight:1.7 }}>
              {cicloFase.desc}. Porcentaje de hembras en faena: <strong style={{color:cicloFase.color}}>{fPct(lastFaena?.ph)}</strong> en {lastFaena?.f && parseFecha(lastFaena.f).label}.
            </p>
          </div>

          {/* Evolución % hembras */}
          <div className="section-title">Evolución % hembras en faena · indicador de ciclo</div>
          <div style={{ background:'var(--bg1)', border:'1px solid var(--line)', borderRadius:10, padding:'16px 20px', marginBottom:16 }}>
            <div style={{ marginBottom:8, display:'flex', gap:20 }}>
              <Mono style={{ fontSize:9, color:'var(--red)' }}>{'> 50% → Liquidación'}</Mono>
              <Mono style={{ fontSize:9, color:'var(--accent)' }}>{'46–50% → Zona neutra'}</Mono>
              <Mono style={{ fontSize:9, color:'var(--green)' }}>{'< 46% → Retención'}</Mono>
            </div>
            <Sparkline data={faena.map(d=>d.ph)} color="var(--accent)" height={60}/>
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
              {['2019','2020','2021','2022','2023','2024','2025'].map(y => (
                <Mono key={y} style={{ fontSize:9, color:'var(--text3)' }}>{y}</Mono>
              ))}
            </div>
          </div>

          {/* Tabla de referencia */}
          <div className="section-title">Guía de interpretación</div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {[
              { rango:'< 44%',  label:'Retención fuerte',    color:'var(--green)', desc:'Rodeo en recomposición acelerada. Oferta futura en ascenso, precios firmes por escasez actual.' },
              { rango:'44–46%', label:'Retención moderada',  color:'#4abf78',      desc:'Señal de retención clara. El productor invierte en vientres para el ciclo siguiente.' },
              { rango:'46–48%', label:'Zona neutra',         color:'var(--accent)',desc:'Mercado en equilibrio o leve retención. Precios estables.' },
              { rango:'48–50%', label:'Zona de alerta',      color:'#e8a020',      desc:'Inicio de liquidación. Presión bajista de corto plazo sobre precios.' },
              { rango:'> 50%',  label:'Liquidación activa',  color:'var(--red)',   desc:'Salida masiva de vientres. Oferta elevada hoy, escasez futura garantizada.' },
            ].map(item => {
              const ph = lastFaena?.ph;
              const actual = ph != null && (
                (item.rango === '< 44%' && ph < 44) ||
                (item.rango === '44–46%' && ph >= 44 && ph < 46) ||
                (item.rango === '46–48%' && ph >= 46 && ph < 48) ||
                (item.rango === '48–50%' && ph >= 48 && ph < 50) ||
                (item.rango === '> 50%' && ph >= 50)
              );
              return (
                <div key={item.rango} style={{
                  padding: actual ? '12px 16px' : '8px 16px',
                  background: actual ? item.color+'12' : 'var(--bg1)',
                  border:`1px solid ${actual?item.color+'40':'var(--line)'}`, borderRadius:8
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:7, height:7, borderRadius:'50%', background:item.color, flexShrink:0 }}/>
                    <Mono style={{ fontSize:10, fontWeight:700, color:item.color, width:70, flexShrink:0 }}>{item.rango}</Mono>
                    <span style={{ fontSize:12, fontWeight:actual?600:400, color:actual?'var(--white)':'var(--text2)', flex:1 }}>{item.label}</span>
                    {actual && <Mono style={{ fontSize:8, color:item.color, background:item.color+'18', border:`1px solid ${item.color}40`, padding:'2px 7px', borderRadius:4 }}>← HOY</Mono>}
                  </div>
                  {actual && <p style={{ fontSize:12, color:'var(--text)', lineHeight:1.6, marginTop:6, marginLeft:17 }}>{item.desc}</p>}
                </div>
              );
            })}
          </div>
          <div className="source" style={{ marginTop:16 }}>Análisis ciclo ganadero · Fuente: MAGYP/DNCCA 2019–2026</div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: CONSUMO & EXPORTACIÓN
// ─────────────────────────────────────────────────────────────────────────────
function TabConsumo() {
  const histConsumo = historico.filter(d => d.cp != null && d.ca != null);
  const last = histConsumo[histConsumo.length-1];
  const prev = histConsumo[histConsumo.length-2];
  const prevYear = histConsumo.filter(d => d.f.slice(0,4) === String(+last.f.slice(0,4)-1) && d.f.slice(5) === last.f.slice(5))[0];

  const anualConsumo = (() => {
    const m = {};
    histConsumo.forEach(d => {
      const y = d.f.slice(0,4);
      if (!m[y]) m[y] = {y, ca:[], cp:[], ve:[], vv:[], pe:[]};
      if (d.ca) m[y].ca.push(d.ca);
      if (d.cp) m[y].cp.push(d.cp);
      if (d.ve) m[y].ve.push(d.ve);
      if (d.vv) m[y].vv.push(d.vv);
      if (d.pe) m[y].pe.push(d.pe);
    });
    return Object.values(m).filter(x=>x.ca.length>=10).map(x => ({
      y: x.y,
      ca: +(x.ca.reduce((a,b)=>a+b,0)/x.ca.length).toFixed(1),
      cp: +(x.cp.reduce((a,b)=>a+b,0)/x.cp.length).toFixed(1),
      ve: +(x.ve.reduce((a,b)=>a+b,0)).toFixed(0),
      vv: +(x.vv.reduce((a,b)=>a+b,0)/1000).toFixed(0), // en millones USD
      pe: +(x.pe.reduce((a,b)=>a+b,0)/x.pe.length).toFixed(0),
    })).sort((a,b)=>a.y-b.y);
  })();

  const lastA = anualConsumo[anualConsumo.length-1];

  return (
    <div>
      <div className="grid grid-3" style={{ marginBottom:24 }}>
        <KpiCard
          label={`Consumo per cápita · ${parseFecha(last.f).label}`}
          value={`${last.cp?.toFixed(1)} kg`}
          sub={prevYear ? <span style={{color:last.cp>prevYear.cp?'var(--green)':'var(--red)'}}>
            {last.cp>prevYear.cp?'▲':'▼'} {Math.abs(last.cp-prevYear.cp).toFixed(1)} kg vs mismo mes año ant.
          </span> : 'kg/hab/año estimado'}
          color="var(--accent)" accent="var(--accent)"
        />
        <KpiCard
          label={`Consumo aparente · ${lastA?.y}`}
          value={`${(lastA?.ca||0).toFixed(0)} kt`}
          sub="miles de tn res c/hueso · anual"
          color="var(--text)" accent="var(--line)"
        />
        <KpiCard
          label={`Exportaciones · ${lastA?.y}`}
          value={`${lastA?.vv?.toLocaleString('es-AR') || '—'} M USD`}
          sub={`${(lastA?.ve||0).toLocaleString('es-AR')} t equiv. res c/hueso`}
          color="var(--green)" accent="var(--green)"
        />
      </div>

      {/* Evolución consumo per cápita */}
      <div className="section-title">Consumo per cápita · kg/hab/año · evolución mensual</div>
      <div style={{ background:'var(--bg1)', border:'1px solid var(--line)', borderRadius:10, padding:'16px 20px', marginBottom:24 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:8 }}>
          <Mono style={{ fontSize:9, color:'var(--text3)', letterSpacing:'.1em', textTransform:'uppercase' }}>Consumo per cápita · 1990–2026</Mono>
          <Mono style={{ fontSize:9, color:'var(--text3)' }}>máx: {Math.max(...histConsumo.map(d=>d.cp)).toFixed(1)} kg · mín: {Math.min(...histConsumo.map(d=>d.cp)).toFixed(1)} kg</Mono>
        </div>
        <Sparkline data={histConsumo.map(d=>d.cp)} color="var(--green)" height={60}/>
        <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
          {['1990','1995','2000','2005','2010','2015','2020','2025'].map(y => (
            <Mono key={y} style={{ fontSize:9, color:'var(--text3)' }}>{y}</Mono>
          ))}
        </div>
      </div>

      {/* Comparativa anual consumo + exportación */}
      <div className="section-title">Resumen anual · consumo & exportaciones</div>
      <div className="tbl-wrap tbl-scroll" style={{ maxHeight:360 }}>
        <table>
          <thead>
            <tr>
              <th>Año</th>
              <th className="r">Per cápita</th>
              <th className="r">Consumo ap.</th>
              <th className="r">Vol. export</th>
              <th className="r">Valor export</th>
              <th className="r">USD/ton</th>
            </tr>
          </thead>
          <tbody>
            {[...anualConsumo].reverse().map(d => (
              <tr key={d.y}>
                <td><Mono style={{ fontSize:13, fontWeight:700, color:'var(--white)' }}>{d.y}</Mono></td>
                <td className="r"><Mono style={{ fontSize:12, fontWeight:700, color:'var(--accent)' }}>{d.cp} kg</Mono></td>
                <td className="r"><Mono style={{ fontSize:11, color:'var(--text)' }}>{(+d.ca).toLocaleString('es-AR')} kt</Mono></td>
                <td className="r"><Mono style={{ fontSize:11, color:'var(--text2)' }}>{(+d.ve/1000).toFixed(0)} kt</Mono></td>
                <td className="r"><Mono style={{ fontSize:11, color:'var(--green)' }}>{(+d.vv).toLocaleString('es-AR')} k USD</Mono></td>
                <td className="r"><Mono style={{ fontSize:11, color:'var(--text3)' }}>{(+d.pe).toLocaleString('es-AR')}</Mono></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="source" style={{ marginTop:8 }}>Fuente: MAGYP · SENASA · INDEC · Planilla Indicadores Bovinos 1990–2026</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: COMERCIALIZACIÓN MAG
// ─────────────────────────────────────────────────────────────────────────────
function TabComercializacion() {
  const lastP = precios[precios.length-1];
  const lastC = cabezas[cabezas.length-1];
  const lastW = DATA.pesos.filter(d=>d.ig!=null).slice(-1)[0];

  const CATS = [
    { key:'no', label:'Novillos',    color:'#5b9cf6' },
    { key:'nt', label:'Novillitos',  color:'#4080d8' },
    { key:'vq', label:'Vaquillonas', color:'#6faafc' },
    { key:'va', label:'Vacas',       color:'#8fb8f0' },
    { key:'to', label:'Toros',       color:'#3268c5' },
    { key:'me', label:'MEJ',         color:'#94c4ff' },
  ];

  const maxCab = lastC ? Math.max(...CATS.map(c => lastC[c.key]||0)) : 1;

  return (
    <div>
      {/* Banner fuente */}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 16px', marginBottom:20,
        background:'rgba(74,191,120,.04)', border:'1px solid rgba(74,191,120,.15)', borderRadius:8 }}>
        <div style={{ width:7, height:7, borderRadius:'50%', background:'var(--green)', boxShadow:'0 0 6px var(--green)', flexShrink:0 }}/>
        <Mono style={{ fontSize:9, color:'var(--text3)', letterSpacing:'.09em', textTransform:'uppercase' }}>
          Mercado Agroganadero SA · Datos comercialización MAG 2016–2026
        </Mono>
        <Mono style={{ fontSize:9, color:'var(--text3)', marginLeft:'auto' }}>
          Último dato: {lastP?.f && parseFecha(lastP.f).label}
        </Mono>
      </div>

      {/* Doble columna: precio + cabezas del último mes */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:24 }}>
        {/* Precios */}
        <div style={{ background:'var(--bg1)', border:'1px solid var(--line)', borderRadius:12, padding:'16px 20px' }}>
          <div className="section-title" style={{ marginBottom:12 }}>Precio ARS/kg vivo · {lastP?.f && parseFecha(lastP.f).label}</div>
          {CATS.filter(c => lastP?.[c.key] != null).map(cat => (
            <BarH key={cat.key}
              label={cat.label}
              value={lastP[cat.key]}
              max={Math.max(...CATS.map(c=>lastP?.[c.key]||0))}
              color={cat.color}
              sub={fARS(lastP[cat.key])}
            />
          ))}
        </div>

        {/* Cabezas */}
        <div style={{ background:'var(--bg1)', border:'1px solid var(--line)', borderRadius:12, padding:'16px 20px' }}>
          <div className="section-title" style={{ marginBottom:12 }}>Cabezas ingresadas · {lastC?.f && parseFecha(lastC.f).label}</div>
          {CATS.filter(c => lastC?.[c.key] != null).map(cat => (
            <BarH key={cat.key}
              label={cat.label}
              value={lastC[cat.key]}
              max={maxCab}
              color={cat.color}
              sub={fNum(lastC[cat.key])}
            />
          ))}
          <div style={{ marginTop:12, paddingTop:12, borderTop:'1px solid var(--line)' }}>
            <Mono style={{ fontSize:10, color:'var(--text3)' }}>Total: </Mono>
            <Mono style={{ fontSize:13, fontWeight:700, color:'var(--accent)' }}>{fNum(lastC?.ig)} cab.</Mono>
          </div>
        </div>
      </div>

      {/* Pesos por categoría */}
      {lastW && (
        <div style={{ marginBottom:24 }}>
          <div className="section-title">Peso promedio por categoría · kg · {lastW.f && parseFecha(lastW.f).label}</div>
          <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
            {CATS.filter(c => lastW[c.key] != null).map(cat => (
              <div key={cat.key} style={{ display:'grid', gridTemplateColumns:'130px 1fr 80px',
                alignItems:'center', gap:12, padding:'8px 16px',
                background:'var(--bg1)', border:'1px solid var(--line)', borderRadius:8 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:3, height:14, background:cat.color, borderRadius:2 }}/>
                  <span style={{ fontSize:12, color:'var(--text)' }}>{cat.label}</span>
                </div>
                <div style={{ height:5, background:'var(--bg3)', borderRadius:3, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${Math.min(100,(lastW[cat.key]/800)*100).toFixed(0)}%`, background:cat.color, opacity:.7, borderRadius:3 }}/>
                </div>
                <Mono style={{ fontSize:12, fontWeight:700, color:cat.color, textAlign:'right' }}>{lastW[cat.key]?.toFixed(0)} kg</Mono>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Evolución cabezas total */}
      <div className="section-title">Evolución cabezas ingresadas MAG · total mensual</div>
      <div style={{ background:'var(--bg1)', border:'1px solid var(--line)', borderRadius:10, padding:'16px 20px', marginBottom:16 }}>
        <Sparkline data={cabezas.map(d=>d.ig)} color="var(--accent)" height={56}/>
        <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
          {['2016','2018','2020','2022','2024','2026'].map(y => (
            <Mono key={y} style={{ fontSize:9, color:'var(--text3)' }}>{y}</Mono>
          ))}
        </div>
      </div>

      <div className="source">Fuente: Mercado Agroganadero SA · Comercialización MAG 2016–2026</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
const TABS = [
  { id:'resumen',       label:'Resumen' },
  { id:'precios',       label:'Precios MAG' },
  { id:'faena',         label:'Faena' },
  { id:'consumo',       label:'Consumo & Exportación' },
  { id:'comercializacion', label:'Comercialización' },
];

export function HaciendaPage({ goPage }) {
  const [tab, setTab] = useState('resumen');

  // Cargar datos de faena solo cuando el usuario abre ese tab
  const faenaEnabled = tab === 'faena';
  const { data: faenaLive, status: faenaStatus } = useHaciendaFaena(faenaEnabled);

  return (
    <div className="page-enter">
      {/* Header */}
      <div className="ph">
        <div>
          <div className="ph-title">
            Hacienda{' '}
            <span className="help-pip" onClick={() => goPage && goPage('ayuda', 'glosario-hacienda')} title="Ayuda">?</span>
          </div>
          <div className="ph-sub">
            Precios MAG · Faena nacional · Consumo · Exportación · {lastPrecio?.f && parseFecha(lastPrecio.f).label}
          </div>
        </div>
        <div className="ph-right">
          <Mono style={{ fontSize:10, color:'var(--text3)' }}>
            {historico.length} registros · hasta {lastHist?.f}
          </Mono>
        </div>
      </div>

      {/* Banner estado datos */}
      <div style={{
        display:'flex', alignItems:'center', gap:10, padding:'10px 16px', marginBottom:24,
        background:'rgba(74,191,120,.04)', border:'1px solid rgba(74,191,120,.15)', borderRadius:10, flexWrap:'wrap'
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:7, height:7, borderRadius:'50%', background:'var(--green)', boxShadow:'0 0 6px var(--green)' }}/>
          <Mono style={{ fontSize:9, fontWeight:700, letterSpacing:'.1em', color:'var(--green)', textTransform:'uppercase' }}>Datos cargados</Mono>
        </div>
        <Mono style={{ fontSize:10, color:'var(--text2)' }}>
          IGMAG {parseFecha(lastPrecio.f).label} · {fARS(lastPrecio.ig)}/kg vivo
        </Mono>
        <div style={{ marginLeft:'auto', display:'flex', gap:20 }}>
          <Mono style={{ fontSize:9, color:'var(--text3)' }}>Faena: {lastFaena?.f && parseFecha(lastFaena.f).label}</Mono>
          <Mono style={{ fontSize:9, color:'var(--text3)' }}>Indicadores: hasta {lastHist?.f}</Mono>
          <Mono style={{ fontSize:9, color:'var(--text3)' }}>Fuentes: MAGYP · MAG</Mono>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom:20 }}>
        {TABS.map(t => (
          <button key={t.id} className={`tab${tab===t.id?' active':''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div>
        {tab === 'resumen'          && <TabResumen/>}
        {tab === 'precios'          && <TabPrecios/>}
        {tab === 'faena'            && <TabFaena faenaLive={faenaLive} faenaStatus={faenaStatus}/>}
        {tab === 'consumo'          && <TabConsumo/>}
        {tab === 'comercializacion' && <TabComercializacion/>}
      </div>
    </div>
  );
}
