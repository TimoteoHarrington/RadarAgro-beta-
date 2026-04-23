// api/hacienda.js — Vercel Edge Function
// Fuente: consignatarias.com.ar API pública
// Docs: https://www.consignatarias.com.ar/api-docs
// Base: https://www.consignatarias.com.ar/api

export const config = { runtime: 'edge' };

const BASE = 'https://www.consignatarias.com.ar/api';

// Mapeo de respuesta de precios al formato interno (grupos de categorías)
const CATEGORIA_MAP = [
  { match: s => /NOVILLO/i.test(s) && !/NOVILLITO/i.test(s) && /Mest.*EyB/i.test(s),    grupo: 'novillos',    nombre: 'Novillos Esp.' },
  { match: s => /NOVILLO/i.test(s) && !/NOVILLITO/i.test(s) && /Regular.*Liv/i.test(s), grupo: 'novillos',    nombre: 'Novillos Reg. Livianos' },
  { match: s => /NOVILLO/i.test(s) && !/NOVILLITO/i.test(s) && /Regular.*Pes/i.test(s), grupo: 'novillos',    nombre: 'Novillos Reg. Pesados' },
  { match: s => /NOVILLO/i.test(s) && !/NOVILLITO/i.test(s) && /Overos/i.test(s),       grupo: 'novillos',    nombre: 'Novillos Overos' },
  { match: s => /NOVILLITO/i.test(s) && /EyB.*M\./i.test(s),                            grupo: 'novillitos',  nombre: 'Novillitos Esp. Medianos' },
  { match: s => /NOVILLITO/i.test(s) && /EyB.*P\./i.test(s),                            grupo: 'novillitos',  nombre: 'Novillitos Esp. Pesados' },
  { match: s => /NOVILLITO/i.test(s) && /Regular/i.test(s),                             grupo: 'novillitos',  nombre: 'Novillitos Regulares' },
  { match: s => /VAQUILLONA/i.test(s) && /EyB.*M\./i.test(s),                           grupo: 'vaquillonas', nombre: 'Vaquillonas Esp. Medianas' },
  { match: s => /VAQUILLONA/i.test(s) && /EyB.*P\./i.test(s),                           grupo: 'vaquillonas', nombre: 'Vaquillonas Esp. Pesadas' },
  { match: s => /VAQUILLONA/i.test(s) && /Regular/i.test(s),                            grupo: 'vaquillonas', nombre: 'Vaquillonas Regulares' },
  { match: s => /VACA/i.test(s) && /Buen/i.test(s) && !/Conserva/i.test(s),            grupo: 'vacas',       nombre: 'Vacas Buenas' },
  { match: s => /VACA/i.test(s) && /Regular/i.test(s),                                 grupo: 'vacas',       nombre: 'Vacas Regulares' },
  { match: s => /VACA/i.test(s) && /Conserva.*Buen/i.test(s),                          grupo: 'vacas',       nombre: 'Vacas Conserva Buena' },
  { match: s => /VACA/i.test(s) && /Conserva.*Inf/i.test(s),                           grupo: 'vacas',       nombre: 'Vacas Conserva Inferior' },
  { match: s => /TORO/i.test(s) && /Buen/i.test(s),                                    grupo: 'toros',       nombre: 'Toros Buenos' },
  { match: s => /TORO/i.test(s) && /Regular/i.test(s),                                 grupo: 'toros',       nombre: 'Toros Regulares' },
  { match: s => /\bMEJ\b/i.test(s) && /EyB/i.test(s),                                 grupo: 'mejores',     nombre: 'MEJ EyB' },
  { match: s => /\bMEJ\b/i.test(s) && /Regular/i.test(s),                              grupo: 'mejores',     nombre: 'MEJ Regulares' },
];

