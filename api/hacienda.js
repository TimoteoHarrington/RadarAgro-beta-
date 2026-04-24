// api/hacienda.js — Vercel Serverless Function (Node.js)
// Fuente: consignatarias.com.ar API pública
// Docs: https://www.consignatarias.com.ar/api-docs
// OpenAPI: https://www.consignatarias.com.ar/openapi.json
// Base: https://www.consignatarias.com.ar/api

// NOTA: Esta función corre como Serverless (Node), no Edge.
// El cache s-maxage+stale-while-revalidate de Vercel es el mecanismo
// principal para no quemar el rate limit de la API upstream.

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
    .replace(/\bReg\b/gi,  'Reg.');
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
    return {
      id:        `${mapeo?.grupo || 'novillos'}.${i}`,
      nombreRaw:  key,
      nombre:     formatNombre(key),
      grupo:      mapeo?.grupo || 'novillos',
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
  return ORDEN_GRUPOS.filter(g => map[g]?.length).map(g => ({ id:g, label:GRUPO_LABELS[g], items:map[g] }));
}

function construirIndices(preciosData, fecha) {
  const inmagRaw = preciosData.inmag ?? null;
  const inmag    = inmagRaw?.current ?? null;
  const varS     = inmagRaw?.change  ?? null;
  const arrend   = inmag != null ? Math.round(inmag * 0.994 * 100) / 100 : null;
  return [
    inmag  != null ? { id:'ar.canuelas.inmag',         label:'INMAG',        valor:inmag,  unidad:'ARS/kg vivo', desc:'Índice Novillo MAG · referencia novillos especiales', variacionSemanal:varS, fecha } : null,
    arrend != null ? { id:'ar.canuelas.arrendamiento', label:'Arrendamiento', valor:arrend, unidad:'ARS/ha/año',  desc:'Equivalente hacienda para arrendamientos',             variacionSemanal:null, fecha } : null,
  ].filter(Boolean);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  // Cache largo: datos de hacienda se actualizan 1 vez por día hábil
  // stale-while-revalidate permite servir datos viejos mientras refresca en background
  res.setHeader('Cache-Control', 's-maxage=14400, stale-while-revalidate=86400');

  try {
    // /precios primero y solo — es el crítico
    let preciosData;
    try {
      preciosData = await fetchJSON(`${BASE}/precios`);
    } catch (err) {
      // Si la API upstream devuelve 429, reflejarlo tal cual
      // Vercel lo cachea y el cliente puede reintentar después
      const status = err.status === 429 ? 429 : 503;
      return res.status(status).json({ ok: false, error: err.message });
    }

    const fecha      = preciosData.fecha ?? preciosData.date ?? new Date().toISOString().split('T')[0] + 'T00:00:00-03:00';
    const indices    = construirIndices(preciosData, fecha);
    const categorias = normalizarCategorias(preciosData, fecha);
    const grupos     = construirGrupos(categorias);

    if (!categorias.length && !indices.length) {
      // Devolver estructura cruda para debug
      return res.status(502).json({ ok: false, error: 'sin_datos', raw: preciosData });
    }

    // Secundarios en paralelo — todos opcionales
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
          stats: hd?.stats ?? (vals.length ? { min: Math.min(...vals), max: Math.max(...vals), avg: vals.reduce((a,b) => a+b, 0) / vals.length } : null),
        };
      }
    }

    return res.status(200).json({
      ok:             true,
      fuente:         'consignatarias.com.ar · API pública · INMAG',
      fecha,
      indices,
      grupos,
      categorias,
      totalCabezas:   null,
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
    .replace(/\bReg\b/gi,  'Reg.');
}

// ── Fetch con timeout y retry en 429 ─────────────────────────────────────────
async function fetchJSON(url, timeoutMs = 12000, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: { 'Accept': 'application/json', 'User-Agent': 'RadarAgro/2.0' },
      });
      clearTimeout(timer);

      if (res.status === 429) {
        if (attempt < retries) {
          // Respetar Retry-After si viene, sino backoff exponencial
          const retryAfter = parseInt(res.headers.get('Retry-After') || '0', 10);
          const waitMs = retryAfter > 0 ? retryAfter * 1000 : (attempt + 1) * 1500;
          await new Promise(r => setTimeout(r, waitMs));
          continue;
        }
        throw new Error(`HTTP 429 (rate limit) en ${url}`);
      }

      if (!res.ok) throw new Error(`HTTP ${res.status} en ${url}`);
      return await res.json();
    } catch (err) {
      clearTimeout(timer);
      if (attempt < retries && err.name !== 'AbortError') continue;
      throw err;
    }
  }
}

