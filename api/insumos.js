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

// FIX 1: Usar HTTPS — el portal redirige a https y algunos entornos Node
//         no siguen el redirect HTTP→HTTPS, resultando en error de conexión.
const CKAN_BASE = 'https://datos.energia.gob.ar/api/3/action/datastore_search';
const RES_ID    = '80ac25de-a44a-4445-9215-090cf55cfda5';

const ZONA_NUCLEO = ['Santa Fe', 'Córdoba', 'Buenos Aires', 'Entre Ríos', 'La Pampa'];

const PRODUCTOS = {
  2:  { label: 'Nafta Súper',   grupo: 'nafta',  unidad: 'ARS/litro' },
  3:  { label: 'Gasoil G2',     grupo: 'gasoil', unidad: 'ARS/litro', grado: 2 },
  4:  { label: 'Gasoil G3',     grupo: 'gasoil', unidad: 'ARS/litro', grado: 3 },
  6:  { label: 'Nafta Premium', grupo: 'nafta',  unidad: 'ARS/litro' },
  19: { label: 'GNC',           grupo: 'gnc',    unidad: 'ARS/m3'    },
};

// ── CKAN fetch con timeout y retry ───────────────────────────
// FIX 2: Retry con backoff — el portal de energía es inestable y frecuentemente
//         devuelve 503 o timeouts en el primer intento pero responde bien al reintentar.
async function fetchCKAN(url, timeoutMs = 25000, retries = 2) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        // FIX 3: Headers adicionales — el servidor CKAN bloquea requests
        //         sin Accept explícito o con ciertos User-Agent.
        headers: {
          'User-Agent': 'RadarAgro/1.0 (https://radaragro.app)',
          'Accept': 'application/json, text/javascript, */*',
          'Accept-Language': 'es-AR,es;q=0.9',
        },
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 200 * (attempt + 1)));
      }
    }
  }
  throw lastErr;
}

// ── Estrategia de requests ─────────────────────────────────────────────────
// FIX 4: Usar una sola request bulk en vez de 5 requests por producto.
//
//   PROBLEMA ORIGINAL: El código hacía 5 requests paralelas, una por producto,
//   usando el parámetro "filters" de CKAN. La versión del CKAN de energia.gob.ar
//   es antigua y NO siempre respeta ese parámetro — puede ignorarlo y devolver
//   0 registros para un producto aunque existan, o fallar con 400.
//
//   SOLUCIÓN: Traer todos los registros vigentes en UNA sola request
//   (limit=32000 cubre las ~6000-8000 estaciones activas con holgura)
//   y filtrar en Node. Es más confiable y más eficiente en tiempo total
//   (1 request de 2-3s vs 5 requests de 1-2s con posibles fallos individuales).
//
//   FALLBACK: Si la request bulk falla, se vuelve al approach por producto.

function buildUrlBulk() {
  return `${CKAN_BASE}?resource_id=${RES_ID}&limit=32000`;
}

function buildUrlByProducto(idProducto) {
  return (
    `${CKAN_BASE}?resource_id=${RES_ID}` +
    `&filters=${encodeURIComponent(JSON.stringify({ id_producto: String(idProducto) }))}` +
    `&limit=10000`
  );
}

// ── Normalización de campos ───────────────────────────────────
// FIX 5: El dataset tiene inconsistencias históricas en nombres de columnas
//         (minúsculas vs CamelCase, variantes de "precio", etc.).
//         Esta función prueba múltiples claves y devuelve el primer valor no nulo.
function getField(row, ...keys) {
  for (const k of keys) {
    if (row[k] != null && row[k] !== '') return row[k];
  }
  return null;
}

