// MacroPage.jsx — subtabs: Inflación · Act. Económica · Riesgo País · Monetario
import React, { useRef, useEffect, useState } from 'react';
import { ApiErrorBanner } from '../ui/StatCard';
import { CanvasChart } from '../ui/CanvasChart';

const MESES_C = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const MESES_F = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const CHART_PALETTE = [
  'rgba(91,156,246,0.92)','rgba(74,191,120,0.90)','rgba(250,185,50,0.88)',
  'rgba(100,210,195,0.88)','rgba(170,120,240,0.86)','rgba(240,130,70,0.86)',
  'rgba(60,190,230,0.85)','rgba(230,90,130,0.82)','rgba(130,210,90,0.84)',
  'rgba(80,140,230,0.82)','rgba(240,200,60,0.80)','rgba(50,200,165,0.82)',
  'rgba(200,100,200,0.78)','rgba(110,180,255,0.80)',
];

const PAISES_REGIONAL = [
  { nombre:'Brasil',    iso:'bra', fallback:201  },
  { nombre:'México',    iso:'mex', fallback:236  },
  { nombre:'Colombia',  iso:'col', fallback:274  },
  { nombre:'Chile',     iso:'chl', fallback:97   },
  { nombre:'Perú',      iso:'per', fallback:128  },
  { nombre:'Uruguay',   iso:'ury', fallback:70   },
  { nombre:'Ecuador',   iso:'ecu', fallback:490  },
  { nombre:'Paraguay',  iso:'pry', fallback:126  },
  { nombre:'Bolivia',   iso:'bol', fallback:517  },
  { nombre:'Venezuela', iso:'ven', fallback:9625 },
];

function getRiskLabel(pb) {
  if (pb >= 600) return { label:'MUY ALTO', bg:'var(--red-bg)',   color:'var(--red)'   };
  if (pb >= 350) return { label:'ALTO',     bg:'var(--red-bg)',   color:'var(--red)'   };
  if (pb >= 200) return { label:'MEDIO',    bg:'var(--gold-bg)',  color:'var(--gold)'  };
  if (pb >= 120) return { label:'MODERADO', bg:'var(--green-bg)', color:'var(--green)' };
  return               { label:'BAJO',      bg:'var(--green-bg)', color:'var(--green)' };
}

function useRiesgoRegional(rpArgentina) {
  const [data, setData]     = useState({});
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    async function fetchAll() {
      setLoading(true);
      try {
        const r = await fetch('/api/riesgo-pais-latam');
        if (!r.ok) throw new Error();
        const j = await r.json();
        if (cancelled) return;
        const map = {};
        (j.data ?? []).forEach(p => { map[p.iso] = p.pb; });
        setData(map);
      } catch {
        // En caso de error total, dejamos data vacío y los fallbacks de PAISES_REGIONAL se usan
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchAll();
    return () => { cancelled = true; };
  }, []);
  const argVal  = rpArgentina != null ? Math.round(rpArgentina) : 0;
  const allVals = [argVal, ...PAISES_REGIONAL.map(p => data[p.iso] ?? p.fallback)].filter(Boolean);
  const maxVal  = allVals.length ? Math.max(...allVals) : 1;
  return { data, loading, maxVal };
}

// ── IPC Bar Chart ─────────────────────────────────────────────
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
      const pad = { t:24, r:8, b:36, l:8 };
      const vals = slice.map(d => parseFloat(d.valor||0));
      const maxV = Math.max(...vals)*1.1||1;
      const n = slice.length, totalW = W-pad.l-pad.r;
      const barW = Math.floor(totalW/n*0.72), gap = totalW/n;
      [1,2,3,4,5,6].forEach(gv => {
        if (gv > maxV) return;
        const y = H-pad.b-(gv/maxV)*(H-pad.t-pad.b);
        ctx.strokeStyle='rgba(255,255,255,0.04)'; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(pad.l,y); ctx.lineTo(W-pad.r,y); ctx.stroke();
        ctx.fillStyle='rgba(90,101,133,0.7)'; ctx.font='8px JetBrains Mono,monospace'; ctx.textAlign='left';
        ctx.fillText(gv+'%', pad.l+2, y-3);
      });
      const minVal=Math.min(...vals), maxVal2=Math.max(...vals);
      slice.forEach((d,i) => {
        const v=parseFloat(d.valor||0);
        const fp=(d.fecha||'').split('-');
        const lbl=fp[1]?MESES_C[+fp[1]]+(i===0||fp[1]==='01'?" '"+fp[0].slice(-2):''):'';
        const isL=i===n-1, x=pad.l+i*gap+(gap-barW)/2;
        const barH=Math.max(3,(v/maxV)*(H-pad.t-pad.b)), y=H-pad.b-barH;
        const alpha=0.28+Math.min(0.52,(v-minVal)/((maxVal2-minVal)||1)*0.52);
        const grad=ctx.createLinearGradient(0,y,0,H-pad.b);
        grad.addColorStop(0,isL?'rgba(91,156,246,0.92)':`rgba(91,156,246,${alpha})`);
        grad.addColorStop(1,'rgba(91,156,246,0.04)');
        ctx.fillStyle=grad; ctx.beginPath();
        if(ctx.roundRect)ctx.roundRect(x,y,barW,barH,[2,2,0,0]); else ctx.rect(x,y,barW,barH);
        ctx.fill();
        if(isL){ ctx.fillStyle='rgba(91,156,246,0.9)'; ctx.font='bold 9px JetBrains Mono,monospace'; ctx.textAlign='center'; ctx.fillText(v.toFixed(1).replace('.',',')+"%",x+barW/2,y-5); }
        ctx.fillStyle=isL?'rgba(91,156,246,0.85)':'rgba(90,101,133,0.65)';
        ctx.font='7px JetBrains Mono,monospace'; ctx.textAlign='center';
        ctx.save(); ctx.translate(x+barW/2,H-pad.b+8); ctx.rotate(-Math.PI/4); ctx.fillText(lbl,0,0); ctx.restore();
      });
    };
    draw();
    const ro=new ResizeObserver(draw); ro.observe(canvas); return ()=>ro.disconnect();
  },[data]);
  const handleMouseMove = e => {
    if(!data?.length)return;
    const slice=data.slice(-18), canvas=canvasRef.current, rect=canvas.getBoundingClientRect();
    const gap=(rect.width-16)/slice.length;
    const idx=Math.max(0,Math.min(slice.length-1,Math.floor((e.clientX-rect.left-8)/gap)));
    const d=slice[idx]; if(d){const fp=(d.fecha||'').split('-'); setTooltip(MESES_F[+fp[1]]+' '+fp[0]+': '+parseFloat(d.valor||0).toFixed(1).replace('.',',')+"%");}
  };
  return (
    <div>
      <canvas ref={canvasRef} style={{width:'100%',height:'160px',display:'block',cursor:'crosshair'}} onMouseMove={handleMouseMove} onMouseLeave={()=>setTooltip('')}/>
      <div style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text2)',minHeight:'14px',marginTop:'8px',textAlign:'center'}}>{tooltip}</div>
    </div>
  );
}

