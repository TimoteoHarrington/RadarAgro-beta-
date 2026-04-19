// GranosPage.jsx — Live data via /api/fob (MAGyP) + /api/mundo (CBOT)
import React, { useState, useEffect } from 'react';
import { ApiErrorBanner } from '../ui/StatCard';
import { fetchFOB } from '../../services/api';

// ── Datos estáticos — solo los que no tienen reemplazo live ──────────────────
// GRANOS_PIZARRAS: pizarras por ciudad — sin API disponible todavía
// GRANOS_FUTUROS: Matba-Rofex — sin API disponible todavía
// GRANOS_SIO: SIO promedios — sin API disponible todavía
// HIST_*: históricos de 12 meses — datos de referencia para gráficos
import {
  GRANOS_PIZARRAS,
  GRANOS_FUTUROS,
  GRANOS_SIO,
  HIST_MESES, HIST_SOJA, HIST_MAIZ, HIST_TRIGO, HIST_GIRASOL,
  HIST_HARINA_SOJA, HIST_ACEITE_SOJA,
  HIST_BASIS_SOJA, HIST_BASIS_MAIZ, HIST_BASIS_TRIGO,
} from '../../data/granos.js';

// ── Meta de granos: relación FAS/FOB y claves de API ─────────
// fasRatio derivado del mock: FAS/FOB histórico de cada cereal
const GRANOS_META = [
  { id:'soja',    nombre:'Soja',    cbotId:'soy',   fobKey:'soja',    fasRatio:0.778, retencion:'33%', color:'green' },
  { id:'maiz',    nombre:'Maíz',    cbotId:'corn',  fobKey:'maiz',    fasRatio:0.899, retencion:'12%', color:'gold'  },
  { id:'trigo',   nombre:'Trigo',   cbotId:'wheat', fobKey:'trigo',   fasRatio:0.902, retencion:'12%', color:'blue'  },
  { id:'girasol', nombre:'Girasol', cbotId:null,    fobKey:'girasol', fasRatio:0.932, retencion:'7%',  color:'gold'  },
  { id:'sorgo',   nombre:'Sorgo',   cbotId:null,    fobKey:'sorgo',   fasRatio:0.915, retencion:'12%', color:'flat'  },
  { id:'cebada',  nombre:'Cebada',  cbotId:null,    fobKey:'cebada',  fasRatio:0.916, retencion:'12%', color:'green' },
];

// ── Helpers ──────────────────────────────────────────────────
const fmtARS = v => v == null ? 'S/C' : '$\u00a0' + Math.round(v).toLocaleString('es-AR');
const fmtUSD = v => v == null ? '—'   : 'USD\u00a0' + v.toLocaleString('es-AR');
const fmtPct = v => {
  if (v == null) return '—';
  if (v === 0)   return '= 0%';
  return (v > 0 ? '+' : '') + v.toFixed(1) + '%';
};
const dir = v => v == null ? 'fl' : v > 0 ? 'up' : v < 0 ? 'dn' : 'fl';

function Pill({ d, children }) {
  return <span className={`pill ${d}`}>{children}</span>;
}

// Badge "EN VIVO"
function LiveBadge() {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontFamily: 'var(--mono)', fontSize: 8, fontWeight: 600,
      letterSpacing: '.08em', textTransform: 'uppercase',
      color: 'var(--green)', background: 'var(--green-bg)',
      padding: '2px 7px', borderRadius: 4,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
      EN VIVO
    </span>
  );
}

// Badge datos de referencia (static fallback)
function RefBadge({ fecha }) {
  return (
    <span style={{
      fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--text3)',
      background: 'var(--bg3)', padding: '2px 7px', borderRadius: 4,
    }}>
      REFERENCIA{fecha ? ` · ${fecha}` : ''}
    </span>
  );
}

// ── Skeleton loader ───────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="stat" style={{ cursor: 'default', opacity: 0.5 }}>
      <div style={{ height: 14, background: 'var(--bg3)', borderRadius: 4, width: '60%', marginBottom: 16 }} />
      <div style={{ height: 28, background: 'var(--bg3)', borderRadius: 4, width: '80%', marginBottom: 10 }} />
      <div style={{ height: 12, background: 'var(--bg3)', borderRadius: 4, width: '50%' }} />
    </div>
  );
}

