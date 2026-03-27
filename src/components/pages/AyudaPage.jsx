// AyudaPage.jsx — matches reference HTML exactly
import React from 'react';

const GLOSARIO = [
  { term: 'BCR', def: 'Bolsa de Cereales de Rosario — principal plaza de referencia de precios de granos en Argentina.' },
  { term: 'CBOT', def: 'Chicago Board of Trade — mercado de futuros de commodities agrícolas en EEUU. Referencia global de soja, maíz y trigo.' },
  { term: 'FAS', def: 'Free Alongside Ship — precio FOB menos gastos de carga al barco. Referencia de precio en origen.' },
  { term: 'FOB', def: 'Free On Board — precio en puerto de embarque, incluye flete terrestre.' },
  { term: 'Retención / DE', def: 'Derechos de Exportación — impuesto a la exportación que descuenta el Estado al productor.' },
  { term: 'Feedlot', def: 'Sistema de engorde intensivo a corral. El índice Feedlot mide la rentabilidad relativa: kg novillo / tn maíz.' },
  { term: 'MEP / Dólar Bolsa', def: 'Tipo de cambio financiero implícito en la compra/venta de bonos en el mercado bursátil (AL30).' },
  { term: 'CCL', def: 'Contado Con Liquidación — similar al MEP pero la operación liquida en el exterior.' },
  { term: 'Riesgo País EMBI+', def: 'Indicador de JP Morgan que mide el diferencial de rendimiento de bonos argentinos vs bonos del Tesoro EEUU.' },
  { term: 'UVA', def: 'Unidad de Valor Adquisitivo — ajusta por inflación. Usada en créditos hipotecarios y plazos fijos.' },
  { term: 'Dólar Blend 80/20', def: 'Para exportaciones agropecuarias: 80% al oficial + 20% al MEP. Es el TC efectivo que recibe el productor.' },
  { term: 'IPC / INDEC', def: 'Índice de Precios al Consumidor publicado mensualmente por el INDEC.' },
  { term: 'Maíz/Soja', def: 'Ratio de precios relativo. Históricamente ~0,55. Si sube, el maíz se valoriza vs soja.' },
  { term: 'MAP / DAP', def: 'Fosfato monoamónico / Fosfato diamónico — fertilizantes fosforados muy usados en Argentina.' },
  { term: 'EMAE', def: 'Estimador Mensual de Actividad Económica — indicador adelantado del PBI publicado por INDEC.' },
  { term: 'Basis', def: 'Diferencia entre el precio local (BCR) y el precio internacional (CBOT). Basis negativo = descuento por retenciones y flete.' },
  { term: 'Pizarra disponible', def: 'Precio de contado para entrega inmediata. Distinto a futuros (precio a plazo futuro).' },
  { term: 'Invernada', def: 'Compra de animales jóvenes (terneros) para engordar. Precios en ARS/kg vivo.' },
];