// ── IPC Heatmap ───────────────────────────────────────────────
function IpcHeatmap({ data }) {
  const [tip, setTip] = useState('');
  if(!data?.length)return<div style={{color:'var(--text3)',fontFamily:'var(--mono)',fontSize:'10px',textAlign:'center',padding:'20px'}}>Cargando…</div>;
  const byYear={};
  data.forEach(d=>{
    const yr=(d.fecha||'').slice(0,4), m=+((d.fecha||'').split('-')[1]||0);
    if(!yr||!m)return; if(!byYear[yr])byYear[yr]=Array(12).fill(null);
    byYear[yr][m-1]=parseFloat(d.valor||0);
  });
  const years=Object.keys(byYear).sort().slice(-5);
  const allVals=data.map(d=>parseFloat(d.valor||0)).filter(v=>!isNaN(v)&&v>0).sort((a,b)=>a-b);
  const p10=allVals[Math.floor(allVals.length*0.10)]||0;
  const p90=allVals[Math.floor(allVals.length*0.90)]||allVals[allVals.length-1]||1;
  const getColor=v=>{
    if(v==null)return null;
    const t=Math.min(1,Math.max(0,(v-p10)/(p90-p10)));
    let r,g,b;
    if(t<0.33){const s=t/0.33;r=Math.round(30+s*215);g=Math.round(200-s*40);b=Math.round(60-s*55);}
    else if(t<0.66){const s=(t-0.33)/0.33;r=245;g=Math.round(160-s*110);b=5;}
    else{const s=(t-0.66)/0.34;r=Math.round(245-s*15);g=Math.round(50-s*45);b=Math.round(5+s*10);}
    return{rgb:`${r},${g},${b}`,t};
  };
  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'38px repeat(12,1fr)',gap:'4px',alignItems:'center'}}>
        <div/>{MESES_C.slice(1).map(m=><div key={m} style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)',textAlign:'center',paddingBottom:'4px'}}>{m}</div>)}
        {years.map(yr=>(
          <React.Fragment key={yr}>
            <div style={{fontFamily:'var(--mono)',fontSize:'10px',color:'var(--text3)',textAlign:'right',paddingRight:'8px',fontWeight:600}}>{yr}</div>
            {byYear[yr].map((v,m)=>{
              const c=getColor(v);
              if(!c)return<div key={m} style={{background:'var(--bg3)',borderRadius:'4px',height:'34px',opacity:0.3}}/>;
              const alpha=0.30+c.t*0.62, vStr=v.toFixed(1).replace('.',','), label=`${MESES_C[m+1]} ${yr}: ${vStr}%`;
              return(
                <div key={m} title={label} style={{background:`rgba(${c.rgb},${alpha})`,borderRadius:'4px',height:'34px',display:'flex',alignItems:'center',justifyContent:'center',cursor:'default',border:`1px solid rgba(${c.rgb},${Math.min(1,alpha+0.1)})`,transition:'filter .12s'}}
                  onMouseEnter={e=>{e.currentTarget.style.filter='brightness(1.2)';setTip(label);}}
                  onMouseLeave={e=>{e.currentTarget.style.filter='';setTip('');}}>
                  <span style={{fontFamily:'var(--mono)',fontSize:'10px',fontWeight:700,color:'rgba(237,241,252,0.88)'}}>{vStr}</span>
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
      <div style={{fontFamily:'var(--mono)',fontSize:'10px',color:'var(--text2)',minHeight:'16px',marginTop:'10px',textAlign:'center'}}>{tip}</div>
    </div>
  );
}

// ── Riesgo País Line Chart ────────────────────────────────────
function RiesgoPaisChart({ history, range }) {
  const canvasRef=useRef(null); const [tooltip,setTooltip]=useState('');
  const getSlice=()=>{ if(!history?.length)return[]; if(range==='3M')return history.slice(-90); if(range==='6M')return history.slice(-180); if(range==='1A')return history.slice(-365); return history; };
  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas)return;
    const series=getSlice(); if(!series.length)return;
    const draw=()=>{
      const dpr=window.devicePixelRatio||1, rect=canvas.getBoundingClientRect();
      canvas.width=rect.width*dpr; canvas.height=rect.height*dpr;
      const ctx=canvas.getContext('2d'); ctx.scale(dpr,dpr);
      const W=rect.width,H=rect.height,pad={t:14,r:16,b:30,l:56};
      const vals=series.map(d=>parseFloat(d.valor??0));
      const vmin=Math.max(0,Math.min(...vals)*0.9), vmax=Math.max(...vals)*1.08;
      const n=series.length, xS=(W-pad.l-pad.r)/(n-1||1), yS=(H-pad.t-pad.b)/(vmax-vmin||1);
      const px=i=>pad.l+i*xS, py=v=>H-pad.b-(v-vmin)*yS;
      for(let i=0;i<=4;i++){
        const v=vmin+(vmax-vmin)*i/4, y=py(v);
        ctx.strokeStyle=i===0?'rgba(255,255,255,0.1)':'rgba(255,255,255,0.04)';
        ctx.lineWidth=1; ctx.setLineDash(i===0?[]:[3,5]);
        ctx.beginPath(); ctx.moveTo(pad.l,y); ctx.lineTo(W-pad.r,y); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle='rgba(90,101,133,0.75)'; ctx.font='9px JetBrains Mono,monospace'; ctx.textAlign='right';
        ctx.fillText(Math.round(v).toLocaleString('es-AR'),pad.l-5,y+3);
      }
      ctx.fillStyle='rgba(90,101,133,0.6)'; ctx.font='8px JetBrains Mono,monospace'; ctx.textAlign='center';
      const step=Math.max(1,Math.floor(n/7));
      series.forEach((d,i)=>{if(i===0||i===n-1||i%step===0){const fp=(d.fecha||'').split('-');if(fp.length>=2)ctx.fillText(MESES_C[+fp[1]]+"'"+fp[0].slice(-2),px(i),H-pad.b+13);}});
      const grad=ctx.createLinearGradient(0,pad.t,0,H-pad.b);
      grad.addColorStop(0,'rgba(224,92,92,0.16)'); grad.addColorStop(1,'rgba(224,92,92,0.01)');
      ctx.beginPath(); ctx.moveTo(px(0),py(vals[0])); vals.forEach((v,i)=>{if(i>0)ctx.lineTo(px(i),py(v));});
      ctx.lineTo(px(n-1),H-pad.b); ctx.lineTo(px(0),H-pad.b); ctx.closePath(); ctx.fillStyle=grad; ctx.fill();
      ctx.beginPath(); ctx.moveTo(px(0),py(vals[0])); vals.forEach((v,i)=>{if(i>0)ctx.lineTo(px(i),py(v));});
      ctx.strokeStyle='rgba(224,92,92,0.80)'; ctx.lineWidth=1.5; ctx.lineJoin='round'; ctx.stroke();
      const lv=vals[n-1];
      ctx.beginPath(); ctx.arc(px(n-1),py(lv),3.5,0,Math.PI*2); ctx.fillStyle='rgba(224,92,92,0.88)'; ctx.fill();
      ctx.fillStyle='rgba(224,92,92,0.85)'; ctx.font='bold 10px JetBrains Mono,monospace'; ctx.textAlign='right';
      ctx.fillText(Math.round(lv).toLocaleString('es-AR')+' pb',px(n-1)-7,py(lv)-6);
    };
    draw(); const ro=new ResizeObserver(draw); ro.observe(canvas); return()=>ro.disconnect();
  },[history,range]);
  const handleMouseMove=e=>{
    const series=getSlice(); if(!series.length)return;
    const canvas=canvasRef.current, rect=canvas.getBoundingClientRect();
    const xS=(rect.width-72)/(series.length-1||1);
    const idx=Math.max(0,Math.min(series.length-1,Math.round((e.clientX-rect.left-56)/xS)));
    const d=series[idx]; if(d)setTooltip(`${d.fecha}  ·  ${Math.round(parseFloat(d.valor??0)).toLocaleString('es-AR')} pb`);
  };
  if(!history?.length)return<div style={{height:'200px',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text3)',fontFamily:'var(--mono)',fontSize:'11px'}}>Cargando…</div>;
  return (
    <div>
      <canvas ref={canvasRef} style={{width:'100%',height:'200px',display:'block',cursor:'crosshair'}} onMouseMove={handleMouseMove} onMouseLeave={()=>setTooltip('')}/>
      <div style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text2)',minHeight:'14px',marginTop:'6px',textAlign:'center'}}>{tooltip}</div>
    </div>
  );
}

// ── PBI Bar Chart ─────────────────────────────────────────────
function PbiBarChart({ history }) {
  const canvasRef=useRef(null); const [tooltip,setTooltip]=useState('');
  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas||!history?.length)return;
    const slice=history.slice(-16);
    const draw=()=>{
      const dpr=window.devicePixelRatio||1, rect=canvas.getBoundingClientRect();
      canvas.width=rect.width*dpr; canvas.height=rect.height*dpr;
      const ctx=canvas.getContext('2d'); ctx.scale(dpr,dpr);
      const W=rect.width,H=rect.height,pad={t:28,r:12,b:40,l:44};
      const vals=slice.map(d=>parseFloat(d.valor||0));
      const maxV=Math.max(Math.max(...vals)*1.25,1), minV=Math.min(Math.min(...vals)*1.25,-1);
      const range=maxV-minV, n=slice.length, totalW=W-pad.l-pad.r;
      const barW=Math.floor(totalW/n*0.70), gap=totalW/n;
      const zeroY=H-pad.b-(0-minV)/range*(H-pad.t-pad.b);
      [-4,-2,0,2,4,6,8].forEach(gv=>{
        if(gv>maxV||gv<minV)return;
        const y=H-pad.b-(gv-minV)/range*(H-pad.t-pad.b);
        ctx.strokeStyle=gv===0?'rgba(255,255,255,0.14)':'rgba(255,255,255,0.04)';
        ctx.lineWidth=gv===0?1.5:1; ctx.setLineDash(gv===0?[]:[3,5]);
        ctx.beginPath(); ctx.moveTo(pad.l,y); ctx.lineTo(W-pad.r,y); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle='rgba(90,101,133,0.6)'; ctx.font='8px JetBrains Mono,monospace'; ctx.textAlign='right';
        ctx.fillText((gv>=0?'+':'')+gv+'%',pad.l-4,y+3);
      });
      slice.forEach((d,i)=>{
        const v=parseFloat(d.valor||0), pos=v>=0, fp=(d.fecha||'').split('-');
        const q=Math.ceil(+(fp[1]||3)/3), lbl=`Q${q}'${(fp[0]||'').slice(-2)}`, isL=i===n-1;
        const x=pad.l+i*gap+(gap-barW)/2, barH=Math.max(2,Math.abs(v)/range*(H-pad.t-pad.b));
        const y=pos?zeroY-barH:zeroY;
        const grad=ctx.createLinearGradient(0,y,0,y+barH);
        if(pos){grad.addColorStop(0,isL?'rgba(74,191,120,0.88)':'rgba(74,191,120,0.52)');grad.addColorStop(1,'rgba(74,191,120,0.04)');}
        else{grad.addColorStop(0,isL?'rgba(224,92,92,0.82)':'rgba(224,92,92,0.48)');grad.addColorStop(1,'rgba(224,92,92,0.03)');}
        ctx.fillStyle=grad; ctx.beginPath();
        if(ctx.roundRect){if(pos)ctx.roundRect(x,y,barW,barH,[2,2,0,0]);else ctx.roundRect(x,y,barW,barH,[0,0,2,2]);}
        else ctx.rect(x,y,barW,barH); ctx.fill();
        if(isL){ctx.fillStyle=pos?'rgba(74,191,120,0.9)':'rgba(224,92,92,0.85)';ctx.font='bold 9px JetBrains Mono,monospace';ctx.textAlign='center';ctx.fillText((v>=0?'+':'')+v.toFixed(1).replace('.',',')+"%",x+barW/2,pos?y-5:y+barH+12);}
        ctx.fillStyle=isL?(pos?'rgba(74,191,120,0.85)':'rgba(224,92,92,0.8)'):'rgba(90,101,133,0.55)';
        ctx.font='7px JetBrains Mono,monospace'; ctx.textAlign='center';
        ctx.save(); ctx.translate(x+barW/2,H-pad.b+9); ctx.rotate(-Math.PI/4); ctx.fillText(lbl,0,0); ctx.restore();
      });
    };
    draw(); const ro=new ResizeObserver(draw); ro.observe(canvas); return()=>ro.disconnect();
  },[history]);
  const handleMouseMove=e=>{
    if(!history?.length)return;
    const slice=history.slice(-16), canvas=canvasRef.current, rect=canvas.getBoundingClientRect();
    const gap=(rect.width-56)/slice.length;
    const idx=Math.max(0,Math.min(slice.length-1,Math.floor((e.clientX-rect.left-44)/gap)));
    const d=slice[idx]; if(d){const v=parseFloat(d.valor||0),fp=(d.fecha||'').split('-');setTooltip(`Q${Math.ceil(+(fp[1]||3)/3)} ${fp[0]}  ·  ${v>=0?'+':''}${v.toFixed(1).replace('.',',')}%`);}
  };
  return (
    <div>
      <canvas ref={canvasRef} style={{width:'100%',height:'220px',display:'block',cursor:'crosshair'}} onMouseMove={handleMouseMove} onMouseLeave={()=>setTooltip('')}/>
      <div style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text2)',minHeight:'14px',marginTop:'6px',textAlign:'center'}}>{tooltip}</div>
    </div>
  );
}

