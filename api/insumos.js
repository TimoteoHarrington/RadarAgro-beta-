// api/insumos.js — Vercel Serverless Function
// Precios de combustibles en surtidor — Secretaría de Energía (Res. 314/2016)
// Fuente: http://datos.energia.gob.ar/api/3/action/datastore_search
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

const ZONA_NUCLEO = ['Santa Fe', 'Córdoba', 'Buenos Aires', 'Entre Ríos', 'La Pampa'];

const PRODUCTOS = {
  2:  { label: 'Nafta Súper',   grupo: 'nafta',  unidad: 'ARS/litro' },
  3:  { label: 'Gasoil G2',     grupo: 'gasoil', unidad: 'ARS/litro', grado: 2 },
  4:  { label: 'Gasoil G3',     grupo: 'gasoil', unidad: 'ARS/litro', grado: 3 },
  6:  { label: 'Nafta Premium', grupo: 'nafta',  unidad: 'ARS/litro' },
  19: { label: 'GNC',           grupo: 'gnc',    unidad: 'ARS/m3'    },
};

// ── CKAN fetch con timeout ────────────────────────────────────
async function fetchCKAN(url, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'RadarAgro/1.0', 'Accept': 'application/json' },
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// Un request por producto (más compatible con distintas versiones de CKAN)
// CKAN puede o no soportar arrays en filters; este approach siempre funciona.
function buildUrl(idProducto) {
  return (
    `${CKAN_BASE}?resource_id=${RES_ID}` +
    `&filters=${encodeURIComponent(JSON.stringify({ id_producto: String(idProducto) }))}` +
    `&limit=5000`
  );
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

// Procesa los records de un producto y devuelve { todos, nucleo }
function procesarRecords(records) {
  const todos  = [];
  const nucleo = [];
  for (const row of records) {
    const precio = parseFloat(row.precio);
    const prov   = row.provincia ?? row.Provincia ?? '';
    if (isNaN(precio) || precio <= 0) continue;
    todos.push(precio);
    if (ZONA_NUCLEO.some(zn => prov.toLowerCase().includes(zn.toLowerCase()))) {
      nucleo.push(precio);
    }
  }
  return { todos, nucleo };
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

// ── Handler ───────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');

  try {
    // Requests paralelos, uno por producto (5 total ≈ 5 × 1-2s con keep-alive)
    const ids = Object.keys(PRODUCTOS).map(Number);

    const results = await Promise.allSettled(
      ids.map(id => fetchCKAN(buildUrl(id)))
    );

    const buckets    = {};
    let   fechaRef   = null;

    for (let i = 0; i < ids.length; i++) {
      const id     = ids[i];
      const result = results[i];
      if (result.status !== 'fulfilled' || !result.value?.success) continue;

      const records = result.value.result?.records ?? [];
      buckets[id]   = procesarRecords(records);

      // Fecha de vigencia del primer registro (tomamos la del primer éxito)
      if (!fechaRef && records.length) {
        fechaRef = records[0]?.fecha_vigencia ?? records[0]?.vigencia ?? null;
      }
    }

    // Verificar que al menos gasoil G2 llegó (el más crítico)
    if (!buckets[3] || !buckets[3].todos.length) {
      throw new Error('Sin registros de Gasoil G2 — posible falla CKAN');
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
      ok:     true,
      fuente: 'Sec. de Energía · Res. 314/2016 · datos.energia.gob.ar',
      fecha:  fechaRef,
      gasoil,
      nafta,
    });

  } catch (err) {
    console.error('[api/insumos] Error:', err.message);
    return res.status(503).json({ ok: false, error: err.message });
  }
}
