// api/hacienda.js — Vercel Serverless Function (Node.js)
// Fuente: consignatarias.com.ar API pública
//
// Estructura real de /api/precios:
// { success, data: { precios: [{categoria, precio_kg, moneda, variacion_semanal}], indice_inmag: {valor, unidad, variacion_semanal}, fuente, fecha_actualizacion }, timestamp }

const BASE = 'https://www.consignatarias.com.ar/api';

const GRUPO_MAP = [
  { match: k => /novillo/i.test(k) && !/novillito/i.test(k),  grupo: 'novillos'    },
  { match: k => /novillito/i.test(k),                          grupo: 'novillitos'  },
  { match: k => /vaquillon/i.test(k),                          grupo: 'vaquillonas' },
  { match: k => /vaca/i.test(k),                               grupo: 'vacas'       },
  { match: k => /toro/i.test(k),                               grupo: 'toros'       },
  { match: k => /ternero/i.test(k),                            grupo: 'terneros'    },
];

const ORDEN_GRUPOS = ['novillos', 'novillitos', 'vaquillonas', 'vacas', 'toros', 'terneros'];
const GRUPO_LABELS = { novillos:'Novillos', novillitos:'Novillitos', vaquillonas:'Vaquillonas', vacas:'Vacas', toros:'Toros', terneros:'Terneros' };

function parseVariacion(str) {
  if (!str) return null;
  const n = parseFloat(str.replace('%', '').replace(',', '.'));
  return isNaN(n) ? null : n;
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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  // Datos de hacienda se publican 1 vez por día hábil
  res.setHeader('Cache-Control', 's-maxage=14400, stale-while-revalidate=86400');

  try {
    let preciosRaw;
    try {
      preciosRaw = await fetchJSON(`${BASE}/precios`);
    } catch (err) {
      const status = err.status === 429 ? 429 : 503;
      return res.status(status).json({ ok: false, error: err.message });
    }

    const d     = preciosRaw.data ?? {};
    const lista = Array.isArray(d.precios) ? d.precios : [];
    const inmag = d.indice_inmag ?? null;
    const fecha = d.fecha_actualizacion ?? new Date().toISOString().split('T')[0];

    // ── Categorías ────────────────────────────────────────────────────────────
    const categorias = lista.map((item, i) => {
      const cat   = item.categoria ?? '';
      const mapeo = GRUPO_MAP.find(m => m.match(cat));
      const grupo = mapeo?.grupo || cat;
      return {
        id:        `${grupo}.${i}`,
        nombreRaw:  cat,
        nombre:     cat.charAt(0).toUpperCase() + cat.slice(1),
        grupo,
        minimo:    null,
        maximo:    null,
        promedio:  item.precio_kg ?? 0,
        mediana:   null,
        cabezas:   0,
        kgProm:    null,
        variacion: parseVariacion(item.variacion_semanal),
        anterior:  null,
        unidad:    'ARS/kg vivo',
        fecha,
      };
    }).filter(c => c.promedio > 0);

    // ── Grupos ────────────────────────────────────────────────────────────────
    const map = {};
    for (const cat of categorias) {
      if (!map[cat.grupo]) map[cat.grupo] = [];
      map[cat.grupo].push(cat);
    }
    const grupos = ORDEN_GRUPOS.filter(g => map[g]?.length).map(g => ({ id: g, label: GRUPO_LABELS[g] ?? g, items: map[g] }));

    // ── Índices ───────────────────────────────────────────────────────────────
    const inmagValor  = inmag?.valor ?? null;
    const inmagVar    = parseVariacion(inmag?.variacion_semanal);
    const arrend      = inmagValor != null ? Math.round(inmagValor * 0.994 * 100) / 100 : null;

    const indices = [
      inmagValor != null ? { id: 'ar.mag.inmag',         label: 'INMAG',        valor: inmagValor, unidad: 'ARS/kg vivo', desc: 'Índice Novillo Mercado Agroganadero', variacionSemanal: inmagVar, fecha } : null,
      arrend     != null ? { id: 'ar.mag.arrendamiento', label: 'Arrendamiento', valor: arrend,     unidad: 'ARS/ha/año',  desc: 'Equivalente hacienda para arrendamientos', variacionSemanal: null, fecha } : null,
    ].filter(Boolean);

    if (!categorias.length && !indices.length) {
      return res.status(502).json({ ok: false, error: 'sin_datos', raw: preciosRaw });
    }

    // ── Secundarios (opcionales) ──────────────────────────────────────────────
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
      fuente:          d.fuente ?? 'consignatarias.com.ar · INMAG',
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
