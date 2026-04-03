// MacroPage.jsx
// ─────────────────────────────────────────────────────────────
// Secciones:
//   1. KpiResumen         — IPC, EMAE, Riesgo País, PBI (cards)
//   2. InflacionSection   — IPC mensual + gráficos + heatmap
//   3. EmaeSection        — actividad económica + sectores
//   4. RiesgoPaisSection  — EMBI+ con selector de rango
//   5. PbiSection         — PBI real trimestral
// Charts inline: IpcBarChart, IpcHeatmap, RiesgoPaisChart
// Sub-componentes pendientes de extraer a /components/macro/
// ─────────────────────────────────────────────────────────────
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ApiErrorBanner } from '../ui/StatCard';
import { CanvasChart } from '../ui/CanvasChart';


const MESES_C = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const MESES_F = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// ── Riesgo regional — datos dinámicos via ArgentinaDatos ─────
// Configuración de países a mostrar (con fallback y etiquetas)
const PAISES_REGIONAL = [
  { nombre: 'Colombia', iso: 'col', fallback: 280 },
  { nombre: 'Brasil',   iso: 'bra', fallback: 180 },
  { nombre: 'México',   iso: 'mex', fallback: 170 },
  { nombre: 'Chile',    iso: 'chl', fallback: 130 },
  { nombre: 'Uruguay',  iso: 'ury', fallback: 95  },
  { nombre: 'Perú',     iso: 'per', fallback: 190 },
];

function getRiskLabel(pb) {
  if (pb >= 600) return { label: 'MUY ALTO', bg: 'rgba(240,112,112,.15)', color: 'var(--red)' };
  if (pb >= 350) return { label: 'ALTO',     bg: 'rgba(240,112,112,.12)', color: 'var(--red)' };
  if (pb >= 200) return { label: 'MEDIO',    bg: 'rgba(240,184,64,.12)',  color: '#f0b840' };
  if (pb >= 120) return { label: 'MODERADO', bg: 'rgba(86,201,122,.10)', color: 'var(--green)' };
  return              { label: 'BAJO',       bg: 'rgba(86,201,122,.15)', color: 'var(--green)' };
}

function useRiesgoRegional(rpArgentina) {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const AD_BASE = 'https://api.argentinadatos.com/v1';
    let cancelled = false;

    async function fetchPais(iso) {
      try {
        // ArgentinaDatos expone /finanzas/indices/riesgo-pais/:pais/ultimo
        const r = await fetch(`${AD_BASE}/finanzas/indices/riesgo-pais/${iso}/ultimo`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        // Respuesta esperada: { fecha, valor } o número directo
        const val = typeof j === 'number' ? j : (j.valor ?? j.value ?? null);
        return val != null ? parseFloat(val) : null;
      } catch {
        return null;
      }
    }

    async function fetchAll() {
      setLoading(true);
      const results = await Promise.allSettled(
        PAISES_REGIONAL.map(p => fetchPais(p.iso))
      );
      if (cancelled) return;
      const map = {};
      PAISES_REGIONAL.forEach((p, i) => {
        const r = results[i];
        const val = r.status === 'fulfilled' ? r.value : null;
        map[p.iso] = val != null ? Math.round(val) : p.fallback;
      });
      setData(map);
      setLoading(false);
    }

    fetchAll();
    return () => { cancelled = true; };
  }, []);

  // Máximo para calcular ancho de barras (Argentina incluida)
  const argVal = rpArgentina != null ? Math.round(rpArgentina) : null;
  const allVals = [
    ...(argVal != null ? [argVal] : []),
    ...PAISES_REGIONAL.map(p => data[p.iso] ?? p.fallback),
  ].filter(Boolean);
  const maxVal = allVals.length ? Math.max(...allVals) : 1;

  return { data, loading, maxVal };
}

// ── PBI Bar Chart histórico ───────────────────────────────────
function PbiBarChart({ history }) {
  const canvasRef = useRef(null);
  const [tooltip, setTooltip] = useState('');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !history || !history.length) return;
    const slice = history.slice(-16);

    const draw = () => {
      const dpr  = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width  = rect.width  * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      const W = rect.width, H = rect.height;
      const pad = { t: 28, r: 12, b: 40, l: 12 };

      const vals = slice.map(d => parseFloat(d.valor || 0));
      const maxV = Math.max(Math.max(...vals) * 1.2, 1);
      const minV = Math.min(Math.min(...vals) * 1.2, -1);
      const range = maxV - minV;
      const n = slice.length;
      const totalW = W - pad.l - pad.r;
      const barW = Math.floor(totalW / n * 0.72);
      const gap  = totalW / n;
      const zeroY = H - pad.b - (0 - minV) / range * (H - pad.t - pad.b);

      // Grid
      [-4, -2, 0, 2, 4, 6, 8].forEach(gv => {
        if (gv > maxV || gv < minV) return;
        const y = H - pad.b - (gv - minV) / range * (H - pad.t - pad.b);
        ctx.strokeStyle = gv === 0 ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.04)';
        ctx.lineWidth = gv === 0 ? 1.5 : 1;
        ctx.setLineDash(gv === 0 ? [] : [3, 5]);
        ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(154,176,196,0.5)';
        ctx.font = '8px JetBrains Mono,monospace';
        ctx.textAlign = 'left';
        ctx.fillText((gv >= 0 ? '+' : '') + gv + '%', pad.l + 2, y - 3);
      });

      // Barras
      slice.forEach((d, i) => {
        const v   = parseFloat(d.valor || 0);
        const pos = v >= 0;
        const fp  = (d.fecha || '').split('-');
        const q   = Math.ceil(+(fp[1] || 3) / 3);
        const lbl = `Q${q}'${(fp[0] || '').slice(-2)}`;
        const isL = i === n - 1;
        const x   = pad.l + i * gap + (gap - barW) / 2;
        const barH = Math.max(3, Math.abs(v) / range * (H - pad.t - pad.b));
        const y = pos ? zeroY - barH : zeroY;

        const grad = ctx.createLinearGradient(0, y, 0, y + barH);
        if (pos) {
          grad.addColorStop(0, isL ? '#56c97a' : `rgba(86,201,122,${0.4 + Math.min(0.5, Math.abs(v)/10)})`);
          grad.addColorStop(1, isL ? 'rgba(86,201,122,0.2)' : 'rgba(86,201,122,0.1)');
        } else {
          grad.addColorStop(0, isL ? '#f07070' : `rgba(240,112,112,${0.4 + Math.min(0.5, Math.abs(v)/10)})`);
          grad.addColorStop(1, isL ? 'rgba(240,112,112,0.1)' : 'rgba(240,112,112,0.05)');
        }
        ctx.fillStyle = grad;
        ctx.beginPath();
        if (ctx.roundRect) {
          if (pos) ctx.roundRect(x, y, barW, barH, [2,2,0,0]);
          else ctx.roundRect(x, y, barW, barH, [0,0,2,2]);
        } else ctx.rect(x, y, barW, barH);
        ctx.fill();

        if (isL) {
          ctx.fillStyle = pos ? '#56c97a' : '#f07070';
          ctx.font = 'bold 9px JetBrains Mono,monospace';
          ctx.textAlign = 'center';
          const labelY = pos ? y - 5 : y + barH + 13;
          ctx.fillText((v >= 0 ? '+' : '') + v.toFixed(1).replace('.', ',') + '%', x + barW / 2, labelY);
        }

        ctx.fillStyle = isL ? (pos ? '#56c97a' : '#f07070') : 'rgba(154,176,196,0.55)';
        ctx.font = '7px JetBrains Mono,monospace';
        ctx.textAlign = 'center';
        ctx.save();
        ctx.translate(x + barW / 2, H - pad.b + 9);
        ctx.rotate(-Math.PI / 4);
        ctx.fillText(lbl, 0, 0);
        ctx.restore();
      });
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [history]);

  const handleMouseMove = (e) => {
    if (!history || !history.length) return;
    const slice = history.slice(-16);
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const pad = { l: 12, r: 12 };
    const gap = (rect.width - pad.l - pad.r) / slice.length;
    const idx = Math.max(0, Math.min(slice.length - 1, Math.floor((mx - pad.l) / gap)));
    const d = slice[idx];
    if (d) {
      const v = parseFloat(d.valor || 0);
      const fp = (d.fecha || '').split('-');
      const q = Math.ceil(+(fp[1] || 3) / 3);
      setTooltip(`Q${q} ${fp[0]}  ·  ${v >= 0 ? '+' : ''}${v.toFixed(1).replace('.', ',')}%`);
    }
  };

  return (
    <div>
      <canvas ref={canvasRef} style={{width:'100%',height:'220px',display:'block',cursor:'crosshair'}}
        onMouseMove={handleMouseMove} onMouseLeave={() => setTooltip('')} />
      <div style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text2)',minHeight:'14px',marginTop:'8px',textAlign:'center'}}>{tooltip}</div>
    </div>
  );
}

