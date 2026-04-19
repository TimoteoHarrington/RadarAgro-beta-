// GranosPage.jsx — Rediseño completo
// Fuentes en vivo: FOB MAGyP (Ley 21.453) · CBOT Chicago (spot + contratos futuros)
// Sin SIO: requiere credenciales institucionales (no disponibles públicamente)
import React, { useState, useEffect, useMemo } from 'react';
import { fetchFOB, parseFuturosFromMundo } from '../../services/api';

import {
  GRANOS_PIZARRAS,
  GRANOS_FUTUROS,
  HIST_MESES, HIST_SOJA, HIST_MAIZ, HIST_TRIGO, HIST_GIRASOL,
  HIST_HARINA_SOJA, HIST_ACEITE_SOJA,
  HIST_BASIS_SOJA, HIST_BASIS_MAIZ, HIST_BASIS_TRIGO,
} from '../../data/granos.js';

// ─── NCM → clave interna ──────────────────────────────────────
const NCM_MAP = {
  '1201': 'soja',    '1005': 'maiz',       '1001': 'trigo',
  '1206': 'girasol', '1003': 'cebada',     '1007': 'sorgo',
  '2304': 'harina_soja', '1507': 'aceite_soja',
};

// ─── Meta granos ─────────────────────────────────────────────
const META = [
  { id:'soja',    nombre:'Soja',    icon:'🌱', cbotId:'soy',   fobKey:'soja',    fasRatio:0.778, ret:'33%', color:'#56c97a' },
  { id:'maiz',    nombre:'Maíz',    icon:'🌽', cbotId:'corn',  fobKey:'maiz',    fasRatio:0.899, ret:'12%', color:'#f0b840' },
  { id:'trigo',   nombre:'Trigo',   icon:'🌾', cbotId:'wheat', fobKey:'trigo',   fasRatio:0.902, ret:'12%', color:'#4d9ef0' },
  { id:'girasol', nombre:'Girasol', icon:'🌻', cbotId:null,    fobKey:'girasol', fasRatio:0.932, ret:'7%',  color:'#f0b840' },
  { id:'sorgo',   nombre:'Sorgo',   icon:'🌿', cbotId:null,    fobKey:'sorgo',   fasRatio:0.915, ret:'12%', color:'#9ca3af' },
  { id:'cebada',  nombre:'Cebada',  icon:'🌾', cbotId:null,    fobKey:'cebada',  fasRatio:0.916, ret:'12%', color:'#56c97a' },
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
    ref:  { c:'var(--text3)', bg:'var(--bg3)', dot:null, txt: label ?? 'REFERENCIA' },
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

// ─── Multi-series line chart ──────────────────────────────────
function LineChart({ series, labels, height=200 }) {
  const W=900, H=height, pad={t:14,r:20,b:28,l:46};
  const all=series.flatMap(s=>s.data.filter(v=>v!=null));
  if (!all.length) return null;
  const mn=Math.min(...all), mx=Math.max(...all), rng=mx-mn||1, n=labels.length;
  const xp=i=>pad.l+(i/(n-1))*(W-pad.l-pad.r);
  const yp=v=>pad.t+(1-(v-mn)/rng)*(H-pad.t-pad.b);
  const mk=d=>d.map((v,i)=>`${i===0?'M':'L'}${xp(i).toFixed(1)},${yp(v).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',height,display:'block'}}>
      {[0,.25,.5,.75,1].map(t=>{
        const y=pad.t+(1-t)*(H-pad.t-pad.b);
        return (
          <g key={t}>
            <line x1={pad.l} y1={y} x2={W-pad.r} y2={y} stroke="var(--line)" strokeWidth={1}/>
            <text x={pad.l-6} y={y+4} textAnchor="end" fontSize={8} fill="var(--text3)" fontFamily="monospace">{R(mn+t*rng)}</text>
          </g>
        );
      })}
      {labels.map((l,i)=>(
        <text key={i} x={xp(i)} y={H-4} textAnchor="middle" fontSize={8} fill="var(--text3)" fontFamily="monospace">{l}</text>
      ))}
      {series.map(s=>(
        <g key={s.label}>
          <path d={mk(s.data)+` L${xp(n-1).toFixed(1)},${yp(mn).toFixed(1)} L${xp(0).toFixed(1)},${yp(mn).toFixed(1)} Z`} fill={s.color} opacity={.07}/>
          <path d={mk(s.data)} fill="none" stroke={s.color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx={xp(n-1)} cy={yp(s.data[n-1])} r={3} fill={s.color}/>
        </g>
      ))}
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
        : <span style={{color:'var(--text3)',fontSize:10}}>FOB cargando…</span>
      }
      <span style={{color:'var(--line)'}}>·</span>
      {cbotOk
        ? <><Badge type="cbot"/><span style={{color:'var(--text3)',fontSize:10}}>CBOT Chicago · USD/tn spot + contratos via Yahoo Finance</span></>
        : <span style={{color:'var(--text3)',fontSize:10}}>CBOT cargando…</span>
      }
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB RESUMEN
// ─────────────────────────────────────────────────────────────
function TabResumen({ fobData, fobStatus, mundo, tc, moneda }) {
  const items = mundo?.items ?? [];
  const getCbot = id => items.find(i=>i.id===id) ?? null;

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

      {/* Cards */}
      <div className="grid grid-3" style={{marginBottom:28}}>
        {META.map(meta=>{
          const fobUSD = fobData?.precios?.[meta.fobKey] ?? null;
          const cbot   = meta.cbotId ? getCbot(meta.cbotId) : null;
          const fasUSD = fobUSD ? R(fobUSD*meta.fasRatio) : null;
          const precARS= fobUSD&&tc ? R(fobUSD*tc) : null;
          const change = cbot?.change ?? null;
          const precio = moneda==='ARS' ? fmtARS(precARS) : fmtUSD(fobUSD);
          const spark  = cbot?.sparkline?.slice(-20) ?? null;
          const isLive = !!fobUSD;
          return (
            <div key={meta.id} className="stat" style={{cursor:'default'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                <span style={{fontSize:13,color:'var(--text2)'}}>{meta.icon} {meta.nombre}</span>
                {isLive ? <Badge type="fob"/> : <Badge type="ref"/>}
              </div>
              <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',marginBottom:6}}>
                <div>
                  <div className="stat-val" style={{fontSize:22,marginBottom:4}}>
                    {isLive ? precio : <Skel w={100} h={22}/>}
                  </div>
                  <div style={{display:'flex',gap:6,alignItems:'center'}}>
                    {change!=null && <Pill v={change}/>}
                    {cbot?.price!=null && (
                      <span style={{fontFamily:'var(--mono)',fontSize:9,color:'#4d9ef0'}}>
                        CBOT {fmtUSD(cbot.price)}
                      </span>
                    )}
                  </div>
                </div>
                {spark && <Spark data={spark} color={meta.color}/>}
              </div>
              <div className="stat-meta" style={{display:'flex',flexDirection:'column',gap:2}}>
                {fobUSD!=null && <span>FOB {fmtUSD(fobUSD)} · FAS {fmtUSD(fasUSD)} · ret. {meta.ret}</span>}
                {moneda==='ARS' && fobUSD && tc && (
                  <span style={{color:'var(--text3)'}}>{fmtUSD(fobUSD)}/tn × TC {R(tc).toLocaleString('es-AR')}</span>
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
function BasisPanel({ fobData, mundo }) {
  const items = mundo?.items ?? [];
  const GRANOS_B = [
    {nombre:'Soja',  fobKey:'soja',  cbotId:'soy',  hist:HIST_BASIS_SOJA },
    {nombre:'Maíz',  fobKey:'maiz',  cbotId:'corn', hist:HIST_BASIS_MAIZ },
    {nombre:'Trigo', fobKey:'trigo', cbotId:'wheat',hist:HIST_BASIS_TRIGO},
  ];
  const data = GRANOS_B.map(g=>{
    const fob  = fobData?.precios?.[g.fobKey] ?? null;
    const cbot = items.find(i=>i.id===g.cbotId);
    const basis = (fob!=null && cbot?.price!=null) ? R(fob-cbot.price) : null;
    const bPct  = (fob!=null && cbot?.price!=null) ? ((fob-cbot.price)/cbot.price*100).toFixed(1) : null;
    const hUlt  = g.hist.slice(-1)[0];
    const delta = (basis!=null && hUlt!=null) ? basis-hUlt : null;
    return {...g,fob,cbot:cbot?.price??null,basis,bPct,delta};
  }).filter(g=>g.basis!=null);

  if (!data.length) return null;
  return (
    <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:12,padding:'16px 20px',marginBottom:24}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,fontFamily:'var(--mono)',fontSize:9,letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text3)'}}>
        <span>Basis en vivo — FOB MAGyP vs CBOT (USD/tn)</span>
        <Badge type="live"/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:`repeat(${data.length},1fr)`,gap:1,background:'var(--line)',borderRadius:8,overflow:'hidden'}}>
        {data.map(g=>{
          const d=dir(g.basis), dd=dir(g.delta);
          return (
            <div key={g.nombre} style={{background:'var(--bg2)',padding:'14px 16px',textAlign:'center'}}>
              <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--text3)',letterSpacing:'.06em',marginBottom:8}}>{g.nombre}</div>
              <div style={{fontFamily:'var(--mono)',fontSize:26,fontWeight:700,lineHeight:1,color:d==='up'?'var(--green)':d==='dn'?'var(--red)':'var(--text1)',marginBottom:6}}>
                {g.basis>0?'+':''}{g.basis}
              </div>
              <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--text3)',marginBottom:4}}>{g.bPct}% sobre CBOT</div>
              <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--text3)'}}>FOB {fmtUSD(g.fob)} · CBOT {fmtUSD(g.cbot)}</div>
              {g.delta!=null && (
                <div style={{marginTop:6,fontFamily:'var(--mono)',fontSize:9,color:dd==='up'?'var(--green)':dd==='dn'?'var(--red)':'var(--text3)'}}>
                  vs hist.: {g.delta>0?'+':''}{g.delta} USD
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{marginTop:10,fontFamily:'var(--mono)',fontSize:9,color:'var(--text3)'}}>
        Basis negativo → precio local inferior al CBOT por retenciones y logística · Basis positivo → demanda interna eleva el precio
      </div>
    </div>
  );
}

// ─── CBOT Snapshot ────────────────────────────────────────────
function CBOTSnapshot({ mundo }) {
  const items = mundo?.items ?? [];
  const IDS   = ['soy','corn','wheat','soymeal','soyoil'];
  const NOMBRES = {soy:'Soja',corn:'Maíz',wheat:'Trigo CBOT',soymeal:'Harina Soja',soyoil:'Aceite Soja'};
  const rows = IDS.map(id=>items.find(i=>i.id===id)).filter(Boolean).filter(i=>i.price!=null);
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
            {rows.map(item=>(
              <tr key={item.id}>
                <td className="bold">{NOMBRES[item.id]}</td>
                <td className="r w mono">{fmtUSD(item.price)}</td>
                <td className="r"><Pill v={item.change}/></td>
                <td className="r dim mono">{fmtUSD(item.prevClose)}</td>
                <td style={{paddingTop:4,paddingBottom:4}}>
                  <Spark data={item.sparkline?.slice(-30)} color={item.change>=0?'var(--green)':'var(--red)'} w={70} h={24}/>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="source">Fuente: CME Group · Yahoo Finance · conversión a USD/tn por factor estándar</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB FOB / FAS
// ─────────────────────────────────────────────────────────────
function TabFobFas({ fobData, fobStatus, mundo }) {
  const items = mundo?.items ?? [];
  const FOB_ROWS = [
    {id:'soja',       nombre:'Soja',        fobKey:'soja',        cbotId:'soy',     fasRatio:0.778, ret:'33%', nota:'Puerto Rosario'},
    {id:'harina',     nombre:'Harina Soja', fobKey:'harina_soja', cbotId:'soymeal', fasRatio:null,  ret:'—',   nota:'47% proteína'},
    {id:'aceite',     nombre:'Aceite Soja', fobKey:'aceite_soja', cbotId:'soyoil',  fasRatio:null,  ret:'—',   nota:'USD/tn exportación'},
    {id:'maiz',       nombre:'Maíz',        fobKey:'maiz',        cbotId:'corn',    fasRatio:0.899, ret:'12%', nota:'Puerto Rosario'},
    {id:'trigo',      nombre:'Trigo',       fobKey:'trigo',       cbotId:'wheat',   fasRatio:0.902, ret:'12%', nota:'Puerto Rosario'},
    {id:'girasol',    nombre:'Girasol',     fobKey:'girasol',     cbotId:null,      fasRatio:0.932, ret:'7%',  nota:'Bahía Blanca'},
    {id:'sorgo',      nombre:'Sorgo',       fobKey:'sorgo',       cbotId:null,      fasRatio:0.915, ret:'12%', nota:'Puerto Rosario'},
    {id:'cebada',     nombre:'Cebada',      fobKey:'cebada',      cbotId:null,      fasRatio:0.916, ret:'12%', nota:'Calidad forrajera'},
  ];

  const rows = useMemo(()=>FOB_ROWS.map(row=>{
    const fob   = fobData?.precios?.[row.fobKey] ?? null;
    const cbot  = row.cbotId ? items.find(i=>i.id===row.cbotId) : null;
    const varF  = cbot?.change ?? null;
    const fas   = (fob&&row.fasRatio) ? R(fob*row.fasRatio) : null;
    const basis = (fob&&cbot?.price)  ? R(fob-cbot.price)   : null;
    return {...row,fob,fas,varF,varFas:varF!=null?Math.round(varF*.9*10)/10:null,basis};
  }).filter(r=>r.fob!=null),[fobData,mundo]);

  if (fobStatus==='loading')
    return <div style={{padding:'40px 0',textAlign:'center',color:'var(--text3)',fontSize:13}}>Cargando precios FOB desde MAGyP…</div>;

  if (fobStatus==='error'||!rows.length)
    return (
      <div style={{padding:'32px 0'}}>
        <div className="alert-strip error" style={{maxWidth:520,margin:'0 auto'}}>
          <span className="alert-icon">⚠</span>
          <span className="alert-text">
            No se pudieron obtener precios FOB desde MAGyP (Ley 21.453).
            El servidor suele estar sin datos en fines de semana y feriados.
            El sistema reintenta automáticamente con el último día hábil disponible.
          </span>
        </div>
      </div>
    );

  return (
    <div>
      <div className="alert-strip info" style={{marginBottom:20}}>
        <span className="alert-icon">ℹ</span>
        <span className="alert-text">
          <strong>FOB</strong> (Free On Board) y <strong>FAS</strong> (Free Alongside Ship) en <strong>USD/tn</strong>.
          {' '}Fuente: <strong>MAGyP · Ley 21.453</strong> · <Badge type="fob"/> · <strong>{fobData?.fecha??'—'}</strong>
          {fobData?.diasAtras>0 && <span style={{color:'var(--text3)'}}> · ({fobData.diasAtras}d de retraso)</span>}
        </span>
      </div>
      <div className="tbl-wrap">
        <div className="tbl-scroll">
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th className="r">FOB (USD/tn)</th>
                <th className="r">FAS (USD/tn)</th>
                <th className="r">Var. CBOT</th>
                <th className="r">Basis USD</th>
                <th className="r">Retención</th>
                <th>Puerto</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row=>(
                <tr key={row.id}>
                  <td className="bold">{row.nombre}</td>
                  <td className="r w mono">{fmtUSD(row.fob)}</td>
                  <td className="r mono">{row.fas!=null?fmtUSD(row.fas):<span className="dim">—</span>}</td>
                  <td className="r">{row.varF!=null?<Pill v={row.varF}/>:<span className="dim">—</span>}</td>
                  <td className="r">
                    {row.basis!=null
                      ? <span style={{fontFamily:'var(--mono)',fontSize:11,fontWeight:600,color:row.basis>0?'var(--green)':row.basis<0?'var(--red)':'var(--text3)'}}>
                          {row.basis>0?'+':''}{row.basis}
                        </span>
                      : <span className="dim">—</span>
                    }
                  </td>
                  <td className="r dim mono">{row.ret}</td>
                  <td className="dim" style={{fontSize:11}}>{row.nota}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="source" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span>Fuente: MAGyP · Posición Arancelaria NCM · {fobData?.fecha??''}</span>
        <Badge type="fob"/>
      </div>
      <div style={{marginTop:16,background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:10,padding:'12px 16px',fontSize:11,color:'var(--text3)',fontFamily:'var(--mono)'}}>
        <strong style={{color:'var(--text2)'}}>FOB</strong> = precio puesto en el barco (base de retenciones) ·
        <strong style={{color:'var(--text2)'}}> FAS</strong> = precio al costado del barco (lo que recibe el exportador) ·
        <strong style={{color:'var(--text2)'}}> Basis</strong> = FOB − CBOT (diferencial local/internacional)
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB FUTUROS CBOT
// ─────────────────────────────────────────────────────────────
function TabFuturos({ mundo }) {
  const [activo, setActivo] = useState('soja');
  const items = mundo?.items ?? [];
  const SPOT_IDS = {soja:'soy',maiz:'corn',trigo:'wheat'};
  const spotItem = items.find(i=>i.id===SPOT_IDS[activo]);
  const futurosVivos = parseFuturosFromMundo(items);
  const contratos = futurosVivos[activo] ?? [];
  const matba = GRANOS_FUTUROS.find(g=>g.id===activo)?.matba ?? [];

  // Estructura de plazos para gráfico de barras
  const curva = [
    spotItem?.price!=null ? {label:'Spot',precio:spotItem.price,live:true} : null,
    ...contratos.map(c=>({label:c.contrato,precio:c.precio,live:true})),
  ].filter(Boolean);

  const subprod = ['soymeal','soyoil']
    .map(id=>({id,item:items.find(i=>i.id===id)}))
    .filter(s=>s.item?.price!=null);

  return (
    <div>
      <div className="toggle" style={{marginBottom:20}}>
        {[{id:'soja',n:'Soja'},{id:'maiz',n:'Maíz'},{id:'trigo',n:'Trigo'}].map(c=>(
          <button key={c.id} className={`tg${activo===c.id?' active':''}`} onClick={()=>setActivo(c.id)}>{c.n}</button>
        ))}
      </div>

      <div className="grid grid-2" style={{marginBottom:24}}>
        {/* CBOT en vivo */}
        <div>
          <div className="section-title" style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
            CBOT Chicago (USD/tn) <Badge type="cbot"/>
          </div>
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>Contrato</th><th className="r">USD/tn</th><th className="r">Var. %</th></tr></thead>
              <tbody>
                {spotItem?.price!=null && (
                  <tr style={{background:'var(--bg2)'}}>
                    <td className="bold" style={{color:'var(--accent)'}}>
                      SPOT <span style={{fontFamily:'var(--mono)',fontSize:8,color:'#4d9ef0'}}>● FRENTE</span>
                    </td>
                    <td className="r w mono">{fmtUSD(spotItem.price)}</td>
                    <td className="r"><Pill v={spotItem.change}/></td>
                  </tr>
                )}
                {contratos.length>0
                  ? contratos.map(c=>(
                    <tr key={c.id}>
                      <td className="bold">{c.contrato}</td>
                      <td className="r w mono">{fmtUSD(c.precio)}</td>
                      <td className="r">{c.change!=null?<Pill v={c.change}/>:<span className="dim">—</span>}</td>
                    </tr>
                  ))
                  : <tr><td colSpan={3} style={{color:'var(--text3)',fontSize:12,textAlign:'center',padding:'14px 0'}}>Cargando contratos…</td></tr>
                }
              </tbody>
            </table>
          </div>
          <div className="source" style={{display:'flex',justifyContent:'space-between'}}>
            <span>CME Group · Yahoo Finance</span>
            <Badge type="cbot"/>
          </div>
        </div>

        {/* Matba-Rofex referencia */}
        <div>
          <div className="section-title" style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
            Matba-Rofex (ARS/tn) <Badge type="ref"/>
          </div>
          {matba.length===0
            ? <div style={{color:'var(--text3)',fontSize:13,padding:'16px 0'}}>Sin contratos Matba-Rofex para este producto.</div>
            : <div className="tbl-wrap">
                <table>
                  <thead><tr><th>Contrato</th><th className="r">ARS/tn</th><th className="r">Var. %</th></tr></thead>
                  <tbody>
                    {matba.map(f=>(
                      <tr key={f.contrato}>
                        <td className="bold">{f.contrato}</td>
                        <td className="r w mono">{fmtARS(f.precio)}</td>
                        <td className="r"><Pill v={f.varPct}/></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          }
          <div className="source">Matba-Rofex · datos de referencia (sin API pública disponible)</div>
        </div>
      </div>

      {/* Estructura de plazos */}
      {curva.length>=2 && (
        <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:12,overflow:'hidden',marginBottom:24}}>
          <div style={{padding:'12px 20px 10px',borderBottom:'1px solid var(--line)',display:'flex',justifyContent:'space-between'}}>
            <div style={{fontFamily:'var(--mono)',fontSize:9,letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text3)'}}>
              Estructura de plazos — {activo.charAt(0).toUpperCase()+activo.slice(1)} CBOT · USD/tn
            </div>
            <Badge type="cbot"/>
          </div>
          <div style={{padding:'20px 24px 16px'}}>
            <div style={{display:'flex',gap:8,alignItems:'flex-end',height:90}}>
              {curva.map((c,i)=>{
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
            {curva.length>=2 && (
              <div style={{marginTop:12,fontFamily:'var(--mono)',fontSize:9,color:'var(--text3)'}}>
                {curva.slice(-1)[0].precio>curva[0].precio
                  ? 'Curva en contango (futuros > spot): mercado anticipa mayor precio futuro.'
                  : 'Curva en backwardation (futuros < spot): mayor demanda inmediata que futura.'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Subproductos CBOT */}
      {subprod.length>0 && (
        <div>
          <div className="section-title" style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
            Subproductos soja · CBOT spot <Badge type="cbot"/>
          </div>
          <div className="grid grid-2">
            {subprod.map(s=>{
              const NOMS={soymeal:'Harina Soja',soyoil:'Aceite Soja'};
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
// ─────────────────────────────────────────────────────────────
function TabPizarras({ fobData, mundo }) {
  const items = mundo?.items ?? [];
  const CBOT_MAP = {Soja:'soy',Maíz:'corn',Trigo:'wheat'};
  return (
    <div>
      <div className="alert-strip info" style={{marginBottom:20}}>
        <span className="alert-icon">ℹ</span>
        <span className="alert-text">
          Precios por ciudad: datos de <strong>referencia orientativa</strong> (sin API pública disponible).
          Para precios del mercado interno en tiempo real se requiere acceso institucional al <strong>SIO Granos</strong>.
          Los precios FOB en vivo y el CBOT están disponibles en las otras pestañas.
        </span>
      </div>
      <div className="tbl-wrap">
        <div className="tbl-scroll">
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th className="r">Rosario ref.</th>
                <th className="r">Bs. As. ref.</th>
                <th className="r">Bahía ref.</th>
                <th className="r">Quequén ref.</th>
                <th className="r">Var. %</th>
                <th className="r">FOB vivo</th>
                <th className="r">CBOT vivo</th>
              </tr>
            </thead>
            <tbody>
              {GRANOS_PIZARRAS.map(g=>{
                const cbotItem = items.find(i=>i.id===CBOT_MAP[g.producto]);
                const fobLive  = fobData?.precios?.[g.producto.toLowerCase()] ?? null;
                return (
                  <tr key={g.producto}>
                    <td className="bold">{g.producto}</td>
                    <td className="r mono">{g.rosario?fmtARS(g.rosario):<span className="dim">—</span>}</td>
                    <td className="r mono">{g.bsas   ?fmtARS(g.bsas)   :<span className="dim">—</span>}</td>
                    <td className="r mono">{g.bahia  ?fmtARS(g.bahia)  :<span className="dim">—</span>}</td>
                    <td className="r mono">{g.queq   ?fmtARS(g.queq)   :<span className="dim">—</span>}</td>
                    <td className="r"><Pill v={g.varPct}/></td>
                    <td className="r">
                      {fobLive
                        ? <span style={{fontFamily:'var(--mono)',fontSize:11,fontWeight:700,color:'var(--green)'}}>{fmtUSD(fobLive)}</span>
                        : <span className="dim">—</span>
                      }
                    </td>
                    <td className="r">
                      {cbotItem?.price!=null
                        ? <span style={{fontFamily:'var(--mono)',fontSize:11,color:'#4d9ef0'}}>{fmtUSD(cbotItem.price)} <Pill v={cbotItem.change}/></span>
                        : <span className="dim">—</span>
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div className="source">Pizarras: referencia orientativa · FOB: MAGyP en vivo · CBOT: Yahoo Finance en vivo</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB SUBPRODUCTOS
// ─────────────────────────────────────────────────────────────
function TabSubproductos({ fobData, mundo }) {
  const items = mundo?.items ?? [];
  const hF    = fobData?.precios?.harina_soja ?? null;
  const aF    = fobData?.precios?.aceite_soja  ?? null;
  const hFut  = items.find(i=>i.id==='soymeal');
  const aFut  = items.find(i=>i.id==='soyoil');
  const sF    = fobData?.precios?.soja ?? null;
  const gF    = fobData?.precios?.girasol ?? null;
  const crush = (hF!=null&&aF!=null&&sF!=null) ? R(hF*.79+aF*.19-sF) : null;

  const CARDS = [
    {label:'Harina Soja FOB',   v:hF!=null  ?fmtUSD(hF)              :'—', var:hFut?.change??null, live:!!hF,   un:'USD/tn'},
    {label:'Aceite Soja FOB',   v:aF!=null  ?fmtUSD(aF)              :'—', var:aFut?.change??null, live:!!aF,   un:'USD/tn'},
    {label:'Harina Soja CBOT',  v:hFut?.price!=null?fmtUSD(hFut.price):'—', var:hFut?.change??null, live:!!hFut, un:'USD/tn spot'},
    {label:'Aceite Soja CBOT',  v:aFut?.price!=null?fmtUSD(aFut.price):'—', var:aFut?.change??null, live:!!aFut, un:'USD/tn spot'},
  ];

  return (
    <div>
      <div className="section-title" style={{display:'flex',alignItems:'center',gap:8}}>
        Complejo Sojero <Badge type={(hF||aF)?'fob':'ref'}/>
      </div>
      <div className="grid grid-4" style={{marginBottom:24}}>
        {CARDS.map(item=>(
          <div key={item.label} className="stat" style={{cursor:'default'}}>
            <div style={{fontSize:12,fontWeight:400,color:'var(--text2)',marginBottom:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span>{item.label}</span>
              {item.live
                ? <Badge type={item.label.includes('CBOT')?'cbot':'fob'}/>
                : <Badge type="ref"/>
              }
            </div>
            <div className="stat-val" style={{fontSize:20,marginBottom:8}}>{item.v}</div>
            <div className="stat-meta">{item.var!=null&&<Pill v={item.var}/>} {item.un}</div>
          </div>
        ))}
      </div>

      {/* Crush margin */}
      <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:12,padding:'16px 20px',marginBottom:24}}>
        <div style={{fontFamily:'var(--mono)',fontSize:9,letterSpacing:'.12em',textTransform:'uppercase',color:'var(--text3)',marginBottom:12}}>
          Relación Crush Soja {sF?'— datos en vivo':''}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:1,background:'var(--line)',borderRadius:8,overflow:'hidden'}}>
          {[
            {label:'Crush Margin',   v:crush!=null?`USD ${crush}`:'—',                              sub:'USD/tn procesada'},
            {label:'Harina/Aceite',  v:(hF&&aF)?`${(hF/aF).toFixed(2)}×`:'—',                      sub:'ratio precio'},
            {label:'Soja Grano FOB', v:sF!=null?fmtUSD(sF):'—',                                     sub:hF?`vs ${fmtUSD(R(hF))} harina`:'USD/tn'},
          ].map(item=>(
            <div key={item.label} style={{background:'var(--bg1)',padding:'12px 16px',textAlign:'center'}}>
              <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--text3)',letterSpacing:'.06em',marginBottom:6}}>{item.label}</div>
              <div style={{fontFamily:'var(--mono)',fontSize:18,fontWeight:700,color:'var(--accent)'}}>{item.v}</div>
              <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--text3)',marginTop:3}}>{item.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Gráfico */}
      <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:12,overflow:'hidden',marginBottom:28}}>
        <div style={{padding:'14px 20px 12px',borderBottom:'1px solid var(--line)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{fontFamily:'var(--mono)',fontSize:9,letterSpacing:'.12em',textTransform:'uppercase',color:'var(--text3)'}}>Subproductos Soja · USD/tn · 12 meses</div>
          <div style={{display:'flex',gap:16}}>
            {[['Harina Soja','#56c97a'],['Aceite Soja ÷10','#4d9ef0']].map(([l,c])=>(
              <div key={l} style={{display:'flex',alignItems:'center',gap:6}}>
                <div style={{width:20,height:2,background:c,borderRadius:1}}/>
                <span style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--text3)'}}>{l}</span>
              </div>
            ))}
          </div>
        </div>
        <LineChart series={[{data:HIST_HARINA_SOJA,color:'#56c97a',label:'Harina'},{data:HIST_ACEITE_SOJA.map(v=>v/10),color:'#4d9ef0',label:'Aceite'}]} labels={HIST_MESES} height={180}/>
      </div>

      {/* Girasol */}
      <div className="section-title" style={{marginTop:4}}>Complejo Girasol</div>
      <div className="grid grid-2">
        <div className="stat" style={{cursor:'default'}}>
          <div style={{fontSize:13,fontWeight:400,color:'var(--text2)',marginBottom:8}}>Aceite Girasol FOB</div>
          <div className="stat-val" style={{fontSize:20,marginBottom:10}}>—</div>
          <div className="stat-meta">USD/tn · sin API pública disponible</div>
        </div>
        <div className="stat" style={{cursor:'default'}}>
          <div style={{fontSize:13,fontWeight:400,color:'var(--text2)',marginBottom:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            Girasol Grano FOB {gF?<Badge type="fob"/>:<Badge type="ref"/>}
          </div>
          <div className="stat-val" style={{fontSize:20,marginBottom:10}}>{gF!=null?fmtUSD(gF):'—'}</div>
          <div className="stat-meta">Retención 7% · Bahía Blanca</div>
        </div>
      </div>
      <div className="source" style={{marginTop:10,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span>Fuente: MAGyP · CME Group</span>
        <Badge type={(hF||aF||hFut)?'fob':'ref'}/>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB HISTÓRICO
// ─────────────────────────────────────────────────────────────
function TabHistorico({ fobData, mundo }) {
  const [vista, setVista] = useState('granos');
  const items = mundo?.items ?? [];
  const cS=items.find(i=>i.id==='soy'), cM=items.find(i=>i.id==='corn'), cT=items.find(i=>i.id==='wheat');
  const hS=cS?.price?[...HIST_SOJA.slice(0,-1), R(cS.price)]:HIST_SOJA;
  const hM=cM?.price?[...HIST_MAIZ.slice(0,-1), R(cM.price)]:HIST_MAIZ;
  const hT=cT?.price?[...HIST_TRIGO.slice(0,-1),R(cT.price)]:HIST_TRIGO;
  const hasLive=!!(cS||cM||cT);

  const bS = (fobData?.precios?.soja  && cS?.price) ? R(fobData.precios.soja -cS.price) : null;
  const bM = (fobData?.precios?.maiz  && cM?.price) ? R(fobData.precios.maiz -cM.price) : null;
  const bT = (fobData?.precios?.trigo && cT?.price) ? R(fobData.precios.trigo-cT.price) : null;
  const hBS=bS!=null?[...HIST_BASIS_SOJA.slice(0,-1), bS]:HIST_BASIS_SOJA;
  const hBM=bM!=null?[...HIST_BASIS_MAIZ.slice(0,-1), bM]:HIST_BASIS_MAIZ;
  const hBT=bT!=null?[...HIST_BASIS_TRIGO.slice(0,-1),bT]:HIST_BASIS_TRIGO;
  const hasBL=bS!=null||bM!=null||bT!=null;

  const SG=[
    {data:hS,color:'#56c97a',label:'Soja'},
    {data:hM,color:'#f0b840',label:'Maíz'},
    {data:hT,color:'#4d9ef0',label:'Trigo'},
    {data:HIST_GIRASOL.map(v=>v/2),color:'#f07070',label:'Girasol ÷2'},
  ];
  const SB=[
    {data:hBS,color:'#56c97a',label:'Basis Soja'},
    {data:hBM,color:'#f0b840',label:'Basis Maíz'},
    {data:hBT,color:'#4d9ef0',label:'Basis Trigo'},
  ];
  const series=vista==='granos'?SG:SB;

  return (
    <div>
      <div className="row-flex" style={{marginBottom:20}}>
        <div className="toggle">
          <button className={`tg${vista==='granos'?' active':''}`} onClick={()=>setVista('granos')}>Precios USD/tn</button>
          <button className={`tg${vista==='basis' ?' active':''}`} onClick={()=>setVista('basis')}>Basis vs CBOT</button>
        </div>
      </div>
      <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:12,overflow:'hidden'}}>
        <div style={{padding:'14px 20px 12px',borderBottom:'1px solid var(--line)',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
          <div style={{fontFamily:'var(--mono)',fontSize:9,letterSpacing:'.12em',textTransform:'uppercase',color:'var(--text3)'}}>
            {vista==='granos'
              ? 'Evolución de precios — USD/tn · CBOT · últimos 12 meses'
              : 'Basis histórico — FOB MAGyP vs CBOT · USD/tn · últimos 12 meses'}
          </div>
          <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'center'}}>
            {vista==='granos'&&hasLive&&<Badge type="cbot"/>}
            {vista==='basis' &&hasBL  &&<Badge type="live"/>}
            {series.map(s=>(
              <div key={s.label} style={{display:'flex',alignItems:'center',gap:6}}>
                <div style={{width:20,height:2,background:s.color,borderRadius:1}}/>
                <span style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--text3)'}}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
        <LineChart series={series} labels={HIST_MESES} height={220}/>
        {vista==='granos' && (
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:1,background:'var(--line)',borderTop:'1px solid var(--line)'}}>
            {[
              ['Soja prom. 6m',  `USD ${R(hS.slice(-6).reduce((a,b)=>a+b,0)/6)}`,  '#56c97a', `hoy: USD ${hS.slice(-1)[0]}`],
              ['Maíz prom. 6m',  `USD ${R(hM.slice(-6).reduce((a,b)=>a+b,0)/6)}`,  '#f0b840', `hoy: USD ${hM.slice(-1)[0]}`],
              ['Trigo prom. 6m', `USD ${R(hT.slice(-6).reduce((a,b)=>a+b,0)/6)}`,  '#4d9ef0', `hoy: USD ${hT.slice(-1)[0]}`],
              ['Soja/Maíz',      `${(hS.slice(-1)[0]/hM.slice(-1)[0]).toFixed(2)}×`,'var(--text1)','relación actual'],
            ].map(([l,v,c,m])=>(
              <div key={l} style={{background:'var(--bg2)',padding:'10px 14px',textAlign:'center'}}>
                <div style={{fontFamily:'var(--mono)',fontSize:8,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:4}}>{l}</div>
                <div style={{fontFamily:'var(--mono)',fontSize:14,fontWeight:700,color:c}}>{v}</div>
                <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--text3)'}}>{m}</div>
              </div>
            ))}
          </div>
        )}
        {vista==='basis' && (
          <div style={{background:'var(--bg2)',borderTop:'1px solid var(--line)',padding:'12px 20px',fontSize:11,color:'var(--text3)',fontFamily:'var(--mono)'}}>
            Basis negativo (soja/trigo): precio local bajo el internacional por retenciones y logística. ·
            Basis positivo (maíz): demanda interna eleva el precio sobre el referencial CBOT.
            {hasBL&&' · Último punto del mes actualizado en vivo con FOB + CBOT.'}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────
const TABS = [
  {id:'resumen',      label:'Resumen'     },
  {id:'fob-fas',      label:'FOB / FAS'   },
  {id:'futuros',      label:'Futuros CBOT'},
  {id:'pizarras',     label:'Pizarras'    },
  {id:'subproductos', label:'Subproductos'},
  {id:'historico',    label:'Histórico'   },
];

export function GranosPage({ goPage, dolares, mundo, loadMundo }) {
  const [moneda,    setMoneda]    = useState('ARS');
  const [activeTab, setActiveTab] = useState('resumen');
  const [fobData,   setFobData]   = useState(null);
  const [fobStatus, setFobStatus] = useState('loading');

  useEffect(()=>{
    setFobStatus('loading');
    fetchFOB()
      .then(({data})=>{
        if (data?.ok && Array.isArray(data.precios_raw)) {
          const precios={};
          data.precios_raw.forEach(item=>{
            const key=NCM_MAP[String(item.posicion??'').substring(0,4)];
            if (key&&!precios[key]) precios[key]=item.precio;
          });
          setFobData({precios,fecha:data.fecha,diasAtras:data.diasAtras??0});
          setFobStatus('ok');
        } else {
          setFobStatus('error');
        }
      })
      .catch(()=>setFobStatus('error'));
    if (!mundo&&loadMundo) loadMundo();
  },[]);

  const tc     = dolares?.pOf ?? null;
  const cbotOk = !!(mundo?.items?.find(i=>i.id==='soy')?.price);

  return (
    <div className="page-enter">
      <div className="ph">
        <div>
          <div className="ph-title">
            Granos{' '}
            <span className="help-pip" onClick={()=>goPage('ayuda','glosario-granos')} title="Ayuda">?</span>
          </div>
          <div className="ph-sub" style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
            <span>FOB/FAS MAGyP · CBOT Chicago · Futuros · Basis · Subproductos</span>
            {fobStatus==='ok'      && <><Badge type="fob"/><span style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--text3)'}}>{fobData?.fecha}</span></>}
            {fobStatus==='loading' && <span style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--text3)'}}>cargando FOB…</span>}
            {cbotOk                && <Badge type="cbot"/>}
          </div>
        </div>
        <div className="ph-right">
          <div className="toggle">
            <button className={`tg${moneda==='ARS'?' active':''}`} onClick={()=>setMoneda('ARS')}>ARS/tn</button>
            <button className={`tg${moneda==='USD'?' active':''}`} onClick={()=>setMoneda('USD')}>USD/tn</button>
          </div>
        </div>
      </div>

      <div className="tabs">
        {TABS.map(t=>(
          <button key={t.id} className={`tab${activeTab===t.id?' active':''}`} onClick={()=>setActiveTab(t.id)}>
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
