// api/frigorificos.js — Vercel Serverless Function
// ════════════════════════════════════════════════════════════════════════════
// Fuente principal: dataset sspm-faena-pecuaria (Ministerio de Economía)
//   → infra.datos.gob.ar — accesible desde Vercel, actualización mensual
//   → CSV mensual: sspm_40.3 | CSV anual: sspm_40.1
//   → API Series: apis.datos.gob.ar (mismo proveedor que usa indec.js)
//
// Por qué NO usamos datos.magyp.gob.ar ni www.magyp.gob.ar directamente:
//   Ambos dominios son inaccesibles desde AWS/Vercel (sin respuesta).
//   El mismo dataset es replicado y mantenido por el SSPM en infra.datos.gob.ar.
//
// Cascada:
//  1. CSV mensual  → infra.datos.gob.ar/catalog/sspm/dataset/40/distribution/40.3/...
//  2. API Series   → apis.datos.gob.ar (mismo que usa indec.js — confirmado funcional)
//  3. CSV anual    → infra.datos.gob.ar/catalog/sspm/dataset/40/distribution/40.1/...
//  Falla todo → { ok: false, error: 'sin_datos' } sin cache
// ════════════════════════════════════════════════════════════════════════════

// ─── URLs ────────────────────────────────────────────────────────────────────

// Dataset sspm-faena-pecuaria · Ministerio de Economía
// Actualización: mensual. Última actualización: 25 de abril 2026.
const CSV_MENSUAL =
  'https://infra.datos.gob.ar/catalog/sspm/dataset/40/distribution/40.3/download/faena-pecuaria-por-especies-valores-mensuales.csv';

const CSV_ANUAL =
  'https://infra.datos.gob.ar/catalog/sspm/dataset/40/distribution/40.1/download/faena-pecuaria-por-especies-valores-anuales.csv';

// API Series de Tiempo — mismo endpoint que usa indec.js (confirmado funcional desde Vercel)
const SERIES_BASE = 'https://apis.datos.gob.ar/series/api/series/?format=json&sort=asc&limit=120&ids=';

// Series bovinas del dataset sspm_40 (IDs a probar en cascada)
const SERIES_BOVINAS = [
  // Faena total bovina mensual (cabezas)
  'sspm_40.3_BOVI_M_FAENATOT_0',
  'sspm_40.3_BOVINOS_CABEZAS_M',
  'sspm_40.3_0',
  'sspm_40.3_1',
];

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function fetchText(url, ms = 10000) {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, {
      signal:   ctrl.signal,
      redirect: 'follow',
      headers:  {
        'User-Agent':    'RadarAgro/2.0 (radaragro.vercel.app)',
        'Accept':        'text/csv,text/plain,application/json,*/*',
        'Cache-Control': 'no-cache',
      },
    });
    if (!r.ok) throw new Error(`HTTP ${r.status} — ${url}`);
    return await r.text();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJSON(url, ms = 10000) {
  return JSON.parse(await fetchText(url, ms));
}

// ─── Parser CSV genérico ──────────────────────────────────────────────────────

function parseCSV(text) {
  const lines   = text.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h =>
    h.trim().toLowerCase().replace(/\s+/g, '_').replace(/[áéíóú]/g,
      c => ({á:'a',é:'e',í:'i',ó:'o',ú:'u'}[c]||c))
  );
  return lines.slice(1).map(line => {
    const vals = line.split(',');
    const row  = {};
    headers.forEach((h, i) => {
      const v = (vals[i] || '').trim().replace(/^"|"$/g, '');
      row[h]  = v !== '' && !isNaN(v) ? Number(v) : v;
    });
    return row;
  });
}

// ─── Normalización CSV sspm_40 ────────────────────────────────────────────────
// Columnas esperadas del CSV mensual:
// indice_tiempo, bovinos_cabezas, bovinos_toneladas, porcinos_cabezas, ...

