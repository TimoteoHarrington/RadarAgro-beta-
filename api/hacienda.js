// api/hacienda.js — Vercel Edge Function
// Fuente: consignatarias.com.ar API pública
// Docs: https://www.consignatarias.com.ar/api-docs
// OpenAPI: https://www.consignatarias.com.ar/openapi.json
// Base: https://www.consignatarias.com.ar/api
//
// Esquema real de /api/precios (según OpenAPI spec):
//   { inmag: { current, prev, change }, categories: { [key]: { current, prev, change } } }
//
// Esquema real de /api/remates/hoy y /api/remates/proximos:
//   { success, data: [...remates], count, timestamp }
//
// Esquema real de /api/remates/stats:
//   { success, data: { resumen: { totalRemates, rematesHoy, rematesProximos7dias, ... } } }
//
// Esquema real de /api/market/history:
//   { series: [...], stats: { min, max, avg, vwap } }

export const config = { runtime: 'edge' };

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
