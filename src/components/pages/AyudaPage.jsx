// AyudaPage.jsx — glosario por sección + navegación por anchor + APIs actualizadas
import React, { useEffect } from 'react';

// ─── Glosario por sección ────────────────────────────────────────────────────
const GLOSARIOS = {
  granos: {
    label: 'Granos',
    terms: [
      { term: 'BCR', def: 'Bolsa de Cereales de Rosario — principal plaza de referencia de precios de granos en Argentina.' },
      { term: 'Pizarra disponible', def: 'Precio de contado para entrega inmediata en el mercado local. Distinto a futuros (precio a plazo).' },
      { term: 'CBOT', def: 'Chicago Board of Trade — mercado de futuros de commodities agrícolas en EEUU. Referencia global de soja, maíz y trigo.' },
      { term: 'FAS', def: 'Free Alongside Ship — precio al costado del barco. Referencia de precio en origen, descontando el costo de carga.' },
      { term: 'FOB', def: 'Free On Board — precio en puerto de embarque, incluye flete terrestre hasta el barco.' },
      { term: 'Basis', def: 'Diferencia entre el precio local (BCR) y el precio internacional (CBOT). Basis negativo = descuento por retenciones y flete.' },
      { term: 'Retención / DE', def: 'Derechos de Exportación — impuesto que descuenta el Estado al productor sobre el precio FOB exportado.' },
      { term: 'Matba-Rofex', def: 'Mercado de futuros y opciones agropecuarios de Argentina. Permite fijar el precio de granos a plazo futuro.' },
      { term: 'Dólar Blend 80/20', def: 'Para exportaciones agropecuarias: 80% al tipo de cambio oficial + 20% al MEP. Es el TC efectivo que recibe el exportador.' },
      { term: 'Complejo sojero', def: 'Conjunto de exportaciones derivadas de la soja: grano, aceite y harina. Principal fuente de divisas de Argentina.' },
    ],
  },
  hacienda: {
    label: 'Hacienda',
    icon: '🐄',
    terms: [
      { term: 'Invernada', def: 'Compra de animales jóvenes (terneros o novillitos) para engordar. Los precios se expresan en ARS/kg vivo.' },
      { term: 'Feedlot', def: 'Sistema de engorde intensivo a corral con ración balanceada. Alternativa al engorde a pasto (ciclo completo).' },
      { term: 'Novillo', def: 'Macho bovino castrado de entre 300 y 430 kg. Categoría de referencia en el mercado de hacienda.' },
      { term: 'Vaquillona', def: 'Hembra bovina que aún no ha parido, generalmente de entre 200 y 350 kg.' },
      { term: 'Índice Feedlot', def: 'Relación kg de novillo / tn de maíz. Por encima de 15 la actividad de feedlot es rentable.' },
      { term: 'Índice Cría', def: 'Ratio de precios ternero / novillo. Por encima de 1,30 la cría es más rentable que el engorde.' },
      { term: 'MAG Cañuelas', def: 'Mercado de hacienda de Cañuelas (Buenos Aires) — principal plaza física de referencia para precios de ganado vacuno.' },
      { term: 'Lineal / No lineal', def: 'Forma de pago en hacienda. Lineal = precio único por kg. No lineal = precio varía según peso del animal.' },
    ],
  },
  financiero: {
    label: 'Financiero',
    icon: '💵',
    terms: [
      { term: 'Dólar Oficial', def: 'Tipo de cambio regulado por el BCRA. Es el precio de referencia para operaciones comerciales y bancarias.' },
      { term: 'Dólar Blue', def: 'Tipo de cambio informal o "negro". Se opera fuera del sistema bancario, sin intervención del BCRA.' },
      { term: 'MEP / Dólar Bolsa', def: 'Tipo de cambio financiero implícito en la compra/venta de bonos en el mercado bursátil (AL30). Es legal.' },
      { term: 'CCL', def: 'Contado Con Liquidación — similar al MEP pero la operación liquida en el exterior, permitiendo sacar divisas.' },
      { term: 'UVA', def: 'Unidad de Valor Adquisitivo — índice ajustado por inflación. Usada en créditos hipotecarios y plazos fijos.' },
      { term: 'Plazo Fijo', def: 'Depósito a término en entidad bancaria. La tasa publicada es la TNA (Tasa Nominal Anual).' },
      { term: 'TNA / TEA', def: 'Tasa Nominal Anual / Tasa Efectiva Anual. La TEA incorpora la capitalización de intereses.' },
      { term: 'Spread', def: 'Diferencia entre el precio de compra y venta de una divisa. Indica el costo de transacción.' },
    ],
  },
  macro: {
    label: 'Macroeconomía',
    icon: '📊',
    terms: [
      { term: 'IPC / INDEC', def: 'Índice de Precios al Consumidor publicado mensualmente por el Instituto Nacional de Estadística y Censos.' },
      { term: 'EMAE', def: 'Estimador Mensual de Actividad Económica — indicador adelantado del PBI publicado por INDEC.' },
      { term: 'PBI', def: 'Producto Bruto Interno — valor total de bienes y servicios producidos en el país en un período.' },
      { term: 'Reservas BCRA', def: 'Reservas internacionales del Banco Central. Incluye oro, divisas y DEGs del FMI. Indicador clave de solvencia.' },
      { term: 'BCRA', def: 'Banco Central de la República Argentina — institución monetaria que regula la política cambiaria y de tasas.' },
      { term: 'Base Monetaria', def: 'Total de pesos en circulación más depósitos de bancos en el BCRA. Uno de los agregados monetarios clave.' },
      { term: 'Resultado Fiscal', def: 'Diferencia entre ingresos y gastos del Estado. Superávit = ingresos > gastos. Déficit = lo contrario.' },
      { term: 'Balanza Comercial', def: 'Diferencia entre exportaciones e importaciones de bienes. Superávit comercial = más exportaciones que importaciones.' },
    ],
  },
  mundo: {
    label: 'Monitor Global',
    icon: '🌐',
    terms: [
      { term: 'S&P 500', def: 'Índice bursátil de las 500 principales empresas de EEUU. Principal referencia del mercado accionario global.' },
      { term: 'WTI', def: 'West Texas Intermediate — referencia del precio internacional del petróleo crudo de EEUU.' },
      { term: 'Brent', def: 'Petróleo crudo del Mar del Norte. Principal referencia internacional del precio del petróleo a nivel global.' },
      { term: 'DXY (Índice Dólar)', def: 'Índice que mide el valor del dólar estadounidense frente a una canasta de monedas de países desarrollados.' },
      { term: 'Oro / Gold', def: 'Activo refugio por excelencia. Su precio en USD/oz es referencia global de aversión al riesgo.' },
      { term: 'Soja CBOT', def: 'Precio del contrato de futuros de soja en Chicago (USD/bushel o USD/tn). Referencia internacional.' },
      { term: 'Real / BRL', def: 'Moneda de Brasil. Su cotización afecta directamente la competitividad de las exportaciones agrícolas argentinas.' },
      { term: 'Tasas Fed Funds', def: 'Tasa de referencia de la Reserva Federal de EEUU. Afecta el flujo de capitales y precios de commodities globales.' },
    ],
  },
  insumos: {
    label: 'Insumos',
    icon: '🧪',
    terms: [
      { term: 'Urea', def: 'Fertilizante nitrogenado más usado en Argentina. Se expresa en ARS/tn o USD/tn.' },
      { term: 'MAP', def: 'Fosfato Monoamónico — fertilizante fosforado muy utilizado en cultivos de verano e invierno.' },
      { term: 'DAP', def: 'Fosfato Diamónico — fertilizante fosforado con mayor concentración de nitrógeno que el MAP.' },
      { term: 'UAN', def: 'Solución de Urea y Nitrato de Amonio — fertilizante líquido nitrogenado. Aplicación foliar o al suelo.' },
      { term: 'Relación Soja/Urea', def: 'Tn de soja necesarias para comprar 1 tn de urea. Por debajo de 1,0 la fertilización pierde rentabilidad.' },
      { term: 'Gasoil Agro', def: 'Gasoil con rebaja impositiva para uso agropecuario. Su precio impacta directamente en el costo de siembra y cosecha.' },
      { term: 'CIAFA', def: 'Cámara de la Industria Argentina de Fertilizantes y Agroquímicos — fuente de referencia de precios de insumos.' },
    ],
  },
  indices: {
    label: 'Índices',
    icon: '📈',
    terms: [
      { term: 'Índice Feedlot', def: 'kg novillo / tn maíz. Umbral de rentabilidad: 15. Mide si el engorde a corral es negocio.' },
      { term: 'Índice Cría', def: 'Ratio ternero / novillo. Umbral: 1,30. Por encima, criar es más rentable que engordar.' },
      { term: 'Relación Soja/Urea', def: 'tn soja / tn urea. Umbral: 1,0. Mide el poder adquisitivo del campo para comprar fertilizante.' },
      { term: 'Relación Maíz/Soja', def: 'Precio relativo maíz vs soja. Históricamente ~0,55. Si sube, el maíz se valoriza y puede convenir sembrarlo.' },
      { term: 'Relación Trigo/Maíz', def: 'Precio relativo trigo vs maíz. Referencia para la decisión de siembra de fina vs gruesa.' },
      { term: 'Relación Gasoil/Soja', def: 'Litros de gasoil por kg de soja. Mide el costo energético en términos del principal cultivo.' },
      { term: 'Basis', def: 'Diferencia BCR − CBOT. Basis negativo indica que el precio local está castigado respecto al internacional.' },
    ],
  },
  impuestos: {
    label: 'Impositivo',
    icon: '🏛️',
    terms: [
      { term: 'Retención / DE', def: 'Derechos de Exportación — alícuota aplicada sobre el precio FOB exportado. Reduce el precio que recibe el productor.' },
      { term: 'IVA Agropecuario', def: 'El IVA en productos agropecuarios primarios es del 10,5% (tasa reducida). El IVA general es 21%.' },
      { term: 'IIBB', def: 'Ingresos Brutos — impuesto provincial sobre la facturación bruta. Varía por provincia y actividad.' },
      { term: 'Bienes Personales', def: 'Impuesto nacional anual sobre el patrimonio neto de las personas físicas al 31 de diciembre.' },
      { term: 'RENATRE', def: 'Registro Nacional de Trabajadores Rurales y Empleadores — contribución patronal para trabajo rural.' },
      { term: 'Cheque / ITF', def: 'Impuesto a las Transacciones Financieras — grava débitos y créditos bancarios. 0,6% en cuentas comunes.' },
      { term: 'Monotributo', def: 'Régimen simplificado que unifica ganancias, IVA y aportes en una cuota fija mensual para pequeños contribuyentes.' },
    ],
  },
  feriados: {
    label: 'Feriados',
    icon: '📅',
    terms: [
      { term: 'Feriado nacional', def: 'Día no laborable para todo el país, definido por ley o decreto del Poder Ejecutivo Nacional.' },
      { term: 'Día no laborable', def: 'Día optativo para los empleadores. Distinto al feriado nacional, donde el descanso es obligatorio.' },
      { term: 'MATBA-ROFEX', def: 'Mercado de futuros que no opera en feriados nacionales, lo que puede generar menor liquidez y saltos de precio.' },
      { term: 'BCR', def: 'La Bolsa de Cereales de Rosario tampoco opera en feriados, afectando la formación de precios de granos.' },
      { term: 'Día hábil bancario', def: 'Día en que operan los bancos. Coincide con los días hábiles generales, excluyendo feriados nacionales y bancarios.' },
    ],
  },
};

