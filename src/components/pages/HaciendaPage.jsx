// HaciendaPage.jsx — matches reference HTML exactly
import React, { useState } from 'react';

export function HaciendaPage({ goPage }) {
  const [activeTab, setActiveTab] = useState('faena');
  return (
    <div className="page-enter">
      <div className="ph">
        <div>
          <div className="ph-title">Hacienda <span className="help-pip" onClick={()=>goPage('ayuda')} title="Ayuda">?</span></div>
          <div className="ph-sub">Faena · Invernada y Cría · MAG Cañuelas · Harrington &amp; La Fuente · 20/02/2026</div>
        </div>
      </div>
      <div className="tabs">
        <button className={`tab${activeTab==='faena'?' active':''}`} onClick={()=>setActiveTab('faena')}>Faena</button>
        <button className={`tab${activeTab==='inv'?' active':''}`} onClick={()=>setActiveTab('inv')}>Invernada y Cría</button>
      </div>

      {activeTab==='faena' && (
        <div className="section">
          <div className="alert-strip info" style={{marginBottom:'20px'}}>
            <span className="alert-text">Precios expresados como rango <strong>mínimo – máximo</strong> en ARS/kg vivo · Fuente: MAG Cañuelas · 20/02/2026 · La variación se calcula sobre el promedio del rango vs. semana anterior</span>
          </div>
          <div className="section-title">Novillos</div>
          <div className="tbl-wrap" style={{marginBottom:'24px'}}><table>
            <thead><tr><th>Categoría</th><th className="r">Mínimo ARS/kg</th><th className="r">Máximo ARS/kg</th><th className="r">Promedio</th><th className="r">Sem. anterior</th><th className="r">Var. %</th></tr></thead>
            <tbody>
              <tr><td className="bold">Novillitos (290–340 kg)</td><td className="r mono">$5.000</td><td className="r mono">$5.600</td><td className="r w mono">$5.300</td><td className="r dim mono">$5.100</td><td className="r"><span className="pill up">+3,9%</span></td></tr>
              <tr><td className="bold">Novillo liviano (340–390 kg)</td><td className="r mono">$5.000</td><td className="r mono">$5.300</td><td className="r w mono">$5.150</td><td className="r dim mono">$4.950</td><td className="r"><span className="pill up">+4,0%</span></td></tr>
              <tr><td className="bold">Novillo mediano (390–450 kg)</td><td className="r mono">$4.800</td><td className="r mono">$5.100</td><td className="r w mono">$4.950</td><td className="r dim mono">$4.780</td><td className="r"><span className="pill up">+3,6%</span></td></tr>
              <tr><td className="bold">Novillo pesado (+450 kg)</td><td className="r mono">$4.700</td><td className="r mono">$5.000</td><td className="r w mono">$4.850</td><td className="r dim mono">$4.850</td><td className="r"><span className="pill fl">0,0%</span></td></tr>
            </tbody>
          </table></div>
          <div className="section-title">Vaquillonas</div>
          <div className="tbl-wrap" style={{marginBottom:'24px'}}><table>
            <thead><tr><th>Categoría</th><th className="r">Mínimo ARS/kg</th><th className="r">Máximo ARS/kg</th><th className="r">Promedio</th><th className="r">Sem. anterior</th><th className="r">Var. %</th></tr></thead>
            <tbody>
              <tr><td className="bold">Vaquillona liviana (280–310 kg)</td><td className="r mono">$5.000</td><td className="r mono">$5.600</td><td className="r w mono">$5.300</td><td className="r dim mono">$5.100</td><td className="r"><span className="pill up">+3,9%</span></td></tr>
              <tr><td className="bold">Vaquillona mediana (310–360 kg)</td><td className="r mono">$5.000</td><td className="r mono">$5.300</td><td className="r w mono">$5.150</td><td className="r dim mono">$4.960</td><td className="r"><span className="pill up">+3,8%</span></td></tr>
              <tr><td className="bold">Vaquillona pesada (360–430 kg)</td><td className="r mono">$4.100</td><td className="r mono">$5.000</td><td className="r w mono">$4.550</td><td className="r dim mono">$4.400</td><td className="r"><span className="pill up">+3,4%</span></td></tr>
            </tbody>
          </table></div>
          <div className="section-title">Vacas</div>
          <div className="tbl-wrap" style={{marginBottom:'24px'}}><table>
            <thead><tr><th>Categoría</th><th className="r">Mínimo ARS/kg</th><th className="r">Máximo ARS/kg</th><th className="r">Promedio</th><th className="r">Sem. anterior</th><th className="r">Var. %</th></tr></thead>
            <tbody>
              <tr><td className="bold">Vaca consumo</td><td className="r mono">$3.100</td><td className="r mono">$3.700</td><td className="r w mono">$3.400</td><td className="r dim mono">$3.400</td><td className="r"><span className="pill fl">0,0%</span></td></tr>
              <tr><td className="bold">Vaca carnicería</td><td className="r mono">$2.500</td><td className="r mono">$3.100</td><td className="r w mono">$2.800</td><td className="r dim mono">$2.900</td><td className="r"><span className="pill dn">−3,4%</span></td></tr>
              <tr><td className="bold">Vaca conserva/manufactura</td><td className="r mono">$2.000</td><td className="r mono">$2.500</td><td className="r w mono">$2.250</td><td className="r dim mono">$2.350</td><td className="r"><span className="pill dn">−4,3%</span></td></tr>
            </tbody>
          </table></div>
          <div className="section-title">Toros</div>
          <div className="tbl-wrap"><table>
            <thead><tr><th>Categoría</th><th className="r">Mínimo ARS/kg</th><th className="r">Máximo ARS/kg</th><th className="r">Promedio</th><th className="r">Sem. anterior</th><th className="r">Var. %</th></tr></thead>
            <tbody>
              <tr><td className="bold">Toros buenos</td><td className="r mono">$2.500</td><td className="r mono">$3.000</td><td className="r w mono">$2.750</td><td className="r dim mono">$2.900</td><td className="r"><span className="pill dn">−5,2%</span></td></tr>
            </tbody>
          </table></div>
          <div className="source">Fuente: MAG Cañuelas · 20/02/2026</div>
          <div style={{marginTop:'28px',background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:'10px',padding:'18px 22px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:'4px'}}>
              <div style={{fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.12em',textTransform:'uppercase',color:'var(--text3)'}}>Evolución 12 meses · ARS/kg vivo · promedio de rango</div>
              <div style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)'}}>Mar 2025 – Feb 2026</div>
            </div>
            <div style={{display:'flex',gap:'16px',marginBottom:'12px',flexWrap:'wrap'}}>
              <span style={{fontFamily:'var(--mono)',fontSize:'10px',display:'flex',alignItems:'center',gap:'5px'}}><span style={{width:'12px',height:'3px',display:'inline-block',background:'#56c97a',borderRadius:'2px'}}></span>Novillo mediano (390–450 kg)</span>
              <span style={{fontFamily:'var(--mono)',fontSize:'10px',display:'flex',alignItems:'center',gap:'5px'}}><span style={{width:'12px',height:'3px',display:'inline-block',background:'#4d9ef0',borderRadius:'2px'}}></span>Ternero 160–180 kg</span>
              <span style={{fontFamily:'var(--mono)',fontSize:'10px',display:'flex',alignItems:'center',gap:'5px'}}><span style={{width:'12px',height:'3px',display:'inline-block',background:'#f07070',borderRadius:'2px'}}></span>Vaca consumo</span>
            </div>
            <canvas id="hacienda-hist-canvas" style={{width:'100%',height:'220px',display:'block',cursor:'crosshair'}}></canvas>
            <div id="hacienda-hist-tooltip" style={{fontFamily:'var(--mono)',fontSize:'10px',color:'var(--text2)',minHeight:'16px',marginTop:'8px',textAlign:'center',letterSpacing:'.04em'}}></div>
            <div style={{display:'flex',gap:'24px',marginTop:'14px',paddingTop:'12px',borderTop:'1px solid var(--line)',flexWrap:'wrap'}}>
              <div style={{fontFamily:'var(--mono)',fontSize:'10px'}}><span style={{color:'var(--text3)'}}>Novillo prom 6m: </span><span style={{color:'#56c97a',fontWeight:700}}>$4.842/kg</span></div>
              <div style={{fontFamily:'var(--mono)',fontSize:'10px'}}><span style={{color:'var(--text3)'}}>Ternero prom 6m: </span><span style={{color:'#4d9ef0',fontWeight:700}}>$6.058/kg</span></div>
              <div style={{fontFamily:'var(--mono)',fontSize:'10px'}}><span style={{color:'var(--text3)'}}>Ratio ternero/novillo: </span><span style={{color:'var(--accent)',fontWeight:700}}>1,37×</span></div>
              <div style={{fontFamily:'var(--mono)',fontSize:'10px'}}><span style={{color:'var(--text3)'}}>Var. novillo 12m: </span><span style={{color:'#56c97a',fontWeight:700}}>+81,8%</span></div>
            </div>
          </div>
        </div>
      )}

      {activeTab==='inv' && (
        <div className="section">
          <div className="alert-strip info" style={{marginBottom:'20px'}}>
            <span className="alert-text">Precios expresados como rango <strong>mínimo – máximo</strong> en ARS/kg vivo (vientres en ARS/cabeza) · Fuente: Harrington &amp; La Fuente · 20/02/2026 · Plazo 30 y 60 días · Variación sobre promedio del rango</span>
          </div>
          <div className="section-title">Terneros</div>
          <div className="tbl-wrap" style={{marginBottom:'24px'}}><table>
            <thead><tr><th>Categoría</th><th className="r">Mínimo ARS/kg</th><th className="r">Máximo ARS/kg</th><th className="r">Promedio</th><th className="r">Sem. anterior</th><th className="r">Var. %</th></tr></thead>
            <tbody>
              <tr><td className="bold">Terneros hasta 160 kg</td><td className="r mono dim">—</td><td className="r mono">$6.600</td><td className="r w mono">$6.600</td><td className="r dim mono">$6.300</td><td className="r"><span className="pill up">+4,8%</span></td></tr>
              <tr><td className="bold">Terneros 160–180 kg</td><td className="r mono">$6.300</td><td className="r mono">$6.500</td><td className="r w mono">$6.400</td><td className="r dim mono">$6.150</td><td className="r"><span className="pill up">+4,1%</span></td></tr>
              <tr><td className="bold">Terneros 190–200 kg</td><td className="r mono">$6.200</td><td className="r mono">$6.400</td><td className="r w mono">$6.300</td><td className="r dim mono">$6.050</td><td className="r"><span className="pill up">+4,1%</span></td></tr>
              <tr><td className="bold">Terneros 210–220 kg</td><td className="r mono">$5.900</td><td className="r mono">$6.100</td><td className="r w mono">$6.000</td><td className="r dim mono">$5.750</td><td className="r"><span className="pill up">+4,3%</span></td></tr>
            </tbody>
          </table></div>
          <div className="section-title">Novillitos</div>
          <div className="tbl-wrap" style={{marginBottom:'24px'}}><table>
            <thead><tr><th>Categoría</th><th className="r">Mínimo ARS/kg</th><th className="r">Máximo ARS/kg</th><th className="r">Promedio</th><th className="r">Sem. anterior</th><th className="r">Var. %</th></tr></thead>
            <tbody>
              <tr><td className="bold">Novillitos 230–270 kg</td><td className="r mono">$5.150</td><td className="r mono">$5.450</td><td className="r w mono">$5.300</td><td className="r dim mono">$5.100</td><td className="r"><span className="pill up">+3,9%</span></td></tr>
              <tr><td className="bold">Novillitos 270–330 kg</td><td className="r mono">$4.850</td><td className="r mono">$5.050</td><td className="r w mono">$4.950</td><td className="r dim mono">$4.780</td><td className="r"><span className="pill up">+3,6%</span></td></tr>
            </tbody>
          </table></div>
          <div className="section-title">Terneras</div>
          <div className="tbl-wrap" style={{marginBottom:'24px'}}><table>
            <thead><tr><th>Categoría</th><th className="r">Mínimo ARS/kg</th><th className="r">Máximo ARS/kg</th><th className="r">Promedio</th><th className="r">Sem. anterior</th><th className="r">Var. %</th></tr></thead>
            <tbody>
              <tr><td className="bold">Terneras 150–160 kg</td><td className="r mono">$5.600</td><td className="r mono">$5.900</td><td className="r w mono">$5.750</td><td className="r dim mono">$5.500</td><td className="r"><span className="pill up">+4,5%</span></td></tr>
              <tr><td className="bold">Terneras 170–200 kg</td><td className="r mono">$5.400</td><td className="r mono">$5.600</td><td className="r w mono">$5.500</td><td className="r dim mono">$5.280</td><td className="r"><span className="pill up">+4,2%</span></td></tr>
              <tr><td className="bold">Terneras 200–230 kg</td><td className="r mono">$5.300</td><td className="r mono">$5.500</td><td className="r w mono">$5.400</td><td className="r dim mono">$5.200</td><td className="r"><span className="pill up">+3,8%</span></td></tr>
            </tbody>
          </table></div>
          <div className="section-title">Vaquillonas</div>
          <div className="tbl-wrap" style={{marginBottom:'24px'}}><table>
            <thead><tr><th>Categoría</th><th className="r">Mínimo ARS/kg</th><th className="r">Máximo ARS/kg</th><th className="r">Promedio</th><th className="r">Sem. anterior</th><th className="r">Var. %</th></tr></thead>
            <tbody>
              <tr><td className="bold">Vaquillonas 230–270 kg</td><td className="r mono">$4.750</td><td className="r mono">$4.950</td><td className="r w mono">$4.850</td><td className="r dim mono">$4.680</td><td className="r"><span className="pill up">+3,6%</span></td></tr>
              <tr><td className="bold">Vaquillonas 270–330 kg</td><td className="r mono">$4.650</td><td className="r mono">$4.850</td><td className="r w mono">$4.750</td><td className="r dim mono">$4.580</td><td className="r"><span className="pill up">+3,7%</span></td></tr>
            </tbody>
          </table></div>
          <div className="section-title">Vaca de invernada</div>
          <div className="tbl-wrap" style={{marginBottom:'24px'}}><table>
            <thead><tr><th>Categoría</th><th className="r">Mínimo ARS/kg</th><th className="r">Máximo ARS/kg</th><th className="r">Promedio</th><th className="r">Sem. anterior</th><th className="r">Var. %</th></tr></thead>
            <tbody>
              <tr><td className="bold">Vaca de invernada</td><td className="r mono">$2.700</td><td className="r mono">$3.000</td><td className="r w mono">$2.850</td><td className="r dim mono">$2.750</td><td className="r"><span className="pill up">+3,6%</span></td></tr>
            </tbody>
          </table></div>
          <div className="section-title">Vientres · ARS/cabeza</div>
          <div className="tbl-wrap"><table>
            <thead><tr><th>Categoría</th><th className="r">Mínimo ARS/cab</th><th className="r">Máximo ARS/cab</th><th className="r">Promedio</th><th className="r">Sem. anterior</th><th className="r">Var. %</th></tr></thead>
            <tbody>
              <tr><td className="bold">Vaca nueva con cría</td><td className="r mono">$1.700.000</td><td className="r mono">$2.100.000</td><td className="r w mono">$1.900.000</td><td className="r dim mono">$1.850.000</td><td className="r"><span className="pill up">+2,7%</span></td></tr>
              <tr><td className="bold">Vaca usada con cría</td><td className="r mono">$1.400.000</td><td className="r mono">$1.700.000</td><td className="r w mono">$1.550.000</td><td className="r dim mono">$1.500.000</td><td className="r"><span className="pill up">+3,3%</span></td></tr>
              <tr><td className="bold">Vaquillona con cría</td><td className="r mono">$1.700.000</td><td className="r mono">$2.100.000</td><td className="r w mono">$1.900.000</td><td className="r dim mono">$1.820.000</td><td className="r"><span className="pill up">+4,4%</span></td></tr>
            </tbody>
          </table></div>
          <div className="source">Fuente: Harrington &amp; La Fuente · 20/02/2026 · Plazo 30 y 60 días</div>
        </div>
      )}
    </div>
  );
}
