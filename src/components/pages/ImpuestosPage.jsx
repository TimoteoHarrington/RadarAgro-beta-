// ImpuestosPage.jsx — Presión fiscal agropecuaria argentina — Abril 2026
import React, { useState } from 'react';

/* ── Datos actualizados al Decreto 877/2025 (dic-2025) vigente abril 2026 ── */
const RETENCIONES = [
  { producto: 'Soja (poroto)',       ali: 24,   decreto: '877/2025', desde: 'Dic-2025', nota: 'Baja permanente desde 33% → 26% → 24%' },
  { producto: 'Aceite de soja',      ali: 22.5, decreto: '877/2025', desde: 'Dic-2025', nota: 'Subproducto — baja de 24,5% a 22,5%' },
  { producto: 'Harina de soja',      ali: 22.5, decreto: '877/2025', desde: 'Dic-2025', nota: 'Subproducto — baja de 24,5% a 22,5%' },
  { producto: 'Maíz',               ali: 8.5,  decreto: '877/2025', desde: 'Dic-2025', nota: 'Baja permanente de 12% → 9,5% → 8,5%' },
  { producto: 'Sorgo',              ali: 8.5,  decreto: '877/2025', desde: 'Dic-2025', nota: 'Igual tratamiento que maíz' },
  { producto: 'Trigo',              ali: 7.5,  decreto: '877/2025', desde: 'Dic-2025', nota: 'Baja permanente de 12% → 9,5% → 7,5%' },
  { producto: 'Cebada',             ali: 7.5,  decreto: '877/2025', desde: 'Dic-2025', nota: 'Baja permanente de 12% → 9,5% → 7,5%' },
  { producto: 'Girasol',            ali: 4.5,  decreto: '877/2025', desde: 'Dic-2025', nota: 'Baja permanente de 7% → 5,5% → 4,5%' },
  { producto: 'Colza / Canola',     ali: 4.5,  decreto: '877/2025', desde: 'Dic-2025', nota: 'Tratamiento similar al girasol' },
  { producto: 'Carne vacuna',       ali: 5,    decreto: '877/2025', desde: 'Dic-2025', nota: 'Baja del 6,75% al 5% — permanente' },
  { producto: 'Carne aviar',        ali: 5,    decreto: '877/2025', desde: 'Dic-2025', nota: 'Baja del 6,75% al 5% — permanente' },
  { producto: 'Economías regionales', ali: 0,  decreto: '38/2025',  desde: 'Ene-2025', nota: 'Eliminadas de forma permanente' },
];

const IVA_ITEMS = [
  { concepto: 'Venta de cereales y oleaginosas', ali: '10,5%', tipo: 'reducida', obs: 'Entre responsables inscriptos. El productor genera saldo a favor técnico.' },
  { concepto: 'Venta de hacienda vacuna y porcina', ali: '10,5%', tipo: 'reducida', obs: 'Op. entre inscriptos. Diferencia con tasa del 21% genera crédito fiscal.' },
  { concepto: 'Arrendamientos rurales', ali: 'EXENTO', tipo: 'exento', obs: 'No están gravados según Ley 23.349. No genera IVA débito ni crédito.' },
  { concepto: 'Servicios agrícolas (laboreos)', ali: '21%', tipo: 'general', obs: 'Siembra, cosecha, aplicaciones. Genera crédito fiscal para el productor.' },
  { concepto: 'Agroquímicos y fertilizantes', ali: '21%', tipo: 'general', obs: 'Insumos críticos. El 21% pagado se computa como crédito fiscal.' },
  { concepto: 'Maquinaria agrícola', ali: '21%', tipo: 'general', obs: 'Importante crédito fiscal. Admite recupero diferido contra saldo técnico.' },
  { concepto: 'Semillas certificadas', ali: '10,5%', tipo: 'reducida', obs: 'Alícuota reducida. Genera crédito fiscal parcial para el productor.' },
  { concepto: 'Combustibles (gasoil)', ali: '21%', tipo: 'general', obs: 'IVA no recuperable en gasoil campo. Impacto real en costos.' },
];

