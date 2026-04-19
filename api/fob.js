// api/fob.js — Vercel Serverless Function
// Precios FOB oficiales del MAGyP — actualizacion diaria
// Fuente: magyp.gob.ar/sitio/areas/ss_mercados_agropecuarios/
//         indicadores_minagri/granos/_archivos/000004_Estadísticas/
//         000030_Precios%20FOB%20Oficiales/precios_fob.php
//
// El endpoint JSON documentado devuelve soja, maíz, trigo, girasol,
// harina y aceite de soja en USD/tn (Ley 21.453 — retenciones).

const FOB_URL = 'https://magyp.gob.ar/sitio/areas/ss_mercados_agropecuarios/' +
  'indicadores_minagri/granos/_archivos/000004_Estadísticas/' +
  '000030_Precios%20FOB%20Oficiales/precios_fob.php';

// Fecha de hoy formateada para el parámetro de la API
function hoy() {
  const d = new Date();
  const dd   = String(d.getDate()).padStart(2, '0');
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// Fecha de hace N días (para buscar si el dato de hoy no llegó aún)
function hace(dias) {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  const dd   = String(d.getDate()).padStart(2, '0');
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

async function fetchFOB(fecha, timeoutMs = 12000) {
  const url = `${FOB_URL}?Fecha=${fecha}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'RadarAgro/1.0',
        'Accept':     'application/json, text/plain',
      },
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const text = await res.text();
    // El endpoint puede devolver JSON directamente o con BOM
    const clean = text.replace(/^\uFEFF/, '').trim();
    return JSON.parse(clean);
  } finally {
    clearTimeout(timer);
  }
}

// Mapa de nombres posibles en la respuesta → clave normalizada
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
  // El JSON puede venir como array de objetos { producto, precio }
  // o como objeto plano { Soja: 290, Maiz: 200, ... }
  const out = {};
  if (Array.isArray(json)) {
    for (const item of json) {
      const key = (item.producto ?? item.Producto ?? '').toLowerCase().trim();
      const val = parseFloat(item.precio ?? item.Precio ?? item.valor ?? item.Value);
      const norm = CAMPO_MAP[key];
      if (norm && !isNaN(val)) out[norm] = val;
    }
  } else if (typeof json === 'object') {
    for (const [k, v] of Object.entries(json)) {
      const norm = CAMPO_MAP[k.toLowerCase().trim()];
      const val  = parseFloat(v);
      if (norm && !isNaN(val)) out[norm] = val;
    }
  }
  return out;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  // FOB actualiza una vez al día; cache 2h con revalidación en background
  res.setHeader('Cache-Control', 's-maxage=7200, stale-while-revalidate=14400');

  // Intentamos con hoy; si vacío, con ayer (no publica fines de semana)
  const intentos = [hoy(), hace(1), hace(2), hace(3)];
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
    return res.status(200).json({
      ok:     true,
      fuente: 'MAGyP · Mercados Agropecuarios · Ley 21.453 (USD FOB oficial)',
      fecha:  fechaUsada,
      precios: data,  // USD/tn
    });
  }

  return res.status(502).json({
      ok: false,
      error: 'No se pudieron obtener datos actualizados del MAGyP tras 4 intentos.',
      intentos: intentos
    });
}
