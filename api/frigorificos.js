// api/frigorificos.js — Vercel Serverless Function
// ════════════════════════════════════════════════════════════════════════════
// Estrategia de datos (en cascada, de mayor a menor frescura):
//
//  NIVEL 1 — CSV oficial datos.magyp.gob.ar (Subsec. Ganadería)
//  NIVEL 2 — CSV serie de tiempo datos.magyp.gob.ar
//  NIVEL 3 — API Series de Tiempo datos.gob.ar (JSON)
//
//  Si todas las fuentes fallan → { ok: false, error: 'sin_datos' }
//  No hay datos embebidos ni fallback.
//
// Cache Vercel edge: 6hs. Revalidación background: 24hs.
// ════════════════════════════════════════════════════════════════════════════

const CSV_MENSUAL =
  'https://datos.magyp.gob.ar/dataset/672fe228-086e-4c00-bbe0-3500f8cfd62e/resource/46c21636-2a4d-44a4-a0c6-052836d51a3f/download/indicadores-ganaderos-mensuales.csv';

const CSV_SERIE =
  'https://datos.magyp.gob.ar/dataset/672fe228-086e-4c00-bbe0-3500f8cfd62e/resource/7afe10d1-e9bc-4383-9e3c-c8066bc21f65/download/serie-tiempo-indicadores-mensuales-bovinos.csv';

const SERIES_API =
  'https://apis.datos.gob.ar/series/api/series/?format=json&sort=asc&limit=72&ids=';

const SERIE_IDS_A_PROBAR = [
  'agroindustria_46c21636-2a4d-44a4-a0c6-052836d51a3f_faena_bovina_cabezas',
  'agroindustria_46c21636-2a4d-44a4-a0c6-052836d51a3f_faena_total',
  'agroindustria_7afe10d1-e9bc-4383-9e3c-c8066bc21f65_faena_bovina_cabezas',
];

const MAGYP_INFORME_BASE = 'https://www.magyp.gob.ar/comercio-agropecuario/pdf/Informe-Bovino_';
const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// ─── Utilidades ──────────────────────────────────────────────────────────────

async function fetchText(url, ms = 8000) {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, {
      signal:   ctrl.signal,
      redirect: 'follow',
      headers:  {
        'User-Agent':    'RadarAgro/2.0',
        'Accept':        'text/csv,text/plain,application/json,*/*',
        'Cache-Control': 'no-cache',
        'Pragma':        'no-cache',
      },
    });
    if (r.status === 304) {
      const r2 = await fetch(url, {
        signal:  AbortSignal.timeout(ms),
        redirect:'follow',
        cache:   'no-store',
        headers: { 'User-Agent': 'RadarAgro/2.0', 'Accept': '*/*' },
      });
      if (!r2.ok) throw new Error(`HTTP ${r2.status}`);
      return await r2.text();
    }
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.text();
  } finally { clearTimeout(timer); }
}

async function fetchJSON(url, ms = 7000) {
  return JSON.parse(await fetchText(url, ms));
}

function parseCSV(text) {
  const lines = text.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h =>
    h.trim().toLowerCase()
      .replace(/\s+/g,'_')
      .replace(/[áéíóú]/g, c => ({á:'a',é:'e',í:'i',ó:'o',ú:'u'}[c]||c))
  );
  return lines.slice(1).map(line => {
    const vals = line.split(',');
    const row  = {};
    headers.forEach((h, i) => {
      const v = (vals[i] || '').trim().replace(/"/g,'');
      row[h]  = v !== '' && !isNaN(v) ? Number(v) : v;
    });
    return row;
  });
}

function normCSVRow(row) {
  const fecha = row.indice_tiempo || row.fecha || row.periodo || row.mes || '';
  const total = row.faena_total   || row.faena_bovina || row.bovinos_cabezas || row.faena || 0;
  const peso  = row.peso_promedio_res || row.peso_res || row.peso_res_kg || 0;
  const hPct  = row.participacion_hembras || row.hembras_pct || row['%_hembras'] || 0;
  if (!fecha || !total || total < 100000) return null;
  return {
    mes:         fecha.slice(0,7),
    total:       Math.round(Number(total)),
    pesoRes:     peso ? +Number(peso).toFixed(1) : null,
    hembras_pct: hPct ? +Number(hPct).toFixed(1) : null,
    novillos:    row.novillos    || null,
    novillitos:  row.novillitos  || null,
    vacas:       row.vacas       || null,
    vaquillonas: row.vaquillonas || null,
    terneros:    row.terneros    || null,
    _fuente:     'csv_magyp',
  };
}

