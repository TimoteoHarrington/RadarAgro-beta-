// api/insumos.js — Vercel Serverless Function
// Precios de combustibles en surtidor — Secretaría de Energía (Res. 314/2016)
// Fuente: http://datos.energia.gob.ar/api/3/action/datastore_search
//   resource_id: 80ac25de-a44a-4445-9215-090cf55cfda5 (vigentes)
//
// id_producto mapeados:
//   2 = Nafta súper (92-95 Ron)
//   3 = Gasoil Grado 2
//   4 = Gasoil Grado 3
//   6 = Nafta premium (>95 Ron)
//  19 = GNC ($/m³)

const CKAN_BASE = 'http://datos.energia.gob.ar/api/3/action/datastore_search';
const RES_ID    = '80ac25de-a44a-4445-9215-090cf55cfda5'; // precios vigentes

// Provincias que forman la zona núcleo agrícola argentina
const ZONA_NUCLEO = ['Santa Fe', 'Córdoba', 'Buenos Aires', 'Entre Ríos', 'La Pampa'];

// Todos los productos que traemos en una sola query
const PRODUCTOS = {
  2:  { label: 'Nafta Súper',   grupo: 'nafta',  unidad: 'ARS/litro' },
  3:  { label: 'Gasoil G2',     grupo: 'gasoil', unidad: 'ARS/litro', grado: 2 },
  4:  { label: 'Gasoil G3',     grupo: 'gasoil', unidad: 'ARS/litro', grado: 3 },
  6:  { label: 'Nafta Premium', grupo: 'nafta',  unidad: 'ARS/litro' },
  19: { label: 'GNC',           grupo: 'gnc',    unidad: 'ARS/m3'    },
};

async function fetchCKAN(url, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'RadarAgro/1.0',
        'Accept':     'application/json',
      },
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// Calcula promedio y mediana de un array de números
function estadisticas(arr) {
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
    min:      sorted[0],
    max:      sorted[n - 1],
    n,
  };
}

function buildProducto(id, byProducto) {
  const info   = PRODUCTOS[id];
  const bucket = byProducto[String(id)] ?? { todos: [], nucleo: [] };
  return {
    label:  info.label,
    unidad: info.unidad,
    ...(info.grado != null ? { grado: info.grado } : {}),
    pais:   estadisticas(bucket.todos),
    nucleo: estadisticas(bucket.nucleo),
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');

  try {
    // Una sola query CKAN con multi-valor para ids 2, 3, 4, 6, 19
    const IDS_FILTRO = Object.keys(PRODUCTOS).map(String);
    const LIMIT = 8000;

    const url =
      `${CKAN_BASE}?resource_id=${RES_ID}` +
      `&filters=${encodeURIComponent(JSON.stringify({ id_producto: IDS_FILTRO }))}` +
      `&limit=${LIMIT}`;

    const resp = await fetchCKAN(url);

    if (!resp?.success) throw new Error('CKAN respondió sin éxito');

    const rows = resp.result?.records ?? [];
    if (!rows.length) throw new Error('Sin registros en la respuesta CKAN');

    // Estructura de columnas del dataset (Res. 314/2016):
    // idempresa, empresa, id_producto, producto, idprovincia, provincia,
    // idlocalidad, localidad, precio, fecha_vigencia

    // Agrupamos por id_producto → { todos: [], nucleo: [] }
    const byProducto = {};

    for (const row of rows) {
      const idProd = String(row.id_producto ?? row.idproducto ?? '');
      const precio = parseFloat(row.precio);
      const prov   = row.provincia ?? row.Provincia ?? '';

      if (!idProd || isNaN(precio) || precio <= 0) continue;
      if (!PRODUCTOS[idProd]) continue;

      if (!byProducto[idProd]) byProducto[idProd] = { todos: [], nucleo: [] };
      byProducto[idProd].todos.push(precio);
      if (ZONA_NUCLEO.some(zn => prov.toLowerCase().includes(zn.toLowerCase()))) {
        byProducto[idProd].nucleo.push(precio);
      }
    }

    const fechaRef = rows[0]?.fecha_vigencia ?? rows[0]?.vigencia ?? null;

    // gasoil: mantiene retrocompatibilidad con InsumosPage existente
    const gasoil = {
      g2: buildProducto(3, byProducto),
      g3: buildProducto(4, byProducto),
    };

    // nafta: bloque nuevo
    const nafta = {
      super:   buildProducto(2,  byProducto),
      premium: buildProducto(6,  byProducto),
      gnc:     buildProducto(19, byProducto),
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
    return res.status(200).json({
      ok:    false,
      error: err.message,
      fuente: 'Sec. de Energía · fallback estático',
      fecha:  null,
      gasoil: {
        g2: { label: 'Gasoil G2', grado: 2, unidad: 'ARS/litro', pais: { promedio: 1655, mediana: 1620, min: 1320, max: 2100, n: null }, nucleo: { promedio: 1630, mediana: 1600, min: 1400, max: 1900, n: null } },
        g3: { label: 'Gasoil G3', grado: 3, unidad: 'ARS/litro', pais: { promedio: 1901, mediana: 1860, min: 1500, max: 2300, n: null }, nucleo: { promedio: 1850, mediana: 1830, min: 1600, max: 2100, n: null } },
      },
      nafta: {
        super:   { label: 'Nafta Súper',   unidad: 'ARS/litro', pais: { promedio: 1420, mediana: 1400, min: 1100, max: 1800, n: null }, nucleo: { promedio: 1400, mediana: 1390, min: 1200, max: 1700, n: null } },
        premium: { label: 'Nafta Premium', unidad: 'ARS/litro', pais: { promedio: 1720, mediana: 1690, min: 1350, max: 2100, n: null }, nucleo: { promedio: 1700, mediana: 1680, min: 1450, max: 2000, n: null } },
        gnc:     { label: 'GNC',           unidad: 'ARS/m3',    pais: { promedio: 420,  mediana: 415,  min: 340,  max: 530,  n: null }, nucleo: { promedio: 415,  mediana: 410,  min: 360,  max: 500,  n: null } },
      },
    });
  }
}
