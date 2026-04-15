// api/insumos.js — Vercel Edge Function
export const config = { runtime: 'edge' };

// Documentación de la API: http://datos.energia.gob.ar/acerca/ckan
// Endpoint: datastore_search
// Recurso: Precios en Surtidor - Resolución 314/2016 (Vigentes)
// ID Oficial: 80ac25de-a44a-4445-9215-090cf55cfda5
const RESOURCE_ID = '80ac25de-a44a-4445-9215-090cf55cfda5';

// Usamos limit=12000 para obtener una muestra nacional representativa sin ahogar la memoria.
// Usamos sort=fecha_vigencia desc para asegurarnos de que la muestra sean los precios actuales.
const CKAN_API_URL = `https://datos.energia.gob.ar/api/3/action/datastore_search?resource_id=${RESOURCE_ID}&limit=12000&sort=fecha_vigencia%20desc`;

const ZONA_NUCLEO = ['santa fe', 'córdoba', 'cordoba', 'buenos aires', 'entre ríos', 'entre rios', 'la pampa'];

const PRODUCTOS = {
  2:  { label: 'Nafta Súper',   unidad: 'ARS/litro' },
  3:  { label: 'Nafta Premium', unidad: 'ARS/litro' },
  6:  { label: 'GNC',           unidad: 'ARS/m3'    },
  19: { label: 'Gasoil G2',     unidad: 'ARS/litro' },
  21: { label: 'Gasoil G3',     unidad: 'ARS/litro' },
};

export default async function handler(req) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  // Manejo de preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // 1. Fetch a la API con un Timeout preventivo de 15s (Vercel Edge corta a los 30s)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(CKAN_API_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'RadarAgro/1.0'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API de Secretaría caída o bloqueada (HTTP ${response.status})`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error?.message || 'Error interno en la API CKAN');
    }

    const records = data.result.records;

    if (!records || records.length === 0) {
      throw new Error('La API respondió, pero el datastore no envió registros.');
    }

    // 2. Procesamiento enfocado
    const buckets = {
      2: { pais: [], nucleo: [] },
      3: { pais: [], nucleo: [] },
      6: { pais: [], nucleo: [] },
      19: { pais: [], nucleo: [] },
      21: { pais: [], nucleo: [] }
    };

    let fechaMasReciente = null;

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      // Según esquema CKAN, el campo puede ser id_producto o idproducto
      const idStr = row.idproducto || row.id_producto;
      if (!idStr) continue;
      
      const id = parseInt(idStr, 10);
      if (!PRODUCTOS[id]) continue;

      let precio = row.precio;
      if (typeof precio === 'string') {
        precio = parseFloat(precio.replace(',', '.'));
      }

      if (isNaN(precio) || precio <= 0) continue;

      const provincia = (row.provincia || '').toLowerCase();

      buckets[id].pais.push(precio);
      
      if (ZONA_NUCLEO.some(z => provincia.includes(z))) {
        buckets[id].nucleo.push(precio);
      }

      // Buscar la fecha más actual de la muestra
      if (row.fecha_vigencia) {
        if (!fechaMasReciente || row.fecha_vigencia > fechaMasReciente) {
          fechaMasReciente = row.fecha_vigencia;
        }
      }
    }

    // 3. Cálculos matemáticos
    const calcularStats = (arr) => {
      if (arr.length === 0) return { promedio: null, mediana: null, min: null, max: null, n: 0 };
      
      arr.sort((a, b) => a - b);
      const n = arr.length;
      
      let suma = 0;
      for (let i = 0; i < n; i++) suma += arr[i];
      const promedio = suma / n;

      const mediana = n % 2 === 0 
        ? (arr[n / 2 - 1] + arr[n / 2]) / 2 
        : arr[Math.floor(n / 2)];

      return {
        promedio: Number(promedio.toFixed(2)),
        mediana: Number(mediana.toFixed(2)),
        min: arr[0],
        max: arr[n - 1],
        n: n
      };
    };

    const formatearProducto = (id) => {
      return {
        ...PRODUCTOS[id],
        pais: calcularStats(buckets[id].pais),
        nucleo: calcularStats(buckets[id].nucleo)
      };
    };

    const resultadoFinal = {
      ok: true,
      fuente: 'Sec. de Energía · Res. 314/2016',
      fecha: fechaMasReciente,
      gasoil: {
        g2: formatearProducto(19),
        g3: formatearProducto(21)
      },
      nafta: {
        super: formatearProducto(2),
        premium: formatearProducto(3),
        gnc: formatearProducto(6)
      }
    };

    return new Response(JSON.stringify(resultadoFinal), {
      status: 200,
      headers: {
        ...corsHeaders,
        // Cachear en la CDN de Vercel para no fusilar la API gubernamental en cada render
        'Cache-Control': 's-maxage=1800, stale-while-revalidate=3600'
      }
    });

  } catch (error) {
    console.error("[RadarAgro] Falló la integración:", error.message);
    // Devolvemos status 200 para que el Frontend de React pueda atrapar el mensaje de error "ok: false"
    // sin que Vercel reviente la conexión de red con un 500 duro.
    return new Response(
      JSON.stringify({ ok: false, error: error.message }), 
      { status: 200, headers: corsHeaders }
    );
  }
}