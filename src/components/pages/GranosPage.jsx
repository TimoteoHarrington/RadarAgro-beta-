// GranosPage.jsx — Redesigned with full API coverage from Downtack PDF
import React, { useState } from 'react';
import {
  GRANOS_OVERVIEW, GRANOS_PIZARRAS, GRANOS_FOB_FAS,
  GRANOS_FUTUROS, GRANOS_SIO, GRANOS_SUBPRODUCTOS,
  HIST_MESES, HIST_SOJA, HIST_MAIZ, HIST_TRIGO, HIST_GIRASOL, HIST_SORGO,
  HIST_HARINA_SOJA, HIST_ACEITE_SOJA,
  HIST_BASIS_SOJA, HIST_BASIS_MAIZ, HIST_BASIS_TRIGO,
  CBOT_DATA,
} from '../../data/granos.js';

// ── Helpers ──────────────────────────────────────────────────
const fmtARS = v => v == null ? 'S/C' : '$\u00a0' + v.toLocaleString('es-AR');
const fmtUSD = v => v == null ? '—' : 'USD\u00a0' + v.toLocaleString('es-AR');
const fmtPct = v => {
  if (v === 0) return '= 0%';
  return (v > 0 ? '+' : '') + v.toFixed(1) + '%';
};
const dir = v => v > 0 ? 'up' : v < 0 ? 'dn' : 'fl';

function Pill({ d, children }) {
  return <span className={`pill ${d}`}>{children}</span>;
}

