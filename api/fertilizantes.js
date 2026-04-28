// api/fertilizantes.js — Vercel Edge Function
// Precios de fertilizantes en USD/tn (FOB internacional) + conversión ARS/tn
//
// Fuente única: IndexMundi
//   - Agrega datos del World Bank Pink Sheet (actualización mensual automática)
//   - URL estable y predecible, HTML sin JS dinámico, sin auth
//   - Historial de 24 meses configurable
//   - Cubre: Urea, DAP, MOP (KCl), TSP
//
// Productos con cobertura parcial:
//   - MAP  → no está en IndexMundi; se estima como DAP × 0.97 (correlación histórica alta)
//   - UAN  → no está en IndexMundi; se estima como Urea × 0.62 (base nitrógeno equivalente)
//   - Sol. Amonio → no está en IndexMundi; se omite o se estima si hay necesidad
//
// Si IndexMundi falla → 503, sin datos ficticios.

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
  clu:  { nombre: 'KCl (MOP)',       formula: '0-0-60',  uso: 'Nutrición potásica · cultivos intensivos',          nota: 'Cloruro de potasio · potasio'           },
};

// ─── IndexMundi: páginas a scrapear ──────────────────────────────────────────
// months=24 → historial de 24 meses. El scraping extrae la tabla con fechas y precios USD/tn.

const INDEXMUNDI_PAGES = [
  { key: 'urea', url: 'https://www.indexmundi.com/commodities/?commodity=urea&months=24' },
  { key: 'dap',  url: 'https://www.indexmundi.com/commodities/?commodity=dap-fertilizer&months=24' },
  { key: 'clu',  url: 'https://www.indexmundi.com/commodities/?commodity=potassium-chloride&months=24' },
];

// Extrae la tabla de precios históricos del HTML de IndexMundi.
// La tabla tiene el formato:
//   <tr><td>Month</td><td>Price</td><td>Change</td></tr>
//   <tr><td>Apr 2026</td><td>690.50</td><td>0.07%</td></tr>
// Devuelve { precioActual, varPct, historial: [{ fecha, usd }] }
function parseIndexMundi(html) {
  if (!html) return null;

  // Extraer todas las filas de datos de la tabla de precios
  // IndexMundi renderiza los datos en una tabla con id="home_table" o similar
  // Capturamos pares mes/precio con un regex robusto sobre el HTML
  const rowRe = /<tr[^>]*>\s*<td[^>]*>([A-Za-z]+ \d{4})<\/td>\s*<td[^>]*>([\d,]+\.?\d*)<\/td>/g;
  const filas = [];
  let m;
  while ((m = rowRe.exec(html)) !== null) {
    const fecha = m[1].trim();
    const usd = parseFloat(m[2].replace(/,/g, ''));
    if (!isNaN(usd) && usd > 50 && usd < 20000) {
      filas.push({ fecha, usd });
    }
  }

  if (filas.length < 2) return null;

  // IndexMundi muestra los datos del más reciente al más antiguo
  // El primer elemento es el precio actual
  const precioActual = filas[0].usd;
  const precioAnterior = filas[1].usd;
  const varPct = precioAnterior > 0
    ? parseFloat(((precioActual - precioAnterior) / precioAnterior * 100).toFixed(2))
    : null;

  // Historial en orden cronológico (del más antiguo al más reciente)
  const historial = filas.slice().reverse();

  return { usd: precioActual, varPct, historial, fecha: filas[0].fecha };
}

// ─── Fetch IndexMundi ─────────────────────────────────────────────────────────

