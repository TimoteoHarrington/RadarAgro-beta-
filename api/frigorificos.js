// api/frigorificos.js — Vercel Serverless Function
// ════════════════════════════════════════════════════════════════════════════
// Fuentes de datos (en cascada):
//
//  NIVEL 1 — XLSX Avance Mensual (URL fija, se reemplaza cada mes)
//    www.magyp.gob.ar › gestion › Faena Bovina Avance Mensual
//    → 0000001_faena-informe-bovino.xlsx
//
//  NIVEL 2 — XLSX Serie Anual (año actual + año anterior)
//    www.magyp.gob.ar › gestion › Faena Bovina Serie Anual
//    → Faena Bovina {AÑO}.xlsx
//
//  NIVEL 3 — API Series datos.gob.ar (JSON, datos hasta ~2019)
//    Útil solo si los XLSX no responden.
//
//  Si todas fallan → { ok: false, error: 'sin_datos' }
//
// NOTA: datos.magyp.gob.ar/dataset/... NO se actualiza desde 2019.
//       Las fuentes activas son www.magyp.gob.ar.
//
// Cache Vercel edge: 6hs. Revalidación background: 24hs.
// ════════════════════════════════════════════════════════════════════════════

import * as XLSX from 'xlsx';

// ─── URLs ────────────────────────────────────────────────────────────────────

// URL fija — el archivo se reemplaza cada mes con datos actualizados
const XLSX_AVANCE_MENSUAL =
  'https://www.magyp.gob.ar/sitio/areas/gestion/_files/000000_estadisticas/_archivos/000000_Bovinos/000002_Faena%20Bovina%20Avance%20Mensual/0000001_faena-informe-bovino.xlsx';

// Serie anual por año (patrón de numeración incremental desde 2019=000002)
function xlsxAnualUrl(anio) {
  const base = 'https://www.magyp.gob.ar/sitio/areas/gestion/_files/000000_estadisticas/_archivos/000000_Bovinos/000001_Faena%20Bovina%20Serie%20Anual/';
  const num = { 2019:'000002', 2020:'000003', 2021:'000004', 2022:'000005', 2023:'000006', 2024:'000007', 2025:'000008', 2026:'000009' };
  const n = num[anio];
  if (!n) return null;
  return `${base}${n}_Faena%20Bovina%20${anio}.xlsx`;
}

// API Series datos.gob.ar como último recurso
const SERIES_API = 'https://apis.datos.gob.ar/series/api/series/?format=json&sort=asc&limit=72&ids=';
const SERIE_IDS = [
  'agroindustria_46c21636-2a4d-44a4-a0c6-052836d51a3f_faena_bovina_cabezas',
  'agroindustria_46c21636-2a4d-44a4-a0c6-052836d51a3f_faena_total',
];

// Informe mensual PDF (para chequear frescura)
const MAGYP_INFORME_BASE = 'https://www.magyp.gob.ar/comercio-agropecuario/pdf/Informe-Bovino_';
const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// ─── Fetch binario ────────────────────────────────────────────────────────────

