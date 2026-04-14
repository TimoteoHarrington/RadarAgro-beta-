// api/insumos.js — Vercel Serverless Function
// Precios de combustibles en surtidor — Secretaría de Energía (Res. 314/2016)
// Fuente: https://datos.energia.gob.ar/api/3/action/datastore_search
//   resource_id: 80ac25de-a44a-4445-9215-090cf55cfda5 (vigentes)
//
// id_producto:
//   2 = Nafta súper (92-95 Ron)
//   3 = Gasoil Grado 2
//   4 = Gasoil Grado 3
//   6 = Nafta premium (>95 Ron)
//  19 = GNC ($/m³)

const CKAN_BASE  = 'https://datos.energia.gob.ar/api/3/action/datastore_search';
const CSV_URL    = 'http://datos.energia.gob.ar/dataset/1c181390-5045-475e-94dc-410429be4b17/resource/80ac25de-a44a-4445-9215-090cf55cfda5/download/precios-en-surtidor-resolucin-3142016.csv';
const RES_ID     = '80ac25de-a44a-4445-9215-090cf55cfda5';

const ZONA_NUCLEO = ['Santa Fe', 'Córdoba', 'Buenos Aires', 'Entre Ríos', 'La Pampa'];

const PRODUCTOS = {
  2:  { label: 'Nafta Súper',   grupo: 'nafta',  unidad: 'ARS/litro' },
  3:  { label: 'Gasoil G2',     grupo: 'gasoil', unidad: 'ARS/litro', grado: 2 },
  4:  { label: 'Gasoil G3',     grupo: 'gasoil', unidad: 'ARS/litro', grado: 3 },
  6:  { label: 'Nafta Premium', grupo: 'nafta',  unidad: 'ARS/litro' },
  19: { label: 'GNC',           grupo: 'gnc',    unidad: 'ARS/m3'    },
};

// ── Cache en memoria entre invocaciones del serverless ────────
// Vercel reutiliza el mismo proceso Node para invocaciones calientes
// (warm instances). Guardar el último resultado válido aquí significa
// que si datos.energia.gob.ar da 503, respondemos con datos frescos
// del caché en vez de propagar el error al cliente.
// TTL: 90 minutos — el dataset se actualiza cada hora, con margen extra.
const CACHE_TTL_MS = 90 * 60 * 1000;
let _cache = null; // { payload, ts }

function getCached() {
  if (!_cache) return null;
  if (Date.now() - _cache.ts > CACHE_TTL_MS) return null;
  return _cache.payload;
}
function setCache(payload) {
  _cache = { payload, ts: Date.now() };
}

// ── Fetch con timeout y retry ─────────────────────────────────
// El portal de energía devuelve 503 intermitentes. Usamos 3 reintentos
// con backoff exponencial (500ms, 1000ms, 2000ms) antes de rendirse.
async function fetchWithRetry(url, opts = {}, timeoutMs = 28000, retries = 3) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent':      'RadarAgro/1.0 (https://radaragro.app)',
          'Accept':          'application/json, text/csv, */*',
          'Accept-Language': 'es-AR,es;q=0.9',
          ...opts.headers,
        },
        ...opts,
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)));
      }
    }
  }
  throw lastErr;
}

// ── Normalización de campos ───────────────────────────────────
// El dataset tiene inconsistencias históricas en nombres de columna.
function getField(row, ...keys) {
  for (const k of keys) {
    if (row[k] != null && row[k] !== '') return row[k];
  }
  return null;
}

// ── Parser CSV minimal (sin dependencias) ────────────────────
// Parsea el CSV descargado como fallback cuando el datastore CKAN falla.
// Solo implementa lo necesario: separador coma, comillas dobles para escape.
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = splitCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = splitCSVLine(lines[i]);
    if (vals.length < headers.length) continue;
    const obj = {};
    headers.forEach((h, idx) => { obj[h.trim()] = vals[idx]?.trim() ?? ''; });
    rows.push(obj);
  }
  return rows;
}

