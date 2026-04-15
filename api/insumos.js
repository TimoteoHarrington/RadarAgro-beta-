// api/insumos.js — Vercel Edge Function
export const config = { runtime: 'edge' };

// ESTA ES TU URL ORIGINAL: Sabemos que el CDN no bloquea a Vercel
const CSV_URL = 'https://datos.energia.gob.ar/dataset/1c181390-5045-475e-94dc-410429be4b17/resource/f8dda0d5-2a9f-4d34-b79b-4e63de3995df/download/precios-historicos.csv';

const ZONA_NUCLEO = ['Santa Fe', 'Córdoba', 'Buenos Aires', 'Entre Ríos', 'La Pampa'];

const PRODUCTOS = {
  2:  { label: 'Nafta Súper',   unidad: 'ARS/litro' },
  3:  { label: 'Nafta Premium', unidad: 'ARS/litro' },
  6:  { label: 'GNC',           unidad: 'ARS/m3'    },
  19: { label: 'Gasoil G2',     unidad: 'ARS/litro' },
  21: { label: 'Gasoil G3',     unidad: 'ARS/litro' },
};

// Tu parser original (veloz y soporta comillas)
function parseCSVLine(line) {
  const result = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuote = !inQuote; }
    else if (ch === ',' && !inQuote) { result.push(cur); cur = ''; }
    else { cur += ch; }
  }
  result.push(cur);
  return result;
}

function parseDate(str) {
  if (!str) return null;
  const ar = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (ar) return new Date(`${ar[3]}-${ar[2]}-${ar[1]}`);
  const iso = str.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return new Date(iso[1]);
  return null;
}

export default async function handler(req) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

  try {
    const response = await fetch(CSV_URL, {
      headers: { 'User-Agent': 'RadarAgro/1.0' }
    });

    if (!response.ok) throw new Error(`El CDN devolvió HTTP ${response.status}`);

    // LA MAGIA: Leemos el archivo como un Stream, sin cargarlo en memoria
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    
    let buffer = '';
    let isFirstLine = true;
    let headers = [];
    
    // Solo guardaremos el último registro válido de cada surtidor
    const latest = new Map();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      let lines = buffer.split('\n');
      
      // Guardamos la última línea en el buffer por si vino cortada
      buffer = lines.pop(); 

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = parseCSVLine(line);

        if (isFirstLine) {
          headers = cols.map(h => h.trim().toLowerCase().replace(/^\uFEFF/, ''));
          isFirstLine = false;
          continue;
        }

        const idProdRaw = cols[headers.indexOf('idproducto')] || cols[headers.indexOf('id_producto')];
        const idProd = parseInt(idProdRaw, 10);
        
        if (!PRODUCTOS[idProd]) continue;

        const precioRaw = cols[headers.indexOf('precio')] || '';
        const precio = parseFloat(precioRaw.replace(',', '.'));
        if (isNaN(precio) || precio <= 0) continue;

        const fechaStr = cols[headers.indexOf('fecha_vigencia')] || cols[headers.indexOf('vigencia')] || cols[headers.indexOf('fecha')];
        const fecha = parseDate(fechaStr);
        if (!fecha || isNaN(fecha.getTime())) continue;

        const idEmpresa = cols[headers.indexOf('idempresa')];
        const provincia = cols[headers.indexOf('provincia')] || '';

        // Clave única: Empresa + Producto + Provincia
        const key = `${idEmpresa}-${idProd}-${provincia}`;
        const prev = latest.get(key);

        // Actualizamos si este registro es más nuevo
        if (!prev || fecha > prev.fecha) {
          latest.set(key, { 
            idProd, 
            precio, 
            provincia, 
            fecha,
            isoDate: fecha.toISOString()
          });
        }
      }
    }

    // Ahora que terminamos de streamear (memoria intacta), agrupamos los datos
    const buckets = {
      2: { pais: [], nucleo: [] },
      3: { pais: [], nucleo: [] },
      6: { pais: [], nucleo: [] },
      19: { pais: [], nucleo: [] },
      21: { pais: [], nucleo: [] }
    };

    let ultimaFechaRef = null;

    for (const row of latest.values()) {
      const { idProd, precio, provincia, isoDate } = row;
      buckets[idProd].pais.push(precio);
      
      if (ZONA_NUCLEO.some(zn => provincia.toLowerCase().includes(zn.toLowerCase()))) {
        buckets[idProd].nucleo.push(precio);
      }

      if (!ultimaFechaRef || isoDate > ultimaFechaRef) {
        ultimaFechaRef = isoDate;
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
      pais: estadisticas(buckets[id].pais),
      nucleo: estadisticas(buckets[id].nucleo),
    });

    return new Response(JSON.stringify({
      ok: true,
      fuente: 'Sec. de Energía · Res. 314/2016',
      fecha: ultimaFechaRef,
      gasoil: { g2: prod(19), g3: prod(21) },
      nafta: { super: prod(2), premium: prod(3), gnc: prod(6) }
    }), { 
      status: 200, 
      // Cache agresivo para que los demás usuarios no tengan que esperar a que el stream se procese
      headers: { ...cors, 'Cache-Control': 's-maxage=7200, stale-while-revalidate=14400' }
    });

  } catch (err) {
    console.error('Error procesando CSV en stream:', err);
    return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 200, headers: cors });
  }
}