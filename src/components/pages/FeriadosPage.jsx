// FeriadosPage.jsx — fiel al MVP HTML (index__2_.html)
import React, { useState } from 'react';

const DIAS_S = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const TIPO_L = {
  'inamovible':   { l: 'Inamovible',       c: 'stat-badge fl'  },
  'trasladable':  { l: 'Trasladable',       c: 'stat-badge up'  },
  'puente':       { l: 'Puente turístico',  c: 'stat-badge dn'  },
  'no laborable': { l: 'No laborable',      c: 'stat-badge fl'  },
};

const pFecha = str => str ? new Date(str + 'T00:00:00') : null;

export function FeriadosPage({ goPage, feriados }) {
  const [filtro, setFiltro] = useState('todos');

  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);

  const withDate = (feriados || []).map(d => ({ ...d, _f: pFecha(d.fecha) }));
  const futuro   = withDate.filter(d => d._f && d._f >= hoy).sort((a, b) => a._f - b._f);
  const proximos = futuro.slice(0, 6);

  // Días hábiles restantes
  const ferSet = new Set((feriados || []).map(d => d.fecha));
  let hab = 0;
  const finAnio = new Date(hoy.getFullYear(), 11, 31);
  for (let d = new Date(hoy); d <= finAnio; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();
    const iso = d.toISOString().slice(0, 10);
    if (dow !== 0 && dow !== 6 && !ferSet.has(iso)) hab++;
  }

  // Filtro tabla
  const filtrados = [...withDate]
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
    .filter(d => filtro === 'todos' || (d.tipo || '').toLowerCase() === filtro);

  const proximo  = futuro[0] || null;
  const proxDiff = proximo ? Math.round((proximo._f - hoy) / 86400000) : null;
  const proxDia  = proximo ? DIAS_S[proximo._f.getDay()] || '' : '';
  const proxFecha = proximo
    ? proxDia.charAt(0).toUpperCase() + proxDia.slice(1) + ', ' +
      proximo._f.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—';
  const proxMeta = proxDiff === null ? '—'
    : proxDiff === 0 ? '¡Hoy es feriado!'
    : proxDiff === 1 ? '→ Mañana'
    : `→ En ${proxDiff} días`;

  // Alertas: feriados en los próximos 7 días
  const en7 = new Date(hoy); en7.setDate(en7.getDate() + 7);
  const alertas = withDate.filter(d => d._f && d._f >= hoy && d._f <= en7);

  const tipoInfo = (tipo) => TIPO_L[(tipo || '').toLowerCase()] || { l: tipo || 'Feriado', c: 'stat-badge fl' };
  const yr = new Date().getFullYear();

  return (
    <div className="page-enter">
      <div className="ph">
        <div>
          <div className="ph-title">
            Feriados &amp; Calendario Agro{' '}
            <span className="help-pip" onClick={() => goPage('ayuda', 'glosario-feriados')} title="Ayuda">?</span>
          </div>
          <div className="ph-sub">
            Feriados nacionales {yr} · Días hábiles · Calendario agrícola · ArgentinaDatos
          </div>
        </div>
        <div className="ph-right" style={{fontFamily:'var(--mono)',fontSize:'11px',color:'var(--text3)'}}>
          Fuente: <span style={{color:'var(--text2)'}}>ArgentinaDatos.com</span>
        </div>
      </div>

      {/* KPIs */}
      <div className="section">
        <div className="section-title">Resumen del año · {yr}</div>
        <div className="grid grid-4">
          <div className="stat c-flat">
            <div className="stat-label">Feriados totales <span className="stat-badge fl">{yr}</span></div>
            <div className="stat-val lg">{feriados?.length != null ? feriados.length + ' feriados' : '—'}</div>
            <div className="stat-meta">Feriados nacionales inamovibles y trasladables</div>
          </div>
          <div className="stat c-flat">
            <div className="stat-label">Próximo feriado</div>
            <div className="stat-val" style={{fontSize:'18px'}}>{proximo?.nombre || '—'}</div>
            <div className="stat-delta" style={{color:'var(--text2)'}}>{proxFecha}</div>
            <div className="stat-meta">{proxMeta}</div>
          </div>
          <div className="stat c-flat">
            <div className="stat-label">Feriados restantes <span className="stat-badge fl">{yr}</span></div>
            <div className="stat-val lg">{futuro.length > 0 ? futuro.length + ' feriados' : '—'}</div>
            <div className="stat-meta">Desde hoy hasta fin de año</div>
          </div>
          <div className="stat c-flat">
            <div className="stat-label">Días hábiles estimados</div>
            <div className="stat-val lg">{hab > 0 ? hab + ' días' : '—'}</div>
            <div className="stat-meta">Días laborables hasta dic {yr}</div>
          </div>
        </div>
      </div>

      {/* Próximos feriados */}
      <div className="section">
        <div className="section-title">Próximos feriados · {yr}</div>
        <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:'10px',overflow:'hidden'}}>
          {!feriados || feriados.length === 0 ? (
            <div style={{padding:'40px',textAlign:'center',color:'var(--text3)',fontFamily:'var(--mono)',fontSize:'11px'}}>Cargando datos…</div>
          ) : proximos.length === 0 ? (
            <div style={{padding:'30px',textAlign:'center',color:'var(--text3)',fontFamily:'var(--mono)',fontSize:'11px'}}>Sin feriados próximos</div>
          ) : proximos.map((d, i) => {
            const diff = Math.round((d._f - hoy) / 86400000);
            const dia  = DIAS_S[d._f.getDay()] || '';
            const ti   = tipoInfo(d.tipo);
            const dTxt = diff === 0
              ? <span style={{color:'var(--green)',fontWeight:600}}>Hoy</span>
              : diff === 1
              ? <span style={{color:'var(--gold)'}}>Mañana</span>
              : <>En {diff} días</>;
            return (
              <div key={i} style={{
                display:'flex', alignItems:'center', gap:'16px',
                padding:'14px 20px',
                borderBottom: i < proximos.length - 1 ? '1px solid var(--line)' : 'none',
                background: i === 0 ? 'var(--acc-bg)' : 'transparent',
              }}>
                {/* Mini calendar card */}
                <div style={{
                  minWidth:'52px', textAlign:'center',
                  background:'var(--bg2)', borderRadius:'8px',
                  padding:'8px 4px', border:'1px solid var(--line)',
                }}>
                  <div style={{fontFamily:'var(--mono)',fontSize:'9px',color:'var(--text3)',textTransform:'uppercase'}}>
                    {d._f.toLocaleDateString('es-AR',{month:'short'})}
                  </div>
                  <div style={{fontFamily:'var(--display,var(--mono))',fontSize:'20px',fontWeight:800,color:'var(--white)',lineHeight:1.1}}>
                    {d._f.getDate()}
                  </div>
                  <div style={{fontFamily:'var(--mono)',fontSize:'8px',color:'var(--text3)'}}>
                    {d._f.getFullYear()}
                  </div>
                </div>
                {/* Nombre + fecha */}
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,color:'var(--white)',fontSize:'13px',marginBottom:'3px'}}>{d.nombre || '—'}</div>
                  <div style={{fontFamily:'var(--mono)',fontSize:'10px',color:'var(--text3)'}}>
                    {dia.charAt(0).toUpperCase() + dia.slice(1)} · {d._f.toLocaleDateString('es-AR',{day:'2-digit',month:'long'})}
                  </div>
                </div>
                {/* Tipo + countdown */}
                <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:'4px'}}>
                  <span className={ti.c} style={{fontSize:'9px'}}>{ti.l}</span>
                  <span style={{fontFamily:'var(--mono)',fontSize:'11px'}}>{dTxt}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="source">Fuente: ArgentinaDatos.com · Ministerio del Interior</div>
      </div>

      {/* Tabla completa */}
      <div className="section">
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px'}}>
          <div className="section-title" style={{marginBottom:0}}>Calendario completo de feriados {yr}</div>
          <div style={{display:'flex',gap:'6px'}}>
            {[
              ['todos',       'fer-btn-todos', 'Todos'],
              ['inamovible',  'fer-btn-inam',  'Inamovibles'],
              ['trasladable', 'fer-btn-tras',  'Trasladables'],
              ['puente',      'fer-btn-puen',  'Puentes'],
            ].map(([k, id, label]) => (
              <button
                key={k} id={id}
                className={`tab${filtro === k ? ' active' : ''}`}
                style={{fontSize:'11px',padding:'5px 12px'}}
                onClick={() => setFiltro(k)}
              >{label}</button>
            ))}
          </div>
        </div>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Día</th>
                <th>Nombre</th>
                <th>Tipo</th>
                <th className="r">Días hasta el feriado</th>
              </tr>
            </thead>
            <tbody>
              {!feriados || feriados.length === 0 ? (
                <tr><td colSpan={5} style={{textAlign:'center',color:'var(--text3)',padding:'20px'}}>Cargando…</td></tr>
              ) : filtrados.length === 0 ? (
                <tr><td colSpan={5} style={{textAlign:'center',color:'var(--text3)',padding:'20px'}}>Sin resultados</td></tr>
              ) : filtrados.map((d, i) => {
                if (!d._f) return null;
                const diff   = Math.round((d._f - hoy) / 86400000);
                const isPast = diff < 0;
                const dia    = DIAS_S[d._f.getDay()] || '';
                const ti     = tipoInfo(d.tipo);
                const dcEl   = isPast
                  ? <span style={{fontFamily:'var(--mono)',fontSize:'10px',color:'var(--text3)'}}>Pasado</span>
                  : diff === 0
                  ? <span style={{color:'var(--green)',fontWeight:600,fontFamily:'var(--mono)',fontSize:'10px'}}>HOY ✓</span>
                  : diff === 1
                  ? <span style={{color:'var(--gold)',fontFamily:'var(--mono)',fontSize:'10px'}}>Mañana</span>
                  : <span style={{fontFamily:'var(--mono)',fontSize:'10px',color:'var(--text2)'}}>{diff} días</span>;
                return (
                  <tr key={i} style={{
                    background: diff === 0 ? 'var(--acc-bg)' : 'transparent',
                    opacity: isPast ? 0.4 : 1,
                  }}>
                    <td className="mono" style={{fontSize:'12px'}}>
                      {d._f.toLocaleDateString('es-AR',{day:'2-digit',month:'2-digit',year:'numeric'})}
                    </td>
                    <td style={{fontSize:'12px',color:'var(--text2)'}}>
                      {dia.charAt(0).toUpperCase() + dia.slice(1)}
                    </td>
                    <td style={{fontWeight:500,color:'var(--white)'}}>{d.nombre || '—'}</td>
                    <td><span className={ti.c} style={{fontSize:'9px'}}>{ti.l}</span></td>
                    <td className="r">{dcEl}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="source">
          Fuente: ArgentinaDatos.com · API pública · {feriados?.length || 0} feriados {yr} · datos en tiempo real
        </div>
      </div>

      {/* Alertas mercados */}
      <div className="section">
        <div className="section-title">Impacto en mercados agro · alertas de cierre</div>
        <div style={{background:'var(--bg1)',border:'1px solid var(--line)',borderRadius:'10px',padding:'20px'}}>
          {!feriados || feriados.length === 0 ? (
            <div style={{color:'var(--text3)',fontFamily:'var(--mono)',fontSize:'11px'}}>Cargando alertas…</div>
          ) : alertas.length === 0 ? (
            <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
              <span style={{fontSize:'20px',color:'var(--green)'}}>✓</span>
              <div>
                <div style={{fontWeight:600,fontSize:'13px',color:'var(--white)'}}>Semana sin feriados</div>
                <div style={{fontFamily:'var(--mono)',fontSize:'11px',color:'var(--text3)',marginTop:'3px'}}>
                  MATBA-ROFEX y BCR operan con normalidad los próximos 7 días
                </div>
              </div>
            </div>
          ) : alertas.map((d, i) => {
            const diff = Math.round((d._f - hoy) / 86400000);
            const txt  = diff === 0 ? 'HOY' : diff === 1 ? 'MAÑANA' : `EN ${diff} DÍAS`;
            const fFmt = d._f.toLocaleDateString('es-AR', { weekday:'long', day:'numeric', month:'long' });
            return (
              <div key={i} style={{
                background:'rgba(240,184,64,0.08)',
                border:'1px solid rgba(240,184,64,.25)',
                borderRadius:'8px', padding:'14px 16px',
                marginBottom: i < alertas.length - 1 ? '8px' : '0',
                display:'flex', gap:'12px',
              }}>
                <span style={{fontSize:'18px',lineHeight:1}}>⚠️</span>
                <div style={{flex:1}}>
                  <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'4px'}}>
                    <span style={{
                      fontFamily:'var(--mono)', fontSize:'9px', color:'var(--gold)',
                      border:'1px solid rgba(240,184,64,.4)',
                      padding:'2px 7px', borderRadius:'4px', fontWeight:600,
                    }}>{txt}</span>
                    <span style={{fontWeight:600,color:'var(--white)',fontSize:'13px'}}>{d.nombre}</span>
                  </div>
                  <div style={{fontFamily:'var(--mono)',fontSize:'10px',color:'var(--text3)',marginBottom:'4px'}}>
                    {fFmt.charAt(0).toUpperCase() + fFmt.slice(1)}
                  </div>
                  <div style={{fontSize:'11px',color:'var(--text2)'}}>
                    ⚡ MATBA-ROFEX no opera · BCR sin actividad · Liquidaciones no se procesan
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="source">MATBA-ROFEX y BCR no operan en feriados nacionales</div>
      </div>
    </div>
  );
}
