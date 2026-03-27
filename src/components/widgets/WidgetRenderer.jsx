// WidgetRenderer.jsx — idéntico al HTML de referencia
import React from 'react';
import { FERIADOS_2026 } from '../../data/feriados';
import { CLIMA_DIAS } from '../../data/clima';

// ── Helpers ────────────────────────────────────────────────
function WHeader({ title, dotColor, page, goPage }) {
  return (
    <div className="widget-header">
      <span className="widget-title">
        <span className="widget-title-dot" style={dotColor?{background:dotColor}:{}}></span>
        {title}
      </span>
      {page && <button className="widget-link" onClick={()=>goPage(page)}>VER TODO →</button>}
    </div>
  );
}

function Wkc2({ items }) {
  return (
    <div className="widget-kpi-compact">
      {items.map((it,i)=>(
        <div className="wkc-cell" key={i}>
          <div className="wkc-label">{it.label}</div>
          <div className="wkc-val">{it.val}</div>
          <div className={`wkc-delta ${it.cls||'fl'}`}>{it.delta}</div>
        </div>
      ))}
    </div>
  );
}

function GrainRow({ g, goPage, page='granos' }) {
  const c = g.cls==='up'?'var(--green)':g.cls==='dn'?'var(--red)':'var(--text3)';
  return (
    <div className="grain-row" onClick={()=>goPage(page)} style={{cursor:'pointer'}}>
      <div>
        <div className="grain-name">{g.name}</div>
        <div className="grain-sub">{g.sub}</div>
      </div>
      <svg className="grain-chart" viewBox="0 0 56 22">
        <polyline points={g.pts} fill="none" stroke={c} strokeWidth="1.5" strokeLinejoin="round"/>
        <polygon points={`${g.pts} 56,22 0,22`} fill={c} opacity=".25"/>
      </svg>
      <div className="grain-price" style={{color:c}}>{g.price}</div>
      <div className={`grain-badge ${g.cls}`}>{g.badge}</div>
    </div>
  );
}

function GrainRowCompact({ g, goPage, page='granos' }) {
  const c = g.cls==='up'?'var(--green)':g.cls==='dn'?'var(--red)':'';
  return (
    <div className="grain-row-compact" onClick={()=>goPage(page)} style={{cursor:'pointer'}}>
      <div className="grc-left">
        <div className="grc-name">{g.name}</div>
        <div className="grc-sub">{g.sub}</div>
      </div>
      <div className="grc-right">
        <div className="grc-price" style={c?{color:c}:{}}>{g.price}</div>
        <div className={`grc-badge ${g.cls}`}>{g.badge}</div>
      </div>
    </div>
  );
}

// ── Datos estáticos widgets ────────────────────────────────
const GRANOS = [
  {name:'Soja',     sub:'BCR Rosario · disponible', pts:'0,17 9,15 18,12 27,14 36,8 45,9 56,6',  price:'$456.000', badge:'−1,9%', cls:'dn'},
  {name:'Maíz',    sub:'BCR Rosario · disponible', pts:'0,13 9,15 18,17 27,13 36,11 45,12 56,9', price:'$251.600', badge:'−0,3%', cls:'dn'},
  {name:'Trigo',   sub:'BCR Rosario · disponible', pts:'0,15 9,13 18,10 27,12 36,7 45,6 56,5',   price:'$248.000', badge:'−1,2%', cls:'dn'},
  {name:'Girasol', sub:'BCR Rosario · disponible', pts:'0,14 9,12 18,9 27,8 36,6 45,7 56,6',     price:'$519.460', badge:'−1,4%', cls:'dn'},
  {name:'Sorgo',   sub:'BCR Rosario · disponible', pts:'0,11 14,11 28,12 42,11 56,11',           price:'$218.500', badge:'0,0%',  cls:'fl'},
  {name:'Cebada',  sub:'BCR Rosario · disponible', pts:'0,14 14,13 28,11 42,10 56,9',            price:'$231.000', badge:'+0,6%', cls:'up'},
];

const CBOT = [
  {name:'Soja',  sub:'USD/tn · CBOT Chicago', pts:'0,9 14,12 28,7 42,9 56,6',    price:'418,9', badge:'−1,19', cls:'dn'},
  {name:'Maíz',  sub:'USD/tn · CBOT Chicago', pts:'0,14 14,12 28,10 42,9 56,8',  price:'185,8', badge:'+0,31', cls:'up'},
  {name:'Trigo', sub:'USD/tn · CBOT Chicago', pts:'0,10 14,12 28,9 42,9 56,8',   price:'203,5', badge:'−0,47', cls:'dn'},
];

const HACIENDA_ROWS = [
  {name:'Novillito 290–340 kg', sub:'Faena · MAG Cañuelas', pts:'0,16 18,14 36,11 56,9', price:'$5.300', badge:'+3,9%', cls:'up'},
  {name:'Novillo med. 390–450', sub:'Faena · MAG Cañuelas', pts:'0,16 18,14 36,12 56,10', price:'$4.950', badge:'+3,6%', cls:'up'},
  {name:'Vaca consumo',         sub:'Faena · MAG Cañuelas', pts:'0,11 18,11 36,11 56,11', price:'$3.400', badge:'0,0%',  cls:'fl'},
  {name:'Terneros hasta 160 kg',sub:'Invernada · Harrington', pts:'0,17 18,13 36,10 56,6', price:'$6.600', badge:'+4,8%', cls:'up'},
  {name:'Terneros 160–180 kg',  sub:'Invernada · Harrington', pts:'0,16 18,13 36,10 56,7', price:'$6.400', badge:'+4,1%', cls:'up'},
];

const MAC_ROWS = [
  {lbl:'IPC General',    sub:'Ene 2026',    val:'2,4%',      delta:' −0,4pp · i.a. 74,3%', dcls:'dn'},
  {lbl:'EMAE',           sub:'Nov 2025',    val:'+5,3%',     delta:' 6to mes positivo',     dcls:'up'},
  {lbl:'Riesgo País',    sub:'EMBI+',       val:'698pb',     delta:' −14pb semana',         dcls:'dn'},
  {lbl:'Reservas BCRA',  sub:'Brutas',      val:'USD 42,7B', delta:' +1,2B vs ene',         dcls:'up'},
  {lbl:'Superávit',      sub:'Fiscal 2025', val:'+1,8%',     delta:' Primario',             dcls:'up'},
  {lbl:'Bal. Comercial', sub:'2025',        val:'USD 14,6B', delta:' Expo +7,1%',           dcls:'up'},
];

