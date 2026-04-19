// GranosPage.jsx
// Fuentes en vivo: FOB MAGyP (Ley 21.453) · CBOT Chicago (spot + contratos futuros)
// Sin datos calculados localmente: todos los valores mostrados vienen directamente de las APIs.
import React, { useState, useEffect, useMemo } from 'react';
import { fetchFOB, parseFuturosFromMundo } from '../../services/api';
import { NCM_MAP } from '../../data/granos.js';

// ─── Granos: solo ID, nombre, clave FOB y clave CBOT ──────────
// Sin retenciones, sin fasRatio, sin cálculos. La API es la única fuente de verdad.
const GRANOS = [
  { id:'soja',    nombre:'Soja',    fobKey:'soja',       cbotId:'soy',     color:'#56c97a' },
  { id:'maiz',    nombre:'Maiz',    fobKey:'maiz',       cbotId:'corn',    color:'#f0b840' },
  { id:'trigo',   nombre:'Trigo',   fobKey:'trigo',      cbotId:'wheat',   color:'#4d9ef0' },
  { id:'girasol', nombre:'Girasol', fobKey:'girasol',    cbotId:null,      color:'#f0b840' },
  { id:'sorgo',   nombre:'Sorgo',   fobKey:'sorgo',      cbotId:null,      color:'#9ca3af' },
  { id:'cebada',  nombre:'Cebada',  fobKey:'cebada',     cbotId:null,      color:'#56c97a' },
];

// ─── Formatters ───────────────────────────────────────────────
const R = n => Math.round(n);
const fmtUSD = v => v == null ? '—' : `USD\u00a0${Number(v).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;
const fmtARS = v => v == null ? '—' : `$\u00a0${R(v).toLocaleString('es-AR')}`;
const fmtPct = v => {
  if (v == null) return '—';
  const s = Math.abs(v).toFixed(1);
  return v > 0 ? `+${s}%` : v < 0 ? `\u2212${s}%` : '0%';
};
const dir = v => v == null ? 'fl' : v > 0 ? 'up' : v < 0 ? 'dn' : 'fl';

// ─── UI Atoms ─────────────────────────────────────────────────
const Pill = ({ v }) => <span className={`pill ${dir(v)}`}>{fmtPct(v)}</span>;

function Badge({ type = 'live', label, fecha }) {
  const S = {
    live: { c:'var(--green)', bg:'var(--green-bg)', dot:'var(--green)', txt:'EN VIVO' },
    fob:  { c:'var(--green)', bg:'var(--green-bg)', dot:'var(--green)', txt:'FOB VIVO' },
    cbot: { c:'#4d9ef0', bg:'rgba(77,158,240,.12)', dot:'#4d9ef0', txt:'CBOT VIVO' },
    ref:  { c:'var(--text3)', bg:'var(--bg3)', dot:null, txt: label ?? 'SIN DATO' },
  };
  const s = S[type] ?? S.live;
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:4,
      fontFamily:'var(--mono)', fontSize:8, fontWeight:600,
      letterSpacing:'.08em', textTransform:'uppercase',
      color:s.c, background:s.bg, padding:'2px 7px', borderRadius:4,
    }}>
      {s.dot && <span style={{ width:5, height:5, borderRadius:'50%', background:s.dot, display:'inline-block' }} />}
      {s.txt}{fecha ? ` \u00b7 ${fecha}` : ''}
    </span>
  );
}

const Skel = ({ w='60%', h=14, mb=0 }) => (
  <div style={{ height:h, background:'var(--bg3)', borderRadius:4, width:w, marginBottom:mb, opacity:.5 }} />
);

// ─── Sparkline ────────────────────────────────────────────────
function Spark({ data, color='var(--green)', w=80, h=30 }) {
  if (!data?.length) return null;
  const mn=Math.min(...data), mx=Math.max(...data), rng=mx-mn||1, n=data.length;
  const x=i=>(i/(n-1))*w, y=v=>h-((v-mn)/rng)*h;
  const p=data.map((v,i)=>`${i===0?'M':'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} style={{display:'block'}}>
      <path d={`${p} L${x(n-1)},${h} L0,${h} Z`} fill={color} opacity={.12}/>
      <path d={p} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={x(n-1)} cy={y(data[n-1])} r={2.5} fill={color}/>
    </svg>
  );
}