// ── PBI Donut Chart ───────────────────────────────────────────
function PbiDonutChart({ items }) {
  const canvasRef=useRef(null); const [hovered,setHovered]=useState(null);
  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas||!items.length)return;
    const draw=()=>{
      const dpr=window.devicePixelRatio||1, rect=canvas.getBoundingClientRect();
      canvas.width=rect.width*dpr; canvas.height=rect.height*dpr;
      const ctx=canvas.getContext('2d'); ctx.scale(dpr,dpr);
      const W=rect.width,H=rect.height,cx=W/2,cy=H/2;
      const R=Math.min(W,H)/2-8, r=R*0.55;
      const total=items.reduce((s,x)=>s+x.share,0); let angle=-Math.PI/2;
      items.forEach((item,i)=>{
        const sweep=(item.share/total)*Math.PI*2, isH=hovered===i, rO=isH?R+5:R;
        ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,rO,angle,angle+sweep); ctx.closePath();
        ctx.fillStyle=CHART_PALETTE[i%CHART_PALETTE.length]; ctx.globalAlpha=isH?1.0:0.82; ctx.fill(); ctx.globalAlpha=1;
        ctx.strokeStyle='rgba(24,27,34,0.85)'; ctx.lineWidth=isH?2:1.5;
        ctx.beginPath(); ctx.arc(cx,cy,rO,angle,angle+sweep); ctx.stroke(); angle+=sweep;
      });
      ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fillStyle='#191d2b'; ctx.fill();
      ctx.textAlign='center'; ctx.textBaseline='middle';
      if(hovered!=null&&items[hovered]){
        const it=items[hovered];
        ctx.fillStyle=CHART_PALETTE[hovered%CHART_PALETTE.length];
        ctx.font=`bold ${Math.floor(r*0.34)}px JetBrains Mono,monospace`; ctx.fillText(it.share.toFixed(1)+'%',cx,cy-8);
        ctx.fillStyle='rgba(138,151,184,0.8)'; ctx.font=`${Math.floor(r*0.15)}px Inter,sans-serif`;
        const words=it.nombre.split(' ');let line='',lines=[];
        for(const w of words){const t=line?line+' '+w:w;if(t.length>15){lines.push(line);line=w;}else line=t;}
        lines.push(line); lines.slice(0,2).forEach((l,li)=>ctx.fillText(l,cx,cy+12+li*13));
      }else{
        ctx.fillStyle='rgba(90,101,133,0.8)'; ctx.font=`${Math.floor(r*0.18)}px JetBrains Mono,monospace`;
        ctx.fillText('% PBI',cx,cy-4); ctx.font=`${Math.floor(r*0.13)}px JetBrains Mono,monospace`;
        ctx.fillText('por sector',cx,cy+12);
      }
    };
    draw(); const ro=new ResizeObserver(draw); ro.observe(canvas); return()=>ro.disconnect();
  },[items,hovered]);
  const handleMouseMove=e=>{
    const canvas=canvasRef.current,rect=canvas.getBoundingClientRect();
    const mx=e.clientX-rect.left-rect.width/2, my=e.clientY-rect.top-rect.height/2;
    const dist=Math.sqrt(mx*mx+my*my), R=Math.min(rect.width,rect.height)/2-8, r=R*0.55;
    if(dist<r||dist>R+12){setHovered(null);return;}
    let angle=Math.atan2(my,mx)+Math.PI/2; if(angle<0)angle+=Math.PI*2;
    const total=items.reduce((s,x)=>s+x.share,0); let acc=0;
    for(let i=0;i<items.length;i++){acc+=(items[i].share/total)*Math.PI*2;if(angle<=acc){setHovered(i);return;}}
    setHovered(null);
  };
  return <canvas ref={canvasRef} style={{width:'100%',height:'100%',display:'block',cursor:'crosshair'}} onMouseMove={handleMouseMove} onMouseLeave={()=>setHovered(null)}/>;
}

