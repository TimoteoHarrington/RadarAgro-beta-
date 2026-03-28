// MacroPage.jsx — con APIs reales: EMAE, Reservas, Base Monetaria, Merval, BADLAR
import React, { useRef, useEffect, useState } from 'react';

const MESES_C = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const MESES_F = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const fmt1    = v  => v  != null ? v.toFixed(1).replace('.', ',') + '%' : '—';
const fmtDiff = v  => v  != null ? (v >= 0 ? '+' : '') + v.toFixed(1).replace('.', ',') + ' pp' : '—';
const fmtM    = v  => v  != null ? '$' + (v / 1_000_000).toFixed(1).replace('.', ',') + ' B' : '—'; // millones → billones ARS
const fmtUSD  = v  => v  != null ? 'USD ' + v.toLocaleString('es-AR') + ' M' : '—';
const fmtPts  = v  => v  != null ? v.toLocaleString('es-AR') : '—';
const fmtPct  = v  => v  != null ? (v >= 0 ? '+' : '') + v.toFixed(1).replace('.', ',') + '%' : '—';
const fmtPct2 = v  => v  != null ? v.toFixed(1).replace('.', ',') + '%' : '—';

// ─── Generic Line Chart ───────────────────────────────────────
function LineChart({ history, color = '#4d9ef0', height = 180, formatY, formatTip, padL = 56 }) {
  const canvasRef = useRef(null);
  const [tooltip, setTooltip] = useState('');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !history?.length) return;
    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
      const W = rect.width, H = rect.height;
      const pad = { t: 14, r: 16, b: 30, l: padL };
      const vals = history.map(d => parseFloat(d.valor ?? 0));
      const vmin = Math.min(...vals) * 0.95, vmax = Math.max(...vals) * 1.06;
      const n = history.length;
      const xS = (W - pad.l - pad.r) / (n - 1 || 1);
      const yS = (H - pad.t - pad.b) / (vmax - vmin || 1);
      const px = i => pad.l + i * xS;
      const py = v => H - pad.b - (v - vmin) * yS;

      // Grid
      for (let i = 0; i <= 4; i++) {
        const v = vmin + (vmax - vmin) * i / 4;
        const y = py(v);
        ctx.strokeStyle = i === 0 ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 1; ctx.setLineDash(i === 0 ? [] : [3, 5]);
        ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(154,176,196,0.7)'; ctx.font = '8px JetBrains Mono,monospace';
        ctx.textAlign = 'right';
        ctx.fillText(formatY ? formatY(v) : v.toFixed(0), pad.l - 4, y + 3);
      }
      // X labels
      const step = Math.max(1, Math.floor(n / 7));
      ctx.fillStyle = 'rgba(154,176,196,0.65)'; ctx.font = '8px JetBrains Mono,monospace'; ctx.textAlign = 'center';
      history.forEach((d, i) => {
        if (i === 0 || i === n - 1 || i % step === 0) {
          const fp = (d.fecha || '').split('-');
          ctx.fillText(MESES_C[+fp[1]] + '\'' + fp[0].slice(-2), px(i), H - pad.b + 13);
        }
      });
      // Fill
      const grad = ctx.createLinearGradient(0, pad.t, 0, H - pad.b);
      const hex = color;
      grad.addColorStop(0, hex + '44'); grad.addColorStop(0.6, hex + '18'); grad.addColorStop(1, hex + '04');
      ctx.beginPath(); ctx.moveTo(px(0), py(vals[0]));
      vals.forEach((v, i) => { if (i > 0) ctx.lineTo(px(i), py(v)); });
      ctx.lineTo(px(n - 1), H - pad.b); ctx.lineTo(px(0), H - pad.b); ctx.closePath();
      ctx.fillStyle = grad; ctx.fill();
      // Line
      ctx.beginPath(); ctx.moveTo(px(0), py(vals[0]));
      vals.forEach((v, i) => { if (i > 0) ctx.lineTo(px(i), py(v)); });
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
      // Last dot
      const lv = vals[n - 1];
      ctx.shadowColor = color; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(px(n - 1), py(lv), 4, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill(); ctx.shadowBlur = 0;
    };
    draw();
    const ro = new ResizeObserver(draw); ro.observe(canvas);
    return () => ro.disconnect();
  }, [history, color, padL]);

  const handleMouseMove = (e) => {
    if (!history?.length) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const xS = (rect.width - padL - 16) / (history.length - 1 || 1);
    const idx = Math.max(0, Math.min(history.length - 1, Math.round((mx - padL) / xS)));
    const d = history[idx];
    if (d) setTooltip(formatTip ? formatTip(d) : `${d.fecha}: ${d.valor}`);
  };

  if (!history?.length) {
    return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: '11px' }}>Cargando datos…</div>;
  }
  return (
    <div>
      <canvas ref={canvasRef} style={{ width: '100%', height: `${height}px`, display: 'block', cursor: 'crosshair' }}
        onMouseMove={handleMouseMove} onMouseLeave={() => setTooltip('')} />
      <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text2)', minHeight: '14px', marginTop: '6px', textAlign: 'center' }}>{tooltip}</div>
    </div>
  );
}

