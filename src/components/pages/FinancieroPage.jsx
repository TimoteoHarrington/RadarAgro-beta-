// FinancieroPage.jsx — subtabs: Dólares · Tasas · UVA & Índices
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ApiErrorBanner } from '../ui/StatCard';
import { CanvasChart } from '../ui/CanvasChart';
import { fetchDolarHistorial } from '../../services/api';

const MESES_C = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

// ── Helpers de formato ────────────────────────────────────────
const f$    = v => v ? '$' + Math.round(v).toLocaleString('es-AR') : '…';
const fP    = v => v != null ? (v > 0 ? '+' : '') + v.toFixed(1).replace('.', ',') + '%' : '—';
const fTNA  = v => v != null ? v.toFixed(2).replace('.', ',') + '%' : '—';
const toTNA = v => v != null && v !== '' ? parseFloat(v) * 100 : 0;

const fDelta$ = delta => {
  if (delta == null) return { txt: '—', cls: 'fl' };
  const abs = Math.abs(delta).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return delta >= 0 ? { txt: `+$${abs} hoy`, cls: 'up' } : { txt: `−$${abs} hoy`, cls: 'dn' };
};
const fSpread  = s => s != null ? `spread $${s.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : null;
const fmtFecha = f => { if (!f) return ''; const [y,m,d] = (f||'').split('-'); return `${d}/${m}/${y}`; };

// ── Gráfico histórico BCRA ────────────────────────────────────
function BcraHistorialChart({ item }) {
  const canvasRef = useRef(null);
  const [tooltip, setTooltip] = useState('');
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [range, setRange]     = useState('6M');

  useEffect(() => {
    if (!item) return;
    setLoading(true); setData([]);
    const d = new Date();
    if (range==='1M') d.setMonth(d.getMonth()-1);
    else if (range==='3M') d.setMonth(d.getMonth()-3);
    else if (range==='6M') d.setMonth(d.getMonth()-6);
    else if (range==='1A') d.setFullYear(d.getFullYear()-1);
    else d.setFullYear(d.getFullYear()-3);
    const desde = d.toISOString().slice(0,10);
    fetch(`/api/bcra?variable=${item.id}&desde=${desde}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(j => setData([...(j.data ?? [])].reverse()))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [item?.id, range]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data.length) return;
    const draw = () => {
      const dpr = window.devicePixelRatio||1, rect = canvas.getBoundingClientRect();
      canvas.width = rect.width*dpr; canvas.height = rect.height*dpr;
      const ctx = canvas.getContext('2d'); ctx.scale(dpr,dpr);
      const W=rect.width, H=rect.height, pad={t:18,r:16,b:32,l:62};
      const vals = data.map(d=>parseFloat(d.valor??0));
      const vmin=Math.min(...vals)*0.97, vmax=Math.max(...vals)*1.03;
      const n=data.length, xS=(W-pad.l-pad.r)/(n-1||1), yS=(H-pad.t-pad.b)/(vmax-vmin||1);
      const px=i=>pad.l+i*xS, py=v=>H-pad.b-(v-vmin)*yS;
      for(let i=0;i<=4;i++){
        const v=vmin+(vmax-vmin)*i/4, y=py(v);
        ctx.strokeStyle=i===0?'rgba(255,255,255,0.1)':'rgba(255,255,255,0.04)';
        ctx.lineWidth=1; ctx.setLineDash(i===0?[]:[3,5]);
        ctx.beginPath(); ctx.moveTo(pad.l,y); ctx.lineTo(W-pad.r,y); ctx.stroke(); ctx.setLineDash([]);
        const isPct=item.formato==='pct';
        const label=isPct?v.toFixed(1)+'%':(item.unidad==='MM $'?(v/1000).toFixed(1)+' B':Math.round(v).toLocaleString('es-AR'));
        ctx.fillStyle='rgba(90,101,133,0.75)'; ctx.font='9px JetBrains Mono,monospace'; ctx.textAlign='right';
        ctx.fillText(label,pad.l-5,y+3);
      }
      ctx.fillStyle='rgba(90,101,133,0.6)'; ctx.font='8px JetBrains Mono,monospace'; ctx.textAlign='center';
      const step=Math.max(1,Math.floor(n/6));
      data.forEach((d,i)=>{
        if(i===0||i===n-1||i%step===0){
          const fp=(d.fecha||'').split('-');
          if(fp.length>=2) ctx.fillText(MESES_C[+fp[1]]+"'"+fp[0].slice(-2),px(i),H-pad.b+13);
        }
      });
      const grad=ctx.createLinearGradient(0,pad.t,0,H-pad.b);
      grad.addColorStop(0,'rgba(91,156,246,0.18)'); grad.addColorStop(1,'rgba(91,156,246,0.01)');
      ctx.beginPath(); ctx.moveTo(px(0),py(vals[0]));
      vals.forEach((v,i)=>{if(i>0)ctx.lineTo(px(i),py(v));});
      ctx.lineTo(px(n-1),H-pad.b); ctx.lineTo(px(0),H-pad.b); ctx.closePath();
      ctx.fillStyle=grad; ctx.fill();
      ctx.beginPath(); ctx.moveTo(px(0),py(vals[0]));
      vals.forEach((v,i)=>{if(i>0)ctx.lineTo(px(i),py(v));});
      ctx.strokeStyle='rgba(91,156,246,0.85)'; ctx.lineWidth=1.5; ctx.lineJoin='round'; ctx.stroke();
      const lv=vals[n-1];
      ctx.beginPath(); ctx.arc(px(n-1),py(lv),3.5,0,Math.PI*2);
      ctx.fillStyle='rgba(91,156,246,0.9)'; ctx.fill();
    };
    draw();
    const ro=new ResizeObserver(draw); ro.observe(canvas); return()=>ro.disconnect();
  }, [data, item]);

  const handleMouseMove = e => {
    if (!data.length) return;
    const canvas=canvasRef.current, rect=canvas.getBoundingClientRect();
    const xS=(rect.width-78)/(data.length-1||1);
    const idx=Math.max(0,Math.min(data.length-1,Math.round((e.clientX-rect.left-62)/xS)));
    const d=data[idx];
    if (d) {
      const v=parseFloat(d.valor??0);
      const isPct=item.formato==='pct';
      const vStr=isPct?v.toFixed(2)+'%':(item.unidad==='MM $'?'$'+(v/1000).toFixed(1)+' B':v.toLocaleString('es-AR'));
      setTooltip(`${d.fecha}  ·  ${vStr}`);
    }
  };

  if (!item) return null;
  return (
    <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:'12px',padding:'18px 20px',marginTop:'16px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px'}}>
        <div>
          <div style={{fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text3)'}}>{item.nombre} — historial</div>
          <div style={{fontSize:'11px',color:'var(--text2)',marginTop:'3px'}}>{item.unidad} · BCRA</div>
        </div>
        <div style={{display:'flex',gap:'4px'}}>
          {['1M','3M','6M','1A','MAX'].map(r=>(
            <button key={r} onClick={()=>setRange(r)}
              style={{fontFamily:'var(--mono)',fontSize:'9px',padding:'3px 10px',borderRadius:'4px',
                border:`1px solid ${r===range?'var(--accent)':'var(--line2)'}`,
                background:r===range?'var(--acc-bg)':'transparent',
                color:r===range?'var(--accent)':'var(--text3)',cursor:'pointer',transition:'all .12s'}}>
              {r}
            </button>
          ))}
        </div>
      </div>
      {loading
        ? <div style={{height:'200px',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text3)',fontFamily:'var(--mono)',fontSize:'11px'}}>Cargando…</div>
        : data.length===0
          ? <div style={{height:'200px',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text3)',fontFamily:'var(--mono)',fontSize:'11px'}}>Sin datos</div>
          : <>
              <canvas ref={canvasRef} style={{width:'100%',height:'200px',display:'block',cursor:'crosshair'}}
                onMouseMove={handleMouseMove} onMouseLeave={()=>setTooltip('')}/>
              <div style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text2)',minHeight:'14px',marginTop:'6px',textAlign:'center'}}>{tooltip}</div>
            </>
      }
      <div style={{fontFamily:'var(--mono)',fontSize:'8px',color:'var(--text3)',marginTop:'4px',textAlign:'right'}}>
        Fuente: BCRA · api.bcra.gob.ar/estadisticas/v4.0
      </div>
    </div>
  );
}

