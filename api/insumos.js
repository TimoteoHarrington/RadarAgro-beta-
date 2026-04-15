// api/insumos.js — Vercel Edge Function
export const config = { runtime: 'edge' };

// Usamos el ID de recurso CORRECTO ("Precios en Surtidor - Res 314/2016")
// Documentación API CKAN: http://datos.energia.gob.ar/acerca/ckan
const CKAN_URL = 'https://datos.energia.gob.ar/api/3/action/datastore_search?resource_id=80ac25de-a44a-4445-9215-090cf55cfda5&limit=30000';

const ZONA_NUCLEO = ['Santa Fe', 'Córdoba', 'Buenos Aires', 'Entre Ríos', 'La Pampa'];

const PRODUCTOS = {
  2:  { label: 'Nafta Súper',   unidad: 'ARS/litro' },
  3:  { label: 'Nafta Premium', unidad: 'ARS/litro' },
  6:  { label: 'GNC',           unidad: 'ARS/m3'    },
  19: { label: 'Gasoil G2',     unidad: 'ARS/litro' },
  21: { label: 'Gasoil G3',     unidad: 'ARS/litro' },
};

export default async function handler(req) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

  try {
    // Pegamos directo a la API CKAN oficial
    const res = await fetch(CKAN_URL, {
      headers: {
        'User-Agent': 'RadarAgro/1.0 (https://radaragro.app)',
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`API CKAN rechazó la conexión: HTTP ${res.status} - ${errorText}`);
    }

    const json = await res.json();
    
    if (!json?.success) {
      throw new Error(json?.error?.message ?? 'Error interno de CKAN');
    }

    const records = json.result.records;
    if (!records || records.length === 0) {
      throw new Error('La API devolvió 0 registros');
    }

    // Procesamiento
    const buckets = {};
    let latestDate = null;

    for (const row of records) {
      // CKAN a veces devuelve idproducto o id_producto
      const id = parseInt(row['idproducto'] ?? row['id_producto'], 10);
      if (!PRODUCTOS[id]) continue;
      
      const precioStr = row['precio'];
      const precio = typeof precioStr === 'number' ? precioStr : parseFloat(String(precioStr).replace(',', '.'));
      if (isNaN(precio) || precio <= 0) continue;

      const prov = String(row['provincia'] ?? '');
      
      if (!buckets[id]) buckets[id] = { todos: [], nucleo: [] };
      buckets[id].todos.push(precio);
      if (ZONA_NUCLEO.some(zn => prov.toLowerCase().includes(zn.toLowerCase()))) {
        buckets[id].nucleo.push(precio);
      }

      // Tomamos la fecha de vigencia más reciente
      if (!latestDate && row['fecha_vigencia']) {
        latestDate = row['fecha_vigencia'];
      } 
    }

    const estadisticas = (arr) => {
      if (!arr.length) return { promedio: null, mediana: null, min: null, max: null, n: 0 };
      const sorted = [...arr].sort((a, b) => a - b);
      const n = sorted.length;
      const mediana = n % 2 === 0 ? (sorted[n/2 - 1] + sorted[n/2]) / 2 : sorted[Math.floor(n/2)];
      return {
        promedio: Math.round(arr.reduce((s, v) => s + v, 0) / n * 10) / 10,
        mediana: Math.round(mediana * 10) / 10,
        min: sorted[0],
        max: sorted[n - 1],
        n
      };
    };

    const prod = (id) => ({
      ...PRODUCTOS[id],
      pais: estadisticas(buckets[id]?.todos ?? []),
      nucleo: estadisticas(buckets[id]?.nucleo ?? []),
    });

    return new Response(JSON.stringify({
      ok: true,
      fuente: 'Sec. de Energía · Res. 314/2016',
      fecha: latestDate || new Date().toISOString(),
      gasoil: { g2: prod(19), g3: prod(21) },
      nafta: { super: prod(2), premium: prod(3), gnc: prod(6) }
    }), { 
      status: 200, 
      // Agregamos caché para que el dashboard responda al instante en siguientes recargas
      headers: { ...cors, 'Cache-Control': 's-maxage=1800, stale-while-revalidate=3600' }
    });

  } catch (err) {
    console.error('[RadarAgro] Error CKAN:', err.message);
    
    // Devolvemos 200 con ok: false para que tu frontend (api.js) pueda leer el mensaje 
    // de error exacto y mostrarlo en la UI en vez de tirar un 500 genérico.
    return new Response(JSON.stringify({ ok: false, error: err.message }), { 
      status: 200, 
      headers: cors 
    });
  }
}