// ─── Bar Chart EMAE ──────────────────────────────────────────
function EmaeBarChart({ history }) {
  const canvasRef = useRef(null);
  const [tooltip, setTooltip] = useState('');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !history?.length) return;
    const slice = history.slice(-24);

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
      const W = rect.width, H = rect.height;
      const pad = { t: 24, r: 8, b: 36, l: 32 };
      const vals = slice.map(d => parseFloat(d.valor ?? 0));
      const maxV = Math.max(...vals.map(Math.abs)) * 1.15 || 1;
      const n = slice.length;
      const totalW = W - pad.l - pad.r;
      const barW = Math.floor(totalW / n * 0.72);
      const gap = totalW / n;
      const zeroY = H - pad.b - (0 + maxV) / (2 * maxV) * (H - pad.t - pad.b);

      // Grid
      [-maxV * 0.5, 0, maxV * 0.5, maxV].forEach(gv => {
        const y = H - pad.b - (gv + maxV) / (2 * maxV) * (H - pad.t - pad.b);
        ctx.strokeStyle = gv === 0 ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
        ctx.fillStyle = 'rgba(154,176,196,0.5)'; ctx.font = '8px JetBrains Mono,monospace'; ctx.textAlign = 'right';
        ctx.fillText(gv.toFixed(0) + '%', pad.l - 3, y + 3);
      });

      slice.forEach((d, i) => {
        const v = parseFloat(d.valor ?? 0);
        const fp = (d.fecha || '').split('-');
        const lbl = fp[1] ? MESES_C[+fp[1]] + (i === 0 || fp[1] === '01' ? '\'' + fp[0].slice(-2) : '') : '';
        const isL = i === n - 1;
        const x = pad.l + i * gap + (gap - barW) / 2;
        const barH = Math.abs(v) / maxV * (H - pad.t - pad.b) / 2;
        const y = v >= 0 ? zeroY - barH : zeroY;
        const color = v >= 0 ? '#56c97a' : '#f07070';
        const grad = ctx.createLinearGradient(0, y, 0, y + barH);
        grad.addColorStop(0, isL ? color : color + 'cc');
        grad.addColorStop(1, color + '30');
        ctx.fillStyle = grad;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, barW, barH, v >= 0 ? [2, 2, 0, 0] : [0, 0, 2, 2]);
        else ctx.rect(x, y, barW, barH);
        ctx.fill();
        if (isL) {
          ctx.fillStyle = color; ctx.font = 'bold 9px JetBrains Mono,monospace'; ctx.textAlign = 'center';
          ctx.fillText((v >= 0 ? '+' : '') + v.toFixed(1).replace('.', ',') + '%', x + barW / 2, v >= 0 ? y - 6 : y + barH + 12);
        }
        ctx.fillStyle = isL ? color : 'rgba(154,176,196,0.6)';
        ctx.font = '7px JetBrains Mono,monospace'; ctx.textAlign = 'center';
        ctx.save(); ctx.translate(x + barW / 2, H - pad.b + 8); ctx.rotate(-Math.PI / 4);
        ctx.fillText(lbl, 0, 0); ctx.restore();
      });
    };

    draw();
    const ro = new ResizeObserver(draw); ro.observe(canvas);
    return () => ro.disconnect();
  }, [history]);

  const handleMouseMove = (e) => {
    if (!history?.length) return;
    const slice = history.slice(-24);
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const pad = { l: 32, r: 8 };
    const gap = (rect.width - pad.l - pad.r) / slice.length;
    const idx = Math.floor((mx - pad.l) / gap);
    const d = slice[idx];
    if (d) {
      const fp = (d.fecha || '').split('-');
      const v = parseFloat(d.valor ?? 0);
      setTooltip(`${MESES_F[+fp[1]] || ''} ${fp[0]}: ${(v >= 0 ? '+' : '') + v.toFixed(1).replace('.', ',')}%`);
    }
  };

  if (!history?.length) return <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: '11px' }}>Cargando…</div>;
  return (
    <div>
      <canvas ref={canvasRef} style={{ width: '100%', height: '180px', display: 'block', cursor: 'crosshair' }}
        onMouseMove={handleMouseMove} onMouseLeave={() => setTooltip('')} />
      <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text2)', minHeight: '14px', marginTop: '6px', textAlign: 'center' }}>{tooltip}</div>
    </div>
  );
}

// ─── IPC Bar Chart ───────────────────────────────────────────
function IpcBarChart({ data }) {
  const canvasRef = useRef(null);
  const [tooltip, setTooltip] = useState('');
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data?.length) return;
    const slice = data.slice(-18);
    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
      const W = rect.width, H = rect.height;
      const pad = { t: 24, r: 8, b: 36, l: 8 };
      const vals = slice.map(d => parseFloat(d.valor || 0));
      const maxV = Math.max(...vals) * 1.1 || 1;
      const n = slice.length;
      const totalW = W - pad.l - pad.r;
      const barW = Math.floor(totalW / n * 0.72);
      const gap = totalW / n;
      [1, 2, 3, 4, 5, 6].forEach(gv => {
        if (gv > maxV) return;
        const y = H - pad.b - (gv / maxV) * (H - pad.t - pad.b);
        ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
        ctx.fillStyle = 'rgba(154,176,196,0.45)'; ctx.font = '8px JetBrains Mono,monospace'; ctx.textAlign = 'left';
        ctx.fillText(gv + '%', pad.l + 2, y - 3);
      });
      slice.forEach((d, i) => {
        const v = parseFloat(d.valor || 0);
        const fp = (d.fecha || '').split('-');
        const lbl = fp[1] ? MESES_C[+fp[1]] + (i === 0 || fp[1] === '01' ? '\'' + fp[0].slice(-2) : '') : '';
        const isL = i === n - 1;
        const x = pad.l + i * gap + (gap - barW) / 2;
        const barH = Math.max(3, (v / maxV) * (H - pad.t - pad.b));
        const y = H - pad.b - barH;
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
          ctx.fillStyle = '#4d9ef0'; ctx.font = 'bold 9px JetBrains Mono,monospace'; ctx.textAlign = 'center';
          ctx.fillText(v.toFixed(1).replace('.', ',') + '%', x + barW / 2, y - 6);
        }
        ctx.fillStyle = isL ? '#4d9ef0' : 'rgba(154,176,196,0.6)';
        ctx.font = '7px JetBrains Mono,monospace'; ctx.textAlign = 'center';
        ctx.save(); ctx.translate(x + barW / 2, H - pad.b + 8); ctx.rotate(-Math.PI / 4);
        ctx.fillText(lbl, 0, 0); ctx.restore();
      });
    };
    draw();
    const ro = new ResizeObserver(draw); ro.observe(canvas);
    return () => ro.disconnect();
  }, [data]);
  const handleMouseMove = (e) => {
    if (!data?.length) return;
    const slice = data.slice(-18);
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const gap = (rect.width - 16) / slice.length;
    const idx = Math.floor((mx - 8) / gap);
    const d = slice[idx];
    if (d) { const fp = (d.fecha || '').split('-'); setTooltip(MESES_F[+fp[1]] + ' ' + fp[0] + ': ' + parseFloat(d.valor || 0).toFixed(1).replace('.', ',') + '%'); }
  };
  return (
    <div>
      <canvas ref={canvasRef} style={{ width: '100%', height: '160px', display: 'block', cursor: 'crosshair' }}
        onMouseMove={handleMouseMove} onMouseLeave={() => setTooltip('')} />
      <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text2)', minHeight: '14px', marginTop: '8px', textAlign: 'center' }}>{tooltip}</div>
    </div>
  );
}

