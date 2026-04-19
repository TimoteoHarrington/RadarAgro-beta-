// src/services/api.js
// Servicios de datos para RadarAgro

// ─────────────────────────────────────────────────────────────
// Helper base
// ─────────────────────────────────────────────────────────────
async function get(url) {
  try {
    const res = await fetch(url);
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      // Propagar el mensaje de error del servidor si está disponible
      const msg = json?.error ?? `HTTP ${res.status}`;
      return { data: null, error: msg };
    }
    return { data: json, error: null };
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
export async function fetchDolarHistorial(tipo)   { return get(`${AD_BASE}/cotizaciones/dolares/${tipo}`); }
export async function fetchUVA()                  { return get(`${AD_BASE}/finanzas/indices/uva`); }
export async function fetchInflacion()            { return get(`${AD_BASE}/finanzas/indices/inflacion`); }
export async function fetchInflacionInteranual()  { return get(`${AD_BASE}/finanzas/indices/inflacionInteranual`); }
export async function fetchTasasPlazoFijo()       { return get(`${AD_BASE}/finanzas/tasas/plazoFijo`); }
export async function fetchTasasDepositos()       { return get(`${AD_BASE}/finanzas/tasas/depositos30Dias`); }
export async function fetchRiesgoPais()           { return get(`${AD_BASE}/finanzas/indices/riesgo-pais`); }
export async function fetchRiesgoPaisUltimo()     { return get(`${AD_BASE}/finanzas/indices/riesgo-pais/ultimo`); }
export async function fetchFeriados(year = 2026)  { return get(`${AD_BASE}/feriados/${year}`); }

// ─────────────────────────────────────────────────────────────
// Precios Globales — via proxy /api/mundo
// ─────────────────────────────────────────────────────────────

export async function fetchMundoData() {
  return get('/api/mundo');
}

export async function fetchMundoChart(symbolId, range = '5d') {
  return get(`/api/mundo?symbol=${symbolId}&range=${range}`);
}

// ─────────────────────────────────────────────────────────────
// Indicadores BCRA — via proxy /api/bcra
// ─────────────────────────────────────────────────────────────

export async function fetchBCRAData() {
  return get('/api/bcra');
}

export async function fetchBCRAHistorial(variableId, desde = '', hasta = '') {
  let url = `/api/bcra?variable=${variableId}`;
  if (desde) url += `&desde=${desde}`;
  if (hasta) url += `&hasta=${hasta}`;
  return get(url);
}

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
// ─────────────────────────────────────────────────────────────

export async function fetchCotizaciones() {
  return get('/api/cotizaciones');
}

// ─────────────────────────────────────────────────────────────
// INDEC — via proxy /api/indec
// ─────────────────────────────────────────────────────────────

export async function fetchINDEC() {
  return get('/api/indec');
}

// ─────────────────────────────────────────────────────────────
// Insumos — combustibles — via proxy /api/insumos (Edge Function)
// Fuente: Secretaría de Energía · Res. 314/2016 · datos.energia.gob.ar
//
// El fetch va a través de /api/insumos (Vercel Edge Runtime) porque
// datos.energia.gob.ar bloquea IPs de datacenters Node/AWS con
// "host_not_allowed". Las Edge Functions usan IPs de Cloudflare que
// sí son aceptadas por CKAN.
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// CBOT — via proxy /api/mundo
// ─────────────────────────────────────────────────────────────

const MUNDO_ID_TO_GRANO = {
  soy:     'soja',
  corn:    'maiz',
  wheat:   'trigo',
  soyoil:  'aceite',
  soymeal: 'harina',
};

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

// Extrae contratos futuros específicos (grupo AgroFut) del resultado de /api/mundo
// Devuelve: { soja: [{contrato, precio, change}], maiz: [...], trigo: [...] }
export function parseFuturosFromMundo(mundoItems = []) {
  const out = { soja: [], maiz: [], trigo: [] };
  mundoItems
    .filter(item => item.group === 'AgroFut' && item.price != null)
    .forEach(item => {
      const key = item.grano;
      if (out[key]) {
        out[key].push({
          id:       item.id,
          contrato: item.contrato,
          precio:   item.price,
          change:   item.change ?? null,
        });
      }
    });
  // Ordenar por contrato cronológico
  const orden = { 'MAY 26': 1, 'JUL 26': 2, 'SEP 26': 3, 'NOV 26': 4, 'DIC 26': 5 };
  Object.keys(out).forEach(k => out[k].sort((a, b) => (orden[a.contrato] ?? 9) - (orden[b.contrato] ?? 9)));
  return out;
}


export async function fetchInsumosAll() {
  const result = await get('/api/insumos');
  // Si el backend reporta ok: false (porque falló el CSV), lo tratamos como error
  if (result.data && result.data.ok === false) {
    return { data: null, error: result.data.error };
  }
  return result;
}
// ─────────────────────────────────────────────────────────────
// Precios FOB oficiales MAGyP — via proxy /api/fob
// ─────────────────────────────────────────────────────────────

// src/services/api.js — Solo la parte de fetchFOB
export async function fetchFOB() {
  const { data, error } = await get('/api/fob');
  
  // Si hay error de red o 503, 'data' será null y 'error' tendrá el mensaje
  if (error || !data || data.ok === false) {
    return { data: null, error: error || data?.error || 'Error en API FOB' };
  }

  // Normalizamos aquí si es necesario o devolvemos el objeto limpio
  return { data: data, error: null };
}

// ─────────────────────────────────────────────────────────────
// Hacienda bovina — via proxy /api/hacienda
// ─────────────────────────────────────────────────────────────

export async function fetchHaciendaReal() {
  return get('/api/hacienda');
}