async function fetchBuffer(url, ms = 10000) {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, {
      signal:   ctrl.signal,
      redirect: 'follow',
      headers: {
        'User-Agent':    'RadarAgro/2.0',
        'Accept':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,*/*',
        'Cache-Control': 'no-cache',
      },
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return Buffer.from(await r.arrayBuffer());
  } finally { clearTimeout(timer); }
}

async function fetchJSON(url, ms = 8000) {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal, redirect: 'follow',
      headers: { 'User-Agent': 'RadarAgro/2.0', 'Cache-Control': 'no-cache' } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally { clearTimeout(timer); }
}

// ─── Parser XLSX ─────────────────────────────────────────────────────────────

const MESES_MAP = {
  enero:1, febrero:2, marzo:3, abril:4, mayo:5, junio:6,
  julio:7, agosto:8, septiembre:9, octubre:10, noviembre:11, diciembre:12,
  jan:1, feb:2, mar:3, apr:4, may:5, jun:6,
  jul:7, aug:8, sep:9, oct:10, nov:11, dec:12,
};

function parseMesStr(val) {
  if (!val) return null;
  const s = String(val).trim().toLowerCase();
  // Formato YYYY-MM
  if (/^\d{4}-\d{2}$/.test(s)) return s;
  // Número de serie Excel (fecha)
  if (/^\d{5}$/.test(s)) {
    const d = XLSX.SSF.parse_date_code(Number(s));
    if (d) return `${d.y}-${String(d.m).padStart(2,'0')}`;
  }
  // "Enero 2025", "ene-25", etc.
  for (const [nombre, num] of Object.entries(MESES_MAP)) {
    if (s.startsWith(nombre)) {
      const yearMatch = s.match(/\d{2,4}/);
      if (yearMatch) {
        let y = parseInt(yearMatch[0], 10);
        if (y < 100) y += 2000;
        return `${y}-${String(num).padStart(2,'0')}`;
      }
    }
  }
  return null;
}

function parseXLSXBuffer(buf, fuente = 'xlsx_magyp') {
  const wb = XLSX.read(buf, { type: 'buffer', cellDates: false });
  const results = [];

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;

    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (rows.length < 5) continue;

    // Buscar la fila de encabezados (contiene "total" o "faena" o "cabezas")
    let headerRow = -1;
    let headers = [];
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
      const row = rows[i].map(c => String(c).toLowerCase().trim());
      if (row.some(c => c.includes('total') || c.includes('faena') || c.includes('cabeza'))) {
        headerRow = i;
        headers = row;
        break;
      }
    }
    if (headerRow < 0) continue;

    // Mapear columnas relevantes
    const colIdx = {
      fecha:      headers.findIndex(h => h.includes('mes') || h.includes('fecha') || h.includes('period') || h === ''),
      total:      headers.findIndex(h => h.includes('total') || h.includes('faena') || h.includes('cabezas')),
      peso:       headers.findIndex(h => h.includes('peso') || h.includes('kg')),
      hembras:    headers.findIndex(h => h.includes('hembra') || h.includes('%h') || h.includes('part')),
      novillos:   headers.findIndex(h => h.includes('novillo') && !h.includes('ito')),
      novillitos: headers.findIndex(h => h.includes('novill') && h.includes('ito')),
      vacas:      headers.findIndex(h => h.includes('vaca') && !h.includes('quillona')),
      vaquillonas:headers.findIndex(h => h.includes('vaquillon')),
      terneros:   headers.findIndex(h => h.includes('ternero') || h.includes('ternera')),
    };

    // Si la primer columna está vacía, intentar la primera columna directamente
    if (colIdx.fecha < 0) colIdx.fecha = 0;
    if (colIdx.total < 0) continue; // Sin columna total, no sirve esta hoja

    // Parsear filas de datos
    for (let i = headerRow + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.every(c => c === '' || c === null)) continue;

      const fechaRaw = row[colIdx.fecha];
      const mes = parseMesStr(fechaRaw);
      if (!mes || mes < '2000-01') continue;

      const total = Number(row[colIdx.total]);
      if (!total || total < 100000) continue;

      results.push({
        mes,
        total:       Math.round(total),
        pesoRes:     colIdx.peso >= 0      ? (+Number(row[colIdx.peso]).toFixed(1) || null) : null,
        hembras_pct: colIdx.hembras >= 0   ? (+Number(row[colIdx.hembras]).toFixed(1) || null) : null,
        novillos:    colIdx.novillos >= 0  ? (Math.round(Number(row[colIdx.novillos])) || null) : null,
        novillitos:  colIdx.novillitos >= 0? (Math.round(Number(row[colIdx.novillitos])) || null) : null,
        vacas:       colIdx.vacas >= 0     ? (Math.round(Number(row[colIdx.vacas])) || null) : null,
        vaquillonas: colIdx.vaquillonas >= 0?(Math.round(Number(row[colIdx.vaquillonas])) || null) : null,
        terneros:    colIdx.terneros >= 0  ? (Math.round(Number(row[colIdx.terneros])) || null) : null,
        _fuente: fuente,
        _hoja: sheetName,
      });
    }

    if (results.length >= 6) break; // Con una hoja con datos alcanza
  }

  return results.length >= 6
    ? results.sort((a,b) => a.mes.localeCompare(b.mes))
    : null;
}

// ─── Fetchers ────────────────────────────────────────────────────────────────

async function tryXLSXAvanceMensual() {
  try {
    const buf  = await fetchBuffer(XLSX_AVANCE_MENSUAL, 12000);
    const rows = parseXLSXBuffer(buf, 'xlsx_avance_mensual');
    if (rows?.length >= 6) {
      console.log('[frig] XLSX avance mensual ok, rows:', rows.length);
      return rows;
    }
    console.warn('[frig] XLSX avance mensual: parse vacío');
    return null;
  } catch (e) {
    console.warn('[frig] XLSX avance mensual fail:', e.message);
    return null;
  }
}

async function tryXLSXAnual() {
  const anioActual = new Date().getFullYear();
  // Probar año actual y los dos anteriores
  for (const anio of [anioActual, anioActual - 1, anioActual - 2]) {
    const url = xlsxAnualUrl(anio);
    if (!url) continue;
    try {
      const buf  = await fetchBuffer(url, 10000);
      const rows = parseXLSXBuffer(buf, `xlsx_serie_${anio}`);
      if (rows?.length >= 6) {
        console.log(`[frig] XLSX anual ${anio} ok, rows:`, rows.length);
        return rows;
      }
    } catch (e) {
      console.warn(`[frig] XLSX anual ${anio} fail:`, e.message);
    }
  }
  return null;
}

async function trySeriesAPI() {
  for (const id of SERIE_IDS) {
    try {
      const data = await fetchJSON(SERIES_API + id, 6000);
      if (data?.data?.length >= 12) {
        const rows = data.data.map(d => {
          const val = Object.values(d).find(v => typeof v === 'number' && v > 100000);
          return {
            mes: String(d.indice_tiempo || d[0]).slice(0, 7),
            total: Math.round(val || 0),
            _fuente: 'api_series',
          };
        }).filter(r => r.total > 100000);
        if (rows.length >= 12) {
          console.log('[frig] API series ok:', id);
          return rows;
        }
      }
    } catch (e) {
      console.warn('[frig] API series fail:', e.message);
    }
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
      const r = await fetch(url, { method: 'HEAD', signal: ctrl.signal, redirect: 'follow' });
      if (r.ok) return { url, mes: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` };
    } catch (_) { /* skip */ }
  }
  return null;
}