// Procesa todos los records y los clasifica por id_producto
function procesarTodos(records) {
  const buckets = {};

  for (const row of records) {
    // Normalizar id_producto (puede venir como string o number)
    const rawId  = getField(row, 'id_producto', 'idProducto', 'id_prod');
    const id     = rawId != null ? parseInt(String(rawId), 10) : NaN;
    if (isNaN(id) || !PRODUCTOS[id]) continue;

    // Normalizar precio (puede venir como string con coma decimal en algunos exports)
    const rawPrecio = getField(row, 'precio', 'precio_producto', 'Precio');
    const precio    = rawPrecio != null
      ? parseFloat(String(rawPrecio).replace(',', '.'))
      : NaN;
    if (isNaN(precio) || precio <= 0) continue;

    // Normalizar provincia
    const prov = String(getField(row, 'provincia', 'Provincia', 'id_provincia') ?? '');

    if (!buckets[id]) buckets[id] = { todos: [], nucleo: [] };
    buckets[id].todos.push(precio);
    if (ZONA_NUCLEO.some(zn => prov.toLowerCase().includes(zn.toLowerCase()))) {
      buckets[id].nucleo.push(precio);
    }
  }

  return buckets;
}

// ── Estadísticas ──────────────────────────────────────────────
function estadisticas(arr) {
  if (!arr.length) return { promedio: null, mediana: null, min: null, max: null, n: 0 };
  const sorted = [...arr].sort((a, b) => a - b);
  const n      = sorted.length;
  const mediana =
    n % 2 === 0
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

// ── Fetch con fallback ────────────────────────────────────────
async function fetchAllRecords() {
  // Estrategia A: bulk request (preferida)
  try {
    const json = await fetchCKAN(buildUrlBulk(), 30000, 2);
    if (json?.success && Array.isArray(json.result?.records) && json.result.records.length > 0) {
      return { records: json.result.records, strategy: 'bulk' };
    }
    throw new Error('Respuesta bulk vacía o inválida');
  } catch (err) {
    console.warn('[api/insumos] Bulk falló:', err.message, '— usando fallback por producto');
  }

  // Estrategia B: por producto (fallback)
  const ids     = Object.keys(PRODUCTOS).map(Number);
  const results = await Promise.allSettled(
    ids.map(id => fetchCKAN(buildUrlByProducto(id), 25000, 1))
  );
  const allRecords = [];
  for (let i = 0; i < ids.length; i++) {
    const r = results[i];
    if (r.status === 'fulfilled' && r.value?.success) {
      allRecords.push(...(r.value.result?.records ?? []));
    }
  }
  return { records: allRecords, strategy: 'by-product' };
}

// ── Handler ───────────────────────────────────────────────────
export default async function handler(req, res) {
  // FIX 6: CORS headers completos (algunos proxies requieren la lista de métodos)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // FIX 7: Responder OPTIONS para preflight CORS
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // FIX 8: Cache generoso — el dataset se actualiza cada hora.
  //         stale-while-revalidate evita el spinner en visitas repetidas.
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=10800');

  try {
    const { records, strategy } = await fetchAllRecords();

    if (!records.length) {
      throw new Error('Sin registros en la respuesta CKAN (ambas estrategias fallaron)');
    }

    const buckets = procesarTodos(records);

    // FIX 9: Buscar fecha en múltiples campos posibles del dataset
    let fechaRef = null;
    for (const row of records.slice(0, 20)) {
      const f = getField(row, 'fecha_vigencia', 'vigencia', 'fecha', 'fecha_inicio');
      if (f) { fechaRef = f; break; }
    }

    // Verificar que al menos Gasoil G2 llegó (el más crítico para la app)
    if (!buckets[3]?.todos?.length) {
      throw new Error(
        `Sin registros de Gasoil G2 — estrategia: ${strategy}, ` +
        `total records: ${records.length}, ` +
        `ids encontrados: [${Object.keys(buckets).join(', ')}]`
      );
    }

    const gasoil = {
      g2: buildProducto(3, buckets),
      g3: buildProducto(4, buckets),
    };

    const nafta = {
      super:   buildProducto(2,  buckets),
      premium: buildProducto(6,  buckets),
      gnc:     buildProducto(19, buckets),
    };

    return res.status(200).json({
      ok:       true,
      fuente:   'Sec. de Energía · Res. 314/2016 · datos.energia.gob.ar',
      fecha:    fechaRef,
      strategy, // para debugging
      gasoil,
      nafta,
    });

  } catch (err) {
    console.error('[api/insumos] Error:', err.message);
    return res.status(503).json({ ok: false, error: err.message });
  }
}
