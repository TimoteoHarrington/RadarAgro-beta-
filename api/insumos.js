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

const CKAN_BASE = 'https://datos.energia.gob.ar/api/3/action/datastore_search';
const RES_ID    = '80ac25de-a44a-4445-9215-090cf55cfda5';

// El portal suele tener entre 3.000 y 15.000 registros vigentes.
// CKAN soporta hasta limit=32000 por request; si hay más, paginamos.
const PAGE_SIZE = 32000;

const ZONA_NUCLEO = ['Santa Fe', 'Córdoba', 'Buenos Aires', 'Entre Ríos', 'La Pampa'];

const PRODUCTOS = {
  2:  { label: 'Nafta Súper',   grupo: 'nafta',  unidad: 'ARS/litro' },
  3:  { label: 'Gasoil G2',     grupo: 'gasoil', unidad: 'ARS/litro', grado: 2 },
  4:  { label: 'Gasoil G3',     grupo: 'gasoil', unidad: 'ARS/litro', grado: 3 },
  6:  { label: 'Nafta Premium', grupo: 'nafta',  unidad: 'ARS/litro' },
  19: { label: 'GNC',           grupo: 'gnc',    unidad: 'ARS/m3'    },
};

// ── Fetch con timeout ─────────────────────────────────────────
async function fetchJSON(url, timeoutMs = 25000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':      'RadarAgro/1.0 (https://radaragro.app)',
        'Accept':          'application/json',
        'Accept-Language': 'es-AR,es;q=0.9',
      },
    });
    clearTimeout(timer);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    const json = await res.json();
    if (!json?.success) {
      const detail = json?.error?.message || JSON.stringify(json?.error) || 'sin detalle';
      throw new Error(`CKAN error: ${detail}`);
    }
    return json;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

// ── Descarga todos los registros con paginación ───────────────
// La API CKAN devuelve `result.total` con el total real. Si hay más
// registros que PAGE_SIZE, hacemos requests adicionales con `offset`.
async function fetchAllRecords() {
  const firstUrl = `${CKAN_BASE}?resource_id=${RES_ID}&limit=${PAGE_SIZE}&offset=0`;
  const firstPage = await fetchJSON(firstUrl);

  const total   = firstPage.result.total;
  const records = [...firstPage.result.records];

  if (records.length === 0) {
    throw new Error(`CKAN devolvió 0 registros (total reportado: ${total})`);
  }

  // Si hay más páginas, fetchearlas en paralelo
  if (total > records.length) {
    const offsets = [];
    for (let offset = records.length; offset < total; offset += PAGE_SIZE) {
      offsets.push(offset);
    }
    const pages = await Promise.all(
      offsets.map(offset =>
        fetchJSON(`${CKAN_BASE}?resource_id=${RES_ID}&limit=${PAGE_SIZE}&offset=${offset}`)
      )
    );
    for (const page of pages) {
      records.push(...page.result.records);
    }
  }

  return records;
}

// ── Normalización de campos ───────────────────────────────────
// El dataset tiene variaciones históricas en nombres de columna.
function getField(row, ...keys) {
  for (const k of keys) {
    if (row[k] != null && row[k] !== '') return row[k];
  }
  return null;
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

function buildPayload(records) {
  const buckets = procesarTodos(records);

  // Gasoil G2 es el producto clave — si no hay datos es un error real
  if (!buckets[3]?.todos?.length) {
    const idsEncontrados = Object.keys(buckets).join(', ') || 'ninguno';
    throw new Error(
      `Sin registros de Gasoil G2 en la respuesta de CKAN. ` +
      `Total registros: ${records.length}. IDs encontrados: [${idsEncontrados}]`
    );
  }

  // Fecha de referencia: primer registro con campo de fecha
  let fechaRef = null;
  for (const row of records.slice(0, 30)) {
    const f = getField(row, 'fecha_vigencia', 'vigencia', 'fecha', 'fecha_inicio');
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

// ── Handler ───────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  // Cache en CDN de Vercel: 1 hora, stale-while-revalidate 3 horas
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=10800');

  let records;
  try {
    records = await fetchAllRecords();
  } catch (err) {
    console.error('[api/insumos] Error fetcheando CKAN:', err.message);
    return res.status(503).json({
      ok:    false,
      error: `No se pudo obtener datos de la Secretaría de Energía: ${err.message}`,
    });
  }

  let payload;
  try {
    payload = buildPayload(records);
  } catch (err) {
    console.error('[api/insumos] Error procesando records:', err.message);
    return res.status(502).json({
      ok:    false,
      error: `Datos recibidos pero no procesables: ${err.message}`,
    });
  }

  return res.status(200).json(payload);
}