const IDX = [
  {name:'Feedlot · Novillo/Maíz', desc:'kg novillo / tn maíz · umbral: 15', val:'19,8', bar:75.7, clr:'var(--green)', st:'FAVORABLE'},
  {name:'Cría · Ternero/Novillo',  desc:'ratio precio · favorable: >1,30',   val:'1,37', bar:68.5, clr:'var(--green)', st:'POSITIVO'},
  {name:'Soja / Urea',             desc:'tn soja / tn urea · rentable: >1,0',val:'0,94', bar:47,   clr:'var(--red)',   st:'PRESIÓN'},
  {name:'Maíz / Ternero',          desc:'tn maíz compra X kg de ternero',    val:'37,0', bar:60,   clr:'var(--accent)',st:'kg/tn'},
  {name:'Maíz / Soja',             desc:'ratio de precios relativo',          val:'0,552',bar:55.2, clr:'var(--text2)', st:'ratio'},
];

const INS = [
  {name:'Urea granulada', sub:'ARS/tn · USD 388 · semanal', pts:'0,9 14,11 28,10 42,12 56,14', price:'$484.000', badge:'−1,6%', cls:'dn'},
  {name:'MAP 11-52-0',    sub:'ARS/tn · USD 459 · semanal', pts:'0,11 18,11 36,12 56,11',       price:'$572.000', badge:'0,0%',  cls:'fl'},
  {name:'DAP 18-46-0',    sub:'ARS/tn · USD 440 · semanal', pts:'0,13 14,12 28,10 42,9 56,8',  price:'$548.000', badge:'+0,7%', cls:'up'},
  {name:'Gasoil G2 · YPF',sub:'ARS/litro · semanal',        pts:'0,11 18,11 36,11 56,11',       price:'$1.247',   badge:'0,0%',  cls:'fl'},
];

const RET = [
  {n:'Soja',    ali:'33%', piz:'$456.000', ret:'−$150.480', neto:'$305.520', cls:'dn'},
  {n:'Maíz',    ali:'12%', piz:'$251.600', ret:'−$30.192',  neto:'$221.408', cls:'fl'},
  {n:'Trigo',   ali:'12%', piz:'$248.000', ret:'−$29.760',  neto:'$218.240', cls:'fl'},
  {n:'Girasol', ali:'7%',  piz:'$519.460', ret:'−$36.362',  neto:'$483.098', cls:'up'},
  {n:'Sorgo',   ali:'12%', piz:'$218.500', ret:'−$26.220',  neto:'$192.280', cls:'fl'},
  {n:'Cebada',  ali:'12%', piz:'$231.000', ret:'−$27.720',  neto:'$203.280', cls:'fl'},
];

// ── WIDGET: Granos Pizarra ─────────────────────────────────
function GranosPizarraWidget({ size, goPage }) {
  const ts = '23/02/2026';
  if (size === 'normal') return (
    <>
      <WHeader title={`Pizarra BCR · ARS/tn · Rosario`} page="granos" goPage={goPage} />
      <Wkc2 items={GRANOS.slice(0,4).map(g=>({label:g.name,val:g.price,delta:g.badge,cls:g.cls}))} />
      {GRANOS.slice(0,3).map((g,i)=><GrainRowCompact key={i} g={g} goPage={goPage} />)}
    </>
  );
  if (size === 'wide') return (
    <>
      <WHeader title={`Pizarra BCR · ARS/tn · Rosario`} page="granos" goPage={goPage} />
      <div className="widget-hero">
        {GRANOS.slice(0,4).map(g=>(
          <div className="widget-kpi" key={g.name}>
            <div className="widget-kpi-label">{g.name}</div>
            <div className="widget-kpi-val">{g.price}</div>
            <div className={`widget-kpi-delta ${g.cls}`}>{g.badge}</div>
          </div>
        ))}
      </div>
      {GRANOS.slice(0,5).map((g,i)=><GrainRow key={i} g={g} goPage={goPage} />)}
    </>
  );
  return (
    <>
      <WHeader title={`Pizarra BCR · ARS/tn · Rosario`} page="granos" goPage={goPage} />
      <div className="widget-hero" style={{gridTemplateColumns:'repeat(6,1fr)'}}>
        {GRANOS.map(g=>(
          <div className="widget-kpi" key={g.name}>
            <div className="widget-kpi-label">{g.name}</div>
            <div className="widget-kpi-val">{g.price}</div>
            <div className={`widget-kpi-delta ${g.cls}`}>{g.badge}</div>
          </div>
        ))}
      </div>
      {GRANOS.map((g,i)=><GrainRow key={i} g={g} goPage={goPage} />)}
      <div style={{padding:'14px 18px 8px',borderTop:'1px solid var(--line)',background:'var(--bg2)'}}>
        <div style={{fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text3)',marginBottom:'10px'}}>Comparativa de plazas · ARS/tn</div>
        <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:'12px'}}>
          <thead><tr style={{borderBottom:'1px solid var(--line)'}}>
            {['Producto','Rosario','Bs. Aires','Bahía Blanca','Quequén','Var. diaria'].map((h,i)=>(
              <th key={h} style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)',padding:'6px 12px',textAlign:i>0?'right':'left',fontWeight:400}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {[['Soja','$456.000','S/C','S/C','S/C','−$9.000','dn'],
              ['Maíz','$251.600','$249.000','$249.500','$248.500','−$800','dn'],
              ['Trigo','$248.000','$246.000','$246.000','$245.500','−$3.050','dn'],
              ['Girasol','$519.460','S/C','$515.000','S/C','−$7.600','dn'],
              ['Cebada','$231.000','$229.500','$228.000','S/C','+$1.500','up'],
            ].map(([p,r,b,bb,q,v,c])=>(
              <tr key={p} style={{borderBottom:'1px solid var(--line)'}}>
                <td style={{padding:'8px 12px',fontWeight:500,color:'var(--white)'}}>{p}</td>
                <td style={{padding:'8px 12px',textAlign:'right',fontFamily:'var(--mono)',fontWeight:600,color:'var(--white)'}}>{r}</td>
                {[b,bb,q].map((v2,i)=><td key={i} style={{padding:'8px 12px',textAlign:'right',fontFamily:'var(--mono)',color:v2==='S/C'?'var(--text3)':'var(--text)'}}>{v2}</td>)}
                <td style={{padding:'8px 12px',textAlign:'right'}}><span style={{fontFamily:'var(--mono)',fontSize:'10px',background:`var(--${c}-bg)`,color:`var(--${c})`,padding:'2px 6px',borderRadius:'4px'}}>{v}</span></td>
              </tr>
            ))}
          </tbody>
        </table></div>
        <div style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)',marginTop:'8px'}}>Fuente: BCR · {ts}</div>
      </div>
    </>
  );
}

