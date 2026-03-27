// ImpuestosPage.jsx — matches reference HTML exactly
import React, { useState } from 'react';

export function ImpuestosPage({ goPage }) {
  const [producto, setProducto] = useState('0.33');
  const [pizarra, setPizarra] = useState('');
  const [dolar, setDolar] = useState('');
  const [flete, setFlete] = useState('');
  const [comis, setComis] = useState('');

  const calc = () => {
    const px = parseFloat(pizarra) || 0;
    const ret = parseFloat(producto) || 0;
    const fl = parseFloat(flete) || 0;
    const co = (parseFloat(comis) || 0) / 100;
    const dol = parseFloat(dolar) || 1;
    if (!px) return null;
    const retARS = px * ret;
    const comisARS = px * co;
    const neto = px - retARS - fl - comisARS;
    const netusd = dol ? neto / dol : null;
    const pct = ((retARS + fl + comisARS) / px * 100).toFixed(1);
    return {bruto:px, retARS, fl, comisARS, neto, netusd, pct};
  };

  const r = calc();
  const fmt = v => Math.round(v).toLocaleString('es-AR');

  return (
    <div className="page-enter">
      <div style={{maxWidth:'960px',margin:'0 auto'}}>
        <div className="ph">
          <div>
            <div className="ph-title">Impositivo <span className="help-pip" onClick={()=>goPage('ayuda')} title="Ayuda">?</span></div>
            <div className="ph-sub">Retenciones · IVA · Ingresos Brutos · Bienes Personales · Ganancias · Calculadora neto productor · 2026</div>
          </div>
        </div>

        <div className="section">
          <div className="section-title">Derechos de exportación (retenciones) — Vigentes 2026</div>
          <div className="tbl-wrap" style={{maxWidth:'640px',marginBottom:'32px'}}><table>
            <thead><tr><th>Producto</th><th className="r">Alícuota</th><th className="r">Pizarra hoy</th><th className="r">Retención ARS/tn</th><th className="r">Neto bruto ARS/tn</th></tr></thead>
            <tbody>
              <tr><td className="bold">Soja (poroto)</td><td className="r mono dn">33%</td><td className="r dim mono">$456.000</td><td className="r mono dn">−$150.480</td><td className="r mono">$305.520</td></tr>
              <tr><td className="bold">Aceite de soja</td><td className="r mono dn">33%</td><td className="r dim">—</td><td className="r dim">—</td><td className="r dim">—</td></tr>
              <tr><td className="bold">Harina de soja</td><td className="r mono dn">31%</td><td className="r dim">—</td><td className="r dim">—</td><td className="r dim">—</td></tr>
              <tr><td className="bold">Maíz</td><td className="r mono">12%</td><td className="r dim mono">$251.600</td><td className="r mono dn">−$30.192</td><td className="r mono">$221.408</td></tr>
              <tr><td className="bold">Trigo</td><td className="r mono">12%</td><td className="r dim mono">$248.000</td><td className="r mono dn">−$29.760</td><td className="r mono">$218.240</td></tr>
              <tr><td className="bold">Girasol</td><td className="r mono">7%</td><td className="r dim mono">$519.460</td><td className="r mono dn">−$36.362</td><td className="r mono">$483.098</td></tr>
              <tr><td className="bold">Sorgo</td><td className="r mono">12%</td><td className="r dim mono">$218.500</td><td className="r mono dn">−$26.220</td><td className="r mono">$192.280</td></tr>
              <tr><td className="bold">Cebada</td><td className="r mono">12%</td><td className="r dim mono">$231.000</td><td className="r mono dn">−$27.720</td><td className="r mono">$203.280</td></tr>
              <tr><td className="bold">Colza / Canola</td><td className="r mono">7%</td><td className="r dim">—</td><td className="r dim">—</td><td className="r dim">—</td></tr>
              <tr><td className="bold">Carne vacuna</td><td className="r mono">9%</td><td className="r dim">—</td><td className="r dim">—</td><td className="r dim">—</td></tr>
            </tbody>
          </table></div>
        </div>

        <div className="section">
          <div className="section-title">IVA agropecuario — Alícuotas vigentes</div>
          <div className="grid grid-3" style={{maxWidth:'900px',marginBottom:'32px'}}>
            <div className="stat c-flat"><div className="stat-label">Venta de cereales y oleaginosas</div><div className="stat-val">10,5%</div><div className="stat-meta">Alícuota reducida · Ventas entre responsables inscriptos</div></div>
            <div className="stat c-flat"><div className="stat-label">Venta de hacienda</div><div className="stat-val">10,5%</div><div className="stat-meta">Alícuota reducida · Operaciones entre RI</div></div>
            <div className="stat c-flat"><div className="stat-label">Servicios agrícolas (labores)</div><div className="stat-val">21%</div><div className="stat-meta">Alícuota general · Siembra, cosecha, fumigación</div></div>
            <div className="stat c-flat"><div className="stat-label">Arrendamientos rurales</div><div className="stat-val">Exento</div><div className="stat-meta">No están gravados con IVA según Ley 23.349</div></div>
            <div className="stat c-flat"><div className="stat-label">Agroquímicos y fertilizantes</div><div className="stat-val">21%</div><div className="stat-meta">Alícuota general · Posibilidad de crédito fiscal</div></div>
            <div className="stat c-flat"><div className="stat-label">Maquinaria agrícola</div><div className="stat-val">21%</div><div className="stat-meta">Alícuota general · Admite crédito fiscal</div></div>
          </div>
        </div>

        <div className="section">
          <div className="section-title">Otros impuestos relevantes para el productor</div>
          <div className="tbl-wrap" style={{maxWidth:'900px',marginBottom:'32px'}}><table>
            <thead><tr><th>Impuesto</th><th>Actividad</th><th className="r">Alícuota / Referencia</th><th>Observaciones</th></tr></thead>
            <tbody>
              <tr><td className="bold">Ingresos Brutos (IIBB)</td><td className="dim">Venta de cereales</td><td className="r mono">1% – 3,5%</td><td className="dim">Varía por provincia · Reducida en zona pampeana</td></tr>
              <tr><td className="bold">Ingresos Brutos (IIBB)</td><td className="dim">Venta de hacienda</td><td className="r mono">1% – 2%</td><td className="dim">Convenio multilateral si opera en varias provincias</td></tr>
              <tr><td className="bold">Impuesto a las Ganancias</td><td className="dim">Persona humana</td><td className="r mono">5% – 35%</td><td className="dim">Escala progresiva · Categoría III (renta del suelo)</td></tr>
              <tr><td className="bold">Impuesto a las Ganancias</td><td className="dim">Sociedad</td><td className="r mono">35%</td><td className="dim">Tasa fija · S.A., S.R.L., Fideicomiso</td></tr>
              <tr><td className="bold">Bienes Personales</td><td className="dim">Inmuebles rurales</td><td className="r mono">0,5% – 1,75%</td><td className="dim">Sobre valor fiscal · Escala según patrimonio total</td></tr>
              <tr><td className="bold">Impuesto al Cheque</td><td className="dim">Operaciones bancarias</td><td className="r mono">0,6% / 1,2%</td><td className="dim">Acreditación / débito · Computable como pago a cuenta</td></tr>
              <tr><td className="bold">Contribuciones RENATRE</td><td className="dim">Empleo rural</td><td className="r mono">1,5% – 2%</td><td className="dim">Sobre remuneraciones personal temporario y permanente</td></tr>
              <tr><td className="bold">Tasa vial provincial</td><td className="dim">Transporte de granos</td><td className="r mono">Variable</td><td className="dim">Por tonelada transportada · Según provincia</td></tr>
            </tbody>
          </table></div>
        </div>

        <div className="section">
          <div className="section-title">Calculadora de neto productor</div>
          <div className="calc-card" style={{maxWidth:'820px'}}>
            <div className="calc-head">Solo orientativo — no incluye IVA, IIBB ni comisiones de intermediación</div>
            <div className="calc-body">
              <div className="calc-fields">
                <div className="field"><label>Producto</label>
                  <select value={producto} onChange={e=>setProducto(e.target.value)}>
                    <option value="0.33">Soja poroto (33%)</option>
                    <option value="0.31">Harina de soja (31%)</option>
                    <option value="0.12">Maíz (12%)</option>
                    <option value="0.12">Trigo (12%)</option>
                    <option value="0.07">Girasol (7%)</option>
                    <option value="0.12">Sorgo (12%)</option>
                    <option value="0.12">Cebada (12%)</option>
                    <option value="0.07">Colza (7%)</option>
                    <option value="0.09">Carne vacuna (9%)</option>
                  </select>
                </div>
                <div className="field"><label>Precio pizarra ARS/tn</label><input type="number" value={pizarra} placeholder="456000" onChange={e=>setPizarra(e.target.value)}/></div>
                <div className="field"><label>Dólar MEP (ARS)</label><input type="number" value={dolar} placeholder="1245" onChange={e=>setDolar(e.target.value)}/></div>
                <div className="field"><label>Flete ARS/tn</label><input type="number" value={flete} placeholder="18000" onChange={e=>setFlete(e.target.value)}/></div>
                <div className="field"><label>Comisión corredor %</label><input type="number" value={comis} placeholder="1" step="0.1" onChange={e=>setComis(e.target.value)}/></div>
              </div>
              {r && (
                <div className="calc-out">
                  <div className="cout"><div className="cout-label">Precio bruto</div><div className="cout-val">${fmt(r.bruto)}</div><div className="cout-unit">ARS/tn</div></div>
                  <div className="cout"><div className="cout-label">Retención</div><div className="cout-val dn">−${fmt(r.retARS)}</div><div className="cout-unit">ARS/tn</div></div>
                  <div className="cout"><div className="cout-label">Flete</div><div className="cout-val dn">−${fmt(r.fl)}</div><div className="cout-unit">ARS/tn</div></div>
                  <div className="cout"><div className="cout-label">Comisión</div><div className="cout-val dn">−${fmt(r.comisARS)}</div><div className="cout-unit">ARS/tn</div></div>
                  <div className="cout highlight"><div className="cout-label">Neto ARS</div><div className="cout-val">${fmt(r.neto)}</div><div className="cout-unit">ARS/tn</div></div>
                  {r.netusd && <div className="cout highlight"><div className="cout-label">Neto USD</div><div className="cout-val">{r.netusd.toFixed(0)}</div><div className="cout-unit">USD/tn (MEP)</div></div>}
                  <div className="cout"><div className="cout-label">Presión total</div><div className="cout-val dn">{r.pct}%</div><div className="cout-unit">% del precio bruto</div></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
