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
// Insumos — combustibles — fetch DIRECTO desde el browser a CKAN
// Fuente: Secretaría de Energía · Res. 314/2016 · datos.energia.gob.ar
//
// NO usa /api/insumos (Vercel serverless) porque datos.energia.gob.ar
// bloquea egress desde datacenters de Vercel/AWS con "host_not_allowed".
// El fetch va directo desde el browser donde CKAN sí responde.
// ─────────────────────────────────────────────────────────────

const CKAN_INSUMOS_URL =
  'https://datos.energia.gob.ar/api/3/action/datastore_search' +
  '?resource_id=80ac25de-a44a-4445-9215-090cf55cfda5&limit=32000';

const ZONA_NUCLEO_INSUMOS = ['Santa Fe', 'Córdoba', 'Buenos Aires', 'Entre Ríos', 'La Pampa'];

const PRODUCTOS_INSUMOS = {
  2:  { label: 'Nafta Súper',   unidad: 'ARS/litro' },
  3:  { label: 'Gasoil G2',     unidad: 'ARS/litro', grado: 2 },
  4:  { label: 'Gasoil G3',     unidad: 'ARS/litro', grado: 3 },
  6:  { label: 'Nafta Premium', unidad: 'ARS/litro' },
  19: { label: 'GNC',           unidad: 'ARS/m3'    },
};

function _getField(row, ...keys) {
  for (const k of keys) {
    if (row[k] != null && row[k] !== '') return row[k];
  }
  return null;
}

function _estadisticas(arr) {
  if (!arr.length) return { promedio: null, mediana: null, min: null, max: null, n: 0 };
  const sorted = [...arr].sort((a, b) => a - b);
  const n = sorted.length;
  const mediana = n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)];
  const promedio = arr.reduce((s, v) => s + v, 0) / n;
  return {
    promedio: Math.round(promedio * 10) / 10,
    mediana:  Math.round(mediana  * 10) / 10,
    min: sorted[0],
    max: sorted[n - 1],
    n,
  };
}

function _buildInsumosPayload(records) {
  const buckets = {};
  for (const row of records) {
    const rawId = _getField(row, 'id_producto', 'idProducto', 'id_prod');
    const id = rawId != null ? parseInt(String(rawId), 10) : NaN;
    if (isNaN(id) || !PRODUCTOS_INSUMOS[id]) continue;

    const rawPrecio = _getField(row, 'precio', 'precio_producto', 'Precio');
    const precio = rawPrecio != null
      ? parseFloat(String(rawPrecio).replace(',', '.'))
      : NaN;
    if (isNaN(precio) || precio <= 0) continue;

    const prov = String(_getField(row, 'provincia', 'Provincia', 'id_provincia') ?? '');
    if (!buckets[id]) buckets[id] = { todos: [], nucleo: [] };
    buckets[id].todos.push(precio);
    if (ZONA_NUCLEO_INSUMOS.some(zn => prov.toLowerCase().includes(zn.toLowerCase()))) {
      buckets[id].nucleo.push(precio);
    }
  }

  if (!buckets[3]?.todos?.length) {
    throw new Error('Sin registros de Gasoil G2 en la respuesta de CKAN');
  }

  let fechaRef = null;
  for (const row of records.slice(0, 30)) {
    const f = _getField(row, 'fecha_vigencia', 'vigencia', 'fecha', 'fecha_inicio');
    if (f) { fechaRef = f; break; }
  }

  const buildProducto = (id) => {
    const info   = PRODUCTOS_INSUMOS[id];
    const bucket = buckets[id] ?? { todos: [], nucleo: [] };
    return {
      label:  info.label,
      unidad: info.unidad,
      ...(info.grado != null ? { grado: info.grado } : {}),
      pais:   _estadisticas(bucket.todos),
      nucleo: _estadisticas(bucket.nucleo),
    };
  };

  return {
    ok:     true,
    fuente: 'Sec. de Energía · Res. 314/2016 · datos.energia.gob.ar',
    fecha:  fechaRef,
    gasoil: { g2: buildProducto(3), g3: buildProducto(4) },
    nafta:  { super: buildProducto(2), premium: buildProducto(6), gnc: buildProducto(19) },
  };
}

async function _fetchInsumosDirecto() {
  let res;
  try {
    res = await fetch(CKAN_INSUMOS_URL);
  } catch (err) {
    return { data: null, error: `Error de red: ${err.message}` };
  }
  if (!res.ok) {
    return { data: null, error: `CKAN respondió HTTP ${res.status}` };
  }
  let json;
  try {
    json = await res.json();
  } catch (err) {
    return { data: null, error: 'Respuesta de CKAN no es JSON válido' };
  }
  if (!json?.success || !Array.isArray(json.result?.records)) {
    return { data: null, error: 'Respuesta de CKAN inválida o sin registros' };
  }
  try {
    return { data: _buildInsumosPayload(json.result.records), error: null };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

/**
 * Precios de gasoil en surtidor (vigentes), zona núcleo y país.
 * Fetch directo desde el browser a CKAN (sin proxy Vercel).
 */
export async function fetchInsumosGasoil() {
  return _fetchInsumosDirecto();
}

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

/**
 * Precios completos de combustibles en surtidor (gasoil, nafta, GNC).
 * Fetch directo desde el browser a CKAN (sin proxy Vercel).
 */
export async function fetchInsumosAll() {
  return _fetchInsumosDirecto();
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