export function AyudaPage({ apiStatus, goPage, reloadAll }) {
  const statusColor = s => s==='ok'?'var(--green)':s==='error'?'var(--red)':s==='loading'?'var(--gold)':'var(--text3)';
  const statusLabel = s => s==='ok'?'✓ OK':s==='error'?'✗ Error':s==='loading'?'⟳ cargando':'— Pendiente';

  const APIS = [
    {nombre:'Dólares · DolarApi', id:'dolares', detalle:'Oficial · MEP · CCL · Blue · Cripto · Tarjeta', endpoint:'dolarapi.com/v1/dolares', cache:'5 min'},
    {nombre:'UVA · BCRA', id:'uva', detalle:'Valor diario ARS · historial', endpoint:'argentinadatos.com/uva', cache:'60 min'},
    {nombre:'IPC · INDEC', id:'inflacion', detalle:'Inflación mensual e interanual', endpoint:'argentinadatos.com/inflacion', cache:'60 min'},
    {nombre:'Tasas · BCRA', id:'tasas', detalle:'Plazo fijo · depósitos 30d por entidad', endpoint:'argentinadatos.com/tasas', cache:'30 min'},
    {nombre:'Riesgo País · EMBI+', id:'riesgoPais', detalle:'JP Morgan · historial diario', endpoint:'argentinadatos.com/riesgo-pais', cache:'15 min'},
    {nombre:'Feriados', id:'feriados', detalle:'Feriados nacionales del año', endpoint:'argentinadatos.com/feriados', cache:'24 h'},
  ];

  const HARDCODED = [
    {nombre:'Pizarra BCR', detalle:'Soja, maíz, trigo, girasol, sorgo, cebada · Ref: 23/02/2026', endpoint:'bolsadecereales.org.ar'},
    {nombre:'CBOT Chicago', detalle:'Soja, maíz, trigo disponible USD/tn · Ref: 23/02/2026', endpoint:'CME Group · stooq.com'},
    {nombre:'Hacienda MAG', detalle:'Novillos, vaquillonas, vacas, terneros · Ref: 21/02/2026', endpoint:'MAG Cañuelas'},
    {nombre:'Fertilizantes', detalle:'Urea, MAP, DAP, UAN · ARS/tn zona núcleo · Ref: 23/02/2026', endpoint:'Fertilizar / CIAFA'},
    {nombre:'Combustibles', detalle:'Gasoil G2, Gasoil Agro · ARS/litro · Ref: 23/02/2026', endpoint:'Sec. Energía · YPF'},
    {nombre:'Índices agrop.', detalle:'Feedlot, Cría, Soja/Urea · relaciones y histórico 12m estimado', endpoint:'calculado en base a precios'},
    {nombre:'Retenciones', detalle:'Derechos de exportación por producto · Vigentes 2026', endpoint:'AFIP / Sec. Agricultura'},
    {nombre:'IVA · IIBB · Otros', detalle:'IVA agropecuario, Ingresos Brutos, Ganancias, Bienes Personales, Cheque, RENATRE', endpoint:'AFIP / ARBA'},
    {nombre:'Macro BCRA/INDEC', detalle:'Reservas, EMAE, resultado fiscal, balanza · Ref: feb 2026', endpoint:'argentinadatos (pendiente)'},
  ];

  return (
    <div className="page-enter">
      <div style={{maxWidth:'960px',margin:'0 auto'}}>
        <div className="ph">
          <div>
            <div className="ph-title">Ayuda &amp; Glosario</div>
            <div className="ph-sub">Qué es RadarAgro · Cómo usar el dashboard · Terminología agropecuaria y financiera</div>
          </div>
        </div>

        {/* ESTADO DE DATOS */}
        <div className="section" id="ayuda-apis">
          <div className="section-title">Estado de datos · APIs en vivo y valores hardcodeados</div>
          <div className="tbl-wrap" style={{maxWidth:'900px'}}><table>
            <thead><tr><th style={{width:'180px'}}>Fuente / Sección</th><th style={{width:'100px'}}>Estado</th><th>Datos</th><th style={{width:'160px'}}>API / Endpoint</th><th style={{width:'80px'}} className="r">Caché</th></tr></thead>
            <tbody>
              <tr style={{background:'var(--bg3)'}}><td colSpan={5} style={{padding:'6px 10px',fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.1em',color:'var(--text3)',textTransform:'uppercase'}}>Financiero · APIs en vivo</td></tr>
              {APIS.map(a=>(
                <tr key={a.id}>
                  <td className="bold">{a.nombre}</td>
                  <td><span style={{fontFamily:'var(--mono)',fontSize:'10px',color:statusColor(apiStatus?.[a.id])}}>{statusLabel(apiStatus?.[a.id])}</span></td>
                  <td className="dim">{a.detalle}</td>
                  <td className="mono dim" style={{fontSize:'10px'}}>{a.endpoint}</td>
                  <td className="r mono dim">{a.cache}</td>
                </tr>
              ))}
              {[
                ['Granos','Pizarra BCR','CBOT Chicago'],
                ['Hacienda','Hacienda MAG'],
                ['Insumos','Fertilizantes','Combustibles'],
                ['Índices & Relaciones','Índices agrop.'],
                ['Impositivo','Retenciones','IVA · IIBB · Otros'],
                ['Macroeconomía','Macro BCRA/INDEC'],
              ].map(([category,...items])=>(
                <React.Fragment key={category}>
                  <tr style={{background:'var(--bg3)'}}><td colSpan={5} style={{padding:'6px 10px',fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.1em',color:'var(--text3)',textTransform:'uppercase'}}>{category}</td></tr>
                  {HARDCODED.filter(h=>items.includes(h.nombre)).map(h=>(
                    <tr key={h.nombre} style={{background:'rgba(240,120,64,.04)'}}>
                      <td className="bold" style={{color:'#f07840'}}>{h.nombre}</td>
                      <td><span style={{fontFamily:'var(--mono)',fontSize:'10px',background:'rgba(240,120,64,.15)',color:'#f07840',padding:'2px 7px',borderRadius:'3px'}}>HARDCOD.</span></td>
                      <td className="dim">{h.detalle}</td>
                      <td className="mono dim" style={{fontSize:'10px'}}>{h.endpoint}</td>
                      <td className="r mono dim">—</td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
              <tr style={{background:'var(--bg3)'}}><td colSpan={5} style={{padding:'6px 10px',fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.1em',color:'var(--text3)',textTransform:'uppercase'}}>Clima</td></tr>
              <tr style={{background:'rgba(240,120,64,.04)'}}>
                <td className="bold" style={{color:'#f07840'}}>Clima zona núcleo</td>
                <td><span style={{fontFamily:'var(--mono)',fontSize:'10px',background:'rgba(100,100,100,.12)',color:'var(--text3)',padding:'2px 7px',borderRadius:'3px'}}>PENDIENTE</span></td>
                <td className="dim">Temperatura, precipitaciones, pronóstico zona núcleo</td>
                <td className="mono dim" style={{fontSize:'10px'}}>SMN · Open-Meteo · INTA SIGA</td>
                <td className="r mono dim">—</td>
              </tr>
            </tbody>
          </table></div>
          <div style={{display:'flex',gap:'16px',alignItems:'center',flexWrap:'wrap',marginTop:'14px',padding:'10px 14px',background:'var(--bg2)',border:'1px solid var(--line)',borderRadius:'8px'}}>
            <span style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)',letterSpacing:'.08em',textTransform:'uppercase'}}>Leyenda:</span>
            <span style={{display:'flex',alignItems:'center',gap:'6px',fontFamily:'var(--mono)',fontSize:'10px',color:'var(--green)'}}> API EN VIVO<span style={{color:'var(--text2)',fontSize:'10px'}}>— datos en tiempo real con caché</span></span>
            <span style={{display:'flex',alignItems:'center',gap:'6px'}}><span style={{fontFamily:'var(--mono)',fontSize:'10px',background:'rgba(240,120,64,.15)',color:'#f07840',padding:'1px 6px',borderRadius:'3px'}}>HARDCOD.</span><span style={{fontFamily:'var(--mono)',fontSize:'10px',color:'var(--text2)'}}>— valor fijo con fecha de referencia indicada</span></span>
          </div>
          <div style={{display:'flex',gap:'10px',alignItems:'center',flexWrap:'wrap',marginTop:'10px'}}>
            {reloadAll && <button onClick={reloadAll} style={{background:'var(--acc-bg)',border:'1px solid rgba(77,158,240,.3)',color:'var(--accent)',fontFamily:'var(--mono)',fontSize:'10px',padding:'8px 16px',borderRadius:'7px',cursor:'pointer',letterSpacing:'.05em'}}>⟳ REINTENTAR APIS</button>}
          </div>
          <div className="source" style={{marginTop:'8px'}}>APIs en vivo: 6 fuentes · Hardcodeados: 9 grupos · Caché local para minimizar llamadas · Los datos hardcodeados tienen fecha de referencia indicada en cada fila</div>
        </div>

        {/* CÓMO USAR */}
        <div className="section" id="ayuda-personalizar">
          <div className="section-title">Cómo usar el inicio personalizable</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:'1px',background:'var(--line)',border:'1px solid var(--line)',borderRadius:'10px',overflow:'hidden'}}>
            {[
              ['01 · Personalizar','Activar widgets','Hacé clic en PERSONALIZAR en el inicio para entrar en modo edición. Luego usá + Agregar widget para ver los widgets disponibles y activar los que quieras.'],
              ['02 · Reordenar','Arrastrar para mover','En modo edición aparece el handle ⠿ MOVER en la parte superior de cada widget. Arrastrá desde ahí para cambiar el orden.'],
              ['03 · Tamaño','Cambiar tamaño','Los botones Pequeño · Mediano · Grande en la esquina inferior de cada widget cambian su ancho en la grilla.'],
              ['04 · Ocultar','Quitar un widget','El botón ✕ en la esquina superior derecha oculta el widget. Podés volver a activarlo desde el catálogo.'],
            ].map(([eyebrow,title,desc])=>(
              <div key={title} style={{background:'var(--bg1)',padding:'20px 22px'}}>
                <div style={{fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--accent)',marginBottom:'8px'}}>{eyebrow}</div>
                <div style={{fontWeight:600,color:'var(--white)',marginBottom:'6px'}}>{title}</div>
                <div style={{fontSize:'12px',color:'var(--text)',lineHeight:1.6}}>{desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* GLOSARIO */}
        <div className="section" id="ayuda-glosario">
          <div className="section-title">Glosario de términos</div>
          <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:'10px',overflow:'hidden'}}>
            {GLOSARIO.map((g,i)=>(
              <div key={g.term} style={{display:'grid',gridTemplateColumns:'180px 1fr',gap:'16px',padding:'12px 20px',borderBottom:i<GLOSARIO.length-1?'1px solid var(--line)':'',alignItems:'baseline'}}>
                <div style={{fontFamily:'var(--mono)',fontSize:'11px',fontWeight:700,color:'var(--accent)'}}>{g.term}</div>
                <div style={{fontSize:'12px',color:'var(--text2)',lineHeight:1.6}}>{g.def}</div>
              </div>
            ))}
          </div>
        </div>

        {/* INDICADORES */}
        <div className="section" id="ayuda-indicadores">
          <div className="section-title">Indicadores agropecuarios — qué significan</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:'1px',background:'var(--line)',border:'1px solid var(--line)',borderRadius:'10px',overflow:'hidden'}}>
            {[
              ['Índice Feedlot','Novillo / Maíz · umbral: 15','Mide cuántos kg de novillo se pueden comprar con 1 tonelada de maíz. Por encima de 15 la actividad de feedlot es rentable. Actual: 19,8 (FAVORABLE)'],
              ['Índice Cría','Ternero / Novillo · umbral: 1,30','Ratio de precios entre ternero y novillo. Por encima de 1,30 la cría es más rentable que el engorde. Actual: 1,37 (POSITIVO)'],
              ['Relación Soja/Urea','tn soja / tn urea · umbral: 1,0','Cuántas toneladas de soja se necesitan para comprar 1 tonelada de urea. Por debajo de 1,0 la fertilización pierde rentabilidad. Actual: 0,94 (PRESIÓN)'],
              ['Basis','Precio local BCR − Precio CBOT','Diferencia entre el precio argentino y el precio Chicago. Basis negativo = el precio local está por debajo del internacional (incluye retenciones y flete).'],
            ].map(([title,sub,desc])=>(
              <div key={title} style={{background:'var(--bg1)',padding:'18px 20px'}}>
                <div style={{fontFamily:'var(--display)',fontSize:'14px',fontWeight:700,color:'var(--white)',marginBottom:'3px'}}>{title}</div>
                <div style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--accent)',marginBottom:'8px',letterSpacing:'.04em'}}>{sub}</div>
                <div style={{fontSize:'12px',color:'var(--text2)',lineHeight:1.6}}>{desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* FERIADOS */}
        <div className="section" id="ayuda-feriados">
          <div className="section-title">Feriados &amp; Calendario — cómo funciona</div>
          <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:'10px',padding:'20px 24px'}}>
            <p style={{fontSize:'13px',color:'var(--text2)',lineHeight:1.8,marginBottom:'12px'}}>El calendario de feriados se obtiene en tiempo real desde <strong style={{color:'var(--white)'}}>ArgentinaDatos.com</strong>. La sección calcula automáticamente el próximo feriado, los días hábiles restantes y genera alertas sobre el impacto en los mercados agropecuarios.</p>
            <p style={{fontSize:'13px',color:'var(--text2)',lineHeight:1.8}}><strong style={{color:'var(--white)'}}>MATBA-ROFEX</strong> y <strong style={{color:'var(--white)'}}>BCR</strong> no operan en feriados nacionales, lo que puede generar saltos de precio o menor liquidez en los días anteriores y posteriores al feriado.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