// ── Placeholder para histórico ────────────────────────────────
function HistoricoPlaceholder() {
  return (
    <div style={{
      marginTop:'16px', background:'var(--bg1)', border:'1px dashed var(--line2)',
      borderRadius:'12px', padding:'28px 20px', textAlign:'center',
      display:'flex', flexDirection:'column', alignItems:'center', gap:'8px',
    }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
      <span style={{fontFamily:'var(--mono)',fontSize:'10px',letterSpacing:'.08em',textTransform:'uppercase',color:'var(--text3)'}}>
        Seleccioná un indicador para ver el histórico
      </span>
    </div>
  );
}

// ── Histórico del Dólar ───────────────────────────────────────
const DOLAR_TIPOS = [
  { id: 'oficial',         label: 'Oficial',   adTipo: 'oficial'         },
  { id: 'blue',            label: 'Blue',       adTipo: 'blue'            },
  { id: 'bolsa',           label: 'MEP',        adTipo: 'bolsa'           },
  { id: 'contadoconliqui', label: 'CCL',        adTipo: 'contadoconliqui' },
  { id: 'mayorista',       label: 'Mayorista',  adTipo: 'mayorista'       },
  { id: 'cripto',          label: 'Cripto',     adTipo: 'cripto'          },
];

const DOLAR_COLORS = {
  oficial:         '#4d9ef0',
  blue:            '#f07070',
  bolsa:           '#56c97a',
  contadoconliqui: '#b07ef0',
  mayorista:       '#f0b840',
  cripto:          '#9ab0c4',
};

const DOLAR_HIST_RANGES = [
  { id: '1M',  months: 1   },
  { id: '3M',  months: 3   },
  { id: '6M',  months: 6   },
  { id: '1A',  months: 12  },
  { id: '2A',  months: 24  },
  { id: 'MAX', months: 999 },
];

function DolarHistorialChart() {
  const canvasRef    = useRef(null);
  const [activeTypes, setActiveTypes] = useState(['oficial', 'blue']);
  const [range,       setRange]       = useState('6M');
  const [allData,     setAllData]     = useState({});   // { tipo: [{fecha, venta}] }
  const [loading,     setLoading]     = useState(true);
  const [tooltip,     setTooltip]     = useState(null); // { fecha, vals, x }

  // Carga todos los tipos una sola vez (datos son ligeros, ~pocos KB cada uno)
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all(
      DOLAR_TIPOS.map(t =>
        fetchDolarHistorial(t.adTipo).then(r => ({ id: t.id, data: r.data }))
      )
    ).then(results => {
      if (cancelled) return;
      const next = {};
      results.forEach(({ id, data }) => {
        if (!Array.isArray(data)) return;
        next[id] = data.map(d => ({
          fecha: d.fecha,
          venta: parseFloat(d.venta ?? d.compra ?? 0),
        })).filter(d => d.venta > 0);
      });
      setAllData(next);
      setLoading(false);
    }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Filtra por rango
  const seriesData = React.useMemo(() => {
    const cfg = DOLAR_HIST_RANGES.find(r => r.id === range);
    const cutoff = cfg && cfg.months < 999
      ? (() => { const d = new Date(); d.setMonth(d.getMonth() - cfg.months); return d.toISOString().slice(0, 10); })()
      : null;
    const out = {};
    Object.entries(allData).forEach(([id, pts]) => {
      out[id] = cutoff ? pts.filter(p => p.fecha >= cutoff) : pts;
    });
    return out;
  }, [allData, range]);

  // Toggle tipo
  const toggleTipo = id => {
    setActiveTypes(prev =>
      prev.includes(id)
        ? prev.length > 1 ? prev.filter(t => t !== id) : prev
        : [...prev, id]
    );
  };

  // Dibuja canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const draw = () => {
      const dpr  = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width  = rect.width  * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      const W = rect.width, H = rect.height;
      const pad = { t: 20, r: 16, b: 32, l: 74 };

      const activeSeries = activeTypes
        .map(id => ({ id, color: DOLAR_COLORS[id], pts: seriesData[id] || [] }))
        .filter(s => s.pts.length >= 2);

      if (activeSeries.length === 0) return;

      // Eje X: fechas del tipo más largo
      const longest = activeSeries.reduce((a, b) => a.pts.length > b.pts.length ? a : b);
      const fechas = longest.pts.map(p => p.fecha);
      const n = fechas.length;

      // Escala Y global
      let vmin = Infinity, vmax = -Infinity;
      activeSeries.forEach(({ pts }) => {
        pts.forEach(p => {
          if (p.venta < vmin) vmin = p.venta;
          if (p.venta > vmax) vmax = p.venta;
        });
      });
      vmin *= 0.97; vmax *= 1.03;
      const rng = vmax - vmin || 1;

      const pxi = i => pad.l + (i / (n - 1)) * (W - pad.l - pad.r);
      const pyv = v => H - pad.b - ((v - vmin) / rng) * (H - pad.t - pad.b);

      // Grid horizontal
      for (let g = 0; g <= 4; g++) {
        const v = vmin + rng * g / 4;
        const y = pyv(v);
        ctx.strokeStyle = g === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 1;
        ctx.setLineDash(g === 0 ? [] : [3, 5]);
        ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(90,101,133,0.8)';
        ctx.font = '9px JetBrains Mono,monospace';
        ctx.textAlign = 'right';
        ctx.fillText('$' + Math.round(v).toLocaleString('es-AR'), pad.l - 5, y + 3);
      }

      // Labels eje X
      ctx.fillStyle = 'rgba(90,101,133,0.65)';
      ctx.font = '8px JetBrains Mono,monospace';
      ctx.textAlign = 'center';
      const step = Math.max(1, Math.floor(n / 6));
      fechas.forEach((f, i) => {
        if (i === 0 || i === n - 1 || i % step === 0) {
          const parts = (f || '').split('-');
          if (parts.length >= 2)
            ctx.fillText(MESES_C[+parts[1]] + "'" + parts[0].slice(-2), pxi(i), H - pad.b + 13);
        }
      });

      // Series
      activeSeries.forEach(({ id, color, pts }) => {
        // Interpolar valores al eje X (fecha del tipo más largo)
        const vals = fechas.map(f => {
          const exact = pts.find(p => p.fecha === f);
          if (exact) return exact.venta;
          const prev = pts.filter(p => p.fecha <= f).at(-1);
          return prev ? prev.venta : null;
        });

        if (vals.filter(Boolean).length < 2) return;

        // Fill
        const grad = ctx.createLinearGradient(0, pad.t, 0, H - pad.b);
        grad.addColorStop(0, color + '22');
        grad.addColorStop(1, color + '04');
        ctx.beginPath();
        let started = false;
        vals.forEach((v, i) => {
          if (v === null) return;
          if (!started) { ctx.moveTo(pxi(i), pyv(v)); started = true; }
          else ctx.lineTo(pxi(i), pyv(v));
        });
        ctx.lineTo(pxi(n - 1), H - pad.b);
        ctx.lineTo(pxi(0), H - pad.b);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        // Línea
        ctx.beginPath();
        started = false;
        vals.forEach((v, i) => {
          if (v === null) return;
          if (!started) { ctx.moveTo(pxi(i), pyv(v)); started = true; }
          else ctx.lineTo(pxi(i), pyv(v));
        });
        ctx.strokeStyle = color + 'cc';
        ctx.lineWidth = 1.5;
        ctx.lineJoin = 'round';
        ctx.stroke();

        // Punto final
        const lastIdx = vals.reduceRight((acc, v, i) => (acc === -1 && v !== null ? i : acc), -1);
        if (lastIdx >= 0) {
          ctx.beginPath();
          ctx.arc(pxi(lastIdx), pyv(vals[lastIdx]), 3.5, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
        }
      });
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [seriesData, activeTypes]);

  // Tooltip on hover
  const handleMouseMove = useCallback(e => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect    = canvas.getBoundingClientRect();
    const longest = activeTypes
      .map(id => seriesData[id] || [])
      .reduce((a, b) => a.length > b.length ? a : b, []);
    if (longest.length < 2) return;
    const n      = longest.length;
    const chartW = rect.width - 74 - 16;
    const idx    = Math.max(0, Math.min(n - 1, Math.round((e.clientX - rect.left - 74) / chartW * (n - 1))));
    const fecha  = longest[idx]?.fecha;
    if (!fecha) return;

    const vals = activeTypes.map(id => {
      const pts   = seriesData[id] || [];
      const exact = pts.find(p => p.fecha === fecha);
      const v     = exact ? exact.venta : (pts.filter(p => p.fecha <= fecha).at(-1)?.venta ?? null);
      return { id, v };
    }).filter(x => x.v !== null);

    // Clamp tooltip para que no se salga por la derecha
    const tipX = Math.min(e.clientX - rect.left + 14, rect.width - 160);
    setTooltip({ fecha, vals, x: tipX });
  }, [seriesData, activeTypes]);

  const handleMouseLeave = () => setTooltip(null);

  return (
    <div style={{
      background: 'var(--bg1)', border: '1px solid var(--line)',
      borderRadius: '12px', padding: '18px 20px', marginTop: '20px',
    }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'14px', flexWrap:'wrap', gap:'10px' }}>
        <div>
          <div style={{ fontFamily:'var(--mono)', fontSize:'9px', letterSpacing:'.1em', textTransform:'uppercase', color:'var(--text3)' }}>
            Histórico tipos de cambio
          </div>
          <div style={{ fontSize:'11px', color:'var(--text2)', marginTop:'3px' }}>Cotización venta · ARS/USD</div>
        </div>
        {/* Rangos */}
        <div style={{ display:'flex', gap:'4px' }}>
          {DOLAR_HIST_RANGES.map(r => (
            <button key={r.id} onClick={() => setRange(r.id)} style={{
              fontFamily:'var(--mono)', fontSize:'9px', padding:'3px 10px', borderRadius:'4px',
              cursor:'pointer', transition:'all .12s',
              border: `1px solid ${r.id === range ? 'var(--accent)' : 'var(--line2)'}`,
              background: r.id === range ? 'var(--acc-bg)' : 'transparent',
              color: r.id === range ? 'var(--accent)' : 'var(--text3)',
            }}>{r.id}</button>
          ))}
        </div>
      </div>

      {/* Toggle tipos */}
      <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'14px' }}>
        {DOLAR_TIPOS.map(t => {
          const active = activeTypes.includes(t.id);
          const color  = DOLAR_COLORS[t.id];
          return (
            <button key={t.id} onClick={() => toggleTipo(t.id)} style={{
              fontFamily:'var(--mono)', fontSize:'9px', padding:'3px 10px', borderRadius:'4px',
              cursor:'pointer', transition:'all .12s',
              border: `1px solid ${active ? color + '80' : 'var(--line)'}`,
              background: active ? color + '18' : 'transparent',
              color: active ? color : 'var(--text3)',
              display:'flex', alignItems:'center', gap:'5px',
            }}>
              <span style={{
                width:'7px', height:'7px', borderRadius:'50%', flexShrink:0, display:'inline-block',
                background: active ? color : 'var(--line2)',
              }}/>
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Canvas o spinner */}
      {loading ? (
        <div style={{ height:'240px', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text3)', fontFamily:'var(--mono)', fontSize:'11px' }}>
          Cargando histórico…
        </div>
      ) : (
        <div style={{ position:'relative' }}>
          <canvas
            ref={canvasRef}
            style={{ width:'100%', height:'240px', display:'block', cursor:'crosshair' }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          />
          {/* Tooltip flotante */}
          {tooltip && (
            <div style={{
              position:'absolute', left: tooltip.x, top:'10px',
              background:'var(--bg2)', border:'1px solid var(--line2)',
              borderRadius:'7px', padding:'7px 12px',
              pointerEvents:'none', fontFamily:'var(--mono)', zIndex:10, whiteSpace:'nowrap',
            }}>
              <div style={{ fontSize:'9px', color:'var(--text3)', marginBottom:'5px' }}>{tooltip.fecha}</div>
              {tooltip.vals.map(({ id, v }) => {
                const meta = DOLAR_TIPOS.find(t => t.id === id);
                return (
                  <div key={id} style={{ display:'flex', alignItems:'center', gap:'7px', marginBottom:'3px' }}>
                    <span style={{
                      width:'7px', height:'7px', borderRadius:'50%',
                      background: DOLAR_COLORS[id], display:'inline-block', flexShrink:0,
                    }}/>
                    <span style={{ fontSize:'10px', color:'var(--text2)', minWidth:'70px' }}>{meta?.label}</span>
                    <span style={{ fontSize:'13px', fontWeight:700, color:'var(--white)' }}>
                      ${Math.round(v).toLocaleString('es-AR')}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div style={{ fontFamily:'var(--mono)', fontSize:'8px', color:'var(--text3)', marginTop:'8px', textAlign:'right' }}>
        Fuente: ArgentinaDatos.com · cotización venta diaria
      </div>
    </div>
  );
}

// ── Tab: Dólares ──────────────────────────────────────────────
function TabDolares({ dolares, bcra }) {
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
  const dOf  = fDelta$(dolares?.deltaOf);
  const spOf = fSpread(dolares?.spreadOf);
  const spBlu= fSpread(dolares?.spreadBlu);

  const cambiario = bcra?.byCat?.['Cambiario'] ?? [];
  const [selectedCam, setSelectedCam] = useState(null);
  useEffect(() => { setSelectedCam(cambiario[0] ?? null); }, [bcra]);

  const fmtValorCam = item => {
    if (item.valor == null) return '—';
    const v = parseFloat(item.valor);
    if (item.unidad === '$/USD') return '$ ' + v.toLocaleString('es-AR', { minimumFractionDigits:2, maximumFractionDigits:2 });
    if (item.unidad === 'MM USD') return 'USD ' + v.toLocaleString('es-AR') + ' MM';
    return v.toLocaleString('es-AR', { maximumFractionDigits:2 });
  };
  const fmtDeltaCam = item => {
    if (item.valor == null || item.valorAnterior == null) return null;
    const d = parseFloat(item.valor) - parseFloat(item.valorAnterior);
    if (Math.abs(d) < 0.001) return null;
    return { txt: (d>0?'+':'')+d.toLocaleString('es-AR',{maximumFractionDigits:2})+' vs ant.', up: d>0 };
  };

  return (
    <div>
      {/* Cards tipos de cambio */}
      <div className="grid grid-3" style={{ marginBottom: '20px' }}>
        <div className="stat" style={{ transition: 'border-color .15s, background .15s' }}>
          <div style={{ fontSize: '15px', fontWeight: 400, color: 'var(--text2)', marginBottom: '8px', display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>Oficial BCRA <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', background: 'var(--bg3)', color: 'var(--text3)', padding: '1px 6px', borderRadius: '3px', border: '1px solid var(--line)' }}>vendedor</span></div>
          <div className="stat-val" style={{ fontSize: '24px', marginBottom: 0 }}>{pOf}</div>
          <div style={{ display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap',margin:'4px 0' }}>
            <span style={{ fontFamily:'var(--mono)',fontSize:'10px',fontWeight:600,
              color: dOf.cls==='up' ? 'var(--green)' : dOf.cls==='dn' ? 'var(--red)' : 'var(--text3)',
              background: dOf.cls==='up' ? 'var(--green-bg)' : dOf.cls==='dn' ? 'var(--red-bg)' : 'transparent',
              padding: dOf.cls==='fl' ? '0' : '1px 7px', borderRadius:'3px' }}>{dOf.txt}</span>
          </div>
          <div className="stat-meta">{spOf ? spOf + ' · ' : ''}crawling peg ~1%/mes</div>
        </div>
        <div className="stat" style={{ transition: 'border-color .15s, background .15s' }}>
          <div style={{ fontSize: '15px', fontWeight: 400, color: 'var(--text2)', marginBottom: '8px', display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>MEP / Bolsa <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', background: 'var(--bg3)', color: 'var(--text3)', padding: '1px 6px', borderRadius: '3px', border: '1px solid var(--line)' }}>AL30D</span></div>
          <div className="stat-val" style={{ fontSize: '24px', marginBottom: 0 }}>{pMep}</div>
          <div style={{ display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap',margin:'4px 0' }}>
            {dolares?.deltaMep != null && Math.abs(dolares.deltaMep) >= 1 ? (
              <span style={{ fontFamily:'var(--mono)',fontSize:'10px',fontWeight:600,
                color: dolares.deltaMep > 0 ? 'var(--green)' : 'var(--red)',
                background: dolares.deltaMep > 0 ? 'var(--green-bg)' : 'var(--red-bg)',
                padding:'1px 7px',borderRadius:'3px' }}>
                {(dolares.deltaMep > 0 ? '+' : '') + Math.round(dolares.deltaMep).toLocaleString('es-AR') + ' vs ant.'}
              </span>
            ) : (
              <span style={{ fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)' }}>brecha {bMep}</span>
            )}
          </div>
          <div className="stat-meta">Mercado secundario libre · legal</div>
        </div>
        <div className="stat" style={{ transition: 'border-color .15s, background .15s' }}>
          <div style={{ fontSize: '15px', fontWeight: 400, color: 'var(--text2)', marginBottom: '8px', display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>CCL <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', background: 'var(--bg3)', color: 'var(--text3)', padding: '1px 6px', borderRadius: '3px', border: '1px solid var(--line)' }}>GD30</span></div>
          <div className="stat-val" style={{ fontSize: '24px', marginBottom: 0 }}>{pCcl}</div>
          <div style={{ display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap',margin:'4px 0' }}>
            {dolares?.deltaCcl != null && Math.abs(dolares.deltaCcl) >= 1 ? (
              <span style={{ fontFamily:'var(--mono)',fontSize:'10px',fontWeight:600,
                color: dolares.deltaCcl > 0 ? 'var(--green)' : 'var(--red)',
                background: dolares.deltaCcl > 0 ? 'var(--green-bg)' : 'var(--red-bg)',
                padding:'1px 7px',borderRadius:'3px' }}>
                {(dolares.deltaCcl > 0 ? '+' : '') + Math.round(dolares.deltaCcl).toLocaleString('es-AR') + ' vs ant.'}
              </span>
            ) : (
              <span style={{ fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)' }}>brecha {bCcl}</span>
            )}
          </div>
          <div className="stat-meta">Contado con liquidación · exterior</div>
        </div>
        <div className="stat" style={{ transition: 'border-color .15s, background .15s' }}>
          <div style={{ fontSize: '15px', fontWeight: 400, color: 'var(--text2)', marginBottom: '8px', display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>Blue <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', background: 'var(--bg3)', color: 'var(--text3)', padding: '1px 6px', borderRadius: '3px', border: '1px solid var(--line)' }}>informal</span></div>
          <div className="stat-val" style={{ fontSize: '24px', marginBottom: 0 }}>{pBlu}</div>
          <div style={{ display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap',margin:'4px 0' }}>
            {dolares?.deltaBlu != null && Math.abs(dolares.deltaBlu) >= 1 ? (
              <span style={{ fontFamily:'var(--mono)',fontSize:'10px',fontWeight:600,
                color: dolares.deltaBlu > 0 ? 'var(--green)' : 'var(--red)',
                background: dolares.deltaBlu > 0 ? 'var(--green-bg)' : 'var(--red-bg)',
                padding:'1px 7px',borderRadius:'3px' }}>
                {(dolares.deltaBlu > 0 ? '+' : '') + Math.round(dolares.deltaBlu).toLocaleString('es-AR') + ' vs ant.'}
              </span>
            ) : (
              <span style={{ fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)' }}>brecha {bBlu}{spBlu ? ' · ' + spBlu : ''}</span>
            )}
          </div>
          <div className="stat-meta">Mercado paralelo · referencia</div>
        </div>
        <div className="stat" style={{ transition: 'border-color .15s, background .15s' }}>
          <div style={{ fontSize: '15px', fontWeight: 400, color: 'var(--text2)', marginBottom: '8px', display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>Cripto (USDT) <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', background: 'var(--bg3)', color: 'var(--text3)', padding: '1px 6px', borderRadius: '3px', border: '1px solid var(--line)' }}>—</span></div>
          <div className="stat-val" style={{ fontSize: '24px', marginBottom: 0 }}>{pCry}</div>
          <div style={{ display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap',margin:'4px 0' }}>
            {dolares?.deltaCry != null && Math.abs(dolares.deltaCry) >= 1 ? (
              <span style={{ fontFamily:'var(--mono)',fontSize:'10px',fontWeight:600,
                color: dolares.deltaCry > 0 ? 'var(--green)' : 'var(--red)',
                background: dolares.deltaCry > 0 ? 'var(--green-bg)' : 'var(--red-bg)',
                padding:'1px 7px',borderRadius:'3px' }}>
                {(dolares.deltaCry > 0 ? '+' : '') + Math.round(dolares.deltaCry).toLocaleString('es-AR') + ' vs ant.'}
              </span>
            ) : (
              <span style={{ fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)' }}>brecha {bCry}</span>
            )}
          </div>
          <div className="stat-meta">dolarapi.com · referencia</div>
        </div>
        <div className="stat" style={{ transition: 'border-color .15s, background .15s' }}>
          <div style={{ fontSize: '15px', fontWeight: 400, color: 'var(--text2)', marginBottom: '8px', display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>Dólar Mayorista <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', background: 'var(--bg3)', color: 'var(--text3)', padding: '1px 6px', borderRadius: '3px', border: '1px solid var(--line)' }}>BCRA</span></div>
          <div className="stat-val" style={{ fontSize: '24px', marginBottom: 0 }}>{pMay}</div>
          <div style={{ display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap',margin:'4px 0' }}>
            {dolares?.deltaMay != null && Math.abs(dolares.deltaMay) >= 1 ? (
              <span style={{ fontFamily:'var(--mono)',fontSize:'10px',fontWeight:600,
                color: dolares.deltaMay > 0 ? 'var(--green)' : 'var(--red)',
                background: dolares.deltaMay > 0 ? 'var(--green-bg)' : 'var(--red-bg)',
                padding:'1px 7px',borderRadius:'3px' }}>
                {(dolares.deltaMay > 0 ? '+' : '') + Math.round(dolares.deltaMay).toLocaleString('es-AR') + ' vs ant.'}
              </span>
            ) : (
              <span style={{ fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)' }}>tipo comprador · BCRA</span>
            )}
          </div>
          <div className="stat-meta">Referencia exportaciones · crawling peg</div>
        </div>
      </div>

      {/* Brecha cambiaria */}
      <div style={{ background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:'10px',overflow:'hidden',marginBottom:'14px' }}>
        <div style={{ padding:'12px 20px',borderBottom:'1px solid var(--line)',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
          <span style={{ fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.12em',textTransform:'uppercase',color:'var(--text3)' }}>
            Brecha cambiaria vs Oficial BCRA
          </span>
          <span style={{ fontFamily:'var(--mono)',fontSize:'8px',color:'var(--text3)' }}>ARS / USD</span>
        </div>
        {(() => {
          const items = [
            { n:'MEP / Bolsa', val:dolares?.pMep, brecha:dolares?.bMep, color:'#4d9ef0' },
            { n:'CCL',         val:dolares?.pCcl, brecha:dolares?.bCcl, color:'#4d9ef0' },
            { n:'Blue',        val:dolares?.pBlu, brecha:dolares?.bBlu, color:'#f07070' },
            { n:'Cripto USDT', val:dolares?.pCry, brecha:dolares?.bCry, color:'#9a9eb4' },
          ];
          const base = dolares?.pOf || 1;
          const allVals = [base, ...items.map(x => x.val || base)];
          const scaleMin = base * 0.97, scaleMax = Math.max(...allVals) * 1.02;
          const toX = v => Math.max(0, Math.min(100, ((v - scaleMin) / (scaleMax - scaleMin)) * 100));
          const baseX = toX(base);
          return (
            <div style={{ padding:'16px 20px 12px' }}>
              <div style={{ paddingLeft:'160px',marginBottom:'10px',position:'relative',height:'20px' }}>
                <div style={{ position:'absolute',left:`calc(160px + ${baseX}%)`,transform:'translateX(-50%)',whiteSpace:'nowrap' }}>
                  <span style={{ fontFamily:'var(--mono)',fontSize:'9px',color:'var(--accent)',fontWeight:600 }}>
                    Oficial ${Math.round(base).toLocaleString('es-AR')}
                  </span>
                </div>
              </div>
              {items.map((item, i) => {
                const price = item.val || base, posX = toX(price);
                const bStr  = item.brecha != null ? (item.brecha > 0 ? '+' : '') + item.brecha.toFixed(1).replace('.', ',') + '%' : '—';
                const bCol  = item.brecha != null && item.brecha < 0 ? '#56c97a' : item.color;
                return (
                  <div key={item.n} style={{ display:'flex',alignItems:'center',padding:'6px 0',borderTop:'1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ width:'160px',flexShrink:0 }}>
                      <div style={{ display:'flex',alignItems:'baseline',gap:'8px' }}>
                        <span style={{ fontSize:'11px',color:'var(--text3)' }}>{item.n}</span>
                        <span style={{ fontFamily:'var(--mono)',fontSize:'13px',fontWeight:700,color:'var(--white)' }}>
                          ${Math.round(price).toLocaleString('es-AR')}
                        </span>
                      </div>
                    </div>
                    <div style={{ flex:1,position:'relative',height:'24px' }}>
                      <div style={{ position:'absolute',top:'50%',left:0,right:0,height:'1px',background:'rgba(255,255,255,0.06)',transform:'translateY(-50%)' }}>
                        <div style={{ position:'absolute',left:`${baseX}%`,top:'-10px',bottom:'-10px',width:'1px',background:'rgba(77,158,240,0.35)' }}/>
                        {price !== base && (
                          <div style={{ position:'absolute',left:price>base?`${baseX}%`:`${posX}%`,width:`${Math.abs(posX-baseX)}%`,top:'-1px',height:'3px',background:item.color,opacity:0.45,borderRadius:'2px' }}/>
                        )}
                      </div>
                      <div style={{ position:'absolute',left:`${posX}%`,top:'50%',transform:'translate(-50%,-50%)',width:'9px',height:'9px',borderRadius:'50%',background:item.color,boxShadow:`0 0 6px ${item.color}99`,border:'1.5px solid rgba(255,255,255,0.15)' }}/>
                    </div>
                    <div style={{ width:'64px',textAlign:'right',flexShrink:0 }}>
                      <span style={{ fontFamily:'var(--mono)',fontSize:'12px',fontWeight:700,color:bCol }}>{bStr}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
        <div style={{ padding:'8px 20px',borderTop:'1px solid var(--line)',background:'var(--bg2)' }}>
          <span style={{ fontFamily:'var(--mono)',fontSize:'8px',color:'var(--text3)' }}>
            Fuente: DolarApi.com · BCRA · % = brecha respecto al tipo de cambio oficial
          </span>
        </div>
      </div>

      {/* ── Histórico del dólar ── */}
      <DolarHistorialChart />

      {/* Cambiario BCRA con histórico */}
      {cambiario.length > 0 && (
        <div style={{ marginTop:'20px' }}>
          <div style={{ fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text3)',marginBottom:'10px' }}>
            Cambiario BCRA · reservas y tipos de cambio oficiales · seleccioná para ver historial
          </div>
          <div className="grid grid-3" style={{ marginBottom:'4px' }}>
            {cambiario.map(item => {
              const delta = fmtDeltaCam(item);
              const isSelected = selectedCam?.key === item.key;
              return (
                <div key={item.key} className="stat"
                  onClick={() => setSelectedCam(isSelected ? null : item)}
                  style={{ cursor:'pointer', transition:'background .15s' }}
                  onMouseEnter={e => { if(!isSelected) e.currentTarget.style.background='var(--bg2)'; }}
                  onMouseLeave={e => { if(!isSelected) e.currentTarget.style.background=''; }}>
                  <div style={{ fontSize: '15px', fontWeight: 400, color: 'var(--text2)', marginBottom: '8px', display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
                    {item.nombre}
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', background: 'var(--bg3)', color: 'var(--text3)', padding: '1px 6px', borderRadius: '3px', border: '1px solid var(--line)' }}>{item.unidad}</span>
                    {isSelected && <span style={{ fontFamily:'var(--mono)',fontSize:'7px',background:'var(--acc-bg)',color:'var(--accent)',padding:'1px 5px',borderRadius:'3px',border:'1px solid rgba(91,156,246,.2)',marginLeft:'4px' }}>GRAF ▾</span>}
                  </div>
                  <div className="stat-val" style={{ fontSize: '24px', marginBottom: 0 }}>{fmtValorCam(item)}</div>
                  <div style={{ display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap',margin:'4px 0' }}>
                    {delta ? (
                      <span style={{ fontFamily:'var(--mono)',fontSize:'10px',fontWeight:600,
                        color: delta.up ? 'var(--green)' : 'var(--red)',
                        background: delta.up ? 'var(--green-bg)' : 'var(--red-bg)',
                        padding:'1px 7px',borderRadius:'3px' }}>{delta.txt}</span>
                    ) : (
                      <span style={{ fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)' }}>sin variación</span>
                    )}
                    <span style={{ fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)' }}>{fmtFecha(item.fecha)}</span>
                  </div>
                  <div className="stat-meta">BCRA</div>
                </div>
              );
            })}
          </div>
          {selectedCam ? <BcraHistorialChart item={selectedCam}/> : <HistoricoPlaceholder/>}
        </div>
      )}

      <div className="source" style={{ marginTop:'12px' }}>Fuente: DolarApi.com · BCRA · ArgentinaDatos.com · api.bcra.gob.ar</div>
    </div>
  );
}

// ── Tab: Tasas ────────────────────────────────────────────────
const TASA_META = {
  badlar_tna:         { label: 'BADLAR Privados', color: '#5b9cf6', desc: 'Depósitos mayoristas +$1MM · referencia del mercado' },
  badlar_tea:         { label: 'BADLAR TEA',      color: '#4d9ef0', desc: 'Tasa efectiva anual equivalente a BADLAR' },
  tamar_tna:          { label: 'TAMAR TNA',       color: '#7c6af5', desc: 'Tasa activa moneda nacional' },
  tamar_tea:          { label: 'TAMAR TEA',       color: '#9a7cf5', desc: 'Tasa activa efectiva anual' },
  tasa_depositos_30d: { label: 'Depósitos 30d',   color: '#56c97a', desc: 'Tasa de depósitos a 30 días' },
  tasa_prestamos:     { label: 'Préstamos',        color: '#f0b840', desc: 'Tasa de préstamos al sector privado' },
};

const TASAS_EXCLUIDAS = new Set(['tasa_justicia']);

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}

function TasaCard({ item, isSelected, onClick }) {
  if (!item) return null;
  const meta = TASA_META[item.key] || {};
  const v    = item.valor != null ? parseFloat(item.valor) : null;
  const vP   = item.valorAnterior != null ? parseFloat(item.valorAnterior) : null;
  const delta = v != null && vP != null ? v - vP : null;
  const valStr  = v != null ? v.toLocaleString('es-AR', { minimumFractionDigits:2, maximumFractionDigits:2 }) + '%' : '—';
  const deltaStr = delta != null && Math.abs(delta) >= 0.001
    ? (delta > 0 ? '+' : '') + delta.toFixed(2).replace('.',',') + ' pp'
    : null;
  const accent = meta.color || 'var(--accent)';
  const rgb    = accent.startsWith('#') ? hexToRgb(accent) : '91,156,246';

  return (
    <div
      className="stat"
      onClick={onClick}
      style={{
        cursor: 'pointer',
        borderColor: isSelected ? 'var(--accent)' : undefined,
        background: isSelected ? 'var(--bg2)' : undefined,
        transition: 'border-color .15s, background .15s',
        position: 'relative',
      }}
      onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.borderColor='var(--line2)'; }}}
      onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.borderColor=''; }}}>

      <div style={{ fontSize:'15px',fontWeight:400,color:'var(--text2)',marginBottom:'8px',display:'flex',justifyContent:'space-between',alignItems:'flex-start' }}>
        <span>{meta.label || item.nombre}</span>
        {isSelected ? (
          <span style={{ fontFamily:'var(--mono)',fontSize:'7px',background:'var(--acc-bg)',color:'var(--accent)',padding:'1px 5px',borderRadius:'3px',border:'1px solid rgba(91,156,246,.2)',flexShrink:0,marginLeft:'6px' }}>GRAF ▾</span>
        ) : (
          <span style={{ fontFamily:'var(--mono)',fontSize:'9px',background:'var(--bg3)',color:'var(--text3)',padding:'1px 5px',borderRadius:'3px',border:'1px solid var(--line)',flexShrink:0,marginLeft:'6px' }}>{item.unidad}</span>
        )}
      </div>

      <div style={{ display:'flex',alignItems:'baseline',gap:'10px',flexWrap:'wrap',marginBottom:'10px' }}>
        <div style={{ fontFamily:'var(--mono)',fontSize:'24px',fontWeight:700,color:'var(--white)',lineHeight:1,letterSpacing:'-0.02em' }}>
          {valStr}
        </div>
        {deltaStr ? (
          <span style={{ fontFamily:'var(--mono)',fontSize:'11px',fontWeight:600,
            color: delta > 0 ? 'var(--green)' : 'var(--red)',
            background: delta > 0 ? 'var(--green-bg)' : 'var(--red-bg)',
            padding:'2px 8px',borderRadius:'4px' }}>
            {deltaStr}
          </span>
        ) : (
          <span style={{ fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)' }}>sin variación</span>
        )}
      </div>

      <div className="stat-meta">{fmtFecha(item.fecha)} · {item.unidad}</div>
      {meta.desc && (
        <div className="stat-meta" style={{ marginTop:'3px' }}>{meta.desc}</div>
      )}
    </div>
  );
}

function SubTabBCRA({ bcra }) {
  const allTasasBCRA = bcra?.byCat?.['Tasas'] ?? [];
  const tasasBCRA = allTasasBCRA.filter(t => !TASAS_EXCLUIDAS.has(t.key));
  const [selectedTasa, setSelectedTasa] = useState(null);
  useEffect(() => { setSelectedTasa(tasasBCRA[0] ?? null); }, [bcra]);

  return (
    <div>
      {tasasBCRA.length > 0 ? (
        <>
          <div style={{ fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.12em',textTransform:'uppercase',color:'var(--text3)',marginBottom:'14px',display:'flex',alignItems:'center',gap:'10px' }}>
            <span>Tasas de referencia BCRA · seleccioná para ver historial</span>
            <div style={{ flex:1,height:'1px',background:'var(--line)' }}/>
          </div>

          <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'12px',marginBottom:'4px' }}>
            {tasasBCRA.map(item => (
              <TasaCard key={item.key} item={item}
                isSelected={selectedTasa?.key === item.key}
                onClick={() => setSelectedTasa(selectedTasa?.key === item.key ? null : item)}
              />
            ))}
          </div>

          {selectedTasa ? <BcraHistorialChart item={selectedTasa}/> : <HistoricoPlaceholder/>}
        </>
      ) : (
        <div style={{ color:'var(--text3)',fontFamily:'var(--mono)',fontSize:'11px',textAlign:'center',padding:'40px' }}>Cargando tasas BCRA…</div>
      )}
      <div className="source" style={{ marginTop:'12px' }}>Fuente: BCRA · api.bcra.gob.ar/estadisticas/v4.0 · Frecuencia: diaria</div>
    </div>
  );
}

function SubTabBancos({ tasas }) {
  const plazoFijo = tasas?.plazoFijo ?? [];
  const sortedPF  = [...plazoFijo]
    .filter(e => e.tnaClientes || e.tnaNoClientes)
    .sort((a, b) => toTNA(b.tnaClientes || b.tnaNoClientes) - toTNA(a.tnaClientes || a.tnaNoClientes));

  return (
    <div>
      <div style={{ fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.12em',textTransform:'uppercase',color:'var(--text3)',marginBottom:'14px',display:'flex',alignItems:'center',gap:'10px' }}>
        <span>Plazo fijo por entidad · BCRA</span>
        <div style={{ flex:1,height:'1px',background:'var(--line)' }}/>
      </div>

      <div style={{ background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:'10px',overflow:'hidden',marginBottom:'14px' }}>
        <div style={{ display:'grid',gridTemplateColumns:'32px 1fr 140px 140px',padding:'10px 18px',background:'var(--bg2)',borderBottom:'1px solid var(--line)',alignItems:'center' }}>
          <span/>
          <span style={{ fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)',letterSpacing:'.08em' }}>
            ENTIDAD · {sortedPF.length > 0 ? `${sortedPF.length} bancos` : 'cargando…'} · plazo fijo 30 días
          </span>
          <span style={{ fontFamily:'var(--mono)',fontSize:'9px',color:'var(--accent)',textAlign:'right',letterSpacing:'.06em' }}>TNA CLIENTES</span>
          <span style={{ fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)',textAlign:'right',letterSpacing:'.06em' }}>TNA NO-CLIENTES</span>
        </div>
        {sortedPF.length === 0 ? (
          <div style={{ color:'var(--text3)',fontFamily:'var(--mono)',fontSize:'11px',textAlign:'center',padding:'32px' }}>Cargando datos de tasas…</div>
        ) : (
          <div style={{ maxHeight:'500px',overflowY:'auto' }}>
            {(() => {
              const maxTNA = toTNA(sortedPF[0]?.tnaClientes || sortedPF[0]?.tnaNoClientes) || 1;
              let rank = 1, nextRank = 2;
              const ranks = sortedPF.map((e, i) => {
                if (i === 0) { rank = 1; nextRank = 2; return 1; }
                const prev = toTNA(sortedPF[i-1]?.tnaClientes || sortedPF[i-1]?.tnaNoClientes);
                const curr = toTNA(e.tnaClientes || e.tnaNoClientes);
                if (curr < prev) { rank = nextRank; }
                nextRank = rank + 1;
                return rank;
              });
              return sortedPF.map((e, i) => {
                const tna = toTNA(e.tnaClientes), tnaNC = toTNA(e.tnaNoClientes);
                const pct = Math.min(100, (tna / maxTNA) * 100);
                const isTop = ranks[i] === 1;
                return (
                  <div key={i}
                    style={{ display:'grid',gridTemplateColumns:'36px 1fr 140px 140px',padding:'10px 18px',borderBottom:i<sortedPF.length-1?'1px solid rgba(255,255,255,0.04)':'none',background:isTop?'rgba(86,201,122,0.06)':'transparent',alignItems:'center',cursor:'default' }}
                    onMouseEnter={ev => ev.currentTarget.style.background='rgba(77,158,240,0.06)'}
                    onMouseLeave={ev => ev.currentTarget.style.background=isTop?'rgba(86,201,122,0.06)':'transparent'}>
                    <div style={{ textAlign:'center' }}>
                      <span style={{ fontFamily:'var(--mono)',fontSize:'11px',fontWeight:isTop?700:400,color:isTop?'var(--green)':'var(--text3)' }}>{ranks[i]}</span>
                    </div>
                    <div>
                      <div style={{ fontSize:'12px',fontWeight:isTop?700:500,color:isTop?'var(--white)':'var(--text2)',marginBottom:'5px' }}>
                        {e.entidad || '—'}
                        {isTop && <span style={{ marginLeft:'7px',fontSize:'9px',background:'rgba(86,201,122,.2)',color:'var(--green)',padding:'1px 6px',borderRadius:'3px',fontWeight:400 }}>MEJOR</span>}
                      </div>
                      <div style={{ height:'3px',width:'100%',maxWidth:'200px',background:'var(--bg3)',borderRadius:'2px',overflow:'hidden' }}>
                        <div style={{ width:`${pct}%`,height:'100%',background:isTop?'var(--green)':'rgba(77,158,240,0.55)',borderRadius:'2px' }}/>
                      </div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <span style={{ fontFamily:'var(--mono)',fontSize:'15px',fontWeight:700,color:isTop?'var(--green)':'var(--white)' }}>
                        {tna > 0 ? fTNA(tna) : '—'}
                      </span>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <span style={{ fontFamily:'var(--mono)',fontSize:'13px',color:tnaNC>0&&tnaNC!==tna?'var(--text2)':'var(--text3)' }}>
                        {tnaNC > 0 && tnaNC !== tna ? fTNA(tnaNC) : '—'}
                      </span>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}
        <div style={{ padding:'9px 18px',borderTop:'1px solid var(--line)',background:'var(--bg2)',display:'flex',justifyContent:'space-between' }}>
          <span style={{ fontFamily:'var(--mono)',fontSize:'8px',color:'var(--text3)' }}>TNA = Tasa Nominal Anual · Plazo fijo 30 días</span>
          <span style={{ fontFamily:'var(--mono)',fontSize:'8px',color:'var(--text3)' }}>Fuente: BCRA · ArgentinaDatos.com · Frecuencia: diaria</span>
        </div>
      </div>
      <div className="source">Fuente: BCRA · ArgentinaDatos.com</div>
    </div>
  );
}

const TASAS_SUBTABS = [
  { id: 'bcra',   label: 'Tasas BCRA'   },
  { id: 'bancos', label: 'Tasas Bancos' },
];

function TabTasas({ bcra, tasas }) {
  const [subTab, setSubTab] = useState('bcra');

  return (
    <div>
      <div style={{ display:'flex',gap:'6px',marginBottom:'20px',borderBottom:'1px solid var(--line)',paddingBottom:'0' }}>
        {TASAS_SUBTABS.map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)} style={{
            fontFamily:'var(--mono)',fontSize:'10px',letterSpacing:'.06em',textTransform:'uppercase',
            padding:'6px 16px',borderRadius:'6px 6px 0 0',cursor:'pointer',
            border:'1px solid transparent',borderBottom:'none',
            background: subTab===t.id ? 'var(--bg2)' : 'transparent',
            color: subTab===t.id ? 'var(--white)' : 'var(--text3)',
            borderColor: subTab===t.id ? 'var(--line)' : 'transparent',
            marginBottom:'-1px',
            transition:'all .15s',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'bcra'   && <SubTabBCRA   bcra={bcra}/>}
      {subTab === 'bancos' && <SubTabBancos tasas={tasas}/>}
    </div>
  );
}

// ── Tab: UVA e Índices ────────────────────────────────────────
function TabUvaIndices({ uva, bcra }) {
  const uvaHistory   = uva?.history ?? [];
  const uvaDelta     = uva?.valor && uva?.prev ? uva.valor - uva.prev : null;
  const uvaDeltaDisp = uvaDelta != null
    ? (uvaDelta >= 0 ? '+$' : '−$') + Math.abs(uvaDelta).toFixed(2).replace('.', ',') + ' vs ayer'
    : '—';
  const uvaVar30 = uvaHistory.length >= 2 ? (() => {
    const oldest = parseFloat(uvaHistory[0]?.valor ?? 0);
    const newest = parseFloat(uvaHistory[uvaHistory.length-1]?.valor ?? 0);
    return oldest > 0 ? ((newest - oldest) / oldest * 100) : null;
  })() : null;
  const uvaChartSeries = uvaHistory.length >= 2
    ? [{ label:'UVA', color:'#4d9ef0', data: uvaHistory.map(d => parseFloat(d.valor ?? 0)) }]
    : null;
  const uvaChartLabels = uvaHistory.map(d => {
    const [,,dd,mm] = (d.fecha||'').match(/(\d{4})-(\d{2})-(\d{2})/) || [];
    return dd && mm ? dd+'/'+mm : '';
  });

  const indices = bcra?.byCat?.['Indices'] ?? [];
  const [selectedIdx, setSelectedIdx] = useState(null);
  useEffect(() => { setSelectedIdx(indices[0] ?? null); }, [bcra]);

  const fmtValorIdx = item => {
    if (item.valor == null) return '—';
    const v = parseFloat(item.valor);
    if (item.formato === 'pct') return v.toLocaleString('es-AR', { minimumFractionDigits:2, maximumFractionDigits:2 }) + '%';
    return v.toLocaleString('es-AR', { maximumFractionDigits:4 });
  };
  const fmtDeltaIdx = item => {
    if (item.valor == null || item.valorAnterior == null) return null;
    const d = parseFloat(item.valor) - parseFloat(item.valorAnterior);
    if (Math.abs(d) < 0.0001) return null;
    return { txt: (d>0?'+':'')+d.toLocaleString('es-AR',{maximumFractionDigits:4}), up: d>0 };
  };

  const uvaValor = bcra?.byKey?.uva?.valor != null
    ? '$ ' + parseFloat(bcra.byKey.uva.valor).toLocaleString('es-AR', { minimumFractionDigits:2, maximumFractionDigits:2 })
    : uva?.valor
      ? '$ ' + uva.valor.toLocaleString('es-AR', { minimumFractionDigits:2, maximumFractionDigits:2 })
      : 'actualizando…';

  const uvaDeltaFinal = (() => {
    if (bcra?.byKey?.uva?.valor != null && bcra?.byKey?.uva?.valorAnterior != null) {
      const d = parseFloat(bcra.byKey.uva.valor) - parseFloat(bcra.byKey.uva.valorAnterior);
      return (d >= 0 ? '+$ ' : '−$ ') + Math.abs(d).toFixed(2).replace('.', ',') + ' vs ayer';
    }
    return uvaDeltaDisp;
  })();
  const uvaDeltaUp = uvaDelta != null ? uvaDelta >= 0 : true;
  const uvaFechaRaw = bcra?.byKey?.uva?.fecha ?? uva?.fecha ?? null;
  const uvaFechaDisp = (() => { if (!uvaFechaRaw) return null; const [y,m,d] = uvaFechaRaw.split('-'); return `${d}/${m}/${y}`; })();

  return (
    <div>
      {indices.length > 0 && (
        <>
          <div style={{ fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.12em',textTransform:'uppercase',color:'var(--text3)',marginBottom:'14px',display:'flex',alignItems:'center',gap:'10px' }}>
            <span>Índices de actualización BCRA · seleccioná para ver historial</span>
            <div style={{ flex:1,height:'1px',background:'var(--line)' }}/>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'12px',marginBottom:'4px' }}>
            {indices.map(item => {
              const delta = fmtDeltaIdx(item);
              const isSelected = selectedIdx?.key === item.key;
              return (
                <div key={item.key} className="stat"
                  onClick={() => setSelectedIdx(isSelected ? null : item)}
                  style={{ cursor:'pointer', transition:'background .15s' }}
                  onMouseEnter={e => { if(!isSelected) e.currentTarget.style.background='var(--bg2)'; }}
                  onMouseLeave={e => { if(!isSelected) e.currentTarget.style.background=''; }}>
                  <div style={{ fontSize: '15px', fontWeight: 400, color: 'var(--text2)', marginBottom: '8px', display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
                    {item.nombre}
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', background: 'var(--bg3)', color: 'var(--text3)', padding: '1px 6px', borderRadius: '3px', border: '1px solid var(--line)' }}>{item.unidad}</span>
                    {isSelected && <span style={{ fontFamily:'var(--mono)',fontSize:'7px',background:'var(--acc-bg)',color:'var(--accent)',padding:'1px 5px',borderRadius:'3px',border:'1px solid rgba(91,156,246,.2)',marginLeft:'4px' }}>GRAF ▾</span>}
                  </div>
                  <div className="stat-val" style={{ fontSize: '24px', marginBottom: 0 }}>{fmtValorIdx(item)}</div>
                  <div style={{ display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap',margin:'4px 0' }}>
                    {delta ? (
                      <span style={{ fontFamily:'var(--mono)',fontSize:'10px',fontWeight:600,
                        color: delta.up ? 'var(--green)' : 'var(--red)',
                        background: delta.up ? 'var(--green-bg)' : 'var(--red-bg)',
                        padding:'1px 7px',borderRadius:'3px' }}>{delta.txt} vs ant.</span>
                    ) : (
                      <span style={{ fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)' }}>sin variación</span>
                    )}
                    <span style={{ fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)' }}>{fmtFecha(item.fecha)}</span>
                  </div>
                  <div className="stat-meta">BCRA</div>
                </div>
              );
            })}
          </div>
          {selectedIdx ? <BcraHistorialChart item={selectedIdx}/> : <HistoricoPlaceholder/>}
        </>
      )}

      <div className="source" style={{ marginTop:'12px' }}>Fuente: BCRA · ArgentinaDatos.com · api.bcra.gob.ar/estadisticas/v4.0 · Frecuencia: diaria</div>
    </div>
  );
}

// ── FinancieroPage principal ──────────────────────────────────
const FIN_TABS = [
  { id:'dolares', label:'Dólares'       },
  { id:'tasas',   label:'Tasas'         },
  { id:'uva',     label:'UVA & Índices' },
];

export function FinancieroPage({ goPage, dolares, uva, tasas, bcra, loadBcra, apiStatus, reloadAll }) {
  const [activeTab, setActiveTab] = useState('dolares');

  useEffect(() => { if (!bcra) loadBcra?.(); }, [bcra, loadBcra]);

  const pOf  = dolares?.pOf  ? f$(dolares.pOf)  : '…';
  const pBlu = dolares?.pBlu ? f$(dolares.pBlu) : '…';
  const bBlu = dolares?.bBlu != null ? fP(dolares.bBlu) : '—';
  const badlarItem = bcra?.byCat?.['Tasas']?.find(t => t.key === 'badlar_tna');
  const badlarVal  = badlarItem?.valor != null
    ? parseFloat(badlarItem.valor).toFixed(1).replace('.',',') + '%'
    : '—';
  const uvaVal = bcra?.byKey?.uva?.valor != null
    ? '$ ' + parseFloat(bcra.byKey.uva.valor).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2})
    : uva?.valor
      ? '$ ' + uva.valor.toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2})
      : '—';

  const fmtFechaCorta = f => { if (!f) return null; const [y,m,d] = (f||'').split('-'); return `${d}/${m}/${y}`; };

  // Deltas KPI — uvaItem declarado ANTES de fechaUva
  const dOfKpi  = dolares?.deltaOf  != null ? dolares.deltaOf  : null;
  const dBluKpi = dolares?.deltaBlu != null ? dolares.deltaBlu : null;
  const dBadlar = badlarItem?.valor != null && badlarItem?.valorAnterior != null
    ? parseFloat(badlarItem.valor) - parseFloat(badlarItem.valorAnterior) : null;
  const uvaItem = bcra?.byKey?.uva;
  const dUva    = uvaItem?.valor != null && uvaItem?.valorAnterior != null
    ? parseFloat(uvaItem.valor) - parseFloat(uvaItem.valorAnterior) : null;

  const fechaUva     = fmtFechaCorta(uvaItem?.fecha ?? uva?.fecha);
  const fechaBadlar  = fmtFechaCorta(badlarItem?.fecha);
  const fechaDolares = dolares?.fecha ? fmtFechaCorta(dolares.fecha) : null;

  const kpiDeltaBadge = (delta, fmt) => {
    if (delta == null || Math.abs(delta) < 0.001) return <span style={{ fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)' }}>sin variación</span>;
    const txt = fmt(delta);
    return (
      <span style={{ fontFamily:'var(--mono)',fontSize:'10px',fontWeight:600,
        color: delta > 0 ? 'var(--green)' : 'var(--red)',
        background: delta > 0 ? 'var(--green-bg)' : 'var(--red-bg)',
        padding:'1px 7px',borderRadius:'3px' }}>{txt}</span>
    );
  };

  return (
    <div className="page-enter">
      <ApiErrorBanner
        keys={['dolares','uva','tasas','bcra']}
        apiStatus={apiStatus}
        labels={{ dolares:'Dólares', uva:'UVA', tasas:'Tasas', bcra:'BCRA' }}
        onRetry={reloadAll}
      />
      <div className="ph">
        <div>
          <div className="ph-title">Financiero <span className="help-pip" onClick={() => goPage('ayuda','glosario-financiero')} title="Ayuda">?</span></div>
          <div className="ph-sub">Dólares · Tasas · UVA & Índices</div>
        </div>
        <div className="ph-right" style={{ fontFamily:'var(--mono)',fontSize:'11px',color:'var(--text3)' }}>
          DolarApi · BCRA · ArgentinaDatos
        </div>
      </div>

      {/* KPI resumen */}
      <div className="section">
        <div className="section-title">Indicadores clave · resumen</div>
        <div className="grid grid-4">
          <div className="stat" style={{ cursor: 'pointer', transition: 'border-color .15s, background .15s' }}
            onClick={() => setActiveTab('dolares')}
            onMouseEnter={e => e.currentTarget.style.background='var(--bg2)'}
            onMouseLeave={e => e.currentTarget.style.background='var(--bg1)'}>
            <div style={{ fontSize: '15px', fontWeight: 400, color: 'var(--text2)', marginBottom: '8px', display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>Dólar Oficial <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', background: 'var(--bg3)', color: 'var(--text3)', padding: '1px 6px', borderRadius: '3px', border: '1px solid var(--line)' }}>BCRA</span></div>
            <div className="stat-val" style={{ fontSize: '24px', marginBottom: 0 }}>{pOf}</div>
            <div style={{ display:'flex',alignItems:'center',gap:'8px',margin:'4px 0' }}>
              {kpiDeltaBadge(dOfKpi, d => (d>0?'+$':'-$')+Math.abs(Math.round(d)).toLocaleString('es-AR')+' vs ant.')}
            </div>
            <div className="stat-meta">BCRA · DolarApi</div>
          </div>
          <div className="stat" style={{ cursor: 'pointer', transition: 'border-color .15s, background .15s' }}
            onClick={() => setActiveTab('dolares')}
            onMouseEnter={e => e.currentTarget.style.background='var(--bg2)'}
            onMouseLeave={e => e.currentTarget.style.background='var(--bg1)'}>
            <div style={{ fontSize: '15px', fontWeight: 400, color: 'var(--text2)', marginBottom: '8px', display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>Brecha Blue <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', background: 'var(--bg3)', color: 'var(--text3)', padding: '1px 6px', borderRadius: '3px', border: '1px solid var(--line)' }}>HOY</span></div>
            <div className="stat-val" style={{ fontSize: '24px', marginBottom: 0 }}>{bBlu}</div>
            <div style={{ display:'flex',alignItems:'center',gap:'8px',margin:'4px 0' }}>
              {kpiDeltaBadge(dBluKpi, d => (d>0?'+$':'-$')+Math.abs(Math.round(d)).toLocaleString('es-AR')+' vs ant.')}
            </div>
            <div className="stat-meta">Mercado paralelo · referencia</div>
          </div>
          <div className="stat" style={{ cursor: 'pointer', transition: 'border-color .15s, background .15s' }}
            onClick={() => setActiveTab('tasas')}
            onMouseEnter={e => e.currentTarget.style.background='var(--bg2)'}
            onMouseLeave={e => e.currentTarget.style.background='var(--bg1)'}>
            <div style={{ fontSize: '15px', fontWeight: 400, color: 'var(--text2)', marginBottom: '8px', display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>BADLAR Privados <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', background: 'var(--bg3)', color: 'var(--text3)', padding: '1px 6px', borderRadius: '3px', border: '1px solid var(--line)' }}>TNA</span></div>
            <div className="stat-val" style={{ fontSize: '24px', marginBottom: 0 }}>{badlarVal}</div>
            <div style={{ display:'flex',alignItems:'center',gap:'8px',margin:'4px 0' }}>
              {kpiDeltaBadge(dBadlar, d => (d>0?'+':'')+d.toFixed(2).replace('.',',')+' pp vs ant.')}
            </div>
            <div className="stat-meta">BCRA · referencia</div>
          </div>
          <div className="stat" style={{ cursor: 'pointer', transition: 'border-color .15s, background .15s' }}
            onClick={() => setActiveTab('uva')}
            onMouseEnter={e => e.currentTarget.style.background='var(--bg2)'}
            onMouseLeave={e => e.currentTarget.style.background='var(--bg1)'}>
            <div style={{ fontSize: '15px', fontWeight: 400, color: 'var(--text2)', marginBottom: '8px', display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>Valor UVA <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', background: fechaUva ? 'var(--acc-bg)' : 'var(--bg3)', color: fechaUva ? 'var(--accent)' : 'var(--text3)', padding: '1px 6px', borderRadius: '3px', border: fechaUva ? '1px solid rgba(91,156,246,.2)' : '1px solid var(--line)' }}>{fechaUva ?? '…'}</span></div>
            <div className="stat-val" style={{ fontSize: '24px', marginBottom: 0 }}>{uvaVal}</div>
            <div style={{ display:'flex',alignItems:'center',gap:'8px',margin:'4px 0' }}>
              {kpiDeltaBadge(dUva, d => (d>0?'+$':'-$')+Math.abs(d).toFixed(2).replace('.',',')+' vs ant.')}
            </div>
            <div className="stat-meta">BCRA oficial</div>
          </div>
        </div>
      </div>

      {/* Subtabs */}
      <div className="tabs">
        {FIN_TABS.map(t => (
          <button key={t.id} className={`tab${activeTab===t.id?' active':''}`} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="section">
        {activeTab==='dolares' && <TabDolares  dolares={dolares} bcra={bcra}/>}
        {activeTab==='tasas'   && <TabTasas    bcra={bcra} tasas={tasas}/>}
        {activeTab==='uva'     && <TabUvaIndices uva={uva} bcra={bcra}/>}
      </div>
    </div>
  );
}
