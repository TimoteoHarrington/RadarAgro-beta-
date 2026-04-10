// api/hacienda.js — Vercel Serverless Function
// Indicadores económicos ganadería bovina — MAGyP / SIO Carnes
// Fuente: datos.gob.ar CKAN · dataset: ganaderia-indicadores-economicos-bovinos
// Devuelve: precios por categoría + histórico 90 días con fechas reales

const CKAN_BASE  = 'https://datos.gob.ar/api/3/action/datastore_search';
const DATASET_ID = 'ganaderia-indicadores-economicos-bovinos';

async function fetchJSON(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal:  controller.signal,
      headers: { 'User-Agent': 'RadarAgro/1.0', 'Accept': 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally { clearTimeout(timer); }
}

async function getResourceId() {
  const data = await fetchJSON(`https://datos.gob.ar/api/3/action/package_show?id=${DATASET_ID}`);
  if (!data?.success) throw new Error('Package not found');
  const resources = data.result?.resources ?? [];
  const pref =
    resources.find(r => (r.name ?? '').toLowerCase().includes('precio') || (r.name ?? '').toLowerCase().includes('indicador')) ??
    resources[0];
  if (!pref) throw new Error('Sin recursos en el dataset');
  return pref.id;
}

async function fetchRecords(resourceId, limit = 500) {
  const data = await fetchJSON(`${CKAN_BASE}?resource_id=${resourceId}&limit=${limit}&sort=fecha%20desc`);
  if (!data?.success) throw new Error('CKAN sin éxito');
  return data.result?.records ?? [];
}

const CATEGORIAS = [
  ['insc',          ['indice_novillo', 'insc', 'novillo_insc', 'indice']],
  ['novillo',       ['novillo', 'novillo_500_kg', 'nov_500']],
  ['novillito',     ['novillito', 'novillito_390', 'nov_390']],
  ['ternero',       ['ternero', 'ternero_160_kg', 'ternero_160', 'ternero_destete']],
  ['vaca_conserva', ['vaca_conserva', 'vaca_conserv', 'vacas_conserva']],
  ['vaquillona',    ['vaquillona', 'vaquillona_360_kg', 'vaq_360']],
  ['toro',          ['toro', 'toros']],
];

function detectarColumnas(record) {
  const keys = Object.keys(record).map(k => k.toLowerCase());
  const mapa = {};
  for (const [out, candidatos] of CATEGORIAS) {
    for (const cand of candidatos) {
      const match = keys.find(k => k.includes(cand));
      if (match) {
        const orig = Object.keys(record).find(k => k.toLowerCase() === match);
        mapa[out] = orig;
        break;
      }
    }
  }
  return mapa;
}

function extraerFecha(record) {
  for (const key of Object.keys(record)) {
    if (['fecha', 'date'].includes(key.toLowerCase()) || key.toLowerCase().includes('fecha'))
      return record[key];
  }
  return null;
}

function varPct(a, b) {
  if (!b || b === 0) return null;
  return Math.round(((a - b) / b) * 1000) / 10;
}

function buildSerie(sorted, col, maxRows = 90) {
  return sorted
    .slice(0, maxRows)
    .reverse()
    .map(r => {
      const v = parseFloat(r[col]);
      const f = extraerFecha(r);
      return (isNaN(v) || !f) ? null : { fecha: f, valor: Math.round(v) };
    })
    .filter(Boolean);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=14400, stale-while-revalidate=28800');

  try {
    const resourceId = await getResourceId();
    const records    = await fetchRecords(resourceId, 500);
    if (!records.length) throw new Error('Sin registros de hacienda');

    const sorted = records.sort((a, b) => {
      const fa = extraerFecha(a) ?? '';
      const fb = extraerFecha(b) ?? '';
      return fb.localeCompare(fa);
    });

    const ultimo    = sorted[0];
    const penultimo = sorted[1]  ?? null;
    const hace7     = sorted[4]  ?? null;
    const hace30    = sorted[20] ?? null;

    const cols       = detectarColumnas(ultimo);
    const fechaUltimo = extraerFecha(ultimo);

    const precios = {};
    for (const [clave, col] of Object.entries(cols)) {
      if (!col) continue;
      const val   = parseFloat(ultimo[col]);
      const val1  = penultimo ? parseFloat(penultimo[col])  : null;
      const val7  = hace7     ? parseFloat(hace7[col])      : null;
      const val30 = hace30    ? parseFloat(hace30[col])     : null;
      if (isNaN(val)) continue;
      precios[clave] = {
        valor:     Math.round(val * 10) / 10,
        varDia:    (val1  && !isNaN(val1))  ? varPct(val, val1)  : null,
        varSemana: (val7  && !isNaN(val7))  ? varPct(val, val7)  : null,
        varMes:    (val30 && !isNaN(val30)) ? varPct(val, val30) : null,
        unidad:    clave === 'insc' ? 'ARS/kg (índice)' : 'ARS/kg vivo',
      };
    }

    const historico = {};
    for (const [clave, col] of Object.entries(cols)) {
      if (!col) continue;
      const serie = buildSerie(sorted, col, 90);
      if (serie.length >= 2) historico[clave] = serie;
    }

    return res.status(200).json({
      ok:        true,
      fuente:    'MAGyP · SIO Carnes · datos.gob.ar',
      dataset:   DATASET_ID,
      resource:  resourceId,
      fecha:     fechaUltimo,
      precios,
      historico,
      camposDisponibles: Object.keys(ultimo).filter(k => !k.startsWith('_')),
    });

  } catch (err) {
    console.error('[api/hacienda] Error:', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
