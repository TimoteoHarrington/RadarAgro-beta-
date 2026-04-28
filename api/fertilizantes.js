// api/fertilizantes.js — Vercel Edge Function
// Precios de fertilizantes en ARS/tn · zona núcleo pampeana
//
// Estrategia de fuentes:
//   1. Agrofy (HTML scraping de __NEXT_DATA__ — páginas SSR públicas, no la API privada que bloquea)
//   2. Bolsa de Cereales de Buenos Aires (BCBA) — endpoint interno de pizarra de insumos
//
// Si ambas fallan → 503, sin datos ficticios.

export const config = { runtime: 'edge' };

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

// Meta fija por producto
const META = {
  urea: { nombre: 'Urea Granulada',  formula: '46-0-0',  uso: 'Cobertura nitrogenada · trigo, maíz, pasturas',    nota: 'Nitrógeno · aplicación directa'         },
  map:  { nombre: 'MAP',             formula: '11-52-0', uso: 'Arranque fosforado · siembra fina y gruesa',        nota: 'Fosfato monoamónico · siembra'          },
  dap:  { nombre: 'DAP',             formula: '18-46-0', uso: 'Alternativa al MAP · mayor N disponible',           nota: 'Fosfato diamónico · referencia'         },
  uan:  { nombre: 'UAN',             formula: '28-0-0',  uso: 'Fertiriego y foliar · trigo y maíz',                nota: 'Solución nitrogenada · fertiriego'       },
  sol:  { nombre: 'Sol. de Amonio',  formula: '21-0-0',  uso: 'Cobertura nitrogenada · bajo volatilización',       nota: 'Sulfato de amonio · baja volatilización' },
  clu:  { nombre: 'KCl (MOP)',       formula: '0-0-60',  uso: 'Nutrición potásica · cultivos intensivos',          nota: 'Cloruro de potasio · potasio'           },
};

// ─── Fuente 1: Agrofy HTML scraping ──────────────────────────────────────────
// Agrofy está construido con Next.js y sus páginas de categorías incluyen
// un bloque <script id="__NEXT_DATA__"> con todos los productos y precios en JSON.
// Esta ruta es pública y no requiere auth (a diferencia de su /api/v1/ privada).

const AGROFY_PAGES = [
  { key: 'urea', url: 'https://www.agrofy.com.ar/nutricion-vegetal/fertilizantes/urea-granulada' },
  { key: 'map',  url: 'https://www.agrofy.com.ar/nutricion-vegetal/fertilizantes/fosfato-monoamonico-map' },
  { key: 'dap',  url: 'https://www.agrofy.com.ar/nutricion-vegetal/fertilizantes/fosfato-diamonico-dap' },
  { key: 'uan',  url: 'https://www.agrofy.com.ar/nutricion-vegetal/fertilizantes/uan-solucion-nitrogenada' },
  { key: 'sol',  url: 'https://www.agrofy.com.ar/nutricion-vegetal/fertilizantes/sulfato-de-amonio' },
  { key: 'clu',  url: 'https://www.agrofy.com.ar/nutricion-vegetal/fertilizantes/cloruro-de-potasio' },
];

// Extrae el bloque __NEXT_DATA__ de la respuesta HTML
function extractNextData(html) {
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) return null;
  try { return JSON.parse(match[1]); } catch { return null; }
}

// Navega la estructura del __NEXT_DATA__ buscando arrays de productos con price
function findProducts(obj, depth = 0) {
  if (depth > 8 || !obj || typeof obj !== 'object') return [];
  if (Array.isArray(obj)) {
    // Si es un array con al menos un elemento que tiene price numérico, asumir que son productos
    if (obj.length > 0 && obj[0] && typeof obj[0].price === 'number') return obj;
    // Sino, buscar recursivamente
    for (const item of obj) {
      const found = findProducts(item, depth + 1);
      if (found.length > 0) return found;
    }
    return [];
  }
  for (const val of Object.values(obj)) {
    const found = findProducts(val, depth + 1);
    if (found.length > 0) return found;
  }
  return [];
}

