// api/insumos.js — Vercel Edge Function
// Precios de combustibles en surtidor — Secretaría de Energía (Res. 314/2016)
//
// El CKAN datastore de datos.energia.gob.ar devuelve "internal error" desde
// las IPs de Vercel Edge (Cloudflare). La descarga directa del CSV histórico
// sí funciona porque es un archivo estático servido por un CDN distinto.
//
// Estrategia:
//   1. Descarga el CSV histórico (precios-historicos.csv) — siempre disponible
//   2. Por cada combinación empresa+producto, toma solo el registro más reciente
//      → equivale a "precios vigentes" sin depender del datastore roto
//   3. Calcula estadísticas nacionales y zona núcleo agrícola
//
// ⚠️  Corre como Edge Runtime — NO cambiar a Node.js serverless.

export const config = { runtime: 'edge' };

// URL de descarga directa del CSV histórico — NO pasa por el CKAN datastore
const CSV_HISTORICOS =
  'http://datos.energia.gob.ar/dataset/1c181390-5045-475e-94dc-410429be4b17/resource/f8dda0d5-2a9f-4d34-b79b-4e63de3995df/download/precios-historicos.csv';

// Fallback: CKAN datastore vigentes (funciona solo cuando el servidor no bloquea)
const CKAN_VIGENTES =
  'https://datos.energia.gob.ar/api/3/action/datastore_search?resource_id=80ac25de-a44a-4445-9215-090cf55cfda5&limit=32000';

const ZONA_NUCLEO = ['Santa Fe', 'Córdoba', 'Buenos Aires', 'Entre Ríos', 'La Pampa'];

const PRODUCTOS = {
  2:  { label: 'Nafta Súper',   unidad: 'ARS/litro' },
  3:  { label: 'Gasoil G2',     unidad: 'ARS/litro', grado: 2 },
  4:  { label: 'Gasoil G3',     unidad: 'ARS/litro', grado: 3 },
  6:  { label: 'Nafta Premium', unidad: 'ARS/litro' },
  19: { label: 'GNC',           unidad: 'ARS/m3' },
};

const FETCH_HEADERS = {
  'User-Agent':      'RadarAgro/1.0 (https://radaragro.app)',
  'Accept':          '*/*',
  'Accept-Language': 'es-AR,es;q=0.9',
};

// ── CSV parser (soporta campos con comillas) ──────────────────────────────────
function parseCSVLine(line) {
  const result = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuote = !inQuote; }
    else if (ch === ',' && !inQuote) { result.push(cur); cur = ''; }
    else { cur += ch; }
  }
  result.push(cur);
  return result;
}

function parseCSV(text) {
  const lines = text.split('\n');
  if (lines.length < 2) throw new Error('CSV vacío');
  const headers = parseCSVLine(lines[0])
    .map(h => h.trim().toLowerCase().replace(/^\uFEFF/, ''));
  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = parseCSVLine(line);
    const row = {};
    headers.forEach((h, idx) => { row[h] = (cols[idx] ?? '').trim(); });
    records.push(row);
  }
  return records;
}

// ── Parsear fecha argentina "DD/MM/YYYY HH:MM" o ISO ─────────────────────────
function parseDate(str) {
  if (!str) return null;
  const ar = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (ar) return new Date(`${ar[3]}-${ar[2]}-${ar[1]}`);
  const iso = str.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return new Date(iso[1]);
  return null;
}

// ── Estrategia 1: CSV histórico con descarga directa ─────────────────────────
async function fetchViaCSV() {
  const signal = AbortSignal.timeout?.(30000);
  const res = await fetch(CSV_HISTORICOS, { signal, headers: FETCH_HEADERS });
  if (!res.ok) throw new Error(`CSV HTTP ${res.status}`);
  const text = await res.text();
  const all = parseCSV(text);
  if (all.length === 0) throw new Error('CSV sin filas');

  // Por cada empresa+producto+provincia, quedarnos con el registro más reciente
  const latest = new Map();
  for (const row of all) {
    const idProd = parseInt(row['idproducto'] ?? row['id_producto'] ?? '', 10);
    if (!PRODUCTOS[idProd]) continue;
    const precio = parseFloat((row['precio'] ?? '').replace(',', '.'));
    if (isNaN(precio) || precio <= 0) continue;
    const fecha = parseDate(row['fecha_vigencia'] ?? row['vigencia'] ?? row['fecha']);
    if (!fecha || isNaN(fecha.getTime())) continue;

    const key = `${row['idempresa']}-${idProd}-${row['provincia']}`;
    const prev = latest.get(key);
    if (!prev || fecha > prev.fecha) {
      latest.set(key, {
        id_producto:    idProd,
        precio,
        provincia:      row['provincia'] ?? '',
        fecha_vigencia: fecha.toISOString().slice(0, 10),
        fecha,
      });
    }
  }

  if (latest.size === 0) throw new Error('Sin registros válidos tras filtrar CSV');
  return Array.from(latest.values());
}