// ── Tab: Inflación ────────────────────────────────────────────
function TabInflacion({ inflacion }) {
  const mensData=inflacion?.history??[], iaData=inflacion?.iaHistory??[];
  const lastIPC=mensData[mensData.length-1], prevIPC=mensData[mensData.length-2];
  const ipcVal=inflacion?.ipcMensual??(lastIPC?parseFloat(lastIPC.valor||0):null);
  const ipcIA=inflacion?.ipcInteranual??inflacion?.valor??null;
  const ipcExp=inflacion?.ipcEsperado??null;
  const ipcFp=((inflacion?.ipcFecha??lastIPC?.fecha)||'').split('-');
  const ipcMes=ipcFp[1]?MESES_C[+ipcFp[1]]+' '+ipcFp[0]:'—';
  const ipcDiff=(()=>{const c=ipcVal,p=prevIPC?parseFloat(prevIPC.valor||0):null;return c!=null&&p!=null?c-p:null;})();
  const acumAnio=(()=>{
    const yr=new Date().getFullYear().toString();
    const t=mensData.filter(d=>(d.fecha||'').startsWith(yr));
    if(!t.length)return null;
    return(t.reduce((acc,d)=>acc*(1+parseFloat(d.valor||0)/100),1)-1)*100;
  })();
  const ipcLineData=(()=>{
    if(iaData.length)return iaData.slice(-24);
    if(mensData.length>=12){const s=[];for(let i=11;i<mensData.length;i++){const chunk=mensData.slice(i-11,i+1);s.push({fecha:mensData[i].fecha,valor:(chunk.reduce((a,x)=>a*(1+parseFloat(x.valor||0)/100),1)-1)*100});}return s.slice(-24);}
    return[];
  })();
  const ipcLineSeries=ipcLineData.length?[{label:'Interanual',color:'rgba(91,156,246,0.85)',data:ipcLineData.map(d=>parseFloat(d.valor||0))}]:null;
  const ipcLineLabels=ipcLineData.map(d=>{const p=(d.fecha||'').split('-');return p[1]?MESES_C[+p[1]]+(p[1]==='01'?" '"+(p[0]||'').slice(-2):''):'';});
  const fmt1=v=>v!=null?v.toFixed(1).replace('.',',')+'%':'—';
  const fmtDiff=v=>v!=null?(v>=0?'+':'')+v.toFixed(1).replace('.',',')+' pp':'—';
  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'12px',marginBottom:'20px'}}>
        {[
          {lbl:'IPC Mensual',badge:ipcMes,val:fmt1(ipcVal),delta:fmtDiff(ipcDiff)+' vs mes ant.',meta:'Fuente: BCRA · IPC INDEC'},
          {lbl:'Interanual',badge:'',val:fmt1(ipcIA),delta:'acumulado 12 meses',meta:'vs mismo mes año anterior'},
          {lbl:'Inflación esperada',badge:'12m',val:ipcExp!=null?fmt1(ipcExp):'—',delta:'próximos 12 meses',meta:'Expectativa de mercado · BCRA'},
          {lbl:'Acumulado año',badge:'',val:fmt1(acumAnio),delta:ipcFp[0]||'—',meta:'Desde enero del año en curso'},
        ].map((k,i)=>(
          <div key={i} style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:'10px',padding:'16px 18px'}}>
            <div style={{fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text3)',marginBottom:'8px'}}>
              {k.lbl}{k.badge&&<span style={{background:'var(--bg3)',border:'1px solid var(--line2)',borderRadius:'3px',padding:'1px 6px',marginLeft:'6px',fontSize:'8px'}}>{k.badge}</span>}
            </div>
            <div style={{fontFamily:'var(--mono)',fontSize:'26px',fontWeight:700,color:'var(--white)',lineHeight:1}}>{k.val}</div>
            <div style={{fontFamily:'var(--mono)',fontSize:'10px',marginTop:'6px',color:'var(--text3)'}}>{k.delta}</div>
            <div style={{fontSize:'11px',color:'var(--text3)',marginTop:'4px'}}>{k.meta}</div>
          </div>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px',marginBottom:'14px'}}>
        <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:'10px',padding:'16px 18px'}}>
          <div style={{fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text3)',marginBottom:'4px'}}>IPC mensual — últimos 18 meses</div>
          <div style={{fontSize:'10px',color:'var(--text2)',marginBottom:'14px'}}>Hover sobre cada barra</div>
          {mensData.length>0?<IpcBarChart data={mensData}/>:<div style={{height:'160px',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text3)',fontFamily:'var(--mono)',fontSize:'11px'}}>Cargando…</div>}
          <div style={{fontFamily:'var(--mono)',fontSize:'8px',color:'var(--text3)',marginTop:'6px',textAlign:'right'}}>INDEC · ArgentinaDatos.com</div>
        </div>
        <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:'10px',padding:'16px 18px'}}>
          <div style={{fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text3)',marginBottom:'4px'}}>Inflación interanual — tendencia</div>
          <div style={{fontSize:'10px',color:'var(--text2)',marginBottom:'14px'}}>Variación % acumulada 12 meses</div>
          {ipcLineSeries?<CanvasChart series={ipcLineSeries} labels={ipcLineLabels} height="160px" decimalPlaces={1}/>:<div style={{height:'160px',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text3)',fontFamily:'var(--mono)',fontSize:'11px'}}>Cargando…</div>}
          <div style={{fontFamily:'var(--mono)',fontSize:'8px',color:'var(--text3)',marginTop:'6px',textAlign:'right'}}>INDEC · ArgentinaDatos.com</div>
        </div>
      </div>
      <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:'10px',overflow:'hidden'}}>
        <div style={{padding:'12px 18px',borderBottom:'1px solid var(--line)',display:'flex',alignItems:'center',gap:'14px'}}>
          <span style={{fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text3)'}}>Historial IPC — por año y mes</span>
          <span style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)',display:'flex',alignItems:'center',gap:'6px'}}>
            Bajo <span style={{display:'inline-block',width:'56px',height:'7px',background:'linear-gradient(90deg,rgba(40,175,80,.72),rgba(200,155,15,.75),rgba(240,75,5,.76),rgba(220,10,5,.74))',borderRadius:'2px'}}/> Alto
          </span>
        </div>
        <div style={{padding:'16px 18px'}}><IpcHeatmap data={mensData}/></div>
        <div style={{padding:'8px 18px',borderTop:'1px solid var(--line)'}}>
          <span style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)'}}>Fuente: INDEC · ArgentinaDatos.com · Frecuencia: mensual</span>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Actividad Económica (EMAE + PBI) ─────────────────────
function TabActEconomica({ pbi, emae, indec }) {
  const [subview, setSubview] = useState('emae');

  // EMAE
  const emaeVal    = emae?.general?.valor ?? null;
  const emaeFecha  = emae?.general?.fecha ?? null;
  const emaeAccum  = emae?.acumAnio ?? null;
  const emaeAnioAc = emae?.anoAcum ?? new Date().getFullYear();
  const sectors    = emae?.sectors ?? [];
  const bestSector = sectors[0] ?? null;
  const worstSector= sectors.length>1 ? sectors[sectors.length-1] : null;
  const fmtE = v => v!=null?(v>=0?'+':'')+v.toFixed(1).replace('.',',')+'%':'—';
  const emaeMes = (()=>{ if(!emaeFecha)return'—'; const[y,m]=emaeFecha.split('-'); return(MESES_C[+m]||'')+' '+y; })();

  // PBI
  const pbiVal   = pbi?.lastIa ?? null;
  const pbiPrev  = pbi?.prevIa ?? null;
  const pbiFecha = pbi?.fecha ?? null;
  const pbiTrim  = (()=>{ if(!pbiFecha)return'—'; const[y,m]=pbiFecha.split('-'); return`Q${Math.ceil(+m/3)} ${y}`; })();
  const pbiHist  = pbi?.history ?? [];
  const fmtPbi   = v => v!=null?(v>=0?'+':'')+v.toFixed(1).replace('.',',')+'%':'—';
  const apiSectors = pbi?.sectors ?? [];
  const donutItems = apiSectors.map(s=>({nombre:s.nombre,share:s.share,vab:s.vab??null}));
  const maxShare = Math.max(...donutItems.map(x=>x.share),1);

  // Resumen rápido de sectores para la cabecera
  const positivosSectors = sectors.filter(s=>s.valor>=0).length;
  const negativosSectors = sectors.filter(s=>s.valor<0).length;

  return (
    <div>
      {/* ── KPIs ── */}
      <div className="grid grid-4" style={{marginBottom:'20px'}}>
        <div className="stat c-flat">
          <div className="stat-label">EMAE General <span className="stat-badge fl">{emaeMes}</span></div>
          <div className="stat-val" style={{color:emaeVal!=null&&emaeVal>=0?'var(--green)':'var(--red)'}}>{fmtE(emaeVal)}</div>
          <div className="stat-delta fl">var. interanual</div>
          <div className="stat-meta">{emaeAccum!=null?`Acum. ${fmtE(emaeAccum)} en ${emaeAnioAc}`:'INDEC · datos.gob.ar'}</div>
        </div>
        <div className="stat c-flat">
          <div className="stat-label">PBI Real <span className="stat-badge fl">{pbiTrim}</span></div>
          <div className="stat-val" style={{color:pbiVal!=null&&pbiVal>=0?'var(--green)':'var(--red)'}}>{fmtPbi(pbiVal)}</div>
          <div className="stat-delta fl">{pbiPrev!=null?`Trim. ant.: ${fmtPbi(pbiPrev)}`:'var. interanual real'}</div>
          <div className="stat-meta">INDEC · precios constantes 2004</div>
        </div>
        <div className="stat c-flat">
          <div className="stat-label">Mejor sector</div>
          <div className="stat-val" style={{color:'var(--green)',fontSize:'18px',marginTop:'4px'}}>{bestSector?bestSector.nombre:'—'}</div>
          <div className="stat-delta up">{bestSector?fmtE(bestSector.valor):'—'}</div>
          <div className="stat-meta">{worstSector?`Peor: ${worstSector.nombre} ${fmtE(worstSector.valor)}`:'EMAE · var. interanual'}</div>
        </div>
        <div className="stat c-flat">
          <div className="stat-label">Sectores</div>
          <div style={{display:'flex',alignItems:'baseline',gap:'12px',marginTop:'6px',marginBottom:'4px'}}>
            <div>
              <div style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)',marginBottom:'2px'}}>EN ALZA</div>
              <div style={{fontFamily:'var(--mono)',fontSize:'26px',fontWeight:700,color:'var(--green)',lineHeight:1}}>{positivosSectors}</div>
            </div>
            <div style={{width:'1px',height:'28px',background:'var(--line)',flexShrink:0,alignSelf:'center'}}/>
            <div>
              <div style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)',marginBottom:'2px'}}>EN BAJA</div>
              <div style={{fontFamily:'var(--mono)',fontSize:'26px',fontWeight:700,color:'var(--red)',lineHeight:1}}>{negativosSectors}</div>
            </div>
          </div>
          <div className="stat-meta">EMAE · {emaeMes}</div>
        </div>
      </div>

      {/* ── Selector EMAE / PBI ── */}
      <div style={{display:'flex',gap:'6px',marginBottom:'16px',borderBottom:'1px solid var(--line)',paddingBottom:'14px',alignItems:'center'}}>
        <span style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)',letterSpacing:'.08em',marginRight:'4px'}}>VER</span>
        {[
          {id:'emae',label:'EMAE · Mensual por sector'},
          {id:'pbi', label:'PBI · Trimestral'},
        ].map(t=>(
          <button key={t.id} onClick={()=>setSubview(t.id)}
            style={{fontFamily:'var(--mono)',fontSize:'10px',letterSpacing:'.04em',padding:'5px 14px',borderRadius:'5px',
              border:`1px solid ${subview===t.id?'var(--accent)':'var(--line2)'}`,
              background:subview===t.id?'var(--acc-bg)':'transparent',
              color:subview===t.id?'var(--accent)':'var(--text3)',cursor:'pointer',transition:'all .12s'}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Vista EMAE ── */}
      {subview==='emae'&&(
        <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:'10px',overflow:'hidden'}}>
          <div style={{padding:'16px 24px',borderBottom:'1px solid var(--line)',display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
            <div>
              <div style={{fontSize:'15px',fontWeight:600,color:'var(--white)',marginBottom:'3px'}}>Variación interanual por sector</div>
              <div style={{fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text3)'}}>{emaeMes} · INDEC · datos.gob.ar</div>
            </div>
          </div>
          {sectors.length===0?(
            <div style={{padding:'32px',textAlign:'center',color:'var(--text3)',fontFamily:'var(--mono)',fontSize:'11px'}}>{indec?'Sin datos de sectores':'Cargando sectores…'}</div>
          ):(()=>{
            const maxPos=Math.max(...sectors.map(x=>x.valor>0?x.valor:0),0.01);
            const maxNeg=Math.max(...sectors.map(x=>x.valor<0?Math.abs(x.valor):0),0.01);
            const tot=maxPos+maxNeg;
            return(
              <div style={{padding:'2px 24px 4px'}}>
                <div style={{display:'flex',alignItems:'center',padding:'5px 0 7px',borderBottom:'1px solid rgba(255,255,255,.05)',marginBottom:'2px'}}>
                  <div style={{width:'200px',flexShrink:0,fontFamily:'var(--mono)',fontSize:'8px',color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.08em'}}>Sector</div>
                  <div style={{flex:1,fontFamily:'var(--mono)',fontSize:'8px',color:'var(--text3)',textAlign:'center',textTransform:'uppercase',letterSpacing:'.08em'}}>Var. interanual</div>
                  <div style={{width:'60px',flexShrink:0,fontFamily:'var(--mono)',fontSize:'8px',color:'var(--text3)',textAlign:'right',textTransform:'uppercase',letterSpacing:'.08em'}}>EMAE</div>
                  <div style={{width:'50px',flexShrink:0,fontFamily:'var(--mono)',fontSize:'8px',color:'var(--text3)',textAlign:'right',textTransform:'uppercase',letterSpacing:'.08em',paddingLeft:'8px'}}>% PBI</div>
                </div>
                {sectors.map(({nombre,valor},i,arr)=>{
                  const neg=valor<0, isTop=i===0, color=neg?'var(--red)':'var(--green)';
                  const posPct=!neg?(valor/maxPos)*100:0, negPct=neg?(Math.abs(valor)/maxNeg)*100:0;
                  const pbiShare=indec?.pbi?.sectors?.find(s=>s.nombre===nombre)?.share??null;
                  return(
                    <div key={nombre} style={{display:'flex',alignItems:'center',padding:'5px 0',borderBottom:i<arr.length-1?'1px solid rgba(255,255,255,0.025)':'none'}}>
                      <div style={{width:'200px',flexShrink:0,fontSize:'11px',color:isTop?'var(--white)':neg?'var(--red)':'var(--text2)',fontWeight:isTop?600:400,paddingRight:'10px',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{nombre}</div>
                      <div style={{flex:1,display:'flex',alignItems:'center',minWidth:0}}>
                        <div style={{flex:maxNeg/tot,display:'flex',justifyContent:'flex-end',paddingRight:'2px'}}>
                          {neg&&<div style={{height:'6px',width:`${negPct}%`,background:'rgba(224,92,92,0.65)',borderRadius:'3px 0 0 3px'}}/>}
                        </div>
                        <div style={{width:'1px',height:'14px',background:'rgba(255,255,255,0.13)',flexShrink:0}}/>
                        <div style={{flex:maxPos/tot,paddingLeft:'2px'}}>
                          {!neg&&<div style={{height:'6px',width:`${posPct}%`,background:isTop?'rgba(74,191,120,0.75)':'rgba(74,191,120,0.45)',borderRadius:'0 3px 3px 0',boxShadow:isTop?'0 0 5px rgba(74,191,120,0.2)':'none'}}/>}
                        </div>
                      </div>
                      <div style={{width:'60px',flexShrink:0,fontFamily:'var(--mono)',fontSize:'11px',fontWeight:700,color,textAlign:'right'}}>{neg?'−':'+'}{Math.abs(valor).toFixed(1).replace('.',',')}%</div>
                      <div style={{width:'50px',flexShrink:0,paddingLeft:'8px',textAlign:'right'}}>
                        {pbiShare!=null
                          ?<span style={{fontFamily:'var(--mono)',fontSize:'10px',color:'var(--text3)',background:'var(--bg3)',border:'1px solid var(--line2)',borderRadius:'3px',padding:'1px 4px'}}>{pbiShare.toFixed(1)}%</span>
                          :<span style={{fontFamily:'var(--mono)',fontSize:'10px',color:'var(--text3)'}}>—</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
          <div style={{padding:'8px 20px',borderTop:'1px solid var(--line)',display:'flex',justifyContent:'flex-end'}}>
            <span style={{fontFamily:'var(--mono)',fontSize:'8px',color:'var(--text3)'}}>Fuente: INDEC · API Series de Tiempo · datos.gob.ar · % PBI: VAB a precios corrientes</span>
          </div>
        </div>
      )}

      {/* ── Vista PBI ── */}
      {subview==='pbi'&&(
        <div>
          <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:'10px',padding:'16px 18px',marginBottom:'14px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:'14px'}}>
              <div>
                <div style={{fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text3)'}}>PBI real — variación interanual por trimestre</div>
                <div style={{fontSize:'10px',color:'var(--text2)',marginTop:'3px'}}>Últimos 16 trimestres · hover para ver valor</div>
              </div>
              <span style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)'}}>precios constantes 2004</span>
            </div>
            {pbiHist.length>0?<PbiBarChart history={pbiHist}/>:<div style={{height:'220px',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text3)',fontFamily:'var(--mono)',fontSize:'11px'}}>Cargando…</div>}
            <div style={{fontFamily:'var(--mono)',fontSize:'8px',color:'var(--text3)',marginTop:'6px',textAlign:'right'}}>Fuente: INDEC · API Series de Tiempo · datos.gob.ar</div>
          </div>

          <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:'10px',overflow:'hidden',marginBottom:'14px'}}>
            <div style={{padding:'14px 20px',borderBottom:'1px solid var(--line)',display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
              <div>
                <div style={{fontSize:'14px',fontWeight:600,color:'var(--white)'}}>Composición del PBI por sector</div>
                <div style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)',marginTop:'3px',letterSpacing:'.04em'}}>VAB A PRECIOS CORRIENTES · INDEC · TRIMESTRAL · hover sobre el donut</div>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'240px 1fr'}}>
              <div style={{padding:'16px',borderRight:'1px solid var(--line)',display:'flex',alignItems:'center',justifyContent:'center',minHeight:'268px'}}>
                <div style={{width:'100%',height:'236px'}}>
                  {donutItems.length?<PbiDonutChart items={donutItems}/>:<div style={{height:'100%',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text3)',fontFamily:'var(--mono)',fontSize:'11px'}}>cargando…</div>}
                </div>
              </div>
              <div style={{overflowY:'auto',maxHeight:'268px'}}>
                <div style={{display:'grid',gridTemplateColumns:'10px 1fr 52px 90px',gap:'8px',padding:'8px 14px 6px',borderBottom:'1px solid rgba(255,255,255,.05)',position:'sticky',top:0,background:'var(--bg1)',zIndex:1}}>
                  <div/>
                  <span style={{fontFamily:'var(--mono)',fontSize:'8px',color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.08em'}}>Sector</span>
                  <span style={{fontFamily:'var(--mono)',fontSize:'8px',color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.08em',textAlign:'right'}}>% PBI</span>
                  <span style={{fontFamily:'var(--mono)',fontSize:'8px',color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.08em',textAlign:'right'}}>VAB trim.</span>
                </div>
                {donutItems.length===0
                  ?<div style={{padding:'32px 16px',textAlign:'center',color:'var(--text3)',fontFamily:'var(--mono)',fontSize:'11px'}}>cargando sectores…</div>
                  :donutItems.map((item,i)=>{
                    const col=CHART_PALETTE[i%CHART_PALETTE.length];
                    const fmtVab=v=>{if(v==null)return'—';if(v>=1000)return'$ '+(v/1000).toLocaleString('es-AR',{minimumFractionDigits:1,maximumFractionDigits:1})+' B';return'$ '+Math.round(v).toLocaleString('es-AR')+' MM';};
                    return(
                      <div key={item.nombre} style={{display:'grid',gridTemplateColumns:'10px 1fr 52px 90px',gap:'8px',alignItems:'center',padding:'6px 14px',borderBottom:'1px solid rgba(255,255,255,.02)',cursor:'default'}}
                        onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.02)'}
                        onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        <div style={{width:'8px',height:'8px',borderRadius:'2px',background:col,flexShrink:0}}/>
                        <div>
                          <div style={{fontSize:'11px',color:'var(--text2)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{item.nombre}</div>
                          <div style={{height:'2px',background:'var(--bg3)',borderRadius:'2px',marginTop:'4px',overflow:'hidden'}}>
                            <div style={{height:'100%',width:`${Math.round((item.share/maxShare)*100)}%`,background:col,borderRadius:'2px'}}/>
                          </div>
                        </div>
                        <div style={{fontFamily:'var(--mono)',fontSize:'12px',fontWeight:700,color:'var(--white)',textAlign:'right'}}>{item.share.toFixed(1)}%</div>
                        <div style={{fontFamily:'var(--mono)',fontSize:'10px',color:'var(--text2)',textAlign:'right',whiteSpace:'nowrap'}}>{fmtVab(item.vab)}</div>
                      </div>
                    );
                  })}
                {donutItems.length>0&&<div style={{padding:'7px 14px',borderTop:'1px solid rgba(255,255,255,.05)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)'}}>Total VA (excl. imp. y subv.)</span>
                  <span style={{fontFamily:'var(--mono)',fontSize:'11px',fontWeight:700,color:'var(--white)'}}>{donutItems.reduce((s,v)=>s+v.share,0).toFixed(1)}%</span>
                </div>}
              </div>
            </div>
            <div style={{padding:'8px 20px',borderTop:'1px solid var(--line)',display:'flex',justifyContent:'space-between'}}>
              <span style={{fontFamily:'var(--mono)',fontSize:'8px',color:'var(--text3)'}}>VAB a precios corrientes · INDEC · datos.gob.ar · trimestral</span>
              <span style={{fontFamily:'var(--mono)',fontSize:'8px',color:'var(--text3)'}}>B = miles de MM$ corrientes del trimestre</span>
            </div>
          </div>

          <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:'10px',overflow:'hidden'}}>
            <div style={{padding:'12px 16px',borderBottom:'1px solid var(--line)'}}>
              <div style={{fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text3)'}}>Variación real interanual — últimos trimestres</div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'80px 1fr 100px',padding:'6px 16px',borderBottom:'1px solid var(--line)',background:'var(--bg2)'}}>
              <span style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)'}}>PERÍODO</span>
              <span style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)'}}>BARRA</span>
              <span style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)',textAlign:'right'}}>VAR. REAL</span>
            </div>
            {pbiHist.length===0
              ?<div style={{padding:'20px 16px',color:'var(--text3)',fontFamily:'var(--mono)',fontSize:'11px',textAlign:'center'}}>cargando…</div>
              :pbiHist.slice(-8).reverse().map((d,i)=>{
                const v=parseFloat(d.valor||0), pos=v>=0, [y,m]=(d.fecha||'').split('-'), isLast=i===0;
                return(
                  <div key={d.fecha} style={{display:'grid',gridTemplateColumns:'80px 1fr 100px',padding:'9px 16px',borderBottom:'1px solid rgba(255,255,255,.03)',alignItems:'center',background:isLast?(pos?'rgba(74,191,120,.04)':'rgba(224,92,92,.04)'):'' }}>
                    <span style={{fontFamily:'var(--mono)',fontSize:'12px',fontWeight:isLast?700:400,color:isLast?(pos?'var(--green)':'var(--red)'):'var(--text3)'}}>Q{Math.ceil(+m/3)} {y}</span>
                    <div style={{paddingRight:'12px'}}>
                      <div style={{height:'4px',background:'var(--bg3)',borderRadius:'3px',overflow:'hidden'}}>
                        <div style={{height:'100%',width:`${Math.min(100,Math.abs(v)*6)}%`,background:pos?'rgba(74,191,120,0.50)':'rgba(224,92,92,0.45)',borderRadius:'3px'}}/>
                      </div>
                    </div>
                    {isLast
                      ?<span style={{background:pos?'var(--green-bg)':'var(--red-bg)',color:pos?'var(--green)':'var(--red)',fontFamily:'var(--mono)',fontSize:'10px',fontWeight:700,padding:'2px 8px',borderRadius:'4px',textAlign:'center'}}>{fmtPbi(v)}</span>
                      :<span style={{fontFamily:'var(--mono)',fontSize:'11px',fontWeight:600,color:pos?'var(--green)':'var(--red)',textAlign:'right'}}>{fmtPbi(v)}</span>}
                  </div>
                );
              })}
            <div style={{padding:'8px 16px',borderTop:'1px solid var(--line)'}}>
              <span style={{fontFamily:'var(--mono)',fontSize:'8px',color:'var(--text3)'}}>Fuente: INDEC · Cuentas Nacionales · API Series de Tiempo datos.gob.ar · Frecuencia: trimestral</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab: Riesgo País ──────────────────────────────────────────
function TabRiesgoPais({ riesgoPais }) {
  const [rpRange,setRpRange]=useState('1A');
  const rpVal=riesgoPais?.valor??null, rpDelta=riesgoPais?.delta??null;
  const rpDisp=rpVal!=null?Math.round(rpVal).toLocaleString('es-AR')+' pb':'—';
  const rpDeltaDisp=rpDelta!=null?(rpDelta<0?'−':'+')+Math.abs(Math.round(rpDelta))+' pb vs ayer':'—';
  const rpDeltaUp=rpDelta!=null&&rpDelta<0; // baja en pb = mejora (up = verde)
  const {data:regionalData,loading:regionalLoading,maxVal:regionalMax}=useRiesgoRegional(rpVal);
  const risk=rpVal!=null?getRiskLabel(rpVal):{label:'—',bg:'var(--bg3)',color:'var(--text3)'};

  // Stats derivadas del historial
  const hist=riesgoPais?.history??[];
  const curAnio=new Date().getFullYear().toString();
  const histAnio=hist.filter(h=>(h.fecha||'').startsWith(curAnio));
  const minAnio=histAnio.length?Math.round(Math.min(...histAnio.map(h=>parseFloat(h.valor||9999)))):null;
  const maxAnio=histAnio.length?Math.round(Math.max(...histAnio.map(h=>parseFloat(h.valor||0)))):null;
  const delta30=(()=>{
    if(hist.length<30||rpVal==null)return null;
    const d30=parseFloat(hist[hist.length-30]?.valor||0);
    return Math.round(rpVal-d30);
  })();
  const delta30Up=delta30!=null&&delta30<0;

  // Todos los países para la comparativa (Argentina + regionales)
  const braVal=regionalData['bra']??null;
  const ratioBra=rpVal!=null&&braVal?(rpVal/braVal).toFixed(1)+'×':'—';

  const allCountries=[
    {nombre:'Argentina',iso:'arg',pb:rpVal??0,isArg:true},
    ...PAISES_REGIONAL.map(p=>({nombre:p.nombre,iso:p.iso,pb:regionalData[p.iso]??p.fallback,isArg:false}))
  ].sort((a,b)=>b.pb-a.pb);
  const globalMax=Math.max(...allCountries.map(c=>c.pb),1);

  return (
    <div>
      {/* ── KPIs ── */}
      <div className="grid grid-4" style={{marginBottom:'20px'}}>
        <div className="stat c-flat">
          <div className="stat-label">EMBI+ Argentina <span className="stat-badge fl">HOY</span></div>
          <div className="stat-val">{rpVal!=null?Math.round(rpVal).toLocaleString('es-AR')+' pb':'—'}</div>
          <div className={`stat-delta ${rpDeltaUp?'up':'dn'}`}>{rpDeltaDisp}</div>
          <div className="stat-meta" style={{display:'flex',alignItems:'center',gap:'6px'}}>
            JP Morgan · ArgentinaDatos
            <span style={{fontFamily:'var(--mono)',fontSize:'8px',background:risk.bg,color:risk.color,padding:'1px 6px',borderRadius:'3px',border:`1px solid ${risk.color}22`}}>{risk.label}</span>
          </div>
        </div>
        <div className="stat c-flat">
          <div className="stat-label">Variación 30 días</div>
          <div className={`stat-val ${delta30!=null?(delta30Up?'':''):''}` } style={{color:delta30!=null?(delta30Up?'var(--green)':'var(--red)'):'var(--text3)'}}>{delta30!=null?(delta30<0?'−':'+')+Math.abs(delta30)+' pb':'—'}</div>
          <div className="stat-delta fl">vs hace 30 días</div>
          <div className="stat-meta">Historial · ArgentinaDatos</div>
        </div>
        <div className="stat c-flat">
          <div className="stat-label">Rango {curAnio}</div>
          <div style={{display:'flex',alignItems:'baseline',gap:'12px',marginTop:'6px',marginBottom:'4px'}}>
            <div>
              <div style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)',marginBottom:'2px'}}>MÍN</div>
              <div style={{fontFamily:'var(--mono)',fontSize:'20px',fontWeight:700,color:'var(--green)',lineHeight:1}}>{minAnio!=null?minAnio.toLocaleString('es-AR')+' pb':'—'}</div>
            </div>
            <div style={{width:'1px',height:'24px',background:'var(--line)',flexShrink:0,alignSelf:'center'}}/>
            <div>
              <div style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)',marginBottom:'2px'}}>MÁX</div>
              <div style={{fontFamily:'var(--mono)',fontSize:'20px',fontWeight:700,color:'var(--red)',lineHeight:1}}>{maxAnio!=null?maxAnio.toLocaleString('es-AR')+' pb':'—'}</div>
            </div>
          </div>
          <div className="stat-meta">Año en curso</div>
        </div>
        <div className="stat c-flat">
          <div className="stat-label">Ratio vs Brasil</div>
          <div className="stat-val">{ratioBra}</div>
          <div className="stat-delta fl">{braVal?`Brasil: ${braVal.toLocaleString('es-AR')} pb`:'cargando…'}</div>
          <div className="stat-meta">JP Morgan EMBI+</div>
        </div>
      </div>

      {/* ── Gráfico + Comparativa Regional ── */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 340px',gap:'14px'}}>
        {/* Gráfico historial */}
        <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:'12px',padding:'18px 20px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px'}}>
            <div>
              <div style={{fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text3)'}}>EMBI+ Argentina — historial</div>
              <div style={{fontSize:'12px',color:'var(--text2)',marginTop:'3px'}}>Puntos básicos · JP Morgan</div>
            </div>
            <div style={{display:'flex',gap:'4px'}}>
              {['3M','6M','1A','MAX'].map(r=>(
                <button key={r} onClick={()=>setRpRange(r)}
                  style={{fontFamily:'var(--mono)',fontSize:'9px',padding:'3px 10px',borderRadius:'4px',
                    border:`1px solid ${r===rpRange?'var(--accent)':'var(--line2)'}`,
                    background:r===rpRange?'var(--acc-bg)':'transparent',
                    color:r===rpRange?'var(--accent)':'var(--text3)',cursor:'pointer',transition:'all .12s'}}>
                  {r}
                </button>
              ))}
            </div>
          </div>
          <RiesgoPaisChart history={hist} range={rpRange}/>
          <div style={{fontFamily:'var(--mono)',fontSize:'8px',color:'var(--text3)',marginTop:'10px',textAlign:'right'}}>
            Fuente: JP Morgan EMBI+ · ArgentinaDatos.com · Frecuencia: diaria
          </div>
        </div>

        {/* Comparativa regional unificada */}
        <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:'12px',overflow:'hidden',display:'flex',flexDirection:'column',maxHeight:'320px'}}>
          <div style={{padding:'14px 18px',borderBottom:'1px solid var(--line)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text3)'}}>Comparativa regional</span>
            <span style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)'}}>EMBI+</span>
          </div>
          <div style={{flex:1,overflowY:'auto'}}>
            {regionalLoading&&!Object.keys(regionalData).length?(
              <div style={{padding:'32px',textAlign:'center',color:'var(--text3)',fontFamily:'var(--mono)',fontSize:'10px'}}>Cargando datos regionales…</div>
            ):allCountries.map((c,i)=>{
              const barPct=Math.round((c.pb/globalMax)*100);
              const r=getRiskLabel(c.pb);
              const barColor=c.isArg?'rgba(91,156,246,0.60)':c.pb>=350?'rgba(224,92,92,0.50)':c.pb>=200?'rgba(250,185,50,0.40)':'rgba(74,191,120,0.45)';
              const isLast=i===allCountries.length-1;
              return(
                <div key={c.iso} style={{
                  padding:'6px 14px',
                  borderBottom:isLast?'none':'1px solid var(--line)',
                  background:c.isArg?'rgba(91,156,246,.04)':'transparent'
                }}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'3px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'5px'}}>
                      <span style={{fontSize:'11px',fontWeight:c.isArg?600:400,color:c.isArg?'var(--accent)':'var(--text2)'}}>{c.nombre}</span>
                      {c.isArg&&<span style={{fontFamily:'var(--mono)',fontSize:'7px',background:'var(--acc-bg)',color:'var(--accent)',padding:'1px 4px',borderRadius:'3px',border:'1px solid rgba(91,156,246,.2)'}}>ARG</span>}
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:'5px'}}>
                      <span style={{fontFamily:'var(--mono)',fontSize:'8px',background:r.bg,color:r.color,padding:'1px 5px',borderRadius:'3px'}}>{r.label}</span>
                      <span style={{fontFamily:'var(--mono)',fontSize:'12px',fontWeight:700,color:c.isArg?'var(--accent)':'var(--white)'}}>{c.pb.toLocaleString('es-AR')}</span>
                    </div>
                  </div>
                  <div style={{height:'3px',background:'var(--bg3)',borderRadius:'3px',overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${barPct}%`,background:barColor,borderRadius:'3px',transition:'width .5s ease'}}/>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{padding:'8px 18px',borderTop:'1px solid var(--line)'}}>
            <span style={{fontFamily:'var(--mono)',fontSize:'8px',color:'var(--text3)'}}>Banco Mundial / JP Morgan EMBI+ · datos referenciales</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── BCRA Monetario ────────────────────────────────────────────
function BcraMonetarioSection({ bcra, loadBcra }) {
  useEffect(()=>{if(!bcra)loadBcra?.();},[bcra,loadBcra]);
  const monetario=bcra?.byCat?.['Monetario']??[];
  const ts=bcra?.timestamp?new Date(bcra.timestamp):null;
  const tsStr=ts?ts.toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})+' hs':null;
  const fmtValor=item=>{
    if(item.valor==null)return'—';
    const v=parseFloat(item.valor);
    if(item.unidad==='MM $')return'$ '+(v/1000).toLocaleString('es-AR',{minimumFractionDigits:1,maximumFractionDigits:1})+' B';
    if(item.formato==='pct')return v.toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2})+'%';
    return v.toLocaleString('es-AR',{maximumFractionDigits:2});
  };
  const fmtDelta=item=>{
    if(item.valor==null||item.valorAnterior==null)return null;
    const d=parseFloat(item.valor)-parseFloat(item.valorAnterior);
    if(Math.abs(d)<0.001)return null;
    if(item.unidad==='MM $'){const pct=(d/parseFloat(item.valorAnterior))*100;return{txt:(pct>0?'+':'')+pct.toFixed(2).replace('.',',')+'%',up:d>0};}
    return{txt:(d>0?'+':'')+d.toLocaleString('es-AR',{maximumFractionDigits:2}),up:d>0};
  };
  const fmtFecha=f=>{if(!f)return'';const[y,m,d]=(f||'').split('-');return`${d}/${m}/${y}`;};
  if(!bcra)return<div style={{padding:'32px',textAlign:'center',color:'var(--text3)',fontFamily:'var(--mono)',fontSize:'11px'}}>Cargando datos del BCRA…</div>;
  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
        <div style={{fontFamily:'var(--mono)',fontSize:'9px',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text3)'}}>Agregados monetarios — BCRA</div>
        {tsStr&&<span style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)'}}>actualizado {tsStr}</span>}
      </div>
      <div className="grid grid-3">
        {monetario.map(item=>{
          const delta=fmtDelta(item);
          return(
            <div key={item.key} className="stat c-flat">
              <div className="stat-label">{item.nombre} <span className="stat-badge fl">{item.unidad}</span></div>
              <div className="stat-val">{fmtValor(item)}</div>
              {delta?<div className={`stat-delta ${delta.up?'up':'dn'}`}>{delta.txt} vs ant.</div>:<div className="stat-delta fl">sin variación</div>}
              <div className="stat-meta">BCRA · {fmtFecha(item.fecha)}</div>
            </div>
          );
        })}
      </div>
      <div className="source" style={{marginTop:'12px'}}>Fuente: BCRA · api.bcra.gob.ar/estadisticas/v4.0 · Frecuencia: diaria</div>
    </div>
  );
}

// ── MacroPage principal ───────────────────────────────────────
const MACRO_TABS = [
  { id:'inflacion',     label:'Inflación'       },
  { id:'act_economica', label:'Act. Económica'  },
  { id:'riesgo',        label:'Riesgo País'     },
  { id:'monetario',     label:'Monetario'       },
];

export function MacroPage({ goPage, inflacion, riesgoPais, bcra, loadBcra, indec, loadIndec, apiStatus, reloadAll }) {
  const [activeTab, setActiveTab] = useState('inflacion');

  useEffect(()=>{if(!indec)loadIndec?.();},[indec,loadIndec]);

  const emae=indec?.emae, pbi=indec?.pbi;
  const mensData=inflacion?.history??[], lastIPC=mensData[mensData.length-1];
  const ipcVal=inflacion?.ipcMensual??(lastIPC?parseFloat(lastIPC.valor||0):null);
  const ipcFp=((inflacion?.ipcFecha??lastIPC?.fecha)||'').split('-');
  const emaeVal=emae?.general?.valor??null, emaeFecha=emae?.general?.fecha??null;
  const emaeMesKpi=(()=>{if(!emaeFecha)return'—';const[y,m]=emaeFecha.split('-');return(MESES_C[+m]||'')+' '+y;})();
  const rpVal=riesgoPais?.valor??null, rpDelta=riesgoPais?.delta??null;
  const pbiVal=pbi?.lastIa??null, pbiFecha=pbi?.fecha??null;
  const pbiTrim=(()=>{if(!pbiFecha)return'—';const[y,m]=pbiFecha.split('-');return`Q${Math.ceil(+m/3)} ${y}`;})();
  const fmt1=v=>v!=null?v.toFixed(1).replace('.',',')+'%':'—';
  const fmtPbi=v=>v!=null?(v>=0?'+':'')+v.toFixed(1).replace('.',',')+'%':'—';

  return (
    <div className="page-enter">
      <ApiErrorBanner
        keys={['inflacion','riesgoPais','bcra','indec']}
        apiStatus={apiStatus}
        labels={{inflacion:'IPC/Inflación',riesgoPais:'Riesgo País',bcra:'BCRA',indec:'INDEC/EMAE'}}
        onRetry={reloadAll}
      />
      <div className="ph">
        <div>
          <div className="ph-title">Macroeconomía Argentina <span className="help-pip" onClick={()=>goPage('ayuda','glosario-macro')} title="Ayuda">?</span></div>
          <div className="ph-sub">IPC · EMAE · PBI · Riesgo País</div>
        </div>
        <div className="ph-right" style={{fontFamily:'var(--mono)',fontSize:'11px',color:'var(--text3)'}}>INDEC · BCRA · JP Morgan</div>
      </div>

      {/* KPI resumen */}
      <div className="section">
        <div className="section-title">Indicadores clave · resumen</div>
        <div className="grid grid-4">
          {[
            { lbl:'IPC Mensual',      badge:ipcFp[1]?ipcFp[0].slice(2)+'/'+ipcFp[1]:'—', val:fmt1(ipcVal),  sub:`IA: ${fmt1(inflacion?.ipcInteranual??inflacion?.valor)}`, meta:'BCRA · IPC INDEC',         tab:'inflacion'     },
            { lbl:'EMAE General',     badge:emaeMesKpi,                                    val:fmt1(emaeVal), sub:emae?.acumAnio!=null?`Acum. ${(emae.acumAnio>=0?'+':'')+emae.acumAnio.toFixed(1).replace('.',',')}% en ${emae.anoAcum}`:'—', meta:'Var. interanual · INDEC', tab:'act_economica' },
            { lbl:'Riesgo País EMBI+',badge:'HOY',                                         val:rpVal!=null?Math.round(rpVal).toLocaleString('es-AR')+' pb':'—', sub:rpDelta!=null?(rpDelta<0?'−':'+')+Math.abs(Math.round(rpDelta))+' pb vs ayer':'—', meta:'JP Morgan · ArgentinaDatos', tab:'riesgo' },
            { lbl:'PBI Real',         badge:pbiTrim,                                       val:fmtPbi(pbiVal), sub:pbi?.prevIa!=null?`Trim. ant.: ${fmtPbi(pbi.prevIa)}`:'—', meta:'Var. interanual · INDEC', tab:'act_economica' },
          ].map((k,i)=>(
            <div key={i} className="stat c-flat" style={{cursor:'pointer',transition:'border-color .15s'}} onClick={()=>setActiveTab(k.tab)}
              onMouseEnter={e=>e.currentTarget.style.borderColor='var(--line2)'}
              onMouseLeave={e=>e.currentTarget.style.borderColor='var(--line)'}>
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
        {MACRO_TABS.map(t=>(
          <button key={t.id} className={`tab${activeTab===t.id?' active':''}`} onClick={()=>setActiveTab(t.id)}>{t.label}</button>
        ))}
      </div>

      <div className="section">
        {activeTab==='inflacion'     && <TabInflacion inflacion={inflacion}/>}
        {activeTab==='act_economica' && <TabActEconomica pbi={pbi} emae={emae} indec={indec}/>}
        {activeTab==='riesgo'        && <TabRiesgoPais riesgoPais={riesgoPais}/>}
        {activeTab==='monetario'     && <BcraMonetarioSection bcra={bcra} loadBcra={loadBcra}/>}
      </div>
    </div>
  );
}