// ── Mini sparkline SVG ────────────────────────────────────────
function Spark({ pts, color }) {
  return (
    <svg viewBox="0 0 80 40" style={{ width: 60, height: 24, display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

// ── Overview cards strip ──────────────────────────────────────
function OverviewCards({ moneda }) {
  const colorMap = { green: 'var(--green)', gold: 'var(--gold)', blue: 'var(--accent)', flat: 'var(--text3)' };
  return (
    <div className="grid grid-3" style={{ marginBottom: 28 }}>
      {GRANOS_OVERVIEW.map(g => {
        const precio = moneda === 'ARS' ? fmtARS(g.precioARS) : fmtUSD(g.precioUSD);
        const d = dir(g.variacionPct);
        const c = colorMap[g.color] || 'var(--text3)';
        return (
          <div key={g.id} className={`stat c-${g.color === 'flat' ? 'flat' : g.color}`}>
            <div className="stat-label">
              {g.nombre} · Rosario
              <span className={`stat-badge ${d}`}>{fmtPct(g.variacionPct)}</span>
            </div>
            <div className="stat-val">{precio}</div>
            <div className={`stat-delta ${d}`}>
              {moneda === 'ARS'
                ? (g.deltaARS !== 0 ? (g.deltaARS > 0 ? '+' : '') + fmtARS(g.deltaARS) + ' · ' : '= sin cambios · ')
                : ''}
              {moneda === 'USD' ? '' : 'USD ' + g.precioUSD + '/tn'}
            </div>
            <div className="stat-meta">
              FOB: USD {g.fob}/tn · FAS: USD {g.fas}/tn
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── TAB: Pizarras ────────────────────────────────────────────
function TabPizarras({ moneda }) {
  const tc = 1246; // tipo de cambio mock
  return (
    <div>
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
                const fmt = v => moneda === 'ARS' ? fmtARS(v) : (v ? fmtUSD(Math.round(v / tc)) : 'S/C');
                return (
                  <tr key={row.producto}>
                    <td className="bold">{row.producto}</td>
                    <td className="r w">{fmt(row.rosario)}</td>
                    <td className={`r ${row.bsas ? 'mono' : 'dim'}`}>{fmt(row.bsas)}</td>
                    <td className={`r ${row.bahia ? 'mono' : 'dim'}`}>{fmt(row.bahia)}</td>
                    <td className={`r ${row.queq  ? 'mono' : 'dim'}`}>{fmt(row.queq)}</td>
                    <td className={`r ${row.cordoba ? 'mono' : 'dim'}`}>{fmt(row.cordoba)}</td>
                    <td className="r"><Pill d={row.varDir}>{fmtPct(row.varPct)}</Pill></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div className="source">Fuente: BCR — Cámara Arbitral de Cereales · 30-03-2026</div>

      {/* Basis Analysis */}
      <div style={{ marginTop: 24 }}>
        <div className="section-title">Análisis Basis — BCR Rosario vs CBOT</div>
        <div style={{ background: 'var(--bg1)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--line)', fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
            Basis = Precio local (BCR) − Precio internacional (CBOT). Basis negativo = descuento por retenciones + logística.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr 1px 1fr', background: 'var(--line)' }}>
            {[
              { name: 'Soja',  bcr: 'USD 366', cbot: 'USD 419', basis: '−USD 53', bc: 'var(--red)',   nota: '−12,6% vs CBOT · ret. 33%+flete' },
              { name: 'Maíz',  bcr: 'USD 202', cbot: 'USD 186', basis: '+USD 16', bc: 'var(--green)', nota: '+8,6% sobre CBOT · demanda local' },
              { name: 'Trigo', bcr: 'USD 199', cbot: 'USD 204', basis: '−USD 5',  bc: 'var(--text3)', nota: '−2,5% · diferencial pequeño' },
            ].map((item, i) => (
              <React.Fragment key={item.name}>
                <div style={{ background: 'var(--bg1)', padding: '18px 20px' }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 10 }}>{item.name}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span style={{ fontSize: 12, color: 'var(--text2)' }}>BCR Rosario</span><span style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--white)' }}>{item.bcr}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span style={{ fontSize: 12, color: 'var(--text2)' }}>CBOT MAR-26</span><span style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--white)' }}>{item.cbot}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--line)' }}><span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>Basis</span><span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: item.bc }}>{item.basis}</span></div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)', marginTop: 4 }}>{item.nota}</div>
                </div>
                {i < 2 && <div style={{ background: 'var(--line)' }} />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── TAB: FOB / FAS ───────────────────────────────────────────
function TabFobFas() {
  return (
    <div>
      <div className="alert-strip info" style={{ marginBottom: 20 }}>
        <span className="alert-icon">ℹ</span>
        <span className="alert-text">Precios <strong>FOB</strong> (Free On Board) y <strong>FAS</strong> (Free Alongside Ship) expresados en <strong>USD/tn</strong> · Puerto Rosario salvo indicación · Fuente: Downtack</span>
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
              {GRANOS_FOB_FAS.map(row => (
                <tr key={row.id}>
                  <td className="bold">{row.nombre}</td>
                  <td className="r w mono">{row.fob != null ? `USD ${row.fob}` : '—'}</td>
                  <td className="r">{row.varFob != null ? <Pill d={dir(row.varFob)}>{fmtPct(row.varFob)}</Pill> : <span className="dim">—</span>}</td>
                  <td className="r mono">{row.fas != null ? `USD ${row.fas}` : <span className="dim">—</span>}</td>
                  <td className="r">{row.varFas != null ? <Pill d={dir(row.varFas)}>{fmtPct(row.varFas)}</Pill> : <span className="dim">—</span>}</td>
                  <td className="r mono dim">{row.retencion}</td>
                  <td className="dim" style={{ fontSize: 11 }}>{row.nota}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="source">Fuente: Downtack / BCR · 30-03-2026</div>
    </div>
  );
}

// ── TAB: Futuros ─────────────────────────────────────────────
function TabFuturos() {
  const [activeCereal, setActiveCereal] = useState('soja');
  const cereal = GRANOS_FUTUROS.find(c => c.id === activeCereal) || GRANOS_FUTUROS[0];

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
        {/* Matba-Rofex */}
        <div>
          <div className="section-title">Matba-Rofex (ARS/tn)</div>
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
          <div className="source">Fuente: Matba-Rofex · 30-03-2026</div>
        </div>

        {/* CBOT / US */}
        <div>
          <div className="section-title">Chicago / CBOT (USD/tn)</div>
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>Contrato</th><th className="r">USD/tn</th><th className="r">Var. %</th><th className="r">Máx.</th><th className="r">Mín.</th></tr></thead>
              <tbody>
                {cereal.us.map(f => (
                  <tr key={f.contrato}>
                    <td className="bold">{f.contrato}</td>
                    <td className="r w mono">{f.precio}</td>
                    <td className="r"><Pill d={f.varDir}>{fmtPct(f.varPct)}</Pill></td>
                    <td className="r dim mono">{f.max}</td>
                    <td className="r dim mono">{f.min}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="source">Fuente: CME Group (CBOT) · 30-03-2026</div>
        </div>
      </div>
    </div>
  );
}

// ── TAB: SIO Promedios ───────────────────────────────────────
function TabSIO() {
  return (
    <div>
      <div className="alert-strip info" style={{ marginBottom: 20 }}>
        <span className="alert-icon">ℹ</span>
        <span className="alert-text">Indicadores del <strong>Sistema de Información de Operaciones (SIO)</strong> del MINAGRI y Bolsa de Cereales. Promedios de operaciones registradas.</span>
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
                if (g.promedio) rows.push({ label: 'Promedio SIO', precio: g.promedio.precio, var: g.promedio.var, varDir: g.promedio.varDir, nota: g.promedio.nota });
                if (g.camara)   rows.push({ label: 'Cámara SIO',   precio: g.camara.precio,   var: g.camara.var,   varDir: g.camara.varDir,   nota: g.camara.nota });
                if (g.fabrica)  rows.push({ label: 'Fábrica SIO',  precio: g.fabrica.precio,  var: g.fabrica.var,  varDir: g.fabrica.varDir,  nota: g.fabrica.nota });
                if (g.ros)      rows.push({ label: 'ROS/Disp.',    precio: g.ros.ars,          var: null,           varDir: 'fl',              nota: g.ros.nota });
                if (g.ba)       rows.push({ label: 'BA/Disp.',     precio: g.ba.ars,           var: null,           varDir: 'fl',              nota: g.ba.nota });
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
      <div className="source">Fuente: SIO MINAGRI · BCR · 30-03-2026</div>
    </div>
  );
}

// ── TAB: Subproductos ────────────────────────────────────────
function TabSubproductos() {
  const s = GRANOS_SUBPRODUCTOS.soja;
  const g = GRANOS_SUBPRODUCTOS.girasol;
  return (
    <div>
      <div className="section-title">Complejo Sojero</div>
      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        {[
          { label: 'Harina Soja FOB',      valor: `USD ${s.harinaFob.precio}`,   unidad: s.harinaFob.unidad,   var: s.harinaFob.var,   varDir: s.harinaFob.varDir },
          { label: 'Aceite Soja FOB',      valor: `USD ${s.aceiteFob.precio}`,   unidad: s.aceiteFob.unidad,   var: s.aceiteFob.var,   varDir: s.aceiteFob.varDir },
          { label: 'Harina Soja Fut. US',  valor: `USD ${s.harinaFutUs.precio}`, unidad: s.harinaFutUs.unidad, var: s.harinaFutUs.var, varDir: s.harinaFutUs.varDir },
          { label: 'Aceite Soja Fut. US',  valor: `${s.aceiteFutUs.precio}¢`,    unidad: 'USc/lb',             var: s.aceiteFutUs.var, varDir: s.aceiteFutUs.varDir },
        ].map(item => (
          <div key={item.label} className={`stat c-${item.varDir === 'up' ? 'green' : item.varDir === 'dn' ? 'red' : 'flat'}`}>
            <div className="stat-label">
              {item.label}
              <span className={`stat-badge ${item.varDir}`}>{fmtPct(item.var)}</span>
            </div>
            <div className="stat-val sm">{item.valor}</div>
            <div className="stat-meta">{item.unidad}</div>
          </div>
        ))}
      </div>

      {/* Crush margin */}
      <div style={{ background: 'var(--bg1)', border: '1px solid var(--line)', borderRadius: 12, padding: '16px 20px', marginBottom: 24 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 12 }}>Relación Crush Soja</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1, background: 'var(--line)', borderRadius: 8, overflow: 'hidden' }}>
          {[
            { label: 'Crushing Margin', valor: `USD ${s.crush}`, sub: 'USD/tn procesada' },
            { label: 'Relación H/A',    valor: `${s.relacionHarinaAceite}×`, sub: 'Harina/Aceite precio' },
            { label: 'Soja Grano FOB',  valor: 'USD 396', sub: 'vs USD 298 harina' },
          ].map(item => (
            <div key={item.label} style={{ background: 'var(--bg1)', padding: '12px 16px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)', letterSpacing: '.06em', marginBottom: 6 }}>{item.label}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}>{item.valor}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)', marginTop: 3 }}>{item.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Histórico harina y aceite */}
      <div style={{ background: 'var(--bg1)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden', marginBottom: 28 }}>
        <div style={{ padding: '14px 20px 12px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text3)' }}>Evolución Subproductos Soja · USD/tn · 12 meses</div>
          <div style={{ display: 'flex', gap: 16 }}>
            {[['Harina Soja','#56c97a'],['Aceite Soja ÷10','#4d9ef0']].map(([l,c]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 20, height: 2, background: c, borderRadius: 1 }} />
                <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)' }}>{l}</span>
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

      <div className="section-title" style={{ marginTop: 28 }}>Complejo Girasol</div>
      <div className="grid grid-2">
        <div className={`stat c-${dir(g.aceiteFob.var) === 'up' ? 'green' : 'flat'}`}>
          <div className="stat-label">Aceite Girasol FOB <span className={`stat-badge ${dir(g.aceiteFob.var)}`}>{fmtPct(g.aceiteFob.var)}</span></div>
          <div className="stat-val sm">USD {g.aceiteFob.precio}</div>
          <div className="stat-meta">USD/tn · Exportación</div>
        </div>
        <div className="stat c-flat">
          <div className="stat-label">Girasol Grano FOB</div>
          <div className="stat-val sm">USD 440</div>
          <div className="stat-meta">Retención 7% · Bahía Blanca</div>
        </div>
      </div>
      <div className="source" style={{ marginTop: 10 }}>Fuente: Downtack / BCR / CME Group · 30-03-2026</div>
    </div>
  );
}

// ── TAB: Histórico ────────────────────────────────────────────
function TabHistorico() {
  const [vista, setVista] = useState('granos');
  const seriesGranos = [
    { data: HIST_SOJA,    color: '#56c97a', label: 'Soja' },
    { data: HIST_MAIZ,    color: '#f0b840', label: 'Maíz' },
    { data: HIST_TRIGO,   color: '#4d9ef0', label: 'Trigo' },
    { data: HIST_GIRASOL.map(v => v / 2), color: '#f07070', label: 'Girasol ÷2' },
  ];
  const seriesBasis = [
    { data: HIST_BASIS_SOJA,  color: '#56c97a', label: 'Basis Soja' },
    { data: HIST_BASIS_MAIZ,  color: '#f0b840', label: 'Basis Maíz' },
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
      <div style={{ background: 'var(--bg1)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px 12px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text3)' }}>
              {vista === 'granos' ? 'Evolución de precios — USD/tn · BCR Rosario · últimos 12 meses' : 'Basis histórico — BCR vs CBOT · USD/tn · últimos 12 meses'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {series.map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 20, height: 2, background: s.color, borderRadius: 1 }} />
                <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)' }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
        <MiniLineChart series={series} labels={HIST_MESES} height={220} />
        {/* Stats strip */}
        {vista === 'granos' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, background: 'var(--line)', borderTop: '1px solid var(--line)' }}>
            {[
              ['Soja prom. 6m', 'USD 369', 'var(--green)', 'vs USD 366 hoy'],
              ['Maíz prom. 6m', 'USD 207', 'var(--gold)',  'vs USD 202 hoy'],
              ['Soja/Maíz ratio', '1,81×', 'var(--white)', 'relación actual'],
              ['Trigo prom. 6m', 'USD 208', 'var(--accent)', 'vs USD 199 hoy'],
            ].map(([l, v, c, m]) => (
              <div key={l} style={{ background: 'var(--bg2)', padding: '10px 14px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--text3)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 4 }}>{l}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 700, color: c }}>{v}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)' }}>{m}</div>
              </div>
            ))}
          </div>
        )}
        {vista === 'basis' && (
          <div style={{ background: 'var(--bg2)', borderTop: '1px solid var(--line)', padding: '12px 20px', fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
            Basis negativo (soja/trigo): el precio local es inferior al internacional por retenciones y costo logístico. Basis positivo (maíz): mayor demanda local eleva el precio interno sobre el referencial CBOT.
          </div>
        )}
      </div>
    </div>
  );
}

// ── Mini Line Chart (pure CSS/SVG) ───────────────────────────
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
      {/* Y grid lines */}
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
      {/* X labels */}
      {labels.map((l, i) => (
        <text key={i} x={xPos(i)} y={h - 4} textAnchor="middle" fontSize={8} fill="var(--text3)" fontFamily="monospace">{l}</text>
      ))}
      {/* Series */}
      {series.map(s => (
        <g key={s.label}>
          <path d={mkArea(s.data)} fill={s.color} opacity={0.07} />
          <path d={mkPath(s.data)} fill="none" stroke={s.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          {/* Endpoint dot */}
          <circle cx={xPos(n-1)} cy={yPos(s.data[n-1])} r={3} fill={s.color} />
        </g>
      ))}
    </svg>
  );
}

// ── Main GranosPage ──────────────────────────────────────────
const TABS = [
  { id: 'pizarras',      label: 'Pizarras' },
  { id: 'fob-fas',       label: 'FOB / FAS' },
  { id: 'futuros',       label: 'Futuros' },
  { id: 'sio',           label: 'SIO Promedios' },
  { id: 'subproductos',  label: 'Subproductos' },
  { id: 'historico',     label: 'Histórico' },
];

export function GranosPage({ goPage }) {
  const [moneda, setMoneda]     = useState('ARS');
  const [activeTab, setActiveTab] = useState('pizarras');

  return (
    <div className="page-enter">
      {/* Page Header */}
      <div className="ph">
        <div>
          <div className="ph-title">Granos <span className="help-pip" onClick={() => goPage('ayuda')} title="Ayuda">?</span></div>
          <div className="ph-sub">BCR · Pizarras · FOB/FAS · Futuros Matba/CBOT · SIO · Subproductos · 30/03/2026</div>
        </div>
        <div className="ph-right">
          <div className="toggle">
            <button className={`tg${moneda === 'ARS' ? ' active' : ''}`} onClick={() => setMoneda('ARS')}>ARS/tn</button>
            <button className={`tg${moneda === 'USD' ? ' active' : ''}`} onClick={() => setMoneda('USD')}>USD/tn</button>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <OverviewCards moneda={moneda} />

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
        {activeTab === 'pizarras'     && <TabPizarras moneda={moneda} />}
        {activeTab === 'fob-fas'      && <TabFobFas />}
        {activeTab === 'futuros'      && <TabFuturos />}
        {activeTab === 'sio'          && <TabSIO />}
        {activeTab === 'subproductos' && <TabSubproductos />}
        {activeTab === 'historico'    && <TabHistorico />}
      </div>
    </div>
  );
}