const ORDEN_GRUPOS = ['novillos', 'novillitos', 'vaquillonas', 'vacas', 'toros', 'mejores'];
const GRUPO_LABELS = { novillos:'Novillos', novillitos:'Novillitos', vaquillonas:'Vaquillonas', vacas:'Vacas', toros:'Toros', mejores:'Mejores' };

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
// La respuesta tiene { inmag, igmag, categorias: [{nombre, minimo, maximo, promedio, mediana, cabezas, kgProm}] }
function normalizarCategorias(preciosData, fecha) {
  const rawCategorias = preciosData.categorias || preciosData.data?.categorias || [];

  return rawCategorias.map((cat, i) => {
    const nombreRaw = cat.nombre || cat.name || '';
    const mapeo     = CATEGORIA_MAP.find(m => m.match(nombreRaw));
    const grupo     = mapeo?.grupo || 'novillos';
    const nombre    = mapeo?.nombre || nombreRaw;

    return {
      id:        `${grupo}.${i}`,
      nombreRaw,
      nombre,
      grupo,
      minimo:    cat.minimo   ?? cat.min    ?? null,
      maximo:    cat.maximo   ?? cat.max    ?? null,
      promedio:  cat.promedio ?? cat.avg    ?? cat.precio ?? 0,
      mediana:   cat.mediana  ?? cat.median ?? null,
      cabezas:   cat.cabezas  ?? cat.heads  ?? 0,
      kgProm:    cat.kgProm   ?? cat.kg     ?? null,
      unidad:    'ARS/kg vivo',
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
function construirIndices(preciosData, fecha) {
  const raw  = preciosData.data || preciosData;
  const varS = raw.variacionSemanal ?? raw.weeklyChange ?? null;

  const inmag  = raw.inmag  ?? raw.INMAG  ?? null;
  const igmag  = raw.igmag  ?? raw.IGMAG  ?? null;
  const arrend = inmag != null ? Math.round(inmag * 0.994 * 100) / 100 : null;

  return [
    inmag  != null ? { id:'ar.canuelas.inmag',         label:'INMAG',         valor:inmag,  unidad:'ARS/kg vivo', desc:'Índice Novillo MAG · referencia novillos especiales', variacionSemanal:varS, fecha } : null,
    igmag  != null ? { id:'ar.canuelas.igmag',         label:'IGMAG',         valor:igmag,  unidad:'ARS/kg vivo', desc:'Índice General MAG · promedio ponderado del mercado', variacionSemanal:null, fecha } : null,
    arrend != null ? { id:'ar.canuelas.arrendamiento', label:'Arrendamiento',  valor:arrend, unidad:'ARS/ha/año',  desc:'Equivalente hacienda para arrendamientos',             variacionSemanal:null, fecha } : null,
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
    const preciosData = preciosRes.value?.data || preciosRes.value;

    // Fecha del mercado
    const fecha = preciosData.fecha || preciosData.date || new Date().toISOString().split('T')[0] + 'T00:00:00-03:00';

    // Índices
    const indices = construirIndices(preciosData, fecha);

    // Categorías y grupos
    const categorias = normalizarCategorias(preciosData, fecha);
    const grupos     = construirGrupos(categorias);

    // Total cabezas
    const totalCabezas = preciosData.totalCabezas ?? preciosData.cabezasTotal ??
      (categorias.reduce((s, c) => s + (c.cabezas || 0), 0) || null);

    // ── Stats de remates ─────────────────────────────────────────────────────
    let stats = null;
    if (statsRes.status === 'fulfilled') {
      const sd = statsRes.value?.data?.resumen || statsRes.value?.resumen || statsRes.value?.data || {};
      stats = {
        totalRemates:         sd.totalRemates          ?? null,
        rematesHoy:           sd.rematesHoy            ?? null,
        rematesProximos7dias: sd.rematesProximos7dias  ?? null,
        provinciasActivas:    sd.provinciasActivas      ?? null,
        consignatariasActivas:sd.consignatariasActivas  ?? null,
      };
    }

    // ── Remates de hoy ───────────────────────────────────────────────────────
    let rematesHoy = [];
    if (rematesHoyRes.status === 'fulfilled') {
      const rhd = rematesHoyRes.value?.data || rematesHoyRes.value;
      rematesHoy = Array.isArray(rhd) ? rhd : (rhd?.remates || rhd?.items || []);
    }

    // ── Remates próximos ─────────────────────────────────────────────────────
    let rematesProximos = [];
    if (rematesProxRes.status === 'fulfilled') {
      const rpd = rematesProxRes.value?.data || rematesProxRes.value;
      rematesProximos = Array.isArray(rpd) ? rpd : (rpd?.remates || rpd?.items || []);
    }

    // ── Histórico INMAG ──────────────────────────────────────────────────────
    let historico = null;
    if (historicoRes.status === 'fulfilled') {
      const hd = historicoRes.value?.data || historicoRes.value;
      const series = Array.isArray(hd) ? hd : (hd?.series || hd?.data || []);
      const statsH = hd?.stats || hd?.estadisticas || null;

      if (series.length > 0) {
        const vals = series.map(s => s.valor ?? s.inmag ?? s.precio ?? 0).filter(v => v > 0);
        historico = {
          series,
          stats: statsH || (vals.length ? {
            min:  Math.min(...vals),
            max:  Math.max(...vals),
            avg:  vals.reduce((a, b) => a + b, 0) / vals.length,
          } : null),
        };
      }
    }

    // Si no llegaron categorías del endpoint de precios, fallback a respuesta vacía manejable
    if (!categorias.length && !indices.length) {
      throw new Error('La API de consignatarias.com.ar no devolvió precios válidos');
    }

    return new Response(JSON.stringify({
      ok:              true,
      fuente:          'consignatarias.com.ar · API pública · INMAG',
      fecha,
      indices,
      grupos,
      categorias,
      totalCabezas,
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

// Al final de src/data/hacienda.js añade esto:

export const HACIENDA_MOCK_RESPONSE = {
  ok: true,
  fecha: "2026-04-21T12:00:00Z",
  totalCabezas: 7450, // Dato ejemplo del MAG
  indices: HACIENDA_CANUELAS.map(i => ({
    id: i.id,
    nombre: i.nombre,
    valor: i.precio,
    unidad: i.unidad || 'ARS/kg',
    variacionSemanal: i.var1s,
    descripcion: i.descripcion
  })),
  categorias: [
    ...HACIENDA_NOVILLOS.map(c => ({ ...c, grupo: 'novillos' })),
    ...HACIENDA_NOVILLITOS.map(c => ({ ...c, grupo: 'novillitos' })),
    ...HACIENDA_VAQUILLONAS.map(c => ({ ...c, grupo: 'vaquillonas' })),
    ...HACIENDA_VACAS.map(c => ({ ...c, grupo: 'vacas' })),
    ...HACIENDA_TOROS.map(c => ({ ...c, grupo: 'toros' })),
    ...HACIENDA_MEJORES.map(c => ({ ...c, grupo: 'mejores' }))
  ],
  stats: {
    rematesHoy: 2,
    rematesProximos7dias: 14,
    provinciasActivas: 5,
    consignatariasActivas: 12
  }
};