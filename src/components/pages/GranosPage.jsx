// GranosPage.jsx — matches reference HTML exactly
import React, { useState } from 'react';

export function GranosPage({ goPage }) {
  const [moneda, setMoneda] = useState('ARS');
  const [activeTab, setActiveTab] = useState('plazas');
  return (
    <div className="page-enter">
      <div className="ph">
        <div>
          <div className="ph-title">Granos <span className="help-pip" onClick={() => goPage('ayuda')} title="Ayuda">?</span></div>
          <div className="ph-sub">Pizarra BCR · Plazas Argentina · Chicago CBOT · 23/02/2026</div>
        </div>
        <div className="ph-right">
          <div className="toggle">
            <button className={`tg${moneda==='ARS'?' active':''}`} onClick={()=>setMoneda('ARS')}>ARS/tn</button>
            <button className={`tg${moneda==='USD'?' active':''}`} onClick={()=>setMoneda('USD')}>USD/tn</button>
          </div>
        </div>
      </div>
      <div className="tabs">
        <button className={`tab${activeTab==='plazas'?' active':''}`} onClick={()=>setActiveTab('plazas')}>Plazas ARG</button>
        <button className={`tab${activeTab==='cbot'?' active':''}`} onClick={()=>setActiveTab('cbot')}>Chicago</button>
      </div>
      {activeTab==='plazas' && (
        <div>
          <div className="section">
            <div className="grid grid-5">
              <div className="stat c-red"><div className="stat-label">Soja · Rosario <span className="stat-badge dn"> −1,9%</span></div><div className="stat-val">$456.000</div><div className="stat-delta dn"> $9.000 · USD 366/tn</div><div className="stat-meta">FAS: USD 307.520 · FOB: USD 396</div><svg className="spark" viewBox="0 0 80 40"><polyline points="0,32 12,28 24,24 36,26 48,18 60,20 72,13 80,10" fill="none" stroke="var(--red)" strokeWidth="1.5"/><polygon points="0,32 12,28 24,24 36,26 48,18 60,20 72,13 80,10 80,40 0,40" fill="var(--red-bg)"/></svg></div>
              <div className="stat c-red"><div className="stat-label">Maíz · Rosario <span className="stat-badge dn"> −0,3%</span></div><div className="stat-val">$251.600</div><div className="stat-delta dn"> $800 · USD 202/tn</div><div className="stat-meta">BsAs $249k · BBca $249,5k · Que $248,5k</div><svg className="spark" viewBox="0 0 80 40"><polyline points="0,24 12,26 24,30 36,24 48,20 60,22 72,16 80,14" fill="none" stroke="var(--red)" strokeWidth="1.5"/><polygon points="0,24 12,26 24,30 36,24 48,20 60,22 72,16 80,14 80,40 0,40" fill="var(--red-bg)"/></svg></div>
              <div className="stat c-red"><div className="stat-label">Trigo · Rosario <span className="stat-badge dn"> −1,2%</span></div><div className="stat-val">$248.000</div><div className="stat-delta dn"> $3.050 · USD 199/tn</div><div className="stat-meta">BsAs $246k · BBca $246k</div><svg className="spark" viewBox="0 0 80 40"><polyline points="0,30 12,26 24,22 36,24 48,18 60,16 72,18 80,14" fill="none" stroke="var(--red)" strokeWidth="1.5"/><polygon points="0,30 12,26 24,22 36,24 48,18 60,16 72,18 80,14 80,40 0,40" fill="var(--red-bg)"/></svg></div>
              <div className="stat c-red"><div className="stat-label">Girasol · Rosario <span className="stat-badge dn"> −1,4%</span></div><div className="stat-val">$519.460</div><div className="stat-delta dn"> $7.600 · USD 417/tn</div><div className="stat-meta">BBca $515k</div><svg className="spark" viewBox="0 0 80 40"><polyline points="0,22 12,18 24,15 36,14 48,11 60,12 72,9 80,10" fill="none" stroke="var(--red)" strokeWidth="1.5"/><polygon points="0,22 12,18 24,15 36,14 48,11 60,12 72,9 80,10 80,40 0,40" fill="var(--red-bg)"/></svg></div>
              <div className="stat c-flat"><div className="stat-label">Sorgo · Rosario <span className="stat-badge fl">= 0%</span></div><div className="stat-val">$218.500</div><div className="stat-delta fl">= sin cambios</div><div className="stat-meta">USD 175/tn</div><svg className="spark" viewBox="0 0 80 40"><polyline points="0,20 15,20 30,22 45,20 60,21 75,19 80,20" fill="none" stroke="var(--text3)" strokeWidth="1.5"/></svg></div>
            </div>
          </div>
          <div className="tbl-wrap"><div className="tbl-scroll"><table>
            <thead><tr><th>Producto</th><th className="r">Rosario</th><th className="r">Bs. Aires</th><th className="r">Bahía Blanca</th><th className="r">Quequén</th><th className="r">Córdoba</th><th className="r">Var. diaria</th></tr></thead>
            <tbody>
              <tr><td className="bold">Soja</td><td className="r w">$ 456.000</td><td className="r dim">S/C</td><td className="r dim">S/C</td><td className="r dim">S/C</td><td className="r dim">S/C</td><td className="r"><span className="pill dn"> −$9.000</span></td></tr>
              <tr><td className="bold">Maíz</td><td className="r w">$ 251.600</td><td className="r mono">$ 249.000</td><td className="r mono">$ 249.500</td><td className="r mono">$ 248.500</td><td className="r mono">$ 250.200</td><td className="r"><span className="pill dn"> −$800</span></td></tr>
              <tr><td className="bold">Trigo</td><td className="r w">$ 248.000</td><td className="r mono">$ 246.000</td><td className="r mono">$ 246.000</td><td className="r mono">$ 245.500</td><td className="r dim">S/C</td><td className="r"><span className="pill dn"> −$3.050</span></td></tr>
              <tr><td className="bold">Girasol</td><td className="r w">$ 519.460</td><td className="r dim">S/C</td><td className="r mono">$ 515.000</td><td className="r dim">S/C</td><td className="r dim">S/C</td><td className="r"><span className="pill dn"> −$7.600</span></td></tr>
              <tr><td className="bold">Sorgo</td><td className="r w">$ 218.500</td><td className="r dim">S/C</td><td className="r dim">S/C</td><td className="r dim">S/C</td><td className="r dim">S/C</td><td className="r"><span className="pill fl">= sin cambios</span></td></tr>
              <tr><td className="bold">Cebada</td><td className="r w">$ 231.000</td><td className="r mono">$ 229.500</td><td className="r mono">$ 228.000</td><td className="r dim">S/C</td><td className="r dim">S/C</td><td className="r"><span className="pill up"> +$1.500</span></td></tr>
            </tbody>
          </table></div></div>
          <div className="source">Fuente: BCR — Cámara Arbitral de Cereales · 23-02-2026</div>
          <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:'12px',overflow:'hidden',marginTop:'20px'}}>
            <div style={{padding:'14px 20px 12px',borderBottom:'1px solid var(--line)',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'8px'}}>
              <div>
                <div style={{fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.12em',textTransform:'uppercase',color:'var(--text3)'}}>Evolución precios — USD/tn · BCR Rosario · últimos 12 meses</div>
                <div style={{fontSize:'10px',color:'var(--text2)',marginTop:'3px'}}>Hover sobre el gráfico para ver valores exactos</div>
              </div>
              <div style={{display:'flex',gap:'16px'}}>
                <div style={{display:'flex',alignItems:'center',gap:'6px'}}><div style={{width:'24px',height:'2px',background:'#56c97a',borderRadius:'1px'}}></div><span style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)'}}>Soja</span></div>
                <div style={{display:'flex',alignItems:'center',gap:'6px'}}><div style={{width:'24px',height:'2px',background:'#f0b840',borderRadius:'1px'}}></div><span style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)'}}>Maíz</span></div>
                <div style={{display:'flex',alignItems:'center',gap:'6px'}}><div style={{width:'24px',height:'2px',background:'#4d9ef0',borderRadius:'1px'}}></div><span style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)'}}>Girasol ÷2</span></div>
              </div>
            </div>
            <div style={{padding:'16px 20px 12px',position:'relative'}}>
              <canvas id="grain-hist-chart" style={{width:'100%',height:'220px',display:'block',cursor:'crosshair'}}></canvas>
              <div id="grain-hist-tooltip" style={{fontFamily:'var(--mono)',fontSize:'10px',color:'var(--text2)',minHeight:'16px',marginTop:'8px',textAlign:'center',letterSpacing:'.04em'}}></div>
            </div>
            <div style={{padding:'6px 20px 12px',display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'1px',background:'var(--line)',borderTop:'1px solid var(--line)'}}>
              {[['Soja prom. 6m','USD 379','var(--green)','vs USD 366 hoy'],['Maíz prom. 6m','USD 208','var(--gold)','vs USD 202 hoy'],['Soja / Maíz','1,81×','var(--white)','relación actual'],['Campaña 25/26','−3,8%','var(--accent)','soja vs inicio']].map(([l,v,c,m])=>(
                <div key={l} style={{background:'var(--bg2)',padding:'10px 14px',textAlign:'center'}}>
                  <div style={{fontFamily:'var(--mono)',fontSize:'8px',color:'var(--text3)',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:'4px'}}>{l}</div>
                  <div style={{fontFamily:'var(--mono)',fontSize:'14px',fontWeight:700,color:c}}>{v}</div>
                  <div style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)'}}>{m}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {activeTab==='cbot' && (
        <div>
          <div className="tbl-wrap"><div className="tbl-scroll"><table>
            <thead><tr><th>Commodity</th><th className="r">USD/bu</th><th className="r">USD/tn</th><th className="r">Variación</th><th className="r">Apertura</th><th className="r">Máx.</th><th className="r">Mín.</th></tr></thead>
            <tbody>
              <tr><td className="bold">Soja</td><td className="r mono">11,40</td><td className="r w">418,9</td><td className="r"><span className="pill dn"> −1,19</span></td><td className="r dim mono">420,1</td><td className="r dim mono">420,8</td><td className="r dim mono">417,2</td></tr>
              <tr><td className="bold">Maíz</td><td className="r mono">4,72</td><td className="r w">185,8</td><td className="r"><span className="pill up"> +0,31</span></td><td className="r dim mono">185,5</td><td className="r dim mono">186,2</td><td className="r dim mono">184,9</td></tr>
              <tr><td className="bold">Trigo</td><td className="r mono">5,54</td><td className="r w">203,5</td><td className="r"><span className="pill dn"> −0,47</span></td><td className="r dim mono">204,0</td><td className="r dim mono">204,5</td><td className="r dim mono">202,8</td></tr>
            </tbody>
          </table></div></div>
          <div className="source">Fuente: CME Group (CBOT) · Precio disponible (nearby) · 1 bu soja = 27,22 kg · 1 bu maíz = 25,40 kg · Act. 23/02/2026</div>
          <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:'12px',overflow:'hidden',marginTop:'20px'}}>
            <div style={{padding:'14px 20px 12px',borderBottom:'1px solid var(--line)'}}>
              <div style={{fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.12em',textTransform:'uppercase',color:'var(--text3)'}}>Análisis Basis — BCR Rosario vs CBOT · USD/tn</div>
              <div style={{fontSize:'10px',color:'var(--text2)',marginTop:'3px'}}>Basis = Precio local (BCR) − Precio internacional (CBOT). Basis negativo = descuento por costos logísticos y retenciones.</div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1px 1fr 1px 1fr',background:'var(--line)'}}>
              {[
                {name:'Soja',bcr:'USD 366',cbot:'USD 419',basis:'−USD 53',bc:'var(--red)',nota:'−12,6% vs CBOT · retenc. 33%+flete'},
                {name:'Maíz',bcr:'USD 202',cbot:'USD 186',basis:'+USD 16',bc:'var(--green)',nota:'+8,6% sobre CBOT · mayor demanda local'},
                {name:'Trigo',bcr:'USD 199',cbot:'USD 204',basis:'−USD 5',bc:'var(--text3)',nota:'−2,5% · diferencial pequeño · ret. 12%'},
              ].map((item,i)=>(
                <React.Fragment key={item.name}>
                  <div style={{background:'var(--bg1)',padding:'18px 20px'}}>
                    <div style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:'10px'}}>{item.name}</div>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:'6px'}}><span style={{fontSize:'12px',color:'var(--text2)'}}>BCR Rosario</span><span style={{fontFamily:'var(--mono)',fontWeight:600,color:'var(--white)'}}>{item.bcr}</span></div>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:'6px'}}><span style={{fontSize:'12px',color:'var(--text2)'}}>CBOT MAR-26</span><span style={{fontFamily:'var(--mono)',fontWeight:600,color:'var(--white)'}}>{item.cbot}</span></div>
                    <div style={{display:'flex',justifyContent:'space-between',paddingTop:'8px',borderTop:'1px solid var(--line)'}}><span style={{fontSize:'12px',fontWeight:600,color:'var(--text2)'}}>Basis</span><span style={{fontFamily:'var(--mono)',fontWeight:700,color:item.bc}}>{item.basis}</span></div>
                    <div style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)',marginTop:'4px'}}>{item.nota}</div>
                  </div>
                  {i<2 && <div style={{background:'var(--line)'}}></div>}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