// ── WIDGET: Hacienda ──────────────────────────────────────
function HaciendaWidget({ size, goPage }) {
  const hdr = <WHeader title="Hacienda · ARS/kg · 20/02/2026" dotColor="var(--green)" page="hacienda" goPage={goPage} />;
  if (size === 'normal') return (
    <>
      {hdr}
      <Wkc2 items={[
        {label:'Novillito faena', val:'$5.300', delta:' +3,9%', cls:'up'},
        {label:'Ternero inv.',    val:'$6.400', delta:' +4,1%', cls:'up'},
      ]} />
      {HACIENDA_ROWS.slice(0,3).map((g,i)=><GrainRowCompact key={i} g={g} goPage={goPage} page="hacienda" />)}
    </>
  );
  if (size === 'wide') return (
    <>
      {hdr}
      <div className="widget-hero">
        {[['Novillito','$5.300','+3,9%','up'],['Ternero 160','$6.400','+4,1%','up'],['Ternero <160','$6.600','+4,8%','up'],['Vaca consumo','$3.400','0,0%','fl']].map(([l,v,d,c])=>(
          <div className="widget-kpi" key={l}><div className="widget-kpi-label">{l}</div><div className="widget-kpi-val">{v}</div><div className={`widget-kpi-delta ${c}`}>{d}</div></div>
        ))}
      </div>
      {HACIENDA_ROWS.slice(0,4).map((g,i)=><GrainRow key={i} g={g} goPage={goPage} page="hacienda" />)}
    </>
  );
  return (
    <>
      {hdr}
      <div className="widget-hero" style={{gridTemplateColumns:'repeat(5,1fr)'}}>
        {[['Novillito','$5.300','+3,9%','up'],['Novillo med.','$4.950','+3,6%','up'],['Ternero <160','$6.600','+4,8%','up'],['Ternero 160','$6.400','+4,1%','up'],['Vaca consumo','$3.400','0,0%','fl']].map(([l,v,d,c])=>(
          <div className="widget-kpi" key={l}><div className="widget-kpi-label">{l}</div><div className="widget-kpi-val">{v}</div><div className={`widget-kpi-delta ${c}`}>{d}</div></div>
        ))}
      </div>
      {HACIENDA_ROWS.map((g,i)=><GrainRow key={i} g={g} goPage={goPage} page="hacienda" />)}
      <div style={{padding:'14px 18px 8px',borderTop:'1px solid var(--line)',background:'var(--bg2)'}}>
        <div style={{fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text3)',marginBottom:'10px'}}>Vientres · ARS/cabeza</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'10px'}}>
          {[['VACA NUEVA C/CRÍA','$1.900.000','+2,7%'],['VACA USADA C/CRÍA','$1.550.000','+3,3%'],['VAQUILLONA C/CRÍA','$1.900.000','+4,4%']].map(([l,v,d])=>(
            <div key={l} style={{background:'var(--bg1)',borderRadius:'8px',padding:'12px 14px',border:'1px solid var(--line)'}}>
              <div style={{fontFamily:'var(--mono)',fontSize:'8px',color:'var(--text3)',marginBottom:'4px'}}>{l}</div>
              <div style={{fontFamily:'var(--display)',fontSize:'15px',fontWeight:600,color:'var(--white)'}}>{v}</div>
              <div style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--green)'}}> {d}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ── WIDGET: Dólares ───────────────────────────────────────
function DolarWidget({ size, goPage, dolares }) {
  const D = dolares || {};
  const f$ = v => v ? '$'+Math.round(v).toLocaleString('es-AR') : '…';
  const fP = v => v!=null ? (v>0?'+':'')+v.toFixed(1).replace('.',',')+'%' : '—';
  const fc = v => v==null?'fl':v>0?'up':v<0?'dn':'fl';
  const ts = D.pOf ? new Date().toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'}) : 'sin datos';
  const hdr = <WHeader title={`Dólar · ARS/USD · ${ts}`} dotColor="var(--blue)" page="financiero" goPage={goPage} />;

  if (size === 'normal') return (
    <>
      {hdr}
      <Wkc2 items={[
        {label:'Oficial BCRA', val:f$(D.pOf),  delta:D.pOf?'BCRA':'…',                    cls:'fl'},
        {label:'MEP / Bolsa',  val:f$(D.pMep), delta:D.bMep!=null?fP(D.bMep)+' br.':'…', cls:fc(D.bMep)},
        {label:'CCL',          val:f$(D.pCcl), delta:D.bCcl!=null?fP(D.bCcl)+' br.':'…', cls:fc(D.bCcl)},
        {label:'Blue',         val:f$(D.pBlu), delta:D.bBlu!=null?fP(D.bBlu)+' br.':'…', cls:fc(D.bBlu)},
      ]} />
      <div className="dolar-list">
        <div className="dolar-row"><div className="dr-name">Mayorista</div><div className="dr-val">{f$(D.pMay)}</div><div className="dr-chg fl">BCRA mayorista</div></div>
        <div className="dolar-row"><div className="dr-name">Cripto (USDT)</div><div className="dr-val">{f$(D.pCry)}</div><div className={`dr-chg ${fc(D.bCry)}`}>{D.bCry!=null?fP(D.bCry)+' br.':'…'}</div></div>
        <div className="dolar-row" style={{background:'var(--bg2)'}}><div className="dr-name" style={{color:'var(--text2)'}}>Brecha MEP vs Oficial</div><div className="dr-val" style={{color:'var(--accent)',fontSize:'14px'}}>{fP(D.bMep)}</div><div className="dr-chg"></div></div>
      </div>
    </>
  );
  if (size === 'wide') {
    const cells = [
      {name:'Oficial', val:f$(D.pOf),  chg:'BCRA',      cls:'fl', featured:true},
      {name:'MEP',     val:f$(D.pMep), chg:fP(D.bMep),  cls:fc(D.bMep)},
      {name:'CCL',     val:f$(D.pCcl), chg:fP(D.bCcl),  cls:fc(D.bCcl)},
      {name:'Blue',    val:f$(D.pBlu), chg:fP(D.bBlu),  cls:fc(D.bBlu)},
      {name:'Mayorista',val:f$(D.pMay),chg:'BCRA',       cls:'fl'},
      {name:'Cripto',  val:f$(D.pCry), chg:fP(D.bCry),  cls:fc(D.bCry)},
    ];
    return (
      <>
        {hdr}
        <div className="dolar-strip" style={{gridTemplateColumns:'repeat(6,1fr)'}}>
          {cells.map(c=>(
            <div key={c.name} className={`dolar-strip-cell${c.featured?' featured':''}`}>
              <div className="dsc-name">{c.name}</div>
              <div className="dsc-val">{c.val}</div>
              <div className={`dsc-chg ${c.cls}`}>{c.chg}</div>
            </div>
          ))}
        </div>
        <div className="dolar-list">
          {[['MEP',D.bMep,'var(--accent)'],['Blue',D.bBlu,'var(--red)']].map(([n,b,col])=>(
            <div className="dolar-row" key={n}>
              <div className="dr-name">Brecha {n} vs Oficial</div>
              <div style={{flex:1,height:'4px',background:'var(--bg3)',borderRadius:'2px',overflow:'hidden',margin:'0 16px'}}>
                <div style={{width:`${Math.min(Math.abs(b||0),80)}%`,height:'100%',background:col,borderRadius:'2px',transition:'width .6s'}}></div>
              </div>
              <div className="dr-val" style={{color:col}}>{fP(b)}</div>
            </div>
          ))}
        </div>
      </>
    );
  }
  // FULL
  const bl = D.pOf&&D.pMep ? D.pOf*0.8+D.pMep*0.2 : null;
  const bBl = D.pOf&&bl ? (bl-D.pOf)/D.pOf*100 : null;
  return (
    <>
      {hdr}
      <div className="dolar-strip" style={{gridTemplateColumns:'repeat(6,1fr)'}}>
        {[
          {n:'Oficial',v:f$(D.pOf),  c:'BCRA',    cls:'fl', featured:true},
          {n:'MEP',    v:f$(D.pMep), c:fP(D.bMep),cls:fc(D.bMep)},
          {n:'CCL',    v:f$(D.pCcl), c:fP(D.bCcl),cls:fc(D.bCcl)},
          {n:'Blue',   v:f$(D.pBlu), c:fP(D.bBlu),cls:fc(D.bBlu)},
          {n:'Mayorista',v:f$(D.pMay),c:'BCRA',   cls:'fl'},
          {n:'Cripto', v:f$(D.pCry), c:fP(D.bCry),cls:fc(D.bCry)},
        ].map(d=>(
          <div key={d.n} className={`dolar-strip-cell${d.featured?' featured':''}`}>
            <div className="dsc-name">{d.n}</div>
            <div className="dsc-val">{d.v}</div>
            <div className={`dsc-chg ${d.cls}`}>{d.c}</div>
          </div>
        ))}
      </div>
      <div style={{padding:'14px 18px 10px'}}>
        <div style={{fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text3)',marginBottom:'12px'}}>Brechas vs oficial · barras visuales</div>
        <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
          {[['MEP',D.bMep,'var(--blue)'],['CCL',D.bCcl,'var(--blue)'],['Blue',D.bBlu,'var(--red)'],['Cripto',D.bCry,'var(--text2)']].map(([n,b,col])=>(
            <div key={n} style={{display:'flex',alignItems:'center',gap:'10px'}}>
              <span style={{color:'var(--text2)',minWidth:'80px',fontSize:'12px'}}>{n}</span>
              <div style={{flex:1,height:'5px',background:'var(--bg3)',borderRadius:'3px',overflow:'hidden'}}>
                <div style={{width:`${Math.min(Math.abs(b||0),80)}%`,height:'100%',background:col,borderRadius:'3px',transition:'width .6s ease'}}></div>
              </div>
              <span style={{fontFamily:'var(--mono)',fontSize:'11px',color:col,minWidth:'52px',textAlign:'right'}}>{fP(b)}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{padding:'0 18px 14px',borderTop:'1px solid var(--line)',marginTop:'8px'}}>
        <div style={{fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text3)',margin:'12px 0 10px'}}>Tipo de cambio agropecuario · dólar blend 80/20</div>
        <div style={{background:'var(--bg2)',borderRadius:'8px',padding:'12px 16px',display:'flex',alignItems:'center',gap:'16px'}}>
          <div><div style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)',marginBottom:'3px'}}>BLEND AGRO (80% OF + 20% MEP)</div><div style={{fontFamily:'var(--display)',fontSize:'22px',fontWeight:700,color:'var(--white)'}}>{f$(bl)}</div></div>
          <div style={{flex:1,textAlign:'right'}}><div style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)'}}>Brecha vs oficial</div><div style={{fontFamily:'var(--display)',fontSize:'18px',fontWeight:700,color:'var(--accent)'}}>{fP(bBl)}</div></div>
        </div>
      </div>
    </>
  );
}

// ── WIDGET: CBOT ──────────────────────────────────────────
function CbotWidget({ size, goPage }) {
  const hdr = <WHeader title="CBOT · Disponible · USD/tn" dotColor="var(--accent)" page="granos" goPage={goPage} />;
  if (size === 'normal') return (
    <>
      {hdr}
      <Wkc2 items={CBOT.map(g=>({label:g.name,val:g.price,delta:g.badge,cls:g.cls}))} />
      {CBOT.map((g,i)=><GrainRowCompact key={i} g={g} goPage={goPage} />)}
    </>
  );
  if (size === 'wide') return (
    <>
      {hdr}
      <div className="widget-hero" style={{gridTemplateColumns:'repeat(5,1fr)'}}>
        {CBOT.map(g=><div className="widget-kpi" key={g.name}><div className="widget-kpi-label">{g.name}</div><div className="widget-kpi-val">{g.price}</div><div className={`widget-kpi-delta ${g.cls}`}>{g.badge}</div></div>)}
      </div>
      {CBOT.map((g,i)=><GrainRow key={i} g={g} goPage={goPage} />)}
    </>
  );
  return (
    <>
      {hdr}
      <div className="widget-hero" style={{gridTemplateColumns:'repeat(5,1fr)'}}>
        {CBOT.map(g=><div className="widget-kpi" key={g.name}><div className="widget-kpi-label">{g.name}</div><div className="widget-kpi-val">{g.price}</div><div className={`widget-kpi-delta ${g.cls}`}>{g.badge}</div></div>)}
      </div>
      <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:'12px'}}>
        <thead><tr style={{borderBottom:'1px solid var(--line)'}}>
          {['Contrato','USD/tn','Var.','Apertura','Máx.','Mín.'].map((h,i)=>(
            <th key={h} style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)',padding:'8px 14px',textAlign:i>0?'right':'left',fontWeight:400}}>{h}</th>
          ))}
        </tr></thead>
        <tbody>
          {[['Soja','418,9','−1,19','dn','420,1','420,8','417,2'],
            ['Maíz','185,8','+0,31','up','185,5','186,2','184,9'],
            ['Trigo','203,5','−0,47','dn','204,0','204,5','202,8']].map(([n,p,v,c,a,mx,mn])=>(
            <tr key={n} style={{borderBottom:'1px solid var(--line)'}}>
              <td style={{padding:'8px 14px',fontWeight:500,color:'var(--white)'}}>{n}</td>
              <td style={{padding:'8px 14px',textAlign:'right',fontFamily:'var(--mono)',fontWeight:600,color:'var(--white)'}}>{p}</td>
              <td style={{padding:'8px 14px',textAlign:'right'}}><span style={{fontFamily:'var(--mono)',fontSize:'10px',background:`var(--${c==='up'?'green':'red'}-bg)`,color:`var(--${c==='up'?'green':'red'})`,padding:'2px 6px',borderRadius:'4px'}}>{c==='up'?'':''} {v}</span></td>
              {[a,mx,mn].map((val,i)=><td key={i} style={{padding:'8px 14px',textAlign:'right',fontFamily:'var(--mono)',color:'var(--text3)'}}>{val}</td>)}
            </tr>
          ))}
        </tbody>
      </table></div>
      <div style={{padding:'6px 14px 10px',fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)'}}>CME Group (CBOT) · 1 bu soja ≈ 27,22 kg · 1 bu maíz ≈ 25,40 kg · 23/02/2026</div>
    </>
  );
}

// ── WIDGET: Macro KPI ─────────────────────────────────────
function MacroWidget({ size, goPage }) {
  const hdr = <WHeader title="Macroeconomía · INDEC / BCRA / JP Morgan" dotColor="var(--accent)" page="macro" goPage={goPage} />;
  const mkRow = (m,showNote) => (
    <div className="macro-row" key={m.lbl} onClick={()=>goPage('macro')}>
      <div className="macro-row-left">
        <span className="macro-row-lbl">{m.lbl}</span>
        <span className="macro-row-sub"> · {m.sub}</span>
        {showNote && <div className="macro-row-note" style={{fontSize:'10px',color:'var(--text3)',marginTop:'2px'}}>{m.delta}</div>}
      </div>
      <div className="macro-row-right">
        <div className="macro-row-val">{m.val}</div>
        <div className={`macro-row-delta ${m.dcls}`}>{m.delta}</div>
      </div>
    </div>
  );
  if (size === 'normal') return (
    <>
      {hdr}
      <Wkc2 items={[
        {label:'IPC',         val:'2,4%',      delta:' i.a. 74,3%',  cls:'dn'},
        {label:'EMAE',        val:'+5,3%',     delta:' 6to positivo', cls:'up'},
        {label:'Riesgo País', val:'698pb',     delta:' −14pb',        cls:'dn'},
        {label:'Reservas',    val:'USD 42,7B', delta:' +1,2B',        cls:'up'},
      ]} />
      {MAC_ROWS.slice(4,6).map(m=>mkRow(m,false))}
    </>
  );
  if (size === 'wide') return <>{hdr}{MAC_ROWS.map(m=>mkRow(m,false))}</>;
  return <>{hdr}{MAC_ROWS.map(m=>mkRow(m,true))}</>;
}

// ── WIDGET: Índices ───────────────────────────────────────
function IndicesWidget({ size, goPage }) {
  const hdr = <WHeader title="Índices & Relaciones clave" dotColor="var(--green)" page="indices" goPage={goPage} />;
  const mkRow = x => (
    <div className="idx-widget-row" key={x.name} onClick={()=>goPage('indices')} style={{cursor:'pointer'}}>
      <div className="idx-widget-info">
        <div className="idx-widget-name">{x.name}</div>
        <div className="idx-widget-desc">{x.desc}</div>
      </div>
      <div style={{textAlign:'right',minWidth:'52px'}}>
        <div className="idx-widget-val" style={{color:x.clr}}>{x.val}</div>
        <div className="idx-widget-status" style={{color:x.clr}}>{x.st}</div>
      </div>
    </div>
  );
  if (size === 'normal') return (
    <>
      {hdr}
      <Wkc2 items={[{label:'Feedlot',val:'19,8',delta:'FAVORABLE',cls:'up'},{label:'Soja/Urea',val:'0,94',delta:'PRESIÓN',cls:'dn'}]} />
      {IDX.slice(0,3).map(mkRow)}
    </>
  );
  if (size === 'wide') return <>{hdr}{IDX.slice(0,4).map(mkRow)}</>;
  return (
    <>
      {hdr}
      {IDX.map(mkRow)}
      <div style={{padding:'14px 18px',borderTop:'1px solid var(--line)',background:'var(--bg2)'}}>
        <div style={{fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.1em',color:'var(--text3)',marginBottom:'12px',textTransform:'uppercase'}}>Evolución histórica 12 meses</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'16px'}}>
          {[['Feedlot (umbral 15)','var(--green)','10,34 40,30 70,32 100,26 130,22 160,18'],
            ['Cría (umbral 1,30)','var(--green)','10,34 40,31 70,32 100,29 130,27 160,24'],
            ['Soja/Urea (umbral 1,0)','var(--red)','10,12 40,10 70,15 100,18 130,22 160,26']].map(([l,c,pts])=>(
            <div key={l}>
              <div style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text2)',marginBottom:'4px'}}>{l}</div>
              <svg viewBox="0 0 160 40" style={{width:'100%',display:'block'}}>
                <line x1="0" y1="20" x2="160" y2="20" stroke="var(--line)" strokeWidth=".8" strokeDasharray="3,3"/>
                <polyline points={pts} fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round"/>
                <circle cx="160" cy={pts.split(' ').pop().split(',')[1]} r="3" fill={c}/>
              </svg>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ── WIDGET: Insumos ───────────────────────────────────────
function InsumosWidget({ size, goPage }) {
  const hdr = <WHeader title="Insumos · ARS/tn y ARS/litro" dotColor="var(--accent)" page="insumos" goPage={goPage} />;
  const insClr = x => x.cls==='up'?'var(--green)':x.cls==='dn'?'var(--red)':'var(--text3)';
  if (size === 'normal') return (
    <>
      {hdr}
      <Wkc2 items={[
        {label:'Urea gran.',val:'$484k',delta:' −1,6%',cls:'dn'},
        {label:'MAP',       val:'$572k',delta:'= 0%',  cls:'fl'},
        {label:'DAP',       val:'$548k',delta:' +0,7%',cls:'up'},
        {label:'Gasoil G2', val:'$1.247',delta:'= 0%', cls:'fl'},
      ]} />
      {INS.map((x,i)=><GrainRowCompact key={i} g={{...x,name:x.name}} goPage={goPage} page="insumos" />)}
    </>
  );
  if (size === 'wide') return (
    <>
      {hdr}
      <div className="widget-hero" style={{gridTemplateColumns:'repeat(4,1fr)'}}>
        {INS.map(x=><div className="widget-kpi" key={x.name}><div className="widget-kpi-label">{x.name.split(' ')[0]}</div><div className="widget-kpi-val" style={{color:insClr(x)}}>{x.price}</div><div className={`widget-kpi-delta ${x.cls}`}>{x.badge}</div></div>)}
      </div>
      {INS.map((x,i)=><GrainRow key={i} g={x} goPage={goPage} page="insumos" />)}
    </>
  );
  return (
    <>
      {hdr}
      <div className="widget-hero" style={{gridTemplateColumns:'repeat(4,1fr)'}}>
        {INS.map(x=><div className="widget-kpi" key={x.name}><div className="widget-kpi-label">{x.name.split(' ')[0]}</div><div className="widget-kpi-val" style={{color:insClr(x)}}>{x.price}</div><div className={`widget-kpi-delta ${x.cls}`}>{x.badge}</div></div>)}
      </div>
      {INS.map((x,i)=><GrainRow key={i} g={x} goPage={goPage} page="insumos" />)}
      <div style={{padding:'14px 18px',borderTop:'1px solid var(--line)',background:'var(--bg2)'}}>
        <div style={{fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.1em',color:'var(--text3)',marginBottom:'10px',textTransform:'uppercase'}}>Relaciones insumo/producto</div>
        {[['Soja / Urea','47%','var(--red)','0,94'],['Maíz / Urea','26%','var(--red)','0,52'],['Soja / Gasoil','73%','var(--accent)','365 L/tn']].map(([lbl,w,clr,v])=>(
          <div key={lbl} style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'8px'}}>
            <span style={{color:'var(--text2)',minWidth:'120px'}}>{lbl}</span>
            <div style={{flex:1,height:'5px',background:'var(--bg3)',borderRadius:'3px',overflow:'hidden'}}><div style={{width:w,height:'100%',background:clr,borderRadius:'3px',opacity:.85}}></div></div>
            <span style={{fontFamily:'var(--mono)',fontSize:'11px',color:clr,fontWeight:600,minWidth:'44px',textAlign:'right'}}>{v}</span>
          </div>
        ))}
      </div>
    </>
  );
}

// ── WIDGET: Retenciones ───────────────────────────────────
function RetencionesWidget({ size, goPage }) {
  const hdr = <WHeader title="Retenciones · Vigentes 2026" dotColor="var(--red)" page="impuestos" goPage={goPage} />;
  const retRow = (r,showNeto) => (
    <div className="grain-row" key={r.n} onClick={()=>goPage('impuestos')} style={{cursor:'pointer'}}>
      <div><div className="grain-name">{r.n}</div><div className="grain-sub">Pizarra: {r.piz}</div></div>
      <div style={{flexShrink:0,textAlign:'right'}}>
        <div style={{fontFamily:'var(--mono)',fontSize:'11px',fontWeight:700,color:'var(--red)'}}>{r.ali}</div>
        <div style={{fontFamily:'var(--mono)',fontSize:'10px',color:'var(--text3)'}}>{r.ret}/tn</div>
        {showNeto && <div style={{fontFamily:'var(--mono)',fontSize:'10px',color:'var(--green)'}}>neto: {r.neto}</div>}
      </div>
    </div>
  );
  if (size === 'normal') return (
    <>
      {hdr}
      <Wkc2 items={[
        {label:'Soja',    val:'33%', delta:'−$150k/tn', cls:'dn'},
        {label:'Maíz',   val:'12%', delta:'−$30k/tn',  cls:'fl'},
        {label:'Trigo',  val:'12%', delta:'−$30k/tn',  cls:'fl'},
        {label:'Girasol',val:'7%',  delta:'−$36k/tn',  cls:'fl'},
      ]} />
      {RET.slice(0,3).map(r=>retRow(r,false))}
    </>
  );
  if (size === 'wide') return (
    <>
      {hdr}
      {RET.map(r=>retRow(r,false))}
      <div style={{padding:'8px 18px',fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)'}}>Derechos de exportación · Resolución MECON · valores al 27/02/2026</div>
    </>
  );
  return (
    <>
      {hdr}
      <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}>
        <thead><tr style={{borderBottom:'1px solid var(--line)'}}>
          {['Producto','Alícuota','Pizarra hoy','Retención /tn','Neto productor'].map((h,i)=>(
            <th key={h} style={{textAlign:i===0?'left':'right',padding:'9px 14px',fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)',fontWeight:400,letterSpacing:'.08em',textTransform:'uppercase'}}>{h}</th>
          ))}
        </tr></thead>
        <tbody>
          {RET.map(r=>(
            <tr key={r.n} style={{borderBottom:'1px solid var(--line)'}}>
              <td style={{padding:'10px 14px',fontWeight:500,color:'var(--white)'}}>{r.n}</td>
              <td style={{padding:'10px 14px',textAlign:'right',fontFamily:'var(--mono)',fontSize:'13px',fontWeight:700,color:'var(--red)'}}>{r.ali}</td>
              <td style={{padding:'10px 14px',textAlign:'right',fontFamily:'var(--mono)',fontSize:'12px',color:'var(--text2)'}}>{r.piz}</td>
              <td style={{padding:'10px 14px',textAlign:'right',fontFamily:'var(--mono)',fontSize:'12px',color:'var(--red)'}}>{r.ret}</td>
              <td style={{padding:'10px 14px',textAlign:'right',fontFamily:'var(--mono)',fontSize:'13px',fontWeight:600,color:'var(--green)'}}>{r.neto}</td>
            </tr>
          ))}
        </tbody>
      </table></div>
      <div style={{padding:'8px 18px',fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)'}}>Derechos de exportación · Res. MECON · Pizarras 27/02/2026 · Sin IVA ni comisiones</div>
    </>
  );
}

// ── WIDGET: Tasas & UVA ───────────────────────────────────
function TasasWidget({ size, goPage, dolares }) {
  const hdr = <WHeader title="Tasas & UVA · BCRA / BYMA" dotColor="var(--red)" page="financiero" goPage={goPage} />;
  const TASAS = [
    {n:'Plazo Fijo TNA', tna:'29,0%', tea:'33,0%', real:'−2,8%', dcls:'dn'},
    {n:'BADLAR',         tna:'31,5%', tea:'36,5%', real:'−0,5%', dcls:'dn'},
    {n:'TAMAR',          tna:'32,8%', tea:'38,4%', real:'+0,5%', dcls:'up'},
    {n:'Caución 1d',     tna:'28,4%', tea:'32,1%', real:'−3,1%', dcls:'dn'},
  ];
  if (size === 'normal') return (
    <>
      {hdr}
      <Wkc2 items={[
        {label:'Plazo Fijo', val:'29,0%', delta:'TNA 30d', cls:'fl'},
        {label:'BADLAR',     val:'31,5%', delta:'TNA mayor.', cls:'fl'},
        {label:'TAMAR',      val:'32,8%', delta:' +0,5pp', cls:'up'},
        {label:'Tasa real',  val:'−0,5%', delta:'PF−IPC', cls:'dn'},
      ]} />
      {TASAS.slice(0,2).map(t=>(
        <div className="macro-row" key={t.n} onClick={()=>goPage('financiero')} style={{cursor:'pointer'}}>
          <div className="macro-row-left"><span className="macro-row-lbl">{t.n}</span></div>
          <div className="macro-row-right"><div className="macro-row-val">{t.tna}</div><div className={`macro-row-delta ${t.dcls}`}>{t.real} real</div></div>
        </div>
      ))}
    </>
  );
  return (
    <>
      {hdr}
      <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:'12px'}}>
        <thead><tr style={{borderBottom:'1px solid var(--line)'}}>
          {['Tasa','TNA','TEA','Tasa real'].map((h,i)=>(
            <th key={h} style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)',padding:'8px 14px',textAlign:i>0?'right':'left',fontWeight:400}}>{h}</th>
          ))}
        </tr></thead>
        <tbody>
          {TASAS.map(t=>(
            <tr key={t.n} style={{borderBottom:'1px solid var(--line)'}}>
              <td style={{padding:'8px 14px',fontWeight:500,color:'var(--white)'}}>{t.n}</td>
              <td style={{padding:'8px 14px',textAlign:'right',fontFamily:'var(--mono)',fontWeight:600,color:'var(--white)'}}>{t.tna}</td>
              <td style={{padding:'8px 14px',textAlign:'right',fontFamily:'var(--mono)',color:'var(--text3)'}}>{t.tea}</td>
              <td style={{padding:'8px 14px',textAlign:'right'}}><span style={{fontFamily:'var(--mono)',fontSize:'10px',background:`var(--${t.dcls==='up'?'green':'red'}-bg)`,color:`var(--${t.dcls==='up'?'green':'red'})`,padding:'2px 6px',borderRadius:'4px'}}>{t.real}</span></td>
            </tr>
          ))}
        </tbody>
      </table></div>
      <div style={{padding:'6px 14px 10px',fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)'}}>Tasa real = TNA − (IPC mensual × 12) · BCRA / BYMA · 23/02/2026</div>
    </>
  );
}

// ── WIDGET: Dólar Tipos de Cambio ─────────────────────────
function DolarAgroWidget({ size, goPage, dolares }) {
  // Alias de DolarWidget con nombre distinto para el catálogo
  return <DolarWidget size={size} goPage={goPage} dolares={dolares} />;
}

// ── WIDGET: Clima ─────────────────────────────────────────
function ClimaWidget({ size, goPage }) {
  const ESTACIONES = [
    {loc:'Rosario',     temp:'28°', min:'19°', max:'31°', lluvia:'0 mm',  humedad:'62%', viento:'18 km/h NE', ico:'☀️', alerta:''},
    {loc:'Córdoba',     temp:'25°', min:'16°', max:'28°', lluvia:'0 mm',  humedad:'55%', viento:'12 km/h N',  ico:'🌤', alerta:''},
    {loc:'Pergamino',   temp:'27°', min:'18°', max:'30°', lluvia:'2 mm',  humedad:'70%', viento:'15 km/h E',  ico:'🌦', alerta:'ALERTA'},
    {loc:'Bahía Blanca',temp:'22°', min:'14°', max:'25°', lluvia:'8 mm',  humedad:'80%', viento:'32 km/h SW', ico:'🌧', alerta:'LLUVIAS'},
  ];
  const PRONOSTICO = [
    {d:'Mié',ico:'☀️',max:'29°',min:'18°',ll:'2 mm'},
    {d:'Jue',ico:'🌦',max:'24°',min:'15°',ll:'18 mm'},
    {d:'Vie',ico:'🌧',max:'21°',min:'13°',ll:'22 mm'},
    {d:'Sáb',ico:'⛅',max:'26°',min:'16°',ll:'5 mm'},
    {d:'Dom',ico:'☀️',max:'31°',min:'18°',ll:'0 mm'},
    {d:'Lun',ico:'☀️',max:'33°',min:'20°',ll:'0 mm'},
  ];
  const hdr = <WHeader title="Clima · Zona Núcleo pampeana" dotColor="#56b8e6" />;
  if (size === 'normal') return (
    <>
      {hdr}
      <div style={{padding:'14px 18px 4px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'12px'}}>
          <div>
            <div style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:'4px'}}>Rosario · hoy</div>
            <div style={{fontFamily:'var(--display)',fontSize:'42px',fontWeight:700,color:'var(--white)',lineHeight:1,letterSpacing:'-.02em'}}>28°<span style={{fontSize:'20px',color:'var(--text2)'}}>C</span></div>
            <div style={{fontFamily:'var(--mono)',fontSize:'10px',color:'var(--text3)',marginTop:'3px'}}>Min 19° · Máx 31° · Hum 62%</div>
          </div>
          <div style={{fontSize:'36px',marginTop:'4px'}}>☀️</div>
        </div>
        <div style={{fontFamily:'var(--mono)',fontSize:'10px',color:'var(--text3)',marginBottom:'10px'}}>Viento: 18 km/h NE · Sin lluvia</div>
      </div>
      <div style={{display:'flex',borderTop:'1px solid var(--line)'}}>
        {PRONOSTICO.slice(0,5).map(p=>(
          <div key={p.d} style={{flex:1,padding:'8px 4px',textAlign:'center',borderRight:'1px solid var(--line)'}}>
            <div style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)'}}>{p.d}</div>
            <div style={{fontSize:'14px',margin:'3px 0'}}>{p.ico}</div>
            <div style={{fontFamily:'var(--mono)',fontSize:'10px',color:'var(--white)',fontWeight:600}}>{p.max}</div>
            <div style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)'}}>{p.min}</div>
            <div style={{fontFamily:'var(--mono)',fontSize:'9px',color:'#56b8e6',marginTop:'2px'}}>{p.ll}</div>
          </div>
        ))}
      </div>
    </>
  );
  return (
    <>
      {hdr}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'1px',background:'var(--line)',borderBottom:'1px solid var(--line)'}}>
        {ESTACIONES.map(e=>(
          <div key={e.loc} style={{background:'var(--bg1)',padding:'12px 14px'}}>
            <div style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)',letterSpacing:'.06em',textTransform:'uppercase',marginBottom:'6px'}}>{e.loc}</div>
            <div style={{display:'flex',alignItems:'baseline',gap:'6px'}}>
              <div style={{fontFamily:'var(--display)',fontSize:'26px',fontWeight:700,color:'var(--white)',letterSpacing:'-.02em'}}>{e.temp}</div>
              <div style={{fontSize:'18px'}}>{e.ico}</div>
            </div>
            <div style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)',marginTop:'4px'}}>{e.min}–{e.max} · {e.lluvia}</div>
            <div style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)'}}>{e.viento}</div>
            {e.alerta && <div style={{marginTop:'5px',fontFamily:'var(--mono)',fontSize:'8px',color:'var(--accent2)',letterSpacing:'.06em'}}>{e.alerta}</div>}
          </div>
        ))}
      </div>
      <div style={{display:'flex'}}>
        {PRONOSTICO.map(p=>(
          <div key={p.d} style={{flex:1,padding:'10px 4px',textAlign:'center',borderRight:'1px solid var(--line)'}}>
            <div style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)'}}>{p.d}</div>
            <div style={{fontSize:'16px',margin:'4px 0'}}>{p.ico}</div>
            <div style={{fontFamily:'var(--mono)',fontSize:'11px',color:'var(--white)',fontWeight:600}}>{p.max}</div>
            <div style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)'}}>{p.min}</div>
            <div style={{fontFamily:'var(--mono)',fontSize:'10px',color:'#56b8e6',marginTop:'3px'}}>{p.ll}</div>
          </div>
        ))}
      </div>
    </>
  );
}

// ── WIDGET: Calculadora retenciones ───────────────────────
function CalcRetencWidget({ goPage }) {
  const [bruto, setBruto]   = React.useState('');
  const [dolar, setDolar]   = React.useState(1245);
  const [alic, setAlic]     = React.useState(0.33);
  const [flete, setFlete]   = React.useState('');
  const [comis, setComis]   = React.useState(1);
  const [result, setResult] = React.useState(null);

  const calc = () => {
    const b = parseFloat(bruto)||0;
    if (!b) { setResult(null); return; }
    const ret = b*alic, fl = parseFloat(flete)||0, co = b*(parseFloat(comis)||0)/100;
    const neto = b-ret-fl-co;
    const pct = ((ret+fl+co)/b*100).toFixed(1);
    setResult({bruto:b, ret, fl, co, neto, netusd:neto/dolar, pct});
  };

  const fmt = v => '$'+Math.round(v).toLocaleString('es-AR');

  return (
    <>
      <WHeader title="Calculadora · Neto Productor" dotColor="var(--gold)" />
      <div className="calc-body" style={{padding:'16px'}}>
        <div className="calc-fields" style={{gridTemplateColumns:'repeat(2,1fr)'}}>
          <div className="field"><label>Producto</label>
            <select value={alic} onChange={e=>setAlic(parseFloat(e.target.value))}>
              <option value={0.33}>Soja (33%)</option>
              <option value={0.12}>Maíz/Trigo (12%)</option>
              <option value={0.07}>Girasol (7%)</option>
              <option value={0.09}>Carne (9%)</option>
              <option value={0}>Sin retención</option>
            </select>
          </div>
          <div className="field"><label>Precio ARS/tn</label><input type="number" value={bruto} onChange={e=>setBruto(e.target.value)} placeholder="456000" onKeyDown={e=>e.key==='Enter'&&calc()}/></div>
          <div className="field"><label>Flete ARS/tn</label><input type="number" value={flete} onChange={e=>setFlete(e.target.value)} placeholder="18000"/></div>
          <div className="field"><label>Dólar ARS</label><input type="number" value={dolar} onChange={e=>setDolar(parseFloat(e.target.value))}/></div>
        </div>
        <button onClick={calc} style={{width:'100%',background:'var(--accent)',border:'none',color:'#fff',fontFamily:'var(--mono)',fontSize:'11px',letterSpacing:'.08em',padding:'9px',borderRadius:'8px',cursor:'pointer',marginBottom:'16px'}}>CALCULAR</button>
        {result && (
          <div className="calc-out">
            <div className="cout"><div className="cout-label">Precio bruto</div><div className="cout-val">{fmt(result.bruto)}</div><div className="cout-unit">ARS/tn</div></div>
            <div className="cout"><div className="cout-label">Retención</div><div className="cout-val dn">−{fmt(result.ret)}</div><div className="cout-unit">ARS/tn</div></div>
            <div className="cout"><div className="cout-label">Flete</div><div className="cout-val dn">−{fmt(result.fl)}</div><div className="cout-unit">ARS/tn</div></div>
            <div className="cout highlight"><div className="cout-label">Neto ARS/tn</div><div className="cout-val">{fmt(result.neto)}</div><div className="cout-unit">ARS/tn</div></div>
            <div className="cout highlight"><div className="cout-label">Neto USD/tn</div><div className="cout-val">{result.netusd.toFixed(0)}</div><div className="cout-unit">USD/tn</div></div>
            <div className="cout"><div className="cout-label">Presión total</div><div className="cout-val dn">{result.pct}%</div><div className="cout-unit">% del bruto</div></div>
          </div>
        )}
      </div>
    </>
  );
}

// ── WIDGET: Feriados ──────────────────────────────────────
function FeriadosWidget({ goPage, feriados }) {
  const hoy = new Date();
  const lista = (feriados && Array.isArray(feriados))
    ? feriados.filter(f => new Date(f.fecha) >= hoy).slice(0,5)
    : FERIADOS_2026.filter(f => {
        const [d,m] = f.fecha.split('/').map(Number);
        return new Date(2026, m-1, d) >= hoy;
      }).slice(0,5);

  const formatF = f => {
    if (f.fecha && f.fecha.includes('-')) {
      const d = new Date(f.fecha);
      return d.toLocaleDateString('es-AR',{day:'numeric',month:'long'});
    }
    return f.fecha;
  };
  const next = lista[0];
  return (
    <>
      <WHeader title="Próximos feriados 2026" dotColor="var(--accent)" page="feriados" goPage={goPage} />
      {next && (
        <div style={{margin:'12px 18px',background:'var(--acc-bg)',border:'1px solid rgba(77,158,240,.2)',borderRadius:'10px',padding:'14px 16px'}}>
          <div style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--accent)',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:'6px'}}>PRÓXIMO FERIADO</div>
          <div style={{fontFamily:'var(--display)',fontSize:'18px',fontWeight:700,color:'var(--white)',marginBottom:'4px'}}>{formatF(next)}</div>
          <div style={{fontSize:'13px',color:'var(--text2)'}}>{next.nombre}</div>
        </div>
      )}
      <div style={{paddingBottom:'8px'}}>
        {lista.slice(1,5).map((f,i)=>(
          <div key={i} style={{display:'flex',gap:'12px',alignItems:'center',padding:'9px 18px',borderBottom:'1px solid var(--line)'}}>
            <span style={{fontFamily:'var(--mono)',fontSize:'11px',color:'var(--accent)',minWidth:'60px'}}>{formatF(f)}</span>
            <span style={{fontSize:'12px',color:'var(--text2)',flex:1}}>{f.nombre}</span>
          </div>
        ))}
      </div>
    </>
  );
}

// ── Main WidgetRenderer ────────────────────────────────────
export function WidgetRenderer({ widgetId, size, goPage, dolares, feriados }) {
  switch (widgetId) {
    case 'granos-pizarra': return <GranosPizarraWidget size={size} goPage={goPage} />;
    case 'hacienda':       return <HaciendaWidget      size={size} goPage={goPage} />;
    case 'dolar':          return <DolarWidget          size={size} goPage={goPage} dolares={dolares} />;
    case 'cbot':           return <CbotWidget           size={size} goPage={goPage} />;
    case 'indices':        return <IndicesWidget        size={size} goPage={goPage} />;
    case 'insumos':        return <InsumosWidget        size={size} goPage={goPage} />;
    case 'macro-kpi':      return <MacroWidget          size={size} goPage={goPage} />;
    case 'soja-usd':       return <TasasWidget          size={size} goPage={goPage} dolares={dolares} />;
    case 'dolar-agro':     return <DolarAgroWidget      size={size} goPage={goPage} dolares={dolares} />;
    case 'retenciones':    return <RetencionesWidget    size={size} goPage={goPage} />;
    case 'clima-agro':     return <ClimaWidget          size={size} goPage={goPage} />;
    case 'tasas-fin':      return <TasasWidget          size={size} goPage={goPage} />;
    case 'calcretenc':     return <CalcRetencWidget     goPage={goPage} />;
    case 'feriados':       return <FeriadosWidget       goPage={goPage} feriados={feriados} />;
    // Legacy IDs
    case 'granos':         return <GranosPizarraWidget  size={size} goPage={goPage} />;
    case 'dolares':        return <DolarWidget          size={size} goPage={goPage} dolares={dolares} />;
    case 'macro':          return <MacroWidget          size={size} goPage={goPage} />;
    case 'clima':          return <ClimaWidget          size={size} goPage={goPage} />;
    case 'tasas':          return <TasasWidget          size={size} goPage={goPage} />;
    case 'bonos':          return <MacroWidget          size={size} goPage={goPage} />;
    default: return <div style={{padding:'20px',color:'var(--text3)'}}>Widget: {widgetId}</div>;
  }
}
