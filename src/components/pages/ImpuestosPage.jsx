// ImpuestosPage.jsx — Presión fiscal agropecuaria — Abril 2026
import React, { useState } from 'react';

const TABS = [
  { id: 'retenciones', label: 'Retenciones' },
  { id: 'iva',         label: 'IVA' },
  { id: 'ganancias',   label: 'Ganancias' },
  { id: 'otros',       label: 'Otros tributos' },
  { id: 'carga',       label: 'Carga total' },
  { id: 'historia',    label: 'Histórico' },
];

// Datos al Decreto 877/2025 — vigente abril 2026
const RETENCIONES = [
  { producto: 'Soja (poroto)',        ali: 24.0,  ant: 33.0, decreto: '877/2025', tipo: 'permanente' },
  { producto: 'Aceite de soja',       ali: 22.5,  ant: 31.0, decreto: '877/2025', tipo: 'permanente' },
  { producto: 'Harina de soja',       ali: 22.5,  ant: 31.0, decreto: '877/2025', tipo: 'permanente' },
  { producto: 'Maíz',                 ali: 8.5,   ant: 12.0, decreto: '877/2025', tipo: 'permanente' },
  { producto: 'Sorgo',                ali: 8.5,   ant: 12.0, decreto: '877/2025', tipo: 'permanente' },
  { producto: 'Trigo',                ali: 7.5,   ant: 12.0, decreto: '877/2025', tipo: 'permanente' },
  { producto: 'Cebada',               ali: 7.5,   ant: 12.0, decreto: '877/2025', tipo: 'permanente' },
  { producto: 'Girasol',              ali: 4.5,   ant: 7.0,  decreto: '877/2025', tipo: 'permanente' },
  { producto: 'Colza / Canola',       ali: 4.5,   ant: 7.0,  decreto: '877/2025', tipo: 'permanente' },
  { producto: 'Carne vacuna',         ali: 5.0,   ant: 6.75, decreto: '877/2025', tipo: 'permanente' },
  { producto: 'Carne aviar',          ali: 5.0,   ant: 6.75, decreto: '877/2025', tipo: 'permanente' },
  { producto: 'Economías regionales', ali: 0.0,   ant: 2.5,  decreto: '38/2025',  tipo: 'eliminada' },
];

const IVA_ITEMS = [
  { concepto: 'Venta de cereales y oleaginosas',  ali: '10,5%', tipo: 'reducida', obs: 'Entre responsables inscriptos. Genera saldo técnico a favor.' },
  { concepto: 'Venta de hacienda vacuna/porcina', ali: '10,5%', tipo: 'reducida', obs: 'Entre inscriptos. Diferencia con el 21% produce crédito fiscal.' },
  { concepto: 'Semillas certificadas',            ali: '10,5%', tipo: 'reducida', obs: 'Alícuota reducida. Crédito fiscal parcial para el productor.' },
  { concepto: 'Arrendamientos rurales',           ali: 'EXENTO', tipo: 'exento',  obs: 'No gravados según Ley 23.349. Sin débito ni crédito.' },
  { concepto: 'Servicios agrícolas (laboreos)',   ali: '21%',   tipo: 'general',  obs: 'Siembra, cosecha, fumigación. Genera crédito fiscal importante.' },
  { concepto: 'Agroquímicos y fertilizantes',     ali: '21%',   tipo: 'general',  obs: 'Insumos críticos. El 21% pagado computa como crédito fiscal.' },
  { concepto: 'Maquinaria agrícola',              ali: '21%',   tipo: 'general',  obs: 'Admite crédito fiscal diferido contra saldo técnico acumulado.' },
  { concepto: 'Combustibles (gasoil campo)',      ali: '21%',   tipo: 'general',  obs: 'IVA no recuperable en uso agropecuario. Costo real directo.' },
];

