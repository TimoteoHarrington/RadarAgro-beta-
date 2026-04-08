// FinancieroPage.jsx — subtabs: Dólares · Tasas · UVA & Índices
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ApiErrorBanner } from '../ui/StatCard';
import { CanvasChart } from '../ui/CanvasChart';

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

      {/* Cambiario BCRA con histórico */}
      {cambiario.length > 0 && (
        <div style={{ marginTop:'8px' }}>
          <div style={{ fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text3)',marginBottom:'10px' }}>
            Cambiario BCRA · reservas y tipos de cambio oficiales · seleccioná para ver historial
          </div>
          <div className="grid grid-3" style={{ marginBottom:'4px' }}>
            {cambiario.map(item => {
              const delta = fmtDeltaCam(item);
              const isSelected = selectedCam?.key === item.key;
              return (
                <div key={item.key} className="stat c-flat"
                  onClick={() => setSelectedCam(isSelected ? null : item)}
                  style={{ cursor:'pointer',borderColor:isSelected?'var(--accent)':'',transition:'border-color .15s' }}
                  onMouseEnter={e => { if(!isSelected) e.currentTarget.style.borderColor='var(--line2)'; }}
                  onMouseLeave={e => { if(!isSelected) e.currentTarget.style.borderColor=''; }}>
                  <div className="stat-label">
                    {item.nombre}
                    <span className="stat-badge fl">{item.unidad}</span>
                    {isSelected && <span style={{ fontFamily:'var(--mono)',fontSize:'7px',background:'var(--acc-bg)',color:'var(--accent)',padding:'1px 5px',borderRadius:'3px',border:'1px solid rgba(91,156,246,.2)',marginLeft:'4px' }}>GRAF</span>}
                  </div>
                  <div className="stat-val">{fmtValorCam(item)}</div>
                  {delta
                    ? <div className={`stat-delta ${delta.up?'up':'dn'}`}>{delta.txt}</div>
                    : <div className="stat-delta fl">sin variación</div>}
                  <div className="stat-meta">BCRA · {fmtFecha(item.fecha)}</div>
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

// Helper hex → rgb
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}

// Card uniforme para tasas BCRA
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
    <div onClick={onClick} style={{
      position: 'relative', cursor: 'pointer', overflow: 'hidden',
      background: isSelected
        ? `linear-gradient(145deg, rgba(${rgb},0.14) 0%, var(--bg2) 100%)`
        : 'var(--bg1)',
      border: '1px solid var(--line)',
      borderRadius: '12px', padding: '16px 18px',
      transition: 'all .18s ease',
      boxShadow: isSelected ? `0 0 20px rgba(${rgb},0.08)` : 'none',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      minHeight: '130px',
    }}
    onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.background='var(--bg2)'; }}}
    onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.background='var(--bg1)'; }}}>
      {/* barra superior de color */}
      <div style={{ position:'absolute',top:0,left:0,right:0,height:'3px',background:accent,opacity:isSelected?1:0.4,borderRadius:'12px 12px 0 0' }}/>

      {/* cabecera */}
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'10px' }}>
        <div>
          <div style={{ fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text3)',marginBottom:'2px' }}>
            {meta.label || item.nombre}
          </div>
          <div style={{ fontSize:'9px',color:'var(--text3)',opacity:0.6 }}>{item.unidad}</div>
        </div>
        {isSelected && (
          <span style={{ fontFamily:'var(--mono)',fontSize:'7px',background:`rgba(${rgb},.18)`,color:accent,padding:'2px 6px',borderRadius:'3px',border:`1px solid rgba(${rgb},.25)`,flexShrink:0 }}>
            HIST ↓
          </span>
        )}
      </div>

      {/* valor */}
      <div style={{ fontFamily:'var(--mono)',fontSize:'26px',fontWeight:700,color:'var(--white)',lineHeight:1,marginBottom:'8px',letterSpacing:'-0.02em' }}>
        {valStr}
      </div>

      {/* delta + fecha */}
      <div style={{ display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap' }}>
        {deltaStr ? (
          <span style={{ fontFamily:'var(--mono)',fontSize:'10px',fontWeight:600,
            color: delta > 0 ? 'var(--green)' : 'var(--red)',
            background: delta > 0 ? 'var(--green-bg)' : 'var(--red-bg)',
            padding:'1px 7px',borderRadius:'3px' }}>
            {deltaStr} vs ant.
          </span>
        ) : (
          <span style={{ fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)' }}>sin variación</span>
        )}
        <span style={{ fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)' }}>{fmtFecha(item.fecha)}</span>
      </div>

      {/* desc */}
      {meta.desc && (
        <div style={{ marginTop:'8px',fontSize:'10px',color:'var(--text3)',lineHeight:1.35,opacity:0.8 }}>{meta.desc}</div>
      )}
    </div>
  );
}

// Subtab: Tasas BCRA
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

          {/* Grilla uniforme — todas las cards iguales */}
          <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'12px',marginBottom:'4px' }}>
            {tasasBCRA.map(item => (
              <TasaCard key={item.key} item={item}
                isSelected={selectedTasa?.key === item.key}
                onClick={() => setSelectedTasa(selectedTasa?.key === item.key ? null : item)}
              />
            ))}
          </div>

          {/* Gráfico histórico */}
          {selectedTasa ? <BcraHistorialChart item={selectedTasa}/> : <HistoricoPlaceholder/>}
        </>
      ) : (
        <div style={{ color:'var(--text3)',fontFamily:'var(--mono)',fontSize:'11px',textAlign:'center',padding:'40px' }}>Cargando tasas BCRA…</div>
      )}
      <div className="source" style={{ marginTop:'12px' }}>Fuente: BCRA · api.bcra.gob.ar/estadisticas/v4.0 · Frecuencia: diaria</div>
    </div>
  );
}