// ── Estrategia 2: CKAN datastore vigentes ────────────────────────────────────
async function fetchViaCKAN() {
  const signal = AbortSignal.timeout?.(20000);
  const res = await fetch(CKAN_VIGENTES, { signal, headers: FETCH_HEADERS });
  if (!res.ok) throw new Error(`CKAN HTTP ${res.status}`);
  const json = await res.json();
  if (!json?.success) throw new Error(json?.error?.message ?? 'CKAN error');
  if (!json.result?.records?.length) throw new Error('CKAN devolvió 0 registros');
  return json.result.records;
}

async function fetchRecords() {
  const strategies = [
    { name: 'CSV descarga directa', fn: fetchViaCSV },
    { name: 'CKAN datastore',       fn: fetchViaCKAN },
  ];
  const errors = [];
  for (const { name, fn } of strategies) {
    try {
      const records = await fn();
      console.log(`[api/insumos] OK via ${name} (${records.length} registros)`);
      return records;
    } catch (err) {
      console.warn(`[api/insumos] Falló ${name}: ${err.message}`);
      errors.push(`${name}: ${err.message}`);
    }
  }
  throw new Error(errors.join(' | '));
}

// ── Estadísticas ──────────────────────────────────────────────────────────────
function estadisticas(arr) {
  if (!arr.length) return { promedio: null, mediana: null, min: null, max: null, n: 0 };
  const sorted = [...arr].sort((a, b) => a - b);
  const n = sorted.length;
  const mediana = n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)];
  return {
    promedio: Math.round(arr.reduce((s, v) => s + v, 0) / n * 10) / 10,
    mediana:  Math.round(mediana * 10) / 10,
    min:      sorted[0],
    max:      sorted[n - 1],
    n,
  };
}

function buildPayload(records) {
  const buckets = {};
  for (const row of records) {
    const id = parseInt(String(row['id_producto'] ?? row['idproducto'] ?? ''), 10);
    if (isNaN(id) || !PRODUCTOS[id]) continue;
    const rawPrecio = row['precio'];
    const precio = typeof rawPrecio === 'number'
      ? rawPrecio
      : parseFloat(String(rawPrecio).replace(',', '.'));
    if (isNaN(precio) || precio <= 0) continue;
    const prov = String(row['provincia'] ?? '');
    if (!buckets[id]) buckets[id] = { todos: [], nucleo: [] };
    buckets[id].todos.push(precio);
    if (ZONA_NUCLEO.some(zn => prov.toLowerCase().includes(zn.toLowerCase()))) {
      buckets[id].nucleo.push(precio);
    }
  }

  if (!buckets[3]?.todos?.length) {
    throw new Error(
      `Sin datos de Gasoil G2. IDs presentes: [${Object.keys(buckets).join(', ') || 'ninguno'}]`
    );
  }

  const fechaRef = records
    .map(r => r['fecha_vigencia'])
    .filter(Boolean)
    .sort()
    .at(-1) ?? null;

  const prod = (id, extra = {}) => ({
    ...PRODUCTOS[id],
    ...extra,
    pais:   estadisticas(buckets[id]?.todos  ?? []),
    nucleo: estadisticas(buckets[id]?.nucleo ?? []),
  });

  return {
    ok:     true,
    fuente: 'Sec. de Energía · Res. 314/2016 · datos.energia.gob.ar',
    fecha:  fechaRef,
    gasoil: { g2: prod(3), g3: prod(4) },
    nafta:  { super: prod(2), premium: prod(6), gnc: prod(19) },
  };
}

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req) {
  const cors = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

  let records;
  try {
    records = await fetchRecords();
  } catch (err) {
    console.error('[api/insumos] Fetch falló:', err.message);
    return new Response(
      JSON.stringify({ ok: false, error: `No se pudo obtener datos: ${err.message}` }),
      { status: 503, headers: { ...cors, 'Cache-Control': 'no-store' } }
    );
  }

  let payload;
  try {
    payload = buildPayload(records);
  } catch (err) {
    console.error('[api/insumos] Procesamiento falló:', err.message);
    return new Response(
      JSON.stringify({ ok: false, error: `Datos no procesables: ${err.message}` }),
      { status: 502, headers: { ...cors, 'Cache-Control': 'no-store' } }
    );
  }

  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { ...cors, 'Cache-Control': 's-maxage=1800, stale-while-revalidate=3600' },
  });
}
