// GranosPage.jsx — Rediseñado
// Fuentes en vivo: FOB MAGyP (Ley 21.453) · CBOT Chicago (spot + contratos futuros)
// Enfocado en lo que necesita ver un productor: precio neto, basis, retenciones, FAS estimado
import React, { useState, useEffect, useMemo } from 'react';
import { fetchFOB, parseFuturosFromMundo } from '../../services/api';
import { NCM_MAP } from '../../data/granos.js';

// Retenciones vigentes — Decreto 877/2025
const GRANOS = [
  { id:'soja',    nombre:'Soja',    fobKey:'soja',       cbotId:'soy',     color:'#56c97a', ret: 0.24  },
  { id:'maiz',    nombre:'Maíz',    fobKey:'maiz',       cbotId:'corn',    color:'#f0b840', ret: 0.085 },
  { id:'trigo',   nombre:'Trigo',   fobKey:'trigo',      cbotId:'wheat',   color:'#4d9ef0', ret: 0.075 },
  { id:'girasol', nombre:'Girasol', fobKey:'girasol',    cbotId:null,      color:'#f0b840', ret: 0.045 },
  { id:'sorgo',   nombre:'Sorgo',   fobKey:'sorgo',      cbotId:null,      color:'#9ca3af', ret: 0.085 },
  { id:'cebada',  nombre:'Cebada',  fobKey:'cebada',     cbotId:null,      color:'#56c97a', ret: 0.075 },
];

// FAS estimado = FOB × (1 - retención) × 0.975 (ajuste gastos exportación ~2.5%)
const calcFasEstimado = (fob, ret) => fob != null ? Math.round(fob * (1 - ret) * 0.975) : null;

