// src/services/api.js
// Servicios de datos para RadarAgro

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


// Reemplazar la función existente en src/services/api.js
export async function fetchInsumosAll() {
  // BYPASS: Le pegamos a la Secretaría directamente desde el navegador del usuario (IP residencial)
  const CKAN_URL = 'https://datos.energia.gob.ar/api/3/action/datastore_search?resource_id=80ac25de-a44a-4445-9215-090cf55cfda5&limit=15000&sort=fecha_vigencia%20desc';
  
  try {
    const res = await fetch(CKAN_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    
    if (!json.success || !json.result?.records) {
       throw new Error("CKAN devolvió error o vino vacío");
    }
    
    // Si la conexión fue exitosa, procesamos los promedios en el cliente
    const records = json.result.records;
    const ZONA_NUCLEO = ['santa fe', 'córdoba', 'cordoba', 'buenos aires', 'entre ríos', 'entre rios', 'la pampa'];
    const PRODUCTOS = { 2: 'super', 3: 'premium', 6: 'gnc', 19: 'g2', 21: 'g3' };
    
    const buckets = { super: { p: [], n: [] }, premium: { p: [], n: [] }, gnc: { p: [], n: [] }, g2: { p: [], n: [] }, g3: { p: [], n: [] } };
    let latestDate = null;

    records.forEach(row => {
       const id = parseInt(row.idproducto || row.id_producto, 10);
       const key = PRODUCTOS[id];
       if (!key) return;

       let precio = parseFloat(String(row.precio).replace(',', '.'));
       if (isNaN(precio) || precio <= 0) return;

       const prov = (row.provincia || '').toLowerCase();
       buckets[key].p.push(precio);
       if (ZONA_NUCLEO.some(z => prov.includes(z))) buckets[key].n.push(precio);

       if (row.fecha_vigencia && (!latestDate || row.fecha_vigencia > latestDate)) {
         latestDate = row.fecha_vigencia;
       }
    });

    const calcStats = (arr) => {
      if (!arr.length) return { promedio: null, mediana: null, min: null, max: null, n: 0 };
      arr.sort((a,b) => a-b);
      const n = arr.length;
      const sum = arr.reduce((a,b) => a+b, 0);
      const med = n % 2 === 0 ? (arr[n/2-1] + arr[n/2]) / 2 : arr[Math.floor(n/2)];
      return { promedio: sum / n, mediana: med, min: arr[0], max: arr[n-1], n };
    };

    const build = (k) => ({ pais: calcStats(buckets[k].p), nucleo: calcStats(buckets[k].n) });

    const payload = {
      ok: true,
      fuente: 'Sec. de Energía (Directo)',
      fecha: latestDate || new Date().toISOString(),
      gasoil: { g2: build('g2'), g3: build('g3') },
      nafta: { super: build('super'), premium: build('premium'), gnc: build('gnc') }
    };

    return { data: payload, error: null };

  } catch (err) {
    console.warn("Fallo el bypass directo, intentando vía Vercel...", err);
    // PLAN B: Si por alguna razón el usuario tiene un firewall en su compu, 
    // intentamos usar el proxy de Vercel como último recurso.
    const fallback = await get('/api/insumos');
    if (fallback.error || (fallback.data && fallback.data.ok === false)) {
      return { data: null, error: fallback.error || fallback.data?.error || "Error de conexión" };
    }
    return { data: fallback.data, error: null };
  }
}
// ─────────────────────────────────────────────────────────────
// Precios FOB oficiales MAGyP — via proxy /api/fob
// ─────────────────────────────────────────────────────────────

export async function fetchFOB() {
  return get('/api/fob');
}

// ─────────────────────────────────────────────────────────────
// Hacienda bovina — via proxy /api/hacienda
// ─────────────────────────────────────────────────────────────

export async function fetchHaciendaReal() {
  return get('/api/hacienda');
}