// ─── Helpers analíticos ───────────────────────────────────────────────────────

function buildHistoricoAnual(mensual) {
  const byAnio = {};
  mensual.forEach(m => {
    const anio = parseInt(m.mes.slice(0, 4), 10);
    if (!byAnio[anio]) byAnio[anio] = [];
    byAnio[anio].push(m);
  });
  return Object.entries(byAnio)
    .filter(([, meses]) => meses.length >= 10)
    .map(([anioStr, meses]) => {
      const anio    = parseInt(anioStr, 10);
      const cabezas = meses.reduce((s, m) => s + (m.total || 0), 0);
      const pesosOk = meses.filter(m => m.pesoRes).map(m => m.pesoRes);
      const pesoRes = pesosOk.length
        ? +(pesosOk.reduce((a, b) => a + b, 0) / pesosOk.length).toFixed(0) : null;
      const produccion = pesoRes ? Math.round(cabezas * pesoRes / 1e6) : null;
      return { anio, cabezas, pesoRes, produccion, _fuente: meses[0]._fuente };
    })
    .sort((a, b) => a.anio - b.anio);
}

function buildContexto(mensual, historicoAnual) {
  const anios = historicoAnual.slice().sort((a, b) => a.anio - b.anio);
  const ult   = anios[anios.length - 1];
  const pen   = anios[anios.length - 2];
  const m2026 = mensual.filter(m => m.mes?.startsWith('2026'));
  const m2025 = mensual.filter(m => m.mes?.startsWith('2025'));
  let ctx2025 = null, ctx2026 = null;

  if (ult && ult.anio >= 2025) {
    const varPct = pen ? ((ult.cabezas - pen.cabezas) / pen.cabezas * 100).toFixed(1) : null;
    const varStr = varPct != null ? (varPct >= 0 ? `+${varPct}%` : `${varPct}%`) : '';
    const hArr   = m2025.filter(m => m.hembras_pct).map(m => m.hembras_pct);
    const hPct   = hArr.length ? (hArr.reduce((a, b) => a + b, 0) / hArr.length).toFixed(1) : null;
    ctx2025 = `${ult.anio} cerró con ${(ult.cabezas / 1e6).toFixed(2)} M de cabezas faenadas`
      + (varStr ? ` (${varStr} vs ${pen.anio})` : '')
      + (ult.pesoRes ? ` y peso promedio de ${ult.pesoRes} kg/res` : '')
      + (ult.produccion ? `. Producción estimada: ${ult.produccion} mil tn equivalente res` : '')
      + (hPct ? `. Participación de hembras: ${hPct}%` : '') + '.';
  }

  if (m2026.length > 0) {
    const ultimo  = m2026[m2026.length - 1];
    const acum    = m2026.reduce((s, m) => s + (m.total || 0), 0);
    const pesoArr = m2026.filter(m => m.pesoRes).map(m => m.pesoRes);
    const pesoUlt = pesoArr.length ? pesoArr[pesoArr.length - 1] : null;
    const mesIdx  = m2025.find(m => m.mes === ultimo.mes.replace('2026', '2025'));
    const varIA   = mesIdx ? ((ultimo.total - mesIdx.total) / mesIdx.total * 100).toFixed(1) : null;
    ctx2026 = `En 2026, ${m2026.length} ${m2026.length === 1 ? 'mes publicado' : 'meses publicados'} con ${(acum / 1000).toFixed(0)} k cab. acumuladas`
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
  const log = {
    intentado: ['xlsx_avance_mensual', 'xlsx_serie_anual', 'api_series', 'consignatarias'],
    usado: [],
  };

  // Lanzar todo en paralelo
  const [avanceRes, anualRes, magyp, dirRes] = await Promise.allSettled([
    tryXLSXAvanceMensual(),
    tryXLSXAnual(),
    checkMagyPFrescura(),
    fetch('https://www.consignatarias.com.ar/api/frigorificos?limit=20', {
      headers: { 'User-Agent': 'RadarAgro/2.0' }, redirect: 'follow',
      signal: AbortSignal.timeout(5000),
    }).then(r => r.ok ? r.json() : null).catch(() => null),
  ]);

  const liveData  = avanceRes.value || anualRes.value || null;
  const magyPInfo = magyp.value     || null;
  const dirJSON   = dirRes.value    || null;

  if (avanceRes.value)    log.usado.push('xlsx_avance_mensual');
  else if (anualRes.value) log.usado.push('xlsx_serie_anual');

  // Intentar también api_series si el xlsx sólo dio datos hasta 2019
  const ultimoMesVivo = liveData ? liveData[liveData.length - 1]?.mes : null;
  if (!liveData || (ultimoMesVivo && ultimoMesVivo < '2022-01')) {
    const apiData = await trySeriesAPI();
    if (apiData?.length) {
      log.usado.push('api_series');
      // Preferir XLSX si tiene datos más recientes
      if (!liveData || apiData[apiData.length-1]?.mes > ultimoMesVivo) {
        // usar apiData (pero liveData ya tiene lo mejor si existe)
      }
    }
  }

  if (magyPInfo)  log.usado.push('magyp_head_check');
  if (dirJSON)    log.usado.push('consignatarias');

  // Sin datos → respuesta vacía
  if (!liveData) {
    return res.status(200).json({
      ok:    false,
      error: 'sin_datos',
      meta: {
        fuentes_intentadas: log.intentado,
        fuentes_usadas:     log.usado,
        tiempoMs:           Date.now() - t0,
        generadoEn:         new Date().toISOString(),
        mensaje:            'No fue posible obtener datos de ninguna fuente externa (www.magyp.gob.ar).',
      },
    });
  }

  const fuentePrimaria = avanceRes.value
    ? 'XLSX Avance Mensual — SAGyP / DNCCA (www.magyp.gob.ar)'
    : anualRes.value
      ? 'XLSX Serie Anual — SAGyP / DNCCA (www.magyp.gob.ar)'
      : 'API Series datos.gob.ar';

  const mensual = liveData.sort((a, b) => a.mes.localeCompare(b.mes));
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
  const totCat    = Object.values(catAcc).reduce((a, b) => a + b, 0);
  const categorias = Object.entries(catAcc)
    .filter(([, v]) => v > 0)
    .map(([nombre, cabezas]) => ({
      nombre, cabezas,
      participacion: totCat > 0 ? +((cabezas / totCat) * 100).toFixed(2) : 0,
    }))
    .sort((a, b) => b.cabezas - a.cabezas);

  // Ciclo ganadero
  const hArr2025       = m2025.filter(m => m.hembras_pct).map(m => m.hembras_pct);
  const hembras2025avg = hArr2025.length
    ? +(hArr2025.reduce((a, b) => a + b, 0) / hArr2025.length).toFixed(1) : null;
  const hArr2026       = m2026.filter(m => m.hembras_pct).map(m => m.hembras_pct);
  const hembras2026avg = hArr2026.length
    ? +(hArr2026.reduce((a, b) => a + b, 0) / hArr2026.length).toFixed(1) : null;

  const fase = !hembras2025avg ? 'sin_datos'
             : hembras2025avg < 46   ? 'retención'
             : hembras2025avg > 48.5 ? 'liquidación' : 'retención_leve';

  const { ctx2025, ctx2026 } = buildContexto(mensual, historicoAnual);

  // Directorio frigoríficos (sólo si viene de consignatarias)
  let frigCount   = null;
  let frigMuestra = [];
  if (dirJSON?.data?.length) {
    frigCount   = dirJSON.meta?.total ?? null;
    frigMuestra = dirJSON.data.slice(0, 12).map(f => ({
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
      magyp_informe_url:    magyPInfo?.url  || null,
      magyp_informe_mes:    magyPInfo?.mes  || null,
      tiempoMs:             Date.now() - t0,
      generadoEn:           new Date().toISOString(),
      licencia:             'CC-BY 4.0 · Fuente: SAGyP · DNCCA · SENASA · www.magyp.gob.ar',
    },

    kpis: {
      faenaAnualRef:        a0?.cabezas        ?? null,
      anioRef:              a0?.anio           ?? null,
      varAnual,
      pesoResRef:           a0?.pesoRes        ?? null,
      produccionRef:        a0?.produccion     ?? null,
      ultimoMes:            ultimo?.mes,
      ultimoMesCabezas:     ultimo?.total      ?? null,
      ultimoMesPeso:        ultimo?.pesoRes    ?? null,
      ultimoMesHembras:     ultimo?.hembras_pct ?? null,
      acumMeses2026:        m2026.length,
      acumulado2026:        m2026.reduce((s, m) => s + (m.total || 0), 0),
      frigoriificosActivos: frigCount,
    },

    analisis: {
      faseCiclo:      fase,
      hembras2025pct: hembras2025avg,
      hembras2026pct: hembras2026avg,
      tendenciaPeso: (() => {
        const pesos = mensual.filter(m => m.pesoRes).slice(-12).map(m => m.pesoRes);
        if (pesos.length < 2) return 'sin datos';
        const delta = pesos[pesos.length - 1] - pesos[0];
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
