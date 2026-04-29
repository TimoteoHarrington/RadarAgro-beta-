// api/hacienda.js — Vercel Serverless Function (Node.js)
//
// Fuente primaria : Mercado Agroganadero S.A. (Cañuelas) — scraping HTML
//   Precios por categoría : /dll/hacienda1.dll/haciinfo000002
//   IGMAG diario          : /dll/hacienda2.dll/haciinfo000014
//
// Fallback: datos verificados del remate 29/04/2026.
// Actualizar FALLBACK_* cuando los datos superen 2 semanas de antigüedad.

import { load } from 'cheerio';

const MAG_BASE = 'https://www.mercadoagroganadero.com.ar';

// ─── Fetch helper con timeout ─────────────────────────────────────────────────
async function fetchHTML(url, timeoutMs = 12000) {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer':         'https://www.mercadoagroganadero.com.ar/',
        'Cache-Control':   'no-cache',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

// ─── Parser de número ARS  "4.475,68" → 4475.68 ──────────────────────────────
function parseARS(str) {
  if (!str || str === '---' || str.trim() === '') return null;
  const clean = str.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(clean);
  return isNaN(n) ? null : n;
}

// ─── Parser entero con puntos  "1.057" → 1057 ────────────────────────────────
function parseIntAR(str) {
  if (!str || str.trim() === '') return null;
  const clean = str.replace(/\./g, '').trim();
  const n = parseInt(clean, 10);
  return isNaN(n) ? null : n;
}

// ─── Clasificador de categoría → grupo ───────────────────────────────────────
const GRUPO_MAP = [
  { match: k => /NOVILLITO/i.test(k),                         grupo: 'novillitos'  },
  { match: k => /NOVILLO/i.test(k) && !/NOVILLITO/i.test(k), grupo: 'novillos'    },
  { match: k => /VAQUILLON/i.test(k),                         grupo: 'vaquillonas' },
  { match: k => /VACA/i.test(k),                              grupo: 'vacas'       },
  { match: k => /TORO/i.test(k),                              grupo: 'toros'       },
  { match: k => /MEJ/i.test(k),                               grupo: 'mej'         },
  { match: k => /TERNERO|TERNERA/i.test(k),                   grupo: 'terneros'    },
];

const ORDEN_GRUPOS  = ['novillos', 'novillitos', 'vaquillonas', 'vacas', 'toros', 'mej', 'terneros'];
const GRUPO_LABELS  = {
  novillos: 'Novillos', novillitos: 'Novillitos', vaquillonas: 'Vaquillonas',
  vacas: 'Vacas', toros: 'Toros', mej: 'MEJ', terneros: 'Terneros',
};

// ─── Scraping: Precios por categoría (haciinfo000002) ────────────────────────
// Tabla HTML con columnas:
// | Categoria | Mínimo | Máximo | Promedio | Mediana | Cabezas | Importe | Kgs | Prom.Kgs |
async function scrapePrecios() {
  const html = await fetchHTML(`${MAG_BASE}/dll/hacienda1.dll/haciinfo000002`);
  const $    = load(html);

  // Fecha del encabezado — "PRECIOS POR CATEGORIA DESDE EL MIÉRCOLES 29/04/2026..."
  const headerText = $('h6').text();
  const fechaMatch = headerText.match(/(\d{2}\/\d{2}\/\d{4})/);
  let fecha = null;
  if (fechaMatch) {
    const [d, m, y] = fechaMatch[1].split('/');
    fecha = `${y}-${m}-${d}`;
  }

  const categorias = [];

  $('table tr').each((_, tr) => {
    const cells = $(tr).find('td')
      .map((_, td) => $(td).text().replace(/\s+/g, ' ').trim())
      .get();

    if (cells.length < 9) return;
    const nombre = cells[0];
    // Saltar filas de encabezado, subtotal y total
    if (!nombre || nombre === 'Totales' || nombre.startsWith('---') || nombre === 'Categoria') return;

    const mapeo = GRUPO_MAP.find(m => m.match(nombre));
    const grupo = mapeo?.grupo ?? 'otros';

    categorias.push({
      nombre,
      grupo,
      minimo:   parseARS(cells[1]),
      maximo:   parseARS(cells[2]),
      promedio: parseARS(cells[3]),
      mediana:  parseARS(cells[4]),
      cabezas:  parseIntAR(cells[5]),
      kgProm:   parseARS(cells[8]),
    });
  });

  return { fecha, categorias };
}

// ─── Scraping: IGMAG diario (haciinfo000014) ─────────────────────────────────
// Tabla: | Fecha | Cab. ingresadas | Importe | I.G.M.A.G. | Variación |
async function scrapeIGMAG() {
  const html = await fetchHTML(`${MAG_BASE}/dll/hacienda2.dll/haciinfo000014`);
  const $    = load(html);

  let igmag   = null;
  let cabezas = null;
  let fecha   = null;

  $('table tr').each((_, tr) => {
    const cells = $(tr).find('td')
      .map((_, td) => $(td).text().replace(/\s+/g, ' ').trim())
      .get();

    if (cells.length < 4) return;
    // Filas de datos tienen fecha en formato "Mi 29/04/2026"
    if (/\d{2}\/\d{2}\/\d{4}/.test(cells[0]) && !cells[0].startsWith('Totales')) {
      const fechaMatch = cells[0].match(/(\d{2}\/\d{2}\/\d{4})/);
      if (fechaMatch) {
        const [d, m, y] = fechaMatch[1].split('/');
        fecha = `${y}-${m}-${d}`;
      }
      cabezas = parseIntAR(cells[1]);
      igmag   = parseARS(cells[3]);
    }
  });

  return { igmag, cabezas, fecha };
}

// ─── Fallback — remate MAG Cañuelas 29/04/2026 ───────────────────────────────
const FALLBACK_FECHA     = '2026-04-29';
const FALLBACK_IGMAG     = 3339.59;
const FALLBACK_CABEZAS   = 9065;
const FALLBACK_CATEGORIAS = [
  { nombre: 'NOVILLOS Mest.EyB 431/460', grupo: 'novillos',    minimo: 4000, maximo: 4900, promedio: 4475.69, mediana: 4500, cabezas: 338,  kgProm: 446 },
  { nombre: 'NOVILLOS Mest.EyB 461/490', grupo: 'novillos',    minimo: 3650, maximo: 4700, promedio: 4270.97, mediana: 4500, cabezas: 266,  kgProm: 478 },
  { nombre: 'NOVILLOS Mest.EyB 491/520', grupo: 'novillos',    minimo: 4000, maximo: 4670, promedio: 4525.64, mediana: 4625, cabezas: 131,  kgProm: 503 },
  { nombre: 'NOVILLOS Mest.EyB + 520',   grupo: 'novillos',    minimo: 3000, maximo: 4650, promedio: 4379.47, mediana: 4550, cabezas: 131,  kgProm: 573 },
  { nombre: 'NOVILLOS Regulares Liv.',   grupo: 'novillos',    minimo: 3500, maximo: 4650, promedio: 3895.03, mediana: 4350, cabezas: 16,   kgProm: 443 },
  { nombre: 'NOVILLOS Regulares Pes.',   grupo: 'novillos',    minimo: 2200, maximo: 4500, promedio: 3688.51, mediana: 3600, cabezas: 88,   kgProm: 550 },
  { nombre: 'NOVILLOS Overos N.',        grupo: 'novillos',    minimo: 3400, maximo: 4000, promedio: 3630.11, mediana: 3500, cabezas: 87,   kgProm: 413 },
  { nombre: 'NOVILLITOS EyB M. 300/390', grupo: 'novillitos',  minimo: 4500, maximo: 5300, promedio: 4964.81, mediana: 5000, cabezas: 615,  kgProm: 350 },
  { nombre: 'NOVILLITOS EyB P. 391/430', grupo: 'novillitos',  minimo: 4100, maximo: 5000, promedio: 4644.63, mediana: 4650, cabezas: 471,  kgProm: 410 },
  { nombre: 'NOVILLITOS Regulares',      grupo: 'novillitos',  minimo: 3000, maximo: 4700, promedio: 3994.42, mediana: 3700, cabezas: 257,  kgProm: 381 },
  { nombre: 'VAQUILLONAS EyB M.270/390', grupo: 'vaquillonas', minimo: 2800, maximo: 5500, promedio: 4592.34, mediana: 4600, cabezas: 1124, kgProm: 341 },
  { nombre: 'VAQUILLONAS EyB P.391/430', grupo: 'vaquillonas', minimo: 2600, maximo: 4500, promedio: 3928.91, mediana: 4120, cabezas: 474,  kgProm: 431 },
  { nombre: 'VAQUILLONAS Regulares',     grupo: 'vaquillonas', minimo: 3500, maximo: 5050, promedio: 3906.83, mediana: 3800, cabezas: 222,  kgProm: 367 },
  { nombre: 'VACAS Buenas',              grupo: 'vacas',       minimo: 2200, maximo: 4000, promedio: 2995.92, mediana: 3000, cabezas: 926,  kgProm: 486 },
  { nombre: 'VACAS Regulares',           grupo: 'vacas',       minimo: 1700, maximo: 3900, promedio: 2448.11, mediana: 2350, cabezas: 2261, kgProm: 448 },
  { nombre: 'VACAS Conserva Buena',      grupo: 'vacas',       minimo: 1800, maximo: 2700, promedio: 2174.57, mediana: 2200, cabezas: 707,  kgProm: 433 },
  { nombre: 'VACAS Conserva Inferior',   grupo: 'vacas',       minimo: 1700, maximo: 2400, promedio: 2012.92, mediana: 2000, cabezas: 501,  kgProm: 426 },
  { nombre: 'TOROS Buenos',              grupo: 'toros',       minimo: 2300, maximo: 3400, promedio: 2917.31, mediana: 3000, cabezas: 179,  kgProm: 602 },
  { nombre: 'TOROS Regulares',           grupo: 'toros',       minimo: 2500, maximo: 3300, promedio: 2590.21, mediana: 2500, cabezas: 168,  kgProm: 577 },
  { nombre: 'MEJ EyB',                   grupo: 'mej',         minimo: 3000, maximo: 5000, promedio: 4056.57, mediana: 4000, cabezas: 91,   kgProm: 437 },
  { nombre: 'MEJ Regulares',             grupo: 'mej',         minimo: 4000, maximo: 4000, promedio: 3029.64, mediana: 3150, cabezas: 12,   kgProm: 455 },
];

// ─── Handler ──────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  // Cache de 4 horas en Vercel Edge, stale-while-revalidate para no bloquear
  res.setHeader('Cache-Control', 's-maxage=14400, stale-while-revalidate=86400');

  // ── Scraping en paralelo ──────────────────────────────────────────────────
  const [preciosResult, igmagResult] = await Promise.allSettled([
    scrapePrecios(),
    scrapeIGMAG(),
  ]);

  const preciosOK = preciosResult.status === 'fulfilled' && preciosResult.value.categorias.length > 0;
  const igmagOK   = igmagResult.status === 'fulfilled'   && igmagResult.value.igmag != null;

  if (!preciosOK) console.warn('[api/hacienda] scrapePrecios falló:', preciosResult.reason?.message ?? 'sin datos');
  if (!igmagOK)   console.warn('[api/hacienda] scrapeIGMAG falló:', igmagResult.reason?.message ?? 'sin datos');

  // ── Seleccionar fuente ────────────────────────────────────────────────────
  const esFallback   = !preciosOK;
  const categorias   = preciosOK ? preciosResult.value.categorias : FALLBACK_CATEGORIAS;
  const fechaPrecios = preciosOK ? preciosResult.value.fecha      : FALLBACK_FECHA;
  const igmag        = igmagOK   ? igmagResult.value.igmag        : FALLBACK_IGMAG;
  const cabezasHoy   = igmagOK   ? igmagResult.value.cabezas      : FALLBACK_CABEZAS;
  const fecha        = igmagOK   ? igmagResult.value.fecha        : fechaPrecios;

  // ── Agrupar ───────────────────────────────────────────────────────────────
  const mapGrupos = {};
  for (const cat of categorias) {
    if (!mapGrupos[cat.grupo]) mapGrupos[cat.grupo] = [];
    mapGrupos[cat.grupo].push(cat);
  }

  const grupos = ORDEN_GRUPOS
    .filter(g => mapGrupos[g]?.length)
    .map(g => {
      const items = mapGrupos[g];
      // Promedio ponderado por cabezas del grupo
      const itemsConCab = items.filter(c => c.promedio != null && c.cabezas);
      const totalCab    = itemsConCab.reduce((s, c) => s + c.cabezas, 0);
      const promPond     = totalCab > 0
        ? Math.round(itemsConCab.reduce((s, c) => s + c.promedio * c.cabezas, 0) / totalCab)
        : null;
      return { id: g, label: GRUPO_LABELS[g] ?? g, items, promedioPonderado: promPond };
    });

  const totalCabezas = categorias.reduce((s, c) => s + (c.cabezas ?? 0), 0);

  return res.status(200).json({
    ok: true,
    esFallback,
    fuente:      esFallback ? `Fallback verificado · MAG Cañuelas ${FALLBACK_FECHA}` : 'Mercado Agroganadero S.A. (Cañuelas)',
    fecha,
    igmag,
    cabezasHoy,
    grupos,
    categorias,
    totalCabezas: totalCabezas || cabezasHoy,
  });
}
