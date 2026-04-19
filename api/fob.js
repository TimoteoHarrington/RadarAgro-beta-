// api/fob.js — Precios FOB oficiales MAGyP · Versión 2.0
// Fallback automático de fin de semana/feriado: retrocede hasta 5 días hábiles
export const config = { runtime: 'edge' };

const FOB_URL = 'https://www.magyp.gob.ar/sitio/areas/ss_mercados_agropecuarios/ws/ssma/precios_fob.php';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

// Formatea fecha para el endpoint MAGyP: "DD/MM/YYYY"
function formatFechaMagyp(d) {
  const dd   = String(d.getDate()).padStart(2, '0');
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// Intenta obtener datos FOB para una fecha dada
async function fetchParaFecha(fecha) {
  const res = await fetch(`${FOB_URL}?Fecha=${fecha}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Referer': 'https://www.magyp.gob.ar/',
    },
  });

  if (!res.ok) return null;

  let data;
  try { data = await res.json(); } catch { return null; }

  if (data && Array.isArray(data.posts) && data.posts.length > 0) {
    return data;
  }
  return null;
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  const ahora = new Date();

  // Probar desde hoy hacia atrás hasta 5 días calendario (cubre fines de semana + feriados largos)
  for (let i = 0; i <= 5; i++) {
    const d = new Date(ahora);
    d.setDate(d.getDate() - i);

    // Saltar domingos y sábados solo para el día actual (el endpoint igual no tendrá datos)
    // Para días previos intentamos igual por si hay datos tardíos
    const diaSemana = d.getDay();
    if (i === 0 && (diaSemana === 0 || diaSemana === 6)) continue;

    const fecha = formatFechaMagyp(d);

    try {
      const data = await fetchParaFecha(fecha);

      if (data) {
        return new Response(
          JSON.stringify({
            ok:          true,
            fecha,
            diasAtras:   i,
            precios_raw: data.posts,
          }),
          {
            status: 200,
            headers: {
              ...CORS,
              // Cache corto: 2h si es hoy, 6h si es día anterior (datos definitivos)
              'Cache-Control': `public, s-maxage=${i === 0 ? 7200 : 21600}`,
            },
          }
        );
      }
    } catch {
      // Seguimos intentando con el día anterior
      continue;
    }
  }

  // No encontramos datos en ninguno de los últimos 5 días
  return new Response(
    JSON.stringify({
      ok:    false,
      error: 'MAGyP no devolvió datos en los últimos 5 días. El servidor puede estar en mantenimiento.',
    }),
    { status: 503, headers: CORS }
  );
}
