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
// CBOT — via proxy /api/mundo (mismo endpoint que MundoPage)
// Los símbolos agro ya están incluidos en api/mundo.js con
// conversión a USD/tn. Se filtran por group === 'Agro' y se
// mapean a la forma { soja, maiz, trigo, aceite, harina }.
// ─────────────────────────────────────────────────────────────

// Mapeo entre el id de mundo.js y el nombre de grano local
const MUNDO_ID_TO_GRANO = {
  soy:     'soja',
  corn:    'maiz',
  wheat:   'trigo',
  soyoil:  'aceite',
  soymeal: 'harina',
};

/**
 * Precios de futuros CBOT via proxy /api/mundo.
 * Retorna { data: { soja, maiz, trigo, aceite, harina } — cada uno con {price, prevClose, change} }
 */
export async function fetchCBOTAll() {
  const { data, error } = await get('/api/mundo');
  if (error || !data?.data) return { data: null, error: error || 'sin datos' };

  const out = {};
  data.data
    .filter(item => item.group === 'Agro' && MUNDO_ID_TO_GRANO[item.id])
    .forEach(item => {
      const grano = MUNDO_ID_TO_GRANO[item.id];
      out[grano] = {
        price:     item.price     ?? null,
        prevClose: item.prevClose ?? null,
        change:    item.change    ?? null,
      };
    });

  return { data: out, error: null };
}
