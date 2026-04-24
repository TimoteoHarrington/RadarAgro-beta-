// api/hacienda.js — Vercel Serverless Function (Node.js)
// Fuente: consignatarias.com.ar API pública
// Docs: https://www.consignatarias.com.ar/api-docs
// OpenAPI: https://www.consignatarias.com.ar/openapi.json

const BASE = 'https://www.consignatarias.com.ar/api';

const GRUPO_MAP = [
  { match: k => /novillo/i.test(k) && !/novillito/i.test(k),  grupo: 'novillos'    },
  { match: k => /novillito/i.test(k),                          grupo: 'novillitos'  },
  { match: k => /vaquillon/i.test(k),                          grupo: 'vaquillonas' },
  { match: k => /vaca/i.test(k),                               grupo: 'vacas'       },
  { match: k => /toro/i.test(k),                               grupo: 'toros'       },
  { match: k => /mej/i.test(k),                                grupo: 'mejores'     },
];

const ORDEN_GRUPOS = ['novillos', 'novillitos', 'vaquillonas', 'vacas', 'toros', 'mejores'];
const GRUPO_LABELS = { novillos:'Novillos', novillitos:'Novillitos', vaquillonas:'Vaquillonas', vacas:'Vacas', toros:'Toros', mejores:'Mejores' };

function formatNombre(key) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/\bEsp\b/gi, 'Esp.')
    .replace(/\bReg\b/gi, 'Reg.');
}

async function fetchJSON(url, timeoutMs = 15000) {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'Accept': 'application/json', 'User-Agent': 'RadarAgro/2.0' },
    });
    if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function normalizarCategorias(preciosData, fecha) {
  const rawCategories = preciosData.categories ?? {};
  return Object.entries(rawCategories).map(([key, val], i) => {
    const mapeo = GRUPO_MAP.find(m => m.match(key));
    const grupo = mapeo?.grupo || 'novillos';
    return {
      id:        `${grupo}.${i}`,
      nombreRaw:  key,
      nombre:     formatNombre(key),
      grupo,
      minimo:    null,
      maximo:    null,
      promedio:  val.current ?? 0,
      mediana:   null,
      cabezas:   0,
      kgProm:    null,
      variacion: val.change ?? null,
      anterior:  val.prev   ?? null,
      unidad:    'ARS/kg vivo',
      fecha,
    };
  }).filter(cat => cat.promedio > 0);
}

function construirGrupos(categorias) {
  const map = {};
  for (const cat of categorias) {
    if (!map[cat.grupo]) map[cat.grupo] = [];
    map[cat.grupo].push(cat);
  }
  return ORDEN_GRUPOS.filter(g => map[g]?.length).map(g => ({ id: g, label: GRUPO_LABELS[g], items: map[g] }));
}

function construirIndices(preciosData, fecha) {
  const inmagRaw = preciosData.inmag ?? null;
  const inmag    = inmagRaw?.current ?? null;
  const varS     = inmagRaw?.change  ?? null;
  const arrend   = inmag != null ? Math.round(inmag * 0.994 * 100) / 100 : null;
  return [
    inmag  != null ? { id: 'ar.canuelas.inmag',         label: 'INMAG',        valor: inmag,  unidad: 'ARS/kg vivo', desc: 'Índice Novillo MAG · referencia novillos especiales', variacionSemanal: varS,  fecha } : null,
    arrend != null ? { id: 'ar.canuelas.arrendamiento', label: 'Arrendamiento', valor: arrend, unidad: 'ARS/ha/año',  desc: 'Equivalente hacienda para arrendamientos',             variacionSemanal: null, fecha } : null,
  ].filter(Boolean);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 's-maxage=14400, stale-while-revalidate=86400');

  try {
    let preciosData;
    try {
      preciosData = await fetchJSON(`${BASE}/precios`);
    } catch (err) {
      const status = err.status === 429 ? 429 : 503;
      return res.status(status).json({ ok: false, error: err.message });
    }

    const fecha      = preciosData.fecha ?? preciosData.date ?? new Date().toISOString().split('T')[0] + 'T00:00:00-03:00';
    const indices    = construirIndices(preciosData, fecha);
    const categorias = normalizarCategorias(preciosData, fecha);
    const grupos     = construirGrupos(categorias);

    if (!categorias.length && !indices.length) {
      return res.status(502).json({ ok: false, error: 'sin_datos', raw: preciosData });
    }

    const [statsRes, rematesHoyRes, rematesProxRes, historicoRes] = await Promise.allSettled([
      fetchJSON(`${BASE}/remates/stats`),
      fetchJSON(`${BASE}/remates/hoy`),
      fetchJSON(`${BASE}/remates/proximos?dias=7`),
      fetchJSON(`${BASE}/market/history?days=30`),
    ]);

    let stats = null;
    if (statsRes.status === 'fulfilled') {
      const sd = statsRes.value?.data?.resumen ?? {};
      stats = {
        totalRemates:          sd.totalRemates          ?? null,
        rematesHoy:            sd.rematesHoy            ?? null,
        rematesProximos7dias:  sd.rematesProximos7dias  ?? null,
        provinciasActivas:     sd.provinciasActivas     ?? null,
        consignatariasActivas: sd.consignatariasActivas ?? null,
      };
    }

    const rematesHoy      = rematesHoyRes.status  === 'fulfilled' && Array.isArray(rematesHoyRes.value?.data)  ? rematesHoyRes.value.data  : [];
    const rematesProximos = rematesProxRes.status === 'fulfilled' && Array.isArray(rematesProxRes.value?.data) ? rematesProxRes.value.data : [];

    let historico = null;
    if (historicoRes.status === 'fulfilled') {
      const hd     = historicoRes.value;
      const series = Array.isArray(hd?.series) ? hd.series : [];
      if (series.length > 0) {
        const vals = series.map(s => s.valor ?? s.inmag ?? s.precio ?? s.current ?? 0).filter(v => v > 0);
        historico = {
          series,
          stats: hd?.stats ?? (vals.length ? { min: Math.min(...vals), max: Math.max(...vals), avg: vals.reduce((a, b) => a + b, 0) / vals.length } : null),
        };
      }
    }

    return res.status(200).json({
      ok:              true,
      fuente:          'consignatarias.com.ar · API pública · INMAG',
      fecha,
      indices,
      grupos,
      categorias,
      totalCabezas:    null,
      stats,
      rematesHoy,
      rematesProximos,
      historico,
    });

  } catch (err) {
    console.error('[api/hacienda]', err.message);
    return res.status(503).json({ ok: false, error: err.message });
  }
}
