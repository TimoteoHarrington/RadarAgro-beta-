// api/insumos.js — Vercel Edge Function
export const config = { runtime: 'edge' };

const CSV_VIGENTES = 'http://datos.energia.gob.ar/dataset/1c181390-5045-475e-94dc-410429be4b17/resource/80ac25de-a44a-4445-9215-090cf55cfda5/download/precios-en-surtidor-resolucin-3142016.csv';

const ZONA_NUCLEO = ['santa fe', 'córdoba', 'cordoba', 'buenos aires', 'entre ríos', 'entre rios', 'la pampa'];
const PRODUCTOS = { 2: 'super', 3: 'premium', 6: 'gnc', 19: 'g2', 21: 'g3' };

function parseCSVLine(line) {
  const result = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQuote = !inQuote;
    else if (ch === ',' && !inQuote) { result.push(cur); cur = ''; }
    else cur += ch;
  }
  result.push(cur);
  return result;
}

// Analizador robusto de fechas (el gobierno a veces mezcla DD/MM/YYYY con YYYY-MM-DD)
function parseDate(str) {
  if (!str) return null;
  const ar = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (ar) return new Date(`${ar[3]}-${ar[2]}-${ar[1]}T12:00:00Z`);
  const iso = str.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return new Date(`${iso[1]}T12:00:00Z`);
  return new Date(str);
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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(CSV_VIGENTES, { 
      headers: { 'User-Agent': 'RadarAgro/1.0' },
      signal: controller.signal
    });
    
    clearTimeout(timeout);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const text = await response.text();
    const lines = text.split('\n');
    
    let headers = [];
    const ultimosPrecios = new Map();
    let maxTs = 0;

    // 1. Recopilamos el último precio reportado por cada estación
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const cols = parseCSVLine(line);

      if (i === 0) {
        headers = cols.map(h => h.trim().toLowerCase().replace(/^\uFEFF/, ''));
        continue;
      }

      const idProd = parseInt(cols[headers.indexOf('idproducto')] || cols[headers.indexOf('id_producto')], 10);
      if (!PRODUCTOS[idProd]) continue;

      const precio = parseFloat((cols[headers.indexOf('precio')] || '').replace(',', '.'));
      
      // FILTRO DE CORDURA: Descartar errores de tipeo obvios (ej. $15 pesos)
      if (isNaN(precio) || precio <= 50) continue;

      const fechaRaw = cols[headers.indexOf('fecha_vigencia')] || cols[headers.indexOf('vigencia')] || cols[headers.indexOf('fecha')];
      const dateObj = parseDate(fechaRaw);
      
      if (!dateObj || isNaN(dateObj.getTime())) continue;
      
      const ts = dateObj.getTime();
      const idEmpresa = cols[headers.indexOf('idempresa')];
      const provincia = (cols[headers.indexOf('provincia')] || '').toLowerCase();
      
      const key = `${idEmpresa}-${idProd}-${provincia}`;
      const prev = ultimosPrecios.get(key);

      if (!prev || ts > prev.ts) {
        ultimosPrecios.set(key, { idProd, precio, provincia, ts, fechaStr: dateObj.toISOString() });
        if (ts > maxTs) maxTs = ts; // Buscamos la fecha más reciente de todo el CSV
      }
    }

    // 2. Establecemos el límite: 30 días exactos hacia atrás desde la última actualización
    const CUTOFF_30_DAYS = maxTs - (30 * 24 * 60 * 60 * 1000);

    const buckets = { super: { p: [], n: [] }, premium: { p: [], n: [] }, gnc: { p: [], n: [] }, g2: { p: [], n: [] }, g3: { p: [], n: [] } };
    let fechaRef = null;

    // 3. Filtramos y agrupamos
    for (const row of ultimosPrecios.values()) {
      // FILTRO DE VIGENCIA: Si el precio de esta estación tiene más de 30 días, lo ignoramos
      if (row.ts < CUTOFF_30_DAYS) continue;

      const prodKey = PRODUCTOS[row.idProd];
      buckets[prodKey].p.push(row.precio);
      if (ZONA_NUCLEO.some(zn => row.provincia.includes(zn))) buckets[prodKey].n.push(row.precio);
      if (!fechaRef || row.fechaStr > fechaRef) fechaRef = row.fechaStr;
    }

    // 4. Matemáticas completas (Mediana, Min, Max, Promedio)
    const calc = (arr) => {
      if (!arr.length) return { promedio: null, mediana: null, min: null, max: null, n: 0 };
      arr.sort((a,b) => a-b);
      const n = arr.length;
      const sum = arr.reduce((a,b) => a+b, 0);
      const med = n % 2 === 0 ? (arr[n/2-1] + arr[n/2]) / 2 : arr[Math.floor(n/2)];
      return { 
        promedio: sum/n, 
        mediana: med, 
        min: arr[0], 
        max: arr[n-1], 
        n: n 
      };
    };

    const build = (id) => ({ pais: calc(buckets[id].p), nucleo: calc(buckets[id].n) });

    return new Response(JSON.stringify({
      ok: true,
      fuente: 'Sec. de Energía (Últimos 30 días)',
      fecha: fechaRef || new Date().toISOString(),
      gasoil: { g2: build('g2'), g3: build('g3') },
      nafta: { super: build('super'), premium: build('premium'), gnc: build('gnc') }
    }), { 
      status: 200, 
      headers: { ...cors, 'Cache-Control': 's-maxage=7200, stale-while-revalidate=14400' }
    });

  } catch (err) {
    console.error('Error:', err);
    return new Response(JSON.stringify({ ok: false, error: "Servicio de Energía no disponible." }), { status: 200, headers: cors });
  }
}