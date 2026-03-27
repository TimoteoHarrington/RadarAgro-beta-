// InsumosPage.jsx — matches reference HTML exactly
import React from 'react';

export function InsumosPage({ goPage }) {
  return (
    <div className="page-enter">
      <div className="ph">
        <div>
          <div className="ph-title">Insumos <span className="help-pip" onClick={()=>goPage('ayuda')} title="Ayuda">?</span></div>
          <div className="ph-sub">Fertilizantes · Combustibles · Relaciones insumo/producto · 23/02/2026</div>
        </div>
      </div>

      <div className="section">
        <div className="section-title">Fertilizantes · zona núcleo · ARS/tonelada</div>
        <div className="grid grid-4" style={{marginBottom:'16px'}}>
          <div className="stat c-red"><div className="stat-label">Urea Gran. <span className="stat-badge dn"> −1,6%</span></div><div className="stat-val">$484.000</div><div className="stat-delta dn"> −$8.000 hoy</div><div className="stat-meta">USD 388/tn · Soja/Urea: <strong style={{color:'var(--red)'}}>0,94</strong> → bajo presión</div></div>
          <div className="stat c-flat"><div className="stat-label">MAP <span className="stat-badge fl">= 0%</span></div><div className="stat-val">$572.000</div><div className="stat-delta fl">= sin cambios</div><div className="stat-meta">USD 459/tn · Fórmula 11-52-0</div></div>
          <div className="stat c-green"><div className="stat-label">DAP <span className="stat-badge up"> +0,7%</span> <span style={{fontFamily:'var(--mono)',fontSize:'8px',background:'var(--bg3)',color:'var(--text3)',padding:'1px 5px',borderRadius:'3px',marginLeft:'4px'}}>REFERENCIA</span></div><div className="stat-val">$548.000</div><div className="stat-delta up"> +$4.000 hoy</div><div className="stat-meta">USD 440/tn · Fórmula 18-46-0</div></div>
          <div className="stat c-flat"><div className="stat-label">UAN 28-0-0 <span className="stat-badge fl">= 0%</span></div><div className="stat-val">$312.000</div><div className="stat-delta fl">= sin cambios</div><div className="stat-meta">USD 250/tn · solución nitrogenada</div></div>
        </div>
      </div>

      <div className="section">
        <div className="section-title">Combustibles · YPF / Secretaría de Energía</div>
        <div className="grid grid-4">
          <div className="stat c-flat"><div className="stat-label">Gasoil G2 · YPF <span className="stat-badge fl">= 0%</span></div><div className="stat-val">$1.247</div><div className="stat-delta fl">= sin cambios</div><div className="stat-meta">ARS/litro · al surtidor</div></div>
          <div className="stat c-flat"><div className="stat-label">Gasoil Agro <span className="stat-badge fl">SUBSIDIO</span></div><div className="stat-val">$1.180</div><div className="stat-delta fl">= sin cambios</div><div className="stat-meta">ARS/litro · con beneficio agropecuario</div></div>
          <div className="stat c-flat"><div className="stat-label">Gasoil en USD</div><div className="stat-val">USD 1,00</div><div className="stat-meta">$1.247 / $1.245 MEP</div></div>
          <div className="stat c-flat"><div className="stat-label">Soja / Gasoil</div><div className="stat-val">365 L</div><div className="stat-meta">litros por tonelada de soja producida</div></div>
        </div>
      </div>

      <div className="section">
        <div className="section-title">Relaciones insumo / producto</div>
        <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:'10px',padding:'16px 20px',marginBottom:'14px'}}>
          <div style={{fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text3)',marginBottom:'14px'}}>Estado actual · rojo = presión, verde = holgura</div>
          <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
            {[
              ['Soja / Urea','0,94','var(--red)',47,true,'hace 1m: 0,97'],
              ['Maíz / Urea','0,52','var(--red)',26,true,'hace 1m: 0,54'],
              ['Trigo / MAP','0,43','var(--red)',21.5,true,'hace 1m: 0,45'],
              ['Soja / Gasoil','365 L','var(--accent)',73,false,'hace 1m: 362'],
              ['Ternero / Gasoil','5,46 L','var(--accent)',54.6,false,'hace 1m: 5,22'],
            ].map(([label,val,color,w,hasRef,nota])=>(
              <div key={label} style={{display:'flex',alignItems:'center',gap:'14px'}}>
                <span style={{fontSize:'12px',fontWeight:500,color:'var(--text2)',flex:'0 0 160px'}}>{label}</span>
                <div style={{flex:1,height:'6px',background:'var(--bg3)',borderRadius:'3px',overflow:'hidden',position:'relative'}}>
                  <div style={{width:`${w}%`,height:'100%',background:color,borderRadius:'3px',opacity:.8}}></div>
                  {hasRef && <div style={{position:'absolute',left:'50%',top:'-2px',height:'10px',width:'1.5px',background:'var(--white)',opacity:.5}}></div>}
                </div>
                <span style={{fontFamily:'var(--mono)',fontSize:'12px',color:color,fontWeight:600,minWidth:'50px',textAlign:'right'}}>{val}</span>
                <span style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)',minWidth:'60px'}}>{nota}</span>
              </div>
            ))}
          </div>
          <div style={{marginTop:'10px',fontFamily:'var(--mono)',fontSize:'8px',color:'var(--text3)'}}>Línea vertical = umbral de referencia 1,0 · Barras de combustibles = relativo al máximo histórico 500L</div>
        </div>

        <div style={{marginTop:'20px',background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:'10px',padding:'18px 22px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:'4px'}}>
            <div style={{fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.12em',textTransform:'uppercase',color:'var(--text3)'}}>Fertilizantes · evolución ARS/tn · Mar 2025 – Feb 2026</div>
            <div style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)'}}>zona núcleo</div>
          </div>
          <div style={{display:'flex',gap:'16px',marginBottom:'12px',flexWrap:'wrap'}}>
            <span style={{fontFamily:'var(--mono)',fontSize:'10px',display:'flex',alignItems:'center',gap:'5px'}}><span style={{width:'12px',height:'3px',display:'inline-block',background:'#f0d050',borderRadius:'2px'}}></span>Urea Gran.</span>
            <span style={{fontFamily:'var(--mono)',fontSize:'10px',display:'flex',alignItems:'center',gap:'5px'}}><span style={{width:'12px',height:'3px',display:'inline-block',background:'#4d9ef0',borderRadius:'2px'}}></span>MAP (11-52-0)</span>
            <span style={{fontFamily:'var(--mono)',fontSize:'10px',display:'flex',alignItems:'center',gap:'5px'}}><span style={{width:'12px',height:'3px',display:'inline-block',background:'#56c97a',borderRadius:'2px'}}></span>DAP (18-46-0)</span>
          </div>
          <canvas id="insumos-hist-canvas" style={{width:'100%',height:'200px',display:'block',cursor:'crosshair'}}></canvas>
          <div id="insumos-hist-tooltip" style={{fontFamily:'var(--mono)',fontSize:'10px',color:'var(--text2)',minHeight:'16px',marginTop:'8px',textAlign:'center',letterSpacing:'.04em'}}></div>
          <div style={{display:'flex',gap:'24px',marginTop:'12px',paddingTop:'10px',borderTop:'1px solid var(--line)',flexWrap:'wrap'}}>
            <div style={{fontFamily:'var(--mono)',fontSize:'10px'}}><span style={{color:'var(--text3)'}}>Urea var. 12m: </span><span style={{color:'#f0d050',fontWeight:700}}>+75,5%</span></div>
            <div style={{fontFamily:'var(--mono)',fontSize:'10px'}}><span style={{color:'var(--text3)'}}>MAP var. 12m: </span><span style={{color:'#4d9ef0',fontWeight:700}}>+78,1%</span></div>
            <div style={{fontFamily:'var(--mono)',fontSize:'10px'}}><span style={{color:'var(--text3)'}}>Soja/Urea prom: </span><span style={{color:'var(--red)',fontWeight:700}}>1,02 (bajo)</span></div>
            <div style={{fontFamily:'var(--mono)',fontSize:'10px'}}><span style={{color:'var(--text3)'}}>Urea USD feb 2026: </span><span style={{color:'var(--text2)',fontWeight:700}}>USD 388/tn</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