const OTROS_IMPUESTOS = [
  {
    nombre: 'Derechos de Exportación (Retenciones)',
    nivel: 'Nacional',
    base: 'Precio FOB exportación',
    alicuota: 'Soja 24% / Maíz 8,5% / Trigo 7,5%',
    impacto: 'MUY ALTO',
    obs: 'Se aplica sobre precio FAS, no sobre ganancia. El productor las absorbe vía precio pizarra. Históricamente el impuesto de mayor peso fiscal para el agro.',
    normativa: 'Decreto 877/2025'
  },
  {
    nombre: 'Impuesto a las Ganancias — Persona Humana',
    nivel: 'Nacional',
    base: 'Ganancia neta gravada',
    alicuota: '5% a 35% (escala progresiva)',
    impacto: 'ALTO',
    obs: 'Productores en Cat. III (renta del suelo) o Cat. I (renta inmueble rural). Deducciones agropecuarias: amortizaciones, gastos directos, intereses. Escala actualizada ene-2026 (+14,29%). Tope 35% para rentas anuales >$60,7M.',
    normativa: 'Ley 20.628 — Actualización ene-2026'
  },
  {
    nombre: 'Impuesto a las Ganancias — Sociedades',
    nivel: 'Nacional',
    base: 'Resultado impositivo',
    alicuota: '35%',
    impacto: 'ALTO',
    obs: 'Tasa fija para S.A., S.R.L., Fideicomiso agropecuario. Dividendos distribuidos tributan 7% adicional (Ley 27.630). Importante en estructuras societarias.',
    normativa: 'Ley 20.628 art. 73'
  },
  {
    nombre: 'IVA Agropecuario',
    nivel: 'Nacional',
    base: 'Precio de venta',
    alicuota: '10,5% / 21% / Exento',
    impacto: 'MEDIO',
    obs: 'Los productores habitualmente acumulan saldo técnico a favor (compran al 21%, venden al 10,5%). El recupero puede demorar 6-18 meses. Impacto financiero real, no costo definitivo.',
    normativa: 'Ley 23.349 y modif.'
  },
  {
    nombre: 'Bienes Personales — Inmuebles Rurales',
    nivel: 'Nacional',
    base: 'Valuación fiscal al 31-dic',
    alicuota: '0,50% a 1,50%',
    impacto: 'MEDIO',
    obs: 'Escala reducida post-reforma 2024. MNI: $384,7M (año fiscal 2025). REIBP: quienes adhirieron al blanqueo 2024 pagaron por anticipado hasta 2027, sin oblig. de DJ. La tierra rural valúa a costo fiscal histórico, generalmente subvaluada.',
    normativa: 'Ley 23.966 — Reforma L. 27.743 (2024)'
  },
  {
    nombre: 'Ingresos Brutos (IIBB)',
    nivel: 'Provincial',
    base: 'Ventas brutas',
    alicuota: '0% a 3,5%',
    impacto: 'MEDIO',
    obs: 'Varía por provincia y tipo de actividad. Córdoba: venta primaria de granos exenta. Bs.As.: 0,5%-1,25%. Santa Fe: actividades primarias con alícuotas mínimas. Convenio Multilateral si opera en varias provincias. Efecto cascada sobre el precio.',
    normativa: 'Código Fiscal provincial — Ley Impositiva 2026'
  },
  {
    nombre: 'Impuesto al Cheque (Créditos y Débitos)',
    nivel: 'Nacional',
    base: 'Movimientos en cuenta bancaria',
    alicuota: '0,6% acred. / 1,2% débito',
    impacto: 'BAJO-MEDIO',
    obs: 'En la práctica, el 33% del impuesto pagado por acreditaciones es computable como pago a cuenta de Ganancias o IVA. Afecta la operatoria diaria por el volumen de transferencias del agro. Impacto neto: 0,8% aprox. del monto operado.',
    normativa: 'Ley 25.413'
  },
  {
    nombre: 'Tasa Vial Provincial',
    nivel: 'Provincial',
    base: 'Tonelada transportada',
    alicuota: 'Variable por provincia',
    impacto: 'BAJO',
    obs: 'Córdoba, Santa Fe, Bs.As. tienen tasas por Tn. En algunos casos computable como gasto deducible de Ganancias. Impacto en fletes rurales, estimado entre $800 y $2.500/tn según distancia y provincia.',
    normativa: 'Leyes provinciales'
  },
  {
    nombre: 'Contribuciones RENATRE / RENATEA',
    nivel: 'Nacional',
    base: 'Remuneraciones rurales',
    alicuota: '1,5% a 2%',
    impacto: 'BAJO',
    obs: 'Personal temporario y permanente. Aportes patronales a organismos de trabajo rural. Deducibles como gasto en Ganancias.',
    normativa: 'Ley 25.191'
  },
  {
    nombre: 'Impuesto Inmobiliario Rural',
    nivel: 'Provincial',
    base: 'Valuación fiscal del campo',
    alicuota: '0,1% a 1,2% anual',
    impacto: 'BAJO',
    obs: 'Varía fuertemente según provincia y valuación fiscal. Actualizable. Deducible de Ganancias como gasto. Bs.As. y Córdoba: sistemas de valuación distintos.',
    normativa: 'Código Fiscal provincial'
  },
  {
    nombre: 'Impuesto al Valor Agregado — Saldo Técnico',
    nivel: 'Nacional',
    base: 'Diferencia crédito/débito',
    alicuota: 'Efecto financiero',
    impacto: 'FINANCIERO',
    obs: 'El productor vende al 10,5% y compra insumos al 21%. El saldo a favor puede tramitarse para compensación o acreditación, pero el proceso demora. En campañas grandes, el efecto financiero equivale a un costo real del 1-2% sobre ventas.',
    normativa: 'RG ARCA 2000 y modif.'
  },
];

