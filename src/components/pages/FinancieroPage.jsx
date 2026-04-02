// FinancieroPage.jsx
import React, { useRef, useEffect, useState, useCallback } from 'react';

// ── UVA Mini Line Chart ──────────────────────────────────────
function UvaLineChart({ history }) {
  const canvasRef = useRef(null);
  const [tooltip, setTooltip] = useState('');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !history || history.length < 2) return;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      const W = rect.width, H = rect.height;
      const pad = { t: 20, r: 16, b: 28, l: 72 };

      const vals = history.map(d => parseFloat(d.valor ?? 0));
      const vmin = Math.min(...vals) * 0.9995;
      const vmax = Math.max(...vals) * 1.0005;
      const n = history.length;
      const xS = (W - pad.l - pad.r) / (n - 1 || 1);
      const yS = (H - pad.t - pad.b) / (vmax - vmin || 1);
      const px = i => pad.l + i * xS;
      const py = v => H - pad.b - (v - vmin) * yS;

      // Grid lines
      for (let i = 0; i <= 3; i++) {
        const v = vmin + (vmax - vmin) * i / 3;
        const y = py(v);
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 5]);
        ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(154,176,196,0.7)';
        ctx.font = '9px JetBrains Mono,monospace';
        ctx.textAlign = 'right';
        ctx.fillText('$' + v.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }), pad.l - 6, y + 3);
      }

      // X labels
      ctx.fillStyle = 'rgba(154,176,196,0.65)';
      ctx.font = '8px JetBrains Mono,monospace';
      ctx.textAlign = 'center';
      history.forEach((d, i) => {
        if (i === 0 || i === n - 1 || i % 7 === 0) {
          const fp = (d.fecha || '').split('-');
          const lbl = fp[2] + '/' + fp[1];
          ctx.fillText(lbl, px(i), H - pad.b + 12);
        }
      });

      // Fill gradient
      const grad = ctx.createLinearGradient(0, pad.t, 0, H - pad.b);
      grad.addColorStop(0, 'rgba(77,158,240,0.30)');
      grad.addColorStop(0.7, 'rgba(77,158,240,0.08)');
      grad.addColorStop(1, 'rgba(77,158,240,0.01)');
      ctx.beginPath();
      ctx.moveTo(px(0), py(vals[0]));
      vals.forEach((v, i) => { if (i > 0) ctx.lineTo(px(i), py(v)); });
      ctx.lineTo(px(n - 1), H - pad.b);
      ctx.lineTo(px(0), H - pad.b);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // Line
      ctx.beginPath();
      ctx.moveTo(px(0), py(vals[0]));
      vals.forEach((v, i) => { if (i > 0) ctx.lineTo(px(i), py(v)); });
      ctx.strokeStyle = '#4d9ef0';
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();

      // Last dot
      const lv = vals[n - 1];
      ctx.shadowColor = '#4d9ef0';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(px(n - 1), py(lv), 4, 0, Math.PI * 2);
      ctx.fillStyle = '#4d9ef0';
      ctx.fill();
      ctx.shadowBlur = 0;
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [history]);

  const handleMouseMove = (e) => {
    if (!history || history.length < 2) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const pad = { l: 72, r: 16 };
    const xS = (rect.width - pad.l - pad.r) / (history.length - 1);
    const idx = Math.max(0, Math.min(history.length - 1, Math.round((mx - pad.l) / xS)));
    const d = history[idx];
    if (d) {
      const v = parseFloat(d.valor ?? 0);
      setTooltip(`${d.fecha}  ·  $${v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    }
  };

  return (
    <div>
      <canvas ref={canvasRef}
        style={{ width: '100%', height: '160px', display: 'block', cursor: 'crosshair' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip('')} />
      <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text2)', minHeight: '14px', marginTop: '6px', textAlign: 'center' }}>{tooltip}</div>
    </div>
  );
}

export function FinancieroPage({ goPage, dolares, uva, tasas, bcra, loadBcra }) {
  const f$ = v => v ? '$' + Math.round(v).toLocaleString('es-AR') : '…';
  const fP = v => v != null ? (v > 0 ? '+' : '') + v.toFixed(1).replace('.', ',') + '%' : '—';
  const fTNA = v => v != null ? v.toFixed(2).replace('.', ',') + '%' : '—';

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
      <div className="ph">
        <div>
          <div className="ph-title">Financiero <span className="help-pip" onClick={() => goPage('ayuda')} title="Ayuda">?</span></div>
          <div className="ph-sub">Dólares · UVA · Tasas · DolarApi · BCRA · ArgentinaDatos</div>
        </div>
        <div className="ph-right" style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text3)' }}>
          Actualización <span style={{ color: 'var(--text2)' }}>diaria</span>
        </div>
      </div>

      {/* DÓLARES */}
      <div className="section">
        <div className="section-title">Tipos de cambio · ARS/USD · BCRA / API Dolar</div>
        <div className="grid grid-3" style={{ marginBottom: '20px' }}>
          <div className="stat c-flat"><div className="stat-label">Oficial BCRA <span className="stat-badge fl">—</span></div><div className="stat-val lg">{pOf}</div><div className="stat-delta up"> +$3 hoy</div><div className="stat-meta">Tipo vendedor minorista · crawling peg ~1%/mes</div></div>
          <div className="stat c-flat"><div className="stat-label">MEP / Bolsa <span className="stat-badge fl">—</span></div><div className="stat-val lg">{pMep}</div><div className="stat-delta up"> +$8 hoy</div><div className="stat-meta">AL30D · Mercado secundario libre · legal</div></div>
          <div className="stat c-flat"><div className="stat-label">CCL <span className="stat-badge fl">—</span></div><div className="stat-val lg">{pCcl}</div><div className="stat-delta up"> +$9 hoy</div><div className="stat-meta">Contado con liquidación · GD30 · exterior</div></div>
          <div className="stat c-flat"><div className="stat-label">Blue <span className="stat-badge dn"> −0,4%</span></div><div className="stat-val lg">{pBlu}</div><div className="stat-delta dn"> −$5 hoy</div><div className="stat-meta">Mercado paralelo · informal · referencia</div></div>
          <div className="stat c-flat"><div className="stat-label">Cripto (USDT) <span className="stat-badge fl">—</span></div><div className="stat-val lg">{pCry}</div><div className="stat-delta fl">…</div><div className="stat-meta">dolarapi.com · referencia</div></div>
          <div className="stat c-flat"><div className="stat-label">Dólar Mayorista <span className="stat-badge fl">BCRA</span></div><div className="stat-val lg">{pMay}</div><div className="stat-delta fl">Tipo comprador · BCRA</div><div className="stat-meta">Referencia exportaciones · crawling peg</div></div>
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
            // For scale: use max price among all
            const allVals = [base, ...items.map(x => x.val || base)];
            const scaleMin = base * 0.97;
            const scaleMax = Math.max(...allVals) * 1.02;
            const toX = v => Math.max(0, Math.min(100, ((v - scaleMin) / (scaleMax - scaleMin)) * 100));
            const baseX = toX(base);

            return (
              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '0' }}>
                {/* Scale header */}
                <div style={{ position: 'relative', height: '28px', marginBottom: '4px', paddingLeft: '140px' }}>
                  {/* Base marker label */}
                  <div style={{
                    position: 'absolute', left: `calc(140px + ${baseX}%)`,
                    transform: 'translateX(-50%)',
                    fontFamily: 'var(--mono)', fontSize: '8px', color: 'var(--accent)',
                    whiteSpace: 'nowrap',
                  }}>
                    Oficial ${Math.round(base).toLocaleString('es-AR')}
                  </div>
                </div>

                {/* Track with base line */}
                <div style={{ position: 'relative', paddingLeft: '140px', marginBottom: '20px' }}>
                  <div style={{ height: '2px', background: 'rgba(255,255,255,0.07)', borderRadius: '1px', position: 'relative' }}>
                    {/* Base vertical marker */}
                    <div style={{
                      position: 'absolute', left: `${baseX}%`,
                      top: '-6px', bottom: '-6px',
                      width: '1px', background: 'rgba(77,158,240,0.5)',
                    }} />
                  </div>
                </div>

                {/* Each currency row */}
                {items.map((item, i) => {
                  const price = item.val || base;
                  const posX = toX(price);
                  const brecha = item.brecha;
                  const brechaStr = brecha != null ? (brecha > 0 ? '+' : '') + brecha.toFixed(1).replace('.', ',') + '%' : '—';
                  const isNeg = brecha != null && brecha < 0;

                  return (
                    <div key={item.n} style={{
                      display: 'flex', alignItems: 'center', gap: '0',
                      marginBottom: i < items.length - 1 ? '16px' : '0',
                    }}>
                      {/* Label */}
                      <div style={{ width: '140px', flexShrink: 0 }}>
                        <div style={{ fontSize: '13px', color: 'var(--text2)', fontWeight: 500 }}>{item.n}</div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: '16px', fontWeight: 700, color: 'var(--white)', marginTop: '2px' }}>
                          ${Math.round(price).toLocaleString('es-AR')}
                        </div>
                      </div>

                      {/* Bar track */}
                      <div style={{ flex: 1, position: 'relative', height: '32px' }}>
                        {/* Track */}
                        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '2px', background: 'rgba(255,255,255,0.06)', transform: 'translateY(-50%)' }}>
                          {/* Base reference line */}
                          <div style={{
                            position: 'absolute', left: `${baseX}%`,
                            top: '-8px', bottom: '-8px',
                            width: '1px', background: 'rgba(77,158,240,0.3)',
                          }} />
                          {/* Segment from base to price */}
                          {price > base && (
                            <div style={{
                              position: 'absolute',
                              left: `${baseX}%`,
                              width: `${posX - baseX}%`,
                              top: 0, height: '100%',
                              background: item.color,
                              opacity: 0.6,
                            }} />
                          )}
                        </div>
                        {/* Dot at price position */}
                        <div style={{
                          position: 'absolute',
                          left: `${posX}%`,
                          top: '50%',
                          transform: 'translate(-50%, -50%)',
                          width: '10px', height: '10px',
                          borderRadius: '50%',
                          background: item.color,
                          boxShadow: `0 0 8px ${item.color}88`,
                        }} />
                      </div>

                      {/* Brecha badge */}
                      <div style={{ width: '72px', textAlign: 'right', flexShrink: 0 }}>
                        <span style={{
                          fontFamily: 'var(--mono)', fontSize: '13px', fontWeight: 700,
                          color: isNeg ? 'var(--green)' : item.color,
                        }}>
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

      {/* UVA */}
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
            {uvaHistory.length >= 2
              ? <UvaLineChart history={uvaHistory} />
              : <div style={{ height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: '11px' }}>Cargando…</div>
            }
            <div style={{ fontFamily: 'var(--mono)', fontSize: '8px', color: 'var(--text3)', marginTop: '4px', textAlign: 'right' }}>
              Fuente: BCRA · ArgentinaDatos.com · Frecuencia: diaria
            </div>
          </div>
        </div>
      </div>

      {/* TASAS */}
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
        <span>Indicadores BCRA — Cambiario, Índices e Inflación</span>
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

      {/* Inflación esperada — útil en contexto financiero */}
      {bcra?.byCat?.['Inflación'] && (
        <div style={{ marginTop: '20px' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text3)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Inflación — BCRA</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {bcra.byCat['Inflación'].map(item => {
              const v = item.valor != null ? parseFloat(item.valor) : null;
              const vAnt = item.valorAnterior != null ? parseFloat(item.valorAnterior) : null;
              const d = v != null && vAnt != null ? v - vAnt : null;
              const [y, m, dd] = (item.fecha || '').split('-');
              const color = v != null ? (v > 5 ? 'var(--red)' : v > 2 ? 'var(--gold)' : 'var(--green)') : 'var(--white)';
              return (
                <div key={item.key} className="stat c-flat">
                  <div className="stat-label">{item.nombre} <span className="stat-badge fl">{item.unidad}</span></div>
                  <div className="stat-val" style={{ color }}>{v != null ? v.toLocaleString('es-AR',{minimumFractionDigits:1,maximumFractionDigits:1})+'%' : '—'}</div>
                  {d != null && Math.abs(d) > 0.001
                    ? <div className={`stat-delta ${d > 0 ? 'dn' : 'up'}`}>{(d>0?'+':'')+d.toFixed(2).replace('.',',')+' pp vs ant.'}</div>
                    : <div className="stat-delta fl">sin variación</div>}
                  <div className="stat-meta">BCRA · {dd}/{m}/{y}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="source">Fuente: BCRA · api.bcra.gob.ar/estadisticas/v4.0 · Frecuencia: diaria</div>
    </div>
  );
}
