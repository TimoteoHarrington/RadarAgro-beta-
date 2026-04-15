// api/insumos.js — Vercel Edge Function
export const config = { runtime: 'edge' };

// 1. Usamos HTTP (esquiva el SSL roto del gobierno)
// 2. Usamos el CSV de VIGENTES (pesa 2MB, esquiva el 504 Timeout de Vercel)
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
    const timeout = setTimeout(() => controller.abort(), 12000); // 12s de margen

    const response = await fetch(CSV_VIGENTES, { 
      headers: { 'User-Agent': 'RadarAgro/1.0' },
      signal: controller.signal
    });
    
    clearTimeout(timeout);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    // Como pesa 2MB, podemos usar .text() que es muchísimo más rápido que el Stream para el CPU
    const text = await response.text();
    const lines = text.split('\n');
    
    let headers = [];
    const ultimosPrecios = new Map();

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
      const fechaStr = cols[headers.indexOf('fecha_vigencia')] || cols[headers.indexOf('vigencia')] || cols[headers.indexOf('fecha')];
      
      if (isNaN(precio) || precio <= 0 || !fechaStr) continue;

      const idEmpresa = cols[headers.indexOf('idempresa')];
      const provincia = (cols[headers.indexOf('provincia')] || '').toLowerCase();
      
      const key = `${idEmpresa}-${idProd}-${provincia}`;
      const prev = ultimosPrecios.get(key);

      if (!prev || fechaStr > prev.fechaStr) {
        ultimosPrecios.set(key, { idProd, precio, provincia, fechaStr });
      }
    }

    const buckets = { super: { p: [], n: [] }, premium: { p: [], n: [] }, gnc: { p: [], n: [] }, g2: { p: [], n: [] }, g3: { p: [], n: [] } };
    let fechaRef = null;

    for (const row of ultimosPrecios.values()) {
      const prodKey = PRODUCTOS[row.idProd];
      buckets[prodKey].p.push(row.precio);
      if (ZONA_NUCLEO.some(zn => row.provincia.includes(zn))) buckets[prodKey].n.push(row.precio);
      if (!fechaRef || row.fechaStr > fechaRef) fechaRef = row.fechaStr;
    }

      const calc = (arr) => {
    if (!arr.length) return { promedio: null, mediana: null, min: null, max: null, n: 0 };
    // Ordenamos el array de menor a mayor para sacar min, max y mediana
    arr.sort((a,b) => a-b);
    const n = arr.length;
    const sum = arr.reduce((a,b) => a+b, 0);
    const med = n % 2 === 0 ? (arr[n/2-1] + arr[n/2]) / 2 : arr[Math.floor(n/2)];
    
    return { 
      promedio: sum/n, 
      mediana: med, 
      min: arr[0], 
      max: arr[n-1], 
      n: n }; 
    }

    const build = (id) => ({ pais: calc(buckets[id].p), nucleo: calc(buckets[id].n) });

    return new Response(JSON.stringify({
      ok: true,
      fuente: 'Sec. de Energía · CSV Vigentes',
      fecha: fechaRef || new Date().toISOString(),
      gasoil: { g2: build('g2'), g3: build('g3') },
      nafta: { super: build('super'), premium: build('premium'), gnc: build('gnc') }
    }), { 
      status: 200, 
      headers: { ...cors, 'Cache-Control': 's-maxage=7200, stale-while-revalidate=14400' }
    });

  } catch (err) {
    console.error('Error procesando CSV Vigentes:', err);
    return new Response(JSON.stringify({ ok: false, error: "Timeout o error en Sec. de Energía." }), { status: 200, headers: cors });
  }
}