const HISTORIA = [
  { año: '2006-2007', soja: 27.5, maiz: 20, trigo: 23 },
  { año: '2008-2019', soja: 35, maiz: 12, trigo: 12 },
  { año: '2020-2024', soja: 33, maiz: 12, trigo: 12 },
  { año: 'Ene-Jun 2025', soja: 26, maiz: 9.5, trigo: 9.5 },
  { año: 'Jul-Sep 2025', soja: 33, maiz: 12, trigo: 9.5 },
  { año: 'Dic 2025–hoy', soja: 24, maiz: 8.5, trigo: 7.5 },
];

const CARGA_TOTAL = [
  { escenario: 'Productor sojero — Zona núcleo — Campo propio', carga: '53-60%', color: 'var(--red)' },
  { escenario: 'Productor sojero — Zona núcleo — Arrendatario', carga: '67-75%', color: 'var(--red)' },
  { escenario: 'Productor maicero — Zona pampeana — Campo propio', carga: '38-45%', color: 'var(--gold)' },
  { escenario: 'Productor triguero — Zona pampeana — Campo propio', carga: '35-42%', color: 'var(--gold)' },
  { escenario: 'Ganadero bovino — Ciclo completo — Campo propio', carga: '28-35%', color: 'var(--green)' },
  { escenario: 'Productor zona extrapampeana — Arrendatario', carga: '80-120%+', color: 'var(--red)' },
];

const impactoColor = {
  'MUY ALTO':    { bg: 'rgba(224,92,92,.15)',    color: 'var(--red)',   border: 'rgba(224,92,92,.3)' },
  'ALTO':        { bg: 'rgba(224,160,60,.12)',   color: '#e0a03c',      border: 'rgba(224,160,60,.3)' },
  'MEDIO':       { bg: 'rgba(91,156,246,.10)',   color: 'var(--accent)', border: 'rgba(91,156,246,.25)' },
  'BAJO-MEDIO':  { bg: 'rgba(74,191,120,.08)',   color: 'var(--green)', border: 'rgba(74,191,120,.2)' },
  'BAJO':        { bg: 'rgba(74,191,120,.06)',   color: 'var(--green)', border: 'rgba(74,191,120,.15)' },
  'FINANCIERO':  { bg: 'rgba(143,184,240,.08)',  color: 'var(--gold)',  border: 'rgba(143,184,240,.2)' },
};

