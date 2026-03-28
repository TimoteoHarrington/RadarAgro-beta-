// MacroPage.jsx — matches reference HTML exactly
import React, { useRef, useEffect, useState } from 'react';

const MESES_C = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const MESES_F = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// ── IPC Bar Chart ────────────────────────────────────────────
function IpcBarChart({ data }) {
  const canvasRef = useRef(null);
  const [tooltip, setTooltip] = useState('');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data || !data.length) return;
    const slice = data.slice(-18);

    const draw = () => {
      const dpr  = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width  = rect.width  * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      const W = rect.width, H = rect.height;
      const pad = { t: 24, r: 8, b: 36, l: 8 };

      const vals = slice.map(d => parseFloat(d.valor || 0));
      const maxV = Math.max(...vals) * 1.1 || 1;
      const minV = 0;
      const range = maxV - minV;
      const n = slice.length;
      const totalW = W - pad.l - pad.r;
      const barW = Math.floor(totalW / n * 0.72);
      const gap  = totalW / n;

      // Grid lines
      [1, 2, 3, 4, 5, 6].forEach(gv => {
        if (gv > maxV) return;
        const y = H - pad.b - (gv - minV) / range * (H - pad.t - pad.b);
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
        ctx.fillStyle = 'rgba(154,176,196,0.45)';
        ctx.font = '8px JetBrains Mono, monospace';
        ctx.textAlign = 'left';
        ctx.fillText(gv + '%', pad.l + 2, y - 3);
      });

      // Barras
      slice.forEach((d, i) => {
        const v   = parseFloat(d.valor || 0);
        const fp  = (d.fecha || '').split('-');
        const lbl = fp[1] ? MESES_C[+fp[1]] + (i === 0 || fp[1] === '01' ? ' \'' + fp[0].slice(-2) : '') : '';
        const isL = i === n - 1;
        const x   = pad.l + i * gap + (gap - barW) / 2;
        const barH = Math.max(3, (v - minV) / range * (H - pad.t - pad.b));
        const y   = H - pad.b - barH;
        const intensity = Math.min(1, Math.max(0.35, (v - Math.min(...vals)) / ((Math.max(...vals) - Math.min(...vals)) || 1)));
        const grad = ctx.createLinearGradient(0, y, 0, H - pad.b);
        grad.addColorStop(0, isL ? '#6db4ff' : `rgba(110,180,255,${intensity * 0.85})`);
        grad.addColorStop(1, isL ? 'rgba(77,158,240,0.2)' : `rgba(77,158,240,${intensity * 0.25})`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, barW, barH, [2, 2, 0, 0]); else ctx.rect(x, y, barW, barH);
        ctx.fill();
        if (isL) {
          ctx.shadowColor = '#4d9ef0'; ctx.shadowBlur = 8; ctx.fill(); ctx.shadowBlur = 0;
          ctx.fillStyle = '#4d9ef0'; ctx.font = 'bold 9px JetBrains Mono, monospace';
          ctx.textAlign = 'center';
          ctx.fillText(v.toFixed(1).replace('.', ',') + '%', x + barW / 2, y - 6);
        }
        ctx.fillStyle = isL ? '#4d9ef0' : 'rgba(154,176,196,0.6)';
        ctx.font = '7px JetBrains Mono, monospace'; ctx.textAlign = 'center';
        ctx.save(); ctx.translate(x + barW / 2, H - pad.b + 8); ctx.rotate(-Math.PI / 4);
        ctx.fillText(lbl, 0, 0); ctx.restore();
      });
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [data]);

  const handleMouseMove = (e) => {
    if (!data || !data.length) return;
    const slice = data.slice(-18);
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const W = rect.width;
    const pad = { l: 8, r: 8 };
    const gap = (W - pad.l - pad.r) / slice.length;
    const idx = Math.floor((mx - pad.l) / gap);
    const d = slice[idx];
    if (d) {
      const fp = (d.fecha || '').split('-');
      setTooltip(MESES_F[+fp[1]] + ' ' + fp[0] + ': ' + parseFloat(d.valor || 0).toFixed(1).replace('.', ',') + '%');
    }
  };

  return (
    <div>
      <canvas ref={canvasRef} style={{width:'100%',height:'160px',display:'block',cursor:'crosshair'}}
        onMouseMove={handleMouseMove} onMouseLeave={() => setTooltip('')} />
      <div style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text2)',minHeight:'14px',marginTop:'8px',textAlign:'center',transition:'color .1s'}}>{tooltip}</div>
    </div>
  );
}

