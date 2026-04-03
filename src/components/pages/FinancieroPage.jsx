// FinancieroPage.jsx
// ─────────────────────────────────────────────────────────────
// Secciones:
//   1. DolaresSection     — tipos de cambio + brecha cambiaria
//   2. UvaSection         — valor UVA + gráfico 30 días
//   3. TasasSection       — tasas BCRA + plazo fijo por entidad
//   4. BcraCambiarioSection — cambiario e índices BCRA
// Sub-componentes pendientes de extraer a /components/financiero/
// ─────────────────────────────────────────────────────────────
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ApiErrorBanner } from '../ui/StatCard';
import { CanvasChart } from '../ui/CanvasChart';



export function FinancieroPage({ goPage, dolares, uva, tasas, bcra, loadBcra, apiStatus, reloadAll }) {
  const f$ = v => v ? '$' + Math.round(v).toLocaleString('es-AR') : '…';
  const fP = v => v != null ? (v > 0 ? '+' : '') + v.toFixed(1).replace('.', ',') + '%' : '—';
  const fTNA = v => v != null ? v.toFixed(2).replace('.', ',') + '%' : '—';

  // Delta diario en pesos: muestra '+$X hoy' o '−$X hoy' con clase CSS correcta
  const fDelta$ = (delta) => {
    if (delta == null) return { txt: '—', cls: 'fl' };
    const abs = Math.abs(delta).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    return delta >= 0
      ? { txt: `+$${abs} hoy`, cls: 'up' }
      : { txt: `−$${abs} hoy`, cls: 'dn' };
  };
  // Spread compra/venta
  const fSpread = (spread) => spread != null ? `spread $${spread.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : null;

  const pOf  = dolares?.pOf  ? f$(dolares.pOf)  : 'actualizando…';
  const pMep = dolares?.pMep ? f$(dolares.pMep) : 'actualizando…';
  const pCcl = dolares?.pCcl ? f$(dolares.pCcl) : 'actualizando…';
  const pBlu = dolares?.pBlu ? f$(dolares.pBlu) : 'actualizando…';
  const pMay = dolares?.pMay ? f$(dolares.pMay) : '…';
  const pCry = dolares?.pCry ? f$(dolares.pCry) : '…';
  const bMep = dolares?.bMep != null ? fP(dolares.bMep) : '—';
  const bCcl = dolares?.bCcl != null ? fP(dolares.bCcl) : '—';
  const bBlu = dolares?.bBlu != null ? fP(dolares.bBlu) : '—';
  const bCry = dolares?.bCry != null ? fP(dolares.bCry) : '—';

  // UVA
  const uvaValor = uva?.valor
    ? '$' + uva.valor.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : 'actualizando…';
  const uvaDelta = uva?.valor && uva?.prev ? uva.valor - uva.prev : null;
  const uvaDeltaDisp = uvaDelta != null
    ? (uvaDelta >= 0 ? '+$' : '−$') + Math.abs(uvaDelta).toFixed(2).replace('.', ',') + ' vs ayer'
    : '—';
  const uvaHistory = uva?.history ?? [];

  // Variación 30 días UVA
  // Datos para CanvasChart
  const uvaChartSeries = uvaHistory.length >= 2 ? [{
    label: 'UVA',
    color: '#4d9ef0',
    data:  uvaHistory.map(d => parseFloat(d.valor ?? 0)),
  }] : null;
  const uvaChartLabels = uvaHistory.map(d => {
    const [, , dd, mm] = (d.fecha || '').match(/(\d{4})-(\d{2})-(\d{2})/) || [];
    return dd && mm ? dd + '/' + mm : '';
  });

  const uvaVar30 = uvaHistory.length >= 2 ? (() => {
    const oldest = parseFloat(uvaHistory[0]?.valor ?? 0);
    const newest = parseFloat(uvaHistory[uvaHistory.length - 1]?.valor ?? 0);
    return oldest > 0 ? ((newest - oldest) / oldest * 100) : null;
  })() : null;

  // Tasas
  const plazoFijo = tasas?.plazoFijo ?? [];
  // API devuelve TNA como decimal (0.30 = 30%), multiplicar x100
  const toTNA = v => v != null && v !== '' ? parseFloat(v) * 100 : 0;
  const sortedPF = [...plazoFijo]
    .filter(e => e.tnaClientes || e.tnaNoClientes)
    .sort((a, b) => toTNA(b.tnaClientes || b.tnaNoClientes) - toTNA(a.tnaClientes || a.tnaNoClientes));

  // Brechas
  const brechasData = [
    { n: 'Oficial BCRA', val: pOf,  brecha: null, brechaNum: 0,                color: 'var(--accent)', isBase: true },
    { n: 'MEP / Bolsa',  val: pMep, brecha: bMep, brechaNum: dolares?.bMep ?? 0, color: 'var(--accent)', isBase: false },
    { n: 'CCL',          val: pCcl, brecha: bCcl, brechaNum: dolares?.bCcl ?? 0, color: 'var(--accent)', isBase: false },
    { n: 'Blue',         val: pBlu, brecha: bBlu, brechaNum: dolares?.bBlu ?? 0, color: 'var(--red)',    isBase: false },
    { n: 'Cripto USDT',  val: pCry, brecha: bCry, brechaNum: dolares?.bCry ?? 0, color: 'var(--text2)', isBase: false },
  ];
  const maxBrecha = Math.max(...brechasData.map(b => Math.abs(b.brechaNum)), 1);

  return (
    <div className="page-enter">
      <ApiErrorBanner
        keys={['dolares', 'uva', 'tasas', 'bcra']}
        apiStatus={apiStatus}
        labels={{ dolares: 'Dólares', uva: 'UVA', tasas: 'Tasas', bcra: 'BCRA' }}
        onRetry={reloadAll}
      />
      <div className="ph">
        <div>
          <div className="ph-title">Financiero <span className="help-pip" onClick={() => goPage('ayuda')} title="Ayuda">?</span></div>
          <div className="ph-sub">Dólares · UVA · Tasas · DolarApi · BCRA · ArgentinaDatos</div>
        </div>
        <div className="ph-right" style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text3)' }}>
          Actualización <span style={{ color: 'var(--text2)' }}>diaria</span>
        </div>
      </div>

      {/* ── 1. DÓLARES ─────────────────────────────────────────── */}
      <div className="section">
        <div className="section-title">Tipos de cambio · ARS/USD · BCRA / API Dolar</div>
        <div className="grid grid-3" style={{ marginBottom: '20px' }}>
          {(() => {
            const dOf  = fDelta$(dolares?.deltaOf);
            const spOf = fSpread(dolares?.spreadOf);
            const spBlu = fSpread(dolares?.spreadBlu);
            return (<>
              <div className="stat c-flat">
                <div className="stat-label">Oficial BCRA <span className="stat-badge fl">vendedor</span></div>
                <div className="stat-val lg">{pOf}</div>
                <div className={`stat-delta ${dOf.cls}`}>{dOf.txt}</div>
                <div className="stat-meta">{spOf ? spOf + ' · ' : ''}crawling peg ~1%/mes</div>
              </div>
              <div className="stat c-flat">
                <div className="stat-label">MEP / Bolsa <span className="stat-badge fl">AL30D</span></div>
                <div className="stat-val lg">{pMep}</div>
                <div className="stat-delta fl">brecha {bMep}</div>
                <div className="stat-meta">Mercado secundario libre · legal</div>
              </div>
              <div className="stat c-flat">
                <div className="stat-label">CCL <span className="stat-badge fl">GD30</span></div>
                <div className="stat-val lg">{pCcl}</div>
                <div className="stat-delta fl">brecha {bCcl}</div>
                <div className="stat-meta">Contado con liquidación · exterior</div>
              </div>
              <div className="stat c-flat">
                <div className="stat-label">Blue <span className="stat-badge fl">informal</span></div>
                <div className="stat-val lg">{pBlu}</div>
                <div className="stat-delta fl">brecha {bBlu}{spBlu ? ' · ' + spBlu : ''}</div>
                <div className="stat-meta">Mercado paralelo · referencia</div>
              </div>
              <div className="stat c-flat">
                <div className="stat-label">Cripto (USDT) <span className="stat-badge fl">—</span></div>
                <div className="stat-val lg">{pCry}</div>
                <div className="stat-delta fl">brecha {bCry}</div>
                <div className="stat-meta">dolarapi.com · referencia</div>
              </div>
              <div className="stat c-flat">
                <div className="stat-label">Dólar Mayorista <span className="stat-badge fl">BCRA</span></div>
                <div className="stat-val lg">{pMay}</div>
                <div className="stat-delta fl">tipo comprador · BCRA</div>
                <div className="stat-meta">Referencia exportaciones · crawling peg</div>
              </div>
            </>);
          })()}
        </div>

        {/* Brechas — rediseño con cards + escala de precios */}
        <div style={{ background: 'var(--bg1)', border: '1px solid var(--line)', borderRadius: '10px', overflow: 'hidden', marginBottom: '8px' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text3)' }}>
              Brecha cambiaria vs Oficial BCRA · tiempo real
            </span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '8px', color: 'var(--text3)' }}>
              ARS / USD
            </span>
          </div>

          {(() => {
            const items = [
              { n: 'MEP / Bolsa', val: dolares?.pMep, brecha: dolares?.bMep, color: '#4d9ef0' },
              { n: 'CCL',         val: dolares?.pCcl, brecha: dolares?.bCcl, color: '#4d9ef0' },
              { n: 'Blue',        val: dolares?.pBlu, brecha: dolares?.bBlu, color: '#f07070' },
              { n: 'Cripto USDT', val: dolares?.pCry, brecha: dolares?.bCry, color: '#9a9eb4' },
            ];
            const base = dolares?.pOf || 1;
            const allVals = [base, ...items.map(x => x.val || base)];
            const scaleMin = base * 0.97;
            const scaleMax = Math.max(...allVals) * 1.02;
            const toX = v => Math.max(0, Math.min(100, ((v - scaleMin) / (scaleMax - scaleMin)) * 100));
            const baseX = toX(base);

            return (
              <div style={{ padding: '16px 20px 12px' }}>
                {/* Eje de escala con ticks */}
                <div style={{ paddingLeft: '160px', marginBottom: '10px', position: 'relative', height: '20px' }}>
                  <div style={{ position: 'absolute', left: `calc(160px + ${baseX}%)`, transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--accent)', fontWeight: 600 }}>
                      Oficial ${Math.round(base).toLocaleString('es-AR')}
                    </span>
                  </div>
                </div>

                {/* Filas de tipos de cambio */}
                {items.map((item, i) => {
                  const price  = item.val || base;
                  const posX   = toX(price);
                  const brecha = item.brecha;
                  const isNeg  = brecha != null && brecha < 0;
                  const brechaStr = brecha != null
                    ? (brecha > 0 ? '+' : '') + brecha.toFixed(1).replace('.', ',') + '%'
                    : '—';
                  const brechaColor = isNeg ? '#56c97a' : item.color;

                  return (
                    <div key={item.n} style={{
                      display: 'flex', alignItems: 'center',
                      padding: '6px 0',
                      borderTop: i === 0 ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(255,255,255,0.04)',
                    }}>
                      {/* Label + precio */}
                      <div style={{ width: '160px', flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: 400, letterSpacing: '.01em' }}>{item.n}</span>
                          <span style={{ fontFamily: 'var(--mono)', fontSize: '13px', fontWeight: 700, color: 'var(--white)' }}>
                            ${Math.round(price).toLocaleString('es-AR')}
                          </span>
                        </div>
                      </div>

                      {/* Track */}
                      <div style={{ flex: 1, position: 'relative', height: '24px' }}>
                        {/* Línea base */}
                        <div style={{
                          position: 'absolute', top: '50%', left: 0, right: 0,
                          height: '1px', background: 'rgba(255,255,255,0.06)',
                          transform: 'translateY(-50%)',
                        }}>
                          {/* Línea vertical oficial */}
                          <div style={{
                            position: 'absolute', left: `${baseX}%`,
                            top: '-10px', bottom: '-10px',
                            width: '1px', background: 'rgba(77,158,240,0.35)',
                          }} />
                          {/* Segmento coloreado desde oficial */}
                          {price !== base && (
                            <div style={{
                              position: 'absolute',
                              left:  price > base ? `${baseX}%` : `${posX}%`,
                              width: `${Math.abs(posX - baseX)}%`,
                              top: '-1px', height: '3px',
                              background: item.color,
                              opacity: 0.45,
                              borderRadius: '2px',
                            }} />
                          )}
                        </div>
                        {/* Dot */}
                        <div style={{
                          position: 'absolute',
                          left: `${posX}%`,
                          top: '50%',
                          transform: 'translate(-50%, -50%)',
                          width: '9px', height: '9px',
                          borderRadius: '50%',
                          background: item.color,
                          boxShadow: `0 0 6px ${item.color}99`,
                          border: '1.5px solid rgba(255,255,255,0.15)',
                        }} />
                      </div>

                      {/* Brecha % */}
                      <div style={{ width: '64px', textAlign: 'right', flexShrink: 0 }}>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: '12px', fontWeight: 700, color: brechaColor }}>
                          {brechaStr}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          <div style={{ padding: '8px 20px', borderTop: '1px solid var(--line)', background: 'var(--bg2)' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '8px', color: 'var(--text3)' }}>
              Fuente: DolarApi.com · BCRA · % = brecha respecto al tipo de cambio oficial
            </span>
          </div>
        </div>
        <div className="source">Fuente: DolarApi.com · BCRA · ArgentinaDatos.com</div>
      </div>

      {/* ── 2. UVA ──────────────────────────────────────────────── */}
      <div className="section">
        <div className="section-title">UVA — Unidad de Valor Adquisitivo · BCRA</div>
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '20px', alignItems: 'start' }}>
          {/* KPI Card */}
          <div className="stat c-flat">
            <div className="stat-label">Valor UVA <span className="stat-badge fl">{bcra?.byKey?.uva?.fecha?.slice(0,10) ?? 'HOY'}</span></div>
            <div className="stat-val">
              {bcra?.byKey?.uva?.valor != null
                ? '$ ' + parseFloat(bcra.byKey.uva.valor).toLocaleString('es-AR', {minimumFractionDigits:2,maximumFractionDigits:2})
                : uvaValor}
            </div>
            <div className={`stat-delta ${uvaDelta != null ? (uvaDelta >= 0 ? 'up' : 'dn') : 'fl'}`}>
              {bcra?.byKey?.uva?.valor != null && bcra?.byKey?.uva?.valorAnterior != null
                ? (() => { const d = parseFloat(bcra.byKey.uva.valor) - parseFloat(bcra.byKey.uva.valorAnterior); return (d>=0?'+$∞':'−$∞').replace('∞', Math.abs(d).toFixed(2).replace('.',',')) + ' vs ayer'; })()
                : uvaDeltaDisp}
            </div>
            <div className="stat-meta">Fuente: BCRA oficial · base 1.000 = mar 2016</div>
            {uvaVar30 != null && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--line)' }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '8px', color: 'var(--text3)', marginBottom: '6px', letterSpacing: '.08em', textTransform: 'uppercase' }}>
                  Variación 30 días
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '22px', fontWeight: 700, color: uvaVar30 >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {uvaVar30 >= 0 ? '+' : ''}{uvaVar30.toFixed(2).replace('.', ',')}%
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text3)', marginTop: '4px' }}>
                  acumulado últimas 4 semanas
                </div>
              </div>
            )}
          </div>

          {/* Gráfico evolución */}
          <div style={{ background: 'var(--bg1)', border: '1px solid var(--line)', borderRadius: '10px', padding: '16px 18px' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: '14px' }}>
              Evolución UVA — últimos 30 días
            </div>
            {uvaChartSeries
              ? <CanvasChart
                  series={uvaChartSeries}
                  labels={uvaChartLabels}
                  height="160px"
                  decimalPlaces={2}
                />
              : <div style={{ height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: '11px' }}>Cargando…</div>
            }
            <div style={{ fontFamily: 'var(--mono)', fontSize: '8px', color: 'var(--text3)', marginTop: '4px', textAlign: 'right' }}>
              Fuente: BCRA · ArgentinaDatos.com · Frecuencia: diaria
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. TASAS ────────────────────────────────────────────── */}
      <div className="section">
        <div className="section-title">Tasas de referencia · BCRA oficial</div>
        {bcra?.byCat?.['Tasas'] && (
          <div className="grid grid-3" style={{marginBottom: '20px'}}>
            {bcra.byCat['Tasas'].map(item => {
              const v = item.valor != null ? parseFloat(item.valor) : null;
              const vAnt = item.valorAnterior != null ? parseFloat(item.valorAnterior) : null;
              const d = v != null && vAnt != null ? v - vAnt : null;
              const [y, m, dd] = (item.fecha || '').split('-');
              return (
                <div key={item.key} className="stat c-flat">
                  <div className="stat-label">{item.nombre} <span className="stat-badge fl">{item.unidad}</span></div>
                  <div className="stat-val">{v != null ? v.toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2})+'%' : '—'}</div>
                  {d != null && Math.abs(d) > 0.001
                    ? <div className={`stat-delta ${d > 0 ? 'up' : 'dn'}`}>{(d>0?'+':'')+d.toFixed(2).replace('.',',')+' pp vs ant.'}</div>
                    : <div className="stat-delta fl">sin variación</div>}
                  <div className="stat-meta">BCRA · {dd}/{m}/{y}</div>
                </div>
              );
            })}
          </div>
        )}
        <div className="section-title" style={{marginTop: '8px'}}>Plazo Fijo por entidad · BCRA</div>
        <div style={{ background: 'var(--bg1)', border: '1px solid var(--line)', borderRadius: '10px', overflow: 'hidden', marginBottom: '14px' }}>
          {/* Header tabla */}
          <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 140px 140px', padding: '10px 18px', background: 'var(--bg2)', borderBottom: '1px solid var(--line)', alignItems: 'center' }}>
            <span></span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text3)', letterSpacing: '.08em' }}>
              ENTIDAD · {sortedPF.length > 0 ? `${sortedPF.length} bancos` : 'cargando…'} · plazo fijo 30 días
            </span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--accent)', textAlign: 'right', letterSpacing: '.06em' }}>TNA CLIENTES</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text3)', textAlign: 'right', letterSpacing: '.06em' }}>TNA NO-CLIENTES</span>
          </div>

          {sortedPF.length === 0 ? (
            <div style={{ color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: '11px', textAlign: 'center', padding: '32px' }}>
              Cargando datos de tasas…
            </div>
          ) : (
            <div style={{ maxHeight: '480px', overflowY: 'auto' }}>
              {(() => {
                // Compute tied ranks — sequential: 1,1,1,1 → 2,3,3 → 4…
                const maxTNA = toTNA(sortedPF[0]?.tnaClientes || sortedPF[0]?.tnaNoClientes) || 1;
                let rank = 1;
                let nextRank = 2;
                const ranks = sortedPF.map((e, i) => {
                  if (i === 0) { rank = 1; nextRank = 2; return 1; }
                  const prev = toTNA(sortedPF[i-1]?.tnaClientes || sortedPF[i-1]?.tnaNoClientes);
                  const curr = toTNA(e.tnaClientes || e.tnaNoClientes);
                  if (curr < prev) { rank = nextRank; }
                  nextRank = rank + 1;
                  return rank;
                });
                return sortedPF.map((e, i) => {
                  const tna = toTNA(e.tnaClientes);
                  const tnaNC = toTNA(e.tnaNoClientes);
                  const pct = Math.min(100, (tna / maxTNA) * 100);
                  const isTop = ranks[i] === 1;
                  const rankNum = ranks[i];

                  return (
                    <div key={i}
                      style={{
                        display: 'grid', gridTemplateColumns: '36px 1fr 140px 140px',
                        padding: '10px 18px',
                        borderBottom: i < sortedPF.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                        background: isTop ? 'rgba(86,201,122,0.06)' : 'transparent',
                        alignItems: 'center',
                        cursor: 'default',
                      }}
                      onMouseEnter={ev => ev.currentTarget.style.background = 'rgba(77,158,240,0.06)'}
                      onMouseLeave={ev => ev.currentTarget.style.background = isTop ? 'rgba(86,201,122,0.06)' : 'transparent'}
                    >
                      {/* Ranking number */}
                      <div style={{ textAlign: 'center' }}>
                        <span style={{
                          fontFamily: 'var(--mono)', fontSize: '11px',
                          fontWeight: isTop ? 700 : 400,
                          color: isTop ? 'var(--green)' : 'var(--text3)',
                        }}>{rankNum}</span>
                      </div>
                      {/* Entidad + barra */}
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: isTop ? 700 : 500, color: isTop ? 'var(--white)' : 'var(--text2)', marginBottom: '5px' }}>
                          {e.entidad || '—'}
                          {isTop && <span style={{ marginLeft: '7px', fontSize: '9px', background: 'rgba(86,201,122,.2)', color: 'var(--green)', padding: '1px 6px', borderRadius: '3px', fontWeight: 400 }}>MEJOR</span>}
                        </div>
                        <div style={{ height: '3px', width: '100%', maxWidth: '200px', background: 'var(--bg3)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: isTop ? 'var(--green)' : 'rgba(77,158,240,0.55)', borderRadius: '2px' }} />
                        </div>
                      </div>
                      {/* TNA Clientes */}
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: '15px', fontWeight: 700, color: isTop ? 'var(--green)' : 'var(--white)' }}>
                          {tna > 0 ? fTNA(tna) : '—'}
                        </span>
                      </div>
                      {/* TNA No-clientes */}
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: '13px', color: tnaNC > 0 && tnaNC !== tna ? 'var(--text2)' : 'var(--text3)' }}>
                          {tnaNC > 0 && tnaNC !== tna ? fTNA(tnaNC) : '—'}
                        </span>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}

          <div style={{ padding: '9px 18px', borderTop: '1px solid var(--line)', background: 'var(--bg2)', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '8px', color: 'var(--text3)' }}>TNA = Tasa Nominal Anual · Plazo fijo 30 días</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '8px', color: 'var(--text3)' }}>Fuente: BCRA · ArgentinaDatos.com · Frecuencia: diaria</span>
          </div>
        </div>
      </div>
    <BcraCambiarioSection bcra={bcra} loadBcra={loadBcra} />
    </div>
  );
}

// ── Sección BCRA Cambiario e Índices ─────────────────────────
function BcraCambiarioSection({ bcra, loadBcra }) {
  useEffect(() => { if (!bcra) loadBcra?.(); }, [bcra, loadBcra]);

  const cambiario = bcra?.byCat?.['Cambiario'] ?? [];
  const indices   = bcra?.byCat?.['Índices']   ?? [];
  const ts        = bcra?.timestamp ? new Date(bcra.timestamp) : null;
  const tsStr     = ts ? ts.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + ' hs' : null;

  const fmtValor = (item) => {
    if (item.valor == null) return '—';
    const v = parseFloat(item.valor);
    if (item.unidad === '$/USD') return '$\u00a0' + v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (item.unidad === 'MM USD') return 'USD\u00a0' + v.toLocaleString('es-AR') + ' MM';
    if (item.formato === 'pct') return v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
    return v.toLocaleString('es-AR', { maximumFractionDigits: 4 });
  };

  const fmtDelta = (item) => {
    if (item.valor == null || item.valorAnterior == null) return null;
    const d = parseFloat(item.valor) - parseFloat(item.valorAnterior);
    if (d === 0) return null;
    const sign = d > 0 ? '+' : '';
    return { txt: sign + d.toLocaleString('es-AR', { maximumFractionDigits: 2 }), up: d > 0 };
  };

  const fmtFecha = (f) => {
    if (!f) return '';
    const [y, m, d] = (f || '').split('-');
    return `${d}/${m}/${y}`;
  };

  if (!bcra) {
    return (
      <div className="section">
        <div className="section-title">Indicadores BCRA — Cambiario e Índices</div>
        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: '11px' }}>
          Cargando datos del BCRA…
        </div>
      </div>
    );
  }

  return (
    <div className="section">
      <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Indicadores BCRA — Cambiario e Índices</span>
        {tsStr && <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text3)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>actualizado {tsStr}</span>}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text3)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Cambiario</div>
        <div className="grid grid-3">
          {cambiario.map(item => {
            const delta = fmtDelta(item);
            return (
              <div key={item.key} className="stat c-flat">
                <div className="stat-label">{item.nombre} <span className="stat-badge fl">{item.unidad}</span></div>
                <div className="stat-val">{fmtValor(item)}</div>
                {delta
                  ? <div className={`stat-delta ${delta.up ? 'up' : 'dn'}`}>{delta.txt} vs ant.</div>
                  : <div className="stat-delta fl">sin variación</div>}
                <div className="stat-meta">BCRA · {fmtFecha(item.fecha)}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text3)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Índices de actualización</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {indices.map(item => {
            const delta = fmtDelta(item);
            return (
              <div key={item.key} className="stat c-flat">
                <div className="stat-label">{item.nombre} <span className="stat-badge fl">{item.unidad}</span></div>
                <div className="stat-val">{fmtValor(item)}</div>
                {delta
                  ? <div className={`stat-delta ${delta.up ? 'up' : 'dn'}`}>{delta.txt}</div>
                  : <div className="stat-delta fl">—</div>}
                <div className="stat-meta">BCRA · {fmtFecha(item.fecha)}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="source">Fuente: BCRA · api.bcra.gob.ar/estadisticas/v4.0 · Frecuencia: diaria</div>
    </div>
  );
}