const OTROS = [
  { nombre: 'Ingresos Brutos (IIBB)',        nivel: 'Provincial', ali: '0% – 3,5%',          base: 'Ventas brutas',            obs: 'Varía por provincia. Córdoba: primaria exenta. Bs.As.: 0,5%-1,25%. Convenio Multilateral si opera en varias provincias.' },
  { nombre: 'Impuesto al Cheque',            nivel: 'Nacional',   ali: '0,6% / 1,2%',         base: 'Movimientos bancarios',    obs: 'Acreditación / débito. El 33% del impuesto sobre acreditaciones computa como pago a cuenta de Ganancias o IVA.' },
  { nombre: 'Bienes Personales',             nivel: 'Nacional',   ali: '0,50% – 1,50%',       base: 'Valuación fiscal al 31-dic', obs: 'MNI: $384,7M (fiscal 2025). REIBP: quienes adhirieron al blanqueo 2024 están eximidos hasta 2027 sin DJ.' },
  { nombre: 'Impuesto Inmobiliario Rural',   nivel: 'Provincial', ali: '0,1% – 1,2%',         base: 'Valuación fiscal del campo', obs: 'Varía por provincia. Deducible como gasto en Ganancias. Bs.As. y Córdoba tienen sistemas de valuación distintos.' },
  { nombre: 'Tasa Vial Provincial',          nivel: 'Provincial', ali: 'Variable',             base: 'Tn transportada',          obs: 'Córdoba, Santa Fe, Bs.As. cobran por tonelada. Estimado: $800–$2.500/tn según distancia y provincia.' },
  { nombre: 'Contribuciones RENATRE',        nivel: 'Nacional',   ali: '1,5% – 2%',           base: 'Remuneraciones rurales',   obs: 'Personal temporario y permanente. Aportes patronales a organismos de trabajo rural. Deducibles en Ganancias.' },
];

const CARGA_ESCENARIOS = [
  { escenario: 'Sojero — Zona núcleo — Campo propio',       rango: '53–60%', nivel: 'dn' },
  { escenario: 'Sojero — Zona núcleo — Arrendatario',       rango: '67–75%', nivel: 'dn' },
  { escenario: 'Maicero — Zona pampeana — Campo propio',    rango: '38–45%', nivel: 'warn' },
  { escenario: 'Triguero — Zona pampeana — Campo propio',   rango: '35–42%', nivel: 'warn' },
  { escenario: 'Ganadero bovino — Ciclo completo',           rango: '28–35%', nivel: 'up' },
  { escenario: 'Zona extrapampeana — Arrendatario',         rango: '80–120%+', nivel: 'dn' },
];

const COMPOSICION = [
  { impuesto: 'Retención DEX (Soja 24%)', pctFob: '24,0%', pctRenta: '~30–35%', nivel: 'Nacional' },
  { impuesto: 'Impuesto a las Ganancias', pctFob: 'Variable', pctRenta: '~8–12%', nivel: 'Nacional' },
  { impuesto: 'Bienes Personales',        pctFob: '0,5–1,5% s/ tierra', pctRenta: '~2–4%', nivel: 'Nacional' },
  { impuesto: 'Impuesto al Cheque',       pctFob: '0,6–1,2% s/ mov.', pctRenta: '~1–2%', nivel: 'Nacional' },
  { impuesto: 'IIBB',                     pctFob: '0,5–1%', pctRenta: '~1–2%', nivel: 'Provincial' },
  { impuesto: 'Inmobiliario Rural',       pctFob: '0,1–1% s/ val.', pctRenta: '~1–2%', nivel: 'Provincial' },
  { impuesto: 'IVA (efecto financiero)',  pctFob: 'Saldo a favor', pctRenta: '~1–2%', nivel: 'Nacional' },
];

const HISTORIA = [
  { periodo: '2008–2019',    soja: 35,   maiz: 12,  trigo: 12,  girasol: 7   },
  { periodo: '2020–2024',    soja: 33,   maiz: 12,  trigo: 12,  girasol: 7   },
  { periodo: 'Ene–Jun 2025', soja: 26,   maiz: 9.5, trigo: 9.5, girasol: 5.5 },
  { periodo: 'Jul–Sep 2025', soja: 33,   maiz: 12,  trigo: 9.5, girasol: 7   },
  { periodo: 'Dic 2025–hoy', soja: 24,   maiz: 8.5, trigo: 7.5, girasol: 4.5 },
];

