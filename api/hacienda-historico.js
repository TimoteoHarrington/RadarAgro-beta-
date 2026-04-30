// api/hacienda-historico.js — Vercel Serverless Function
//
// Construye la serie histórica mensual del IGMAG e INMAG scrapeando el MAG Cañuelas.
// Parámetros GET:
//   ?desde=2022   → año de inicio (default: 2022, máximo histórico: 2005)
//   ?hasta=2026   → año de fin (default: año actual)
//
// Estrategia: un request por mes (primer día al último día).
// Los requests se hacen en paralelo por año (máx 12 simultáneos) con throttling.
//
// Cache Vercel: 24 horas — el MAG publica datos diarios hábiles.
// Fuente: Mercado Agroganadero S.A. · mercadoagroganadero.com.ar

import { load } from 'cheerio';

const MAG_BASE = 'https://www.mercadoagroganadero.com.ar';

// URLs con parámetros de rango de fechas (confirmados 29/04/2026)
const URL_IGMAG = (fi, ff) =>
  `${MAG_BASE}/dll/hacienda2.dll/haciinfo000014?txtFECHAINI=${fi}&txtFECHAFIN=${ff}&CP=&LISTADO=SI`;
const URL_INMAG = (fi, ff) =>
  `${MAG_BASE}/dll/hacienda2.dll/haciinfo000011?txtFECHAINI=${fi}&txtFECHAFIN=${ff}&CP=&LISTADO=SI`;

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtFecha(y, m, d) {
  return `${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}/${y}`;
}

function diasEnMes(y, m) {
  return new Date(y, m, 0).getDate(); // m sin -1 porque Date usa 1-based para este truco
}

