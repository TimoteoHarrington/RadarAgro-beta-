// api/fob.js — Vercel Edge Function corregida
export const config = { runtime: 'edge' };

const FOB_URL = 'https://magyp.gob.ar/sitio/areas/ss_mercados_agropecuarios/indicadores_minagri/granos/_archivos/000004_Estad%C3%ADsticas/000030_Precios%20FOB%20Oficiales/precios_fob.php';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

function hace(dias) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - dias);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

async function fetchFOB(fecha) {
  try {
    const res = await fetch(`${FOB_URL}?Fecha=${encodeURIComponent(fecha)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
      }
    });
    if (!res.ok) return null;
    
    const text = await res.text();
    if (!text || text.trim().length < 10) return null; // Evita respuestas vacías o errores cortos de PHP

    // Limpiar posibles caracteres invisibles (BOM)
    const cleanJson = text.replace(/^\uFEFF/, '').trim();
    return JSON.parse(cleanJson);
  } catch (e) {
    return null;
  }
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  // Generamos una lista de los últimos 10 días, pero priorizamos días de semana
  const intentos = [];
  for (let i = 0; i < 10; i++) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const diaSemana = d.getUTCDay(); // 0=domingo, 6=sábado
    if (diaSemana !== 0 && diaSemana !== 6) {
      intentos.push(hace(i));
    }
  }

  let data = null;
  let fechaUsada = null;

  for (const fecha of intentos) {
    const json = await fetchFOB(fecha);
    if (json && Object.keys(json).length > 5) { // El JSON del MAGyP suele ser grande
      data = json;
      fechaUsada = fecha;
      break;
    }
  }

  if (data) {
    return new Response(JSON.stringify({ ok: true, precios: data, fecha: fechaUsada }), {
      status: 200,
      headers: { ...CORS, 'Cache-Control': 'public, s-maxage=7200' }
    });
  }

  return new Response(JSON.stringify({ ok: false, error: 'No hay datos disponibles en el MAGyP para la última semana' }), {
    status: 503,
    headers: CORS
  });
}