// ─── Participación sectorial en el PBI (datos estructurales INDEC) ──────────
// Porcentaje de participación promedio en el PBI a precios básicos (base 2004)
// Fuente: INDEC Cuentas Nacionales - estructura del VA por sector
const PBI_SECTOR_SHARE = {
  'Agro, ganadería y silvicultura': 8.5,
  'Pesca':                          0.3,
  'Explotación minera':             3.2,
  'Industria manufacturera':        18.4,
  'Electricidad, gas y agua':       2.8,
  'Construcción':                   5.1,
  'Comercio may. y minorista':      12.6,
  'Hoteles y restaurantes':         2.3,
  'Transporte y comunicaciones':    8.9,
  'Intermediación financiera':      4.4,
  'Servicios inmobiliarios':        14.2,
  'Administración pública':         7.8,
  'Enseñanza':                      5.7,
  'Salud':                          5.8,
};

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

// ── Composición sectorial del PBI — donut + tabla ─────────────
const SECTOR_COLORS = [
  '#4d9ef0','#56c97a','#f0b840','#f07070','#a78bfa',
  '#34d399','#fb923c','#60a5fa','#f472b6','#94a3b8',
  '#facc15','#2dd4bf','#e879f9','#38bdf8',
];

function PbiDonutChart({ items }) {
  const canvasRef = useRef(null);
  const [hovered, setHovered] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !items.length) return;

    const draw = () => {
      const dpr  = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width  = rect.width  * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      const W = rect.width, H = rect.height;
      const cx = W / 2, cy = H / 2;
      const R  = Math.min(W, H) / 2 - 10;
      const r  = R * 0.54;

      const total = items.reduce((s, x) => s + x.share, 0);
      let angle = -Math.PI / 2;

      items.forEach((item, i) => {
        const sweep = (item.share / total) * Math.PI * 2;
        const isH   = hovered === i;
        const rOuter = isH ? R + 5 : R;

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, rOuter, angle, angle + sweep);
        ctx.closePath();
        ctx.fillStyle = SECTOR_COLORS[i % SECTOR_COLORS.length];
        ctx.globalAlpha = isH ? 1 : 0.82;
        ctx.fill();
        ctx.globalAlpha = 1;

        // Separator
        ctx.beginPath();
        ctx.arc(cx, cy, rOuter, angle, angle + sweep);
        ctx.strokeStyle = 'var(--bg2, #131b22)';
        ctx.lineWidth = isH ? 2.5 : 1.5;
        ctx.stroke();

        angle += sweep;
      });

      // Inner hole
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = '#0d1520';
      ctx.fill();

      // Center label
      if (hovered != null && items[hovered]) {
        const it = items[hovered];
        ctx.fillStyle = SECTOR_COLORS[hovered % SECTOR_COLORS.length];
        ctx.font = `bold ${Math.floor(r * 0.38)}px JetBrains Mono, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(it.share.toFixed(1) + '%', cx, cy - 6);
        ctx.fillStyle = 'rgba(154,176,196,0.8)';
        ctx.font = `${Math.floor(r * 0.18)}px sans-serif`;
        // wrap name
        const words = it.nombre.split(' ');
        let line = '', lines = [];
        for (const w of words) {
          const test = line ? line + ' ' + w : w;
          if (test.length > 16) { lines.push(line); line = w; } else line = test;
        }
        lines.push(line);
        lines = lines.slice(0, 2);
        lines.forEach((l, li) => ctx.fillText(l, cx, cy + 14 + li * 14));
      } else {
        ctx.fillStyle = 'rgba(154,176,196,0.6)';
        ctx.font = `${Math.floor(r * 0.22)}px JetBrains Mono, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('% PBI', cx, cy - 4);
        ctx.font = `${Math.floor(r * 0.16)}px JetBrains Mono, monospace`;
        ctx.fillText('por sector', cx, cy + 14);
      }
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [items, hovered]);

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    const rect   = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left - rect.width / 2;
    const my = e.clientY - rect.top  - rect.height / 2;
    const dist = Math.sqrt(mx * mx + my * my);
    const R    = Math.min(rect.width, rect.height) / 2 - 10;
    const r    = R * 0.54;
    if (dist < r || dist > R + 10) { setHovered(null); return; }
    let angle = Math.atan2(my, mx) + Math.PI / 2;
    if (angle < 0) angle += Math.PI * 2;
    const total = items.reduce((s, x) => s + x.share, 0);
    let acc = 0;
    for (let i = 0; i < items.length; i++) {
      acc += (items[i].share / total) * Math.PI * 2;
      if (angle <= acc) { setHovered(i); return; }
    }
    setHovered(null);
  };

  return (
    <canvas ref={canvasRef}
      style={{width:'100%',height:'100%',display:'block',cursor:'crosshair'}}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHovered(null)} />
  );
}

