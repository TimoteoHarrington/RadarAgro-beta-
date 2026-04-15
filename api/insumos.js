// api/insumos.js — Vercel Edge Function
// Precios de combustibles en surtidor — Secretaría de Energía (Res. 314/2016)
//
// Fuente: OData de datos.energia.gob.ar (reemplaza al CKAN datastore que
//   devolvía "internal error" desde mediados de 2026).
//   Endpoint OData: https://datos.energia.gob.ar/api/1/metastore/schemas/dataset/items/precios-en-surtidor
//   Recurso vigentes: filtrado por id_producto y sin fecha de fin.
//
// ⚠️  DEBE correr como Edge Runtime (NO Node.js serverless).
//     datos.energia.gob.ar bloquea IPs de datacenters AWS/Vercel Node con
//     "host_not_allowed". Las Edge Functions usan IPs de Cloudflare que sí
//     son aceptadas.
//
// id_producto:
//   2 = Nafta súper (92-95 Ron)
//   3 = Gasoil Grado 2
//   4 = Gasoil Grado 3
//   6 = Nafta premium (>95 Ron)
//  19 = GNC ($/m³)

export const config = { runtime: 'edge' };

// OData endpoint — recurso "Precios vigentes en surtidor"
// El parámetro $top máximo es 10000; paginamos con $skip.
const ODATA_BASE =
  'https://datos.energia.gob.ar/api/3/action/datastore_search_sql';

// SQL directo via CKAN datastore_search_sql (soportado aunque datastore_search falle)
// Si esto también falla, usamos el fallback OData REST.
const CKAN_SQL_BASE = 'https://datos.energia.gob.ar/api/3/action/datastore_search_sql';
const RES_ID = '80ac25de-a44a-4445-9215-090cf55cfda5';

// OData fallback — endpoint público REST sin autenticación
const ODATA_VIGENTES =
  'https://datos.energia.gob.ar/api/1/datastore/query/80ac25de-a44a-4445-9215-090cf55cfda5/0/download/?format=json&limit=32000';

// Segunda fuente alternativa: el CSV del recurso (siempre disponible vía descarga directa)
const CSV_URL =
  'https://datos.energia.gob.ar/dataset/precios-en-surtidor/archivo/80ac25de-a44a-4445-9215-090cf55cfda5';

const ZONA_NUCLEO = ['Santa Fe', 'Córdoba', 'Buenos Aires', 'Entre Ríos', 'La Pampa'];

const PRODUCTOS = {
  2:  { label: 'Nafta Súper',   grupo: 'nafta',  unidad: 'ARS/litro' },
  3:  { label: 'Gasoil G2',     grupo: 'gasoil', unidad: 'ARS/litro', grado: 2 },
  4:  { label: 'Gasoil G3',     grupo: 'gasoil', unidad: 'ARS/litro', grado: 3 },
  6:  { label: 'Nafta Premium', grupo: 'nafta',  unidad: 'ARS/litro' },
  19: { label: 'GNC',           grupo: 'gnc',    unidad: 'ARS/m3'    },
};

const HEADERS = {
  'User-Agent':      'RadarAgro/1.0 (https://radaragro.app)',
  'Accept':          'application/json',
  'Accept-Language': 'es-AR,es;q=0.9',
};

// ── Fetch con timeout ─────────────────────────────────────────────────────────
async function fetchJSON(url, options = {}) {
  const signal = typeof AbortSignal.timeout === 'function'
    ? AbortSignal.timeout(25000)
    : undefined;
  const res = await fetch(url, { signal, headers: HEADERS, ...options });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return res.json();
}

// ── Estrategia 1: CKAN datastore_search_sql (evita el datastore_search roto) ─
async function fetchViaSql() {
  const sql = encodeURIComponent(
    `SELECT id_producto, precio, provincia FROM "${RES_ID}" LIMIT 32000`
  );
  const json = await fetchJSON(`${CKAN_SQL_BASE}?sql=${sql}`);
  if (!json?.success) throw new Error(json?.error?.message || 'CKAN SQL error');
  if (!json.result?.records?.length) throw new Error('0 registros via SQL');
  return json.result.records;
}

// ── Estrategia 2: endpoint /datastore/query (OData-like JSON) ─────────────────
async function fetchViaDatastoreQuery() {
  const json = await fetchJSON(ODATA_VIGENTES);
  // Este endpoint devuelve { records: [...] } o { data: { records: [...] } }
  const records = json?.records ?? json?.data?.records ?? json?.result?.records;
  if (!records?.length) throw new Error('0 registros via datastore query');
  return records;
}

// ── Estrategia 3: descarga CSV y parseo manual ────────────────────────────────
async function fetchViaCSV() {
  const signal = typeof AbortSignal.timeout === 'function'
    ? AbortSignal.timeout(30000)
    : undefined;
  // CSV descarga directa del recurso
  const csvUrl = `https://datos.energia.gob.ar/dataset/precios-en-surtidor/archivo/80ac25de-a44a-4445-9215-090cf55cfda5/download`;
  const res = await fetch(csvUrl, { signal, headers: HEADERS });
  if (!res.ok) throw new Error(`CSV HTTP ${res.status}`);
  const text = await res.text();
  return parseCSV(text);
}

function parseCSV(text) {
  const lines = text.split('\n').filter(Boolean);
  if (lines.length < 2) throw new Error('CSV vacío');
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = (cols[idx] ?? '').trim().replace(/^"|"$/g, '');
    });
    records.push(row);
  }
  return records;
}