async function fetchIndexMundi(timeoutMs = 12000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const out = {};

  try {
    const results = await Promise.allSettled(
      INDEXMUNDI_PAGES.map(({ key, url }) =>
        fetch(url, {
          signal: ctrl.signal,
          headers: {
            'User-Agent': UA,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
            'Referer': 'https://www.indexmundi.com/',
          },
        })
          .then(r => r.ok ? r.text() : null)
          .then(html => ({ key, parsed: parseIndexMundi(html) }))
          .catch(() => ({ key, parsed: null }))
      )
    );

    clearTimeout(timer);

    for (const res of results) {
      if (res.status !== 'fulfilled') continue;
      const { key, parsed } = res.value;
      if (parsed) out[key] = parsed;
    }

    // Necesitamos al menos urea + dap para considerar éxito
    if (!out.urea && !out.dap) return null;

    // Derivar MAP desde DAP (correlación histórica ~0.97)
    if (out.dap && !out.map) {
      out.map = {
        usd: parseFloat((out.dap.usd * 0.97).toFixed(2)),
        varPct: out.dap.varPct,
        historial: out.dap.historial.map(h => ({ ...h, usd: parseFloat((h.usd * 0.97).toFixed(2)) })),
        fecha: out.dap.fecha,
        estimado: true,
      };
    }

    // Derivar UAN desde Urea (base nitrógeno equivalente: UAN 28% vs Urea 46%)
    if (out.urea && !out.uan) {
      const factor = 0.62; // 28/46 × ajuste mercado Argentina
      out.uan = {
        usd: parseFloat((out.urea.usd * factor).toFixed(2)),
        varPct: out.urea.varPct,
        historial: out.urea.historial.map(h => ({ ...h, usd: parseFloat((h.usd * factor).toFixed(2)) })),
        fecha: out.urea.fecha,
        estimado: true,
      };
    }

    return out;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

// ─── Tipo de cambio mayorista ─────────────────────────────────────────────────

async function fetchDolarMayorista() {
  try {
    const res = await fetch('https://dolarapi.com/v1/dolares/mayorista', {
      headers: { 'User-Agent': 'RadarAgro/2.0' },
    });
    if (!res.ok) return null;
    const d = await res.json();
    return parseFloat(d.venta ?? d.compra ?? 0) || null;
  } catch {
    return null;
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  const [precios, dolarMayorista] = await Promise.all([
    fetchIndexMundi(12000),
    fetchDolarMayorista(),
  ]);

  if (!precios) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'IndexMundi no respondió o no devolvió datos válidos.',
        timestamp: new Date().toISOString(),
      }),
      { status: 503, headers: { ...CORS, 'Cache-Control': 'no-store' } }
    );
  }

  const ORDEN = ['urea', 'map', 'dap', 'uan', 'clu'];
  const productos = [];

  for (const id of ORDEN) {
    const p = precios[id];
    const meta = META[id];
    if (!p || !meta) continue;

    const usd = p.usd;
    const ars = dolarMayorista ? Math.round(usd * dolarMayorista) : null;
    const varPct = p.varPct ?? null;
    const deltaArs = ars && varPct ? Math.round(ars * varPct / 100) : 0;

    // Historial en ARS si tenemos tipo de cambio, sino en USD
    const hist = p.historial
      ? p.historial.map(h => dolarMayorista ? Math.round(h.usd * dolarMayorista) : h.usd)
      : [];

    // Fechas del historial para el eje X
    const histFechas = p.historial ? p.historial.map(h => h.fecha) : [];

    productos.push({
      id,
      ...meta,
      usd,
      ars,
      varPct,
      deltaArs,
      hist,
      histFechas,
      fecha: p.fecha ?? null,
      estimado: p.estimado ?? false,
    });
  }

  return new Response(
    JSON.stringify({
      ok: true,
      fuente: 'indexmundi',
      fuenteLabel: 'IndexMundi · World Bank Pink Sheet',
      dolarMayorista,
      timestamp: new Date().toISOString(),
      productos,
    }),
    {
      status: 200,
      headers: {
        ...CORS,
        // Cache 6 horas — los precios son mensuales, no tiene sentido refrescar más seguido
        'Cache-Control': 'public, s-maxage=21600',
      },
    }
  );
}