// ─── APIs en vivo (actualizadas) ──────────────────────────────────────────────
const APIS_VIVO = [
  { id: 'dolares',      nombre: 'Dólares · DolarApi',              detalle: 'Oficial · MEP · CCL · Blue · Cripto · Tarjeta · Mayorista · Blend', endpoint: 'dolarapi.com/v1/dolares', cache: '5 min' },
  { id: 'cotizaciones', nombre: 'Cotizaciones · Yahoo Finance',     detalle: 'CCL · MEP via proxy (AL30/ARS · AL30/USD)', endpoint: 'api.radargranos.com/cotizaciones', cache: '5 min' },
  { id: 'mundo',        nombre: 'Precios Globales · Yahoo Finance', detalle: 'S&P 500 · Petróleo · Oro · Soja CBOT · Divisas · Tasas', endpoint: 'api.radargranos.com/mundo', cache: '15 min' },
  { id: 'uva',          nombre: 'UVA · BCRA',                      detalle: 'Valor diario ARS · historial 30 días', endpoint: 'argentinadatos.com/uva', cache: '60 min' },
  { id: 'tasas',        nombre: 'Tasas · BCRA',                    detalle: 'Plazo fijo · depósitos 30d por entidad', endpoint: 'argentinadatos.com/tasas', cache: '60 min' },
  { id: 'riesgoPais',   nombre: 'Riesgo País · EMBI+',             detalle: 'JP Morgan · historial diario · último valor', endpoint: 'argentinadatos.com/riesgo-pais', cache: '60 min' },
  { id: 'inflacion',    nombre: 'IPC · INDEC / BCRA',              detalle: 'Inflación mensual, interanual y esperada (fuente primaria: BCRA)', endpoint: 'argentinadatos.com/inflacion', cache: '24 h' },
  { id: 'bcra',         nombre: 'Indicadores BCRA',                detalle: 'Reservas · Base monetaria · M2 · variables cambiarias · tasas oficiales', endpoint: 'argentinadatos.com/bcra', cache: '24 h' },
  { id: 'indec',        nombre: 'EMAE · datos.gob.ar',             detalle: 'Actividad económica mensual · serie histórica INDEC', endpoint: 'apis.datos.gob.ar/series', cache: '24 h' },
  { id: 'feriados',     nombre: 'Feriados · ArgentinaDatos',       detalle: 'Feriados nacionales del año vigente', endpoint: 'argentinadatos.com/feriados', cache: '24 h' },
];