function PbiComposicionSection({ sectors }) {
  // Combinar datos dinámicos (variación EMAE) con shares estáticos del PBI
  const items = Object.entries(PBI_SECTOR_SHARE)
    .map(([nombre, share], i) => {
      const dynSector = sectors.find(s => s.nombre === nombre);
      return {
        nombre,
        share,
        valor: dynSector?.valor ?? null,
        color: SECTOR_COLORS[i % SECTOR_COLORS.length],
      };
    })
    .sort((a, b) => b.share - a.share);

  const totalShare = items.reduce((s, x) => s + x.share, 0);

  return (
    <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:'10px',overflow:'hidden',marginTop:'14px'}}>
      <div style={{padding:'14px 20px',borderBottom:'1px solid var(--line)',display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
        <div>
          <div style={{fontSize:'14px',fontWeight:600,color:'var(--white)'}}>Composición del PBI por sector</div>
          <div style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)',marginTop:'3px',letterSpacing:'.06em'}}>
            PARTICIPACIÓN ESTIMADA · PRECIOS BÁSICOS · BASE 2004 · INDEC CUENTAS NACIONALES
          </div>
        </div>
        <span style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)'}}>estructura productiva</span>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'280px 1fr',gap:'0'}}>
        {/* Donut */}
        <div style={{padding:'20px',borderRight:'1px solid var(--line)',display:'flex',alignItems:'center',justifyContent:'center',minHeight:'280px'}}>
          <div style={{width:'100%',height:'260px'}}>
            <PbiDonutChart items={items} />
          </div>
        </div>
        {/* Lista */}
        <div style={{padding:'10px 0',overflowY:'auto',maxHeight:'300px'}}>
          {/* Header */}
          <div style={{display:'grid',gridTemplateColumns:'14px 1fr 60px 70px',gap:'8px',alignItems:'center',padding:'4px 16px 8px',borderBottom:'1px solid rgba(255,255,255,.06)',marginBottom:'2px'}}>
            <div/>
            <span style={{fontFamily:'var(--mono)',fontSize:'8px',color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.08em'}}>Sector</span>
            <span style={{fontFamily:'var(--mono)',fontSize:'8px',color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.08em',textAlign:'right'}}>% PBI</span>
            <span style={{fontFamily:'var(--mono)',fontSize:'8px',color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.08em',textAlign:'right'}}>Var. EMAE</span>
          </div>
          {items.map((item, i) => {
            const neg = item.valor != null && item.valor < 0;
            const pos = item.valor != null && item.valor >= 0;
            const barPct = Math.round((item.share / Math.max(...items.map(x => x.share))) * 100);
            return (
              <div key={item.nombre} style={{
                display:'grid',gridTemplateColumns:'14px 1fr 60px 70px',
                gap:'8px',alignItems:'center',
                padding:'6px 16px',
                borderBottom:'1px solid rgba(255,255,255,.025)',
                transition:'background .1s',
              }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,.03)'}
                onMouseLeave={e => e.currentTarget.style.background='transparent'}
              >
                <div style={{width:'10px',height:'10px',borderRadius:'2px',background:item.color,flexShrink:0}}/>
                <div>
                  <div style={{fontSize:'11px',color:'var(--text2)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{item.nombre}</div>
                  <div style={{height:'3px',background:'var(--bg3)',borderRadius:'2px',marginTop:'4px',overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${barPct}%`,background:item.color,opacity:0.6,borderRadius:'2px'}}/>
                  </div>
                </div>
                <div style={{fontFamily:'var(--mono)',fontSize:'12px',fontWeight:700,color:'var(--white)',textAlign:'right'}}>
                  {item.share.toFixed(1)}%
                </div>
                <div style={{textAlign:'right'}}>
                  {item.valor != null ? (
                    <span style={{
                      fontFamily:'var(--mono)',fontSize:'10px',fontWeight:600,
                      color: pos ? 'var(--green)' : 'var(--red)',
                      background: pos ? 'rgba(86,201,122,.12)' : 'rgba(240,112,112,.12)',
                      borderRadius:'3px',padding:'1px 6px',
                    }}>
                      {pos ? '+' : '−'}{Math.abs(item.valor).toFixed(1).replace('.',',')}%
                    </span>
                  ) : (
                    <span style={{fontFamily:'var(--mono)',fontSize:'10px',color:'var(--text3)'}}>—</span>
                  )}
                </div>
              </div>
            );
          })}
          <div style={{padding:'10px 16px',borderTop:'1px solid rgba(255,255,255,.06)',marginTop:'4px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)'}}>Total VA (excl. imp. y subv.)</span>
            <span style={{fontFamily:'var(--mono)',fontSize:'11px',fontWeight:700,color:'var(--white)'}}>{totalShare.toFixed(1)}%</span>
          </div>
        </div>
      </div>
      <div style={{padding:'8px 20px',borderTop:'1px solid var(--line)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span style={{fontFamily:'var(--mono)',fontSize:'8px',color:'var(--text3)'}}>
          Participación: INDEC Cuentas Nacionales · promedio estructural base 2004 · Var. EMAE: datos.gob.ar
        </span>
        <span style={{fontFamily:'var(--mono)',fontSize:'8px',color:'var(--text3)'}}>
          Hover sobre el donut para detalle
        </span>
      </div>
    </div>
  );
}

export function MacroPage({ goPage, inflacion, riesgoPais, bcra, loadBcra, indec, loadIndec, apiStatus, reloadAll }) {
  const [rpRange, setRpRange] = React.useState('1A');
  const rpArgVal = riesgoPais?.valor ?? null;
  const { data: regionalData, loading: regionalLoading, maxVal: regionalMax } = useRiesgoRegional(rpArgVal);
  const rpVal      = rpArgVal;
  const rpDelta    = riesgoPais?.delta ?? null;
  const rpDisp     = rpVal != null ? Math.round(rpVal).toLocaleString('es-AR') + ' pb' : 'cargando…';
  const rpDeltaDisp = rpDelta != null
    ? (rpDelta < 0 ? ' −' : ' +') + Math.abs(Math.round(rpDelta)) + ' pb vs ayer'
    : '—';
  const rpDeltaCls  = rpDelta != null ? (rpDelta < 0 ? 'up' : 'dn') : 'fl';
  const rpVsBrasil  = rpVal != null ? (rpVal / 180).toFixed(1) + '×' : '—';

  // Cargar INDEC bajo demanda al entrar a la página
  useEffect(() => { if (!indec) loadIndec?.(); }, [indec, loadIndec]);

  // IPC KPIs — usa campos enriquecidos por useLiveData (BCRA primary, ArgentinaDatos fallback)
  const mensData = inflacion?.history ?? [];
  const iaData   = inflacion?.iaHistory ?? [];
  const lastIPC  = mensData[mensData.length - 1];
  const prevIPC  = mensData[mensData.length - 2];
  const ipcDiff  = (() => {
    const curr = inflacion?.ipcMensual ?? (lastIPC ? parseFloat(lastIPC.valor || 0) : null);
    const prev = prevIPC ? parseFloat(prevIPC.valor || 0) : null;
    return curr != null && prev != null ? curr - prev : null;
  })();
  const ipcFp  = ((inflacion?.ipcFecha ?? lastIPC?.fecha) || '').split('-');
  const ipcMes = ipcFp[1] ? MESES_C[+ipcFp[1]] + ' ' + ipcFp[0] : '—';
  // Valores resueltos: BCRA cuando disponible, ArgentinaDatos como fallback
  const ipcVal = inflacion?.ipcMensual    ?? (lastIPC ? parseFloat(lastIPC.valor || 0) : null);
  const ipcIA  = inflacion?.ipcInteranual ?? inflacion?.valor ?? null;
  const ipcExp = inflacion?.ipcEsperado   ?? null;

  // Datos para CanvasChart — inflacion interanual (24 meses)
  const ipcLineData = (() => {
    if (iaData.length) return iaData.slice(-24);
    if (mensData.length >= 12) {
      const s = [];
      for (let i = 11; i < mensData.length; i++) {
        const chunk = mensData.slice(i - 11, i + 1);
        const v = (chunk.reduce((acc, x) => acc * (1 + parseFloat(x.valor || 0) / 100), 1) - 1) * 100;
        s.push({ fecha: mensData[i].fecha, valor: v });
      }
      return s.slice(-24);
    }
    return [];
  })();
  const ipcLineSeries = ipcLineData.length ? [{
    label: 'Interanual',
    color: '#4d9ef0',
    data:  ipcLineData.map(d => parseFloat(d.valor || 0)),
  }] : null;
  const ipcLineLabels = ipcLineData.map(d => {
    const parts = (d.fecha || '').split('-');
    return parts[1] ? MESES_C[+parts[1]] + (parts[1] === '01' ? " '" + (parts[0] || '').slice(-2) : '') : '';
  });
  const prom3    = mensData.length >= 3 ? (mensData.slice(-3).reduce((a,d)=>a+parseFloat(d.valor||0),0)/3) : null;
  const acumAnio = (() => {
    const yr = new Date().getFullYear().toString();
    const thisYear = mensData.filter(d=>(d.fecha||'').startsWith(yr));
    if(!thisYear.length) return null;
    return (thisYear.reduce((acc,d)=>acc*(1+parseFloat(d.valor||0)/100),1)-1)*100;
  })();

  // ── EMAE derivados ─────────────────────────────────────────────
  const emae        = indec?.emae;
  const emaeVal     = emae?.general?.valor ?? null;
  const emaeValPrev = emae?.general?.valorAnterior ?? null;
  const emaeFecha   = emae?.general?.fecha ?? null;
  const emaeMes     = (() => {
    if (!emaeFecha) return '—';
    const [y, m] = emaeFecha.split('-');
    return (MESES_C[+m] || '') + ' ' + y;
  })();
  const emaeAccum   = emae?.acumAnio ?? null;
  const emaeAnioAccum = emae?.anoAcum ?? new Date().getFullYear();
  const fmtEmae = v => v != null ? (v >= 0 ? '+' : '') + v.toFixed(1).replace('.', ',') + '%' : '—';

  // Mejor y peor sector
  const sectors     = emae?.sectors ?? [];
  const bestSector  = sectors[0] ?? null;
  const worstSector = sectors.length > 1 ? sectors[sectors.length - 1] : null;

  // ── PBI derivados ──────────────────────────────────────────────
  const pbi         = indec?.pbi;
  const pbiVal      = pbi?.lastIa ?? null;
  const pbiPrev     = pbi?.prevIa ?? null;
  const pbiFecha    = pbi?.fecha ?? null;
  const pbiTrim     = (() => {
    if (!pbiFecha) return '—';
    const [y, m] = pbiFecha.split('-');
    const q = Math.ceil(+m / 3);
    return `Q${q} ${y}`;
  })();
  const pbiHist     = pbi?.history ?? [];
  const fmtPbi = v => v != null ? (v >= 0 ? '+' : '') + v.toFixed(1).replace('.', ',') + '%' : '—';

  const fmt1 = v => v != null ? v.toFixed(1).replace('.',',')+'%' : '—';
  const fmtDiff = v => v != null ? (v>=0?'+':'')+v.toFixed(1).replace('.',',') + ' pp' : '—';

  return (
    <div className="page-enter">
      <ApiErrorBanner
        keys={['inflacion', 'riesgoPais', 'bcra', 'indec']}
        apiStatus={apiStatus}
        labels={{ inflacion: 'IPC/Inflación', riesgoPais: 'Riesgo País', bcra: 'BCRA', indec: 'INDEC/EMAE' }}
        onRetry={reloadAll}
      />
      <div className="ph">
        <div>
          <div className="ph-title">Macroeconomía Argentina <span className="help-pip" onClick={() => goPage('ayuda', 'glosario-macro')} title="Ayuda">?</span></div>
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
          <div className="stat c-flat">
            <div className="stat-label">IPC Mensual <span className="stat-badge fl">{ipcFp[1] ? ipcFp[0].slice(2)+'/'+ipcFp[1] : '—'}</span></div>
            <div className="stat-val">{fmt1(ipcVal)}</div>
            <div className="stat-delta fl">Interanual: {fmt1(ipcIA)}</div>
            <div className="stat-meta">Fuente: BCRA oficial · IPC INDEC</div>
          </div>
          <div className="stat c-flat"><div className="stat-label">EMAE General <span className="stat-badge fl">{emaeMes}</span></div><div className="stat-val">{fmtEmae(emaeVal)}</div><div className={`stat-delta ${emaeVal != null && emaeVal >= 0 ? 'up' : 'dn'}`}>{emaeAccum != null ? `Acumula ${fmtEmae(emaeAccum)} en ${emaeAnioAccum}` : 'cargando…'}</div><div className="stat-meta">Var. interanual · INDEC · datos.gob.ar</div></div>
          <div className="stat c-flat"><div className="stat-label">Riesgo País EMBI+ <span className="stat-badge fl">HOY</span></div><div className="stat-val">{rpDisp}</div><div className={`stat-delta ${rpDeltaCls}`}>{rpDeltaDisp}</div><div className="stat-meta">Mínimo desde 2017 · Brasil: 180 pb</div></div>
          <div className="stat c-flat"><div className="stat-label">PBI Real <span className="stat-badge fl">{pbiTrim}</span></div><div className="stat-val">{fmtPbi(pbiVal)}</div><div className={`stat-delta ${pbiVal != null && pbiVal >= 0 ? 'up' : 'dn'}`}>{pbiPrev != null ? `Trim. anterior: ${fmtPbi(pbiPrev)}` : 'cargando…'}</div><div className="stat-meta">Var. interanual · precios constantes · INDEC</div></div>
        </div>
      </div>

      {/* 2. INFLACIÓN */}
      <div className="section">
        <div className="section-title">Inflación — IPC mensual · INDEC</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'12px',marginBottom:'20px'}}>
          {[
            {lbl:'IPC Mensual',    badge: ipcMes,
             val:  fmt1(ipcVal),
             delta: fmtDiff(ipcDiff),
             meta: 'Fuente: BCRA oficial · IPC INDEC'},
            {lbl:'Interanual',    badge:'',
             val:  fmt1(ipcIA),
             delta:'acumulado 12 meses', meta:'vs mismo mes año anterior · BCRA'},
            {lbl:'Inflación esperada',badge:'12 meses',
             val:  ipcExp != null ? fmt1(ipcExp) : '—',
             delta:'próximos 12 meses', meta:'Expectativa de mercado · BCRA'},
            {lbl:'Acumulado año', badge:'',   val:fmt1(acumAnio), delta:ipcFp[0]||'—', meta:'Desde enero del año en curso'},
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
            <div style={{fontFamily:'var(--mono)',fontSize:'8px',color:'var(--text3)',marginTop:'6px',textAlign:'right'}}>Fuente: INDEC · ArgentinaDatos.com</div>
          </div>
          <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:'10px',padding:'16px 18px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px'}}>
              <div>
                <div style={{fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text3)'}}>Inflación interanual — tendencia</div>
                <div style={{fontSize:'10px',color:'var(--text2)',marginTop:'2px'}}>Variación % acumulada 12 meses</div>
              </div>
            </div>
            {ipcLineSeries
              ? <CanvasChart
                  series={ipcLineSeries}
                  labels={ipcLineLabels}
                  height="160px"
                  decimalPlaces={1}
                />
              : <div style={{height:'160px',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text3)',fontFamily:'var(--mono)',fontSize:'11px'}}>Cargando…</div>}
            <div style={{fontFamily:'var(--mono)',fontSize:'8px',color:'var(--text3)',marginTop:'6px',textAlign:'right'}}>Fuente: INDEC · ArgentinaDatos.com</div>
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
            <span style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)'}}>Fuente: INDEC · ArgentinaDatos.com · Frecuencia: mensual</span>
          </div>
        </div>
      </div>

      {/* 3. EMAE */}
      <div className="section">
        <div className="section-title">Actividad económica — EMAE · INDEC</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:'12px',marginBottom:'16px'}}>
          {/* KPI general */}
          <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:'10px',padding:'16px 18px'}}>
            <div style={{fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text3)',marginBottom:'8px'}}>
              EMAE General <span style={{background:'var(--bg3)',border:'1px solid var(--line2)',borderRadius:'3px',padding:'1px 6px',marginLeft:'4px',fontSize:'8px'}}>{emaeMes}</span>
            </div>
            <div style={{fontFamily:'var(--mono)',fontSize:'28px',fontWeight:700,color:emaeVal!=null&&emaeVal>=0?'var(--green)':'var(--red)',lineHeight:1}}>
              {fmtEmae(emaeVal)}
            </div>
            <div style={{fontFamily:'var(--mono)',fontSize:'10px',color:emaeVal!=null&&emaeVal>=0?'var(--green)':'var(--red)',marginTop:'6px'}}>
              {emaeVal!=null ? (emaeVal>=0 ? 'crecimiento interanual' : 'contracción interanual') : 'cargando…'}
            </div>
            <div style={{fontSize:'11px',color:'var(--text3)',marginTop:'4px'}}>Variación interanual</div>
          </div>
          {/* KPI acumulado */}
          <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:'10px',padding:'16px 18px'}}>
            <div style={{fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text3)',marginBottom:'8px'}}>Acum. {emaeAnioAccum}</div>
            <div style={{fontFamily:'var(--mono)',fontSize:'28px',fontWeight:700,color:'var(--white)',lineHeight:1}}>
              {emaeAccum != null ? fmtEmae(emaeAccum) : '—'}
            </div>
            <div style={{fontFamily:'var(--mono)',fontSize:'10px',color:'var(--text3)',marginTop:'6px'}}>
              {emae?.mesesAcum ? `${emae.mesesAcum} mes${emae.mesesAcum>1?'es':''} disponibles` : 'cargando…'}
            </div>
            <div style={{fontSize:'11px',color:'var(--text3)',marginTop:'4px'}}>promedio IA acum. año</div>
          </div>
          {/* Mejor sector */}
          <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:'10px',padding:'16px 18px'}}>
            <div style={{fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text3)',marginBottom:'8px'}}>Mejor sector</div>
            <div style={{fontFamily:'var(--mono)',fontSize:'16px',fontWeight:700,color:'var(--green)',lineHeight:1.2}}>
              {bestSector ? bestSector.nombre : '—'}
            </div>
            <div style={{fontFamily:'var(--mono)',fontSize:'14px',fontWeight:700,color:'var(--green)',marginTop:'4px'}}>
              {bestSector ? fmtEmae(bestSector.valor) : '—'}
            </div>
            <div style={{fontSize:'11px',color:'var(--text3)',marginTop:'4px'}}>
              Interanual · {bestSector?.fecha ? (() => { const [y,m]=bestSector.fecha.split('-'); return (MESES_C[+m]||'')+' '+y; })() : '—'}
            </div>
          </div>
          {/* Peor sector */}
          <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:'10px',padding:'16px 18px'}}>
            <div style={{fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text3)',marginBottom:'8px'}}>
              {worstSector?.valor < 0 ? 'En contracción' : 'Menor crecimiento'}
            </div>
            <div style={{fontFamily:'var(--mono)',fontSize:'16px',fontWeight:700,color:worstSector?.valor<0?'var(--red)':'var(--text2)',lineHeight:1.2}}>
              {worstSector ? worstSector.nombre : '—'}
            </div>
            <div style={{fontFamily:'var(--mono)',fontSize:'14px',fontWeight:700,color:worstSector?.valor<0?'var(--red)':'var(--text2)',marginTop:'4px'}}>
              {worstSector ? fmtEmae(worstSector.valor) : '—'}
            </div>
            <div style={{fontSize:'11px',color:'var(--text3)',marginTop:'4px'}}>
              {worstSector?.valor < 0 ? 'único o entre sectores negativos' : 'menor ritmo de expansión'}
            </div>
          </div>
        </div>

        {/* Tabla de sectores — dinámica */}
        <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:'10px',overflow:'hidden'}}>
          <div style={{padding:'16px 24px',borderBottom:'1px solid var(--line)',display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
            <div>
              <div style={{fontSize:'15px',fontWeight:600,color:'var(--white)',marginBottom:'3px'}}>Variación interanual por sector</div>
              <div style={{fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text3)'}}>
                {emaeMes} · INDEC · datos.gob.ar
              </div>
            </div>
          </div>
          {sectors.length === 0 ? (
            <div style={{padding:'32px',textAlign:'center',color:'var(--text3)',fontFamily:'var(--mono)',fontSize:'11px'}}>
              {indec ? 'Sin datos de sectores disponibles' : 'Cargando sectores…'}
            </div>
          ) : (() => {
            const maxPos = Math.max(...sectors.map(x=>x.valor>0?x.valor:0), 0.01);
            const maxNeg = Math.max(...sectors.map(x=>x.valor<0?Math.abs(x.valor):0), 0.01);
            const totalRange = maxPos + maxNeg;
            const negFr = maxNeg / totalRange;
            const posFr = maxPos / totalRange;
            return (
              <div style={{padding:'2px 24px 4px'}}>
                {/* Header */}
                <div style={{display:'flex',alignItems:'center',padding:'4px 0 8px',borderBottom:'1px solid rgba(255,255,255,0.07)',marginBottom:'2px'}}>
                  <div style={{width:'210px',flexShrink:0,fontFamily:'var(--mono)',fontSize:'8px',color:'var(--text3)',letterSpacing:'.08em',textTransform:'uppercase'}}>SECTOR</div>
                  <div style={{flex:1,fontFamily:'var(--mono)',fontSize:'8px',color:'var(--text3)',letterSpacing:'.08em',textTransform:'uppercase',textAlign:'center'}}>VAR. INTERANUAL</div>
                  <div style={{width:'62px',flexShrink:0,fontFamily:'var(--mono)',fontSize:'8px',color:'var(--text3)',textAlign:'right',letterSpacing:'.08em',textTransform:'uppercase'}}>EMAE</div>
                  <div style={{width:'56px',flexShrink:0,fontFamily:'var(--mono)',fontSize:'8px',color:'var(--text3)',textAlign:'right',letterSpacing:'.08em',textTransform:'uppercase',paddingLeft:'8px'}}>% PBI</div>
                </div>
                {sectors.map(({nombre,valor},i,arr)=>{
                  const neg = valor < 0;
                  const color = neg ? 'var(--red)' : 'var(--green)';
                  const isTop = i===0;
                  const posPct = !neg ? (valor/maxPos)*100 : 0;
                  const negPct = neg ? (Math.abs(valor)/maxNeg)*100 : 0;
                  const pbiShare = PBI_SECTOR_SHARE[nombre] ?? null;
                  return (
                    <div key={nombre} style={{
                      display:'flex',alignItems:'center',padding:'5px 0',
                      borderBottom: i<arr.length-1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                    }}>
                      <div style={{width:'210px',flexShrink:0,fontSize:'11px',color:isTop?'var(--white)':neg?'var(--red)':'var(--text2)',fontWeight:isTop?600:400,paddingRight:'10px',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{nombre}</div>
                      <div style={{flex:1,display:'flex',alignItems:'center',minWidth:0}}>
                        <div style={{flex:negFr,display:'flex',justifyContent:'flex-end',paddingRight:'2px'}}>
                          {neg && <div style={{height:'7px',width:`${negPct}%`,background:'var(--red)',borderRadius:'3px 0 0 3px',opacity:0.85}}/>}
                        </div>
                        <div style={{width:'1px',height:'16px',background:'rgba(255,255,255,0.18)',flexShrink:0}}/>
                        <div style={{flex:posFr,paddingLeft:'2px'}}>
                          {!neg && <div style={{height:'7px',width:`${posPct}%`,background:isTop?'var(--green)':'rgba(86,201,122,0.65)',borderRadius:'0 3px 3px 0',boxShadow:isTop?'0 0 8px rgba(86,201,122,0.35)':'none'}}/>}
                        </div>
                      </div>
                      <div style={{width:'62px',flexShrink:0,fontFamily:'var(--mono)',fontSize:'11px',fontWeight:700,color,textAlign:'right'}}>
                        {neg?'−':'+'}{Math.abs(valor).toFixed(1).replace('.',',')}%
                      </div>
                      <div style={{width:'56px',flexShrink:0,paddingLeft:'8px',textAlign:'right'}}>
                        {pbiShare != null ? (
                          <span style={{fontFamily:'var(--mono)',fontSize:'10px',color:'var(--text3)',background:'var(--bg3)',border:'1px solid var(--line2)',borderRadius:'3px',padding:'1px 5px'}}>
                            {pbiShare.toFixed(1)}%
                          </span>
                        ) : <span style={{color:'var(--text3)',fontSize:'10px'}}>—</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
          <div style={{padding:'8px 20px',borderTop:'1px solid var(--line)',display:'flex',justifyContent:'flex-end'}}>
            <span style={{fontFamily:'var(--mono)',fontSize:'8px',color:'var(--text3)'}}>Fuente: INDEC · API Series de Tiempo datos.gob.ar · Frecuencia: mensual · % PBI: Cuentas Nacionales base 2004</span>
          </div>
        </div>

        {/* Composición sectorial del PBI */}
        <PbiComposicionSection sectors={sectors} />

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
            <div style={{fontFamily:'var(--mono)',fontSize:'8px',color:'var(--text3)',marginTop:'8px',textAlign:'right'}}>Fuente: JP Morgan EMBI+ · ArgentinaDatos.com</div>
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
            {regionalLoading && PAISES_REGIONAL.every(p => !regionalData[p.iso]) ? (
              <div style={{padding:'20px',textAlign:'center',color:'var(--text3)',fontFamily:'var(--mono)',fontSize:'10px'}}>Cargando datos…</div>
            ) : PAISES_REGIONAL.map(p => {
              const pb = regionalData[p.iso] ?? p.fallback;
              const barW = Math.round((pb / regionalMax) * 100);
              const risk = getRiskLabel(pb);
              const barColor = pb >= 350 ? 'rgba(240,112,112,.6)' : pb >= 200 ? 'rgba(240,184,64,.6)' : 'rgba(86,201,122,.55)';
              return (
                <div key={p.iso} style={{padding:'10px 16px',borderBottom:'1px solid var(--line)'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'5px'}}>
                    <span style={{fontSize:'12px',color:'var(--text2)'}}>{p.nombre}</span>
                    <span style={{fontFamily:'var(--mono)',fontSize:'13px',fontWeight:600,color:'var(--white)'}}>{pb.toLocaleString('es-AR')}</span>
                  </div>
                  <div style={{height:'4px',background:'var(--bg3)',borderRadius:'3px',overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${barW}%`,background:barColor,borderRadius:'3px',transition:'width .5s ease'}}/>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',marginTop:'4px',alignItems:'center'}}>
                    <span style={{fontFamily:'var(--mono)',fontSize:'8px',color:'var(--text3)'}}>pb</span>
                    <span style={{fontFamily:'var(--mono)',fontSize:'9px',background:risk.bg,color:risk.color,padding:'1px 6px',borderRadius:'3px'}}>{risk.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="source" style={{marginTop:'8px'}}>Fuente: JP Morgan EMBI+ · ArgentinaDatos.com · Frecuencia: diaria</div>
      </div>

      {/* 5. PBI */}
      <div className="section">
        <div className="section-title">Producto Bruto Interno — INDEC</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:'12px',marginBottom:'16px'}}>
          {/* KPI último trimestre */}
          <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderTop:`2px solid ${pbiVal!=null&&pbiVal>=0?'var(--green)':'var(--red)'}`,borderRadius:'10px',padding:'16px 18px'}}>
            <div style={{fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text3)',marginBottom:'8px'}}>
              Var. PBI real <span style={{background:'rgba(86,201,122,.15)',color:'var(--green)',borderRadius:'3px',padding:'1px 6px',marginLeft:'4px',fontSize:'8px'}}>{pbiTrim}</span>
            </div>
            <div style={{fontFamily:'var(--mono)',fontSize:'26px',fontWeight:700,color:pbiVal!=null&&pbiVal>=0?'var(--green)':'var(--red)',lineHeight:1}}>
              {fmtPbi(pbiVal)}
            </div>
            <div style={{fontFamily:'var(--mono)',fontSize:'10px',color:pbiVal!=null&&pbiVal>=0?'var(--green)':'var(--text3)',marginTop:'6px'}}>
              {pbiPrev != null ? `Trim. ant.: ${fmtPbi(pbiPrev)}` : 'cargando…'}
            </div>
            <div style={{fontSize:'11px',color:'var(--text3)',marginTop:'4px'}}>Var. interanual · precios constantes</div>
          </div>
          {/* Promedio últimos 4 trimestres */}
          <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:'10px',padding:'16px 18px'}}>
            <div style={{fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text3)',marginBottom:'8px'}}>Promedio últimos 4 trim.</div>
            <div style={{fontFamily:'var(--mono)',fontSize:'26px',fontWeight:700,color:'var(--white)',lineHeight:1}}>
              {pbiHist.length >= 4
                ? fmtPbi(pbiHist.slice(-4).reduce((s,d)=>s+parseFloat(d.valor||0),0)/4)
                : '—'}
            </div>
            <div style={{fontFamily:'var(--mono)',fontSize:'10px',color:'var(--text3)',marginTop:'6px'}}>
              {pbiHist.length >= 4 ? `${pbiHist.slice(-4)[0]?.fecha?.slice(0,7)} – ${pbiHist[pbiHist.length-1]?.fecha?.slice(0,7)}` : 'cargando…'}
            </div>
            <div style={{fontSize:'11px',color:'var(--text3)',marginTop:'4px'}}>variación interanual media</div>
          </div>
          {/* Mejor trimestre reciente */}
          <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:'10px',padding:'16px 18px'}}>
            <div style={{fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text3)',marginBottom:'8px'}}>Mejor trim. reciente</div>
            {(() => {
              if (!pbiHist.length) return <div style={{fontFamily:'var(--mono)',fontSize:'26px',fontWeight:700,color:'var(--white)',lineHeight:1}}>—</div>;
              const best = pbiHist.reduce((b,d) => parseFloat(d.valor||0) > parseFloat(b.valor||0) ? d : b, pbiHist[0]);
              const [y,m] = (best.fecha||'').split('-');
              const q = Math.ceil(+m/3);
              return <>
                <div style={{fontFamily:'var(--mono)',fontSize:'26px',fontWeight:700,color:'var(--green)',lineHeight:1}}>{fmtPbi(parseFloat(best.valor))}</div>
                <div style={{fontFamily:'var(--mono)',fontSize:'10px',color:'var(--text3)',marginTop:'6px'}}>Q{q} {y}</div>
              </>;
            })()}
            <div style={{fontSize:'11px',color:'var(--text3)',marginTop:'4px'}}>en el período disponible</div>
          </div>
          {/* Proyección FMI — estimación externa, se mantiene manual */}
          <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:'10px',padding:'16px 18px'}}>
            <div style={{fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text3)',marginBottom:'8px'}}>Proyección 2026 — FMI</div>
            <div style={{fontFamily:'var(--mono)',fontSize:'26px',fontWeight:700,color:'var(--accent)',lineHeight:1}}>+5,0%</div>
            <div style={{fontFamily:'var(--mono)',fontSize:'10px',color:'var(--text3)',marginTop:'6px'}}>WEO Oct 2025 · sujeto a revisión</div>
            <div style={{fontSize:'11px',color:'var(--text3)',marginTop:'4px'}}>Consenso privado: +4,2%</div>
          </div>
        </div>

        {/* Historial trimestral dinámico */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px'}}>
          <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:'10px',overflow:'hidden'}}>
            <div style={{padding:'12px 16px',borderBottom:'1px solid var(--line)'}}>
              <div style={{fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text3)'}}>
                Variación real interanual — últimos trimestres
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'80px 1fr 100px',padding:'7px 16px',borderBottom:'1px solid var(--line)',background:'var(--bg2)'}}>
              <span style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)'}}>PERÍODO</span>
              <span style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)'}}>BARRA</span>
              <span style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)',textAlign:'right'}}>VAR. REAL</span>
            </div>
            {pbiHist.length === 0 ? (
              <div style={{padding:'20px 16px',color:'var(--text3)',fontFamily:'var(--mono)',fontSize:'11px',textAlign:'center'}}>cargando…</div>
            ) : (
              pbiHist.slice(-8).reverse().map((d, i) => {
                const v   = parseFloat(d.valor || 0);
                const pos = v >= 0;
                const [y, m] = (d.fecha || '').split('-');
                const q   = Math.ceil(+m / 3);
                const lbl = `Q${q} ${y}`;
                const isLast = i === 0;
                const barW = Math.min(100, Math.abs(v) * 6);
                return (
                  <div key={d.fecha} style={{display:'grid',gridTemplateColumns:'80px 1fr 100px',padding:'9px 16px',borderBottom:'1px solid rgba(255,255,255,.04)',alignItems:'center',background:isLast?(pos?'rgba(86,201,122,.05)':'rgba(240,112,112,.05)'):''}} >
                    <span style={{fontFamily:'var(--mono)',fontSize:'12px',fontWeight:isLast?700:400,color:isLast?(pos?'var(--green)':'var(--red)'):'var(--text3)'}}>{lbl}</span>
                    <div style={{paddingRight:'12px'}}>
                      <div style={{height:'4px',background:'var(--bg3)',borderRadius:'3px',overflow:'hidden'}}>
                        <div style={{height:'100%',width:`${barW}%`,background:pos?'rgba(86,201,122,0.6)':'rgba(240,112,112,0.6)',borderRadius:'3px'}}/>
                      </div>
                    </div>
                    {isLast
                      ? <span style={{background:pos?'rgba(86,201,122,.2)':'rgba(240,112,112,.2)',color:pos?'var(--green)':'var(--red)',fontFamily:'var(--mono)',fontSize:'10px',fontWeight:700,padding:'2px 8px',borderRadius:'4px',textAlign:'center'}}>{fmtPbi(v)}</span>
                      : <span style={{fontFamily:'var(--mono)',fontSize:'11px',fontWeight:600,color:pos?'var(--green)':'var(--red)',textAlign:'right'}}>{fmtPbi(v)}</span>
                    }
                  </div>
                );
              })
            )}
          </div>
          <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:'10px',overflow:'hidden'}}>
            <div style={{padding:'12px 16px',borderBottom:'1px solid var(--line)'}}>
              <div style={{fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text3)'}}>Nota metodológica · INDEC</div>
            </div>
            <div style={{padding:'18px 20px',display:'flex',flexDirection:'column',gap:'14px'}}>
              {[
                ['Frecuencia','Trimestral (T+3 meses aprox.)','var(--text2)'],
                ['Base','Precios constantes de 2004','var(--text2)'],
                ['Var. mostrada','Interanual (mismo trim. año anterior)','var(--text2)'],
                ['Fuente primaria','INDEC · Cuentas Nacionales','var(--accent)'],
                ['API','datos.gob.ar · Series de Tiempo','var(--accent)'],
              ].map(([k,v,c])=>(
                <div key={k}>
                  <div style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)',marginBottom:'3px'}}>{k}</div>
                  <div style={{fontSize:'12px',color:c,fontWeight:500}}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Gráfico histórico PBI */}
        <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:'10px',padding:'16px 18px',marginTop:'14px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:'14px'}}>
            <div>
              <div style={{fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text3)'}}>
                PBI real — variación interanual por trimestre
              </div>
              <div style={{fontSize:'10px',color:'var(--text2)',marginTop:'3px'}}>Últimos 16 trimestres · hover para ver el valor</div>
            </div>
            <span style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)'}}>precios constantes 2004</span>
          </div>
          {pbiHist.length > 0
            ? <PbiBarChart history={pbiHist} />
            : <div style={{height:'220px',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text3)',fontFamily:'var(--mono)',fontSize:'11px'}}>Cargando…</div>}
          <div style={{fontFamily:'var(--mono)',fontSize:'8px',color:'var(--text3)',marginTop:'6px',textAlign:'right'}}>
            Fuente: INDEC · API Series de Tiempo · datos.gob.ar
          </div>
        </div>

        <div className="source">Fuente: INDEC · Cuentas Nacionales · API Series de Tiempo datos.gob.ar · Frecuencia: trimestral</div>
      </div>
    <BcraMonetarioSection bcra={bcra} loadBcra={loadBcra} />
    </div>
  );
}

// ── Sección BCRA — Agregados Monetarios (Macro) ───────────────
function BcraMonetarioSection({ bcra, loadBcra }) {
  useEffect(() => { if (!bcra) loadBcra?.(); }, [bcra, loadBcra]);

  const monetario = bcra?.byCat?.['Monetario'] ?? [];
  const ts        = bcra?.timestamp ? new Date(bcra.timestamp) : null;
  const tsStr     = ts ? ts.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + ' hs' : null;

  const fmtValor = (item) => {
    if (item.valor == null) return '—';
    const v = parseFloat(item.valor);
    if (item.unidad === 'MM $') return '$ ' + (v / 1000).toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' B';
    if (item.formato === 'pct') return v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
    return v.toLocaleString('es-AR', { maximumFractionDigits: 2 });
  };

  const fmtDelta = (item) => {
    if (item.valor == null || item.valorAnterior == null) return null;
    const d = parseFloat(item.valor) - parseFloat(item.valorAnterior);
    if (Math.abs(d) < 0.001) return null;
    if (item.unidad === 'MM $') {
      const pct = (d / parseFloat(item.valorAnterior)) * 100;
      return { txt: (pct > 0 ? '+' : '') + pct.toFixed(2).replace('.', ',') + '%', up: d > 0 };
    }
    return { txt: (d > 0 ? '+' : '') + d.toLocaleString('es-AR', { maximumFractionDigits: 2 }), up: d > 0 };
  };

  const fmtFecha = (f) => {
    if (!f) return '';
    const [y, m, d] = (f || '').split('-');
    return `${d}/${m}/${y}`;
  };

  if (!bcra) {
    return (
      <div className="section">
        <div className="section-title">Agregados monetarios — BCRA</div>
        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: '11px' }}>Cargando datos del BCRA…</div>
      </div>
    );
  }

  return (
    <div className="section">
      <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Agregados monetarios — BCRA</span>
        {tsStr && <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text3)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>actualizado {tsStr}</span>}
      </div>
      <div className="grid grid-3">
        {monetario.map(item => {
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
      <div className="source">Fuente: BCRA · api.bcra.gob.ar/estadisticas/v4.0 · Frecuencia: diaria</div>
    </div>
  );
}