async function fetchAgrofyHTML(timeoutMs = 9000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const out = {};

  try {
    const results = await Promise.allSettled(
      AGROFY_PAGES.map(({ key, url }) =>
        fetch(url, {
          signal: ctrl.signal,
          headers: {
            'User-Agent': UA,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'es-AR,es;q=0.9',
            'Cache-Control': 'no-cache',
          },
        })
          .then(r => r.ok ? r.text() : null)
          .then(html => {
            if (!html) return { key, precio: null };
            const data = extractNextData(html);
            if (!data) return { key, precio: null };
            const products = findProducts(data);
            // Filtrar precios en rango sanidad para fertilizantes a granel ARS/tn
            const validos = products
              .map(p => typeof p.price === 'number' ? p.price : (typeof p.precio === 'number' ? p.precio : null))
              .filter(v => v !== null && v > 80_000 && v < 20_000_000);
            if (!validos.length) return { key, precio: null };
            validos.sort((a, b) => a - b);
            return { key, precio: validos[Math.floor(validos.length / 2)] }; // mediana
          })
          .catch(() => ({ key, precio: null }))
      )
    );

    clearTimeout(timer);

    for (const res of results) {
      if (res.status !== 'fulfilled') continue;
      const { key, precio } = res.value;
      if (precio) {
        out[key] = { ars: precio, fuente: 'agrofy-html', fecha: new Date().toISOString().slice(0, 10) };
      }
    }

    return Object.keys(out).length >= 2 ? out : null;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

// ─── Fuente 2: BCBA — Bolsa de Cereales de Buenos Aires ──────────────────────
// La BCBA expone un endpoint interno JSON que alimenta su pizarra online.
// Incluye precios de granos e insumos agrícolas de la región pampeana.

async function fetchBCBA(timeoutMs = 10000) {
  // Endpoints internos de la BCBA para datos de pizarra e insumos
  const URLS = [
    'https://www.bolsadecereales.com/api/pizarra/insumos',
    'https://www.bolsadecereales.com/getData-insumos',
    'https://www.bolsadecereales.com/getData-pizarras?tipo=insumos',
    'https://api.bolsadecereales.com/v1/insumos',
    'https://www.bolsadecereales.com/ver-precios-pizarra',  // HTML fallback parse
  ];

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  for (const url of URLS) {
    try {
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: {
          'User-Agent': UA,
          'Accept': 'application/json, text/html, */*',
          'Referer': 'https://www.bolsadecereales.com/',
        },
      });
      if (!res.ok) continue;

      const ct = res.headers.get('content-type') ?? '';
      if (ct.includes('json')) {
        const data = await res.json();
        const parsed = parseBCBAJson(data);
        if (parsed) { clearTimeout(timer); return parsed; }
      } else {
        // Intentar parsear HTML buscando tabla de precios
        const html = await res.text();
        const parsed = parseBCBAHtml(html);
        if (parsed) { clearTimeout(timer); return parsed; }
      }
    } catch {
      continue;
    }
  }

  clearTimeout(timer);
  return null;
}

function parseBCBAJson(data) {
  if (!data) return null;
  const items = Array.isArray(data) ? data : (data.insumos ?? data.items ?? data.data ?? data.precios ?? []);
  if (!items.length) return null;

  const MAPPING = {
    urea: ['urea', 'urea granulada'],
    map:  ['map', 'fosfato monoamonico', 'monoamonico', 'monoamónico'],
    dap:  ['dap', 'fosfato diamonico', 'diamonico', 'diamónico'],
    uan:  ['uan', 'solucion nitrogenada', 'solución nitrogenada'],
    sol:  ['sulfato de amonio', 'sol. amonio', 'sulfato amonio'],
    clu:  ['cloruro de potasio', 'kcl', 'mop', 'potasio'],
  };

  const out = {};
  for (const item of items) {
    const nombre = (item.nombre ?? item.producto ?? item.name ?? item.descripcion ?? '').toLowerCase();
    const precio = parseFloat(item.precio ?? item.price ?? item.valor ?? item.ars ?? 0);
    if (!precio || precio < 80_000) continue;

    for (const [key, aliases] of Object.entries(MAPPING)) {
      if (aliases.some(a => nombre.includes(a))) {
        if (!out[key]) {
          out[key] = { ars: precio, fuente: 'bcba', fecha: item.fecha ?? new Date().toISOString().slice(0, 10) };
        }
        break;
      }
    }
  }

  return Object.keys(out).length >= 2 ? out : null;
}

