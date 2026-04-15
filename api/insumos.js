// api/insumos.js — Vercel Edge Function
export const config = { runtime: 'edge' };

// Usamos HTTP (sin S) para evitar el error de certificado (ERR_CERT_COMMON_NAME_INVALID)
const CSV_URL = 'http://datos.energia.gob.ar/dataset/1c181390-5045-475e-94dc-410429be4b17/resource/f8dda0d5-2a9f-4d34-b79b-4e63de3995df/download/precios-historicos.csv';

const ZONA_NUCLEO = ['santa fe', 'córdoba', 'cordoba', 'buenos aires', 'entre ríos', 'entre rios', 'la pampa'];

const PRODUCTOS = {
  2: 'super', 3: 'premium', 6: 'gnc', 19: 'g2', 21: 'g3'
};

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
    const response = await fetch(CSV_URL, { headers: { 'User-Agent': 'RadarAgro/1.0' } });
    if (!response.ok) throw new Error(`CDN Energía: HTTP ${response.status}`);

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let isFirstLine = true;
    let headers = [];
    const ultimosPrecios = new Map();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      let lines = buffer.split('\n');
      buffer = lines.pop(); 

      for (let line of lines) {
        line = line.trim();
        if (!line) continue;
        const cols = parseCSVLine(line);

        if (isFirstLine) {
          headers = cols.map(h => h.trim().toLowerCase().replace(/^\uFEFF/, ''));
          isFirstLine = false;
          continue;
        }

        const idProd = parseInt(cols[headers.indexOf('idproducto')] || cols[headers.indexOf('id_producto')], 10);
        if (!PRODUCTOS[idProd]) continue;

        const precio = parseFloat((cols[headers.indexOf('precio')] || '').replace(',', '.'));
        const fechaStr = cols[headers.indexOf('fecha_vigencia')] || cols[headers.indexOf('vigencia')] || cols[headers.indexOf('fecha')];
        if (isNaN(precio) || precio <= 0 || !fechaStr) continue;

        const key = `${cols[headers.indexOf('idempresa')]}-${idProd}-${cols[headers.indexOf('provincia')]}`;
        const prev = ultimosPrecios.get(key);

        if (!prev || fechaStr > prev.fechaStr) {
          ultimosPrecios.set(key, { idProd, precio, provincia: (cols[headers.indexOf('provincia')] || '').toLowerCase(), fechaStr });
        }
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
      if (!arr.length) return { promedio: null, n: 0 };
      const sum = arr.reduce((a,b) => a+b, 0);
      return { promedio: sum/arr.length, n: arr.length };
    };

    const build = (id) => ({ pais: calc(buckets[id].p), nucleo: calc(buckets[id].n) });

    return new Response(JSON.stringify({
      ok: true,
      fuente: 'Secretaría de Energía · Procesamiento por Stream',
      fecha: fechaRef,
      gasoil: { g2: build('g2'), g3: build('g3') },
      nafta: { super: build('super'), premium: build('premium'), gnc: build('gnc') }
    }), { 
      status: 200, 
      headers: { ...cors, 'Cache-Control': 's-maxage=7200, stale-while-revalidate=14400' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: "Servicio de Energía no disponible." }), { status: 200, headers: cors });
  }
}