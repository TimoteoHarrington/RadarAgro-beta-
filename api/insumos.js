// api/insumos.js — Vercel Serverless Function
// Precios de gasoil en surtidor — Secretaría de Energía (Res. 314/2016)
// Fuente: http://datos.energia.gob.ar/api/3/action/datastore_search
//   resource_id: 80ac25de-a44a-4445-9215-090cf55cfda5 (vigentes)

const CKAN_BASE  = 'http://datos.energia.gob.ar/api/3/action/datastore_search';
const RES_ID     = '80ac25de-a44a-4445-9215-090cf55cfda5'; // precios vigentes

// Provincias que forman la zona núcleo agrícola argentina
const ZONA_NUCLEO = ['Santa Fe', 'Córdoba', 'Buenos Aires', 'Entre Ríos', 'La Pampa'];

// Nombres de producto tal como aparecen en el dataset
// id_producto: 3 = Gasoil Grado 2, 4 = Gasoil Grado 3
const PRODUCTOS_GASOIL = {
  3: { label: 'Gasoil G2', grado: 2 },
  4: { label: 'Gasoil G3', grado: 3 },
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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');

  try {
    // Traemos los registros filtrando por gasoil (id_producto 3 y 4)
    // La API CKAN permite filtros y paginación; el CSV vigente tiene ~15.000 filas.
    // Para no cargar todo, hacemos dos llamadas: G2 y G3 en zona núcleo.
    // filters acepta JSON: {"id_producto": ["3"]} pero CKAN admite multi-valor.
    // Tomamos un limit generoso; si hay más filas, iteramos.

    const LIMIT = 5000; // suficiente para todo el país; zona núcleo ~1.500

    const buildUrl = (idProducto) =>
      `${CKAN_BASE}?resource_id=${RES_ID}` +
      `&filters=${encodeURIComponent(JSON.stringify({ id_producto: [String(idProducto)] }))}` +
      `&limit=${LIMIT}`;

    const [respG2, respG3] = await Promise.all([
      fetchCKAN(buildUrl(3)),
      fetchCKAN(buildUrl(4)),
    ]);

    if (!respG2?.success || !respG3?.success) {
      throw new Error('CKAN respondió sin éxito');
    }

    const rows = [...(respG2.result?.records ?? []), ...(respG3.result?.records ?? [])];

    if (!rows.length) {
      throw new Error('Sin registros en la respuesta CKAN');
    }

    // Estructura de columnas del dataset (Res. 314/2016):
    // idempresa, empresa, idproducto, producto, idprovincia, provincia,
    // idlocalidad, localidad, precio, fecha_vigencia

    // Agrupamos por producto y zona (todo país vs zona núcleo)
    const byProducto = {};  // { "3": { todos: [], nucleo: [] }, "4": {...} }

    for (const row of rows) {
      const idProd  = String(row.id_producto ?? row.idproducto ?? '');
      const precio  = parseFloat(row.precio);
      const prov    = row.provincia ?? row.Provincia ?? '';

      if (!idProd || isNaN(precio) || precio <= 0) continue;

      if (!byProducto[idProd]) {
        byProducto[idProd] = { todos: [], nucleo: [] };
      }
      byProducto[idProd].todos.push(precio);
      if (ZONA_NUCLEO.some(zn => prov.toLowerCase().includes(zn.toLowerCase()))) {
        byProducto[idProd].nucleo.push(precio);
      }
    }

    // Construimos respuesta
    const gasoil = {};
    for (const [idProd, info] of Object.entries(PRODUCTOS_GASOIL)) {
      const bucket = byProducto[idProd] ?? { todos: [], nucleo: [] };
      gasoil[`g${info.grado}`] = {
        label:  info.label,
        grado:  info.grado,
        pais:   estadisticas(bucket.todos),
        nucleo: estadisticas(bucket.nucleo),
      };
    }

    // Fecha de vigencia del primer registro (referencial)
    const fechaRef = rows[0]?.fecha_vigencia ?? rows[0]?.vigencia ?? null;

    return res.status(200).json({
      ok:     true,
      fuente: 'Sec. de Energía · Res. 314/2016 · datos.energia.gob.ar',
      fecha:  fechaRef,
      gasoil,
    });

  } catch (err) {
    console.error('[api/insumos] Error:', err.message);
    return res.status(200).json({
      ok:    false,
      error: err.message,
      // Fallback con últimos valores conocidos (abril 2026)
      fuente: 'Sec. de Energía · fallback estático',
      fecha:  null,
      gasoil: {
        g2: {
          label:  'Gasoil G2',
          grado:  2,
          pais:   { promedio: 1655, mediana: 1620, min: 1320, max: 2100, n: null },
          nucleo: { promedio: 1630, mediana: 1600, min: 1400, max: 1900, n: null },
        },
        g3: {
          label:  'Gasoil G3',
          grado:  3,
          pais:   { promedio: 1901, mediana: 1860, min: 1500, max: 2300, n: null },
          nucleo: { promedio: 1850, mediana: 1830, min: 1600, max: 2100, n: null },
        },
      },
    });
  }
}
