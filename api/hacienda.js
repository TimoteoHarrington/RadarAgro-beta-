// api/hacienda.js — Vercel Edge Function
// Fuente: consignatarias.com.ar API pública

export const config = { runtime: 'edge' };

const BASE = 'https://www.consignatarias.com.ar/api';

const HEADERS_REQ = {
  'Accept':          'application/json',
  'Accept-Language': 'es-AR,es;q=0.9',
  'User-Agent':      'Mozilla/5.0 (compatible; RadarAgro/2.0; +https://radaragro.vercel.app)',
  'Referer':         'https://www.consignatarias.com.ar/mercado',
  'Origin':          'https://www.consignatarias.com.ar',
};

async function fetchAPI(path, timeoutMs = 12000, retries = 2) {
  const url = `${BASE}${path}`;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: ctrl.signal, headers: HEADERS_REQ });
      if (res.status === 429 && attempt < retries) {
        const retryAfter = parseInt(res.headers.get('retry-after') || '0', 10);
        const waitMs     = retryAfter > 0 ? retryAfter * 1000 : (2 ** attempt) * 1500;
        await new Promise(r => setTimeout(r, waitMs));
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    } finally {
      clearTimeout(timer);
    }
  }
}

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

function normalizarCategorias(raw, fecha) {
  const lista = raw.categorias || raw.data?.categorias || raw.precios || raw.data?.precios || [];
  return lista.map((cat, i) => {
    const nombreRaw = cat.nombre || cat.name || '';
    const mapeo     = CATEGORIA_MAP.find(m => m.match(nombreRaw));
    const grupo     = mapeo?.grupo || 'novillos';
    return {
      id:       `${grupo}.${i}`,
      nombreRaw,
      nombre:   mapeo?.nombre || nombreRaw,
      grupo,
      minimo:   cat.minimo   ?? cat.min    ?? null,
      maximo:   cat.maximo   ?? cat.max    ?? null,
      promedio: cat.promedio ?? cat.avg    ?? cat.precio ?? 0,
      mediana:  cat.mediana  ?? cat.median ?? null,
      cabezas:  cat.cabezas  ?? cat.heads  ?? 0,
      kgProm:   cat.kgProm   ?? cat.kg     ?? null,
      unidad:   'ARS/kg vivo',
      fecha,
    };
  }).filter(c => c.promedio > 0);
}

function construirGrupos(categorias) {
  const map = {};
  for (const c of categorias) {
    if (!map[c.grupo]) map[c.grupo] = [];
    map[c.grupo].push(c);
  }
  return ORDEN_GRUPOS.filter(g => map[g]?.length)
    .map(g => ({ id:g, label:GRUPO_LABELS[g], items:map[g] }));
}

function construirIndices(raw, fecha) {
  const d     = raw.data || raw;
  const inmag = d.inmag ?? d.INMAG ?? null;
  const igmag = d.igmag ?? d.IGMAG ?? null;
  const arrend = inmag != null ? Math.round(inmag * 0.994 * 100) / 100 : null;
  const varS   = d.variacionSemanal ?? d.weeklyChange ?? null;
  return [
    inmag  != null ? { id:'ar.canuelas.inmag',         label:'INMAG',        valor:inmag,  unidad:'ARS/kg vivo', desc:'Índice Novillo MAG · novillos especiales', variacionSemanal:varS, fecha } : null,
    igmag  != null ? { id:'ar.canuelas.igmag',         label:'IGMAG',        valor:igmag,  unidad:'ARS/kg vivo', desc:'Índice General MAG · promedio ponderado',  variacionSemanal:null, fecha } : null,
    arrend != null ? { id:'ar.canuelas.arrendamiento', label:'Arrendamiento', valor:arrend, unidad:'ARS/ha/año',  desc:'Equivalente hacienda para arrendamientos', variacionSemanal:null, fecha } : null,
  ].filter(Boolean);
}

export default async function handler(req) {
  const headers = {
    'Content-Type':                'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200',
  };

  try {
    const preciosRaw = await fetchAPI('/precios', 15000, 3);
    const preciosD   = preciosRaw?.data || preciosRaw;
    const fecha      = preciosD.fecha || preciosD.date || new Date().toISOString().split('T')[0] + 'T00:00:00-03:00';
    const indices    = construirIndices(preciosD, fecha);
    const categorias = normalizarCategorias(preciosD, fecha);
    const grupos     = construirGrupos(categorias);
    const totalCabezas = preciosD.totalCabezas ?? preciosD.cabezasTotal
      ?? (categorias.reduce((s, c) => s + (c.cabezas || 0), 0) || null);

    if (!categorias.length && !indices.length) {
      throw new Error('La API devolvió datos vacíos en /api/precios');
    }

    const delay = ms => new Promise(r => setTimeout(r, ms));

    // COMENTADO: Endpoints de remates con problemas
    const [statsRes, historicoRes] = await Promise.allSettled([
      fetchAPI('/remates/stats',        8000, 1),
      // (await delay(300), fetchAPI('/remates/hoy', 8000, 1)), 
      (await delay(600), fetchAPI('/market/history?days=30', 8000, 1)),
    ]);

    let stats = null;
    if (statsRes.status === 'fulfilled') {
      const sd = statsRes.value?.data?.resumen || statsRes.value?.resumen || statsRes.value?.data || {};
      stats = {
        totalRemates:          sd.totalRemates          ?? null,
        rematesHoy:            sd.rematesHoy            ?? null,
        rematesProximos7dias:  sd.rematesProximos7dias  ?? null,
        provinciasActivas:     sd.provinciasActivas     ?? null,
        consignatariasActivas: sd.consignatariasActivas ?? null,
      };
    }

    // Retornamos arreglos vacíos para remates para evitar roturas en el front
    let rematesHoy = [];
    let rematesProximos = [];

    let historico = null;
    if (historicoRes.status === 'fulfilled') {
      const hd     = historicoRes.value?.data || historicoRes.value;
      const series = Array.isArray(hd) ? hd : (hd?.series || hd?.data || []);
      const statsH = hd?.stats || hd?.estadisticas || null;
      if (series.length > 0) {
        const vals = series.map(s => s.valor ?? s.inmag ?? 0).filter(v => v > 0);
        historico = {
          series,
          stats: statsH || (vals.length ? {
            min: Math.min(...vals),
            max: Math.max(...vals),
            avg: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
          } : null),
        };
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      fuente: 'consignatarias.com.ar · API pública · INMAG',
      fecha,
      indices,
      grupos,
      categorias,
      totalCabezas,
      stats,
      rematesHoy,
      rematesProximos,
      historico,
    }), { status: 200, headers });

  } catch (err) {
    console.error('[api/hacienda]', err.message);
    const is429 = err.message?.includes('429');
    return new Response(JSON.stringify({
      ok:    false,
      error: err.message,
      hint:  is429 ? 'Rate limit alcanzado. Reintentando en breve.' : undefined,
    }), { status: 503, headers });
  }
}