// ─── Fetchers ────────────────────────────────────────────────────────────────

async function tryCSVMensual() {
  for (const url of [CSV_MENSUAL, CSV_SERIE]) {
    try {
      const rows = parseCSV(await fetchText(url, 8000))
        .map(normCSVRow).filter(Boolean)
        .sort((a,b) => a.mes.localeCompare(b.mes));
      if (rows.length >= 12) { console.log('[frig] CSV ok:', url.split('/').pop()); return rows; }
    } catch (e) { console.warn('[frig] CSV fail:', e.message); }
  }
  return null;
}

async function trySeriesAPI() {
  for (const id of SERIE_IDS_A_PROBAR) {
    try {
      const data = await fetchJSON(SERIES_API + id, 6000);
      if (data?.data?.length >= 12) {
        const rows = data.data.map(d => {
          const val = Object.values(d).find(v => typeof v === 'number' && v > 100000);
          return { mes: String(d.indice_tiempo||d[0]).slice(0,7), total: Math.round(val||0), _fuente:'api_series' };
        }).filter(r => r.total > 100000);
        if (rows.length >= 12) { console.log('[frig] API series ok:', id); return rows; }
      }
    } catch (e) { console.warn('[frig] API series fail:', e.message); }
  }
  return null;
}

async function checkMagyPFrescura() {
  const now = new Date();
  for (let lag = 1; lag <= 3; lag++) {
    const d   = new Date(now.getFullYear(), now.getMonth() - lag, 1);
    const url = `${MAGYP_INFORME_BASE}${MESES_ES[d.getMonth()]}${d.getFullYear()}.pdf`;
    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 5000);
      const r = await fetch(url, { method:'HEAD', signal:ctrl.signal, redirect:'follow' });
      if (r.ok) return { url, mes:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` };
    } catch (_) { /* skip */ }
  }
  return null;
}

function buildHistoricoAnual(mensual) {
  const byAnio = {};
  mensual.forEach(m => {
    const anio = parseInt(m.mes.slice(0,4), 10);
    if (!byAnio[anio]) byAnio[anio] = [];
    byAnio[anio].push(m);
  });
  return Object.entries(byAnio)
    .filter(([, meses]) => meses.length >= 10)
    .map(([anioStr, meses]) => {
      const anio    = parseInt(anioStr, 10);
      const cabezas = meses.reduce((s,m) => s+(m.total||0), 0);
      const pesosConDato = meses.filter(m=>m.pesoRes).map(m=>m.pesoRes);
      const pesoRes = pesosConDato.length
        ? +(pesosConDato.reduce((a,b)=>a+b,0)/pesosConDato.length).toFixed(0)
        : null;
      const produccion = pesoRes ? Math.round(cabezas * pesoRes / 1e6) : null;
      return { anio, cabezas, pesoRes, produccion, _fuente: meses[0]._fuente || 'csv_magyp' };
    })
    .sort((a,b) => a.anio - b.anio);
}

function buildContexto(mensual, historicoAnual) {
  const anios = historicoAnual.slice().sort((a,b)=>a.anio-b.anio);
  const ult   = anios[anios.length-1];
  const pen   = anios[anios.length-2];
  const m2026 = mensual.filter(m=>m.mes?.startsWith('2026'));
  const m2025 = mensual.filter(m=>m.mes?.startsWith('2025'));
  let ctx2025 = null, ctx2026 = null;

  if (ult && ult.anio >= 2025) {
    const varPct = pen ? ((ult.cabezas - pen.cabezas)/pen.cabezas*100).toFixed(1) : null;
    const varStr = varPct != null ? (varPct >= 0 ? `+${varPct}%` : `${varPct}%`) : '';
    const hPctArr = m2025.filter(m=>m.hembras_pct).map(m=>m.hembras_pct);
    const hPct = hPctArr.length ? (hPctArr.reduce((a,b)=>a+b,0)/hPctArr.length).toFixed(1) : null;
    ctx2025 = `${ult.anio} cerró con ${(ult.cabezas/1e6).toFixed(2)} M de cabezas faenadas`
      + (varStr ? ` (${varStr} vs ${pen.anio})` : '')
      + (ult.pesoRes ? ` y peso promedio de ${ult.pesoRes} kg/res` : '')
      + (ult.produccion ? `. Producción estimada: ${ult.produccion} mil tn equivalente res` : '')
      + (hPct ? `. Participación de hembras: ${hPct}%` : '') + '.';
  }

  if (m2026.length > 0) {
    const ultimo  = m2026[m2026.length-1];
    const acum    = m2026.reduce((s,m)=>s+(m.total||0),0);
    const pesoArr = m2026.filter(m=>m.pesoRes).map(m=>m.pesoRes);
    const pesoUlt = pesoArr.length ? pesoArr[pesoArr.length-1] : null;
    const mesIdx  = m2025.find(m=>m.mes===ultimo.mes.replace('2026','2025'));
    const varIA   = mesIdx ? ((ultimo.total-mesIdx.total)/mesIdx.total*100).toFixed(1) : null;
    ctx2026 = `En 2026, ${m2026.length} ${m2026.length === 1 ? 'mes publicado' : 'meses publicados'} con ${(acum/1000).toFixed(0)} k cab. acumuladas`
      + (ultimo.mes ? ` (último: ${ultimo.mes})` : '')
      + (varIA != null ? `, variación i/a del último mes: ${varIA >= 0 ? '+' : ''}${varIA}%` : '')
      + (pesoUlt ? `. Peso prom. más reciente: ${pesoUlt} kg/res` : '') + '.';
  }

  return { ctx2025, ctx2026 };
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=86400');

  const t0  = Date.now();
  const log = { intentado: ['csv_magyp','api_series','magyp_head_check','consignatarias'], usado: [] };

  const [csvData, apiData, magyp, dirRes] = await Promise.allSettled([
    tryCSVMensual(),
    trySeriesAPI(),
    checkMagyPFrescura(),
    fetch('https://www.consignatarias.com.ar/api/frigorificos?limit=20', {
      headers:{ 'User-Agent':'RadarAgro/2.0' }, redirect:'follow',
      signal: AbortSignal.timeout(5000),
    }).then(r => r.ok ? r.json() : null).catch(() => null),
  ]);

  const liveData  = csvData.value || apiData.value || null;
  const magyPInfo = magyp.value   || null;
  const dirJSON   = dirRes.value  || null;

  if (csvData.value)      log.usado.push('csv_magyp');
  else if (apiData.value) log.usado.push('api_series');
  if (magyPInfo)          log.usado.push('magyp_head_check');
  if (dirJSON)            log.usado.push('consignatarias');

  // Sin datos vivos → respuesta vacía, sin fallback
  if (!liveData) {
    return res.status(200).json({
      ok:    false,
      error: 'sin_datos',
      meta: {
        fuentes_intentadas: log.intentado,
        fuentes_usadas:     log.usado,
        tiempoMs:           Date.now() - t0,
        generadoEn:         new Date().toISOString(),
        mensaje:            'No fue posible obtener datos de ninguna fuente externa (MAGYP / datos.gob.ar).',
      },
    });
  }

  const fuentePrimaria = csvData.value
    ? 'CSV oficial MAGYP (datos.magyp.gob.ar)'
    : 'API Series datos.gob.ar';

  const mensual = liveData.sort((a,b) => a.mes.localeCompare(b.mes));
  const ultimo  = mensual[mensual.length - 1];

  const historicoAnual = buildHistoricoAnual(mensual);

  // KPIs
  const anioActual = new Date().getFullYear();
  const a0   = historicoAnual.find(a => a.anio === anioActual - 1)
            || historicoAnual[historicoAnual.length - 1];
  const aPrev    = a0 ? historicoAnual.find(a => a.anio === a0.anio - 1) : null;
  const varAnual = a0 && aPrev
    ? +((a0.cabezas - aPrev.cabezas) / aPrev.cabezas * 100).toFixed(2) : null;

  const m2026 = mensual.filter(m => m.mes?.startsWith('2026'));
  const m2025 = mensual.filter(m => m.mes?.startsWith('2025'));

  // Categorías
  const mRef   = m2025.length >= 10 ? m2025 : mensual.slice(-12);
  const catAcc = mRef.reduce((acc, m) => ({
    novillos:    acc.novillos    + (m.novillos    || 0),
    novillitos:  acc.novillitos  + (m.novillitos  || 0),
    vacas:       acc.vacas       + (m.vacas       || 0),
    vaquillonas: acc.vaquillonas + (m.vaquillonas || 0),
    terneros:    acc.terneros    + (m.terneros    || 0),
  }), { novillos:0, novillitos:0, vacas:0, vaquillonas:0, terneros:0 });
  const totCat    = Object.values(catAcc).reduce((a,b)=>a+b,0);
  const categorias = Object.entries(catAcc)
    .filter(([,v]) => v > 0)
    .map(([nombre, cabezas]) => ({
      nombre, cabezas,
      participacion: totCat > 0 ? +((cabezas/totCat)*100).toFixed(2) : 0,
    }))
    .sort((a,b) => b.cabezas - a.cabezas);

  // Ciclo ganadero
  const hembrasArr     = m2025.filter(m=>m.hembras_pct).map(m=>m.hembras_pct);
  const hembras2025avg = hembrasArr.length
    ? +(hembrasArr.reduce((a,b)=>a+b,0)/hembrasArr.length).toFixed(1) : null;
  const h2026arr       = m2026.filter(m=>m.hembras_pct).map(m=>m.hembras_pct);
  const hembras2026avg = h2026arr.length
    ? +(h2026arr.reduce((a,b)=>a+b,0)/h2026arr.length).toFixed(1) : null;

  const fase = !hembras2025avg ? 'sin_datos'
             : hembras2025avg < 46   ? 'retención'
             : hembras2025avg > 48.5 ? 'liquidación' : 'retención_leve';

  const { ctx2025, ctx2026 } = buildContexto(mensual, historicoAnual);

  // Directorio (sólo si llegó de consignatarias)
  let frigCount   = null;
  let frigMuestra = [];
  if (dirJSON?.data?.length) {
    frigCount   = dirJSON.meta?.total ?? null;
    frigMuestra = dirJSON.data.slice(0,12).map(f => ({
      nombre:     f.nombre || f.razon_social || '—',
      matricula:  f.matricula || '—',
      provincia:  f.provincia || '—',
      exportador: !!f.exportador,
    }));
  }

  return res.status(200).json({
    ok: true,
    meta: {
      fuentePrimaria,
      usandoFallback:       false,
      fuentes_intentadas:   log.intentado,
      fuentes_usadas:       log.usado,
      ultimoDatoDisponible: ultimo?.mes,
      magyp_informe_url:    magyPInfo?.url || null,
      magyp_informe_mes:    magyPInfo?.mes || null,
      tiempoMs:             Date.now() - t0,
      generadoEn:           new Date().toISOString(),
      licencia:             'CC-BY 4.0 · Fuente: MAGYP · SENASA · datos.gob.ar',
    },

    kpis: {
      faenaAnualRef:        a0?.cabezas     ?? null,
      anioRef:              a0?.anio        ?? null,
      varAnual,
      pesoResRef:           a0?.pesoRes     ?? null,
      produccionRef:        a0?.produccion  ?? null,
      ultimoMes:            ultimo?.mes,
      ultimoMesCabezas:     ultimo?.total   ?? null,
      ultimoMesPeso:        ultimo?.pesoRes ?? null,
      ultimoMesHembras:     ultimo?.hembras_pct ?? null,
      acumMeses2026:        m2026.length,
      acumulado2026:        m2026.reduce((s,m)=>s+(m.total||0),0),
      frigoriificosActivos: frigCount,
    },

    analisis: {
      faseCiclo:      fase,
      hembras2025pct: hembras2025avg,
      hembras2026pct: hembras2026avg,
      tendenciaPeso: (() => {
        const pesos = mensual.filter(m=>m.pesoRes).slice(-12).map(m=>m.pesoRes);
        if (pesos.length < 2) return 'sin datos';
        const delta = pesos[pesos.length-1] - pesos[0];
        return delta > 1 ? 'creciente' : delta < -1 ? 'decreciente' : 'estable';
      })(),
      interpretacion: {
        'retención':      'Participación de hembras < 46%: retención de vientres → recomposición de stock. Menor oferta esperada a mediano plazo y tendencia alcista de precios.',
        'retención_leve': hembras2025avg ? `Participación de hembras ~${hembras2025avg}%: leve retención. Ciclo en transición hacia menor oferta.` : '',
        'liquidación':    'Participación de hembras > 48.5%: liquidación activa → presión bajista de corto plazo; riesgo de déficit de stock futuro.',
        'sin_datos':      '',
      }[fase] || '',
      contexto2025: ctx2025,
      contexto2026: ctx2026,
    },

    historicoAnual,
    mensualReciente: mensual,
    categorias,

    directorio: {
      total:   frigCount,
      muestra: frigMuestra,
      fuente:  frigMuestra.length > 0 ? 'consignatarias.com.ar · SENASA' : null,
    },
    topFrigorificos:   frigMuestra,
    faenaPorProvincia: [],
  });
}