export function ImpuestosPage({ goPage }) {
  const [tab, setTab] = useState('retenciones');

  const maxAli = Math.max(...RETENCIONES.map(r => r.ali));

  return (
    <div className="page-enter">
      <div style={{ maxWidth: '1020px', margin: '0 auto' }}>

        <div className="ph">
          <div>
            <div className="ph-title">
              Presión Fiscal Agropecuaria{' '}
              <span className="help-pip" onClick={() => goPage('ayuda')} title="Ayuda">?</span>
            </div>
            <div className="ph-sub">
              Análisis completo impuesto a impuesto · Vigente abril 2026 · Decreto 877/2025
            </div>
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <span style={{
              fontFamily:'var(--mono)', fontSize:10, letterSpacing:'.07em',
              background:'var(--green-bg)', color:'var(--green)',
              border:'1px solid rgba(74,191,120,.2)', padding:'4px 12px', borderRadius:20
            }}>⬇ Retenciones en baja desde dic-2025</span>
            <span style={{
              fontFamily:'var(--mono)', fontSize:10, letterSpacing:'.07em',
              background:'var(--acc-bg)', color:'var(--accent)',
              border:'1px solid rgba(91,156,246,.2)', padding:'4px 12px', borderRadius:20
            }}>Decreto 877/2025 vigente</span>
          </div>
        </div>

        <div style={{
          background:'var(--bg1)', border:'1px solid var(--line2)',
          borderLeft:'3px solid var(--gold)', borderRadius:10,
          padding:'14px 18px', marginBottom:24,
          display:'flex', gap:12, alignItems:'flex-start'
        }}>
          <span style={{ fontSize:18, flexShrink:0 }}>⚠️</span>
          <div style={{ fontSize:12.5, lineHeight:1.65, color:'var(--text2)' }}>
            <strong style={{ color:'var(--white)' }}>Contexto clave — Abril 2026:</strong> El Decreto 877/2025 (dic-2025) estableció la baja permanente de retenciones, la más baja desde 2006.{' '}
            Sin embargo, <strong style={{ color:'var(--gold)' }}>el agro argentino sigue siendo uno de los sectores más gravados del mundo</strong>: la carga fiscal total{' '}
            (retenciones + ganancias + IVA financiero + IIBB + inmobiliario + cheque) oscila entre el 35% y el 75%+ de la renta bruta según cultivo, zona y régimen de tenencia.
          </div>
        </div>

        <div style={{
          display:'flex', gap:4, marginBottom:24, flexWrap:'wrap',
          borderBottom:'1px solid var(--line)', paddingBottom:0
        }}>
          {[
            { id:'retenciones', label:'Retenciones (DEX)' },
            { id:'iva',         label:'IVA Agropecuario' },
            { id:'otros',       label:'Todos los impuestos' },
            { id:'carga',       label:'Carga total estimada' },
            { id:'historia',    label:'Evolución histórica' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                background:'none', border:'none',
                fontFamily:'var(--body)', fontSize:13, fontWeight:500,
                color: tab === t.id ? 'var(--white)' : 'var(--text2)',
                padding:'10px 16px', cursor:'pointer',
                borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
                transition:'all .15s', whiteSpace:'nowrap'
              }}
            >{t.label}</button>
          ))}
        </div>

        {/* TAB: RETENCIONES */}
        {tab === 'retenciones' && (
          <div>
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:11, fontFamily:'var(--mono)', color:'var(--text3)', letterSpacing:'.05em', textTransform:'uppercase', marginBottom:8 }}>
                Derechos de Exportación vigentes · Decreto 877/2025 · Diciembre 2025
              </div>
              <div style={{ fontSize:12.5, color:'var(--text2)', lineHeight:1.6, maxWidth:720, marginBottom:20 }}>
                Las retenciones son el impuesto de mayor impacto para el productor agropecuario. A diferencia del IVA o Ganancias, <strong style={{ color:'var(--white)' }}>se aplican sobre el precio FAS (libre en campo) o el precio de pizarra, no sobre la ganancia</strong>. El productor las paga haya o no rentabilidad. Con el Decreto 877/2025, Argentina tiene las alícuotas más bajas desde 2006.
              </div>
            </div>

            <div className="tbl-wrap" style={{ marginBottom: 32 }}>
              <table>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th className="r">Alícuota vigente</th>
                    <th>Nivel gráfico</th>
                    <th>Decreto</th>
                    <th>Contexto</th>
                  </tr>
                </thead>
                <tbody>
                  {RETENCIONES.map(r => {
                    const w = Math.round((r.ali / maxAli) * 100);
                    const isHigh = r.ali >= 20;
                    const isMid  = r.ali >= 5 && r.ali < 20;
                    const barColor = isHigh ? 'var(--red)' : isMid ? 'var(--gold)' : 'var(--green)';
                    return (
                      <tr key={r.producto}>
                        <td className="bold">{r.producto}</td>
                        <td className="r mono" style={{ color: r.ali === 0 ? 'var(--green)' : isHigh ? 'var(--red)' : 'var(--text)' }}>
                          {r.ali === 0 ? '0% (eliminada)' : `${r.ali}%`}
                        </td>
                        <td style={{ minWidth: 180 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div style={{
                              height:8, width: r.ali === 0 ? 4 : `${w}%`, maxWidth:140,
                              background: r.ali === 0 ? 'var(--green)' : barColor,
                              borderRadius:4, transition:'width .3s',
                              minWidth: r.ali === 0 ? 4 : 6
                            }} />
                            {r.ali === 0 && <span style={{ fontSize:10, color:'var(--green)', fontFamily:'var(--mono)' }}>CERO</span>}
                          </div>
                        </td>
                        <td style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--text3)' }}>
                          Dcto. {r.decreto}
                        </td>
                        <td className="dim" style={{ fontSize:12 }}>{r.nota}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:12 }}>
              {[
                { icon:'💡', title:'¿Qué es el precio FAS?', body:'El precio que recibe el productor en campo (Franco A Silo). Se obtiene restando al precio FOB: retenciones + flete + comisiones + gastos de puerto. Las retenciones se aplican sobre el FOB, pero el productor recibe el FAS.' },
                { icon:'🏛️', title:'¿Sobre qué base se liquidan?', body:'Sobre el precio oficial de exportación (FAS teórico publicado por Secretaría de Agricultura). No sobre el precio real pactado. El exportador retiene el monto y lo deposita ante ARCA en nombre del productor.' },
                { icon:'📉', title:'Impacto real en rentabilidad', body:'En soja, el 24% sobre precio FOB representa aprox. 28-32% del precio FAS. En maíz, el 8,5% sobre FOB equivale a 10-12% del precio campo. El impacto fiscal es siempre mayor al % nominal.' },
                { icon:'📊', title:'Recaudación 2026 estimada', body:'La BCR estima US$ 4.809 millones de recaudación bajo el esquema del Decreto 877/2025, una caída del 10% respecto del esquema anterior. La reducción genera un alivio de US$ 511 millones para el sector.' },
              ].map(c => (
                <div key={c.title} className="stat c-flat" style={{ padding:'14px 16px' }}>
                  <div style={{ fontSize:20, marginBottom:8 }}>{c.icon}</div>
                  <div style={{ fontWeight:600, fontSize:13, color:'var(--white)', marginBottom:6 }}>{c.title}</div>
                  <div style={{ fontSize:12, color:'var(--text2)', lineHeight:1.6 }}>{c.body}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: IVA */}
        {tab === 'iva' && (
          <div>
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:11, fontFamily:'var(--mono)', color:'var(--text3)', letterSpacing:'.05em', textTransform:'uppercase', marginBottom:8 }}>
                IVA Agropecuario · Ley 23.349 y modificaciones · Alícuotas vigentes 2026
              </div>
              <div style={{ fontSize:12.5, color:'var(--text2)', lineHeight:1.6, maxWidth:760, marginBottom:24 }}>
                El IVA agropecuario tiene una particularidad técnica clave: el productor vende al 10,5% y compra insumos al 21%.{' '}
                Esto genera un <strong style={{ color:'var(--white)' }}>saldo técnico a favor permanente</strong>, que puede compensarse contra otros impuestos o solicitarse en acreditación.{' '}
                El costo no es el impuesto en sí, sino <strong style={{ color:'var(--gold)' }}>el impacto financiero de tener fondos inmovilizados 6 a 18 meses</strong> hasta recuperar el crédito fiscal.
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))', gap:12, marginBottom:28 }}>
              {IVA_ITEMS.map(item => {
                const colors = item.tipo === 'reducida' ? { bg:'var(--gold-bg)', c:'var(--gold)', border:'rgba(143,184,240,.2)' }
                            : item.tipo === 'exento'   ? { bg:'var(--green-bg)', c:'var(--green)', border:'rgba(74,191,120,.2)' }
                                                       : { bg:'var(--red-bg)', c:'var(--red)', border:'rgba(224,92,92,.2)' };
                return (
                  <div key={item.concepto} style={{
                    background:'var(--bg1)', border:`1px solid ${colors.border}`,
                    borderRadius:10, padding:'14px 16px'
                  }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8, gap:8 }}>
                      <div style={{ fontWeight:600, fontSize:13, color:'var(--white)', lineHeight:1.3 }}>{item.concepto}</div>
                      <span style={{
                        fontFamily:'var(--mono)', fontSize:13, fontWeight:700,
                        color:colors.c, background:colors.bg,
                        padding:'2px 10px', borderRadius:6, flexShrink:0
                      }}>{item.ali}</span>
                    </div>
                    <div style={{ fontSize:11.5, color:'var(--text2)', lineHeight:1.6 }}>{item.obs}</div>
                  </div>
                );
              })}
            </div>

            <div style={{ background:'var(--bg1)', border:'1px solid var(--line)', borderRadius:12, padding:'18px 20px', marginBottom:24 }}>
              <div style={{ fontWeight:600, fontSize:13, color:'var(--white)', marginBottom:14 }}>
                Flujo típico de IVA — Productor de granos (Responsable Inscripto)
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:10 }}>
                {[
                  { label:'Compra semillas', mov:'Crédito fiscal', ali:'10,5%', dir:'↑ a favor' },
                  { label:'Compra agroquímicos', mov:'Crédito fiscal', ali:'21%', dir:'↑↑ a favor' },
                  { label:'Servicio de cosecha', mov:'Crédito fiscal', ali:'21%', dir:'↑↑ a favor' },
                  { label:'Venta de granos', mov:'Débito fiscal', ali:'10,5%', dir:'↓ cargo' },
                  { label:'Saldo neto', mov:'Técnico a favor', ali:'~10-15%', dir:'✓ recuperable' },
                ].map(f => (
                  <div key={f.label} style={{
                    background:'var(--bg2)', borderRadius:8, padding:'10px 12px',
                    borderLeft:`3px solid ${f.dir.includes('↑') ? 'var(--green)' : f.dir.includes('↓') ? 'var(--red)' : 'var(--accent)'}`
                  }}>
                    <div style={{ fontSize:11.5, color:'var(--text2)', marginBottom:4 }}>{f.label}</div>
                    <div style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--white)', fontWeight:600 }}>{f.ali}</div>
                    <div style={{ fontSize:10.5, color:f.dir.includes('↑') ? 'var(--green)' : f.dir.includes('↓') ? 'var(--red)' : 'var(--accent)', marginTop:3 }}>{f.mov} · {f.dir}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:14, fontSize:12, color:'var(--text3)', lineHeight:1.6 }}>
                💡 El saldo acumulado puede tramitarse ante ARCA por acreditación, transferencia o compensación contra otros impuestos (Ganancias, Bienes Personales). El proceso demora 3 a 18 meses. En campañas intensivas, el efecto financiero equivale al <strong style={{ color:'var(--text2)' }}>1% a 2% anual sobre el total de ventas</strong>.
              </div>
            </div>
          </div>
        )}

        {/* TAB: TODOS LOS IMPUESTOS */}
        {tab === 'otros' && (
          <div>
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:11, fontFamily:'var(--mono)', color:'var(--text3)', letterSpacing:'.05em', textTransform:'uppercase', marginBottom:8 }}>
                Mapa completo de tributación · Todos los niveles · Abril 2026
              </div>
              <div style={{ fontSize:12.5, color:'var(--text2)', lineHeight:1.6, maxWidth:760, marginBottom:24 }}>
                El productor agropecuario argentino está sujeto a impuestos de tres niveles: nacional, provincial y municipal. A continuación, el detalle de cada tributo,{' '}
                su base imponible y su impacto real estimado sobre la rentabilidad.
              </div>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {OTROS_IMPUESTOS.map(imp => {
                const c = impactoColor[imp.impacto] || impactoColor['BAJO'];
                return (
                  <div key={imp.nombre} style={{
                    background:'var(--bg1)', border:'1px solid var(--line)',
                    borderRadius:12, padding:'16px 18px',
                    borderLeft:`3px solid ${c.color}`
                  }}>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:10, alignItems:'flex-start', marginBottom:10 }}>
                      <div style={{ flex:1, minWidth:200 }}>
                        <div style={{ fontWeight:700, fontSize:14, color:'var(--white)', marginBottom:3 }}>{imp.nombre}</div>
                        <div style={{ fontFamily:'var(--mono)', fontSize:10.5, color:'var(--text3)', letterSpacing:'.04em' }}>
                          {imp.normativa}
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                        <span style={{
                          fontFamily:'var(--mono)', fontSize:9.5, letterSpacing:'.07em',
                          background:c.bg, color:c.color,
                          border:`1px solid ${c.border}`, padding:'3px 10px', borderRadius:20
                        }}>{imp.impacto}</span>
                        <span style={{
                          fontFamily:'var(--mono)', fontSize:9.5, letterSpacing:'.07em',
                          background:'var(--bg2)', color:'var(--text2)',
                          border:'1px solid var(--line)', padding:'3px 10px', borderRadius:20
                        }}>{imp.nivel}</span>
                      </div>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:'6px 16px', marginBottom:10 }}>
                      <span style={{ fontSize:11, color:'var(--text3)', whiteSpace:'nowrap' }}>Base imponible</span>
                      <span style={{ fontSize:11.5, color:'var(--text2)' }}>{imp.base}</span>
                      <span style={{ fontSize:11, color:'var(--text3)', whiteSpace:'nowrap' }}>Alícuota</span>
                      <span style={{ fontSize:12, fontFamily:'var(--mono)', color:'var(--white)', fontWeight:600 }}>{imp.alicuota}</span>
                    </div>
                    <div style={{ fontSize:12, color:'var(--text2)', lineHeight:1.65, borderTop:'1px solid var(--line)', paddingTop:10 }}>
                      {imp.obs}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB: CARGA TOTAL */}
        {tab === 'carga' && (
          <div>
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:11, fontFamily:'var(--mono)', color:'var(--text3)', letterSpacing:'.05em', textTransform:'uppercase', marginBottom:8 }}>
                Carga tributaria total estimada · % sobre renta bruta · Campaña 2025/26
              </div>
              <div style={{ fontSize:12.5, color:'var(--text2)', lineHeight:1.6, maxWidth:760, marginBottom:24 }}>
                Según análisis del IERAL-Fundación Mediterránea (dic-2025), incluso con las retenciones más bajas desde 2006,{' '}
                <strong style={{ color:'var(--white)' }}>la carga fiscal total del productor sojero en zona núcleo con campo propio oscila entre 53% y 73% de la renta bruta</strong>.{' '}
                En zonas extrapampeanas con arrendamiento, puede superar el 100% (margen negativo).
              </div>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:28 }}>
              {CARGA_TOTAL.map(e => {
                const num = parseFloat(e.carga.replace('%','').replace('+','').split('-')[1] || e.carga.replace('%','').replace('+',''));
                const pct = Math.min((num / 120) * 100, 100);
                return (
                  <div key={e.escenario} style={{
                    background:'var(--bg1)', border:'1px solid var(--line)',
                    borderRadius:10, padding:'14px 16px'
                  }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8, gap:12, flexWrap:'wrap' }}>
                      <div style={{ fontSize:13, color:'var(--text)', fontWeight:500 }}>{e.escenario}</div>
                      <div style={{ fontFamily:'var(--mono)', fontSize:16, fontWeight:700, color:e.color, flexShrink:0 }}>{e.carga}</div>
                    </div>
                    <div style={{ background:'var(--bg3)', borderRadius:4, height:6, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${pct}%`, background:e.color, borderRadius:4, transition:'width .5s' }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ background:'var(--bg1)', border:'1px solid var(--line)', borderRadius:12, padding:'18px 20px', marginBottom:20 }}>
              <div style={{ fontWeight:600, fontSize:13, color:'var(--white)', marginBottom:14 }}>
                Composición típica de la carga — Productor sojero zona núcleo, campo propio
              </div>
              <div className="tbl-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Impuesto</th>
                      <th className="r">% sobre precio FOB</th>
                      <th className="r">% sobre renta bruta</th>
                      <th>Nivel</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td className="bold">Retención DEX (Soja)</td><td className="r mono dn">24,0%</td><td className="r mono dn">~30-35%</td><td className="dim">Nacional</td></tr>
                    <tr><td className="bold">Impuesto a las Ganancias</td><td className="r mono dn">Variable</td><td className="r mono dn">~8-12%</td><td className="dim">Nacional</td></tr>
                    <tr><td className="bold">IIBB</td><td className="r mono dn">0,5-1%</td><td className="r mono dn">~1-2%</td><td className="dim">Provincial</td></tr>
                    <tr><td className="bold">Bienes Personales</td><td className="r mono dn">0,5-1,5% s/ tierra</td><td className="r mono dn">~2-4%</td><td className="dim">Nacional</td></tr>
                    <tr><td className="bold">Impuesto al Cheque</td><td className="r mono dn">0,6-1,2% s/ mov.</td><td className="r mono dn">~1-2%</td><td className="dim">Nacional</td></tr>
                    <tr><td className="bold">Inmobiliario Rural</td><td className="r mono dn">0,1-1% s/ valuación</td><td className="r mono dn">~1-2%</td><td className="dim">Provincial</td></tr>
                    <tr><td className="bold">IVA (efecto financiero)</td><td className="r mono">Saldo a favor</td><td className="r mono dn">~1-2%</td><td className="dim">Nacional</td></tr>
                    <tr style={{ borderTop:'2px solid var(--line2)' }}>
                      <td className="bold" style={{ color:'var(--white)' }}>TOTAL ESTIMADO</td>
                      <td className="r mono" />
                      <td className="r mono dn" style={{ fontWeight:700, fontSize:14 }}>53-60%</td>
                      <td className="dim">Multijurisdiccional</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{
              background:'var(--red-bg)', border:'1px solid rgba(224,92,92,.2)',
              borderRadius:10, padding:'14px 18px', fontSize:12.5, color:'var(--text2)', lineHeight:1.65
            }}>
              <strong style={{ color:'var(--red)' }}>⚠ Nota metodológica:</strong> Los porcentajes de carga total varían según precio de los commodities, tipo de cambio, costos de producción y zona geográfica.{' '}
              En años de precios bajos o costos altos, la carga fiscal <em>efectiva sobre la renta neta</em> puede superar el 100%, especialmente para productores arrendatarios en zonas marginales.{' '}
              Fuente: IERAL-Fundación Mediterránea, Bolsa de Comercio de Rosario, datos propios.
            </div>
          </div>
        )}

        {/* TAB: HISTORIA */}
        {tab === 'historia' && (
          <div>
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:11, fontFamily:'var(--mono)', color:'var(--text3)', letterSpacing:'.05em', textTransform:'uppercase', marginBottom:8 }}>
                Evolución histórica de retenciones · Principales cultivos · 2006–2026
              </div>
              <div style={{ fontSize:12.5, color:'var(--text2)', lineHeight:1.6, maxWidth:760, marginBottom:24 }}>
                Desde 1983 hubo más de 80 modificaciones en las alícuotas de derechos de exportación. El record histórico fue en 2008 con la Resolución 125 (retenciones móviles a soja, hasta 45%).{' '}
                El nivel actual (24% soja, 8,5% maíz, 7,5% trigo) es el más bajo desde 2006.
              </div>
            </div>

            <div className="tbl-wrap" style={{ marginBottom:28 }}>
              <table>
                <thead>
                  <tr>
                    <th>Período</th>
                    <th className="r">Soja (poroto)</th>
                    <th className="r">Maíz</th>
                    <th className="r">Trigo</th>
                  </tr>
                </thead>
                <tbody>
                  {HISTORIA.map((h, i) => {
                    const isCurrent = i === HISTORIA.length - 1;
                    return (
                      <tr key={h.año} style={isCurrent ? { background:'var(--acc-bg)' } : {}}>
                        <td style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:isCurrent ? 700 : 400, color:isCurrent ? 'var(--accent)' : 'var(--text)' }}>
                          {h.año} {isCurrent && '← VIGENTE'}
                        </td>
                        <td className="r mono" style={{ color: h.soja > 25 ? 'var(--red)' : h.soja < 10 ? 'var(--green)' : 'var(--gold)' }}>
                          {h.soja}%
                        </td>
                        <td className="r mono" style={{ color: h.maiz > 10 ? 'var(--red)' : h.maiz < 9 ? 'var(--green)' : 'var(--gold)' }}>
                          {h.maiz}%
                        </td>
                        <td className="r mono" style={{ color: h.trigo > 10 ? 'var(--red)' : h.trigo < 9 ? 'var(--green)' : 'var(--gold)' }}>
                          {h.trigo}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ fontWeight:600, fontSize:13, color:'var(--white)', marginBottom:12 }}>Cronología 2025–2026</div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {[
                { fecha:'Ene 2025', hito:'Decreto 38/2025 — Baja temporal. Soja: 33%→26%, Maíz: 12%→9,5%, Girasol: 7%→5,5%. Economías regionales: eliminadas permanentemente.' },
                { fecha:'Jun 2025', hito:'Decreto 439/2025 — Prórroga solo para Trigo y Cebada hasta 31-mar-2026. Soja y Maíz vuelven a 33% y 12% desde jul-2025.' },
                { fecha:'Sep 2025', hito:'Decreto 682/2025 — Retenciones 0% hasta cupo de US$ 7.000M. El cupo se agotó en 3 días. Boom histórico de liquidación agropecuaria.' },
                { fecha:'Dic 2025', hito:'Decreto 877/2025 — Baja permanente. Soja: 24%, Subproductos: 22,5%, Maíz/Sorgo: 8,5%, Trigo/Cebada: 7,5%, Girasol: 4,5%, Carne: 5%. Mínimo desde 2006.' },
                { fecha:'Abr 2026', hito:'Vigente: Decreto 877/2025. La BCR estima recaudación de US$ 4.809M (-10% vs esquema anterior). Carga total para el sector sigue siendo la más alta de la región.' },
              ].map(e => (
                <div key={e.fecha} style={{ display:'flex', gap:14, alignItems:'flex-start' }}>
                  <div style={{ fontFamily:'var(--mono)', fontSize:10.5, color:'var(--accent)', flexShrink:0, minWidth:70, paddingTop:2 }}>{e.fecha}</div>
                  <div style={{ flex:1, padding:'10px 14px', background:'var(--bg1)', border:'1px solid var(--line)', borderRadius:8, fontSize:12.5, color:'var(--text2)', lineHeight:1.6 }}>
                    {e.hito}
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              marginTop:24, background:'var(--acc-bg)', border:'1px solid rgba(91,156,246,.2)',
              borderRadius:10, padding:'14px 18px', fontSize:12.5, color:'var(--text2)', lineHeight:1.65
            }}>
              <strong style={{ color:'var(--accent)' }}>📌 Perspectiva 2026:</strong> El Gobierno declaró como objetivo estratégico la eliminación gradual de los derechos de exportación.{' '}
              Sin embargo, la recaudación por DEX representa aproximadamente el 6% de los ingresos tributarios nacionales, lo que hace difícil una eliminación abrupta sin compensación fiscal.{' '}
              El sector agropecuario seguirá monitoreando el cumplimiento del superávit fiscal como condición para nuevas bajas.
            </div>
          </div>
        )}

        <div style={{ marginTop:36, paddingTop:16, borderTop:'1px solid var(--line)', fontSize:11, color:'var(--text3)', lineHeight:1.7 }}>
          Fuentes: Decreto 877/2025 (BO dic-2025) · Decreto 38/2025 · Decreto 682/2025 · Ley 20.628 (Ganancias) · Ley 23.349 (IVA) ·
          Ley 23.966 (Bienes Personales) · ARCA · BCR — Bolsa de Comercio de Rosario · IERAL-Fundación Mediterránea ·
          Actualizado: abril 2026. Esta información es orientativa y no reemplaza el asesoramiento de un contador especializado en agro.
        </div>

      </div>
    </div>
  );
}