// ─── Barra de fuentes activas ─────────────────────────────────
function FuentesBar({ fobData, mundo }) {
  const cbotOk = !!(mundo?.items?.find(i=>i.id==='soy')?.price);
  return (
    <div style={{
      display:'flex', gap:16, flexWrap:'wrap', alignItems:'center',
      padding:'9px 14px', background:'var(--bg1)', borderRadius:8,
      border:'1px solid var(--line)', fontSize:11, marginBottom:20,
    }}>
      <span style={{color:'var(--text3)',fontFamily:'var(--mono)',fontSize:9,letterSpacing:'.08em',textTransform:'uppercase'}}>Fuentes activas</span>
      {fobData
        ? <><Badge type="fob"/><span style={{color:'var(--text3)',fontSize:10}}>MAGyP Ley 21.453 · USD/tn · {fobData.fecha}{fobData.diasAtras>0?` (\u2212${fobData.diasAtras}d)`:''}</span></>
        : <span style={{color:'var(--text3)',fontSize:10}}>FOB cargando...</span>
      }
      <span style={{color:'var(--line)'}}>·</span>
      {cbotOk
        ? <><Badge type="cbot"/><span style={{color:'var(--text3)',fontSize:10}}>CBOT Chicago · USD/tn spot + contratos via Yahoo Finance</span></>
        : <span style={{color:'var(--text3)',fontSize:10}}>CBOT cargando...</span>
      }
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB RESUMEN
// ─────────────────────────────────────────────────────────────
function TabResumen({ fobData, fobStatus, mundo, tc, moneda }) {
  const items = mundo?.items ?? [];

  if (fobStatus==='loading' && !fobData) {
    return (
      <div className="grid grid-3">
        {[0,1,2,3,4,5].map(i=>(
          <div key={i} className="stat" style={{cursor:'default'}}>
            <Skel w="55%" h={12} mb={16}/><Skel w="75%" h={28} mb={10}/><Skel w="45%" h={10}/>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <FuentesBar fobData={fobData} mundo={mundo}/>

      <div className="grid grid-3" style={{marginBottom:28}}>
        {GRANOS.map(g => {
          const fobUSD = fobData?.precios?.[g.fobKey] ?? null;
          const cbot   = g.cbotId ? items.find(i=>i.id===g.cbotId) : null;
          const precARS= fobUSD && tc ? R(fobUSD * tc) : null;
          const precio = moneda==='ARS' ? fmtARS(precARS) : fmtUSD(fobUSD);
          const spark  = cbot?.sparkline?.slice(-20) ?? null;
          const isLive = !!fobUSD;
          return (
            <div key={g.id} className="stat" style={{cursor:'default'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                <span style={{fontSize:13,color:'var(--text2)'}}>{g.nombre}</span>
                {isLive ? <Badge type="fob"/> : <Badge type="ref"/>}
              </div>
              <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',marginBottom:6}}>
                <div>
                  <div className="stat-val" style={{fontSize:22,marginBottom:4}}>
                    {isLive ? precio : <span style={{color:'var(--text3)',fontSize:13}}>Sin datos</span>}
                  </div>
                  <div style={{display:'flex',gap:6,alignItems:'center'}}>
                    {cbot?.change != null && <Pill v={cbot.change}/>}
                    {cbot?.price != null && (
                      <span style={{fontFamily:'var(--mono)',fontSize:9,color:'#4d9ef0'}}>
                        CBOT {fmtUSD(cbot.price)}
                      </span>
                    )}
                  </div>
                </div>
                {spark && <Spark data={spark} color={g.color}/>}
              </div>
              <div className="stat-meta">
                {fobUSD != null && <span>FOB {fmtUSD(fobUSD)}</span>}
                {moneda==='ARS' && fobUSD && tc && (
                  <span style={{color:'var(--text3)'}}> · {fmtUSD(fobUSD)}/tn × TC {R(tc).toLocaleString('es-AR')}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <BasisPanel fobData={fobData} mundo={mundo}/>
      <CBOTSnapshot mundo={mundo}/>
    </div>
  );
}

// ─── Panel Basis ──────────────────────────────────────────────
// El basis se calcula solo cuando existen AMBOS datos en vivo: FOB y CBOT.
function BasisPanel({ fobData, mundo }) {
  const items = mundo?.items ?? [];
  const PARES = [
    {nombre:'Soja',  fobKey:'soja',  cbotId:'soy'  },
    {nombre:'Maiz',  fobKey:'maiz',  cbotId:'corn' },
    {nombre:'Trigo', fobKey:'trigo', cbotId:'wheat'},
  ];
  const data = PARES.map(g => {
    const fob  = fobData?.precios?.[g.fobKey] ?? null;
    const cbot = items.find(i=>i.id===g.cbotId);
    const basis = (fob != null && cbot?.price != null) ? R(fob - cbot.price) : null;
    const bPct  = (fob != null && cbot?.price != null) ? ((fob - cbot.price) / cbot.price * 100).toFixed(1) : null;
    return { ...g, fob, cbot: cbot?.price ?? null, basis, bPct };
  }).filter(g => g.basis != null);

  if (!data.length) return null;
  return (
    <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:12,padding:'16px 20px',marginBottom:24}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,fontFamily:'var(--mono)',fontSize:9,letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text3)'}}>
        <span>Basis en vivo — FOB MAGyP vs CBOT (USD/tn)</span>
        <Badge type="live"/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:`repeat(${data.length},1fr)`,gap:1,background:'var(--line)',borderRadius:8,overflow:'hidden'}}>
        {data.map(g => {
          const d = dir(g.basis);
          return (
            <div key={g.nombre} style={{background:'var(--bg2)',padding:'14px 16px',textAlign:'center'}}>
              <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--text3)',letterSpacing:'.06em',marginBottom:8}}>{g.nombre}</div>
              <div style={{fontFamily:'var(--mono)',fontSize:26,fontWeight:700,lineHeight:1,color:d==='up'?'var(--green)':d==='dn'?'var(--red)':'var(--text1)',marginBottom:6}}>
                {g.basis > 0 ? '+' : ''}{g.basis}
              </div>
              <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--text3)',marginBottom:4}}>{g.bPct}% sobre CBOT</div>
              <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--text3)'}}>FOB {fmtUSD(g.fob)} · CBOT {fmtUSD(g.cbot)}</div>
            </div>
          );
        })}
      </div>
      <div style={{marginTop:10,fontFamily:'var(--mono)',fontSize:9,color:'var(--text3)'}}>
        Basis negativo: precio local inferior al CBOT por retenciones y logistica · Basis positivo: demanda interna eleva el precio
      </div>
    </div>
  );
}

// ─── CBOT Snapshot ────────────────────────────────────────────
function CBOTSnapshot({ mundo }) {
  const items = mundo?.items ?? [];
  const IDS     = ['soy','corn','wheat','soymeal','soyoil'];
  const NOMBRES = { soy:'Soja', corn:'Maiz', wheat:'Trigo CBOT', soymeal:'Harina Soja', soyoil:'Aceite Soja' };
  const rows = IDS.map(id => items.find(i=>i.id===id)).filter(Boolean).filter(i => i.price != null);
  if (!rows.length) return null;
  return (
    <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:12,overflow:'hidden',marginBottom:24}}>
      <div style={{padding:'12px 20px 10px',borderBottom:'1px solid var(--line)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div style={{fontFamily:'var(--mono)',fontSize:9,letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text3)'}}>
          CBOT Chicago · Frente de mes · USD/tn
        </div>
        <Badge type="cbot"/>
      </div>
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr><th>Producto</th><th className="r">Precio</th><th className="r">Var. %</th><th className="r">Ant. cierre</th><th>Intradía</th></tr>
          </thead>
          <tbody>
            {rows.map(item => (
              <tr key={item.id}>
                <td className="bold">{NOMBRES[item.id]}</td>
                <td className="r w mono">{fmtUSD(item.price)}</td>
                <td className="r"><Pill v={item.change}/></td>
                <td className="r dim mono">{fmtUSD(item.prevClose)}</td>
                <td style={{paddingTop:4,paddingBottom:4}}>
                  <Spark data={item.sparkline?.slice(-30)} color={item.change >= 0 ? 'var(--green)' : 'var(--red)'} w={70} h={24}/>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="source">Fuente: CME Group · Yahoo Finance · conversion a USD/tn por factor estandar</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB FOB / FAS
// Solo muestra lo que devuelve la API: el precio FOB real de MAGyP.
// No se calcula FAS localmente ya que requiere datos del API que no están disponibles.
// ─────────────────────────────────────────────────────────────
function TabFobFas({ fobData, fobStatus, mundo }) {
  const items = mundo?.items ?? [];
  const FOB_ROWS = [
    { id:'soja',    nombre:'Soja',        fobKey:'soja',       cbotId:'soy',     nota:'Puerto Rosario' },
    { id:'harina',  nombre:'Harina Soja', fobKey:'harina_soja',cbotId:'soymeal', nota:'47% proteina' },
    { id:'aceite',  nombre:'Aceite Soja', fobKey:'aceite_soja',cbotId:'soyoil',  nota:'USD/tn exportacion' },
    { id:'maiz',    nombre:'Maiz',        fobKey:'maiz',       cbotId:'corn',    nota:'Puerto Rosario' },
    { id:'trigo',   nombre:'Trigo',       fobKey:'trigo',      cbotId:'wheat',   nota:'Puerto Rosario' },
    { id:'girasol', nombre:'Girasol',     fobKey:'girasol',    cbotId:null,      nota:'Bahia Blanca' },
    { id:'sorgo',   nombre:'Sorgo',       fobKey:'sorgo',      cbotId:null,      nota:'Puerto Rosario' },
    { id:'cebada',  nombre:'Cebada',      fobKey:'cebada',     cbotId:null,      nota:'Calidad forrajera' },
  ];

  const rows = useMemo(() => FOB_ROWS.map(row => {
    const fob  = fobData?.precios?.[row.fobKey] ?? null;
    const cbot = row.cbotId ? items.find(i=>i.id===row.cbotId) : null;
    const varF = cbot?.change ?? null;
    // Basis solo cuando existen ambos datos en vivo — no se calcula si falta alguno
    const basis = (fob != null && cbot?.price != null) ? R(fob - cbot.price) : null;
    return { ...row, fob, varF, basis };
  }).filter(r => r.fob != null), [fobData, mundo]);

  if (fobStatus === 'loading')
    return <div style={{padding:'40px 0',textAlign:'center',color:'var(--text3)',fontSize:13}}>Cargando precios FOB desde MAGyP...</div>;

  if (fobStatus === 'error' || !rows.length)
    return (
      <div style={{padding:'32px 0'}}>
        <div className="alert-strip error" style={{maxWidth:520,margin:'0 auto'}}>
          <span className="alert-icon">!</span>
          <span className="alert-text">
            No se pudieron obtener precios FOB desde MAGyP (Ley 21.453).
            El servidor suele estar sin datos en fines de semana y feriados.
            El sistema reintenta automaticamente con el ultimo dia habil disponible.
          </span>
        </div>
      </div>
    );

  return (
    <div>
      <div className="alert-strip info" style={{marginBottom:20}}>
        <span className="alert-icon">i</span>
        <span className="alert-text">
          Precios <strong>FOB</strong> (Free On Board) en <strong>USD/tn</strong> directamente desde{' '}
          <strong>MAGyP · Ley 21.453</strong> · <Badge type="fob"/> · <strong>{fobData?.fecha ?? '—'}</strong>
          {fobData?.diasAtras > 0 && <span style={{color:'var(--text3)'}}> · ({fobData.diasAtras}d de retraso)</span>}
        </span>
      </div>
      <div className="tbl-wrap">
        <div className="tbl-scroll">
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th className="r">FOB (USD/tn)</th>
                <th className="r">Var. CBOT</th>
                <th className="r">Basis USD</th>
                <th>Puerto / nota</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id}>
                  <td className="bold">{row.nombre}</td>
                  <td className="r w mono">{fmtUSD(row.fob)}</td>
                  <td className="r">{row.varF != null ? <Pill v={row.varF}/> : <span className="dim">—</span>}</td>
                  <td className="r">
                    {row.basis != null
                      ? <span style={{fontFamily:'var(--mono)',fontSize:11,fontWeight:600,color:row.basis>0?'var(--green)':row.basis<0?'var(--red)':'var(--text3)'}}>
                          {row.basis > 0 ? '+' : ''}{row.basis}
                        </span>
                      : <span className="dim">—</span>
                    }
                  </td>
                  <td className="dim" style={{fontSize:11}}>{row.nota}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="source" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span>Fuente: MAGyP · Posicion Arancelaria NCM · {fobData?.fecha ?? ''}</span>
        <Badge type="fob"/>
      </div>
      <div style={{marginTop:16,background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:10,padding:'12px 16px',fontSize:11,color:'var(--text3)',fontFamily:'var(--mono)'}}>
        <strong style={{color:'var(--text2)'}}>FOB</strong> = precio puesto en el barco ·
        <strong style={{color:'var(--text2)'}}> Basis</strong> = FOB MAGyP − CBOT (diferencial local/internacional) ·
        FAS y retenciones no se calculan: requieren datos de la API que no estan disponibles publicamente.
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB FUTUROS CBOT
// Solo muestra contratos con datos reales de Yahoo Finance.
// Matba-Rofex no tiene API publica.
// ─────────────────────────────────────────────────────────────
function TabFuturos({ mundo }) {
  const [activo, setActivo] = useState('soja');
  const items = mundo?.items ?? [];
  const SPOT_IDS = { soja:'soy', maiz:'corn', trigo:'wheat' };
  const spotItem = items.find(i => i.id === SPOT_IDS[activo]);
  const futurosVivos = parseFuturosFromMundo(items);
  const contratos = futurosVivos[activo] ?? [];

  const curva = [
    spotItem?.price != null ? { label:'Spot', precio:spotItem.price } : null,
    ...contratos.map(c => ({ label:c.contrato, precio:c.precio })),
  ].filter(Boolean);

  const subprod = ['soymeal','soyoil']
    .map(id => ({ id, item: items.find(i=>i.id===id) }))
    .filter(s => s.item?.price != null);

  return (
    <div>
      <div className="toggle" style={{marginBottom:20}}>
        {[{id:'soja',n:'Soja'},{id:'maiz',n:'Maiz'},{id:'trigo',n:'Trigo'}].map(c => (
          <button key={c.id} className={`tg${activo===c.id?' active':''}`} onClick={()=>setActivo(c.id)}>{c.n}</button>
        ))}
      </div>

      {/* CBOT en vivo */}
      <div style={{marginBottom:24}}>
        <div className="section-title" style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
          CBOT Chicago (USD/tn) <Badge type="cbot"/>
        </div>
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Contrato</th><th className="r">USD/tn</th><th className="r">Var. %</th></tr></thead>
            <tbody>
              {spotItem?.price != null && (
                <tr style={{background:'var(--bg2)'}}>
                  <td className="bold" style={{color:'var(--accent)'}}>
                    SPOT <span style={{fontFamily:'var(--mono)',fontSize:8,color:'#4d9ef0'}}>FRENTE</span>
                  </td>
                  <td className="r w mono">{fmtUSD(spotItem.price)}</td>
                  <td className="r"><Pill v={spotItem.change}/></td>
                </tr>
              )}
              {contratos.length > 0
                ? contratos.map(c => (
                  <tr key={c.id}>
                    <td className="bold">{c.contrato}</td>
                    <td className="r w mono">{fmtUSD(c.precio)}</td>
                    <td className="r">{c.change != null ? <Pill v={c.change}/> : <span className="dim">—</span>}</td>
                  </tr>
                ))
                : <tr><td colSpan={3} style={{color:'var(--text3)',fontSize:12,textAlign:'center',padding:'14px 0'}}>Cargando contratos...</td></tr>
              }
            </tbody>
          </table>
        </div>
        <div className="source" style={{display:'flex',justifyContent:'space-between'}}>
          <span>CME Group · Yahoo Finance</span>
          <Badge type="cbot"/>
        </div>
      </div>

      {/* Matba-Rofex — sin API publica */}
      <div style={{marginBottom:24,padding:'14px 16px',background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:10}}>
        <div style={{fontFamily:'var(--mono)',fontSize:9,letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text3)',marginBottom:6}}>
          Matba-Rofex (ARS/tn)
        </div>
        <div style={{color:'var(--text3)',fontSize:12}}>
          Sin API publica disponible. Se requiere acceso institucional a Matba-Rofex para obtener precios de futuros locales.
        </div>
      </div>

      {/* Estructura de plazos — solo si hay datos vivos */}
      {curva.length >= 2 && (
        <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:12,overflow:'hidden',marginBottom:24}}>
          <div style={{padding:'12px 20px 10px',borderBottom:'1px solid var(--line)',display:'flex',justifyContent:'space-between'}}>
            <div style={{fontFamily:'var(--mono)',fontSize:9,letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text3)'}}>
              Estructura de plazos — {activo.charAt(0).toUpperCase()+activo.slice(1)} CBOT · USD/tn
            </div>
            <Badge type="cbot"/>
          </div>
          <div style={{padding:'20px 24px 16px'}}>
            <div style={{display:'flex',gap:8,alignItems:'flex-end',height:90}}>
              {curva.map((c,i) => {
                const all=curva.map(x=>x.precio), mn=Math.min(...all), mx=Math.max(...all), rng=mx-mn||1;
                const pct=(c.precio-mn)/rng;
                const bH=Math.round(24+pct*56);
                return (
                  <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                    <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--text3)'}}>{fmtUSD(c.precio)}</div>
                    <div style={{width:'50%',height:bH,background:i===0?'#4d9ef0':'var(--bg3)',borderRadius:'4px 4px 0 0',border:'1px solid var(--line)',transition:'height .3s'}}/>
                    <div style={{fontFamily:'var(--mono)',fontSize:8,color:'var(--text3)',textAlign:'center'}}>{c.label}</div>
                  </div>
                );
              })}
            </div>
            {curva.length >= 2 && (
              <div style={{marginTop:12,fontFamily:'var(--mono)',fontSize:9,color:'var(--text3)'}}>
                {curva.slice(-1)[0].precio > curva[0].precio
                  ? 'Curva en contango (futuros > spot): mercado anticipa mayor precio futuro.'
                  : 'Curva en backwardation (futuros < spot): mayor demanda inmediata que futura.'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Subproductos CBOT vivos */}
      {subprod.length > 0 && (
        <div>
          <div className="section-title" style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
            Subproductos soja · CBOT spot <Badge type="cbot"/>
          </div>
          <div className="grid grid-2">
            {subprod.map(s => {
              const NOMS = { soymeal:'Harina Soja', soyoil:'Aceite Soja' };
              return (
                <div key={s.id} className="stat" style={{cursor:'default'}}>
                  <div style={{fontSize:13,color:'var(--text2)',marginBottom:8,display:'flex',justifyContent:'space-between'}}>
                    <span>{NOMS[s.id]}</span><Badge type="cbot"/>
                  </div>
                  <div className="stat-val" style={{fontSize:20,marginBottom:8}}>{fmtUSD(s.item.price)}</div>
                  <div className="stat-meta">
                    <Pill v={s.item.change}/> · ant. cierre {fmtUSD(s.item.prevClose)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB PIZARRAS
// Solo muestra FOB y CBOT en vivo. Pizarras locales requieren SIO.
// ─────────────────────────────────────────────────────────────
function TabPizarras({ fobData, mundo }) {
  const items = mundo?.items ?? [];
  const CBOT_MAP = { Soja:'soy', Maiz:'corn', Trigo:'wheat' };
  const FOB_KEYS = { Soja:'soja', Maiz:'maiz', Trigo:'trigo', Girasol:'girasol', Sorgo:'sorgo', Cebada:'cebada' };

  const rows = Object.keys(FOB_KEYS).map(nombre => {
    const cbotItem = CBOT_MAP[nombre] ? items.find(i => i.id === CBOT_MAP[nombre]) : null;
    const fobLive  = fobData?.precios?.[FOB_KEYS[nombre]] ?? null;
    return { nombre, cbotItem, fobLive };
  }).filter(r => r.fobLive != null || r.cbotItem?.price != null);

  return (
    <div>
      <div className="alert-strip info" style={{marginBottom:20}}>
        <span className="alert-icon">i</span>
        <span className="alert-text">
          Precios por plaza (Rosario, Bs.As., Bahia, etc.) requieren acceso institucional al <strong>SIO Granos</strong> y no estan disponibles publicamente.
          Se muestran los precios FOB y CBOT en vivo.
        </span>
      </div>

      {rows.length === 0 ? (
        <div style={{padding:'32px 0',textAlign:'center',color:'var(--text3)',fontSize:13}}>
          Sin datos disponibles. Verifique la conexion con MAGyP y CBOT.
        </div>
      ) : (
        <div className="tbl-wrap">
          <div className="tbl-scroll">
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th className="r">FOB vivo</th>
                  <th className="r">CBOT vivo</th>
                  <th className="r">Var. %</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.nombre}>
                    <td className="bold">{row.nombre}</td>
                    <td className="r">
                      {row.fobLive != null
                        ? <span style={{fontFamily:'var(--mono)',fontSize:11,fontWeight:700,color:'var(--green)'}}>{fmtUSD(row.fobLive)}</span>
                        : <span className="dim">—</span>
                      }
                    </td>
                    <td className="r">
                      {row.cbotItem?.price != null
                        ? <span style={{fontFamily:'var(--mono)',fontSize:11,color:'#4d9ef0'}}>{fmtUSD(row.cbotItem.price)}</span>
                        : <span className="dim">—</span>
                      }
                    </td>
                    <td className="r">
                      {row.cbotItem?.change != null
                        ? <Pill v={row.cbotItem.change}/>
                        : <span className="dim">—</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <div className="source">FOB: MAGyP en vivo · CBOT: Yahoo Finance en vivo · Pizarras locales: requieren SIO Granos (institucional)</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB SUBPRODUCTOS
// Solo muestra datos que vienen directamente de las APIs.
// No se calcula crush margin ni ratios localmente.
// ─────────────────────────────────────────────────────────────
function TabSubproductos({ fobData, mundo }) {
  const items = mundo?.items ?? [];
  const hF   = fobData?.precios?.harina_soja ?? null;
  const aF   = fobData?.precios?.aceite_soja  ?? null;
  const hFut = items.find(i => i.id === 'soymeal');
  const aFut = items.find(i => i.id === 'soyoil');
  const gF   = fobData?.precios?.girasol ?? null;

  const CARDS = [
    { label:'Harina Soja FOB',  v: hF   != null ? fmtUSD(hF)        : null, var: hFut?.change ?? null, type:'fob',  un:'USD/tn' },
    { label:'Aceite Soja FOB',  v: aF   != null ? fmtUSD(aF)        : null, var: aFut?.change ?? null, type:'fob',  un:'USD/tn' },
    { label:'Harina Soja CBOT', v: hFut?.price  != null ? fmtUSD(hFut.price) : null, var: hFut?.change ?? null, type:'cbot', un:'USD/tn spot' },
    { label:'Aceite Soja CBOT', v: aFut?.price  != null ? fmtUSD(aFut.price) : null, var: aFut?.change ?? null, type:'cbot', un:'USD/tn spot' },
  ];

  const hasAnySoja = CARDS.some(c => c.v != null);

  return (
    <div>
      <div className="section-title" style={{display:'flex',alignItems:'center',gap:8,marginBottom:16}}>
        Complejo Sojero
      </div>

      {!hasAnySoja ? (
        <div style={{padding:'24px 0',color:'var(--text3)',fontSize:13}}>
          Sin datos disponibles para subproductos soja.
        </div>
      ) : (
        <div className="grid grid-4" style={{marginBottom:24}}>
          {CARDS.map(item => (
            <div key={item.label} className="stat" style={{cursor:'default'}}>
              <div style={{fontSize:12,fontWeight:400,color:'var(--text2)',marginBottom:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span>{item.label}</span>
                {item.v != null ? <Badge type={item.type}/> : <Badge type="ref"/>}
              </div>
              <div className="stat-val" style={{fontSize:20,marginBottom:8}}>
                {item.v ?? <span style={{color:'var(--text3)',fontSize:13}}>Sin datos</span>}
              </div>
              <div className="stat-meta">{item.var != null && <Pill v={item.var}/>} {item.un}</div>
            </div>
          ))}
        </div>
      )}

      {/* Girasol */}
      <div className="section-title" style={{marginTop:8,marginBottom:16}}>Complejo Girasol</div>
      <div className="grid grid-2">
        <div className="stat" style={{cursor:'default'}}>
          <div style={{fontSize:13,color:'var(--text2)',marginBottom:8}}>Aceite Girasol FOB</div>
          <div style={{color:'var(--text3)',fontSize:13,marginBottom:10}}>Sin datos</div>
          <div className="stat-meta">USD/tn · sin API publica disponible</div>
        </div>
        <div className="stat" style={{cursor:'default'}}>
          <div style={{fontSize:13,color:'var(--text2)',marginBottom:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            Girasol Grano FOB {gF != null ? <Badge type="fob"/> : <Badge type="ref"/>}
          </div>
          <div className="stat-val" style={{fontSize:20,marginBottom:10}}>
            {gF != null ? fmtUSD(gF) : <span style={{color:'var(--text3)',fontSize:13}}>Sin datos</span>}
          </div>
          <div className="stat-meta">Bahia Blanca</div>
        </div>
      </div>
      <div className="source" style={{marginTop:10,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span>Fuente: MAGyP · CME Group</span>
        <Badge type={(hF || aF || hFut) ? 'fob' : 'ref'}/>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB HISTORICO
// No hay historial disponible sin una API de series temporales.
// Solo se muestran valores del dia actual de las APIs en vivo.
// ─────────────────────────────────────────────────────────────
function TabHistorico({ fobData, mundo }) {
  const items = mundo?.items ?? [];
  const cS = items.find(i => i.id === 'soy');
  const cM = items.find(i => i.id === 'corn');
  const cT = items.find(i => i.id === 'wheat');

  // Basis calculado solo cuando existen ambos datos en vivo
  const bS = (fobData?.precios?.soja  && cS?.price) ? R(fobData.precios.soja  - cS.price) : null;
  const bM = (fobData?.precios?.maiz  && cM?.price) ? R(fobData.precios.maiz  - cM.price) : null;
  const bT = (fobData?.precios?.trigo && cT?.price) ? R(fobData.precios.trigo - cT.price) : null;
  const hasBasis = bS != null || bM != null || bT != null;

  return (
    <div>
      <div className="alert-strip info" style={{marginBottom:20}}>
        <span className="alert-icon">i</span>
        <span className="alert-text">
          El historico de precios requiere una API de series temporales no disponible publicamente.
          Se muestran los valores del dia actual derivados de MAGyP y CBOT.
        </span>
      </div>

      {/* Basis actual — calculado con datos vivos */}
      {hasBasis && (
        <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:12,padding:'16px 20px',marginBottom:24}}>
          <div style={{fontFamily:'var(--mono)',fontSize:9,letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text3)',marginBottom:16,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span>Basis hoy — FOB MAGyP vs CBOT (USD/tn)</span>
            <Badge type="live"/>
          </div>
          <div style={{display:'grid',gridTemplateColumns:`repeat(${[bS,bM,bT].filter(v=>v!=null).length},1fr)`,gap:1,background:'var(--line)',borderRadius:8,overflow:'hidden'}}>
            {[
              { nombre:'Soja',  basis:bS, fob:fobData?.precios?.soja,  cbot:cS?.price },
              { nombre:'Maiz',  basis:bM, fob:fobData?.precios?.maiz,  cbot:cM?.price },
              { nombre:'Trigo', basis:bT, fob:fobData?.precios?.trigo, cbot:cT?.price },
            ].filter(g => g.basis != null).map(g => {
              const d = dir(g.basis);
              return (
                <div key={g.nombre} style={{background:'var(--bg2)',padding:'14px 16px',textAlign:'center'}}>
                  <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--text3)',letterSpacing:'.06em',marginBottom:8}}>{g.nombre}</div>
                  <div style={{fontFamily:'var(--mono)',fontSize:26,fontWeight:700,lineHeight:1,color:d==='up'?'var(--green)':d==='dn'?'var(--red)':'var(--text1)',marginBottom:6}}>
                    {g.basis > 0 ? '+' : ''}{g.basis}
                  </div>
                  <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--text3)'}}>FOB {fmtUSD(g.fob)} · CBOT {fmtUSD(g.cbot)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Snapshot CBOT del dia */}
      {(cS || cM || cT) && (
        <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:12,overflow:'hidden'}}>
          <div style={{padding:'12px 20px 10px',borderBottom:'1px solid var(--line)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{fontFamily:'var(--mono)',fontSize:9,letterSpacing:'.12em',textTransform:'uppercase',color:'var(--text3)'}}>
              Precios CBOT hoy · USD/tn
            </div>
            <Badge type="cbot"/>
          </div>
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>Cereal</th><th className="r">Precio</th><th className="r">Var. %</th><th className="r">Ant. cierre</th></tr></thead>
              <tbody>
                {[
                  { nombre:'Soja',  item: cS },
                  { nombre:'Maiz',  item: cM },
                  { nombre:'Trigo', item: cT },
                ].filter(r => r.item?.price != null).map(r => (
                  <tr key={r.nombre}>
                    <td className="bold">{r.nombre}</td>
                    <td className="r w mono">{fmtUSD(r.item.price)}</td>
                    <td className="r"><Pill v={r.item.change}/></td>
                    <td className="r dim mono">{fmtUSD(r.item.prevClose)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="source">CBOT: CME Group · Yahoo Finance · valores del dia</div>
        </div>
      )}

      {!hasBasis && !cS && !cM && !cT && (
        <div style={{padding:'32px 0',textAlign:'center',color:'var(--text3)',fontSize:13}}>
          Sin datos disponibles. Verifique la conexion con MAGyP y CBOT.
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────
const TABS = [
  { id:'resumen',      label:'Resumen'      },
  { id:'fob-fas',      label:'FOB / FAS'    },
  { id:'futuros',      label:'Futuros CBOT' },
  { id:'pizarras',     label:'Pizarras'     },
  { id:'subproductos', label:'Subproductos' },
  { id:'historico',    label:'Historico'    },
];

export function GranosPage({ goPage, dolares, mundo, loadMundo }) {
  const [moneda,    setMoneda]    = useState('ARS');
  const [activeTab, setActiveTab] = useState('resumen');
  const [fobData,   setFobData]   = useState(null);
  const [fobStatus, setFobStatus] = useState('loading');

  useEffect(() => {
    setFobStatus('loading');
    fetchFOB()
      .then(({ data }) => {
        if (data?.ok && Array.isArray(data.precios_raw)) {
          const precios = {};
          data.precios_raw.forEach(item => {
            const key = NCM_MAP[String(item.posicion ?? '').substring(0, 4)];
            if (key && !precios[key]) precios[key] = item.precio;
          });
          setFobData({ precios, fecha: data.fecha, diasAtras: data.diasAtras ?? 0 });
          setFobStatus('ok');
        } else {
          setFobStatus('error');
        }
      })
      .catch(() => setFobStatus('error'));
    if (!mundo && loadMundo) loadMundo();
  }, []);

  const tc     = dolares?.pOf ?? null;
  const cbotOk = !!(mundo?.items?.find(i => i.id === 'soy')?.price);

  return (
    <div className="page-enter">
      <div className="ph">
        <div>
          <div className="ph-title">
            Granos{' '}
            <span className="help-pip" onClick={() => goPage('ayuda', 'glosario-granos')} title="Ayuda">?</span>
          </div>
          <div className="ph-sub" style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
            <span>FOB/FAS MAGyP · CBOT Chicago · Futuros · Basis · Subproductos</span>
            {fobStatus==='ok'      && <><Badge type="fob"/><span style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--text3)'}}>{fobData?.fecha}</span></>}
            {fobStatus==='loading' && <span style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--text3)'}}>cargando FOB...</span>}
            {cbotOk                && <Badge type="cbot"/>}
          </div>
        </div>
        <div className="ph-right">
          <div className="toggle">
            <button className={`tg${moneda==='ARS'?' active':''}`} onClick={() => setMoneda('ARS')}>ARS/tn</button>
            <button className={`tg${moneda==='USD'?' active':''}`} onClick={() => setMoneda('USD')}>USD/tn</button>
          </div>
        </div>
      </div>

      <div className="tabs">
        {TABS.map(t => (
          <button key={t.id} className={`tab${activeTab===t.id?' active':''}`} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div>
        {activeTab==='resumen'      && <TabResumen      fobData={fobData} fobStatus={fobStatus} mundo={mundo} tc={tc} moneda={moneda}/>}
        {activeTab==='fob-fas'      && <TabFobFas       fobData={fobData} fobStatus={fobStatus} mundo={mundo}/>}
        {activeTab==='futuros'      && <TabFuturos      mundo={mundo}/>}
        {activeTab==='pizarras'     && <TabPizarras     fobData={fobData} mundo={mundo}/>}
        {activeTab==='subproductos' && <TabSubproductos fobData={fobData} mundo={mundo}/>}
        {activeTab==='historico'    && <TabHistorico    fobData={fobData} mundo={mundo}/>}
      </div>
    </div>
  );
}
