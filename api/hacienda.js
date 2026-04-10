// api/hacienda.js — Vercel Serverless Function
// Indicadores económicos ganadería bovina — MAGyP / SIO Carnes
// Fuente: datos.gob.ar CKAN
//   org:     agroindustria
//   dataset: ganaderia-indicadores-economicos-bovinos
//
// Devuelve: índice novillo (INSC), ternero, vaca conserva, vaquillona
// Unidades: ARS/kg vivo (mayores) o ARS/kg (terneros)
// Actualización: diaria (días hábiles)

const CKAN_BASE    = 'https://datos.gob.ar/api/3/action/datastore_search';
const CKAN_SQL_URL = 'https://datos.gob.ar/api/3/action/datastore_search_sql';

// Dataset oficial MAGyP — Indicadores Económicos Bovinos
// Contiene múltiples series; filtramos por las más relevantes para el productor
const DATASET_ORG = 'agroindustria';
const DATASET_ID  = 'ganaderia-indicadores-economicos-bovinos';

// Intentamos con resource_id conocido; si falla, buscamos en el paquete
// (el resource_id puede cambiar con actualizaciones del dataset)
const KNOWN_RESOURCE_ID = null; // se descubre dinámicamente

async function fetchJSON(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'RadarAgro/1.0',
        'Accept':     'application/json',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// Busca el resource_id del dataset de ganadería bovina
async function getResourceId() {
  const url = `https://datos.gob.ar/api/3/action/package_show?id=${DATASET_ID}`;
  const data = await fetchJSON(url);
  if (!data?.success) throw new Error('Package not found');
  const resources = data.result?.resources ?? [];
  // Preferir resource con "precio" o "bovino" en el nombre
  const pref = resources.find(r =>
    (r.name ?? '').toLowerCase().includes('precio') ||
    (r.name ?? '').toLowerCase().includes('indicador')
  ) ?? resources[0];
  if (!pref) throw new Error('Sin recursos en el dataset');
  return pref.id;
}

// Trae los últimos N registros del recurso
async function fetchRecords(resourceId, limit = 500) {
  const url =
    `${CKAN_BASE}?resource_id=${resourceId}` +
    `&limit=${limit}` +
    `&sort=fecha%20desc`;
  const data = await fetchJSON(url);
  if (!data?.success) throw new Error('CKAN sin éxito');
  return data.result?.records ?? [];
}

// ── Procesamiento de registros ────────────────────────────────
// El dataset puede tener distintos formatos según la versión.
// Buscamos columnas con nombres similares a: indice_novillo, ternero,
// vaca_conserva, vaquillona, etc.

const CATEGORIAS = [
  // [clave_salida, posibles_nombres_columna]
  ['insc',          ['indice_novillo', 'insc', 'novillo_insc', 'indice']],
  ['novillo',       ['novillo', 'novillo_500_kg', 'nov_500']],
  ['ternero',       ['ternero', 'ternero_160_kg', 'ternero_160', 'ternero_destete']],
  ['vaca_conserva', ['vaca_conserva', 'vaca', 'vacas_conserva']],
  ['vaquillona',    ['vaquillona', 'vaquillona_360_kg', 'vaq_360']],
];

function detectarColumnas(record) {
  // Devuelve un mapa { clave_salida: nombre_columna_real }
  const keys = Object.keys(record).map(k => k.toLowerCase());
  const mapa = {};
  for (const [out, candidatos] of CATEGORIAS) {
    for (const cand of candidatos) {
      const match = keys.find(k => k.includes(cand));
      if (match) {
        // Recuperar el nombre original (case-sensitive)
        const orig = Object.keys(record).find(k => k.toLowerCase() === match);
        mapa[out] = orig;
        break;
      }
    }
  }
  return mapa;
}

function extraerFecha(record) {
  // Buscar columna de fecha
  for (const key of Object.keys(record)) {
    const kl = key.toLowerCase();
    if (kl === 'fecha' || kl === 'date' || kl.includes('fecha')) {
      return record[key];
    }
  }
  return null;
}

// Calcula variación porcentual entre último y penúltimo valor
function varPct(ultimo, penultimo) {
  if (!penultimo || penultimo === 0) return null;
  return Math.round(((ultimo - penultimo) / penultimo) * 1000) / 10;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  // Actualización diaria; cache 4h con stale-while-revalidate
  res.setHeader('Cache-Control', 's-maxage=14400, stale-while-revalidate=28800');

  try {
    const resourceId = await getResourceId();
    const records    = await fetchRecords(resourceId, 500);

    if (!records.length) throw new Error('Sin registros de hacienda');

    // Ordenar por fecha desc (la API ya lo hace, pero por si acaso)
    const sorted = records.sort((a, b) => {
      const fa = extraerFecha(a) ?? '';
      const fb = extraerFecha(b) ?? '';
      return fb.localeCompare(fa);
    });

    const ultimo     = sorted[0];
    const penultimo  = sorted[1] ?? null;
    const anteayer   = sorted[6] ?? null; // ~1 semana atrás

    const cols = detectarColumnas(ultimo);
    const fechaUltimo = extraerFecha(ultimo);

    // Construir precios por categoría
    const precios = {};
    for (const [clave, col] of Object.entries(cols)) {
      if (!col) continue;
      const val  = parseFloat(ultimo[col]);
      const val1 = penultimo  ? parseFloat(penultimo[col])  : null;
      const val7 = anteayer   ? parseFloat(anteayer[col])   : null;
      if (isNaN(val)) continue;
      precios[clave] = {
        valor:      Math.round(val * 10) / 10,
        varDia:     val1 && !isNaN(val1) ? varPct(val, val1) : null,
        varSemana:  val7 && !isNaN(val7) ? varPct(val, val7) : null,
        unidad:     clave === 'insc' ? 'ARS/kg (índice)' : 'ARS/kg vivo',
      };
    }

    // Histórico de los últimos 30 días para sparklines
    // (solo para novillo e INSC, los más consultados)
    const hist30 = {};
    for (const clave of ['insc', 'novillo', 'ternero']) {
      const col = cols[clave];
      if (!col) continue;
      hist30[clave] = sorted
        .slice(0, 30)
        .reverse()
        .map(r => {
          const v = parseFloat(r[col]);
          return isNaN(v) ? null : Math.round(v);
        })
        .filter(v => v !== null);
    }

    return res.status(200).json({
      ok:       true,
      fuente:   'MAGyP · SIO Carnes · datos.gob.ar',
      dataset:  DATASET_ID,
      resource: resourceId,
      fecha:    fechaUltimo,
      precios,
      hist30,
    });

  } catch (err) {
    console.error('[api/hacienda] Error:', err.message);

    // Fallback estático — valores de referencia abril 2026
    return res.status(200).json({
      ok:     false,
      error:  err.message,
      fuente: 'MAGyP · fallback estático · abr 2026',
      fecha:  null,
      precios: {
        insc:         { valor: 5650, varDia: null, varSemana: null, unidad: 'ARS/kg (índice)' },
        novillo:      { valor: 5800, varDia: null, varSemana: null, unidad: 'ARS/kg vivo'     },
        ternero:      { valor: 8200, varDia: null, varSemana: null, unidad: 'ARS/kg vivo'     },
        vaca_conserva:{ valor: 4200, varDia: null, varSemana: null, unidad: 'ARS/kg vivo'     },
        vaquillona:   { valor: 5400, varDia: null, varSemana: null, unidad: 'ARS/kg vivo'     },
      },
      hist30: {},
    });
  }
}
