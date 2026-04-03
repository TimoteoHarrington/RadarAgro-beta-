// api/bcra.js — Vercel Serverless Function
// Proxea la API pública del BCRA (Estadísticas Monetarias v4.0)

const BCRA_BASE = process.env.BCRA_API ?? 'https://api.bcra.gob.ar/estadisticas/v4.0/Monetarias';

const VARIABLES = [
  // Cambiario
  { id: 1,  key: 'reservas',             nombre: 'Reservas Internacionales',        unidad: 'MM USD', categoria: 'Cambiario', formato: 'numero' },
  { id: 4,  key: 'usd_minorista',        nombre: 'Dólar Minorista (vendedor)',      unidad: '$/USD',  categoria: 'Cambiario', formato: 'numero' },
  { id: 5,  key: 'usd_mayorista',        nombre: 'Dólar Mayorista (referencia)',    unidad: '$/USD',  categoria: 'Cambiario', formato: 'numero' },
  // Tasas
  { id: 7,  key: 'badlar_tna',           nombre: 'BADLAR Privados (TNA)',           unidad: '% TNA',  categoria: 'Tasas',     formato: 'pct' },
  { id: 35, key: 'badlar_tea',           nombre: 'BADLAR Privados (TEA)',           unidad: '% TEA',  categoria: 'Tasas',     formato: 'pct' },
  { id: 44, key: 'tamar_tna',            nombre: 'TAMAR Privados (TNA)',            unidad: '% TNA',  categoria: 'Tasas',     formato: 'pct' },
  { id: 45, key: 'tamar_tea',            nombre: 'TAMAR Privados (TEA)',            unidad: '% TEA',  categoria: 'Tasas',     formato: 'pct' },
  { id: 12, key: 'tasa_depositos_30d',   nombre: 'Depósitos 30 días',              unidad: '% TNA',  categoria: 'Tasas',     formato: 'pct' },
  { id: 14, key: 'tasa_prestamos',       nombre: 'Préstamos Personales',           unidad: '% TNA',  categoria: 'Tasas',     formato: 'pct' },
  { id: 43, key: 'tasa_justicia',        nombre: 'Tasa Justicia (P.14.290)',       unidad: '% anual',categoria: 'Tasas',     formato: 'pct' },
  // Monetario
  { id: 15, key: 'base_monetaria',       nombre: 'Base Monetaria',                 unidad: 'MM $',   categoria: 'Monetario', formato: 'numero' },
  { id: 17, key: 'billetes_publico',     nombre: 'Billetes en poder del Público',  unidad: 'MM $',   categoria: 'Monetario', formato: 'numero' },
  { id: 21, key: 'depositos_total',      nombre: 'Depósitos Totales en EF',        unidad: 'MM $',   categoria: 'Monetario', formato: 'numero' },
  { id: 24, key: 'depositos_plazo',      nombre: 'Depósitos a Plazo',              unidad: 'MM $',   categoria: 'Monetario', formato: 'numero' },
  { id: 26, key: 'prestamos_privado',    nombre: 'Préstamos al Sector Privado',    unidad: 'MM $',   categoria: 'Monetario', formato: 'numero' },
  // Inflacion
  { id: 27, key: 'inflacion_mensual',    nombre: 'Inflacion Mensual (IPC)',        unidad: '%',      categoria: 'Inflacion', formato: 'pct' },
  { id: 28, key: 'inflacion_interanual', nombre: 'Inflacion Interanual (IPC)',     unidad: '%',      categoria: 'Inflacion', formato: 'pct' },
  { id: 29, key: 'inflacion_esperada',   nombre: 'Inflacion Esperada (12 meses)', unidad: '%',      categoria: 'Inflacion', formato: 'pct' },
  // Indices
  { id: 30, key: 'cer',                  nombre: 'CER',                            unidad: 'indice', categoria: 'Indices',   formato: 'numero' },
  { id: 31, key: 'uva',                  nombre: 'UVA',                            unidad: '$',      categoria: 'Indices',   formato: 'numero' },
  { id: 32, key: 'uvi',                  nombre: 'UVI',                            unidad: '$',      categoria: 'Indices',   formato: 'numero' },
  { id: 40, key: 'icl',                  nombre: 'ICL (Contratos de Locacion)',    unidad: 'indice', categoria: 'Indices',   formato: 'numero' },
];

// fetch con timeout via AbortController — consistente con el resto de proxies
async function fetchBCRA(url, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'RadarAgro/1.0' },
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

const RESP_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, max-age=300',
};

export default async function handler(req, res) {
  Object.entries(RESP_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

  const { variable, desde, hasta } = req.query;

  // Modo historial: /api/bcra?variable=27&desde=2024-01-01
  if (variable) {
    const id     = parseInt(variable, 10);
    const varDef = VARIABLES.find(v => v.id === id);
    let url = BCRA_BASE + '/' + id + '?limit=3000';
    if (desde) url += '&desde=' + desde;
    if (hasta) url += '&hasta=' + hasta;

    try {
      const result = await fetchBCRA(url, 15000);
      const raw    = result.results?.[0]?.detalle || result.results || [];
      return res.status(200).json({ variable: varDef || { id }, data: raw });
    } catch (err) {
      return res.status(502).json({ error: err.message });
    }
  }

  // Modo resumen: ultimo valor de todas las variables
  try {
    const results = await Promise.allSettled(
      VARIABLES.map(v => fetchBCRA(BCRA_BASE + '/' + v.id + '?limit=2'))
    );

    const data = VARIABLES.map((varDef, i) => {
      const result = results[i];
      if (result.status !== 'fulfilled') {
        return { ...varDef, valor: null, fecha: null, valorAnterior: null, fechaAnterior: null };
      }
      const detalle = result.value.results?.[0]?.detalle || [];
      const latest  = detalle[0] ?? null;
      const prev    = detalle[1] ?? null;
      return {
        ...varDef,
        valor:         latest?.valor ?? null,
        fecha:         latest?.fecha ?? null,
        valorAnterior: prev?.valor   ?? null,
        fechaAnterior: prev?.fecha   ?? null,
      };
    });

    return res.status(200).json({ data, timestamp: new Date().toISOString() });
  } catch (error) {
    return res.status(502).json({ error: 'Error al consultar BCRA', message: error.message });
  }
}