// ── IPC Line Chart (interanual) ───────────────────────────────
function IpcLineChart({ iaData, mensData }) {
  const canvasRef = useRef(null);
  const [tooltip, setTooltip] = useState('');

  const getSeries = () => {
    if (iaData && iaData.length) return iaData.slice(-24).map(d => ({ f: d.fecha, v: parseFloat(d.valor || 0) }));
    if (mensData && mensData.length >= 12) {
      const s = [];
      for (let i = 11; i < mensData.length; i++) {
        const chunk = mensData.slice(i - 11, i + 1);
        const v = (chunk.reduce((acc, x) => acc * (1 + parseFloat(x.valor || 0) / 100), 1) - 1) * 100;
        s.push({ f: mensData[i].fecha, v });
      }
      return s.slice(-24);
    }
    return [];
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const series = getSeries();
    if (!series.length) return;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
      const W = rect.width, H = rect.height;
      const pad = { t: 12, r: 16, b: 28, l: 42 };
      const vals = series.map(p => p.v);
      const vmin = Math.min(...vals) * 0.95, vmax = Math.max(...vals) * 1.05;
      const xS = (W - pad.l - pad.r) / (series.length - 1 || 1);
      const yS = (H - pad.t - pad.b) / (vmax - vmin || 1);
      const px = i => pad.l + i * xS;
      const py = v => H - pad.b - (v - vmin) * yS;

      // Grid
      for (let i = 0; i <= 4; i++) {
        const v = vmin + (vmax - vmin) * i / 4;
        const y = py(v);
        ctx.strokeStyle = i === 0 ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 1; ctx.setLineDash(i === 0 ? [] : [3, 4]);
        ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(154,176,196,0.75)'; ctx.font = '8px JetBrains Mono,monospace';
        ctx.textAlign = 'right'; ctx.fillText(v.toFixed(0) + '%', pad.l - 4, y + 3);
      }
      // X labels
      ctx.fillStyle = 'rgba(154,176,196,0.8)'; ctx.font = '8px JetBrains Mono,monospace'; ctx.textAlign = 'center';
      series.forEach((p, i) => { if (i % 4 === 0 || i === series.length - 1) { const fp = p.f.split('-'); ctx.fillText(MESES_C[+fp[1]] + (fp[1] === '01' ? ' \'' + fp[0].slice(-2) : ''), px(i), H - pad.b + 12); } });
      // Fill
      const grad = ctx.createLinearGradient(0, pad.t, 0, H - pad.b);
      grad.addColorStop(0, 'rgba(77,158,240,0.35)'); grad.addColorStop(0.6, 'rgba(77,158,240,0.12)'); grad.addColorStop(1, 'rgba(77,158,240,0.02)');
      ctx.beginPath(); ctx.moveTo(px(0), py(series[0].v));
      series.forEach((p, i) => ctx.lineTo(px(i), py(p.v)));
      ctx.lineTo(px(series.length - 1), H - pad.b); ctx.lineTo(px(0), H - pad.b); ctx.closePath();
      ctx.fillStyle = grad; ctx.fill();
      // Line
      ctx.beginPath(); ctx.moveTo(px(0), py(series[0].v));
      series.forEach((p, i) => { if (i > 0) ctx.lineTo(px(i), py(p.v)); });
      ctx.strokeStyle = '#4d9ef0'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
      // Last dot
      const lv = series[series.length - 1].v;
      ctx.beginPath(); ctx.arc(px(series.length - 1), py(lv), 4, 0, Math.PI * 2);
      ctx.fillStyle = '#4d9ef0'; ctx.fill();
      ctx.beginPath(); ctx.arc(px(series.length - 1), py(lv), 7, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(77,158,240,0.3)'; ctx.lineWidth = 2; ctx.stroke();
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [iaData, mensData]);

  const handleMouseMove = (e) => {
    const series = getSeries();
    if (!series.length) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const pad = { l: 42, r: 16 };
    const xS = (rect.width - pad.l - pad.r) / (series.length - 1 || 1);
    const idx = Math.round((mx - pad.l) / xS);
    const p = series[Math.max(0, Math.min(series.length - 1, idx))];
    if (p) { const fp = p.f.split('-'); setTooltip(MESES_F[+fp[1]] + ' ' + fp[0] + ': ' + p.v.toFixed(1).replace('.', ',') + '%'); }
  };

  return (
    <div>
      <canvas ref={canvasRef} style={{width:'100%',height:'160px',display:'block',cursor:'crosshair'}}
        onMouseMove={handleMouseMove} onMouseLeave={() => setTooltip('')} />
      <div style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text2)',minHeight:'14px',marginTop:'8px',textAlign:'center'}}>{tooltip}</div>
    </div>
  );
}