function splitCSVLine(line) {
  const fields = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === ',' && !inQ) {
      fields.push(cur); cur = '';
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

// ── Procesamiento ─────────────────────────────────────────────
function procesarTodos(records) {
  const buckets = {};
  for (const row of records) {
    const rawId = getField(row, 'id_producto', 'idProducto', 'id_prod');
    const id    = rawId != null ? parseInt(String(rawId), 10) : NaN;
    if (isNaN(id) || !PRODUCTOS[id]) continue;

    const rawPrecio = getField(row, 'precio', 'precio_producto', 'Precio');
    const precio    = rawPrecio != null
      ? parseFloat(String(rawPrecio).replace(',', '.'))
      : NaN;
    if (isNaN(precio) || precio <= 0) continue;

    const prov = String(getField(row, 'provincia', 'Provincia', 'id_provincia') ?? '');

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
  const sorted = [...arr].sort((a, b) => a - b);
  const n      = sorted.length;
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

function buildPayload(records, strategy, stale = false) {
  const buckets = procesarTodos(records);

  if (!buckets[3]?.todos?.length) {
    throw new Error(
      `Sin registros de Gasoil G2 — estrategia: ${strategy}, ` +
      `total: ${records.length}, ids: [${Object.keys(buckets).join(', ')}]`
    );
  }

  let fechaRef = null;
  for (const row of records.slice(0, 20)) {
    const f = getField(row, 'fecha_vigencia', 'vigencia', 'fecha', 'fecha_inicio');
    if (f) { fechaRef = f; break; }
  }

  return {
    ok:       true,
    fuente:   'Sec. de Energía · Res. 314/2016 · datos.energia.gob.ar',
    fecha:    fechaRef,
    strategy,
    stale,   // true = servido desde caché porque la API estaba caída
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

// ── Estrategias de fetch ──────────────────────────────────────

// Estrategia A: datastore bulk (una sola request, filtramos en Node)
async function tryDatastoreBulk() {
  const url  = `${CKAN_BASE}?resource_id=${RES_ID}&limit=32000`;
  const res  = await fetchWithRetry(url, {}, 28000, 3);
  const json = await res.json();
  if (!json?.success || !Array.isArray(json.result?.records) || !json.result.records.length) {
    throw new Error('Datastore bulk: respuesta vacía o inválida');
  }
  return { records: json.result.records, strategy: 'datastore-bulk' };
}

// Estrategia B: datastore por producto (fallback si bulk da 0 resultados)
async function tryDatastoreByProduct() {
  const ids     = Object.keys(PRODUCTOS).map(Number);
  const results = await Promise.allSettled(
    ids.map(id => {
      const url = `${CKAN_BASE}?resource_id=${RES_ID}` +
        `&filters=${encodeURIComponent(JSON.stringify({ id_producto: String(id) }))}` +
        `&limit=10000`;
      return fetchWithRetry(url, {}, 25000, 2).then(r => r.json());
    })
  );
  const allRecords = [];
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value?.success) {
      allRecords.push(...(r.value.result?.records ?? []));
    }
  }
  if (!allRecords.length) throw new Error('By-product: 0 registros en todos los productos');
  return { records: allRecords, strategy: 'datastore-by-product' };
}

// Estrategia C: descarga directa del CSV (último recurso — el CSV siempre está disponible
// porque es un archivo estático, incluso cuando el datastore CKAN falla)
async function tryCSV() {
  const res  = await fetchWithRetry(CSV_URL, {}, 30000, 2);
  const text = await res.text();
  const records = parseCSV(text);
  if (!records.length) throw new Error('CSV: sin registros');
  return { records, strategy: 'csv-download' };
}

// ── Handler ───────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  // Cache HTTP en CDN de Vercel: 1 hora, stale-while-revalidate 3 horas
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=10800');

  // ── Intentar las tres estrategias en orden ────────────────
  const strategies = [tryDatastoreBulk, tryDatastoreByProduct, tryCSV];
  let fetchResult = null;

  for (const strategy of strategies) {
    try {
      fetchResult = await strategy();
      break; // éxito — salir del loop
    } catch (err) {
      console.warn(`[api/insumos] ${strategy.name} falló: ${err.message}`);
    }
  }

  if (fetchResult) {
    try {
      const payload = buildPayload(fetchResult.records, fetchResult.strategy);
      setCache(payload); // guardar en caché en memoria
      return res.status(200).json(payload);
    } catch (err) {
      console.error('[api/insumos] Error procesando records:', err.message);
      // Si hay caché, servirlo aunque esté un poco viejo
      const cached = _cache?.payload;
      if (cached) {
        console.warn('[api/insumos] Sirviendo caché de memoria tras error de procesamiento');
        return res.status(200).json({ ...cached, stale: true });
      }
      return res.status(503).json({ ok: false, error: err.message });
    }
  }

  // Todas las estrategias fallaron — intentar con caché en memoria
  const cached = getCached();
  if (cached) {
    console.warn('[api/insumos] Sirviendo caché de memoria (todas las estrategias fallaron)');
    return res.status(200).json({ ...cached, stale: true });
  }

  // Sin caché ni datos — error real
  console.error('[api/insumos] Todas las estrategias fallaron y no hay caché');
  return res.status(503).json({
    ok:    false,
    error: 'Secretaría de Energía no disponible. Reintentá en unos minutos.',
  });
}
