// api/fob.js — Vercel Edge Function
// Precios FOB oficiales del MAGyP — actualizacion diaria
// Fuente: magyp.gob.ar/sitio/areas/ss_mercados_agropecuarios/
//         indicadores_minagri/granos/_archivos/000004_Estadísticas/
//         000030_Precios%20FOB%20Oficiales/precios_fob.php
//
// NOTA: MAGyP bloquea IPs de Vercel/AWS con "Host not in allowlist".
// Las Edge Functions usan IPs de Cloudflare que sí son aceptadas,
// igual que ya se hace en api/insumos.js para datos.energia.gob.ar.

export const config = { runtime: 'edge' };

const FOB_URL =
  'https://magyp.gob.ar/sitio/areas/ss_mercados_agropecuarios/' +
  'indicadores_minagri/granos/_archivos/000004_Estad%C3%ADsticas/' +
  '000030_Precios%20FOB%20Oficiales/precios_fob.php';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

// Fecha formateada DD/MM/YYYY hace N días (UTC)
function hace(dias) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - dias);
  const dd   = String(d.getUTCDate()).padStart(2, '0');
  const mm   = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

async function fetchFOB(fecha, timeoutMs = 12000) {
  const url = `${FOB_URL}?Fecha=${encodeURIComponent(fecha)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RadarAgro/1.0)',
        'Accept':     'application/json, text/plain, */*',
      },
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const text = await res.text();
    const clean = text.replace(/^\uFEFF/, '').trim();
    return JSON.parse(clean);
  } finally {
    clearTimeout(timer);
  }
}

const CAMPO_MAP = {
  'soja':            'soja',
  'soja granos':     'soja',
  'maiz':            'maiz',
  'maíz':            'maiz',
  'trigo':           'trigo',
  'girasol':         'girasol',
  'harina de soja':  'harina_soja',
  'harina soja':     'harina_soja',
  'aceite de soja':  'aceite_soja',
  'aceite soja':     'aceite_soja',
  'pellets girasol': 'pellets_girasol',
  'cebada':          'cebada',
};

function normalizar(json) {
  const out = {};
  if (Array.isArray(json)) {
    for (const item of json) {
      const key = (item.producto ?? item.Producto ?? '').toLowerCase().trim();
      const val = parseFloat(item.precio ?? item.Precio ?? item.valor ?? item.Value);
      const norm = CAMPO_MAP[key];
      if (norm && !isNaN(val)) out[norm] = val;
    }
  } else if (json && typeof json === 'object') {
    for (const [k, v] of Object.entries(json)) {
      const norm = CAMPO_MAP[k.toLowerCase().trim()];
      const val  = parseFloat(v);
      if (norm && !isNaN(val)) out[norm] = val;
    }
  }
  return out;
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  // Ampliamos a 7 días para cubrir fines de semana largos
  const intentos = [0, 1, 2, 3, 4, 5, 6, 7].map(d => hace(d));
  let data = null;
  let fechaUsada = null;

  for (const fecha of intentos) {
    try {
      const json = await fetchFOB(fecha);
      const norm = normalizar(json);
      if (Object.keys(norm).length > 0) {
        data = norm;
        fechaUsada = fecha;
        break;
      }
    } catch {
      // seguimos con el siguiente intento
    }
  }

  if (data && Object.keys(data).length > 0) {
    return new Response(
      JSON.stringify({
        ok:      true,
        fuente:  'MAGyP · Mercados Agropecuarios · Ley 21.453 (USD FOB oficial)',
        fecha:   fechaUsada,
        precios: data,
      }),
      {
        status: 200,
        // En api/fob.js — Línea 119
      headers: {
        ...CORS,
        // Cacheamos 2 horas en el borde (Edge) y 4 horas como stale
        'Cache-Control': 'public, s-maxage=7200, stale-while-revalidate=14400',
      },
      }
    );
  }

  return new Response(
    JSON.stringify({
      ok:      false,
      error:   'No se pudo obtener precios FOB del MAGyP (sin datos para los últimos 3 días hábiles)',
      fuente:  'MAGyP · Mercados Agropecuarios · Ley 21.453',
      fecha:   null,
      precios: null,
    }),
    { status: 503, headers: CORS }
  );
}
