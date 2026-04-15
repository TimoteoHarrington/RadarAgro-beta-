// api/insumos.js — Vercel Edge Function
export const config = { runtime: 'edge' };

// LA CLAVE: Usamos el CDN (que no bloquea Vercel) y el recurso de VIGENTES (que es liviano)
const CSV_VIGENTES = 'https://datos.energia.gob.ar/dataset/1c181390-5045-475e-94dc-410429be4b17/resource/80ac25de-a44a-4445-9215-090cf55cfda5/download/precios-en-surtidor-resolucin-3142016.csv';

const ZONA_NUCLEO = ['Santa Fe', 'Córdoba', 'Buenos Aires', 'Entre Ríos', 'La Pampa'];

const PRODUCTOS = {
  2:  { label: 'Nafta Súper',   unidad: 'ARS/litro' },
  3:  { label: 'Nafta Premium', unidad: 'ARS/litro' },
  6:  { label: 'GNC',           unidad: 'ARS/m3'    },
  19: { label: 'Gasoil G2',     unidad: 'ARS/litro' },
  21: { label: 'Gasoil G3',     unidad: 'ARS/litro' },
};

// Tu parser original (es rapidísimo y no consume tanta memoria)
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

function parseCSV(text) {
  const lines = text.split('\n');
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase().replace(/^\uFEFF/, ''));
  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = parseCSVLine(line);
    const row = {};
    headers.forEach((h, idx) => { row[h] = (cols[idx] ?? '').trim(); });
    records.push(row);
  }
  return records;
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
    // 1. Descargamos el CSV estático desde el CDN (bypass del firewall)
    const res = await fetch(CSV_VIGENTES, {
      headers: { 'User-Agent': 'RadarAgro/1.0 (https://radaragro.app)' }
    });
    
    if (!res.ok) throw new Error(`Error descargando CSV: HTTP ${res.status}`);
    
    const text = await res.text();
    const records = parseCSV(text);

    if (records.length === 0) throw new Error('El CSV de vigentes vino vacío');

    // 2. Procesamos los datos
    const buckets = {};
    let latestDate = null;

    for (const row of records) {
      const id = parseInt(row['idproducto'] ?? row['id_producto'], 10);
      if (!PRODUCTOS[id]) continue;
      
      const precioStr = row['precio'] ?? '';
      const precio = parseFloat(precioStr.replace(',', '.'));
      if (isNaN(precio) || precio <= 0) continue;

      const prov = String(row['provincia'] ?? '');
      
      if (!buckets[id]) buckets[id] = { todos: [], nucleo: [] };
      buckets[id].todos.push(precio);
      if (ZONA_NUCLEO.some(zn => prov.toLowerCase().includes(zn.toLowerCase()))) {
        buckets[id].nucleo.push(precio);
      }

      if (!latestDate && row['fecha_vigencia']) latestDate = row['fecha_vigencia']; 
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
      // Cacheamos el resultado para no abusar del servidor
      headers: { ...cors, 'Cache-Control': 's-maxage=1800, stale-while-revalidate=3600' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500, headers: cors });
  }
}