// ── Mini Line Chart ───────────────────────────────────────────
function MiniLineChart({ series, labels, height = 200 }) {
  const w = 900, h = height;
  const pad = { t: 14, r: 20, b: 28, l: 42 };
  const allVals = series.flatMap(s => s.data);
  const minV = Math.min(...allVals);
  const maxV = Math.max(...allVals);
  const rangeV = maxV - minV || 1;
  const n = labels.length;

  const xPos = i => pad.l + (i / (n - 1)) * (w - pad.l - pad.r);
  const yPos = v => pad.t + (1 - (v - minV) / rangeV) * (h - pad.t - pad.b);
  const mkPath = data => data.map((v, i) => `${i === 0 ? 'M' : 'L'}${xPos(i).toFixed(1)},${yPos(v).toFixed(1)}`).join(' ');
  const mkArea = data => {
    const base = yPos(minV);
    return mkPath(data) + ` L${xPos(n-1).toFixed(1)},${base} L${xPos(0).toFixed(1)},${base} Z`;
  };

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height, display: 'block' }}>
      {[0, 0.25, 0.5, 0.75, 1].map(t => {
        const y = pad.t + (1 - t) * (h - pad.t - pad.b);
        const v = minV + t * rangeV;
        return (
          <g key={t}>
            <line x1={pad.l} y1={y} x2={w - pad.r} y2={y} stroke="var(--line)" strokeWidth="1" />
            <text x={pad.l - 6} y={y + 4} textAnchor="end" fontSize={8} fill="var(--text3)" fontFamily="monospace">{Math.round(v)}</text>
          </g>
        );
      })}
      {labels.map((l, i) => (
        <text key={i} x={xPos(i)} y={h - 4} textAnchor="middle" fontSize={8} fill="var(--text3)" fontFamily="monospace">{l}</text>
      ))}
      {series.map(s => (
        <g key={s.label}>
          <path d={mkArea(s.data)} fill={s.color} opacity={0.07} />
          <path d={mkPath(s.data)} fill="none" stroke={s.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={xPos(n-1)} cy={yPos(s.data[n-1])} r={3} fill={s.color} />
        </g>
      ))}
    </svg>
  );
}

