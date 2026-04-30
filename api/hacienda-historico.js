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