// ─── IPC Line Chart ──────────────────────────────────────────
function IpcLineChart({ iaData, mensData }) {
  const canvasRef = useRef(null);
  const [tooltip, setTooltip] = useState('');
  const getSeries = () => {
    if (iaData?.length) return iaData.slice(-24).map(d => ({ f: d.fecha, v: parseFloat(d.valor || 0) }));
    if (mensData?.length >= 12) {
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
      for (let i = 0; i <= 4; i++) {
        const v = vmin + (vmax - vmin) * i / 4; const y = py(v);
        ctx.strokeStyle = i === 0 ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 1; ctx.setLineDash(i === 0 ? [] : [3, 4]);
        ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(154,176,196,0.75)'; ctx.font = '8px JetBrains Mono,monospace'; ctx.textAlign = 'right';
        ctx.fillText(v.toFixed(0) + '%', pad.l - 4, y + 3);
      }
      ctx.fillStyle = 'rgba(154,176,196,0.8)'; ctx.font = '8px JetBrains Mono,monospace'; ctx.textAlign = 'center';
      series.forEach((p, i) => { if (i % 4 === 0 || i === series.length - 1) { const fp = p.f.split('-'); ctx.fillText(MESES_C[+fp[1]] + (fp[1] === '01' ? '\'' + fp[0].slice(-2) : ''), px(i), H - pad.b + 12); } });
      const grad = ctx.createLinearGradient(0, pad.t, 0, H - pad.b);
      grad.addColorStop(0, 'rgba(77,158,240,0.35)'); grad.addColorStop(0.6, 'rgba(77,158,240,0.12)'); grad.addColorStop(1, 'rgba(77,158,240,0.02)');
      ctx.beginPath(); ctx.moveTo(px(0), py(series[0].v));
      series.forEach((p, i) => ctx.lineTo(px(i), py(p.v)));
      ctx.lineTo(px(series.length - 1), H - pad.b); ctx.lineTo(px(0), H - pad.b); ctx.closePath();
      ctx.fillStyle = grad; ctx.fill();
      ctx.beginPath(); ctx.moveTo(px(0), py(series[0].v));
      series.forEach((p, i) => { if (i > 0) ctx.lineTo(px(i), py(p.v)); });
      ctx.strokeStyle = '#4d9ef0'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
      const lv = series[series.length - 1].v;
      ctx.beginPath(); ctx.arc(px(series.length - 1), py(lv), 4, 0, Math.PI * 2); ctx.fillStyle = '#4d9ef0'; ctx.fill();
    };
    draw();
    const ro = new ResizeObserver(draw); ro.observe(canvas);
    return () => ro.disconnect();
  }, [iaData, mensData]);
  const handleMouseMove = (e) => {
    const series = getSeries(); if (!series.length) return;
    const canvas = canvasRef.current; const rect = canvas.getBoundingClientRect(); const mx = e.clientX - rect.left;
    const xS = (rect.width - 58) / (series.length - 1 || 1);
    const idx = Math.max(0, Math.min(series.length - 1, Math.round((mx - 42) / xS)));
    const p = series[idx];
    if (p) { const fp = p.f.split('-'); setTooltip(MESES_F[+fp[1]] + ' ' + fp[0] + ': ' + p.v.toFixed(1).replace('.', ',') + '%'); }
  };
  return (
    <div>
      <canvas ref={canvasRef} style={{ width: '100%', height: '160px', display: 'block', cursor: 'crosshair' }}
        onMouseMove={handleMouseMove} onMouseLeave={() => setTooltip('')} />
      <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text2)', minHeight: '14px', marginTop: '8px', textAlign: 'center' }}>{tooltip}</div>
    </div>
  );
}