const CRONOLOGIA = [
  { fecha: 'Ene 2025', decreto: '38/2025',  hito: 'Baja temporal. Soja 33%→26%, Maíz/Trigo 12%→9,5%, Girasol 7%→5,5%. Economías regionales: eliminadas en forma permanente.' },
  { fecha: 'Jun 2025', decreto: '439/2025', hito: 'Prórroga solo para Trigo y Cebada hasta 31-mar-2026. Soja y Maíz vuelven a 33% y 12% desde el 1° de julio.' },
  { fecha: 'Sep 2025', decreto: '682/2025', hito: 'Retenciones 0% hasta cupo de USD 7.000M. El cupo se agotó en 3 días hábiles. Liquidación récord del sector.' },
  { fecha: 'Dic 2025', decreto: '877/2025', hito: 'Baja permanente. Soja 24%, subproductos 22,5%, Maíz/Sorgo 8,5%, Trigo/Cebada 7,5%, Girasol 4,5%, Carne 5%. Mínimo desde 2006.' },
];

export function ImpuestosPage({ goPage }) {
  const [tab, setTab] = useState('retenciones');
  const maxAli = Math.max(...RETENCIONES.map(r => r.ali));

  return (
    <div className="page-enter">
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        {/* Page header */}
        <div className="ph">
          <div>
            <div className="ph-title">
              Impositivo <span className="help-pip" onClick={() => goPage('ayuda', 'glosario-impuestos')}>?</span>
            </div>
            <div className="ph-sub">
              Presión fiscal agropecuaria · Impuesto a impuesto · Vigente abril 2026 · Decreto 877/2025
            </div>
          </div>
          <span className="pill up" style={{ fontSize: 11 }}>⬇ Mínimo desde 2006</span>
        </div>

        {/* Tabs */}
        <div className="tabs">
          {TABS.map(t => (
            <button key={t.id} className={`tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── RETENCIONES ── */}
        {tab === 'retenciones' && (
          <div>
            <div className="section-title">Derechos de Exportación vigentes — Decreto 877/2025</div>

            <div className="alert-strip info" style={{ marginBottom: 20 }}>
              <span className="alert-icon">ℹ</span>
              <span className="alert-text">
                Las retenciones se aplican sobre el <strong>precio FOB de exportación</strong>, no sobre la ganancia.
                El productor las paga haya o no rentabilidad, y las absorbe vía precio pizarra (FAS). Con el Decreto 877/2025 rigen las alícuotas más bajas desde 2006.
              </span>
            </div>

            <div className="tbl-wrap" style={{ marginBottom: 32 }}>
              <table>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th className="r">Vigente</th>
                    <th className="r">Anterior</th>
                    <th className="r">Baja</th>
                    <th>Decreto</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {RETENCIONES.map(r => {
                    const diff = r.ant - r.ali;
                    const isHigh = r.ali >= 15;
                    const isMid  = r.ali >= 5 && r.ali < 15;
                    return (
                      <tr key={r.producto}>
                        <td className="bold">{r.producto}</td>
                        <td className="r w mono">{r.ali === 0 ? '0%' : `${r.ali}%`}</td>
                        <td className="r dim mono">{r.ant}%</td>
                        <td className="r">
                          <span className="pill up">−{diff.toFixed(1)} pp</span>
                        </td>
                        <td className="dim" style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>Dcto. {r.decreto}</td>
                        <td>
                          <span className={`pill ${r.tipo === 'eliminada' ? 'up' : 'info'}`}>
                            {r.tipo}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="section-title">¿Cómo funcionan las retenciones?</div>
            <div className="grid grid-2" style={{ marginBottom: 24 }}>
              <div className="stat c-flat">
                <div className="stat-label">Precio FAS (campo)</div>
                <div className="stat-val sm">FOB − DEX − Flete − Comisión</div>
                <div className="stat-meta">
                  El FAS es lo que recibe el productor. La retención se aplica sobre el FOB,
                  pero el impacto recae sobre el precio de pizarra. En soja, el 24% sobre FOB
                  representa ~28–32% del precio campo efectivo.
                </div>
              </div>
              <div className="stat c-flat">
                <div className="stat-label">Recaudación estimada 2026</div>
                <div className="stat-val sm">USD 4.809 M</div>
                <div className="stat-meta">
                  Estimación BCR con el esquema del Decreto 877/2025.
                  Implica una caída de ~10% versus el esquema anterior (USD 5.320M),
                  equivalente a un alivio fiscal de USD 511 millones para el sector.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── IVA ── */}
        {tab === 'iva' && (
          <div>
            <div className="section-title">IVA Agropecuario — Ley 23.349 — Vigente 2026</div>

            <div className="alert-strip info" style={{ marginBottom: 20 }}>
              <span className="alert-icon">ℹ</span>
              <span className="alert-text">
                El productor vende al <strong>10,5%</strong> y compra insumos al <strong>21%</strong>.
                Esto genera un saldo técnico a favor permanente. El costo real no es el impuesto, sino
                el <strong>efecto financiero de tener fondos inmovilizados 6–18 meses</strong> hasta recuperar el crédito.
              </span>
            </div>

            <div className="tbl-wrap" style={{ marginBottom: 32 }}>
              <table>
                <thead>
                  <tr>
                    <th>Concepto / Operación</th>
                    <th className="r">Alícuota</th>
                    <th>Tipo</th>
                    <th>Observación</th>
                  </tr>
                </thead>
                <tbody>
                  {IVA_ITEMS.map(item => {
                    const badge = item.tipo === 'reducida' ? 'warn'
                                : item.tipo === 'exento'  ? 'up'
                                                          : 'dn';
                    return (
                      <tr key={item.concepto}>
                        <td className="bold">{item.concepto}</td>
                        <td className="r w mono">{item.ali}</td>
                        <td><span className={`pill ${badge}`}>{item.tipo}</span></td>
                        <td className="dim" style={{ fontSize: 12 }}>{item.obs}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="section-title">Flujo típico — Productor de granos (Responsable Inscripto)</div>
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Operación</th>
                    <th className="r">IVA</th>
                    <th>Efecto</th>
                    <th>Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>Compra agroquímicos / fertilizantes</td><td className="r mono">21%</td><td><span className="pill up">crédito</span></td><td className="dim">Saldo a favor del productor</td></tr>
                  <tr><td>Servicio de siembra / cosecha</td><td className="r mono">21%</td><td><span className="pill up">crédito</span></td><td className="dim">Saldo a favor del productor</td></tr>
                  <tr><td>Compra de semillas</td><td className="r mono">10,5%</td><td><span className="pill up">crédito</span></td><td className="dim">Crédito parcial</td></tr>
                  <tr><td>Venta de granos</td><td className="r mono">10,5%</td><td><span className="pill dn">débito</span></td><td className="dim">Cargo parcial al fisco</td></tr>
                  <tr>
                    <td className="bold">Saldo neto acumulado</td>
                    <td className="r w mono">A favor</td>
                    <td><span className="pill info">recuperable</span></td>
                    <td className="dim">Compensación o acreditación ante ARCA · 3–18 meses</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="source">Efecto financiero estimado del saldo técnico: 1%–2% anual sobre ventas totales · Ley 23.349</div>
          </div>
        )}

        {/* ── GANANCIAS ── */}
        {tab === 'ganancias' && (
          <div>
            <div className="section-title">Impuesto a las Ganancias — Vigente 1° semestre 2026</div>

            <div className="alert-strip info" style={{ marginBottom: 20 }}>
              <span className="alert-icon">ℹ</span>
              <span className="alert-text">
                Escalas actualizadas <strong>+14,29%</strong> en enero 2026 (inflación jul–dic 2025). Aplica a productores, sociedades y fideicomisos agropecuarios.
              </span>
            </div>

            <div className="grid grid-2" style={{ marginBottom: 28 }}>
              <div>
                <div className="section-title">Persona Humana — Escala progresiva</div>
                <div className="tbl-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Ganancia neta anual acumulada</th>
                        <th className="r">Alícuota</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr><td className="dim">Hasta $2.000.030</td><td className="r mono">5%</td></tr>
                      <tr><td className="dim">$2.000.031 – $4.000.060</td><td className="r mono">9%</td></tr>
                      <tr><td className="dim">$4.000.061 – $8.000.120</td><td className="r mono">12%</td></tr>
                      <tr><td className="dim">$8.000.121 – $16.000.240</td><td className="r mono">15%</td></tr>
                      <tr><td className="dim">$16.000.241 – $24.000.361</td><td className="r mono">19%</td></tr>
                      <tr><td className="dim">$24.000.362 – $36.000.541</td><td className="r mono">23%</td></tr>
                      <tr><td className="dim">$36.000.542 – $48.000.721</td><td className="r mono">27%</td></tr>
                      <tr><td className="dim">$48.000.722 – $60.750.913</td><td className="r mono">31%</td></tr>
                      <tr><td className="bold">Más de $60.750.913</td><td className="r w mono">35%</td></tr>
                    </tbody>
                  </table>
                </div>
                <div className="source">Art. 94 Ley 20.628 · ARCA — Actualización ene-2026</div>
              </div>

              <div>
                <div className="section-title">Pisos para tributar — 1° sem. 2026</div>
                <div className="tbl-wrap" style={{ marginBottom: 16 }}>
                  <table>
                    <thead>
                      <tr><th>Situación familiar</th><th className="r">Sueldo neto mínimo</th></tr>
                    </thead>
                    <tbody>
                      <tr><td className="dim">Soltero sin hijos</td><td className="r mono">$2.490.038</td></tr>
                      <tr><td className="dim">Casado sin hijos</td><td className="r mono">$2.894.000</td></tr>
                      <tr><td className="dim">Casado, 2 hijos</td><td className="r mono">$3.302.179</td></tr>
                    </tbody>
                  </table>
                </div>

                <div className="section-title">Personas Jurídicas</div>
                <div className="tbl-wrap">
                  <table>
                    <thead>
                      <tr><th>Tipo societario</th><th className="r">Alícuota</th></tr>
                    </thead>
                    <tbody>
                      <tr><td className="dim">S.A. / S.R.L. / Fideicomiso</td><td className="r w mono">35%</td></tr>
                      <tr><td className="dim">Dividendos distribuidos</td><td className="r mono">7%</td></tr>
                    </tbody>
                  </table>
                </div>
                <div className="source">Ley 20.628 art. 73 — Ley 27.630 (dividendos)</div>
              </div>
            </div>

            <div className="section-title">Particularidades agropecuarias</div>
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Ítem</th>
                    <th>Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td className="bold">Categoría del productor</td><td className="dim">Cat. I (renta del suelo — arrendador) o Cat. III (empresa unipersonal — explotación directa)</td></tr>
                  <tr><td className="bold">Deducciones clave</td><td className="dim">Amortizaciones de mejoras rurales, gastos directos de explotación, intereses de créditos agropecuarios, IIBB e Inmobiliario rural pagados</td></tr>
                  <tr><td className="bold">Computable a cuenta</td><td className="dim">33% del Impuesto al Cheque sobre acreditaciones · Percepciones ARCA por compras en exterior</td></tr>
                  <tr><td className="bold">Anticipos</td><td className="dim">5 anticipos anuales del 20% c/u, sobre el impuesto del año anterior. Generan exposición financiera en años de baja rentabilidad</td></tr>
                  <tr><td className="bold">Bienes de uso rural</td><td className="dim">Amortización acelerada disponible para maquinaria y mejoras. Impacto directo en la base imponible del primer año</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── OTROS TRIBUTOS ── */}
        {tab === 'otros' && (
          <div>
            <div className="section-title">Otros impuestos relevantes — Nacionales y provinciales</div>

            <div className="tbl-wrap" style={{ marginBottom: 32 }}>
              <table>
                <thead>
                  <tr>
                    <th>Impuesto</th>
                    <th>Nivel</th>
                    <th className="r">Alícuota</th>
                    <th>Base imponible</th>
                    <th>Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {OTROS.map(o => (
                    <tr key={o.nombre}>
                      <td className="bold">{o.nombre}</td>
                      <td><span className={`pill ${o.nivel === 'Nacional' ? 'info' : 'warn'}`}>{o.nivel}</span></td>
                      <td className="r mono">{o.ali}</td>
                      <td className="dim" style={{ fontSize: 12 }}>{o.base}</td>
                      <td className="dim" style={{ fontSize: 12 }}>{o.obs}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="section-title">IIBB por provincia — Actividad primaria agrícola</div>
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Provincia</th>
                    <th className="r">Venta granos</th>
                    <th className="r">Venta hacienda</th>
                    <th>Observación</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td className="bold">Córdoba</td><td className="r"><span className="pill up">Exenta</span></td><td className="r mono">0,5%</td><td className="dim">Actividad primaria agrícola exenta. Ley Impositiva 2026.</td></tr>
                  <tr><td className="bold">Santa Fe</td><td className="r mono">0,5%</td><td className="r mono">0,5%</td><td className="dim">Alícuota mínima para actividad primaria.</td></tr>
                  <tr><td className="bold">Buenos Aires</td><td className="r mono">1,0%</td><td className="r mono">1,0%</td><td className="dim">Convenio Multilateral para productores que operan en varias provincias.</td></tr>
                  <tr><td className="bold">Entre Ríos</td><td className="r mono">1,0%</td><td className="r mono">1,25%</td><td className="dim">Escala según volumen de ventas.</td></tr>
                  <tr><td className="bold">La Pampa</td><td className="r mono">1,5%</td><td className="r mono">1,5%</td><td className="dim">Sin diferenciación por tipo de actividad agropecuaria.</td></tr>
                  <tr><td className="bold">Santiago del Estero</td><td className="r mono">3,0%</td><td className="r mono">3,0%</td><td className="dim">Alícuota general. No hay reducción sectorial.</td></tr>
                </tbody>
              </table>
            </div>
            <div className="source">Fuente: Leyes Impositivas provinciales 2026 · ARCA</div>
          </div>
        )}

        {/* ── CARGA TOTAL ── */}
        {tab === 'carga' && (
          <div>
            <div className="section-title">Carga fiscal total estimada — Campaña 2025/26</div>

            <div className="alert-strip warn" style={{ marginBottom: 20 }}>
              <span className="alert-icon">⚠</span>
              <span className="alert-text">
                Según análisis del IERAL-Fundación Mediterránea (dic-2025), con el esquema actual del Decreto 877/2025,
                la carga total para el productor sojero en zona núcleo va del <strong>53% al 75%+</strong> de la renta bruta.
                En zonas marginales con arrendamiento puede superar el 100%.
              </span>
            </div>

            <div className="tbl-wrap" style={{ marginBottom: 32 }}>
              <table>
                <thead>
                  <tr>
                    <th>Escenario productor</th>
                    <th className="r">Carga total estimada</th>
                    <th>Nivel de presión</th>
                  </tr>
                </thead>
                <tbody>
                  {CARGA_ESCENARIOS.map(e => (
                    <tr key={e.escenario}>
                      <td className="bold">{e.escenario}</td>
                      <td className="r w mono">{e.rango}</td>
                      <td><span className={`pill ${e.nivel}`}>{e.nivel === 'dn' ? 'ALTA' : e.nivel === 'warn' ? 'MEDIA' : 'MODERADA'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="section-title">Composición detallada — Sojero zona núcleo, campo propio</div>
            <div className="tbl-wrap" style={{ marginBottom: 24 }}>
              <table>
                <thead>
                  <tr>
                    <th>Impuesto</th>
                    <th className="r">% sobre FOB / base</th>
                    <th className="r">% sobre renta bruta</th>
                    <th>Jurisdicción</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPOSICION.map(c => (
                    <tr key={c.impuesto}>
                      <td className="bold">{c.impuesto}</td>
                      <td className="r dim mono">{c.pctFob}</td>
                      <td className="r mono dn">{c.pctRenta}</td>
                      <td className="dim">{c.nivel}</td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: '2px solid var(--line2)' }}>
                    <td className="bold">TOTAL ESTIMADO</td>
                    <td className="r dim">—</td>
                    <td className="r w mono">53–60%</td>
                    <td className="dim">Multijurisdiccional</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="source">
              Fuente: IERAL-Fundación Mediterránea · BCR · Datos propios · Campaña 2025/26 · Tipo de cambio y precios a abr-2026.
              Los porcentajes varían según commodity, precio internacional, costos de producción y zona geográfica.
            </div>
          </div>
        )}

        {/* ── HISTÓRICO ── */}
        {tab === 'historia' && (
          <div>
            <div className="section-title">Evolución de retenciones — Principales cultivos — 2008/2026</div>

            <div className="tbl-wrap" style={{ marginBottom: 32 }}>
              <table>
                <thead>
                  <tr>
                    <th>Período</th>
                    <th className="r">Soja (poroto)</th>
                    <th className="r">Maíz</th>
                    <th className="r">Trigo</th>
                    <th className="r">Girasol</th>
                  </tr>
                </thead>
                <tbody>
                  {HISTORIA.map((h, i) => {
                    const isCurrent = i === HISTORIA.length - 1;
                    return (
                      <tr key={h.periodo} style={isCurrent ? { background: 'var(--acc-bg)' } : {}}>
                        <td className={isCurrent ? 'bold' : 'dim'} style={isCurrent ? { fontFamily: 'var(--mono)', fontSize: 12 } : { fontFamily: 'var(--mono)', fontSize: 12 }}>
                          {h.periodo}{isCurrent && <span className="pill info" style={{ marginLeft: 8, fontSize: 9 }}>VIGENTE</span>}
                        </td>
                        <td className="r mono" style={{ color: h.soja > 28 ? 'var(--red)' : h.soja < 26 ? 'var(--green)' : 'var(--gold)' }}>{h.soja}%</td>
                        <td className="r mono" style={{ color: h.maiz > 10 ? 'var(--red)' : h.maiz < 9 ? 'var(--green)' : 'var(--gold)' }}>{h.maiz}%</td>
                        <td className="r mono" style={{ color: h.trigo > 10 ? 'var(--red)' : h.trigo < 9 ? 'var(--green)' : 'var(--gold)' }}>{h.trigo}%</td>
                        <td className="r mono" style={{ color: h.girasol > 5.5 ? 'var(--red)' : 'var(--green)' }}>{h.girasol}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="section-title">Cronología 2025–2026</div>
            <div className="tbl-wrap" style={{ marginBottom: 24 }}>
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Decreto</th>
                    <th>Medida</th>
                  </tr>
                </thead>
                <tbody>
                  {CRONOLOGIA.map(c => (
                    <tr key={c.decreto}>
                      <td className="dim" style={{ fontFamily: 'var(--mono)', fontSize: 11, whiteSpace: 'nowrap' }}>{c.fecha}</td>
                      <td><span className="pill info" style={{ fontSize: 10 }}>{c.decreto}</span></td>
                      <td className="dim" style={{ fontSize: 12 }}>{c.hito}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="stat c-flat">
              <div className="stat-label">Perspectiva — Sector agropecuario 2026</div>
              <div className="stat-meta" style={{ lineHeight: 1.7 }}>
                El Gobierno declaró como objetivo estratégico la eliminación gradual de los derechos de exportación (Decreto 877/2025).
                Sin embargo, la recaudación por DEX representa ~6% de los ingresos tributarios nacionales.
                La BCR estima USD 4.809M de recaudación bajo el esquema vigente, una caída del 10% versus el esquema anterior,
                y un alivio de USD 511M para el sector. Nuevas bajas están condicionadas al mantenimiento del superávit fiscal.
              </div>
            </div>
            <div className="source" style={{ marginTop: 8 }}>Fuente: Boletines Oficiales · Chequeado · BCR · IERAL · Secretaría de Agricultura</div>
          </div>
        )}

      </div>
    </div>
  );
}