// Subtab: Tasas bancos (plazo fijo)
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

      {/* Tabla completa */}
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
      {/* Subtabs internos */}
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

  // Índices BCRA
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

  return (
    <div>
      {/* Índices BCRA clickeables con histórico */}
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
                <div key={item.key} className="stat c-flat"
                  onClick={() => setSelectedIdx(isSelected ? null : item)}
                  style={{ cursor:'pointer',borderColor:isSelected?'var(--accent)':'',transition:'border-color .15s' }}
                  onMouseEnter={e => { if(!isSelected) e.currentTarget.style.borderColor='var(--line2)'; }}
                  onMouseLeave={e => { if(!isSelected) e.currentTarget.style.borderColor=''; }}>
                  <div className="stat-label">
                    {item.nombre}
                    <span className="stat-badge fl">{item.unidad}</span>
                    {isSelected && <span style={{ fontFamily:'var(--mono)',fontSize:'7px',background:'var(--acc-bg)',color:'var(--accent)',padding:'1px 5px',borderRadius:'3px',border:'1px solid rgba(91,156,246,.2)',marginLeft:'4px' }}>GRAF</span>}
                  </div>
                  <div className="stat-val">{fmtValorIdx(item)}</div>
                  {delta
                    ? <div className={`stat-delta ${delta.up?'up':'dn'}`}>{delta.txt}</div>
                    : <div className="stat-delta fl">—</div>}
                  <div className="stat-meta">BCRA · {fmtFecha(item.fecha)}</div>
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

  // KPIs resumen cabecera
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
          {[
            { lbl:'Dólar Oficial',   badge:'BCRA', val:pOf,       sub:`Blue: ${pBlu}`,              meta:'BCRA · DolarApi',               tab:'dolares' },
            { lbl:'Brecha Blue',     badge:'HOY',  val:bBlu,      sub:`vs Oficial ${pOf}`,           meta:'Mercado paralelo · referencia', tab:'dolares' },
            { lbl:'BADLAR Privados', badge:'TNA',  val:badlarVal, sub:'tasa depósitos mayoristas',   meta:'BCRA · referencia',             tab:'tasas'   },
            { lbl:'Valor UVA',       badge:'HOY',  val:uvaVal,    sub:'base 1.000 = mar 2016',       meta:'BCRA oficial',                  tab:'uva'     },
          ].map((k, i) => (
            <div key={i} className="stat c-flat" style={{ cursor:'pointer',transition:'border-color .15s' }}
              onClick={() => setActiveTab(k.tab)}
              onMouseEnter={e => e.currentTarget.style.borderColor='var(--line2)'}
              onMouseLeave={e => e.currentTarget.style.borderColor='var(--line)'}>
              <div className="stat-label">{k.lbl} <span className="stat-badge fl">{k.badge}</span></div>
              <div className="stat-val">{k.val}</div>
              <div className="stat-delta fl">{k.sub}</div>
              <div className="stat-meta">{k.meta}</div>
            </div>
          ))}
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