// ── IPC Heatmap ───────────────────────────────────────────────
function IpcHeatmap({ data }) {
  const [tip, setTip] = useState('');
  if (!data || !data.length) return <div style={{color:'var(--text3)',fontFamily:'var(--mono)',fontSize:'10px',textAlign:'center',padding:'20px'}}>Cargando…</div>;

  const byYear = {};
  data.forEach(d => {
    const yr = (d.fecha || '').slice(0, 4);
    const m  = +((d.fecha || '').split('-')[1] || 0);
    if (!yr || !m) return;
    if (!byYear[yr]) byYear[yr] = Array(12).fill(null);
    byYear[yr][m - 1] = parseFloat(d.valor || 0);
  });
  const years = Object.keys(byYear).sort().slice(-5);
  const allVals = data.map(d => parseFloat(d.valor || 0)).filter(v => !isNaN(v) && v > 0).sort((a, b) => a - b);
  const p10 = allVals[Math.floor(allVals.length * 0.10)] || 0;
  const p90 = allVals[Math.floor(allVals.length * 0.90)] || allVals[allVals.length - 1] || 1;

  const getColor = (v) => {
    if (v == null) return null;
    const t = Math.min(1, Math.max(0, (v - p10) / (p90 - p10)));
    let r, g, b;
    if (t < 0.33) { const s = t / 0.33; r = Math.round(30 + s * 26); g = Math.round(100 + s * 61); b = Math.round(60 + s * 29); }
    else if (t < 0.66) { const s = (t - 0.33) / 0.33; r = Math.round(56 + s * 144); g = Math.round(161 - s * 31); b = Math.round(89 - s * 69); }
    else { const s = (t - 0.66) / 0.34; r = Math.round(200 + s * 17); g = Math.round(130 - s * 66); b = Math.round(20 + s * 44); }
    return { rgb: `${r},${g},${b}`, t };
  };

  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'38px repeat(12,1fr)',gap:'4px',alignItems:'center'}}>
        <div/>
        {MESES_C.slice(1).map(m => <div key={m} style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)',textAlign:'center',paddingBottom:'4px',letterSpacing:'.04em'}}>{m}</div>)}
        {years.map(yr => (
          <React.Fragment key={yr}>
            <div style={{fontFamily:'var(--mono)',fontSize:'10px',color:'var(--text3)',textAlign:'right',paddingRight:'8px',fontWeight:600}}>{yr}</div>
            {byYear[yr].map((v, m) => {
              const c = getColor(v);
              if (!c) return <div key={m} style={{background:'var(--bg3)',borderRadius:'4px',height:'34px',opacity:0.4}}/>;
              const alpha = 0.25 + c.t * 0.65;
              const vStr = v.toFixed(1).replace('.', ',');
              const label = `${MESES_C[m + 1]} ${yr}: ${vStr}%`;
              return (
                <div key={m} title={label}
                  style={{background:`rgba(${c.rgb},${alpha})`,borderRadius:'4px',height:'34px',display:'flex',alignItems:'center',justifyContent:'center',cursor:'default',border:`1px solid rgba(${c.rgb},${Math.min(1,alpha+0.15)})`,transition:'filter .12s'}}
                  onMouseEnter={e => { e.currentTarget.style.filter='brightness(1.25)'; setTip(label); }}
                  onMouseLeave={e => { e.currentTarget.style.filter=''; setTip(''); }}>
                  <span style={{fontFamily:'var(--mono)',fontSize:'10px',fontWeight:700,color:c.t>0.55?'rgba(255,255,255,0.95)':'rgba(255,255,255,0.85)',letterSpacing:'-.01em'}}>{vStr}</span>
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
      <div style={{fontFamily:'var(--mono)',fontSize:'10px',color:'var(--text2)',minHeight:'16px',marginTop:'10px',textAlign:'center',letterSpacing:'.04em'}}>{tip}</div>
    </div>
  );
}


// ── Riesgo País Line Chart ────────────────────────────────────
function RiesgoPaisChart({ history, range }) {
  const canvasRef = useRef(null);
  const [tooltip, setTooltip] = useState('');

  const getSlice = () => {
    if (!history || !history.length) return [];
    if (range === '3M') return history.slice(-90);
    if (range === '6M') return history.slice(-180);
    if (range === '1A') return history.slice(-365);
    return history;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const series = getSlice();
    if (!series.length) return;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      const W = rect.width, H = rect.height;
      const pad = { t: 14, r: 16, b: 30, l: 56 };

      const vals = series.map(d => parseFloat(d.valor ?? 0));
      const vmin = Math.max(0, Math.min(...vals) * 0.9);
      const vmax = Math.max(...vals) * 1.08;
      const n = series.length;
      const xS = (W - pad.l - pad.r) / (n - 1 || 1);
      const yS = (H - pad.t - pad.b) / (vmax - vmin || 1);
      const px = i => pad.l + i * xS;
      const py = v => H - pad.b - (v - vmin) * yS;

      // Grid
      const gridVals = 4;
      for (let i = 0; i <= gridVals; i++) {
        const v = vmin + (vmax - vmin) * i / gridVals;
        const y = py(v);
        ctx.strokeStyle = i === 0 ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 1;
        ctx.setLineDash(i === 0 ? [] : [3, 5]);
        ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(154,176,196,0.7)';
        ctx.font = '9px JetBrains Mono,monospace';
        ctx.textAlign = 'right';
        ctx.fillText(Math.round(v).toLocaleString('es-AR'), pad.l - 5, y + 3);
      }

      // X labels
      ctx.fillStyle = 'rgba(154,176,196,0.65)';
      ctx.font = '8px JetBrains Mono,monospace';
      ctx.textAlign = 'center';
      const step = Math.max(1, Math.floor(n / 7));
      series.forEach((d, i) => {
        if (i === 0 || i === n - 1 || i % step === 0) {
          const fp = (d.fecha || '').split('-');
          if (fp.length >= 2) ctx.fillText(MESES_C[+fp[1]] + '\'' + fp[0].slice(-2), px(i), H - pad.b + 13);
        }
      });

      // Fill gradient
      const grad = ctx.createLinearGradient(0, pad.t, 0, H - pad.b);
      grad.addColorStop(0, 'rgba(240,112,112,0.25)');
      grad.addColorStop(0.6, 'rgba(240,112,112,0.08)');
      grad.addColorStop(1, 'rgba(240,112,112,0.01)');
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
      ctx.strokeStyle = '#f07070';
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();

      // Last dot
      const lv = vals[n - 1];
      ctx.shadowColor = '#f07070';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(px(n - 1), py(lv), 4, 0, Math.PI * 2);
      ctx.fillStyle = '#f07070';
      ctx.fill();
      ctx.shadowBlur = 0;
      // Last label
      ctx.fillStyle = '#f07070';
      ctx.font = 'bold 10px JetBrains Mono,monospace';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(lv).toLocaleString('es-AR') + ' pb', px(n - 1) - 8, py(lv) - 7);
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [history, range]);

  const handleMouseMove = (e) => {
    const series = getSlice();
    if (!series.length) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const pad = { l: 56, r: 16 };
    const xS = (rect.width - pad.l - pad.r) / (series.length - 1 || 1);
    const idx = Math.max(0, Math.min(series.length - 1, Math.round((mx - pad.l) / xS)));
    const d = series[idx];
    if (d) {
      const v = parseFloat(d.valor ?? 0);
      setTooltip(`${d.fecha}  ·  ${Math.round(v).toLocaleString('es-AR')} pb`);
    }
  };

  if (!history || !history.length) {
    return <div style={{height:'200px',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text3)',fontFamily:'var(--mono)',fontSize:'11px'}}>Cargando datos de riesgo país…</div>;
  }

  return (
    <div>
      <canvas ref={canvasRef}
        style={{width:'100%',height:'200px',display:'block',cursor:'crosshair'}}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip('')} />
      <div style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text2)',minHeight:'14px',marginTop:'6px',textAlign:'center'}}>{tooltip}</div>
    </div>
  );
}

export function MacroPage({ goPage, inflacion, riesgoPais, emae }) {
  const [rpRange, setRpRange] = React.useState('1A');
  const rpVal      = riesgoPais?.valor ?? null;
  const rpDelta    = riesgoPais?.delta ?? null;
  const rpDisp     = rpVal != null ? Math.round(rpVal).toLocaleString('es-AR') + ' pb' : 'cargando…';
  const rpDeltaDisp = rpDelta != null
    ? (rpDelta < 0 ? ' −' : ' +') + Math.abs(Math.round(rpDelta)) + ' pb vs ayer'
    : '—';
  const rpDeltaCls  = rpDelta != null ? (rpDelta < 0 ? 'up' : 'dn') : 'fl';
  const rpVsBrasil  = rpVal != null ? (rpVal / 180).toFixed(1) + '×' : '—';

  // IPC KPIs — ArgensStats primario, ArgentinaDatos fallback
  const mensData   = inflacion?.history ?? [];
  const iaData     = inflacion?.iaHistory ?? [];
  // Si ArgensStats devolvio datos directos los usamos, sino derivamos del historial
  const ipcMensual = inflacion?.mensual ?? (mensData.length ? parseFloat(mensData[mensData.length - 1]?.valor || 0) : null);
  const ipcIA      = inflacion?.valor   ?? null;
  const ipcAcum    = inflacion?.acumulado ?? null;
  const ipcFecha   = inflacion?.fecha   ?? mensData[mensData.length - 1]?.fecha ?? '';
  const ipcFp      = ipcFecha.split('-');
  const ipcMes     = ipcFp[1] ? MESES_C[+ipcFp[1]] + ' ' + ipcFp[0] : '—';
  // Para comparacion mensual necesitamos el anterior (solo disponible via historial)
  const lastIPC    = mensData[mensData.length - 1];
  const prevIPC    = mensData[mensData.length - 2];
  const ipcVal     = ipcMensual;
  const ipcPrev    = prevIPC ? parseFloat(prevIPC.valor || 0) : null;
  const ipcDiff    = ipcVal != null && ipcPrev != null ? ipcVal - ipcPrev : null;
  const prom3      = mensData.length >= 3 ? (mensData.slice(-3).reduce((a,d)=>a+parseFloat(d.valor||0),0)/3) : null;
  const acumAnio   = ipcAcum ?? (() => {
    const yr = new Date().getFullYear().toString();
    const thisYear = mensData.filter(d=>(d.fecha||'').startsWith(yr));
    if(!thisYear.length) return null;
    return (thisYear.reduce((acc,d)=>acc*(1+parseFloat(d.valor||0)/100),1)-1)*100;
  })();
  const ipcFuente  = inflacion?.fuente === 'argenstats' ? 'ArgensStats' : 'ArgentinaDatos.com';

  // EMAE KPIs — ArgensStats
  const emaeAnual  = emae?.anual   ?? null;
  const emaeAcum   = emae?.acumulado ?? null;
  const emaeMes    = emae?.mensual  ?? null;
  const emaeFecha  = emae?.fecha    ?? '';
  const emaeComp   = emae?.componente ?? 'Nivel general';
  const emaeFp     = emaeFecha.split('-');
  const emaeMesLbl = emaeFp[1] ? MESES_C[+emaeFp[1]] + ' ' + emaeFp[0] : '—';
  const fmtPct = v => v != null ? (v >= 0 ? '+' : '') + v.toFixed(1).replace('.', ',') + '%' : '—';
  const emaeColor  = emaeAnual != null ? (emaeAnual >= 0 ? 'var(--green)' : 'var(--red)') : 'var(--text3)';

  const fmt1 = v => v != null ? v.toFixed(1).replace('.',',')+'%' : '—';
  const fmtDiff = v => v != null ? (v>=0?'+':'')+v.toFixed(1).replace('.',',') + ' pp' : '—';

  return (
    <div className="page-enter">
      <div className="ph">
        <div>
          <div className="ph-title">Macroeconomía Argentina <span className="help-pip" onClick={()=>goPage('ayuda')} title="Ayuda">?</span></div>
          <div className="ph-sub">IPC · EMAE · Riesgo País · PBI</div>
        </div>
        <div className="ph-right" style={{fontFamily:'var(--mono)',fontSize:'11px',color:'var(--text3)'}}>
          INDEC · BCRA · JP Morgan &nbsp;·&nbsp; <span style={{color:'var(--text2)'}}>Ene–Feb 2026</span>
        </div>
      </div>

      {/* 1. RESUMEN KPI */}
      <div className="section">
        <div className="section-title">Indicadores clave · resumen</div>
        <div className="grid grid-4">
          <div className="stat c-flat"><div className="stat-label">IPC General <span className="stat-badge fl">{ipcMes}</span></div><div className="stat-val">{fmt1(ipcVal)}</div><div className={`stat-delta ${ipcDiff != null ? (ipcDiff < 0 ? 'up' : 'dn') : 'fl'}`}>{ipcDiff != null ? fmtDiff(ipcDiff) + ' vs mes anterior' : '—'}</div><div className="stat-meta">Interanual: {fmt1(ipcIA)} · Fuente: {ipcFuente}</div></div>
          <div className="stat c-flat"><div className="stat-label">EMAE General <span className="stat-badge fl">{emaeMesLbl || 'cargando'}</span></div><div className="stat-val" style={{color:emaeColor}}>{fmtPct(emaeAnual)}</div><div className={`stat-delta ${emaeAnual != null ? (emaeAnual >= 0 ? 'up' : 'dn') : 'fl'}`}>{emaeAcum != null ? `Acumulado: ${fmtPct(emaeAcum)}` : 'var. interanual'}</div><div className="stat-meta">Fuente: ArgensStats · INDEC</div></div>
          <div className="stat c-flat"><div className="stat-label">Riesgo País EMBI+ <span className="stat-badge fl">HOY</span></div><div className="stat-val">{rpDisp}</div><div className={`stat-delta ${rpDeltaCls}`}>{rpDeltaDisp}</div><div className="stat-meta">Fuente: {riesgoPais?.fuente === 'argenstats' ? 'ArgensStats' : 'JP Morgan · ArgentinaDatos'} · Brasil: 180 pb</div></div>
          <div className="stat c-flat"><div className="stat-label">PBI Real <span className="stat-badge fl">2025</span></div><div className="stat-val">+5,5%</div><div className="stat-delta up"> Recuperación tras −1,6% en 2024</div><div className="stat-meta">PBI nominal est.: USD 640B · INDEC</div></div>
        </div>
      </div>

      {/* 2. INFLACIÓN */}
      <div className="section">
        <div className="section-title">Inflación — IPC mensual · INDEC</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'12px',marginBottom:'20px'}}>
          {[
            {lbl:'IPC General', badge:ipcMes, val:fmt1(ipcVal), delta:fmtDiff(ipcDiff) + ' vs mes ant.', meta:`Fuente: ${ipcFuente}`},
            {lbl:'Interanual',  badge:'',    val:fmt1(ipcIA),  delta:'acumulado 12 meses', meta:'vs mismo mes año anterior'},
            {lbl:'Acumulado año',badge:'',   val:fmt1(acumAnio),delta:ipcFp[0]||'—',      meta:'Desde enero del año en curso'},
            {lbl:'Promedio 3 meses',badge:'',val:fmt1(prom3),  delta:'últimos 3 meses',   meta:'Media simple mensual'},
          ].map((k,i)=>(
            <div key={i} style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:'10px',padding:'16px 18px',position:'relative',overflow:'hidden'}}>
              <div style={{fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text3)',marginBottom:'8px'}}>{k.lbl}{k.badge&&<span style={{background:'var(--bg3)',border:'1px solid var(--line2)',borderRadius:'3px',padding:'1px 6px',marginLeft:'4px',fontSize:'8px'}}>{k.badge}</span>}</div>
              <div style={{fontFamily:'var(--mono)',fontSize:'28px',fontWeight:700,color:'var(--white)',lineHeight:1}}>{k.val}</div>
              <div style={{fontFamily:'var(--mono)',fontSize:'10px',marginTop:'6px',color:'var(--text3)'}}>{k.delta}</div>
              <div style={{fontSize:'11px',color:'var(--text3)',marginTop:'4px'}}>{k.meta}</div>
            </div>
          ))}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px',marginBottom:'14px'}}>
          <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:'10px',padding:'16px 18px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px'}}>
              <div>
                <div style={{fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text3)'}}>IPC mensual — últimos 18 meses</div>
                <div style={{fontSize:'10px',color:'var(--text2)',marginTop:'2px'}}>Hover sobre cada barra para ver el valor</div>
              </div>
            </div>
            {mensData.length > 0
              ? <IpcBarChart data={mensData} />
              : <div style={{height:'160px',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text3)',fontFamily:'var(--mono)',fontSize:'11px'}}>Cargando…</div>}
            <div style={{fontFamily:'var(--mono)',fontSize:'8px',color:'var(--text3)',marginTop:'6px',textAlign:'right'}}>Fuente: INDEC · {ipcFuente}</div>
          </div>
          <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:'10px',padding:'16px 18px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px'}}>
              <div>
                <div style={{fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text3)'}}>Inflación interanual — tendencia</div>
                <div style={{fontSize:'10px',color:'var(--text2)',marginTop:'2px'}}>Variación % acumulada 12 meses</div>
              </div>
            </div>
            {(mensData.length > 0 || iaData.length > 0)
              ? <IpcLineChart iaData={iaData} mensData={mensData} />
              : <div style={{height:'160px',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text3)',fontFamily:'var(--mono)',fontSize:'11px'}}>Cargando…</div>}
            <div style={{fontFamily:'var(--mono)',fontSize:'8px',color:'var(--text3)',marginTop:'6px',textAlign:'right'}}>Fuente: INDEC · {ipcFuente}</div>
          </div>
        </div>
        <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:'10px',overflow:'hidden'}}>
          <div style={{padding:'12px 18px',borderBottom:'1px solid var(--line)'}}>
            <span style={{fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text3)'}}>Historial IPC — por año y mes</span>
            <span style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)',marginLeft:'16px'}}>Bajo <span style={{display:'inline-block',width:'10px',height:'10px',background:'rgba(56,161,89,0.7)',borderRadius:'2px',verticalAlign:'middle'}}></span> → <span style={{display:'inline-block',width:'10px',height:'10px',background:'rgba(217,64,64,0.7)',borderRadius:'2px',verticalAlign:'middle'}}></span> Alto</span>
          </div>
          <div style={{padding:'16px 18px'}}>
            <IpcHeatmap data={mensData} />
          </div>
          <div style={{padding:'8px 18px',borderTop:'1px solid var(--line)'}}>
            <span style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)'}}>Fuente: INDEC · {ipcFuente} · Frecuencia: mensual</span>
          </div>
        </div>
      </div>

      {/* 3. EMAE */}
      <div className="section">
        <div className="section-title">Actividad económica — EMAE · INDEC</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:'12px',marginBottom:'16px'}}>
          <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:'10px',padding:'16px 18px'}}>
            <div style={{fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text3)',marginBottom:'8px'}}>
              EMAE General <span style={{background:'var(--bg3)',border:'1px solid var(--line2)',borderRadius:'3px',padding:'1px 6px',marginLeft:'4px',fontSize:'8px'}}>{emaeMesLbl || 'cargando'}</span>
            </div>
            <div style={{fontFamily:'var(--mono)',fontSize:'28px',fontWeight:700,color:emaeColor,lineHeight:1}}>{fmtPct(emaeAnual)}</div>
            <div style={{fontFamily:'var(--mono)',fontSize:'10px',color:emaeColor,marginTop:'6px'}}>{emaeAnual != null ? (emaeAnual >= 0 ? 'Crecimiento interanual' : 'Caida interanual') : 'cargando…'}</div>
            <div style={{fontSize:'11px',color:'var(--text3)',marginTop:'4px'}}>Variación interanual · ArgensStats</div>
          </div>
          <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:'10px',padding:'16px 18px'}}>
            <div style={{fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text3)',marginBottom:'8px'}}>Acumulado año</div>
            <div style={{fontFamily:'var(--mono)',fontSize:'28px',fontWeight:700,color:'var(--white)',lineHeight:1}}>{fmtPct(emaeAcum)}</div>
            <div style={{fontFamily:'var(--mono)',fontSize:'10px',color:'var(--text3)',marginTop:'6px'}}>{emaeMesLbl ? `Ene–${emaeMesLbl}` : '—'}</div>
            <div style={{fontSize:'11px',color:'var(--text3)',marginTop:'4px'}}>vs mismo período año anterior</div>
          </div>
          <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:'10px',padding:'16px 18px'}}><div style={{fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text3)',marginBottom:'8px'}}>Mejor sector</div><div style={{fontFamily:'var(--mono)',fontSize:'18px',fontWeight:700,color:'var(--green)',lineHeight:1.2}}>Construcción</div><div style={{fontFamily:'var(--mono)',fontSize:'14px',fontWeight:700,color:'var(--green)',marginTop:'4px'}}>+9,2%</div><div style={{fontSize:'11px',color:'var(--text3)',marginTop:'4px'}}>Interanual · Nov 2025</div></div>
          <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:'10px',padding:'16px 18px'}}><div style={{fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text3)',marginBottom:'8px'}}>En contracción</div><div style={{fontFamily:'var(--mono)',fontSize:'18px',fontWeight:700,color:'var(--red)',lineHeight:1.2}}>Adm. Pública</div><div style={{fontFamily:'var(--mono)',fontSize:'14px',fontWeight:700,color:'var(--red)',marginTop:'4px'}}>−1,8%</div><div style={{fontSize:'11px',color:'var(--text3)',marginTop:'4px'}}>Único sector negativo</div></div>
        </div>
        <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:'10px',overflow:'hidden'}}>
          <div style={{padding:'16px 24px',borderBottom:'1px solid var(--line)',display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
            <div>
              <div style={{fontSize:'15px',fontWeight:600,color:'var(--white)',marginBottom:'3px'}}>Variación interanual por sector</div>
              <div style={{fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text3)'}}>Noviembre 2025 · INDEC</div>
            </div>
          </div>
          {(()=>{
            const sectors = [
              {s:'Explotación de minas y canteras', v:9.8},
              {s:'Construcción',                    v:9.2},
              {s:'Intermediación financiera',        v:8.4},
              {s:'Industria manufacturera',          v:6.8},
              {s:'Comercio may. y minorista',        v:5.1},
              {s:'Transporte y comunicaciones',      v:4.9},
              {s:'Agro, ganadería y pesca',          v:4.7},
              {s:'Salud',                            v:3.7},
              {s:'Servicios inmobiliarios',          v:3.3},
              {s:'Electricidad, gas y agua',         v:3.2},
              {s:'Enseñanza',                        v:2.9},
              {s:'Pesca',                            v:2.1},
              {s:'Administración pública',           v:-1.8},
            ].sort((a,b)=>b.v-a.v);
            const maxPos = Math.max(...sectors.map(x=>x.v>0?x.v:0), 0.01);
            const maxNeg = Math.max(...sectors.map(x=>x.v<0?Math.abs(x.v):0), 0.01);
            // Total range for proportional zero placement
            const totalRange = maxPos + maxNeg;
            const negFr = maxNeg / totalRange;
            const posFr = maxPos / totalRange;
            return (
              <div style={{padding:'6px 24px'}}>
                {sectors.map(({s,v},i,arr)=>{
                  const neg = v < 0;
                  const color = neg ? 'var(--red)' : 'var(--green)';
                  const isTop = i===0;
                  const posPct = !neg ? (v/maxPos)*100 : 0;
                  const negPct = neg ? (Math.abs(v)/maxNeg)*100 : 0;
                  return (
                    <div key={s} style={{
                      display:'flex',
                      alignItems:'center',
                      padding:'7px 0',
                      borderBottom: i<arr.length-1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                      background: isTop ? 'rgba(86,201,122,0.04)' : neg ? 'rgba(240,112,112,0.03)' : 'transparent',
                      borderRadius:'4px',
                    }}>
                      {/* Label — fixed 220px */}
                      <div style={{
                        width:'220px', flexShrink:0,
                        fontSize:'12px',
                        color: isTop ? 'var(--white)' : neg ? 'var(--red)' : 'var(--text2)',
                        fontWeight: isTop ? 600 : 400,
                        paddingRight:'12px',
                        whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',
                      }}>{s}</div>
                      {/* Bar area — flex, fills all remaining space */}
                      <div style={{flex:1, display:'flex', alignItems:'center', minWidth:0}}>
                        {/* Negative side — proportional fraction */}
                        <div style={{flex:negFr, display:'flex', justifyContent:'flex-end', paddingRight:'3px'}}>
                          {neg && (
                            <div style={{height:'9px',width:`${negPct}%`,background:'var(--red)',borderRadius:'5px 0 0 5px',opacity:0.85}}/>
                          )}
                        </div>
                        {/* Zero line */}
                        <div style={{width:'2px',height:'26px',background:'rgba(255,255,255,0.2)',borderRadius:'1px',flexShrink:0}}/>
                        {/* Positive side — proportional fraction */}
                        <div style={{flex:posFr, paddingLeft:'3px'}}>
                          {!neg && (
                            <div style={{
                              height:'9px',width:`${posPct}%`,
                              background: isTop ? 'var(--green)' : 'rgba(86,201,122,0.65)',
                              borderRadius:'0 5px 5px 0',
                              boxShadow: isTop ? '0 0 10px rgba(86,201,122,0.4)' : 'none',
                            }}/>
                          )}
                        </div>
                      </div>
                      {/* Value — fixed 68px */}
                      <div style={{width:'68px',flexShrink:0,fontFamily:'var(--mono)',fontSize:'12px',fontWeight:700,color,textAlign:'right'}}>
                        {neg?'−':'+'}{Math.abs(v).toFixed(1).replace('.',',')}%
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
          <div style={{padding:'8px 20px',borderTop:'1px solid var(--line)',display:'flex',justifyContent:'flex-end'}}>
            <span style={{fontFamily:'var(--mono)',fontSize:'8px',color:'var(--text3)'}}>Fuente: INDEC · ArgensStats · Frecuencia: mensual</span>
          </div>
        </div>
      </div>

      {/* 4. RIESGO PAÍS */}
      <div className="section">
        <div className="section-title">Riesgo País — EMBI+ · JP Morgan</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:'12px',marginBottom:'16px'}}>
          <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:'10px',padding:'16px 18px'}}><div style={{fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text3)',marginBottom:'8px'}}>EMBI+ Argentina <span style={{background:'var(--bg3)',border:'1px solid var(--line2)',borderRadius:'3px',padding:'1px 6px',marginLeft:'4px',fontSize:'8px'}}>HOY</span></div><div style={{fontFamily:'var(--mono)',fontSize:'28px',fontWeight:700,color:'var(--white)',lineHeight:1}}>{rpDisp}</div><div style={{fontFamily:'var(--mono)',fontSize:'10px',marginTop:'6px',color:rpDeltaCls==='up'?'var(--green)':rpDeltaCls==='dn'?'var(--red)':'var(--text3)'}}>{rpDeltaDisp}</div><div style={{fontSize:'11px',color:'var(--text3)',marginTop:'4px'}}>Mínimo desde 2017 · Brasil: 180 pb</div></div>
          <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:'10px',padding:'16px 18px'}}><div style={{fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text3)',marginBottom:'8px'}}>Variación 30 días</div><div style={{fontFamily:'var(--mono)',fontSize:'28px',fontWeight:700,color:'var(--white)',lineHeight:1}}>{riesgoPais?.history?.length >= 30 ? (() => { const h = riesgoPais.history; const d30 = parseFloat(h[h.length-30]?.valor||0); const dlt = Math.round(rpVal - d30); return (dlt<0?' −':' +')+Math.abs(dlt)+' pb'; })() : '—'}</div><div style={{fontFamily:'var(--mono)',fontSize:'10px',marginTop:'6px',color:'var(--text3)'}}>vs 30 días atrás</div><div style={{fontSize:'11px',color:'var(--text3)',marginTop:'4px'}}>Puntos básicos</div></div>
          <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:'10px',padding:'16px 18px'}}><div style={{fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text3)',marginBottom:'8px'}}>Mínimo del año</div><div style={{fontFamily:'var(--mono)',fontSize:'28px',fontWeight:700,color:'var(--green)',lineHeight:1}}>{riesgoPais?.history?.length ? Math.round(Math.min(...riesgoPais.history.map(h=>parseFloat(h.valor||9999)))).toLocaleString('es-AR')+' pb' : rpDisp}</div><div style={{fontFamily:'var(--mono)',fontSize:'10px',marginTop:'6px',color:'var(--text3)'}}>este año</div><div style={{fontSize:'11px',color:'var(--text3)',marginTop:'4px'}}>pb · menor riesgo</div></div>
          <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:'10px',padding:'16px 18px'}}><div style={{fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text3)',marginBottom:'8px'}}>vs Brasil</div><div style={{fontFamily:'var(--mono)',fontSize:'28px',fontWeight:700,color:'var(--white)',lineHeight:1}}>{rpVsBrasil}</div><div style={{fontFamily:'var(--mono)',fontSize:'10px',marginTop:'6px',color:'var(--text3)'}}>veces el riesgo de Brasil</div><div style={{fontSize:'11px',color:'var(--text3)',marginTop:'4px'}}>Brasil referencia: 180 pb</div></div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 300px',gap:'14px',marginBottom:'0'}}>
          <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:'10px',padding:'16px 18px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
              <div>
                <div style={{fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text3)'}}>Riesgo País EMBI+ — historial</div>
                <div style={{fontFamily:'var(--mono)',fontSize:'10px',color:'var(--text2)',marginTop:'2px',minHeight:'14px'}}></div>
              </div>
              <div style={{display:'flex',gap:'4px'}}>
                {['3M','6M','1A','MAX'].map(r=>(
                  <button key={r} onClick={()=>setRpRange(r)} style={{fontFamily:'var(--mono)',fontSize:'8px',padding:'2px 8px',borderRadius:'3px',border:`1px solid ${r===rpRange?'var(--accent)':'var(--line2)'}`,background:r===rpRange?'var(--acc-bg)':'transparent',color:r===rpRange?'var(--accent)':'var(--text3)',cursor:'pointer'}}>{r}</button>
                ))}
              </div>
            </div>
            <RiesgoPaisChart history={riesgoPais?.history ?? []} range={rpRange} />
            <div style={{fontFamily:'var(--mono)',fontSize:'8px',color:'var(--text3)',marginTop:'8px',textAlign:'right'}}>Fuente: JP Morgan EMBI+ · {riesgoPais?.fuente === 'argenstats' ? 'ArgensStats' : 'ArgentinaDatos.com'}</div>
          </div>
          <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:'10px',overflow:'hidden',display:'flex',flexDirection:'column'}}>
            <div style={{padding:'12px 16px',borderBottom:'1px solid var(--line)'}}>
              <div style={{fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text3)'}}>Comparativa regional</div>
            </div>
            <div style={{padding:'14px 16px',borderBottom:'1px solid var(--line)',background:'rgba(77,158,240,.04)'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
                <span style={{fontSize:'12px',fontWeight:600,color:'var(--accent)'}}>Argentina</span>
                <span style={{fontFamily:'var(--mono)',fontSize:'14px',fontWeight:700,color:'var(--accent)'}}>{rpVal != null ? Math.round(rpVal) : '—'}</span>
              </div>
              <div style={{height:'5px',background:'var(--bg3)',borderRadius:'3px',overflow:'hidden'}}><div style={{height:'100%',width:'100%',background:'var(--accent)',borderRadius:'3px',transition:'width .4s'}}></div></div>
              <div style={{display:'flex',justifyContent:'space-between',marginTop:'5px'}}><span style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)'}}>{rpDeltaDisp}</span><span style={{fontFamily:'var(--mono)',fontSize:'9px',background:'rgba(240,112,112,.15)',color:'var(--red)',padding:'1px 6px',borderRadius:'3px'}}>ALTO</span></div>
            </div>
            {[['Colombia',280,'49%','rgba(240,184,64,.6)','MEDIO','rgba(240,184,64,.12)','var(--text2)'],['Brasil',180,'31%','rgba(86,201,122,.5)','MODERADO','rgba(86,201,122,.1)','var(--text3)'],['Uruguay',95,'17%','rgba(86,201,122,.7)','BAJO','rgba(86,201,122,.15)','var(--green)']].map(([country,pb,w,bg,label,lbg,lc])=>(
              <div key={country} style={{padding:'12px 16px',borderBottom:'1px solid var(--line)'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px'}}><span style={{fontSize:'12px',color:'var(--text2)'}}>{country}</span><span style={{fontFamily:'var(--mono)',fontSize:'13px',fontWeight:600,color:'var(--white)'}}>{pb}</span></div>
                <div style={{height:'4px',background:'var(--bg3)',borderRadius:'3px',overflow:'hidden'}}><div style={{height:'100%',width:w,background:bg,borderRadius:'3px'}}></div></div>
                <div style={{display:'flex',justifyContent:'flex-end',marginTop:'4px'}}><span style={{fontFamily:'var(--mono)',fontSize:'9px',background:lbg,color:lc,padding:'1px 6px',borderRadius:'3px'}}>{label}</span></div>
              </div>
            ))}
          </div>
        </div>
        <div className="source" style={{marginTop:'8px'}}>Fuente: JP Morgan EMBI+ · {riesgoPais?.fuente === 'argenstats' ? 'ArgensStats' : 'ArgentinaDatos.com'} · Frecuencia: diaria</div>
      </div>

      {/* 5. PBI */}
      <div className="section">
        <div className="section-title">Producto Bruto Interno — INDEC</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:'12px',marginBottom:'16px'}}>
          <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderTop:'2px solid var(--green)',borderRadius:'10px',padding:'16px 18px'}}><div style={{fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text3)',marginBottom:'8px'}}>Var. PBI real 2025 <span style={{background:'rgba(86,201,122,.15)',color:'var(--green)',borderRadius:'3px',padding:'1px 6px',marginLeft:'4px',fontSize:'8px'}}>INDEC</span></div><div style={{fontFamily:'var(--mono)',fontSize:'26px',fontWeight:700,color:'var(--green)',lineHeight:1}}>+5,5%</div><div style={{fontFamily:'var(--mono)',fontSize:'10px',color:'var(--green)',marginTop:'6px'}}>Recuperación tras −1,6% en 2024</div><div style={{fontSize:'11px',color:'var(--text3)',marginTop:'4px'}}>Var. interanual · precios constantes</div></div>
          <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:'10px',padding:'16px 18px'}}><div style={{fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text3)',marginBottom:'8px'}}>PBI nominal 2025 est.</div><div style={{fontFamily:'var(--mono)',fontSize:'26px',fontWeight:700,color:'var(--white)',lineHeight:1}}>USD 640B</div><div style={{fontFamily:'var(--mono)',fontSize:'10px',color:'var(--text3)',marginTop:'6px'}}>vs USD 545B en 2024</div><div style={{fontSize:'11px',color:'var(--text3)',marginTop:'4px'}}>A tipo de cambio promedio</div></div>
          <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:'10px',padding:'16px 18px'}}><div style={{fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text3)',marginBottom:'8px'}}>PBI per cápita est. 2025</div><div style={{fontFamily:'var(--mono)',fontSize:'26px',fontWeight:700,color:'var(--white)',lineHeight:1}}>USD 13.800</div><div style={{fontFamily:'var(--mono)',fontSize:'10px',color:'var(--accent)',marginTop:'6px'}}>▲ +17% vs 2024</div><div style={{fontSize:'11px',color:'var(--text3)',marginTop:'4px'}}>46,6M habitantes · estimado</div></div>
          <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:'10px',padding:'16px 18px'}}><div style={{fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text3)',marginBottom:'8px'}}>Proyección 2026 — FMI</div><div style={{fontFamily:'var(--mono)',fontSize:'26px',fontWeight:700,color:'var(--accent)',lineHeight:1}}>+5,0%</div><div style={{fontFamily:'var(--mono)',fontSize:'10px',color:'var(--text3)',marginTop:'6px'}}>WEO Oct 2025 · sujeto a revisión</div><div style={{fontSize:'11px',color:'var(--text3)',marginTop:'4px'}}>Consenso privado: +4,2%</div></div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px'}}>
          <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:'10px',overflow:'hidden'}}>
            <div style={{padding:'12px 16px',borderBottom:'1px solid var(--line)'}}><div style={{fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text3)'}}>Variación real anual · 2019–2025</div></div>
            <div style={{display:'grid',gridTemplateColumns:'60px 1fr 120px',padding:'7px 16px',borderBottom:'1px solid var(--line)',background:'var(--bg2)'}}>
              <span style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)'}}>AÑO</span>
              <span style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)'}}>CONTEXTO</span>
              <span style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)',textAlign:'right'}}>VAR. REAL</span>
            </div>
            {[['2019','Crisis cambiaria','−2,1%','var(--red)'],['2020','COVID-19','−9,9%','var(--red)'],['2021','Rebote post-pandemia','+10,4%','var(--green)'],['2022','Alta inflación','+5,0%','var(--green)'],['2023','Sequía + crisis','−1,6%','var(--red)'],['2024','Ajuste Milei','−1,6%','var(--red)'],['2025','Recuperación','+5,5%','var(--green)']].map(([yr,ctx,val,color])=>(
              <div key={yr} style={{display:'grid',gridTemplateColumns:'60px 1fr 120px',padding:'9px 16px',borderBottom:'1px solid rgba(255,255,255,.04)',alignItems:'center',background:yr==='2025'?'rgba(86,201,122,.05)':'',borderTop:yr==='2025'?'1px solid rgba(86,201,122,.15)':''}}>
                <span style={{fontFamily:'var(--mono)',fontSize:'12px',fontWeight:yr==='2025'?700:400,color:yr==='2025'?'var(--green)':'var(--text3)'}}>{yr}</span>
                <span style={{fontSize:'11px',color:'var(--text2)'}}>{ctx}</span>
                {yr==='2025'?<span style={{background:'rgba(86,201,122,.2)',color:'var(--green)',fontFamily:'var(--mono)',fontSize:'10px',fontWeight:700,padding:'2px 8px',borderRadius:'4px',textAlign:'center'}}>{val}</span>:<span style={{fontFamily:'var(--mono)',fontSize:'11px',fontWeight:600,color:color,textAlign:'right'}}>{val}</span>}
              </div>
            ))}
          </div>
          <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:'10px',overflow:'hidden'}}>
            <div style={{padding:'12px 16px',borderBottom:'1px solid var(--line)'}}><div style={{fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text3)'}}>Sectores clave · contribución al PBI 2025</div></div>
            <div style={{padding:'14px 16px',display:'flex',flexDirection:'column',gap:'12px'}}>
              {[
                ['Agropecuario','+8,2%','var(--green)',68,'~5,5% del PBI total · rebote post-sequía 2023'],
                ['Industria manufacturera','+6,8%','var(--accent)',56,'~17% del PBI · autos, alimentos, química'],
                ['Construcción','−4,1%','var(--red)',22,'~3,5% del PBI · impacto del ajuste fiscal'],
                ['Comercio y servicios','+4,3%','var(--gold)',45,'~28% del PBI · recuperación del consumo'],
                ['Minería e hidrocarburos','+12,5%','var(--green)',80,'~5% del PBI · Vaca Muerta como motor'],
              ].map(([sector,val,color,w,nota])=>(
                <div key={sector}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}><span style={{fontSize:'11px',color:'var(--text2)'}}>{sector}</span><span style={{fontFamily:'var(--mono)',fontSize:'11px',fontWeight:600,color:color}}>{val}</span></div>
                  <div style={{height:'5px',background:'var(--bg3)',borderRadius:'3px'}}><div style={{height:'100%',width:`${w}%`,background:color,borderRadius:'3px'}}></div></div>
                  <div style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)',marginTop:'3px'}}>{nota}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="source">Fuente: INDEC · Cuentas Nacionales · Frecuencia: trimestral · Valores 2025 estimados</div>
      </div>
    </div>
  );
}