// ── Normalizar categorías desde /api/precios ──────────────────────────────────
function normalizarCategorias(preciosData, fecha) {
  const rawCategories = preciosData.categories ?? {};

  return Object.entries(rawCategories).map(([key, val], i) => {
    const mapeo = GRUPO_MAP.find(m => m.match(key));
    const grupo  = mapeo?.grupo || 'novillos';

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

// ── Construir grupos ──────────────────────────────────────────────────────────
function construirGrupos(categorias) {
  const gruposMap = {};
  for (const cat of categorias) {
    if (!gruposMap[cat.grupo]) gruposMap[cat.grupo] = [];
    gruposMap[cat.grupo].push(cat);
  }
  return ORDEN_GRUPOS.filter(g => gruposMap[g]?.length)
    .map(g => ({ id:g, label:GRUPO_LABELS[g], items:gruposMap[g] }));
}

// ── Construir índices ─────────────────────────────────────────────────────────
function construirIndices(preciosData, fecha) {
  const inmagRaw = preciosData.inmag ?? null;
  const inmag    = inmagRaw?.current ?? null;
  const varS     = inmagRaw?.change  ?? null;
  const arrend   = inmag != null ? Math.round(inmag * 0.994 * 100) / 100 : null;

  return [
    inmag  != null ? { id:'ar.canuelas.inmag',         label:'INMAG',        valor:inmag,  unidad:'ARS/kg vivo', desc:'Índice Novillo MAG · referencia novillos especiales', variacionSemanal:varS, fecha } : null,
    arrend != null ? { id:'ar.canuelas.arrendamiento', label:'Arrendamiento', valor:arrend, unidad:'ARS/ha/año',  desc:'Equivalente hacienda para arrendamientos',             variacionSemanal:null, fecha } : null,
  ].filter(Boolean);
}

// ── Handler principal ─────────────────────────────────────────────────────────
export default async function handler(req) {
  const headers = {
    'Content-Type':                'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control':               's-maxage=3600, stale-while-revalidate=7200',
  };

  try {
    // /precios es el crítico — lo hacemos primero y solo
    // Los demás son secundarios y no deben interferir si /precios falla
    const preciosData = await fetchJSON(`${BASE}/precios`);

    const fecha      = preciosData.fecha ?? preciosData.date ?? new Date().toISOString().split('T')[0] + 'T00:00:00-03:00';
    const indices    = construirIndices(preciosData, fecha);
    const categorias = normalizarCategorias(preciosData, fecha);
    const grupos     = construirGrupos(categorias);

    if (!categorias.length && !indices.length) {
      throw new Error('ESTRUCTURA_CRUDA: ' + JSON.stringify(preciosData).slice(0, 600));
    }

    // Secundarios en paralelo — todos opcionales, no bloquean si fallan
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

    const rematesHoy = rematesHoyRes.status === 'fulfilled'
      ? (Array.isArray(rematesHoyRes.value?.data) ? rematesHoyRes.value.data : [])
      : [];

    const rematesProximos = rematesProxRes.status === 'fulfilled'
      ? (Array.isArray(rematesProxRes.value?.data) ? rematesProxRes.value.data : [])
      : [];

    let historico = null;
    if (historicoRes.status === 'fulfilled') {
      const hd     = historicoRes.value;
      const series = Array.isArray(hd?.series) ? hd.series : [];
      if (series.length > 0) {
        const vals = series.map(s => s.valor ?? s.inmag ?? s.precio ?? s.current ?? 0).filter(v => v > 0);
        historico = {
          series,
          stats: hd?.stats ?? (vals.length ? {
            min: Math.min(...vals),
            max: Math.max(...vals),
            avg: vals.reduce((a, b) => a + b, 0) / vals.length,
          } : null),
        };
      }
    }

    return new Response(JSON.stringify({
      ok:             true,
      fuente:         'consignatarias.com.ar · API pública · INMAG',
      fecha,
      indices,
      grupos,
      categorias,
      totalCabezas:   null,
      stats,
      rematesHoy,
      rematesProximos,
      historico,
    }), { status:200, headers });

  } catch (err) {
    console.error('[api/hacienda]', err.message);
    return new Response(JSON.stringify({ ok:false, error:err.message }), { status:503, headers });
  }
}

const BASE = 'https://www.consignatarias.com.ar/api';

// Mapeo de keys de categories al formato interno de grupos
// La API devuelve un objeto { "novillos_esp": {...}, "novillitos_esp": {...}, ... }
// Las keys exactas son desconocidas, así que usamos heurísticas sobre el key string.
const GRUPO_MAP = [
  { match: k => /novillo/i.test(k) && !/novillito/i.test(k),  grupo: 'novillos',    nombre: k => formatNombre(k) },
  { match: k => /novillito/i.test(k),                          grupo: 'novillitos',  nombre: k => formatNombre(k) },
  { match: k => /vaquillon/i.test(k),                          grupo: 'vaquillonas', nombre: k => formatNombre(k) },
  { match: k => /vaca/i.test(k),                               grupo: 'vacas',       nombre: k => formatNombre(k) },
  { match: k => /toro/i.test(k),                               grupo: 'toros',       nombre: k => formatNombre(k) },
  { match: k => /mej/i.test(k),                                grupo: 'mejores',     nombre: k => formatNombre(k) },
];

const ORDEN_GRUPOS = ['novillos', 'novillitos', 'vaquillonas', 'vacas', 'toros', 'mejores'];
const GRUPO_LABELS = { novillos:'Novillos', novillitos:'Novillitos', vaquillonas:'Vaquillonas', vacas:'Vacas', toros:'Toros', mejores:'Mejores' };

function formatNombre(key) {
  // "novillos_esp_pesados" → "Novillos Esp. Pesados"
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/\bEsp\b/gi, 'Esp.')
    .replace(/\bReg\b/gi,  'Reg.');
}

// ── Fetch con timeout ─────────────────────────────────────────────────────────
async function fetchJSON(url, timeoutMs = 12000) {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'Accept': 'application/json', 'User-Agent': 'RadarAgro/2.0' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} en ${url}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// ── Normalizar categorías desde /api/precios ──────────────────────────────────
// Respuesta real: { inmag: { current, prev, change }, categories: { [key]: { current, prev, change } } }
function normalizarCategorias(preciosData, fecha) {
  // La API devuelve categories como objeto, no array
  const rawCategories = preciosData.categories ?? {};

  return Object.entries(rawCategories).map(([key, val], i) => {
    const mapeo = GRUPO_MAP.find(m => m.match(key));
    const grupo  = mapeo?.grupo || 'novillos';
    const nombre = mapeo ? mapeo.nombre(key) : formatNombre(key);

    return {
      id:       `${grupo}.${i}`,
      nombreRaw: key,
      nombre,
      grupo,
      minimo:   null,
      maximo:   null,
      promedio: val.current ?? 0,
      mediana:  null,
      cabezas:  0,
      kgProm:   null,
      variacion: val.change ?? null,
      anterior:  val.prev   ?? null,
      unidad:   'ARS/kg vivo',
      fecha,
    };
  }).filter(cat => cat.promedio > 0);
}

// ── Construir grupos desde categorías normalizadas ────────────────────────────
function construirGrupos(categorias) {
  const gruposMap = {};
  for (const cat of categorias) {
    if (!gruposMap[cat.grupo]) gruposMap[cat.grupo] = [];
    gruposMap[cat.grupo].push(cat);
  }
  return ORDEN_GRUPOS.filter(g => gruposMap[g]?.length)
    .map(g => ({ id:g, label:GRUPO_LABELS[g], items:gruposMap[g] }));
}

// ── Construir índices desde respuesta de precios ──────────────────────────────
// Respuesta real: { inmag: { current, prev, change }, ... }
function construirIndices(preciosData, fecha) {
  const inmagRaw = preciosData.inmag ?? null;
  const inmag    = inmagRaw?.current ?? null;
  const varS     = inmagRaw?.change  ?? null;
  const arrend   = inmag != null ? Math.round(inmag * 0.994 * 100) / 100 : null;

  return [
    inmag  != null ? { id:'ar.canuelas.inmag',         label:'INMAG',        valor:inmag,  unidad:'ARS/kg vivo', desc:'Índice Novillo MAG · referencia novillos especiales', variacionSemanal:varS, fecha } : null,
    arrend != null ? { id:'ar.canuelas.arrendamiento', label:'Arrendamiento', valor:arrend, unidad:'ARS/ha/año',  desc:'Equivalente hacienda para arrendamientos',             variacionSemanal:null, fecha } : null,
  ].filter(Boolean);
}

// ── Handler principal ─────────────────────────────────────────────────────────
export default async function handler(req) {
  const headers = {
    'Content-Type':                'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control':               's-maxage=1800, stale-while-revalidate=3600',
  };

  try {
    // Lanzar todas las calls en paralelo
    // Nota: /api/market/history sí existe (ver link de descarga en la página de INMAG)
    const [preciosRes, statsRes, rematesHoyRes, rematesProxRes, historicoRes] = await Promise.allSettled([
      fetchJSON(`${BASE}/precios`),
      fetchJSON(`${BASE}/remates/stats`),
      fetchJSON(`${BASE}/remates/hoy`),
      fetchJSON(`${BASE}/remates/proximos?dias=7`),
      fetchJSON(`${BASE}/market/history?days=30`),
    ]);

    // ── Precios y categorías ─────────────────────────────────────────────────
    if (preciosRes.status === 'rejected') {
      throw new Error('No se pudo obtener precios: ' + preciosRes.reason?.message);
    }
    // La respuesta de /precios NO tiene wrapper .data, viene directo
    const preciosData = preciosRes.value;

    // Fecha del mercado
    const fecha = preciosData.fecha ?? preciosData.date ?? new Date().toISOString().split('T')[0] + 'T00:00:00-03:00';

    // Índices
    const indices = construirIndices(preciosData, fecha);

    // Categorías y grupos
    const categorias = normalizarCategorias(preciosData, fecha);
    const grupos     = construirGrupos(categorias);

    // ── Stats de remates ─────────────────────────────────────────────────────
    // Respuesta real: { success, data: { resumen: {...}, porProvincia: [...] } }
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

    // ── Remates de hoy ───────────────────────────────────────────────────────
    // Respuesta real: { success, data: [...], count, timestamp }
    let rematesHoy = [];
    if (rematesHoyRes.status === 'fulfilled') {
      const rhd = rematesHoyRes.value?.data;
      rematesHoy = Array.isArray(rhd) ? rhd : [];
    }

    // ── Remates próximos ─────────────────────────────────────────────────────
    // Respuesta real: { success, data: [...], count, timestamp }
    let rematesProximos = [];
    if (rematesProxRes.status === 'fulfilled') {
      const rpd = rematesProxRes.value?.data;
      rematesProximos = Array.isArray(rpd) ? rpd : [];
    }

    // ── Histórico INMAG ──────────────────────────────────────────────────────
    // Respuesta real: { series: [...], stats: { min, max, avg, vwap } }
    let historico = null;
    if (historicoRes.status === 'fulfilled') {
      const hd     = historicoRes.value;
      const series = Array.isArray(hd?.series) ? hd.series : [];
      const statsH = hd?.stats ?? null;

      if (series.length > 0) {
        const vals = series.map(s => s.valor ?? s.inmag ?? s.precio ?? s.current ?? 0).filter(v => v > 0);
        historico = {
          series,
          stats: statsH ?? (vals.length ? {
            min: Math.min(...vals),
            max: Math.max(...vals),
            avg: vals.reduce((a, b) => a + b, 0) / vals.length,
          } : null),
        };
      }
    }

    if (!categorias.length && !indices.length) {
      // Debug: devolver la respuesta cruda para ver la estructura real
      throw new Error('ESTRUCTURA_CRUDA: ' + JSON.stringify(preciosData).slice(0, 500));
    }

    return new Response(JSON.stringify({
      ok:             true,
      fuente:         'consignatarias.com.ar · API pública · INMAG',
      fecha,
      indices,
      grupos,
      categorias,
      totalCabezas:   null,
      stats,
      rematesHoy,
      rematesProximos,
      historico,
    }), { status:200, headers });

  } catch (err) {
    console.error('[api/hacienda]', err.message);
    return new Response(JSON.stringify({ ok:false, error:err.message }), { status:503, headers });
  }
}