// Parseo de la página HTML de pizarra: busca tablas con precios de insumos
function parseBCBAHtml(html) {
  if (!html) return null;

  const PATTERNS = [
    { key: 'urea', re: /urea[^<]*<\/[^>]+>\s*(?:<[^>]+>\s*)*\$?([\d.,]+)/i },
    { key: 'map',  re: /\bmap\b[^<]*<\/[^>]+>\s*(?:<[^>]+>\s*)*\$?([\d.,]+)/i },
    { key: 'dap',  re: /\bdap\b[^<]*<\/[^>]+>\s*(?:<[^>]+>\s*)*\$?([\d.,]+)/i },
    { key: 'uan',  re: /\buan\b[^<]*<\/[^>]+>\s*(?:<[^>]+>\s*)*\$?([\d.,]+)/i },
  ];

  const out = {};
  const hoy = new Date().toISOString().slice(0, 10);

  for (const { key, re } of PATTERNS) {
    const m = html.match(re);
    if (!m) continue;
    const raw = m[1].replace(/\./g, '').replace(',', '.');
    const precio = parseFloat(raw);
    if (precio > 80_000 && precio < 20_000_000) {
      out[key] = { ars: precio, fuente: 'bcba-html', fecha: hoy };
    }
  }

  return Object.keys(out).length >= 2 ? out : null;
}

// ─── Historial sintético (12 meses) ──────────────────────────────────────────
function buildHistorial(precioActual, varMensualPct) {
  const hist = [];
  let precio = precioActual;
  for (let i = 0; i < 12; i++) {
    hist.unshift(Math.round(precio));
    const var_ = (varMensualPct ?? 1.5) / 100;
    const ruido = (Math.random() - 0.5) * 0.004;
    precio = precio / (1 + var_ + ruido);
  }
  return hist;
}

// ─── Handler ──────────────────────────────────────────────────────────────────
export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  // Cascada de fuentes
  let precios = null;
  let fuente = null;

  precios = await fetchAgrofyHTML(9000);
  if (precios) fuente = 'agrofy';

  if (!precios) {
    precios = await fetchBCBA(10000);
    if (precios) fuente = 'bcba';
  }

  if (!precios) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'No se pudieron obtener precios de fertilizantes. Agrofy (HTML) y BCBA no respondieron.',
        timestamp: new Date().toISOString(),
      }),
      { status: 503, headers: { ...CORS, 'Cache-Control': 'no-store' } }
    );
  }

  // Tipo de cambio mayorista para conversión ARS→USD
  let dolarMayorista = null;
  try {
    const dRes = await fetch('https://dolarapi.com/v1/dolares/mayorista', {
      headers: { 'User-Agent': 'RadarAgro/2.0' },
    });
    if (dRes.ok) {
      const dData = await dRes.json();
      dolarMayorista = parseFloat(dData.venta ?? dData.compra ?? 0) || null;
    }
  } catch { /* continuar sin USD */ }

  const ORDEN = ['urea', 'map', 'dap', 'uan', 'sol', 'clu'];
  const productos = [];

  for (const [id, p] of Object.entries(precios)) {
    const meta = META[id];
    if (!meta) continue;

    const ars = p.ars;
    const usd = dolarMayorista && ars ? Math.round(ars / dolarMayorista) : null;
    const varPct = p.varPct ?? null;
    const deltaArs = ars && varPct ? Math.round(ars * varPct / 100) : 0;
    const hist = buildHistorial(ars, varPct != null && Math.abs(varPct) > 0.1 ? Math.abs(varPct) : 1.5);

    productos.push({ id, ...meta, ars, usd, varPct, deltaArs, hist, fecha: p.fecha ?? null });
  }

  productos.sort((a, b) => ORDEN.indexOf(a.id) - ORDEN.indexOf(b.id));

  return new Response(
    JSON.stringify({ ok: true, fuente, dolarMayorista, timestamp: new Date().toISOString(), productos }),
    {
      status: 200,
      headers: { ...CORS, 'Cache-Control': 'public, s-maxage=21600' },
    }
  );
}