function normRowMensual(row) {
  const fecha = row.indice_tiempo || row.fecha || row.periodo || '';
  if (!fecha || !/^\d{4}/.test(String(fecha))) return null;

  // Intentar varios nombres posibles de columna faena bovina
  const cabezas =
    row.bovinos_cabezas         ||
    row.bovino_cabezas          ||
    row.bovina_cabezas          ||
    row.faena_bovinos           ||
    row.bovinos                 ||
    row.cabezas_bovinos         ||
    null;

  if (!cabezas || cabezas < 50000) return null; // filtrar filas no bovinas

  const peso =
    row.bovinos_kg_res_c_hueso  ||
    row.bovinos_peso_promedio   ||
    row.peso_promedio_res       ||
    row.peso_res                ||
    null;

  const toneladas =
    row.bovinos_toneladas       ||
    row.bovino_toneladas        ||
    null;

  // Si no tenemos peso directo pero tenemos toneladas, calcularlo
  const pesoCalc = peso
    ? +Number(peso).toFixed(1)
    : (toneladas && cabezas)
      ? +((toneladas * 1000) / cabezas).toFixed(1)
      : null;

  return {
    mes:         String(fecha).slice(0, 7),
    total:       Math.round(Number(cabezas)),
    pesoRes:     pesoCalc && pesoCalc > 50 && pesoCalc < 600 ? pesoCalc : null,
    hembras_pct: row.hembras_pct || row.participacion_hembras || null,
    novillos:    row.novillos    ? Math.round(row.novillos)    : null,
    novillitos:  row.novillitos  ? Math.round(row.novillitos)  : null,
    vacas:       row.vacas       ? Math.round(row.vacas)       : null,
    vaquillonas: row.vaquillonas ? Math.round(row.vaquillonas) : null,
    terneros:    row.terneros    ? Math.round(row.terneros)    : null,
    _fuente: 'csv_sspm',
  };
}

function normRowAnual(row) {
  const anio = row.indice_tiempo || row.anio || row.year || '';
  if (!anio || isNaN(Number(anio))) return null;
  const cabezas = row.bovinos_cabezas || row.bovino_cabezas || row.bovinos || null;
  if (!cabezas || cabezas < 1e6) return null;
  return {
    anio:       Math.round(Number(anio)),
    cabezas:    Math.round(Number(cabezas)),
    pesoRes:    null,
    produccion: row.bovinos_toneladas ? Math.round(Number(row.bovinos_toneladas) / 1000) : null,
    _fuente:    'csv_sspm_anual',
  };
}

// ─── Fetchers ────────────────────────────────────────────────────────────────

async function tryCSVMensual() {
  try {
    const text = await fetchText(CSV_MENSUAL, 10000);
    console.log('[frig] CSV mensual raw (primeras 3 líneas):', text.split('\n').slice(0,3).join(' | '));
    const rows = parseCSV(text).map(normRowMensual).filter(Boolean)
      .sort((a, b) => a.mes.localeCompare(b.mes));
    if (rows.length >= 12) {
      console.log('[frig] CSV mensual ok — rows:', rows.length, '— último:', rows[rows.length-1]?.mes);
      return rows;
    }
    console.warn('[frig] CSV mensual parse vacío o insuficiente — headers detectados:', parseCSV(text)[0] ? Object.keys(parseCSV(text)[0]).join(',') : 'ninguno');
    return null;
  } catch (e) {
    console.warn('[frig] CSV mensual fail:', e.message);
    return null;
  }
}

async function trySeriesAPI() {
  for (const id of SERIES_BOVINAS) {
    try {
      const url  = SERIES_BASE + id;
      const data = await fetchJSON(url, 10000);
      if (data?.data?.length >= 12) {
        const rows = data.data
          .map(d => {
            const fecha = d.indice_tiempo || d[0];
            const val   = typeof d === 'object' ? Object.values(d).find(v => typeof v === 'number' && v > 50000) : null;
            if (!fecha || !val) return null;
            return { mes: String(fecha).slice(0,7), total: Math.round(val), _fuente: 'api_series_sspm' };
          })
          .filter(r => r && r.total > 50000);
        if (rows.length >= 12) {
          console.log('[frig] API series ok:', id, '— rows:', rows.length);
          return rows;
        }
      }
    } catch (e) {
      console.warn('[frig] API series fail:', id, e.message);
    }
  }
  return null;
}

async function tryCSVAnual() {
  try {
    const text = await fetchText(CSV_ANUAL, 10000);
    const rows = parseCSV(text).map(normRowAnual).filter(Boolean)
      .sort((a, b) => a.anio - b.anio);
    if (rows.length >= 5) {
      console.log('[frig] CSV anual ok — rows:', rows.length);
      return rows;
    }
    return null;
  } catch (e) {
    console.warn('[frig] CSV anual fail:', e.message);
    return null;
  }
}