async function fetchHTML(url, timeoutMs = 15000) {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept':          'text/html,application/xhtml+xml',
        'Accept-Language': 'es-AR,es;q=0.9',
        'Referer':         `${MAG_BASE}/dll/hacienda1.dll/haciinfo000001`,
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

// Parser de número AR: "3.548,513" → 3548.513
function parseAR(str) {
  if (!str || str === 'NAN' || str.trim() === '') return null;
  const n = parseFloat(str.replace(/\./g, '').replace(',', '.'));
  return isNaN(n) ? null : n;
}

// Parser de entero AR: "9.968" → 9968
function parseIntAR(str) {
  if (!str || str.trim() === '') return null;
  const n = parseInt(str.replace(/\./g, ''), 10);
  return isNaN(n) ? null : n;
}

// ── Scraping IGMAG para un mes ────────────────────────────────────────────────
// Tabla: | Fecha | Cab. ingresadas | Importe | I.G.M.A.G. | Variación |
// Pide todo el mes y saca el total ponderado (fila "Totales")
async function scrapeIGMAGMes(y, m) {
  const fi  = fmtFecha(y, m, 1);
  const ff  = fmtFecha(y, m, diasEnMes(y, m));
  const url = URL_IGMAG(fi, ff);

  const html = await fetchHTML(url);
  const $    = load(html);

  let igmag   = null;
  let cabezas = null;

  $('table tr').each((_, tr) => {
    const cells = $(tr).find('td')
      .map((_, td) => $(td).text().replace(/\s+/g,' ').trim())
      .get();
    if (cells.length < 4) return;

    // Fila de totales
    if (/^totales/i.test(cells[0])) {
      cabezas = parseIntAR(cells[1]);
      igmag   = parseAR(cells[3]);
    }
  });

  return { y, m, igmag, cabezas };
}

// ── Scraping INMAG para un mes ────────────────────────────────────────────────
// Tabla: | Fecha | Cab. ingresadas | Importe | I.N.M.A.G. | Variación |
async function scrapeINMAGMes(y, m) {
  const fi  = fmtFecha(y, m, 1);
  const ff  = fmtFecha(y, m, diasEnMes(y, m));
  const url = URL_INMAG(fi, ff);

  const html = await fetchHTML(url);
  const $    = load(html);

  let inmag   = null;
  let cabezas = null;

  $('table tr').each((_, tr) => {
    const cells = $(tr).find('td')
      .map((_, td) => $(td).text().replace(/\s+/g,' ').trim())
      .get();
    if (cells.length < 4) return;

    if (/^totales/i.test(cells[0])) {
      cabezas = parseIntAR(cells[1]);
      inmag   = parseAR(cells[3]);
    }
  });

  return { y, m, inmag, cabezas };
}

// ── Procesar un año completo en paralelo ─────────────────────────────────────
// Para no sobrecargar el MAG, limitamos a 4 requests simultáneos
async function procesarAnio(y, mesHasta = 12) {
  const meses = Array.from({ length: mesHasta }, (_, i) => i + 1);

  // Chunks de 4 meses en paralelo
  const resultados = [];
  for (let i = 0; i < meses.length; i += 4) {
    const chunk = meses.slice(i, i + 4);
    const batch = await Promise.allSettled(
      chunk.map(m => Promise.all([
        scrapeIGMAGMes(y, m).catch(e => ({ y, m, igmag: null, cabezas: null, err: e.message })),
        scrapeINMAGMes(y, m).catch(e => ({ y, m, inmag: null, cabezas: null, err: e.message })),
      ]))
    );
    for (const r of batch) {
      if (r.status === 'fulfilled') resultados.push(r.value);
    }
    // Pequeña pausa entre chunks para no saturar el servidor
    if (i + 4 < meses.length) await new Promise(r => setTimeout(r, 300));
  }

  return resultados;
}

// ── Fallback embebido — serie mensual verificada 2022–2026 ───────────────────
// Datos reales del MAG Cañuelas. Actualizar manualmente si el scraping falla
// consistentemente. Fuente: haciendaXLS.js DATA.precios (ig=IGMAG).
const FALLBACK_SERIE = [
  // 2022
  { f:'2022-01', igmag:205.896, inmag:219.765 },
  { f:'2022-02', igmag:225.019, inmag:251.656 },
  { f:'2022-03', igmag:235.247, inmag:270.437 },
  { f:'2022-04', igmag:239.879, inmag:283.261 },
  { f:'2022-05', igmag:233.652, inmag:284.544 },
  { f:'2022-06', igmag:231.203, inmag:275.647 },
  { f:'2022-07', igmag:237.468, inmag:274.778 },
  { f:'2022-08', igmag:272.447, inmag:292.454 },
  { f:'2022-09', igmag:270.335, inmag:287.820 },
  { f:'2022-10', igmag:251.561, inmag:277.191 },
  { f:'2022-11', igmag:255.453, inmag:275.700 },
  { f:'2022-12', igmag:265.828, inmag:288.685 },
  // 2023
  { f:'2023-01', igmag:298.561, inmag:331.131 },
  { f:'2023-02', igmag:380.452, inmag:436.895 },
  { f:'2023-03', igmag:352.733, inmag:437.567 },
  { f:'2023-04', igmag:335.005, inmag:454.812 },
  { f:'2023-05', igmag:335.509, inmag:450.947 },
  { f:'2023-06', igmag:342.098, inmag:467.107 },
  { f:'2023-07', igmag:399.628, inmag:490.009 },
  { f:'2023-08', igmag:613.139, inmag:710.387 },
  { f:'2023-09', igmag:637.071, inmag:704.831 },
  { f:'2023-10', igmag:779.709, inmag:849.499 },
  { f:'2023-11', igmag:870.733, inmag:945.975 },
  { f:'2023-12', igmag:1243.837, inmag:1405.297 },
  // 2024
  { f:'2024-01', igmag:1307.190, inmag:1424.196 },
  { f:'2024-02', igmag:1440.579, inmag:1689.308 },
  { f:'2024-03', igmag:1433.337, inmag:1704.034 },
  { f:'2024-04', igmag:1413.169, inmag:1763.050 },
  { f:'2024-05', igmag:1332.770, inmag:1777.352 },
  { f:'2024-06', igmag:1412.047, inmag:1826.803 },
  { f:'2024-07', igmag:1583.874, inmag:1937.645 },
  { f:'2024-08', igmag:1744.401, inmag:1953.108 },
  { f:'2024-09', igmag:1740.934, inmag:1871.695 },
  { f:'2024-10', igmag:1740.960, inmag:1900.880 },
  { f:'2024-11', igmag:1872.780, inmag:2012.505 },
  { f:'2024-12', igmag:2024.757, inmag:2264.201 },
  // 2025
  { f:'2025-01', igmag:2030.424, inmag:2248.700 },
  { f:'2025-02', igmag:2206.313, inmag:2583.102 },
  { f:'2025-03', igmag:2232.712, inmag:2677.532 },
  { f:'2025-04', igmag:2207.653, inmag:2788.127 },
  { f:'2025-05', igmag:2210.540, inmag:2799.670 },
  { f:'2025-06', igmag:2199.270, inmag:2822.690 },
  { f:'2025-07', igmag:2367.745, inmag:2924.286 },
  { f:'2025-08', igmag:2625.060, inmag:3028.500 },
  { f:'2025-09', igmag:2792.560, inmag:3132.540 },
  { f:'2025-10', igmag:2956.245, inmag:3248.780 },
  { f:'2025-11', igmag:3334.520, inmag:3855.520 },
  { f:'2025-12', igmag:3570.220, inmag:4085.620 },
  // 2026
  { f:'2026-01', igmag:3512.834, inmag:4117.701 },
  { f:'2026-02', igmag:3810.026, inmag:4460.072 },
  { f:'2026-03', igmag:3711.320, inmag:4441.932 },
];

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  // 24 horas de cache — datos diarios del MAG
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');

  // Parámetros
  const hoy      = new Date();
  const anioHoy  = hoy.getFullYear();
  const mesHoy   = hoy.getMonth() + 1;

  const desde = Math.max(2022, Math.min(anioHoy, parseInt(req.query?.desde ?? '2022', 10)));
  const hasta = Math.max(desde, Math.min(anioHoy, parseInt(req.query?.hasta ?? String(anioHoy), 10)));

  // Si el rango es muy grande (> 3 años), limitarlo para no tardar demasiado
  const desdeEfectivo = Math.max(desde, hasta - 3);

  console.log(`[hacienda-historico] Rango: ${desdeEfectivo}–${hasta}`);

  let serie      = [];
  let esFallback = false;
  let errorMsg   = null;

  try {
    const anios = Array.from(
      { length: hasta - desdeEfectivo + 1 },
      (_, i) => desdeEfectivo + i
    );

    // Procesar cada año — años anteriores al actual: 12 meses, año actual: hasta mes actual
    const porAnio = await Promise.allSettled(
      anios.map(y => procesarAnio(y, y === anioHoy ? mesHoy : 12))
    );

    for (const resultado of porAnio) {
      if (resultado.status !== 'fulfilled') continue;
      for (const [igmagData, inmagData] of resultado.value) {
        const { y, m, igmag } = igmagData;
        const { inmag }       = inmagData;

        if (igmag == null && inmag == null) continue;

        const fecha = `${y}-${String(m).padStart(2,'0')}`;
        serie.push({
          f:     fecha,
          igmag: igmag  != null ? +igmag.toFixed(3)  : null,
          inmag: inmag  != null ? +inmag.toFixed(3)  : null,
          cab:   igmagData.cabezas ?? inmagData.cabezas ?? null,
        });
      }
    }

    serie.sort((a, b) => a.f.localeCompare(b.f));

    if (serie.length === 0) throw new Error('Scraping produjo 0 registros');

    console.log(`[hacienda-historico] OK: ${serie.length} meses scrapeados`);

  } catch (err) {
    console.warn('[hacienda-historico] Usando fallback:', err.message);
    esFallback = true;
    errorMsg   = err.message;
    serie      = FALLBACK_SERIE.filter(d => {
      const y = parseInt(d.f.slice(0, 4), 10);
      return y >= desdeEfectivo && y <= hasta;
    });
  }

  // Stats básicos
  const igmagVals = serie.map(d => d.igmag).filter(Boolean);
  const inmagVals = serie.map(d => d.inmag).filter(Boolean);

  const stats = igmagVals.length > 0 ? {
    igmag: {
      min:    +Math.min(...igmagVals).toFixed(2),
      max:    +Math.max(...igmagVals).toFixed(2),
      ultimo: igmagVals[igmagVals.length - 1],
      varPct: igmagVals.length >= 2
        ? +((igmagVals[igmagVals.length-1] - igmagVals[igmagVals.length-2]) / igmagVals[igmagVals.length-2] * 100).toFixed(1)
        : null,
      varInteranual: igmagVals.length >= 13
        ? +((igmagVals[igmagVals.length-1] - igmagVals[igmagVals.length-13]) / igmagVals[igmagVals.length-13] * 100).toFixed(1)
        : null,
    },
    inmag: inmagVals.length > 0 ? {
      min:    +Math.min(...inmagVals).toFixed(2),
      max:    +Math.max(...inmagVals).toFixed(2),
      ultimo: inmagVals[inmagVals.length - 1],
    } : null,
  } : null;

  return res.status(200).json({
    ok: true,
    esFallback,
    fuente:    esFallback ? 'Fallback · haciendaXLS.js 2022–2026' : 'Mercado Agroganadero S.A. (Cañuelas)',
    errorMsg,
    rango:     { desde: desdeEfectivo, hasta },
    total:     serie.length,
    stats,
    serie,
  });
}
