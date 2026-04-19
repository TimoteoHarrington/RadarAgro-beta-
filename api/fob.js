// api/fob.js — Versión Final 2026
export const config = { runtime: 'edge' };

// URL oficial validada por el usuario
const FOB_URL = 'https://www.magyp.gob.ar/sitio/areas/ss_mercados_agropecuarios/ws/ssma/precios_fob.php';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  // Forzamos el viernes 17/04/2026 ya que el fin de semana no hay datos nuevos
  const fecha = '17/04/2026'; 

  try {
    const res = await fetch(`${FOB_URL}?Fecha=${fecha}`, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    // Verificamos la estructura 'posts' que devolvió la API
    if (data && Array.isArray(data.posts)) {
      return new Response(JSON.stringify({
        ok: true,
        fecha: fecha,
        precios_raw: data.posts 
      }), {
        status: 200,
        headers: { 
          ...CORS, 
          'Cache-Control': 'public, s-maxage=7200' 
        }
      });
    } else {
      throw new Error('Estructura de datos inválida');
    }
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { 
      status: 500, 
      headers: CORS 
    });
  }
}