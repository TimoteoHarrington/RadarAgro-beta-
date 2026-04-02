// src/services/api.js
// Servicios de datos para RadarAgro
// Las funciones fetchMundo*, fetchBCRA*, fetchCotizaciones usan
// los proxies backend en /api/* (Netlify Functions en producción,
// vite proxy en desarrollo).

// ─────────────────────────────────────────────────────────────
// Helper base
// ─────────────────────────────────────────────────────────────
async function get(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { data: await res.json(), error: null };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────
// APIs locales (sin backend / CORS libre)
// ─────────────────────────────────────────────────────────────

const DOLAR_BASE = 'https://dolarapi.com/v1';
const AD_BASE    = 'https://api.argentinadatos.com/v1';

export async function fetchDolares()              { return get(`${DOLAR_BASE}/dolares`); }
export async function fetchUVA()                  { return get(`${AD_BASE}/finanzas/indices/uva`); }
export async function fetchInflacion()            { return get(`${AD_BASE}/finanzas/indices/inflacion`); }
export async function fetchInflacionInteranual()  { return get(`${AD_BASE}/finanzas/indices/inflacionInteranual`); }
export async function fetchTasasPlazoFijo()       { return get(`${AD_BASE}/finanzas/tasas/plazoFijo`); }
export async function fetchTasasDepositos()       { return get(`${AD_BASE}/finanzas/tasas/depositos30Dias`); }
export async function fetchRiesgoPais()           { return get(`${AD_BASE}/finanzas/indices/riesgo-pais`); }
export async function fetchRiesgoPaisUltimo()     { return get(`${AD_BASE}/finanzas/indices/riesgo-pais/ultimo`); }
export async function fetchFeriados(year = 2026)  { return get(`${AD_BASE}/feriados/${year}`); }

// ─────────────────────────────────────────────────────────────
// Precios Globales — via proxy /api/mundo (Netlify Function)
// Fuente: Yahoo Finance
// ─────────────────────────────────────────────────────────────

/**
 * Todos los precios globales (resumen con sparklines).
 * Retorna { data: [{id, name, icon, group, price, prevClose, change, sparkline}] }
 */
export async function fetchMundoData() {
  return get('/api/mundo');
}

/**
 * Historial de un símbolo específico.
 * @param {string} symbolId  — 'soy' | 'gold' | 'spx' | etc.
 * @param {string} range     — '1d' | '5d' | '1mo' | '3mo' | '1y'
 */
export async function fetchMundoChart(symbolId, range = '5d') {
  return get(`/api/mundo?symbol=${symbolId}&range=${range}`);
}

// ─────────────────────────────────────────────────────────────
// Indicadores BCRA — via proxy /api/bcra (Netlify Function)
// Fuente: api.bcra.gob.ar/estadisticas/v4.0/Monetarias
// ─────────────────────────────────────────────────────────────

/**
 * Último valor de todas las variables del BCRA.
 * Retorna { data: [{id, key, nombre, unidad, categoria, formato, valor, fecha, valorAnterior}] }
 */
export async function fetchBCRAData() {
  return get('/api/bcra');
}

/**
 * Historial completo de una variable del BCRA.
 * @param {number} variableId  — ID oficial (ver BCRA_IDS)
 * @param {string} [desde]     — 'YYYY-MM-DD'
 * @param {string} [hasta]     — 'YYYY-MM-DD'
 */
export async function fetchBCRAHistorial(variableId, desde = '', hasta = '') {
  let url = `/api/bcra?variable=${variableId}`;
  if (desde) url += `&desde=${desde}`;
  if (hasta) url += `&hasta=${hasta}`;
  return get(url);
}

// IDs oficiales de variables BCRA para referencia
export const BCRA_IDS = {
  reservas:             1,
  usd_minorista:        4,
  usd_mayorista:        5,
  badlar_tna:           7,
  badlar_tea:           35,
  tamar_tna:            44,
  tamar_tea:            45,
  tasa_depositos_30d:   12,
  tasa_prestamos:       14,
  tasa_justicia:        43,
  base_monetaria:       15,
  billetes_publico:     17,
  depositos_total:      21,
  depositos_plazo:      24,
  prestamos_privado:    26,
  inflacion_mensual:    27,
  inflacion_interanual: 28,
  inflacion_esperada:   29,
  cer:                  30,
  uva:                  31,
  uvi:                  32,
  icl:                  40,
};

// ─────────────────────────────────────────────────────────────
// Cotizaciones financieras — via proxy /api/cotizaciones
// Fuente: Yahoo Finance + data912 (CCL/MEP) + ArgentinaDatos
// ─────────────────────────────────────────────────────────────

/**
 * Dólar oficial, CCL, MEP y Riesgo País en una sola llamada.
 * Retorna { oficial: {price, prevClose}, ccl: {price}, mep: {price}, riesgoPais: {value} }
 */
export async function fetchCotizaciones() {
  return get('/api/cotizaciones');
}

// ─────────────────────────────────────────────────────────────
// INDEC — via proxy /api/indec (Netlify Function)
// Fuente: API Series de Tiempo datos.gob.ar — EMAE y PBI
// ─────────────────────────────────────────────────────────────

/**
 * EMAE general + por sector + PBI trimestral en una sola llamada.
 * Retorna { emae: { general, acumAnio, history, sectors }, pbi: { lastIa, historia, ... } }
 */
export async function fetchINDEC() {
  return get('/api/indec');
}

// ─────────────────────────────────────────────────────────────
// CBOT — Yahoo Finance directo (futuros agro para GranosPage)
// ─────────────────────────────────────────────────────────────

const CBOT_SYMBOLS = {
  soja:   'ZS%3DF',
  trigo:  'ZW%3DF',
  maiz:   'ZC%3DF',
  aceite: 'ZL%3DF',
  harina: 'ZM%3DF',
};

/**
 * Precios de todos los futuros CBOT en paralelo.
 * Retorna { data: { soja, trigo, maiz, aceite, harina } — cada uno con {price, prevClose, change} }
 */
export async function fetchCBOTAll() {
  const entries = Object.entries(CBOT_SYMBOLS);
  const results = await Promise.allSettled(
    entries.map(([, sym]) =>
      get(`https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=5d`)
    )
  );

  const out = {};
  entries.forEach(([grano], i) => {
    const r = results[i];
    if (r.status === 'fulfilled' && r.value.data) {
      try {
        const meta      = r.value.data.chart.result[0].meta;
        const price     = meta.regularMarketPrice;
        const prevClose = meta.chartPreviousClose || meta.previousClose || 0;
        const change    = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;
        out[grano] = { price, prevClose, change: Math.round(change * 100) / 100 };
      } catch { out[grano] = null; }
    } else {
      out[grano] = null;
    }
  });

  return { data: out, error: null };
}