// ── Overview cards strip ──────────────────────────────────────
function OverviewCards({ moneda, overview, loading }) {
  if (loading) {
    return (
      <div className="grid grid-3" style={{ marginBottom: 28 }}>
        {[0,1,2,3,4,5].map(i => <SkeletonCard key={i} />)}
      </div>
    );
  }
  return (
    <div className="grid grid-3" style={{ marginBottom: 28 }}>
      {overview.map(g => {
        const precio = moneda === 'ARS' ? fmtARS(g.precioARS) : fmtUSD(g.precioUSD);
        const d = dir(g.variacionPct);
        const varTxt = g.variacionPct != null
          ? (g.variacionPct > 0 ? '+' : '') + g.variacionPct.toFixed(1).replace('.', ',') + '%'
          : '—';
        return (
          <div key={g.id} className="stat" style={{ cursor: 'default' }}>
            <div style={{
              fontSize: '13px', fontWeight: 400, color: 'var(--text2)',
              marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span>{g.nombre}</span>
              {g.isLive ? <LiveBadge /> : <RefBadge />}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
              <div className="stat-val" style={{ fontSize: '22px', marginBottom: 0 }}>
                {precio}
              </div>
              <span style={{
                fontFamily: 'var(--mono)', fontSize: '11px', fontWeight: 600,
                color:      d === 'up' ? 'var(--green)' : d === 'dn' ? 'var(--red)' : 'var(--text3)',
                background: d === 'up' ? 'var(--green-bg)' : d === 'dn' ? 'var(--red-bg)' : 'transparent',
                padding:    d === 'fl' ? '0' : '2px 8px',
                borderRadius: '4px',
              }}>
                {varTxt}
              </span>
            </div>
            <div className="stat-meta">
              FOB: {g.fob != null ? `USD ${g.fob}` : '—'}/tn
              {' · '}
              FAS: {g.fas != null ? `USD ${g.fas}` : '—'}/tn
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── TAB: Pizarras ─────────────────────────────────────────────
function TabPizarras({ moneda, fobData, cbotSoja, cbotMaiz, cbotTrigo, tc }) {
  const tcVal = tc ?? null;

  const basisItems = [
    { name: 'Soja',  fob: fobData?.precios?.soja  ?? null, cbot: cbotSoja?.price  ?? null, isLive: !!(fobData?.precios?.soja  && cbotSoja?.price)  },
    { name: 'Maíz',  fob: fobData?.precios?.maiz  ?? null, cbot: cbotMaiz?.price  ?? null, isLive: !!(fobData?.precios?.maiz  && cbotMaiz?.price)  },
    { name: 'Trigo', fob: fobData?.precios?.trigo ?? null, cbot: cbotTrigo?.price ?? null, isLive: !!(fobData?.precios?.trigo && cbotTrigo?.price) },
  ].map(item => ({
    ...item,
    basis:    (item.fob != null && item.cbot != null) ? Math.round(item.fob - item.cbot) : null,
    basisPct: (item.fob != null && item.cbot != null) ? ((item.fob - item.cbot) / item.cbot * 100).toFixed(1) : null,
  }));

  return (
    <div>
      <div className="alert-strip info" style={{ marginBottom: 16 }}>
        <span className="alert-icon">ℹ</span>
        <span className="alert-text">
          Pizarras por ciudad disponibles próximamente. Precios FOB en vivo en la pestaña <strong>FOB / FAS</strong>.
        </span>
      </div>
      <div className="tbl-wrap">
        <div className="tbl-scroll">
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th className="r">Rosario</th>
                <th className="r">Bs. Aires</th>
                <th className="r">Bahía Blanca</th>
                <th className="r">Quequén</th>
                <th className="r">Córdoba</th>
                <th className="r">Var. %</th>
              </tr>
            </thead>
            <tbody>
              {GRANOS_PIZARRAS.map(row => {
                const fmt = v => moneda === 'ARS' ? fmtARS(v) : (v ? fmtUSD(Math.round(v / tcVal)) : 'S/C');
                return (
                  <tr key={row.producto}>
                    <td className="bold">{row.producto}</td>
                    <td className="r w">{fmt(row.rosario)}</td>
                    <td className={`r ${row.bsas    ? 'mono' : 'dim'}`}>{fmt(row.bsas)}</td>
                    <td className={`r ${row.bahia   ? 'mono' : 'dim'}`}>{fmt(row.bahia)}</td>
                    <td className={`r ${row.queq    ? 'mono' : 'dim'}`}>{fmt(row.queq)}</td>
                    <td className={`r ${row.cordoba ? 'mono' : 'dim'}`}>{fmt(row.cordoba)}</td>
                    <td className="r"><Pill d={row.varDir}>{fmtPct(row.varPct)}</Pill></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div className="source" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Fuente: BCR — Cámara Arbitral de Cereales</span>
        <RefBadge />
      </div>

      {/* Basis Analysis — en vivo */}
      <div style={{ marginTop: 24 }}>
        <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          Análisis Basis — FOB MAGyP vs CBOT
          {basisItems.some(b => b.isLive) ? <LiveBadge /> : <RefBadge />}
        </div>
        <div style={{ background: 'var(--bg1)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--line)', fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
            Basis = Precio FOB local (MAGyP) − Precio CBOT spot. Basis negativo = descuento por retenciones + logística.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr 1px 1fr', background: 'var(--line)' }}>
            {basisItems.map((item, i) => {
              const bc = item.basis == null ? 'var(--text3)' : item.basis > 0 ? 'var(--green)' : item.basis < 0 ? 'var(--red)' : 'var(--text3)';
              const sign = item.basis > 0 ? '+' : '';
              return (
                <React.Fragment key={item.name}>
                  <div style={{ background: 'var(--bg1)', padding: '18px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)', letterSpacing: '.08em', textTransform: 'uppercase' }}>{item.name}</div>
                      {item.isLive ? <LiveBadge /> : <RefBadge />}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: 'var(--text2)' }}>FOB MAGyP</span>
                      <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--white)' }}>{item.fob != null ? `USD ${item.fob}` : '—'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: 'var(--text2)' }}>CBOT Spot</span>
                      <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--white)' }}>{item.cbot != null ? `USD ${Math.round(item.cbot)}` : '—'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--line)' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>Basis</span>
                      <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: bc }}>
                        {item.basis != null ? `${sign}USD ${item.basis} (${sign}${item.basisPct}%)` : '—'}
                      </span>
                    </div>
                  </div>
                  {i < 2 && <div style={{ background: 'var(--line)' }} />}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── TAB: FOB / FAS — EN VIVO ──────────────────────────────────
function TabFobFas({ fobData, fobStatus, mundo }) {
  const isLive = fobStatus === 'ok' && fobData?.ok !== false;

  const rows = React.useMemo(() => {
    const getCbot = id => mundo?.items?.find(i => i.id === id);

    if (!fobData?.precios) return [];

    const p = fobData.precios;
    const liveRows = [
      { id:'soja',         nombre:'Soja',           fob: p.soja,           retencion:'33%', nota:'Puerto Rosario',          fasRatio:0.778, cbotId:'soy'     },
      { id:'soja-harina',  nombre:'Harina Soja',     fob: p.harina_soja,    retencion:'—',   nota:'Subproducto · 47% prot.', fasRatio:null,  cbotId:'soymeal' },
      { id:'soja-aceite',  nombre:'Aceite Soja',     fob: p.aceite_soja,    retencion:'—',   nota:'USD/tn · Exportación',    fasRatio:null,  cbotId:'soyoil'  },
      { id:'maiz',         nombre:'Maíz',            fob: p.maiz,           retencion:'12%', nota:'Puerto Rosario',          fasRatio:0.899, cbotId:'corn'    },
      { id:'trigo',        nombre:'Trigo',           fob: p.trigo,          retencion:'12%', nota:'Puerto Rosario',          fasRatio:0.902, cbotId:'wheat'   },
      { id:'girasol',      nombre:'Girasol',         fob: p.girasol,        retencion:'7%',  nota:'Bahía Blanca',            fasRatio:0.932, cbotId:null      },
      { id:'pellets-gir',  nombre:'Pellets Girasol', fob: p.pellets_girasol,retencion:'—',   nota:'Subproducto',             fasRatio:null,  cbotId:null      },
      { id:'cebada',       nombre:'Cebada',          fob: p.cebada,         retencion:'12%', nota:'Puerto Rosario',          fasRatio:0.916, cbotId:null      },
    ].filter(r => r.fob != null);

    return liveRows.map(row => {
      const cbot   = row.cbotId ? getCbot(row.cbotId) : null;
      const varFob = cbot?.change != null ? Math.round(cbot.change * 10) / 10 : null;
      const fas    = (row.fob && row.fasRatio) ? Math.round(row.fob * row.fasRatio) : null;
      const varFas = varFob != null ? Math.round(varFob * 0.9 * 10) / 10 : null;
      return { ...row, fas, varFob, varFas, isLive: true };
    });
  }, [fobData, mundo]);

  if (fobStatus === 'loading') {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text3)' }}>
        <div style={{ fontSize: 13 }}>Cargando precios FOB desde MAGyP…</div>
      </div>
    );
  }

  if (fobStatus === 'error' || rows.length === 0) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center' }}>
        <div className="alert-strip error" style={{ maxWidth: 480, margin: '0 auto' }}>
          <span className="alert-icon">⚠</span>
          <span className="alert-text">
            No se pudo obtener precios FOB desde MAGyP. El servidor puede estar sin datos para el día de hoy.
            {fobData?.error && <span style={{ display: 'block', marginTop: 4, fontSize: 11, opacity: 0.7 }}>{fobData.error}</span>}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="alert-strip info" style={{ marginBottom: 20 }}>
        <span className="alert-icon">ℹ</span>
        <span className="alert-text">
          Precios <strong>FOB</strong> y <strong>FAS</strong> en <strong>USD/tn</strong>.
          {' '}
          <>Fuente: <strong>MAGyP · Ley 21.453</strong> · <LiveBadge /> · Fecha: <strong>{fobData?.fecha ?? '—'}</strong></>
        </span>
      </div>

      <div className="tbl-wrap">
        <div className="tbl-scroll">
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th className="r">FOB (USD/tn)</th>
                <th className="r">Var. FOB</th>
                <th className="r">FAS (USD/tn)</th>
                <th className="r">Var. FAS</th>
                <th className="r">Retención</th>
                <th>Mercado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id}>
                  <td className="bold">{row.nombre}</td>
                  <td className="r w mono">{row.fob != null ? `USD ${row.fob}` : '—'}</td>
                  <td className="r">
                    {row.varFob != null
                      ? <Pill d={dir(row.varFob)}>{fmtPct(row.varFob)}</Pill>
                      : <span className="dim">—</span>}
                  </td>
                  <td className="r mono">{row.fas != null ? `USD ${row.fas}` : <span className="dim">—</span>}</td>
                  <td className="r">
                    {row.varFas != null
                      ? <Pill d={dir(row.varFas)}>{fmtPct(row.varFas)}</Pill>
                      : <span className="dim">—</span>}
                  </td>
                  <td className="r mono dim">{row.retencion}</td>
                  <td className="dim" style={{ fontSize: 11 }}>{row.nota}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="source" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Fuente: MAGyP · Ley 21.453 · {fobData?.fecha ?? ''}</span>
        <LiveBadge />
      </div>
    </div>
  );
}

// ── TAB: Futuros ──────────────────────────────────────────────
function TabFuturos({ mundo }) {
  const [activeCereal, setActiveCereal] = useState('soja');
  const cereal = GRANOS_FUTUROS.find(c => c.id === activeCereal) || GRANOS_FUTUROS[0];

  const cbotIdMap = { soja:'soy', maiz:'corn', trigo:'wheat', 'soja-harina-fut':'soymeal', 'soja-aceite-fut':'soyoil' };
  const cbotItem  = mundo?.items?.find(i => i.id === cbotIdMap[activeCereal]);

  const enrichedUs = cereal.us.map((f, idx) => {
    if (idx === 0 && cbotItem?.price != null) {
      const livePrice  = Math.round(cbotItem.price * 100) / 100;
      const liveChange = cbotItem.change != null ? Math.round(cbotItem.change * 100) / 100 : f.varPct;
      return { ...f, precio: livePrice, varPct: liveChange, varDir: dir(liveChange), isLive: true };
    }
    return { ...f, isLive: false };
  });

  return (
    <div>
      <div className="toggle" style={{ marginBottom: 20 }}>
        {GRANOS_FUTUROS.map(c => (
          <button
            key={c.id}
            className={`tg${activeCereal === c.id ? ' active' : ''}`}
            onClick={() => setActiveCereal(c.id)}
          >
            {c.nombre}
          </button>
        ))}
      </div>

      <div className="grid grid-2">
        <div>
          <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            Matba-Rofex (ARS/tn) <RefBadge />
          </div>
          {cereal.matba.length === 0
            ? <div style={{ color: 'var(--text3)', fontSize: 13, padding: '16px 0' }}>Sin contratos disponibles en Matba para este producto.</div>
            : (
              <div className="tbl-wrap">
                <table>
                  <thead><tr><th>Contrato</th><th className="r">ARS/tn</th><th className="r">Var. %</th></tr></thead>
                  <tbody>
                    {cereal.matba.map(f => (
                      <tr key={f.contrato}>
                        <td className="bold">{f.contrato}</td>
                        <td className="r w mono">{fmtARS(f.precio)}</td>
                        <td className="r"><Pill d={f.varDir}>{fmtPct(f.varPct)}</Pill></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
          <div className="source">Fuente: Matba-Rofex · datos de referencia</div>
        </div>

        <div>
          <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            Chicago / CBOT (USD/tn)
            {cbotItem?.price != null ? <LiveBadge /> : <RefBadge />}
          </div>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Contrato</th>
                  <th className="r">USD/tn</th>
                  <th className="r">Var. %</th>
                  <th className="r">Máx.</th>
                  <th className="r">Mín.</th>
                </tr>
              </thead>
              <tbody>
                {enrichedUs.map(f => (
                  <tr key={f.contrato}>
                    <td className="bold">
                      {f.contrato}
                      {f.isLive && (
                        <span style={{ marginLeft: 6, fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--green)' }}>● SPOT</span>
                      )}
                    </td>
                    <td className="r w mono">{f.precio}</td>
                    <td className="r"><Pill d={f.varDir}>{fmtPct(f.varPct)}</Pill></td>
                    <td className="r dim mono">{f.max}</td>
                    <td className="r dim mono">{f.min}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="source" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Fuente: CME Group · Yahoo Finance</span>
            {cbotItem?.price != null ? <LiveBadge /> : <RefBadge />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── TAB: SIO Promedios ────────────────────────────────────────
function TabSIO() {
  return (
    <div>
      <div className="alert-strip info" style={{ marginBottom: 20 }}>
        <span className="alert-icon">ℹ</span>
        <span className="alert-text">
          Indicadores del <strong>SIO</strong> (MINAGRI / Bolsa de Cereales).{' '}
          <RefBadge /> — API SIO en desarrollo.
        </span>
      </div>
      <div className="tbl-wrap">
        <div className="tbl-scroll">
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th className="r">Indicador</th>
                <th className="r">Precio (ARS)</th>
                <th className="r">Var. %</th>
                <th>Referencia</th>
              </tr>
            </thead>
            <tbody>
              {GRANOS_SIO.map(g => {
                const rows = [];
                if (g.promedio) rows.push({ label:'Promedio SIO', precio:g.promedio.precio, var:g.promedio.var, varDir:g.promedio.varDir, nota:g.promedio.nota });
                if (g.camara)   rows.push({ label:'Cámara SIO',   precio:g.camara.precio,   var:g.camara.var,   varDir:g.camara.varDir,   nota:g.camara.nota   });
                if (g.fabrica)  rows.push({ label:'Fábrica SIO',  precio:g.fabrica.precio,  var:g.fabrica.var,  varDir:g.fabrica.varDir,  nota:g.fabrica.nota  });
                if (g.ros)      rows.push({ label:'ROS/Disp.',    precio:g.ros.ars,          var:null,           varDir:'fl',              nota:g.ros.nota      });
                if (g.ba)       rows.push({ label:'BA/Disp.',     precio:g.ba.ars,           var:null,           varDir:'fl',              nota:g.ba.nota       });
                return rows.map((row, i) => (
                  <tr key={`${g.id}-${i}`}>
                    {i === 0 && <td className="bold" rowSpan={rows.length}>{g.nombre}</td>}
                    <td className="dim" style={{ fontSize: 11 }}>{row.label}</td>
                    <td className="r w mono">{fmtARS(row.precio)}</td>
                    <td className="r">{row.var != null ? <Pill d={row.varDir}>{fmtPct(row.var)}</Pill> : <span className="dim">—</span>}</td>
                    <td className="dim" style={{ fontFamily: 'var(--mono)', fontSize: 10 }}>{row.nota}</td>
                  </tr>
                ));
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div className="source">Fuente: SIO MINAGRI · BCR · datos de referencia</div>
    </div>
  );
}

// ── TAB: Subproductos ─────────────────────────────────────────
function TabSubproductos({ fobData, mundo }) {
  const harinaFobLive = fobData?.precios?.harina_soja ?? null;
  const aceiteFobLive = fobData?.precios?.aceite_soja  ?? null;
  const harinaFutItem = mundo?.items?.find(i => i.id === 'soymeal');
  const aceiteFutItem = mundo?.items?.find(i => i.id === 'soyoil');
  const sojaFobLive   = fobData?.precios?.soja ?? null;
  const girasolFobLive = fobData?.precios?.girasol ?? null;

  const harinaFob = harinaFobLive ?? null;
  const aceiteFob = aceiteFobLive ?? null;
  const harinaFut = harinaFutItem?.price != null ? Math.round(harinaFutItem.price) : null;
  const aceiteFut = aceiteFutItem?.price != null ? aceiteFutItem.price.toFixed(2) : null;
  const sojaFob   = sojaFobLive ?? null;

  const crushMargin = (harinaFob != null && aceiteFob != null && sojaFob != null)
    ? Math.round(harinaFob * 0.79 + aceiteFob * 0.19 - sojaFob)
    : null;

  const liveAny = harinaFobLive || aceiteFobLive || harinaFutItem || aceiteFutItem;

  const subCards = [
    { label:'Harina Soja FOB',     valor: harinaFob != null ? `USD ${harinaFob}` : '—',      unidad:'USD/tn', var: harinaFutItem?.change ?? null, isLive:!!harinaFobLive },
    { label:'Aceite Soja FOB',     valor: aceiteFob != null ? `USD ${aceiteFob}` : '—',      unidad:'USD/tn', var: aceiteFutItem?.change ?? null, isLive:!!aceiteFobLive },
    { label:'Harina Soja Fut. US', valor: harinaFut != null ? `USD ${harinaFut}` : '—',      unidad:'USD/tn', var: harinaFutItem?.change ?? null, isLive:!!harinaFutItem },
    { label:'Aceite Soja Fut. US', valor: aceiteFut != null ? `${aceiteFut}¢`    : '—',      unidad:'USc/lb', var: aceiteFutItem?.change ?? null, isLive:!!aceiteFutItem },
  ];

  return (
    <div>
      <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        Complejo Sojero {liveAny ? <LiveBadge /> : <RefBadge />}
      </div>
      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        {subCards.map(item => {
          const d = dir(item.var);
          return (
            <div key={item.label} className="stat" style={{ cursor: 'default' }}>
              <div style={{ fontSize:'13px', fontWeight:400, color:'var(--text2)', marginBottom:'8px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span>{item.label}</span>
                {item.isLive ? <LiveBadge /> : <RefBadge />}
              </div>
              <div style={{ display:'flex', alignItems:'baseline', gap:'10px', flexWrap:'wrap', marginBottom:'10px' }}>
                <div className="stat-val" style={{ fontSize:'20px', marginBottom:0 }}>{item.valor}</div>
                <span style={{ fontFamily:'var(--mono)', fontSize:'11px', fontWeight:600, color: d==='up'?'var(--green)':d==='dn'?'var(--red)':'var(--text3)', background: d==='up'?'var(--green-bg)':d==='dn'?'var(--red-bg)':'transparent', padding: d==='fl'?'0':'2px 8px', borderRadius:'4px' }}>
                  {fmtPct(item.var)}
                </span>
              </div>
              <div className="stat-meta">{item.unidad}</div>
            </div>
          );
        })}
      </div>

      <div style={{ background:'var(--bg1)', border:'1px solid var(--line)', borderRadius:12, padding:'16px 20px', marginBottom:24 }}>
        <div style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'.12em', textTransform:'uppercase', color:'var(--text3)', marginBottom:12 }}>
          Relación Crush Soja {sojaFobLive ? '— en vivo' : ''}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:1, background:'var(--line)', borderRadius:8, overflow:'hidden' }}>
          {[
            { label:'Crush Margin',   valor: crushMargin != null ? `USD ${crushMargin}` : '—', sub:'USD/tn procesada' },
            { label:'Harina/Aceite',  valor: (harinaFob != null && aceiteFob != null) ? `${(harinaFob/aceiteFob).toFixed(2)}×` : '—', sub:'ratio precio' },
            { label:'Soja Grano FOB', valor: sojaFob != null ? `USD ${sojaFob}` : '—', sub: harinaFob != null ? `vs USD ${Math.round(harinaFob)} harina` : '' },
          ].map(item => (
            <div key={item.label} style={{ background:'var(--bg1)', padding:'12px 16px', textAlign:'center' }}>
              <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--text3)', letterSpacing:'.06em', marginBottom:6 }}>{item.label}</div>
              <div style={{ fontFamily:'var(--mono)', fontSize:18, fontWeight:700, color:'var(--accent)' }}>{item.valor}</div>
              <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--text3)', marginTop:3 }}>{item.sub}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background:'var(--bg1)', border:'1px solid var(--line)', borderRadius:12, overflow:'hidden', marginBottom:28 }}>
        <div style={{ padding:'14px 20px 12px', borderBottom:'1px solid var(--line)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'.12em', textTransform:'uppercase', color:'var(--text3)' }}>
            Evolución Subproductos Soja · USD/tn · 12 meses
          </div>
          <div style={{ display:'flex', gap:16 }}>
            {[['Harina Soja','#56c97a'],['Aceite Soja ÷10','#4d9ef0']].map(([l,c]) => (
              <div key={l} style={{ display:'flex', alignItems:'center', gap:6 }}>
                <div style={{ width:20, height:2, background:c, borderRadius:1 }} />
                <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--text3)' }}>{l}</span>
              </div>
            ))}
          </div>
        </div>
        <MiniLineChart
          series={[
            { data: HIST_HARINA_SOJA, color: '#56c97a' },
            { data: HIST_ACEITE_SOJA.map(v => v / 10), color: '#4d9ef0' },
          ]}
          labels={HIST_MESES}
          height={180}
        />
      </div>

      <div className="section-title" style={{ marginTop:28 }}>Complejo Girasol</div>
      <div className="grid grid-2">
        <div className="stat" style={{ cursor:'default' }}>
          <div style={{ fontSize:'13px', fontWeight:400, color:'var(--text2)', marginBottom:'8px' }}>Aceite Girasol FOB</div>
          <div style={{ display:'flex', alignItems:'baseline', gap:'10px', flexWrap:'wrap', marginBottom:'10px' }}>
            <div className="stat-val" style={{ fontSize:'20px', marginBottom:0 }}>—</div>
          </div>
          <div className="stat-meta">USD/tn · Exportación · sin API disponible</div>
        </div>
        <div className="stat" style={{ cursor:'default' }}>
          <div style={{ fontSize:'13px', fontWeight:400, color:'var(--text2)', marginBottom:'8px' }}>Girasol Grano FOB</div>
          <div className="stat-val" style={{ fontSize:'20px', marginBottom:'10px' }}>
            {girasolFobLive != null ? `USD ${girasolFobLive}` : '—'}
          </div>
          <div className="stat-meta">Retención 7% · Bahía Blanca</div>
        </div>
      </div>
      <div className="source" style={{ marginTop:10, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span>Fuente: MAGyP / BCR / CME Group</span>
        {liveAny ? <LiveBadge /> : <RefBadge />}
      </div>
    </div>
  );
}

// ── TAB: Histórico ────────────────────────────────────────────
function TabHistorico({ fobData, mundo }) {
  const [vista, setVista] = useState('granos');

  const getCbot   = id => mundo?.items?.find(i => i.id === id);
  const cbotSoja  = getCbot('soy');
  const cbotMaiz  = getCbot('corn');
  const cbotTrigo = getCbot('wheat');

  // Actualizar último punto del histórico con datos en vivo
  const histSoja  = cbotSoja?.price  ? [...HIST_SOJA.slice(0,-1),  Math.round(cbotSoja.price)]  : HIST_SOJA;
  const histMaiz  = cbotMaiz?.price  ? [...HIST_MAIZ.slice(0,-1),  Math.round(cbotMaiz.price)]  : HIST_MAIZ;
  const histTrigo = cbotTrigo?.price ? [...HIST_TRIGO.slice(0,-1), Math.round(cbotTrigo.price)] : HIST_TRIGO;
  const hasLive   = !!(cbotSoja || cbotMaiz || cbotTrigo);

  const seriesGranos = [
    { data: histSoja,                    color: '#56c97a', label: 'Soja'      },
    { data: histMaiz,                    color: '#f0b840', label: 'Maíz'      },
    { data: histTrigo,                   color: '#4d9ef0', label: 'Trigo'     },
    { data: HIST_GIRASOL.map(v => v/2), color: '#f07070', label: 'Girasol ÷2'},
  ];
  const seriesBasis = [
    { data: HIST_BASIS_SOJA,  color: '#56c97a', label: 'Basis Soja'  },
    { data: HIST_BASIS_MAIZ,  color: '#f0b840', label: 'Basis Maíz'  },
    { data: HIST_BASIS_TRIGO, color: '#4d9ef0', label: 'Basis Trigo' },
  ];
  const series = vista === 'granos' ? seriesGranos : seriesBasis;

  return (
    <div>
      <div className="row-flex" style={{ marginBottom: 20 }}>
        <div className="toggle">
          <button className={`tg${vista === 'granos' ? ' active' : ''}`} onClick={() => setVista('granos')}>Precios USD/tn</button>
          <button className={`tg${vista === 'basis'  ? ' active' : ''}`} onClick={() => setVista('basis')}>Basis vs CBOT</button>
        </div>
      </div>
      <div style={{ background:'var(--bg1)', border:'1px solid var(--line)', borderRadius:12, overflow:'hidden' }}>
        <div style={{ padding:'14px 20px 12px', borderBottom:'1px solid var(--line)', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'.12em', textTransform:'uppercase', color:'var(--text3)' }}>
            {vista === 'granos' ? 'Evolución de precios — USD/tn · CBOT · últimos 12 meses' : 'Basis histórico — FOB MAGyP vs CBOT · USD/tn · últimos 12 meses'}
          </div>
          <div style={{ display:'flex', gap:16, flexWrap:'wrap', alignItems:'center' }}>
            {hasLive && vista === 'granos' && <LiveBadge />}
            {series.map(s => (
              <div key={s.label} style={{ display:'flex', alignItems:'center', gap:6 }}>
                <div style={{ width:20, height:2, background:s.color, borderRadius:1 }} />
                <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--text3)' }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
        <MiniLineChart series={series} labels={HIST_MESES} height={220} />
        {vista === 'granos' && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:1, background:'var(--line)', borderTop:'1px solid var(--line)' }}>
            {[
              ['Soja prom. 6m',    `USD ${Math.round(histSoja.slice(-6).reduce((a,b)=>a+b,0)/6)}`,  'var(--green)',  `vs USD ${histSoja.slice(-1)[0]} hoy`   ],
              ['Maíz prom. 6m',    `USD ${Math.round(histMaiz.slice(-6).reduce((a,b)=>a+b,0)/6)}`,  'var(--gold)',   `vs USD ${histMaiz.slice(-1)[0]} hoy`   ],
              ['Soja/Maíz ratio',  `${(histSoja.slice(-1)[0]/histMaiz.slice(-1)[0]).toFixed(2)}×`,  'var(--white)',  'relación actual'                       ],
              ['Trigo prom. 6m',   `USD ${Math.round(histTrigo.slice(-6).reduce((a,b)=>a+b,0)/6)}`, 'var(--accent)', `vs USD ${histTrigo.slice(-1)[0]} hoy`  ],
            ].map(([l,v,c,m]) => (
              <div key={l} style={{ background:'var(--bg2)', padding:'10px 14px', textAlign:'center' }}>
                <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--text3)', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:4 }}>{l}</div>
                <div style={{ fontFamily:'var(--mono)', fontSize:14, fontWeight:700, color:c }}>{v}</div>
                <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--text3)' }}>{m}</div>
              </div>
            ))}
          </div>
        )}
        {vista === 'basis' && (
          <div style={{ background:'var(--bg2)', borderTop:'1px solid var(--line)', padding:'12px 20px', fontSize:11, color:'var(--text3)', fontFamily:'var(--mono)' }}>
            Basis negativo (soja/trigo): el precio local es inferior al internacional por retenciones y logística. Basis positivo (maíz): mayor demanda local eleva el precio interno sobre el referencial CBOT.
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main GranosPage ───────────────────────────────────────────
const TABS = [
  { id:'pizarras',     label:'Pizarras'      },
  { id:'fob-fas',      label:'FOB / FAS'     },
  { id:'futuros',      label:'Futuros'       },
  { id:'sio',          label:'SIO Promedios' },
  { id:'subproductos', label:'Subproductos'  },
  { id:'historico',    label:'Histórico'     },
];

export function GranosPage({ goPage, apiStatus, reloadAll, dolares, mundo, loadMundo }) {
  const [moneda,    setMoneda]    = useState('ARS');
  const [activeTab, setActiveTab] = useState('pizarras');

  // ── Datos FOB en vivo ──────────────────────────────────────
  const [fobData,   setFobData]   = useState(null);
  const [fobStatus, setFobStatus] = useState('loading');

  useEffect(() => {
    fetchFOB()
      .then(({ data, error }) => {
        if (error || !data) { setFobStatus('error'); return; }
        setFobData(data);
        setFobStatus('ok');
      })
      .catch(() => setFobStatus('error'));

    // Disparar carga de mundo si todavía no está disponible
    if (!mundo && loadMundo) loadMundo();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Helpers ────────────────────────────────────────────────
  const getCbot = id => mundo?.items?.find(i => i.id === id) ?? null;
  const tc      = dolares?.pOf ?? null;

  // ── Construir overview con datos vivos ─────────────────────
  const overview = GRANOS_META.map((meta) => {
    const fobUSD = fobData?.precios?.[meta.fobKey] ?? null;
    const cbot   = meta.cbotId ? getCbot(meta.cbotId) : null;

    const precioUSD = fobUSD ?? null;
    const precioARS = (fobUSD && tc) ? Math.round(fobUSD * tc) : null;
    const change    = cbot?.change ?? null;
    const fob       = fobUSD ?? null;
    const fas       = (fobUSD && meta.fasRatio) ? Math.round(fobUSD * meta.fasRatio) : null;

    return {
      id: meta.id, nombre: meta.nombre,
      precioUSD, precioARS, variacionPct: change, varDir: dir(change),
      fob, fas, isLive: !!fobUSD, color: meta.color,
    };
  });

  const fechaFob = fobData?.fecha ?? null;
  const anyLive  = fobStatus === 'ok';

  return (
    <div className="page-enter">
      {/* Page Header */}
      <div className="ph">
        <div>
          <div className="ph-title">
            Granos{' '}
            <span className="help-pip" onClick={() => goPage('ayuda', 'glosario-granos')} title="Ayuda">?</span>
          </div>
          <div className="ph-sub" style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
            <span>BCR · Pizarras · FOB/FAS · Futuros Matba/CBOT · SIO · Subproductos</span>
            {anyLive
              ? <><LiveBadge />{fechaFob && <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--text3)' }}>· {fechaFob}</span>}</>
              : fobStatus === 'loading'
                ? <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--text3)' }}>cargando…</span>
                : <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--red)' }}>sin datos FOB · MAGyP no disponible</span>
            }
          </div>
        </div>
        <div className="ph-right">
          <div className="toggle">
            <button className={`tg${moneda === 'ARS' ? ' active' : ''}`} onClick={() => setMoneda('ARS')}>ARS/tn</button>
            <button className={`tg${moneda === 'USD' ? ' active' : ''}`} onClick={() => setMoneda('USD')}>USD/tn</button>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <OverviewCards moneda={moneda} overview={overview} loading={fobStatus === 'loading' && !fobData} />

      {/* Tabs */}
      <div className="tabs">
        {TABS.map(t => (
          <button key={t.id} className={`tab${activeTab === t.id ? ' active' : ''}`} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'pizarras'     && (
          <TabPizarras
            moneda={moneda} fobData={fobData}
            cbotSoja={getCbot('soy')} cbotMaiz={getCbot('corn')} cbotTrigo={getCbot('wheat')}
            tc={tc}
          />
        )}
        {activeTab === 'fob-fas'      && <TabFobFas fobData={fobData} fobStatus={fobStatus} mundo={mundo} />}
        {activeTab === 'futuros'      && <TabFuturos mundo={mundo} />}
        {activeTab === 'sio'          && <TabSIO />}
        {activeTab === 'subproductos' && <TabSubproductos fobData={fobData} mundo={mundo} />}
        {activeTab === 'historico'    && <TabHistorico fobData={fobData} mundo={mundo} />}
      </div>
    </div>
  );
}