// ─── Datos hardcodeados ───────────────────────────────────────────────────────
const HARDCODED_GRUPOS = [
  {
    categoria: 'Granos',
    items: [
      { nombre: 'Pizarra BCR', detalle: 'Soja, maíz, trigo, girasol, sorgo, cebada · Ref: 23/02/2026', endpoint: 'bolsadecereales.org.ar' },
      { nombre: 'CBOT Chicago', detalle: 'Soja, maíz, trigo disponible USD/tn · Ref: 23/02/2026', endpoint: 'CME Group · stooq.com' },
    ],
  },
  {
    categoria: 'Hacienda',
    items: [
      { nombre: 'Hacienda MAG', detalle: 'Novillos, vaquillonas, vacas, terneros · Ref: 21/02/2026', endpoint: 'MAG Cañuelas' },
    ],
  },
  {
    categoria: 'Insumos',
    items: [
      { nombre: 'Fertilizantes', detalle: 'Urea, MAP, DAP, UAN · ARS/tn zona núcleo · Ref: 23/02/2026', endpoint: 'Fertilizar / CIAFA' },
      { nombre: 'Combustibles', detalle: 'Gasoil G2, Gasoil Agro · ARS/litro · Ref: 23/02/2026', endpoint: 'Sec. Energía · YPF' },
    ],
  },
  {
    categoria: 'Índices & Relaciones',
    items: [
      { nombre: 'Índices agrop.', detalle: 'Feedlot, Cría, Soja/Urea · relaciones y histórico 12m estimado', endpoint: 'calculado en base a precios' },
    ],
  },
  {
    categoria: 'Impositivo',
    items: [
      { nombre: 'Retenciones', detalle: 'Derechos de exportación por producto · Vigentes 2026', endpoint: 'AFIP / Sec. Agricultura' },
      { nombre: 'IVA · IIBB · Otros', detalle: 'IVA agropecuario, Ingresos Brutos, Ganancias, Bienes Personales, Cheque, RENATRE', endpoint: 'AFIP / ARBA' },
    ],
  },
  {
    categoria: 'Clima',
    items: [
      { nombre: 'Clima zona núcleo', detalle: 'Temperatura, precipitaciones, pronóstico zona núcleo', endpoint: 'SMN · Open-Meteo · INTA SIGA', pendiente: true },
    ],
  },
];

