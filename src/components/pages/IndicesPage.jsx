// IndicesPage.jsx — matches reference HTML exactly
import React from 'react';

export function IndicesPage({ goPage }) {
  return (
    <div className="page-enter">
      <div className="ph">
        <div>
          <div className="ph-title">Índices &amp; Precios Relativos <span className="help-pip" onClick={()=>goPage('ayuda')} title="Ayuda">?</span></div>
          <div className="ph-sub">Relaciones de precios clave del sector · Rosario spot · 23/02/2026</div>
        </div>
      </div>

      <div className="section">
        <div className="section-title">Resumen · estado actual</div>
        <div className="grid grid-4">
          <div className="stat c-green"><div className="stat-label">Feedlot · Novillo/Maíz <span className="stat-badge up">VIABLE</span></div><div className="stat-val">19,8</div><div className="stat-delta up"> +4,8 sobre umbral (15)</div><div className="stat-meta">Promedio histórico: 16,4 · Tendencia ↑</div></div>
          <div className="stat c-green"><div className="stat-label">Cría · Ternero/Novillo <span className="stat-badge up">POSITIVO</span></div><div className="stat-val">1,37</div><div className="stat-delta up"> +0,07 sobre umbral (1,30)</div><div className="stat-meta">Promedio histórico: 1,30 · Tendencia →</div></div>
          <div className="stat c-red"><div className="stat-label">Soja / Urea <span className="stat-badge dn">PRESIÓN</span></div><div className="stat-val">0,94</div><div className="stat-delta dn"> −0,06 bajo umbral (1,0)</div><div className="stat-meta">Promedio histórico: 1,10 · Tendencia ↓</div></div>
          <div className="stat c-flat"><div className="stat-label">Gasoil / Soja <span className="stat-badge fl">REF</span></div><div className="stat-val">365 L</div><div className="stat-delta dn"> +23 L vs año anterior</div><div className="stat-meta">Litros de gasoil por tonelada de soja producida</div></div>
        </div>
      </div>

      {/* 1. FEEDLOT */}
      <div className="section">
        <div className="section-title">Feedlot — Novillo / Maíz · kg vivo por tonelada de maíz</div>
        <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:'12px',overflow:'hidden'}}>
          <div style={{padding:'14px 20px 10px',borderBottom:'1px solid var(--line)',display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:'8px'}}>
            <div>
              <div style={{fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.12em',textTransform:'uppercase',color:'var(--text3)'}}>Ratio Novillo (ARS/kg) ÷ Maíz (ARS/tn) · últimos 24 meses</div>
              <div id="idx-feedlot-tooltip" style={{fontFamily:'var(--mono)',fontSize:'10px',color:'var(--text2)',marginTop:'3px',minHeight:'14px'}}></div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:'14px'}}>
              <div style={{display:'flex',alignItems:'center',gap:'5px'}}><div style={{width:'20px',height:'2px',background:'#56c97a'}}></div><span style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)'}}>Feedlot</span></div>
              <div style={{display:'flex',alignItems:'center',gap:'5px'}}><div style={{width:'20px',height:'1.5px',background:'rgba(255,255,255,0.3)',borderTop:'1px dashed rgba(255,255,255,0.3)'}}></div><span style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)'}}>Umbral 15</span></div>
            </div>
          </div>
          <div style={{padding:'16px 20px 12px'}}>
            <canvas id="idx-feedlot-canvas" style={{width:'100%',height:'220px',display:'block',cursor:'crosshair'}}></canvas>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'1px',background:'var(--line)',borderTop:'1px solid var(--line)'}}>
            {[['Actual','19,8','var(--green)'],['Hace 6 meses','18,4','var(--white)'],['Hace 12 meses','15,2','var(--white)'],['Umbral viable','15,0','var(--text3)']].map(([l,v,c])=>(
              <div key={l} style={{background:'var(--bg2)',padding:'10px 14px',textAlign:'center'}}><div style={{fontFamily:'var(--mono)',fontSize:'8px',color:'var(--text3)',textTransform:'uppercase',marginBottom:'3px'}}>{l}</div><div style={{fontFamily:'var(--mono)',fontSize:'16px',fontWeight:700,color:c}}>{v}</div></div>
            ))}
          </div>
        </div>
        <div className="source">Fuente: MAG Cañuelas (novillo) · BCR Rosario (maíz) · elaboración propia</div>
      </div>

      {/* 2. CRÍA */}
      <div className="section">
        <div className="section-title">Cría — Ternero / Novillo · ratio de precios</div>
        <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:'12px',overflow:'hidden'}}>
          <div style={{padding:'14px 20px 10px',borderBottom:'1px solid var(--line)',display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:'8px'}}>
            <div>
              <div style={{fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.12em',textTransform:'uppercase',color:'var(--text3)'}}>Precio Ternero ÷ Precio Novillo · últimos 24 meses</div>
              <div id="idx-cria-tooltip" style={{fontFamily:'var(--mono)',fontSize:'10px',color:'var(--text2)',marginTop:'3px',minHeight:'14px'}}></div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:'14px'}}>
              <div style={{display:'flex',alignItems:'center',gap:'5px'}}><div style={{width:'20px',height:'2px',background:'#4d9ef0'}}></div><span style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)'}}>Ternero/Novillo</span></div>
              <div style={{display:'flex',alignItems:'center',gap:'5px'}}><div style={{width:'20px',height:'1.5px',background:'rgba(255,255,255,0.3)',borderTop:'1px dashed rgba(255,255,255,0.3)'}}></div><span style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)'}}>Umbral 1,30</span></div>
            </div>
          </div>
          <div style={{padding:'16px 20px 12px'}}>
            <canvas id="idx-cria-canvas" style={{width:'100%',height:'220px',display:'block',cursor:'crosshair'}}></canvas>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'1px',background:'var(--line)',borderTop:'1px solid var(--line)'}}>
            {[['Actual','1,37','var(--green)'],['Hace 6 meses','1,33','var(--white)'],['Hace 12 meses','1,29','var(--white)'],['Umbral favorable','1,30','var(--text3)']].map(([l,v,c])=>(
              <div key={l} style={{background:'var(--bg2)',padding:'10px 14px',textAlign:'center'}}><div style={{fontFamily:'var(--mono)',fontSize:'8px',color:'var(--text3)',textTransform:'uppercase',marginBottom:'3px'}}>{l}</div><div style={{fontFamily:'var(--mono)',fontSize:'16px',fontWeight:700,color:c}}>{v}</div></div>
            ))}
          </div>
        </div>
        <div className="source">Fuente: MAG Cañuelas · elaboración propia</div>
      </div>

      {/* 3. SOJA/UREA */}
      <div className="section">
        <div className="section-title">Insumos — Soja / Urea · toneladas de soja por tonelada de urea</div>
        <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:'12px',overflow:'hidden'}}>
          <div style={{padding:'14px 20px 10px',borderBottom:'1px solid var(--line)',display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:'8px'}}>
            <div>
              <div style={{fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.12em',textTransform:'uppercase',color:'var(--text3)'}}>Precio Soja ÷ Precio Urea · últimos 24 meses</div>
              <div id="idx-sojaurea-tooltip" style={{fontFamily:'var(--mono)',fontSize:'10px',color:'var(--text2)',marginTop:'3px',minHeight:'14px'}}></div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:'14px'}}>
              <div style={{display:'flex',alignItems:'center',gap:'5px'}}><div style={{width:'20px',height:'2px',background:'#f0b840'}}></div><span style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)'}}>Soja/Urea</span></div>
              <div style={{display:'flex',alignItems:'center',gap:'5px'}}><div style={{width:'20px',height:'1.5px',background:'rgba(255,255,255,0.3)',borderTop:'1px dashed rgba(255,255,255,0.3)'}}></div><span style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)'}}>Umbral 1,0</span></div>
            </div>
          </div>
          <div style={{padding:'16px 20px 12px'}}>
            <canvas id="idx-sojaurea-canvas" style={{width:'100%',height:'220px',display:'block',cursor:'crosshair'}}></canvas>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'1px',background:'var(--line)',borderTop:'1px solid var(--line)'}}>
            {[['Actual','0,94','var(--red)'],['Hace 6 meses','0,97','var(--white)'],['Hace 12 meses','1,08','var(--white)'],['Umbral rentable','1,00','var(--text3)']].map(([l,v,c])=>(
              <div key={l} style={{background:'var(--bg2)',padding:'10px 14px',textAlign:'center'}}><div style={{fontFamily:'var(--mono)',fontSize:'8px',color:'var(--text3)',textTransform:'uppercase',marginBottom:'3px'}}>{l}</div><div style={{fontFamily:'var(--mono)',fontSize:'16px',fontWeight:700,color:c}}>{v}</div></div>
            ))}
          </div>
        </div>
        <div className="source">Fuente: BCR Rosario (soja) · zona núcleo (urea) · elaboración propia</div>
      </div>

      {/* 4. PRECIOS RELATIVOS */}
      <div className="section">
        <div className="section-title">Precios relativos — Maíz/Soja · Trigo/Maíz · Gasoil/Soja</div>
        <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:'12px',overflow:'hidden'}}>
          <div style={{padding:'14px 20px 10px',borderBottom:'1px solid var(--line)',display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:'8px'}}>
            <div>
              <div style={{fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.12em',textTransform:'uppercase',color:'var(--text3)'}}>Ratios de precios entre granos y combustible · últimos 24 meses</div>
              <div id="idx-relativos-tooltip" style={{fontFamily:'var(--mono)',fontSize:'10px',color:'var(--text2)',marginTop:'3px',minHeight:'14px'}}></div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:'14px',flexWrap:'wrap'}}>
              {[['#56c97a','Maíz/Soja'],['#4d9ef0','Trigo/Maíz'],['#f07070','Gasoil/Soja (÷1000 L)']].map(([c,l])=>(
                <div key={l} style={{display:'flex',alignItems:'center',gap:'5px'}}><div style={{width:'20px',height:'2px',background:c}}></div><span style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)'}}>{l}</span></div>
              ))}
            </div>
          </div>
          <div style={{padding:'16px 20px 12px'}}>
            <canvas id="idx-relativos-canvas" style={{width:'100%',height:'220px',display:'block',cursor:'crosshair'}}></canvas>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'1px',background:'var(--line)',borderTop:'1px solid var(--line)'}}>
            <div style={{background:'var(--bg2)',padding:'12px 16px'}}><div style={{fontFamily:'var(--mono)',fontSize:'8px',color:'var(--text3)',textTransform:'uppercase',marginBottom:'6px'}}>Maíz / Soja</div><div style={{fontFamily:'var(--mono)',fontSize:'18px',fontWeight:700,color:'var(--white)'}}>0,552</div><div style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)',marginTop:'3px'}}>hace 1a: 0,534 · hace 1m: 0,548</div><div style={{fontSize:'10px',color:'var(--text2)',marginTop:'4px'}}>1 tn maíz = 55% del precio de 1 tn soja</div></div>
            <div style={{background:'var(--bg2)',padding:'12px 16px'}}><div style={{fontFamily:'var(--mono)',fontSize:'8px',color:'var(--text3)',textTransform:'uppercase',marginBottom:'6px'}}>Trigo / Maíz</div><div style={{fontFamily:'var(--mono)',fontSize:'18px',fontWeight:700,color:'var(--white)'}}>0,986</div><div style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)',marginTop:'3px'}}>hace 1a: 0,978 · hace 1m: 0,994</div><div style={{fontSize:'10px',color:'var(--text2)',marginTop:'4px'}}>Paridad casi perfecta · leve caída</div></div>
            <div style={{background:'var(--bg2)',padding:'12px 16px'}}><div style={{fontFamily:'var(--mono)',fontSize:'8px',color:'var(--text3)',textTransform:'uppercase',marginBottom:'6px'}}>Gasoil / Soja</div><div style={{fontFamily:'var(--mono)',fontSize:'18px',fontWeight:700,color:'var(--red)'}}>365 L/tn</div><div style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)',marginTop:'3px'}}>hace 1a: 342 L · hace 1m: 358 L</div><div style={{fontSize:'10px',color:'var(--text2)',marginTop:'4px'}}>Combustible más caro relativo a la soja</div></div>
          </div>
        </div>
        <div className="source">Fuente: BCR Rosario · YPF / Secretaría de Energía · elaboración propia</div>
      </div>
    </div>
  );
}