// ─── IPC Heatmap ─────────────────────────────────────────────
function IpcHeatmap({ data }) {
  const [tip, setTip] = useState('');
  if (!data?.length) return <div style={{ color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: '10px', textAlign: 'center', padding: '20px' }}>Cargando…</div>;
  const byYear = {};
  data.forEach(d => {
    const yr = (d.fecha || '').slice(0, 4); const m = +((d.fecha || '').split('-')[1] || 0);
    if (!yr || !m) return;
    if (!byYear[yr]) byYear[yr] = Array(12).fill(null);
    byYear[yr][m - 1] = parseFloat(d.valor || 0);
  });
  const years = Object.keys(byYear).sort().slice(-5);
  const allVals = data.map(d => parseFloat(d.valor || 0)).filter(v => !isNaN(v) && v > 0).sort((a, b) => a - b);
  const p10 = allVals[Math.floor(allVals.length * 0.10)] || 0;
  const p90 = allVals[Math.floor(allVals.length * 0.90)] || allVals[allVals.length - 1] || 1;
  const getColor = v => {
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
      <div style={{ display: 'grid', gridTemplateColumns: '38px repeat(12,1fr)', gap: '4px', alignItems: 'center' }}>
        <div />
        {MESES_C.slice(1).map(m => <div key={m} style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text3)', textAlign: 'center', paddingBottom: '4px' }}>{m}</div>)}
        {years.map(yr => (
          <React.Fragment key={yr}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--text3)', textAlign: 'right', paddingRight: '8px', fontWeight: 600 }}>{yr}</div>
            {byYear[yr].map((v, m) => {
              const c = getColor(v);
              if (!c) return <div key={m} style={{ background: 'var(--bg3)', borderRadius: '4px', height: '34px', opacity: 0.4 }} />;
              const alpha = 0.25 + c.t * 0.65;
              const vStr = v.toFixed(1).replace('.', ',');
              const label = `${MESES_C[m + 1]} ${yr}: ${vStr}%`;
              return (
                <div key={m} title={label}
                  style={{ background: `rgba(${c.rgb},${alpha})`, borderRadius: '4px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'default', border: `1px solid rgba(${c.rgb},${Math.min(1, alpha + 0.15)})`, transition: 'filter .12s' }}
                  onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.25)'; setTip(label); }}
                  onMouseLeave={e => { e.currentTarget.style.filter = ''; setTip(''); }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', fontWeight: 700, color: c.t > 0.55 ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.85)' }}>{vStr}</span>
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--text2)', minHeight: '16px', marginTop: '10px', textAlign: 'center' }}>{tip}</div>
    </div>
  );
}

// ─── Riesgo País Line Chart ───────────────────────────────────
function RiesgoPaisChart({ history, range }) {
  const getSlice = () => {
    if (!history?.length) return [];
    if (range === '3M') return history.slice(-90);
    if (range === '6M') return history.slice(-180);
    if (range === '1A') return history.slice(-365);
    return history;
  };
  if (!history?.length) return <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: '11px' }}>Cargando datos de riesgo país…</div>;
  return (
    <LineChart
      history={getSlice().map(d => ({ fecha: d.fecha, valor: d.valor }))}
      color="#f07070"
      height={200}
      padL={56}
      formatY={v => Math.round(v).toLocaleString('es-AR')}
      formatTip={d => `${d.fecha}  ·  ${Math.round(parseFloat(d.valor)).toLocaleString('es-AR')} pb`}
    />
  );
}

// ─── Stat card pequeña ───────────────────────────────────────
function StatCard({ label, badge, val, delta, deltaColor, meta, topBorder }) {
  return (
    <div style={{
      background: 'var(--bg1)', border: '1px solid var(--line)',
      borderTop: topBorder ? `2px solid ${topBorder}` : '1px solid var(--line)',
      borderRadius: '10px', padding: '16px 18px', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: '8px' }}>
        {label}
        {badge && <span style={{ background: 'var(--bg3)', border: '1px solid var(--line2)', borderRadius: '3px', padding: '1px 6px', marginLeft: '6px', fontSize: '8px' }}>{badge}</span>}
      </div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: '26px', fontWeight: 700, color: topBorder || 'var(--white)', lineHeight: 1 }}>{val}</div>
      {delta && <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', marginTop: '6px', color: deltaColor || 'var(--text3)' }}>{delta}</div>}
      {meta && <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '4px' }}>{meta}</div>}
    </div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────
export function MacroPage({ goPage, inflacion, riesgoPais, emae, reservas, baseMonetaria, merval, badlar }) {
  const [rpRange, setRpRange] = React.useState('1A');

  // ── Riesgo País
  const rpVal   = riesgoPais?.valor ?? null;
  const rpDelta = riesgoPais?.delta ?? null;
  const rpDisp  = rpVal != null ? Math.round(rpVal).toLocaleString('es-AR') + ' pb' : 'cargando…';
  const rpDeltaDisp = rpDelta != null ? (rpDelta < 0 ? '↓ −' : '↑ +') + Math.abs(Math.round(rpDelta)) + ' pb vs ayer' : '—';
  const rpDeltaCls  = rpDelta != null ? (rpDelta < 0 ? 'up' : 'dn') : 'fl';
  const rpVsBrasil  = rpVal != null ? (rpVal / 180).toFixed(1) + '×' : '—';

  // ── IPC
  const mensData = inflacion?.history ?? [];
  const iaData   = inflacion?.iaHistory ?? [];
  const lastIPC  = mensData[mensData.length - 1];
  const prevIPC  = mensData[mensData.length - 2];
  const ipcVal   = lastIPC ? parseFloat(lastIPC.valor || 0) : null;
  const ipcPrev  = prevIPC ? parseFloat(prevIPC.valor || 0) : null;
  const ipcDiff  = ipcVal != null && ipcPrev != null ? ipcVal - ipcPrev : null;
  const ipcFp    = (lastIPC?.fecha || '').split('-');
  const ipcMes   = ipcFp[1] ? MESES_C[+ipcFp[1]] + ' ' + ipcFp[0] : '—';
  const ipcIA    = inflacion?.valor ?? null;
  const prom3    = mensData.length >= 3 ? mensData.slice(-3).reduce((a, d) => a + parseFloat(d.valor || 0), 0) / 3 : null;
  const acumAnio = (() => {
    const yr = new Date().getFullYear().toString();
    const ty = mensData.filter(d => (d.fecha || '').startsWith(yr));
    if (!ty.length) return null;
    return (ty.reduce((acc, d) => acc * (1 + parseFloat(d.valor || 0) / 100), 1) - 1) * 100;
  })();

  // ── EMAE
  const emaeVal    = emae?.valor ?? null;
  const emaeDelta  = emae?.delta ?? null;
  const emaeFecha  = emae?.fecha ?? null;
  const emaeFp     = (emaeFecha || '').split('-');
  const emaeMes    = emaeFp[1] ? MESES_C[+emaeFp[1]] + ' ' + emaeFp[0] : '—';
  const emaeColor  = emaeVal != null ? (emaeVal >= 0 ? 'var(--green)' : 'var(--red)') : 'var(--text2)';

  // ── Reservas
  const resVal    = reservas?.valor ?? null;
  const resDelta  = reservas?.delta ?? null;
  const resDelta30= reservas?.delta30 ?? null;

  // ── Base Monetaria
  const baseVal   = baseMonetaria?.valor ?? null;
  const baseDelta = baseMonetaria?.delta30 ?? null;

  // ── Merval
  const mervalVal    = merval?.valor ?? null;
  const mervalUSD    = merval?.valorUSD ?? null;
  const mervalDeltaPct= merval?.deltaPct ?? null;
  const merval30Pct  = merval?.delta30Pct ?? null;

  // ── BADLAR
  const badlarVal = badlar?.badlar ?? null;
  const pmVal     = badlar?.politicaMonetaria ?? null;

  return (
    <div className="page-enter">
      <div className="ph">
        <div>
          <div className="ph-title">Macroeconomía Argentina <span className="help-pip" onClick={() => goPage('ayuda')} title="Ayuda">?</span></div>
          <div className="ph-sub">IPC · EMAE · Riesgo País · Reservas · Merval · Base Monetaria</div>
        </div>
        <div className="ph-right" style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text3)' }}>
          INDEC · BCRA · JP Morgan · datos.gob.ar &nbsp;·&nbsp;
          <span style={{ color: 'var(--text2)' }}>actualización en vivo</span>
        </div>
      </div>

      {/* ═══ 1. KPI RESUMEN ═══ */}
      <div className="section">
        <div className="section-title">Indicadores clave · resumen</div>
        <div className="grid grid-4">
          <StatCard
            label="IPC General" badge={ipcMes}
            val={fmt1(ipcVal)}
            delta={fmtDiff(ipcDiff)}
            deltaColor={ipcDiff != null ? (ipcDiff <= 0 ? 'var(--green)' : 'var(--red)') : undefined}
            meta={`Interanual: ${fmt1(ipcIA)}`}
          />
          <StatCard
            label="EMAE General" badge={emaeMes}
            val={emaeVal != null ? (emaeVal >= 0 ? '+' : '') + emaeVal.toFixed(1).replace('.', ',') + '%' : 'cargando…'}
            delta={emaeDelta != null ? fmtDiff(emaeDelta) + ' vs mes ant.' : '—'}
            deltaColor={emaeColor}
            meta="Variación interanual · INDEC"
            topBorder={emaeVal != null ? (emaeVal >= 0 ? 'var(--green)' : 'var(--red)') : undefined}
          />
          <StatCard
            label="Riesgo País EMBI+" badge="HOY"
            val={rpDisp}
            delta={rpDeltaDisp}
            deltaColor={rpDeltaCls === 'up' ? 'var(--green)' : rpDeltaCls === 'dn' ? 'var(--red)' : 'var(--text3)'}
            meta={`vs Brasil: ${rpVsBrasil}`}
          />
          <StatCard
            label="Reservas Internacionales" badge="BCRA"
            val={resVal != null ? 'USD ' + (resVal / 1000).toFixed(1).replace('.', ',') + ' B' : 'cargando…'}
            delta={resDelta != null ? (resDelta >= 0 ? '↑ +' : '↓ ') + Math.abs(resDelta).toLocaleString('es-AR') + ' M vs ayer' : '—'}
            deltaColor={resDelta != null ? (resDelta >= 0 ? 'var(--green)' : 'var(--red)') : undefined}
            meta="En millones de USD"
          />
        </div>
      </div>

      {/* ═══ 2. INFLACIÓN IPC ═══ */}
      <div className="section">
        <div className="section-title">Inflación — IPC mensual · INDEC</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '20px' }}>
          {[
            { lbl: 'IPC General', badge: ipcMes, val: fmt1(ipcVal), delta: fmtDiff(ipcDiff), meta: `Interanual: ${fmt1(ipcIA)}` },
            { lbl: 'Interanual', badge: '', val: fmt1(ipcIA), delta: 'acumulado 12 meses', meta: 'vs mismo mes año anterior' },
            { lbl: 'Acumulado año', badge: '', val: fmt1(acumAnio), delta: ipcFp[0] || '—', meta: 'Desde enero del año en curso' },
            { lbl: 'Promedio 3 meses', badge: '', val: fmt1(prom3), delta: 'últimos 3 meses', meta: 'Media simple mensual' },
          ].map((k, i) => (
            <div key={i} style={{ background: 'var(--bg1)', border: '1px solid var(--line)', borderRadius: '10px', padding: '16px 18px' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: '8px' }}>
                {k.lbl}{k.badge && <span style={{ background: 'var(--bg3)', border: '1px solid var(--line2)', borderRadius: '3px', padding: '1px 6px', marginLeft: '4px', fontSize: '8px' }}>{k.badge}</span>}
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '28px', fontWeight: 700, color: 'var(--white)', lineHeight: 1 }}>{k.val}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', marginTop: '6px', color: 'var(--text3)' }}>{k.delta}</div>
              <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '4px' }}>{k.meta}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
          <div style={{ background: 'var(--bg1)', border: '1px solid var(--line)', borderRadius: '10px', padding: '16px 18px' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: '14px' }}>IPC mensual — últimos 18 meses</div>
            {mensData.length > 0 ? <IpcBarChart data={mensData} /> : <div style={{ height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: '11px' }}>Cargando…</div>}
            <div style={{ fontFamily: 'var(--mono)', fontSize: '8px', color: 'var(--text3)', marginTop: '6px', textAlign: 'right' }}>Fuente: INDEC · ArgentinaDatos.com</div>
          </div>
          <div style={{ background: 'var(--bg1)', border: '1px solid var(--line)', borderRadius: '10px', padding: '16px 18px' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: '14px' }}>Inflación interanual — tendencia 24 meses</div>
            {(mensData.length > 0 || iaData.length > 0) ? <IpcLineChart iaData={iaData} mensData={mensData} /> : <div style={{ height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: '11px' }}>Cargando…</div>}
            <div style={{ fontFamily: 'var(--mono)', fontSize: '8px', color: 'var(--text3)', marginTop: '6px', textAlign: 'right' }}>Fuente: INDEC · ArgentinaDatos.com</div>
          </div>
        </div>
        <div style={{ background: 'var(--bg1)', border: '1px solid var(--line)', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--line)' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text3)' }}>Historial IPC — por año y mes</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text3)', marginLeft: '16px' }}>
              Bajo <span style={{ display: 'inline-block', width: '10px', height: '10px', background: 'rgba(56,161,89,0.7)', borderRadius: '2px', verticalAlign: 'middle' }}></span>
              {' → '}
              <span style={{ display: 'inline-block', width: '10px', height: '10px', background: 'rgba(217,64,64,0.7)', borderRadius: '2px', verticalAlign: 'middle' }}></span> Alto
            </span>
          </div>
          <div style={{ padding: '16px 18px' }}><IpcHeatmap data={mensData} /></div>
          <div style={{ padding: '8px 18px', borderTop: '1px solid var(--line)' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text3)' }}>Fuente: INDEC · ArgentinaDatos.com · Frecuencia: mensual</span>
          </div>
        </div>
      </div>

      {/* ═══ 3. EMAE ═══ */}
      <div className="section">
        <div className="section-title">Actividad económica — EMAE · INDEC</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
          {/* KPIs EMAE */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <StatCard
              label="EMAE General" badge={emaeMes}
              val={emaeVal != null ? (emaeVal >= 0 ? '+' : '') + emaeVal.toFixed(1).replace('.', ',') + '%' : 'cargando…'}
              delta={emaeDelta != null ? fmtDiff(emaeDelta) + ' vs mes ant.' : '—'}
              deltaColor={emaeColor}
              meta="Var. interanual"
              topBorder={emaeVal != null ? (emaeVal >= 0 ? 'var(--green)' : 'var(--red)') : undefined}
            />
            <StatCard
              label="Tendencia últimos 3 m"
              val={emae?.history?.length >= 3
                ? (() => {
                    const last3 = emae.history.slice(-3).map(d => parseFloat(d.valor ?? 0));
                    const avg = last3.reduce((a, b) => a + b, 0) / 3;
                    return (avg >= 0 ? '+' : '') + avg.toFixed(1).replace('.', ',') + '%';
                  })()
                : '—'}
              delta="promedio 3 meses"
              meta="Variación interanual media"
            />
          </div>
          {/* Gráfico EMAE */}
          <div style={{ background: 'var(--bg1)', border: '1px solid var(--line)', borderRadius: '10px', padding: '16px 18px' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: '10px' }}>
              EMAE — variación interanual mensual · 24 meses
            </div>
            {emae?.history?.length
              ? <EmaeBarChart history={emae.history.slice(-24)} />
              : <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: '11px' }}>Cargando…</div>}
            <div style={{ fontFamily: 'var(--mono)', fontSize: '8px', color: 'var(--text3)', marginTop: '6px', textAlign: 'right' }}>
              Fuente: INDEC · Series de Tiempo datos.gob.ar · Serie 11.3_VMATC_2004_M_12
            </div>
          </div>
        </div>
      </div>

      {/* ═══ 4. RIESGO PAÍS ═══ */}
      <div className="section">
        <div className="section-title">Riesgo País — EMBI+ · JP Morgan</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <StatCard label="EMBI+ Argentina" badge="HOY" val={rpDisp}
            delta={rpDeltaDisp} deltaColor={rpDeltaCls === 'up' ? 'var(--green)' : 'var(--red)'}
            meta="Mínimo desde 2017 · Brasil: 180 pb" />
          <StatCard label="Variación 30 días"
            val={riesgoPais?.history?.length >= 30
              ? (() => { const h = riesgoPais.history; const d30 = parseFloat(h[h.length - 30]?.valor || 0); const dlt = Math.round(rpVal - d30); return (dlt < 0 ? '−' : '+') + Math.abs(dlt) + ' pb'; })()
              : '—'}
            delta="vs 30 días atrás" meta="Puntos básicos" />
          <StatCard label="Mínimo del año"
            val={riesgoPais?.history?.length ? Math.round(Math.min(...riesgoPais.history.map(h => parseFloat(h.valor || 9999)))).toLocaleString('es-AR') + ' pb' : rpDisp}
            delta="este año" meta="pb · menor riesgo" />
          <StatCard label="vs Brasil" val={rpVsBrasil}
            delta="veces el riesgo de Brasil" meta="Brasil referencia: 180 pb" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '14px' }}>
          <div style={{ background: 'var(--bg1)', border: '1px solid var(--line)', borderRadius: '10px', padding: '16px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text3)' }}>Riesgo País EMBI+ — historial</div>
              <div style={{ display: 'flex', gap: '4px' }}>
                {['3M', '6M', '1A', 'MAX'].map(r => (
                  <button key={r} onClick={() => setRpRange(r)} style={{ fontFamily: 'var(--mono)', fontSize: '8px', padding: '2px 8px', borderRadius: '3px', border: `1px solid ${r === rpRange ? 'var(--accent)' : 'var(--line2)'}`, background: r === rpRange ? 'var(--acc-bg)' : 'transparent', color: r === rpRange ? 'var(--accent)' : 'var(--text3)', cursor: 'pointer' }}>{r}</button>
                ))}
              </div>
            </div>
            <RiesgoPaisChart history={riesgoPais?.history ?? []} range={rpRange} />
            <div style={{ fontFamily: 'var(--mono)', fontSize: '8px', color: 'var(--text3)', marginTop: '8px', textAlign: 'right' }}>Fuente: JP Morgan EMBI+ · ArgentinaDatos.com</div>
          </div>
          {/* Comparativa regional */}
          <div style={{ background: 'var(--bg1)', border: '1px solid var(--line)', borderRadius: '10px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text3)' }}>Comparativa regional</div>
            </div>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)', background: 'rgba(77,158,240,.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)' }}>Argentina</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: '14px', fontWeight: 700, color: 'var(--accent)' }}>{rpVal != null ? Math.round(rpVal) : '—'}</span>
              </div>
              <div style={{ height: '5px', background: 'var(--bg3)', borderRadius: '3px', overflow: 'hidden' }}><div style={{ height: '100%', width: '100%', background: 'var(--accent)', borderRadius: '3px' }}></div></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text3)' }}>{rpDeltaDisp}</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', background: 'rgba(240,112,112,.15)', color: 'var(--red)', padding: '1px 6px', borderRadius: '3px' }}>ALTO</span>
              </div>
            </div>
            {[['Colombia', 280, '49%', 'rgba(240,184,64,.6)', 'MEDIO', 'rgba(240,184,64,.12)', 'var(--text2)'],
              ['Brasil', 180, '31%', 'rgba(86,201,122,.5)', 'MODERADO', 'rgba(86,201,122,.1)', 'var(--text3)'],
              ['Uruguay', 95, '17%', 'rgba(86,201,122,.7)', 'BAJO', 'rgba(86,201,122,.15)', 'var(--green)'],
            ].map(([country, pb, w, bg, label, lbg, lc]) => (
              <div key={country} style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text2)' }}>{country}</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '13px', fontWeight: 600, color: 'var(--white)' }}>{pb}</span>
                </div>
                <div style={{ height: '4px', background: 'var(--bg3)', borderRadius: '3px', overflow: 'hidden' }}><div style={{ height: '100%', width: w, background: bg, borderRadius: '3px' }}></div></div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}><span style={{ fontFamily: 'var(--mono)', fontSize: '9px', background: lbg, color: lc, padding: '1px 6px', borderRadius: '3px' }}>{label}</span></div>
              </div>
            ))}
          </div>
        </div>
        <div className="source" style={{ marginTop: '8px' }}>Fuente: JP Morgan EMBI+ · ArgentinaDatos.com · Frecuencia: diaria</div>
      </div>

      {/* ═══ 5. RESERVAS + BASE MONETARIA ═══ */}
      <div className="section">
        <div className="section-title">Reservas Internacionales y Base Monetaria · BCRA</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          {/* Reservas */}
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <StatCard label="Reservas Internacionales" badge="BCRA"
                val={resVal != null ? 'USD ' + Math.round(resVal).toLocaleString('es-AR') + ' M' : 'cargando…'}
                delta={resDelta != null ? (resDelta >= 0 ? '↑ +' : '↓ ') + Math.abs(resDelta).toLocaleString('es-AR') + ' M vs ayer' : '—'}
                deltaColor={resDelta != null ? (resDelta >= 0 ? 'var(--green)' : 'var(--red)') : undefined}
                meta="Millones USD · bruto"
                topBorder={resVal != null ? (resVal > 25000 ? 'var(--green)' : 'var(--red)') : undefined}
              />
              <StatCard label="Variación 30 días"
                val={resDelta30 != null ? (resDelta30 >= 0 ? '+' : '') + Math.round(resDelta30).toLocaleString('es-AR') + ' M' : '—'}
                delta="vs 30 días atrás"
                deltaColor={resDelta30 != null ? (resDelta30 >= 0 ? 'var(--green)' : 'var(--red)') : undefined}
                meta="En millones USD"
              />
            </div>
            <div style={{ background: 'var(--bg1)', border: '1px solid var(--line)', borderRadius: '10px', padding: '16px 18px' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: '10px' }}>Reservas — historial 12 meses (USD M)</div>
              <LineChart
                history={reservas?.history?.slice(-365) ?? []}
                color="#56c97a"
                height={160}
                padL={64}
                formatY={v => Math.round(v / 1000) + 'k'}
                formatTip={d => `${d.fecha}: USD ${Math.round(d.valor).toLocaleString('es-AR')} M`}
              />
              <div style={{ fontFamily: 'var(--mono)', fontSize: '8px', color: 'var(--text3)', marginTop: '4px', textAlign: 'right' }}>Fuente: BCRA · estadisticasbcra.com</div>
            </div>
          </div>
          {/* Base Monetaria */}
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <StatCard label="Base Monetaria" badge="BCRA"
                val={baseVal != null ? '$' + (baseVal / 1_000_000).toFixed(1).replace('.', ',') + ' B' : 'cargando…'}
                delta={baseDelta != null ? (baseDelta >= 0 ? '↑ +' : '↓ ') + (Math.abs(baseDelta) / 1_000_000).toFixed(1).replace('.', ',') + ' B (30d)' : '—'}
                deltaColor={baseDelta != null ? (baseDelta >= 0 ? 'var(--red)' : 'var(--green)') : undefined}
                meta="Miles de millones ARS"
              />
              <StatCard label="Tasa BADLAR"
                val={badlarVal != null ? fmtPct2(badlarVal) : 'cargando…'}
                delta={pmVal != null ? `Política monetaria: ${fmtPct2(pmVal)}` : '—'}
                meta="Depósitos plazo fijo +$1M"
              />
            </div>
            <div style={{ background: 'var(--bg1)', border: '1px solid var(--line)', borderRadius: '10px', padding: '16px 18px' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: '10px' }}>Base Monetaria — historial 12 meses (ARS M)</div>
              <LineChart
                history={baseMonetaria?.history?.slice(-365) ?? []}
                color="#f0b840"
                height={160}
                padL={64}
                formatY={v => (v / 1_000_000).toFixed(0) + 'B'}
                formatTip={d => `${d.fecha}: $${(d.valor / 1_000_000).toFixed(1)} B`}
              />
              <div style={{ fontFamily: 'var(--mono)', fontSize: '8px', color: 'var(--text3)', marginTop: '4px', textAlign: 'right' }}>Fuente: BCRA · estadisticasbcra.com</div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ 6. MERVAL ═══ */}
      <div className="section">
        <div className="section-title">Índice Merval · Bolsa de Buenos Aires</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <StatCard label="Merval ARS" badge="HOY"
            val={mervalVal != null ? mervalVal.toLocaleString('es-AR') : 'cargando…'}
            delta={mervalDeltaPct != null ? fmtPct(mervalDeltaPct) + ' vs ayer' : '—'}
            deltaColor={mervalDeltaPct != null ? (mervalDeltaPct >= 0 ? 'var(--green)' : 'var(--red)') : undefined}
            meta="Puntos · pesos argentinos"
            topBorder={mervalVal != null ? 'var(--green)' : undefined}
          />
          <StatCard label="Merval USD (CCL)"
            val={mervalUSD != null ? 'USD ' + Math.round(mervalUSD).toLocaleString('es-AR') : 'cargando…'}
            delta="Dólares al tipo CCL"
            meta="Referencia internacional"
          />
          <StatCard label="Variación 30 días"
            val={merval30Pct != null ? fmtPct(merval30Pct) : '—'}
            delta="vs hace 30 días"
            deltaColor={merval30Pct != null ? (merval30Pct >= 0 ? 'var(--green)' : 'var(--red)') : undefined}
            meta="Rentabilidad en ARS"
          />
          <StatCard label="BADLAR"
            val={badlarVal != null ? fmtPct2(badlarVal) : 'cargando…'}
            delta="Tasa de referencia depósitos"
            meta="Tasa nominal anual"
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div style={{ background: 'var(--bg1)', border: '1px solid var(--line)', borderRadius: '10px', padding: '16px 18px' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: '10px' }}>Merval ARS — historial 12 meses</div>
            <LineChart
              history={merval?.historyARS?.slice(-365) ?? []}
              color="#56c97a"
              height={170}
              padL={72}
              formatY={v => (v / 1000).toFixed(0) + 'k'}
              formatTip={d => `${d.fecha}: ${Math.round(d.valor).toLocaleString('es-AR')} pts`}
            />
            <div style={{ fontFamily: 'var(--mono)', fontSize: '8px', color: 'var(--text3)', marginTop: '4px', textAlign: 'right' }}>Fuente: BYMA · estadisticasbcra.com</div>
          </div>
          <div style={{ background: 'var(--bg1)', border: '1px solid var(--line)', borderRadius: '10px', padding: '16px 18px' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: '10px' }}>Merval en USD (CCL) — historial 12 meses</div>
            <LineChart
              history={merval?.historyUSD?.slice(-365) ?? []}
              color="#4d9ef0"
              height={170}
              padL={56}
              formatY={v => 'USD ' + Math.round(v)}
              formatTip={d => `${d.fecha}: USD ${Math.round(d.valor).toLocaleString('es-AR')}`}
            />
            <div style={{ fontFamily: 'var(--mono)', fontSize: '8px', color: 'var(--text3)', marginTop: '4px', textAlign: 'right' }}>Fuente: BYMA · estadisticasbcra.com</div>
          </div>
        </div>
        <div className="source">Fuente: BYMA · estadisticasbcra.com · Frecuencia: diaria</div>
      </div>

    </div>
  );
}