export function AyudaPage({ apiStatus, goPage, reloadAll }) {
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const el = document.querySelector(hash);
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
    }
  }, []);

  const statusColor = s =>
    s === 'ok'      ? 'var(--green)' :
    s === 'error'   ? 'var(--red)'   :
    s === 'loading' ? 'var(--gold)'  : 'var(--text3)';

  const statusLabel = s =>
    s === 'ok'      ? '✓ En vivo'   :
    s === 'error'   ? '✗ Error'     :
    s === 'loading' ? '⟳ Cargando'  : '— Pendiente';

  const statusBg = s =>
    s === 'ok'      ? 'rgba(70,185,110,.12)'  :
    s === 'error'   ? 'rgba(220,60,60,.12)'   :
    s === 'loading' ? 'rgba(220,170,40,.12)'  : 'rgba(120,120,120,.10)';

  const sectionKeys = Object.keys(GLOSARIOS);

  const scrollTo = id => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="page-enter">
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>

        {/* HEADER */}
        <div className="ph">
          <div>
            <div className="ph-title">Ayuda &amp; Glosario</div>
            <div className="ph-sub">Estado de datos en vivo · Cómo usar el dashboard · Glosario por sección</div>
          </div>
        </div>

        {/* ÍNDICE RÁPIDO */}
        <div className="section">
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { label: '📡 Estado de datos', id: 'ayuda-apis' },
              { label: '⚙️ Cómo usar', id: 'ayuda-personalizar' },
              ...sectionKeys.map(k => ({ label: `${GLOSARIOS[k].icon} ${GLOSARIOS[k].label}`, id: `glosario-${k}` })),
              { label: '📐 Indicadores', id: 'ayuda-indicadores' },
            ].map(({ label, id }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                style={{ fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '.05em', color: 'var(--accent)', background: 'rgba(77,158,240,.08)', border: '1px solid rgba(77,158,240,.2)', padding: '5px 12px', borderRadius: '20px', cursor: 'pointer' }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ESTADO DE DATOS */}
        <div className="section" id="ayuda-apis" style={{ scrollMarginTop: '70px' }}>
          <div className="section-title">Estado de datos · APIs en vivo y valores hardcodeados</div>

          {/* APIs en vivo */}
          <div style={{ marginBottom: '6px', fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '.1em', color: 'var(--text3)', textTransform: 'uppercase', padding: '4px 2px' }}>
            APIs en vivo — {APIS_VIVO.length} fuentes
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '6px', marginBottom: '20px' }}>
            {APIS_VIVO.map(a => {
              const s = apiStatus?.[a.id] ?? 'idle';
              return (
                <div key={a.id} style={{ background: 'var(--bg1)', border: '1px solid var(--line)', borderRadius: '8px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600, fontSize: '12px', color: 'var(--white)' }}>{a.nombre}</span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: statusColor(s), background: statusBg(s), padding: '2px 8px', borderRadius: '4px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {statusLabel(s)}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text2)', lineHeight: 1.5 }}>{a.detalle}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text3)' }}>{a.endpoint}</span>
                    {a.cache && <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text3)', background: 'var(--bg3)', padding: '1px 6px', borderRadius: '3px' }}>caché {a.cache}</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Hardcodeados por categoría */}
          {HARDCODED_GRUPOS.map(grupo => (
            <div key={grupo.categoria} style={{ marginBottom: '12px' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '.1em', color: 'var(--text3)', textTransform: 'uppercase', padding: '4px 2px', marginBottom: '4px' }}>
                {grupo.categoria} — valor fijo con fecha de referencia
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '6px' }}>
                {grupo.items.map(h => (
                  <div key={h.nombre} style={{ background: h.pendiente ? 'rgba(120,120,120,.04)' : 'rgba(240,120,64,.04)', border: h.pendiente ? '1px solid rgba(120,120,120,.15)' : '1px solid rgba(240,120,64,.15)', borderRadius: '8px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 600, fontSize: '12px', color: h.pendiente ? 'var(--text2)' : '#f07840' }}>{h.nombre}</span>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', background: h.pendiente ? 'rgba(120,120,120,.15)' : 'rgba(240,120,64,.15)', color: h.pendiente ? 'var(--text3)' : '#f07840', padding: '2px 8px', borderRadius: '4px', flexShrink: 0 }}>
                        {h.pendiente ? 'PENDIENTE' : 'HARDCOD.'}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text2)', lineHeight: 1.5 }}>{h.detalle}</div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text3)' }}>{h.endpoint}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Leyenda */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', marginTop: '14px', padding: '10px 14px', background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: '8px' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text3)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Leyenda:</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--green)' }}>
              ✓ EN VIVO <span style={{ color: 'var(--text2)' }}>— datos en tiempo real con caché</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', background: 'rgba(240,120,64,.15)', color: '#f07840', padding: '1px 6px', borderRadius: '3px' }}>HARDCOD.</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--text2)' }}>— valor fijo con fecha de referencia indicada</span>
            </span>
          </div>
          {reloadAll && (
            <div style={{ marginTop: '10px' }}>
              <button
                onClick={reloadAll}
                style={{ background: 'var(--acc-bg)', border: '1px solid rgba(77,158,240,.3)', color: 'var(--accent)', fontFamily: 'var(--mono)', fontSize: '10px', padding: '8px 16px', borderRadius: '7px', cursor: 'pointer', letterSpacing: '.05em' }}
              >
                ⟳ REINTENTAR APIS
              </button>
            </div>
          )}
        </div>

        {/* CÓMO USAR */}
        <div className="section" id="ayuda-personalizar" style={{ scrollMarginTop: '70px' }}>
          <div className="section-title">Cómo usar el inicio personalizable</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: '1px', background: 'var(--line)', border: '1px solid var(--line)', borderRadius: '10px', overflow: 'hidden' }}>
            {[
              ['01 · Personalizar', 'Activar widgets', 'Hacé clic en PERSONALIZAR en el inicio para entrar en modo edición. Luego usá + Agregar widget para ver los widgets disponibles y activar los que quieras.'],
              ['02 · Reordenar', 'Arrastrar para mover', 'En modo edición aparece el handle ⠿ MOVER en la parte superior de cada widget. Arrastrá desde ahí para cambiar el orden.'],
              ['03 · Tamaño', 'Cambiar tamaño', 'Los botones Pequeño · Mediano · Grande en la esquina inferior de cada widget cambian su ancho en la grilla.'],
              ['04 · Ocultar', 'Quitar un widget', 'El botón ✕ en la esquina superior derecha oculta el widget. Podés volver a activarlo desde el catálogo.'],
            ].map(([eyebrow, title, desc]) => (
              <div key={title} style={{ background: 'var(--bg1)', padding: '20px 22px' }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '8px' }}>{eyebrow}</div>
                <div style={{ fontWeight: 600, color: 'var(--white)', marginBottom: '6px' }}>{title}</div>
                <div style={{ fontSize: '12px', color: 'var(--text)', lineHeight: 1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* GLOSARIOS POR SECCIÓN */}
        <div className="section">
          <div className="section-title" id="ayuda-glosario" style={{ scrollMarginTop: '70px' }}>Glosario por sección</div>
          <div style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '24px', lineHeight: 1.6 }}>
            El botón <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', background: 'rgba(77,158,240,.15)', color: 'var(--accent)', padding: '1px 7px', borderRadius: '4px', border: '1px solid rgba(77,158,240,.25)' }}>?</span> en cada sección te trae directo al glosario correspondiente.
          </div>

          {sectionKeys.map(key => {
            const glosario = GLOSARIOS[key];
            return (
              <div key={key} id={`glosario-${key}`} style={{ marginBottom: '32px', scrollMarginTop: '70px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid var(--line)' }}>
                  <span style={{ fontSize: '17px' }}>{glosario.icon}</span>
                  <span style={{ fontFamily: 'var(--display)', fontSize: '14px', fontWeight: 700, color: 'var(--white)' }}>{glosario.label}</span>
                  <button
                    onClick={() => goPage(key)}
                    style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '.06em', color: 'var(--accent)', background: 'var(--acc-bg)', border: '1px solid rgba(77,158,240,.25)', padding: '3px 10px', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    → IR A {glosario.label.toUpperCase()}
                  </button>
                </div>
                <div style={{ background: 'var(--bg1)', border: '1px solid var(--line)', borderRadius: '10px', overflow: 'hidden' }}>
                  {glosario.terms.map((g, i) => (
                    <div
                      key={g.term}
                      style={{ display: 'grid', gridTemplateColumns: '190px 1fr', gap: '16px', padding: '11px 18px', borderBottom: i < glosario.terms.length - 1 ? '1px solid var(--line)' : '', alignItems: 'baseline' }}
                    >
                      <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', fontWeight: 700, color: 'var(--accent)' }}>{g.term}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: 1.6 }}>{g.def}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* INDICADORES */}
        <div className="section" id="ayuda-indicadores" style={{ scrollMarginTop: '70px' }}>
          <div className="section-title">Indicadores agropecuarios — qué significan</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '1px', background: 'var(--line)', border: '1px solid var(--line)', borderRadius: '10px', overflow: 'hidden' }}>
            {[
              ['Índice Feedlot', 'Novillo / Maíz · umbral: 15', 'Mide cuántos kg de novillo se pueden comprar con 1 tonelada de maíz. Por encima de 15 la actividad de feedlot es rentable.'],
              ['Índice Cría', 'Ternero / Novillo · umbral: 1,30', 'Ratio de precios entre ternero y novillo. Por encima de 1,30 la cría es más rentable que el engorde.'],
              ['Relación Soja/Urea', 'tn soja / tn urea · umbral: 1,0', 'Cuántas toneladas de soja se necesitan para comprar 1 tonelada de urea. Por debajo de 1,0 la fertilización pierde rentabilidad.'],
              ['Basis', 'Precio local BCR − Precio CBOT', 'Diferencia entre el precio argentino y el precio Chicago. Basis negativo = el precio local está por debajo del internacional.'],
            ].map(([title, sub, desc]) => (
              <div key={title} style={{ background: 'var(--bg1)', padding: '18px 20px' }}>
                <div style={{ fontFamily: 'var(--display)', fontSize: '14px', fontWeight: 700, color: 'var(--white)', marginBottom: '3px' }}>{title}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--accent)', marginBottom: '8px', letterSpacing: '.04em' }}>{sub}</div>
                <div style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: 1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* FERIADOS */}
        <div className="section" id="ayuda-feriados" style={{ scrollMarginTop: '70px' }}>
          <div className="section-title">Feriados &amp; Calendario — cómo funciona</div>
          <div style={{ background: 'var(--bg1)', border: '1px solid var(--line)', borderRadius: '10px', padding: '20px 24px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.8, marginBottom: '12px' }}>
              El calendario de feriados se obtiene en tiempo real desde <strong style={{ color: 'var(--white)' }}>ArgentinaDatos.com</strong>. La sección calcula automáticamente el próximo feriado, los días hábiles restantes y genera alertas sobre el impacto en los mercados agropecuarios.
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.8 }}>
              <strong style={{ color: 'var(--white)' }}>MATBA-ROFEX</strong> y <strong style={{ color: 'var(--white)' }}>BCR</strong> no operan en feriados nacionales, lo que puede generar saltos de precio o menor liquidez en los días anteriores y posteriores al feriado.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