const R   = n => Math.round(n);
const fmtUSD = v => v == null ? '—' : `USD\u00a0${Number(v).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;
const fmtARS = v => v == null ? '—' : `$\u00a0${R(v).toLocaleString('es-AR')}`;
const fmtPct = v => {
  if (v == null) return '—';
  const s = Math.abs(v).toFixed(1);
  return v > 0 ? `+${s}%` : v < 0 ? `\u2212${s}%` : '0%';
};
const dir = v => v == null ? 'fl' : v > 0 ? 'up' : v < 0 ? 'dn' : 'fl';

function Pill({ v }) {
  const d = dir(v);
  return (
    <span className={`stat-badge ${d}`} style={{ fontSize: 10 }}>
      {fmtPct(v)}
    </span>
  );
}

function Badge({ type = 'live', label, fecha }) {
  const S = {
    live: { c:'var(--green)', bg:'var(--green-bg)', dot:'var(--green)', txt:'EN VIVO' },
    fob:  { c:'var(--green)', bg:'var(--green-bg)', dot:'var(--green)', txt:'FOB' },
    cbot: { c:'#4d9ef0', bg:'rgba(77,158,240,.12)', dot:'#4d9ef0', txt:'CBOT' },
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
      {s.dot && <span style={{ width:5, height:5, borderRadius:'50%', background:s.dot, display:'inline-block' }}/>}
      {s.txt}{fecha ? ` \u00b7 ${fecha}` : ''}
    </span>
  );
}

const Skel = ({ w='60%', h=14, mb=0 }) => (
  <div style={{ height:h, background:'var(--bg3)', borderRadius:4, width:w, marginBottom:mb, opacity:.5 }}/>
);

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

// ─── TAB RESUMEN ──────────────────────────────────────────────
function TabResumen({ fobData, fobStatus, mundo, tc, moneda }) {
  const items = mundo?.items ?? [];

  if (fobStatus === 'loading' && !fobData) {
    return (
      <div className="grid grid-3">
        {[0,1,2,3,4,5].map(i => (
          <div key={i} className="stat" style={{cursor:'default'}}>
            <Skel w="55%" h={12} mb={16}/><Skel w="75%" h={28} mb={10}/><Skel w="45%" h={10}/>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-3" style={{marginBottom:24}}>
        {GRANOS.map(g => {
          const fobUSD = fobData?.precios?.[g.fobKey] ?? null;
          const cbot   = g.cbotId ? items.find(i => i.id === g.cbotId) : null;
          const fasUSD = calcFasEstimado(fobUSD, g.ret);
          const fasARS = fasUSD && tc ? R(fasUSD * tc) : null;
          const spark  = cbot?.sparkline?.slice(-20) ?? null;
          const isLive = !!fobUSD;
          const fobDisplay = moneda === 'ARS'
            ? fmtARS(fobUSD && tc ? R(fobUSD * tc) : null)
            : fmtUSD(fobUSD);
          const fasDisplay = moneda === 'ARS' ? fmtARS(fasARS) : fmtUSD(fasUSD);

          return (
            <div key={g.id} className="stat" style={{cursor:'default'}}>
              <div className="stat-label">
                <span style={{fontSize:13, fontWeight:500, color:'var(--text2)'}}>{g.nombre}</span>
                {isLive ? <Badge type="fob"/> : <Badge type="ref"/>}
              </div>

              <div className="stat-val" style={{fontSize:26, marginBottom:4}}>
                {isLive ? fobDisplay : <span style={{color:'var(--text3)', fontSize:13}}>Sin datos</span>}
              </div>

              <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8}}>
                <div style={{display:'flex', gap:6, alignItems:'center', flexWrap:'wrap'}}>
                  {cbot?.change != null && <Pill v={cbot.change}/>}
                  {cbot?.price != null && (
                    <span style={{fontFamily:'var(--mono)', fontSize:9, color:'#4d9ef0'}}>
                      CBOT {fmtUSD(cbot.price)}
                    </span>
                  )}
                </div>
                {spark && <Spark data={spark} color={g.color}/>}
              </div>

              <div className="stat-meta">
                {isLive && fasUSD && (
                  <span style={{
                    display:'inline-flex', alignItems:'center', gap:5,
                    fontFamily:'var(--mono)', fontSize:10, color:'var(--text2)',
                    background:'var(--bg3)', padding:'2px 8px', borderRadius:4,
                    border:'1px solid var(--line)', marginBottom:4,
                  }}>
                    <span style={{color:'var(--text3)'}}>FAS est.</span>
                    <span style={{fontWeight:600}}>{fasDisplay}</span>
                    <span style={{color:'var(--text3)'}}>· ret. {(g.ret*100).toFixed(0)}%</span>
                  </span>
                )}
                {fobUSD && (
                  <div style={{marginTop:4}}>
                    FOB {fmtUSD(fobUSD)}/tn · {fobData?.fecha}
                    {fobData?.diasAtras > 0 && <span style={{color:'var(--text3)'}}> (−{fobData.diasAtras}d)</span>}
                  </div>
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

// ─── PANEL BASIS ──────────────────────────────────────────────
function BasisPanel({ fobData, mundo }) {
  const items = mundo?.items ?? [];
  const PARES = [
    {nombre:'Soja',  fobKey:'soja',  cbotId:'soy',   color:'#56c97a'},
    {nombre:'Maíz',  fobKey:'maiz',  cbotId:'corn',  color:'#f0b840'},
    {nombre:'Trigo', fobKey:'trigo', cbotId:'wheat', color:'#4d9ef0'},
  ];
  const data = PARES.map(g => {
    const fob  = fobData?.precios?.[g.fobKey] ?? null;
    const cbot = items.find(i => i.id === g.cbotId);
    const basis = (fob != null && cbot?.price != null) ? R(fob - cbot.price) : null;
    const bPct  = (fob != null && cbot?.price != null) ? ((fob - cbot.price) / cbot.price * 100).toFixed(1) : null;
    return { ...g, fob, cbot: cbot?.price ?? null, basis, bPct };
  }).filter(g => g.basis != null);

  if (!data.length) return null;

  return (
    <div style={{background:'var(--bg1)', border:'1px solid var(--line)', borderRadius:12, padding:'18px 20px', marginBottom:20}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
        <div>
          <div style={{fontFamily:'var(--mono)', fontSize:9, letterSpacing:'.1em', textTransform:'uppercase', color:'var(--text3)'}}>
            Basis en vivo — FOB MAGyP vs CBOT (USD/tn)
          </div>
          <div style={{fontSize:11, color:'var(--text2)', marginTop:3}}>
            Diferencial precio local vs Chicago · positivo = premio local
          </div>
        </div>
        <Badge type="live"/>
      </div>
      <div style={{display:'grid', gridTemplateColumns:`repeat(${data.length},1fr)`, gap:12}}>
        {data.map(g => {
          const d = dir(g.basis);
          const c = d === 'up' ? 'var(--green)' : d === 'dn' ? 'var(--red)' : 'var(--text3)';
          return (
            <div key={g.nombre} style={{
              background:'var(--bg2)', borderRadius:10, padding:'16px',
              border:'1px solid var(--line)', textAlign:'center',
            }}>
              <div style={{fontFamily:'var(--mono)', fontSize:9, color:'var(--text3)', letterSpacing:'.06em', marginBottom:8}}>
                {g.nombre}
              </div>
              <div style={{fontFamily:'var(--mono)', fontSize:28, fontWeight:700, lineHeight:1, color:c, marginBottom:4}}>
                {g.basis > 0 ? '+' : ''}{g.basis}
              </div>
              <div style={{fontFamily:'var(--mono)', fontSize:9, color:'var(--text3)', marginBottom:8}}>
                {g.bPct}% sobre CBOT
              </div>
              <div style={{display:'flex', justifyContent:'center', gap:6, flexWrap:'wrap'}}>
                <span style={{fontFamily:'var(--mono)', fontSize:9, background:'var(--green-bg)', color:'var(--green)', padding:'1px 6px', borderRadius:3}}>
                  FOB {fmtUSD(g.fob)}
                </span>
                <span style={{fontFamily:'var(--mono)', fontSize:9, background:'rgba(77,158,240,.1)', color:'#4d9ef0', padding:'1px 6px', borderRadius:3}}>
                  CBOT {fmtUSD(g.cbot)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{marginTop:10, fontFamily:'var(--mono)', fontSize:9, color:'var(--text3)'}}>
        Basis negativo: precio local inferior al CBOT (efecto retenciones + logística) · Basis positivo: demanda interna eleva el precio
      </div>
    </div>
  );
}

// ─── CBOT SNAPSHOT ────────────────────────────────────────────
function CBOTSnapshot({ mundo }) {
  const items = mundo?.items ?? [];
  const IDS     = ['soy','corn','wheat','soymeal','soyoil'];
  const NOMBRES = { soy:'Soja', corn:'Maíz', wheat:'Trigo', soymeal:'Harina Soja', soyoil:'Aceite Soja' };
  const rows = IDS.map(id => items.find(i => i.id === id)).filter(Boolean).filter(i => i.price != null);
  if (!rows.length) return null;
  return (
    <div style={{background:'var(--bg1)', border:'1px solid var(--line)', borderRadius:12, overflow:'hidden', marginBottom:20}}>
      <div style={{padding:'12px 20px 10px', borderBottom:'1px solid var(--line)', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <div>
          <div style={{fontFamily:'var(--mono)', fontSize:9, letterSpacing:'.1em', textTransform:'uppercase', color:'var(--text3)'}}>
            CBOT Chicago · Frente de mes · USD/tn
          </div>
          <div style={{fontSize:11, color:'var(--text2)', marginTop:2}}>Precios de referencia internacional</div>
        </div>
        <Badge type="cbot"/>
      </div>
      <div className="tbl-wrap" style={{border:'none', borderRadius:0}}>
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
                <td style={{paddingTop:4, paddingBottom:4}}>
                  <Spark data={item.sparkline?.slice(-30)} color={item.change >= 0 ? 'var(--green)' : 'var(--red)'} w={70} h={24}/>
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

// ─── TAB PRECIO NETO (foco productor) ────────────────────────
function TabPrecioNeto({ fobData, fobStatus, tc, moneda }) {
  const LOGISTICA = 12;

  const FOB_ROWS = [
    { id:'soja',    nombre:'Soja',    fobKey:'soja',    ret:0.24,  nota:'Puerto Rosario · Dcto. 877/2025' },
    { id:'maiz',    nombre:'Maíz',    fobKey:'maiz',    ret:0.085, nota:'Puerto Rosario · Dcto. 877/2025' },
    { id:'trigo',   nombre:'Trigo',   fobKey:'trigo',   ret:0.075, nota:'Puerto Rosario · Dcto. 877/2025' },
    { id:'girasol', nombre:'Girasol', fobKey:'girasol', ret:0.045, nota:'Bahía Blanca · Dcto. 877/2025' },
    { id:'sorgo',   nombre:'Sorgo',   fobKey:'sorgo',   ret:0.085, nota:'Puerto Rosario · Dcto. 877/2025' },
    { id:'cebada',  nombre:'Cebada',  fobKey:'cebada',  ret:0.075, nota:'Calidad forrajera · Dcto. 877/2025' },
  ];

  const rows = useMemo(() => FOB_ROWS.map(row => {
    const fob    = fobData?.precios?.[row.fobKey] ?? null;
    const fasEst = calcFasEstimado(fob, row.ret);
    const neto   = fasEst ? Math.round(fasEst - LOGISTICA) : null;
    const retAmt = fob && row.ret ? Math.round(fob * row.ret) : null;
    return { ...row, fob, fasEst, neto, retAmt };
  }).filter(r => r.fob != null), [fobData]);

  if (fobStatus === 'loading' && !fobData)
    return <div style={{padding:'40px 0', textAlign:'center', color:'var(--text3)', fontSize:13}}>Cargando precios FOB desde MAGyP...</div>;

  if (!rows.length)
    return (
      <div className="alert-strip error" style={{marginTop:16}}>
        <span className="alert-icon">!</span>
        <span className="alert-text">
          No se pudieron obtener precios FOB desde MAGyP. El servidor suele estar sin datos en fines de semana y feriados.
        </span>
      </div>
    );

  return (
    <div>
      <div className="alert-strip info" style={{marginBottom:20}}>
        <span className="alert-icon">i</span>
        <span className="alert-text">
          <strong>FAS estimado</strong> = FOB × (1 − retención) × 0,975 · Logística estimada: ~USD {LOGISTICA}/tn ·
          Valores <strong>referenciales</strong>. El precio real varía según contrato, humedad y calidad.
          Fuente: <strong>MAGyP · Ley 21.453</strong> · {fobData?.fecha}
          {fobData?.diasAtras > 0 && <span style={{color:'var(--text3)'}}> · ({fobData.diasAtras}d de retraso)</span>}
        </span>
      </div>

      <div className="grid grid-3" style={{marginBottom:24}}>
        {rows.map(row => {
          const g = GRANOS.find(g => g.id === row.id);
          const netoARS = row.neto && tc ? R(row.neto * tc) : null;
          const fasARS  = row.fasEst && tc ? R(row.fasEst * tc) : null;

          return (
            <div key={row.id} className="stat" style={{cursor:'default'}}>
              <div className="stat-label">
                <span style={{fontSize:13, fontWeight:500, color:'var(--text2)'}}>{row.nombre}</span>
                <Badge type="fob"/>
              </div>

              <div style={{marginBottom:12}}>
                <div style={{fontFamily:'var(--mono)', fontSize:9, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4}}>
                  Neto estimado campo
                </div>
                <div className="stat-val" style={{fontSize:26, marginBottom:2, color: g?.color || 'var(--white)'}}>
                  {moneda === 'ARS' ? fmtARS(netoARS) : fmtUSD(row.neto)}
                </div>
              </div>

              <div style={{display:'flex', flexDirection:'column', gap:5, borderTop:'1px solid var(--line)', paddingTop:10}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <span style={{fontFamily:'var(--mono)', fontSize:9, color:'var(--text3)'}}>FOB</span>
                  <span style={{fontFamily:'var(--mono)', fontSize:10, fontWeight:600, color:'var(--text2)'}}>{fmtUSD(row.fob)}</span>
                </div>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <span style={{fontFamily:'var(--mono)', fontSize:9, color:'var(--red)'}}>− Retención ({(row.ret*100).toFixed(0)}%)</span>
                  <span style={{fontFamily:'var(--mono)', fontSize:10, fontWeight:600, color:'var(--red)'}}>−{fmtUSD(row.retAmt)}</span>
                </div>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <span style={{fontFamily:'var(--mono)', fontSize:9, color:'var(--text3)'}}>FAS estimado</span>
                  <span style={{fontFamily:'var(--mono)', fontSize:10, fontWeight:600, color:'var(--green)'}}>{fmtUSD(row.fasEst)}</span>
                </div>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <span style={{fontFamily:'var(--mono)', fontSize:9, color:'var(--text3)'}}>− Logística est.</span>
                  <span style={{fontFamily:'var(--mono)', fontSize:10, color:'var(--text3)'}}>−USD {LOGISTICA}</span>
                </div>
                {moneda === 'ARS' && fasARS && (
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', borderTop:'1px solid var(--line)', paddingTop:5, marginTop:2}}>
                    <span style={{fontFamily:'var(--mono)', fontSize:9, color:'var(--text3)'}}>FAS en ARS</span>
                    <span style={{fontFamily:'var(--mono)', fontSize:10, fontWeight:600, color:'var(--text2)'}}>{fmtARS(fasARS)}</span>
                  </div>
                )}
              </div>

              <div className="stat-meta" style={{marginTop:8}}>{row.nota}</div>
            </div>
          );
        })}
      </div>

      <div style={{background:'var(--bg1)', border:'1px solid var(--line)', borderRadius:10, padding:'12px 16px', fontSize:11, color:'var(--text3)', fontFamily:'var(--mono)'}}>
        <strong style={{color:'var(--text2)'}}>FOB</strong> = precio puesto en el barco ·{' '}
        <strong style={{color:'var(--text2)'}}>FAS</strong> = FOB neto de retenciones e IVA (referencial) ·{' '}
        <strong style={{color:'var(--text2)'}}>Neto campo</strong> = FAS − logística estimada · Consulte su acopiador para precio firme.
      </div>
    </div>
  );
}

// ─── TAB FOB / FAS ────────────────────────────────────────────
function TabFobFas({ fobData, fobStatus, mundo }) {
  const items = mundo?.items ?? [];
  const FOB_ROWS = [
    { id:'soja',    nombre:'Soja',        fobKey:'soja',       cbotId:'soy',     ret:0.24,  nota:'Puerto Rosario' },
    { id:'harina',  nombre:'Harina Soja', fobKey:'harina_soja',cbotId:'soymeal', ret:0.225, nota:'47% proteína' },
    { id:'aceite',  nombre:'Aceite Soja', fobKey:'aceite_soja',cbotId:'soyoil',  ret:0.225, nota:'USD/tn exportación' },
    { id:'maiz',    nombre:'Maíz',        fobKey:'maiz',       cbotId:'corn',    ret:0.085, nota:'Puerto Rosario' },
    { id:'trigo',   nombre:'Trigo',       fobKey:'trigo',      cbotId:'wheat',   ret:0.075, nota:'Puerto Rosario' },
    { id:'girasol', nombre:'Girasol',     fobKey:'girasol',    cbotId:null,      ret:0.045, nota:'Bahía Blanca' },
    { id:'sorgo',   nombre:'Sorgo',       fobKey:'sorgo',      cbotId:null,      ret:0.085, nota:'Puerto Rosario' },
    { id:'cebada',  nombre:'Cebada',      fobKey:'cebada',     cbotId:null,      ret:0.075, nota:'Calidad forrajera' },
  ];

  const rows = useMemo(() => FOB_ROWS.map(row => {
    const fob  = fobData?.precios?.[row.fobKey] ?? null;
    const cbot = row.cbotId ? items.find(i => i.id === row.cbotId) : null;
    const varF = cbot?.change ?? null;
    const basis = (fob != null && cbot?.price != null) ? R(fob - cbot.price) : null;
    const fasEst = calcFasEstimado(fob, row.ret);
    return { ...row, fob, varF, basis, fasEst };
  }).filter(r => r.fob != null), [fobData, mundo]);

  if (fobStatus === 'loading')
    return <div style={{padding:'40px 0', textAlign:'center', color:'var(--text3)', fontSize:13}}>Cargando precios FOB desde MAGyP...</div>;

  if (fobStatus === 'error' || !rows.length)
    return (
      <div className="alert-strip error" style={{maxWidth:520, margin:'20px auto'}}>
        <span className="alert-icon">!</span>
        <span className="alert-text">
          No se pudieron obtener precios FOB desde MAGyP (Ley 21.453). El servidor suele estar sin datos en fines de semana y feriados.
        </span>
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
                <th className="r">FAS est. (USD/tn)</th>
                <th className="r">Retención</th>
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
                  <td className="r">
                    {row.fasEst != null
                      ? <span style={{fontFamily:'var(--mono)', fontSize:11, fontWeight:600, color:'var(--green)'}}>{fmtUSD(row.fasEst)}</span>
                      : <span className="dim">—</span>
                    }
                  </td>
                  <td className="r">
                    <span style={{fontFamily:'var(--mono)', fontSize:10, color:'var(--red)', background:'var(--red-bg)', padding:'1px 6px', borderRadius:3}}>
                      {(row.ret * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td className="r">{row.varF != null ? <Pill v={row.varF}/> : <span className="dim">—</span>}</td>
                  <td className="r">
                    {row.basis != null
                      ? <span style={{fontFamily:'var(--mono)', fontSize:11, fontWeight:600, color:row.basis>0?'var(--green)':row.basis<0?'var(--red)':'var(--text3)'}}>
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
      <div className="source" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <span>Fuente: MAGyP · Posición Arancelaria NCM · {fobData?.fecha ?? ''}</span>
        <Badge type="fob"/>
      </div>
      <div style={{marginTop:12, background:'var(--bg1)', border:'1px solid var(--line)', borderRadius:10, padding:'12px 16px', fontSize:11, color:'var(--text3)', fontFamily:'var(--mono)'}}>
        <strong style={{color:'var(--text2)'}}>FOB</strong> = precio puesto en el barco ·
        <strong style={{color:'var(--text2)'}}> FAS estimado</strong> = FOB × (1 − retención) × 0,975 (referencial) ·
        <strong style={{color:'var(--text2)'}}> Basis</strong> = FOB MAGyP − CBOT
      </div>
    </div>
  );
}

// ─── TAB FUTUROS CBOT ─────────────────────────────────────────
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
    .map(id => ({ id, item: items.find(i => i.id === id) }))
    .filter(s => s.item?.price != null);

  return (
    <div>
      <div className="toggle" style={{marginBottom:20}}>
        {[{id:'soja',n:'Soja'},{id:'maiz',n:'Maíz'},{id:'trigo',n:'Trigo'}].map(c => (
          <button key={c.id} className={`tg${activo===c.id?' active':''}`} onClick={() => setActivo(c.id)}>{c.n}</button>
        ))}
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20}}>
        <div style={{background:'var(--bg1)', border:'1px solid var(--line)', borderRadius:12, overflow:'hidden'}}>
          <div style={{padding:'12px 20px 10px', borderBottom:'1px solid var(--line)', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <div style={{fontFamily:'var(--mono)', fontSize:9, letterSpacing:'.1em', textTransform:'uppercase', color:'var(--text3)'}}>
              CBOT Chicago (USD/tn)
            </div>
            <Badge type="cbot"/>
          </div>
          <table>
            <thead><tr><th>Contrato</th><th className="r">USD/tn</th><th className="r">Var. %</th></tr></thead>
            <tbody>
              {spotItem?.price != null && (
                <tr style={{background:'var(--bg2)'}}>
                  <td className="bold" style={{color:'var(--accent)'}}>
                    SPOT <span style={{fontFamily:'var(--mono)', fontSize:8, color:'#4d9ef0'}}>FRENTE</span>
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
                : <tr><td colSpan={3} style={{color:'var(--text3)', fontSize:12, textAlign:'center', padding:'14px 0'}}>Cargando contratos...</td></tr>
              }
            </tbody>
          </table>
          <div className="source" style={{display:'flex', justifyContent:'space-between'}}>
            <span>CME Group · Yahoo Finance</span>
            <Badge type="cbot"/>
          </div>
        </div>

        {curva.length >= 2 && (
          <div style={{background:'var(--bg1)', border:'1px solid var(--line)', borderRadius:12, overflow:'hidden'}}>
            <div style={{padding:'12px 20px 10px', borderBottom:'1px solid var(--line)', display:'flex', justifyContent:'space-between'}}>
              <div style={{fontFamily:'var(--mono)', fontSize:9, letterSpacing:'.1em', textTransform:'uppercase', color:'var(--text3)'}}>
                Curva de plazos · {activo.charAt(0).toUpperCase()+activo.slice(1)} CBOT
              </div>
              <Badge type="cbot"/>
            </div>
            <div style={{padding:'20px 24px 16px'}}>
              <div style={{display:'flex', gap:8, alignItems:'flex-end', height:90}}>
                {curva.map((c,i) => {
                  const all=curva.map(x=>x.precio), mn=Math.min(...all), mx=Math.max(...all), rng=mx-mn||1;
                  const pct=(c.precio-mn)/rng;
                  const bH=Math.round(24+pct*56);
                  return (
                    <div key={i} style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4}}>
                      <div style={{fontFamily:'var(--mono)', fontSize:9, color:'var(--text3)'}}>{fmtUSD(c.precio)}</div>
                      <div style={{width:'50%', height:bH, background:i===0?'#4d9ef0':'var(--bg3)', borderRadius:'4px 4px 0 0', border:'1px solid var(--line)'}}/>
                      <div style={{fontFamily:'var(--mono)', fontSize:8, color:'var(--text3)', textAlign:'center'}}>{c.label}</div>
                    </div>
                  );
                })}
              </div>
              {curva.length >= 2 && (
                <div style={{marginTop:12, fontFamily:'var(--mono)', fontSize:9, color:'var(--text3)'}}>
                  {curva.slice(-1)[0].precio > curva[0].precio
                    ? 'Contango (futuros > spot): mercado anticipa mayor precio futuro.'
                    : 'Backwardation (futuros < spot): mayor demanda inmediata que futura.'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div style={{marginBottom:20, padding:'14px 16px', background:'var(--bg1)', border:'1px solid var(--line)', borderRadius:10}}>
        <div style={{fontFamily:'var(--mono)', fontSize:9, letterSpacing:'.1em', textTransform:'uppercase', color:'var(--text3)', marginBottom:6}}>
          Matba-Rofex (ARS/tn)
        </div>
        <div style={{color:'var(--text3)', fontSize:12}}>
          Sin API pública disponible. Se requiere acceso institucional a Matba-Rofex para obtener precios de futuros locales.
        </div>
      </div>

      {subprod.length > 0 && (
        <div>
          <div className="section-title" style={{display:'flex', alignItems:'center', gap:8, marginBottom:14}}>
            Subproductos soja · CBOT spot <Badge type="cbot"/>
          </div>
          <div className="grid grid-2">
            {subprod.map(s => {
              const NOMS = { soymeal:'Harina Soja', soyoil:'Aceite Soja' };
              return (
                <div key={s.id} className="stat" style={{cursor:'default'}}>
                  <div className="stat-label">
                    <span style={{fontSize:13}}>{NOMS[s.id]}</span>
                    <Badge type="cbot"/>
                  </div>
                  <div className="stat-val" style={{fontSize:24, marginBottom:8}}>{fmtUSD(s.item.price)}</div>
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

// ─── TAB SUBPRODUCTOS ─────────────────────────────────────────
function TabSubproductos({ fobData, mundo }) {
  const items = mundo?.items ?? [];
  const hF   = fobData?.precios?.harina_soja ?? null;
  const aF   = fobData?.precios?.aceite_soja  ?? null;
  const hFut = items.find(i => i.id === 'soymeal');
  const aFut = items.find(i => i.id === 'soyoil');
  const gF   = fobData?.precios?.girasol ?? null;

  const CARDS = [
    { label:'Harina Soja FOB',  v: hF   != null ? fmtUSD(hF)                : null, var: hFut?.change ?? null, type:'fob',  un:'USD/tn' },
    { label:'Aceite Soja FOB',  v: aF   != null ? fmtUSD(aF)                : null, var: aFut?.change ?? null, type:'fob',  un:'USD/tn' },
    { label:'Harina Soja CBOT', v: hFut?.price != null ? fmtUSD(hFut.price) : null, var: hFut?.change ?? null, type:'cbot', un:'USD/tn spot' },
    { label:'Aceite Soja CBOT', v: aFut?.price != null ? fmtUSD(aFut.price) : null, var: aFut?.change ?? null, type:'cbot', un:'USD/tn spot' },
  ];

  const hasAnySoja = CARDS.some(c => c.v != null);

  return (
    <div>
      <div className="section-title" style={{display:'flex', alignItems:'center', gap:8, marginBottom:16}}>
        Complejo Sojero
      </div>
      {!hasAnySoja ? (
        <div style={{padding:'24px 0', color:'var(--text3)', fontSize:13}}>Sin datos disponibles para subproductos soja.</div>
      ) : (
        <div className="grid grid-4" style={{marginBottom:24}}>
          {CARDS.map(item => (
            <div key={item.label} className="stat" style={{cursor:'default'}}>
              <div className="stat-label">
                <span style={{fontSize:12}}>{item.label}</span>
                {item.v != null ? <Badge type={item.type}/> : <Badge type="ref"/>}
              </div>
              <div className="stat-val" style={{fontSize:22, marginBottom:8}}>
                {item.v ?? <span style={{color:'var(--text3)', fontSize:13}}>Sin datos</span>}
              </div>
              <div className="stat-meta">{item.var != null && <Pill v={item.var}/>} {item.un}</div>
            </div>
          ))}
        </div>
      )}

      <div className="section-title" style={{marginTop:8, marginBottom:16}}>Complejo Girasol</div>
      <div className="grid grid-2">
        <div className="stat" style={{cursor:'default'}}>
          <div className="stat-label"><span style={{fontSize:13}}>Aceite Girasol FOB</span></div>
          <div style={{color:'var(--text3)', fontSize:13, marginBottom:10}}>Sin datos</div>
          <div className="stat-meta">USD/tn · sin API pública disponible</div>
        </div>
        <div className="stat" style={{cursor:'default'}}>
          <div className="stat-label">
            <span style={{fontSize:13}}>Girasol Grano FOB</span>
            {gF != null ? <Badge type="fob"/> : <Badge type="ref"/>}
          </div>
          <div className="stat-val" style={{fontSize:22, marginBottom:10}}>
            {gF != null ? fmtUSD(gF) : <span style={{color:'var(--text3)', fontSize:13}}>Sin datos</span>}
          </div>
          <div className="stat-meta">Bahía Blanca</div>
        </div>
      </div>
      <div className="source" style={{marginTop:10, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <span>Fuente: MAGyP · CME Group</span>
        <Badge type={(hF || aF || hFut) ? 'fob' : 'ref'}/>
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────
const TABS = [
  { id:'resumen',      label:'Resumen'      },
  { id:'precio-neto',  label:'Precio Neto'  },
  { id:'fob-fas',      label:'FOB / FAS'    },
  { id:'futuros',      label:'Futuros CBOT' },
  { id:'subproductos', label:'Subproductos' },
];

export function GranosPage({ goPage, dolares, mundo, loadMundo }) {
  const [moneda,    setMoneda]    = useState('USD');
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
  const items  = mundo?.items ?? [];

  const sojFOB  = fobData?.precios?.soja  ?? null;
  const maizFOB = fobData?.precios?.maiz  ?? null;
  const trigoFOB= fobData?.precios?.trigo ?? null;
  const sojaCBOT= items.find(i => i.id === 'soy');
  const maizCBOT= items.find(i => i.id === 'corn');
  const trigoCBOT=items.find(i => i.id === 'wheat');

  const dateBadge = fobData?.fecha
    ? fobData.fecha.slice(5).split('-').reverse().join('/')
    : '—';

  return (
    <div className="page-enter">
      <div className="ph">
        <div>
          <div className="ph-title">
            Granos{' '}
            <span className="help-pip" onClick={() => goPage('ayuda', 'glosario-granos')} title="Ayuda">?</span>
          </div>
          <div className="ph-sub" style={{display:'flex', alignItems:'center', gap:8, flexWrap:'wrap'}}>
            <span>FOB MAGyP · CBOT Chicago · Futuros · Basis · Precio Neto</span>
            {fobStatus === 'ok'      && <><Badge type="fob"/><span style={{fontFamily:'var(--mono)', fontSize:10, color:'var(--text3)'}}>{fobData?.fecha}</span></>}
            {fobStatus === 'loading' && <span style={{fontFamily:'var(--mono)', fontSize:10, color:'var(--text3)'}}>cargando FOB...</span>}
            {cbotOk                  && <Badge type="cbot"/>}
          </div>
        </div>
        <div className="ph-right">
          <div className="toggle">
            <button className={`tg${moneda==='ARS'?' active':''}`} onClick={() => setMoneda('ARS')}>ARS/tn</button>
            <button className={`tg${moneda==='USD'?' active':''}`} onClick={() => setMoneda('USD')}>USD/tn</button>
          </div>
        </div>
      </div>

      {/* KPI resumen — mismo patrón que MacroPage */}
      <div className="section">
        <div className="section-title">Indicadores clave · resumen</div>
        <div className="grid grid-4">
          {[
            {
              lbl:'Soja FOB',
              badge: dateBadge,
              val: sojFOB ? fmtUSD(sojFOB) : '—',
              sub: sojaCBOT?.change != null ? `CBOT ${fmtPct(sojaCBOT.change)}` : sojaCBOT?.price ? `CBOT ${fmtUSD(sojaCBOT.price)}` : 'sin CBOT',
              delta: sojaCBOT?.change != null,
              deltaUp: (sojaCBOT?.change ?? 0) > 0,
              meta:'MAGyP · Puerto Rosario · ret. 24% (Dcto. 877/2025)',
              tab:'resumen',
            },
            {
              lbl:'Maíz FOB',
              badge: dateBadge,
              val: maizFOB ? fmtUSD(maizFOB) : '—',
              sub: maizCBOT?.change != null ? `CBOT ${fmtPct(maizCBOT.change)}` : maizCBOT?.price ? `CBOT ${fmtUSD(maizCBOT.price)}` : 'sin CBOT',
              delta: maizCBOT?.change != null,
              deltaUp: (maizCBOT?.change ?? 0) > 0,
              meta:'MAGyP · Puerto Rosario · ret. 8,5% (Dcto. 877/2025)',
              tab:'resumen',
            },
            {
              lbl:'Trigo FOB',
              badge: dateBadge,
              val: trigoFOB ? fmtUSD(trigoFOB) : '—',
              sub: trigoCBOT?.change != null ? `CBOT ${fmtPct(trigoCBOT.change)}` : trigoCBOT?.price ? `CBOT ${fmtUSD(trigoCBOT.price)}` : 'sin CBOT',
              delta: trigoCBOT?.change != null,
              deltaUp: (trigoCBOT?.change ?? 0) > 0,
              meta:'MAGyP · Puerto Rosario · ret. 7,5% (Dcto. 877/2025)',
              tab:'resumen',
            },
            {
              lbl:'Soja FAS est.',
              badge:'Estimado',
              val: sojFOB ? fmtUSD(calcFasEstimado(sojFOB, 0.24)) : '—',
              sub: sojFOB && tc ? fmtARS(R(calcFasEstimado(sojFOB, 0.24) * tc)) : 'sin TC oficial',
              delta: false,
              meta:'FOB × (1−24%) × 0,975 · Dcto. 877/2025 · ver Precio Neto',
              tab:'precio-neto',
            },
          ].map((k, i) => (
            <div key={i} className="stat"
              style={{cursor:'pointer', transition:'border-color .15s, background .15s'}}
              onClick={() => setActiveTab(k.tab)}
              onMouseEnter={e => { e.currentTarget.style.borderColor='var(--line2)'; e.currentTarget.style.background='var(--bg2)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='var(--line)'; e.currentTarget.style.background=''; }}>
              <div style={{fontSize:15, fontWeight:400, color:'var(--text2)', marginBottom:8, display:'flex', alignItems:'baseline', gap:6, flexWrap:'wrap'}}>
                {k.lbl}
                <span style={{fontFamily:'var(--mono)', fontSize:9, background:'var(--bg3)', color:'var(--text3)', padding:'1px 6px', borderRadius:3, border:'1px solid var(--line)'}}>
                  {k.badge}
                </span>
              </div>
              <div className="stat-val" style={{fontSize:24, marginBottom:0}}>{k.val}</div>
              <div style={{display:'flex', alignItems:'center', gap:8, margin:'4px 0', flexWrap:'wrap'}}>
                {k.delta
                  ? <span style={{fontFamily:'var(--mono)', fontSize:10, fontWeight:600, color:k.deltaUp?'var(--green)':'var(--red)', background:k.deltaUp?'var(--green-bg)':'var(--red-bg)', padding:'1px 7px', borderRadius:3}}>
                      {k.sub}
                    </span>
                  : <span style={{fontFamily:'var(--mono)', fontSize:9, color:'var(--text3)'}}>{k.sub}</span>
                }
              </div>
              <div className="stat-meta">{k.meta}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {TABS.map(t => (
          <button key={t.id} className={`tab${activeTab===t.id?' active':''}`} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="section">
        {activeTab === 'resumen'      && <TabResumen      fobData={fobData} fobStatus={fobStatus} mundo={mundo} tc={tc} moneda={moneda}/>}
        {activeTab === 'precio-neto'  && <TabPrecioNeto   fobData={fobData} fobStatus={fobStatus} tc={tc} moneda={moneda}/>}
        {activeTab === 'fob-fas'      && <TabFobFas       fobData={fobData} fobStatus={fobStatus} mundo={mundo}/>}
        {activeTab === 'futuros'      && <TabFuturos      mundo={mundo}/>}
        {activeTab === 'subproductos' && <TabSubproductos fobData={fobData} mundo={mundo}/>}
      </div>
    </div>
  );
}