// ─── Helpers analíticos ───────────────────────────────────────────────────────

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
      const cabezas = meses.reduce((s, m) => s + (m.total||0), 0);
      const pesosOk = meses.filter(m => m.pesoRes).map(m => m.pesoRes);
      const pesoRes = pesosOk.length
        ? +(pesosOk.reduce((a,b)=>a+b,0)/pesosOk.length).toFixed(0) : null;
      const produccion = pesoRes ? Math.round(cabezas * pesoRes / 1e6) : null;
      return { anio, cabezas, pesoRes, produccion, _fuente: meses[0]._fuente };
    })
    .sort((a, b) => a.anio - b.anio);
}

function buildContexto(mensual, historicoAnual) {
  const anios = historicoAnual.slice().sort((a,b) => a.anio - b.anio);
  const ult   = anios[anios.length-1];
  const pen   = anios[anios.length-2];
  const m2026 = mensual.filter(m => m.mes?.startsWith('2026'));
  const m2025 = mensual.filter(m => m.mes?.startsWith('2025'));
  let ctx2025 = null, ctx2026 = null;

  if (ult && ult.anio >= 2025) {
    const varPct = pen ? ((ult.cabezas - pen.cabezas)/pen.cabezas*100).toFixed(1) : null;
    const varStr = varPct != null ? (varPct>=0 ? `+${varPct}%` : `${varPct}%`) : '';
    const hArr   = m2025.filter(m=>m.hembras_pct).map(m=>m.hembras_pct);
    const hPct   = hArr.length ? (hArr.reduce((a,b)=>a+b,0)/hArr.length).toFixed(1) : null;
    ctx2025 = `${ult.anio} cerró con ${(ult.cabezas/1e6).toFixed(2)} M de cabezas faenadas`
      + (varStr ? ` (${varStr} vs ${pen.anio})` : '')
      + (ult.pesoRes ? ` y peso promedio de ${ult.pesoRes} kg/res` : '')
      + (ult.produccion ? `. Producción estimada: ${ult.produccion} mil tn equivalente res` : '')
      + (hPct ? `. Participación de hembras: ${hPct}%` : '') + '.';
  }

  if (m2026.length > 0) {
    const ultimo  = m2026[m2026.length-1];
    const acum    = m2026.reduce((s,m)=>s+(m.total||0), 0);
    const pesoArr = m2026.filter(m=>m.pesoRes).map(m=>m.pesoRes);
    const pesoUlt = pesoArr.length ? pesoArr[pesoArr.length-1] : null;
    const mesIdx  = m2025.find(m=>m.mes===ultimo.mes.replace('2026','2025'));
    const varIA   = mesIdx ? ((ultimo.total-mesIdx.total)/mesIdx.total*100).toFixed(1) : null;
    ctx2026 = `En 2026, ${m2026.length} ${m2026.length===1?'mes publicado':'meses publicados'} con ${(acum/1000).toFixed(0)} k cab. acumuladas`
      + (ultimo.mes ? ` (último: ${ultimo.mes})` : '')
      + (varIA!=null ? `, variación i/a del último mes: ${varIA>=0?'+':''}${varIA}%` : '')
      + (pesoUlt ? `. Peso prom. más reciente: ${pesoUlt} kg/res` : '') + '.';
  }
  return { ctx2025, ctx2026 };
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  const t0  = Date.now();
  const log = {
    intentado: ['csv_sspm_mensual', 'api_series_sspm', 'csv_sspm_anual', 'consignatarias'],
    usado: [],
  };

  const [csvRes, apiRes, anualRes, dirRes] = await Promise.allSettled([
    tryCSVMensual(),
    trySeriesAPI(),
    tryCSVAnual(),
    fetch('https://www.consignatarias.com.ar/api/frigorificos?limit=20', {
      headers: { 'User-Agent': 'RadarAgro/2.0' },
      redirect: 'follow',
      signal: AbortSignal.timeout(5000),
    }).then(r => r.ok ? r.json() : null).catch(() => null),
  ]);

  const liveData = csvRes.value || apiRes.value || null;
  const dirJSON  = dirRes.value  || null;

  if (csvRes.value)      log.usado.push('csv_sspm_mensual');
  else if (apiRes.value) log.usado.push('api_series_sspm');
  if (dirJSON)           log.usado.push('consignatarias');

  // Sin datos mensuales → sin cache
  if (!liveData) {
    res.setHeader('Cache-Control', 'no-store');
    console.error('[frig] sin_datos — intentados:', log.intentado, '— errores:', {
      csv:   csvRes.reason?.message  || csvRes.status,
      api:   apiRes.reason?.message  || apiRes.status,
      anual: anualRes.reason?.message || anualRes.status,
    });
    return res.status(200).json({
      ok:    false,
      error: 'sin_datos',
      meta: {
        fuentes_intentadas: log.intentado,
        fuentes_usadas:     log.usado,
        tiempoMs:           Date.now() - t0,
        generadoEn:         new Date().toISOString(),
        mensaje:            'No fue posible obtener datos de ninguna fuente (infra.datos.gob.ar / apis.datos.gob.ar).',
      },
    });
  }

  // Hay datos → cachear 6hs
  res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=86400');

  const fuentePrimaria = csvRes.value
    ? 'CSV Faena Pecuaria — SSPM / Ministerio de Economía (infra.datos.gob.ar)'
    : 'API Series de Tiempo — datos.gob.ar';

  const mensual = liveData.sort((a,b) => a.mes.localeCompare(b.mes));
  const ultimo  = mensual[mensual.length - 1];

  // Combinar histórico anual: construirlo del mensual + complementar con CSV anual si hay años faltantes
  const histDesdeAnual = anualRes.value || [];
  const histDesdeMensual = buildHistoricoAnual(mensual);
  const aniosEnMensual = new Set(histDesdeMensual.map(a=>a.anio));
  const histExtra = histDesdeAnual.filter(a => !aniosEnMensual.has(a.anio));
  const historicoAnual = [...histExtra, ...histDesdeMensual]
    .sort((a,b) => a.anio - b.anio);

  // KPIs
  const anioActual = new Date().getFullYear();
  const a0   = historicoAnual.find(a => a.anio === anioActual - 1)
            || historicoAnual[historicoAnual.length - 1];
  const aPrev = a0 ? historicoAnual.find(a => a.anio === a0.anio - 1) : null;
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
  const totCat    = Object.values(catAcc).reduce((a,b)=>a+b, 0);
  const categorias = Object.entries(catAcc)
    .filter(([, v]) => v > 0)
    .map(([nombre, cabezas]) => ({
      nombre, cabezas,
      participacion: totCat > 0 ? +((cabezas/totCat)*100).toFixed(2) : 0,
    }))
    .sort((a,b) => b.cabezas - a.cabezas);

  // Ciclo ganadero
  const hArr2025 = m2025.filter(m=>m.hembras_pct).map(m=>m.hembras_pct);
  const hembras2025avg = hArr2025.length
    ? +(hArr2025.reduce((a,b)=>a+b,0)/hArr2025.length).toFixed(1) : null;
  const hArr2026 = m2026.filter(m=>m.hembras_pct).map(m=>m.hembras_pct);
  const hembras2026avg = hArr2026.length
    ? +(hArr2026.reduce((a,b)=>a+b,0)/hArr2026.length).toFixed(1) : null;

  const fase = !hembras2025avg ? 'sin_datos'
    : hembras2025avg < 46   ? 'retención'
    : hembras2025avg > 48.5 ? 'liquidación' : 'retención_leve';

  const { ctx2025, ctx2026 } = buildContexto(mensual, historicoAnual);

  // Directorio
  let frigCount = null, frigMuestra = [];
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
      tiempoMs:             Date.now() - t0,
      generadoEn:           new Date().toISOString(),
      licencia:             'CC-BY 4.0 · Fuente: SSPM / Ministerio de Economía · SAGyP · datos.gob.ar',
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
      acumulado2026:        m2026.reduce((s,m)=>s+(m.total||0), 0),
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
        'retención':      'Participación de hembras < 46%: retención de vientres → recomposición de stock.',
        'retención_leve': hembras2025avg ? `Participación de hembras ~${hembras2025avg}%: leve retención. Ciclo en transición hacia menor oferta.` : '',
        'liquidación':    'Participación de hembras > 48.5%: liquidación activa → presión bajista de corto plazo.',
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