// ── Intentar todas las estrategias en orden ───────────────────────────────────
async function fetchRecords() {
  const strategies = [
    { name: 'CKAN SQL',        fn: fetchViaSql },
    { name: 'Datastore Query', fn: fetchViaDatastoreQuery },
    { name: 'CSV descarga',    fn: fetchViaCSV },
  ];

  const errors = [];
  for (const { name, fn } of strategies) {
    try {
      const records = await fn();
      console.log(`[api/insumos] OK via ${name} — ${records.length} registros`);
      return records;
    } catch (err) {
      console.warn(`[api/insumos] Falló ${name}: ${err.message}`);
      errors.push(`${name}: ${err.message}`);
    }
  }
  throw new Error(`Todas las fuentes fallaron:\n${errors.join('\n')}`);
}

// ── Normalización de campos (tolerante a nombres de columna variables) ─────────
function getField(row, ...keys) {
  for (const k of keys) {
    const val = row[k] ?? row[k.toLowerCase()] ?? row[k.toUpperCase()];
    if (val != null && val !== '') return val;
  }
  return null;
}

// ── Procesamiento ─────────────────────────────────────────────────────────────
function procesarTodos(records) {
  const buckets = {};
  for (const row of records) {
    const rawId = getField(row, 'id_producto', 'idProducto', 'id_prod', 'ID_PRODUCTO');
    const id    = rawId != null ? parseInt(String(rawId), 10) : NaN;
    if (isNaN(id) || !PRODUCTOS[id]) continue;

    const rawPrecio = getField(row, 'precio', 'precio_producto', 'Precio', 'PRECIO');
    const precio    = rawPrecio != null
      ? parseFloat(String(rawPrecio).replace(',', '.'))
      : NaN;
    if (isNaN(precio) || precio <= 0) continue;

    const prov = String(getField(row, 'provincia', 'Provincia', 'PROVINCIA', 'id_provincia') ?? '');
    if (!buckets[id]) buckets[id] = { todos: [], nucleo: [] };
    buckets[id].todos.push(precio);
    if (ZONA_NUCLEO.some(zn => prov.toLowerCase().includes(zn.toLowerCase()))) {
      buckets[id].nucleo.push(precio);
    }
  }
  return buckets;
}

function estadisticas(arr) {
  if (!arr.length) return { promedio: null, mediana: null, min: null, max: null, n: 0 };
  const sorted  = [...arr].sort((a, b) => a - b);
  const n       = sorted.length;
  const mediana = n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)];
  const promedio = arr.reduce((s, v) => s + v, 0) / n;
  return {
    promedio: Math.round(promedio * 10) / 10,
    mediana:  Math.round(mediana  * 10) / 10,
    min:      sorted[0],
    max:      sorted[n - 1],
    n,
  };
}

function buildProducto(id, buckets) {
  const info   = PRODUCTOS[id];
  const bucket = buckets[id] ?? { todos: [], nucleo: [] };
  return {
    label:  info.label,
    unidad: info.unidad,
    ...(info.grado != null ? { grado: info.grado } : {}),
    pais:   estadisticas(bucket.todos),
    nucleo: estadisticas(bucket.nucleo),
  };
}

function buildPayload(records) {
  const buckets = procesarTodos(records);

  if (!buckets[3]?.todos?.length) {
    const idsEncontrados = Object.keys(buckets).join(', ') || 'ninguno';
    throw new Error(
      `Sin registros de Gasoil G2 en la respuesta. ` +
      `Total registros: ${records.length}. IDs encontrados: [${idsEncontrados}]`
    );
  }

  let fechaRef = null;
  for (const row of records.slice(0, 30)) {
    const f = getField(row, 'fecha_vigencia', 'vigencia', 'fecha', 'fecha_inicio',
                            'FECHA_VIGENCIA', 'FECHA');
    if (f) { fechaRef = f; break; }
  }

  return {
    ok:     true,
    fuente: 'Sec. de Energía · Res. 314/2016 · datos.energia.gob.ar',
    fecha:  fechaRef,
    gasoil: {
      g2: buildProducto(3, buckets),
      g3: buildProducto(4, buckets),
    },
    nafta: {
      super:   buildProducto(2,  buckets),
      premium: buildProducto(6,  buckets),
      gnc:     buildProducto(19, buckets),
    },
  };
}

// ── Handler Edge ──────────────────────────────────────────────────────────────
export default async function handler(req) {
  const corsHeaders = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    // Cache más corto para que errores no queden atrapados 1h
    'Cache-Control': 's-maxage=1800, stale-while-revalidate=3600',
    'Content-Type':  'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  let records;
  try {
    records = await fetchRecords();
  } catch (err) {
    console.error('[api/insumos] Error fetcheando fuentes:', err.message);
    return new Response(
      JSON.stringify({
        ok:    false,
        error: `No se pudo obtener datos de la Secretaría de Energía: ${err.message}`,
      }),
      { status: 503, headers: { ...corsHeaders, 'Cache-Control': 'no-store' } }
    );
  }

  let payload;
  try {
    payload = buildPayload(records);
  } catch (err) {
    console.error('[api/insumos] Error procesando records:', err.message);
    return new Response(
      JSON.stringify({
        ok:    false,
        error: `Datos recibidos pero no procesables: ${err.message}`,
      }),
      { status: 502, headers: { ...corsHeaders, 'Cache-Control': 'no-store' } }
    );
  }

  return new Response(JSON.stringify(payload), { status: 200, headers: corsHeaders });
}
