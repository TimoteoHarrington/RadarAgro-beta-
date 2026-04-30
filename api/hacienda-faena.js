// api/hacienda-faena.js — Vercel Serverless Function
//
// Descarga el XLS de faena bovina mensual del MAGYP y devuelve
// los datos estructurados de faena, % hembras y producción.
//
// Fuente: Secretaría de Agricultura, Ganadería y Pesca (SAGyP)
// URL: magyp.gob.ar/sitio/areas/ss_ganaderia/archivos/Faena_Bovina_2019-2026_mensuall.xls
//
// Cache Vercel: 24 horas — el MAGYP actualiza antes del día 10 de cada mes.
// Si el XLS no responde → fallback con últimos 12 meses embebidos.

import * as XLSX from 'xlsx';

// URLs candidatas en orden de prioridad.
// El MAGYP a veces corrige typos o actualiza el año en el nombre.
const XLS_URLS = [
  'http://www.magyp.gob.ar/sitio/areas/ss_ganaderia/archivos/Faena_Bovina_2019-2026_mensuall.xls',
  'http://www.magyp.gob.ar/sitio/areas/ss_ganaderia/archivos/Faena_Bovina_2019-2026_mensual.xls',
  'http://www.magyp.gob.ar/sitio/areas/ss_ganaderia/archivos/Faena_Bovina_2020-2026_mensuall.xls',
  'http://www.magyp.gob.ar/sitio/areas/ss_ganaderia/archivos/Faena_Bovina_2020-2026_mensual.xls',
];

// ── Fetch con timeout ─────────────────────────────────────────────────────────
async function fetchTimeout(url, timeoutMs = 25000) {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept':     'application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, */*',
        'Referer':    'https://www.magyp.gob.ar/',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// ── Intentar cada URL candidata ───────────────────────────────────────────────
async function descargarXLS() {
  let lastError = null;
  for (const url of XLS_URLS) {
    try {
      console.log(`[hacienda-faena] Intentando: ${url.split('/').pop()}`);
      const res    = await fetchTimeout(url, 30000);
      const buffer = await res.arrayBuffer();
      console.log(`[hacienda-faena] OK: ${(buffer.byteLength / 1024).toFixed(0)} KB desde ${url.split('/').pop()}`);
      return { buffer: Buffer.from(buffer), url };
    } catch (err) {
      console.warn(`[hacienda-faena] Falló ${url.split('/').pop()}: ${err.message}`);
      lastError = err;
    }
  }
  throw lastError ?? new Error('Todas las URLs fallaron');
}

// ── Parsear el XLS ────────────────────────────────────────────────────────────
// Estructura real del XLS del MAGYP (confirmada 29/04/2026):
//
// Fila 0: vacía
// Fila 1: grupos — "TRANSFORMACIÓN", "CLASIFICACIÓN POR SEXO Y EDAD"
// Fila 2: encabezados — "Mes/Año", "Faena Total País (Cabezas)", "% Hembras",
//          "Producción (en miles de ton...)", "Peso promedio Res",
//          "Vaquillonas", "Vacas", "MEJ", "Novillitos", "Novillos", "Toros"
// Fila 3+: datos — fecha como número serie Excel (ej: 43556 = abr-2019)

// Convierte número serie Excel → "YYYY-MM"
function excelDateToISO(serial) {
  if (!serial || typeof serial !== 'number') return null;
  // Excel usa epoch 1900-01-01 (con el bug del año bisiesto de Lotus 1-2-3)
  const date = new Date((serial - 25569) * 86400 * 1000);
  if (isNaN(date.getTime())) return null;
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  if (y < 2000 || y > 2030) return null;
  return `${y}-${m}`;
}

function parsearFaena(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });

  console.log(`[hacienda-faena] Hojas: ${wb.SheetNames.join(', ')}`);

  // Tomar la primera hoja (única hoja confirmada)
  const hoja = wb.SheetNames[0];
  const ws   = wb.Sheets[hoja];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  // El encabezado real siempre está en la fila 2 (índice 2)
  // Columnas confirmadas:
  // 0=Mes/Año, 1=Faena Total, 2=%Hembras, 3=Prod kt, 4=Peso res,
  // 5=Vaquillonas, 6=Vacas, 7=MEJ, 8=Novillitos, 9=Novillos, 10=Toros
  const HEADER_ROW = 2;
  const DATA_START = 3;

  // Verificar que el encabezado tiene el formato esperado
  const header = (rows[HEADER_ROW] || []).map(c => String(c ?? '').toLowerCase());
  console.log(`[hacienda-faena] Fila ${HEADER_ROW} (encabezado):`, header.slice(0, 6).join(' | '));

  // Si el encabezado no matchea, buscar dinámicamente
  let headerIdx = HEADER_ROW;
  if (!header.some(h => h.includes('faena') || h.includes('mes'))) {
    for (let i = 0; i < Math.min(15, rows.length); i++) {
      const r = (rows[i] || []).map(c => String(c ?? '').toLowerCase());
      if (r.some(h => h.includes('faena') || h.includes('mes/a'))) {
        headerIdx = i;
        break;
      }
    }
    console.log(`[hacienda-faena] Encabezado reuicado en fila ${headerIdx}`);
  }

  const num = (row, idx) => {
    if (idx < 0 || row[idx] == null) return null;
    const v = parseFloat(String(row[idx]).replace(/\./g, '').replace(',', '.'));
    return isNaN(v) ? null : v;
  };

  const faena = [];

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every(c => c == null)) continue;

    // Col 0: fecha como número serie Excel
    const fecha = excelDateToISO(row[0]);
    if (!fecha) continue;

    const t = num(row, 1); // Faena Total País
    if (!t || t < 100000) continue;

    faena.push({
      f:  fecha,
      t:  Math.round(t),
      ph: num(row, 2),           // % Hembras
      pk: num(row, 3),           // Producción kt
      pr: num(row, 4),           // Peso promedio res
      vq: Math.round(num(row, 5) ?? 0) || null, // Vaquillonas
      va: Math.round(num(row, 6) ?? 0) || null, // Vacas
      me: Math.round(num(row, 7) ?? 0) || null, // MEJ
      nt: Math.round(num(row, 8) ?? 0) || null, // Novillitos
      no: Math.round(num(row, 9) ?? 0) || null, // Novillos
      to: Math.round(num(row, 10) ?? 0) || null, // Toros
    });
  }

  faena.sort((a, b) => a.f.localeCompare(b.f));
  return faena;
}

// ── Fallback — últimos 12 meses del haciendaXLS.js ───────────────────────────
const FALLBACK_FAENA = [
  { f:'2025-04', t:1134031, ph:48.1, pk:259.9, pr:229.2, no:92152, nt:466285, vq:310201, va:235518, me:13654, to:16222 },
  { f:'2025-05', t:1128454, ph:47.5, pk:262.1, pr:232.2, no:99100, nt:463900, vq:293100, va:242874, me:13776, to:15705 },
  { f:'2025-06', t:1135113, ph:47.9, pk:262.3, pr:231.0, no:94137, nt:464993, vq:302093, va:241846, me:14611, to:17433 },
  { f:'2025-07', t:1247730, ph:47.8, pk:291.3, pr:233.4, no:95926, nt:521043, vq:340754, va:255660, me:15168, to:19178 },
  { f:'2025-08', t:1161398, ph:47.1, pk:272.0, pr:234.2, no:84206, nt:494545, vq:325611, va:221750, me:16692, to:18593 },
  { f:'2025-09', t:1174526, ph:47.3, pk:272.3, pr:231.9, no:78020, nt:500565, vq:359416, va:196524, me:20924, to:19078 },
  { f:'2025-10', t:1203178, ph:47.7, pk:279.0, pr:231.9, no:78463, nt:508677, vq:388320, va:185683, me:22522, to:19512 },
  { f:'2025-11', t:1052187, ph:48.3, pk:246.5, pr:234.2, no:69822, nt:436898, vq:345559, va:162714, me:19513, to:17681 },
  { f:'2025-12', t:1134940, ph:47.6, pk:260.6, pr:229.6, no:74579, nt:480776, vq:381719, va:158442, me:23145, to:16279 },
  { f:'2026-01', t:1019078, ph:47.4, pk:240.1, pr:235.6, no:71246, nt:431819, vq:321258, va:161296, me:18116, to:15344 },
  { f:'2026-02', t:924972,  ph:48.0, pk:216.9, pr:234.4, no:68625, nt:380475, vq:287293, va:156568, me:16775, to:15236 },
  { f:'2026-03', t:1029000, ph:47.8, pk:243.3, pr:236.4, no:80113, nt:425072, vq:303068, va:188324, me:16908, to:15516 },
];

// Ciclo ganadero según % hembras
function calcularCiclo(ph) {
  if (ph == null) return { label: '—', color: '#888', desc: 'Sin datos' };
  if (ph < 44)   return { label: 'Retención fuerte',   color: '#4abf78', desc: 'Rodeo en recomposición acelerada' };
  if (ph < 46)   return { label: 'Retención moderada', color: '#4abf78', desc: 'Señal de retención activa' };
  if (ph < 48.5) return { label: 'Retención leve',     color: '#f5c518', desc: 'Mercado en equilibrio' };
  if (ph < 50)   return { label: 'Zona de alerta',     color: '#e8a020', desc: 'Inicio de presión liquidadora' };
  return             { label: 'Liquidación',           color: '#e85555', desc: 'Salida masiva de vientres' };
}

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  // 24 horas de cache — el MAGYP publica mensualmente antes del día 10
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');

  let faena      = [];
  let esFallback = false;
  let urlUsada   = null;
  let errorMsg   = null;

  try {
    const { buffer, url } = await descargarXLS();
    urlUsada = url;
    faena    = parsearFaena(buffer);

    if (faena.length === 0) throw new Error('XLS parseado sin registros válidos');
    console.log(`[hacienda-faena] OK: ${faena.length} registros, último: ${faena[faena.length-1].f}`);

  } catch (err) {
    console.warn('[hacienda-faena] Fallback activado:', err.message);
    esFallback = true;
    errorMsg   = err.message;
    faena      = FALLBACK_FAENA;
  }

  const ultimo = faena[faena.length - 1] ?? null;
  const penult = faena[faena.length - 2] ?? null;
  const ciclo  = calcularCiclo(ultimo?.ph);

  // Faena acumulada últimos 12 meses
  const ult12     = faena.slice(-12);
  const faena12   = ult12.reduce((s, d) => s + (d.t ?? 0), 0);
  const prev12    = faena.slice(-24, -12);
  const faena12ant= prev12.reduce((s, d) => s + (d.t ?? 0), 0);
  const varFaena  = (faena12 && faena12ant)
    ? +((faena12 - faena12ant) / faena12ant * 100).toFixed(1)
    : null;

  // Composición del último mes
  const comp = ultimo ? {
    novillos:    ultimo.no,
    novillitos:  ultimo.nt,
    vaquillonas: ultimo.vq,
    vacas:       ultimo.va,
    mej:         ultimo.me,
    toros:       ultimo.to,
    pctHembras:  ultimo.ph,
  } : null;

  return res.status(200).json({
    ok:        true,
    esFallback,
    fuente:    esFallback
      ? `Fallback · MAGYP hasta ${FALLBACK_FAENA[FALLBACK_FAENA.length-1].f}`
      : `SAGyP/DNCCA · Faena Bovina Mensual (hasta ${ultimo?.f ?? '—'})`,
    errorMsg,
    urlFuente: urlUsada,

    // Último mes disponible
    ultimo: ultimo ? {
      fecha:    ultimo.f,
      total:    ultimo.t,
      hembras:  ultimo.ph,
      prodKt:   ultimo.pk,
      pesoRes:  ultimo.pr,
    } : null,

    // KPIs derivados
    kpis: {
      faena12meses:    faena12 || null,
      varFaena12meses: varFaena,
      cicloGanadero:   ciclo,
      pesoPromedio:    ultimo?.pr ?? null,
    },

    // Composición por categoría del último mes
    composicion: comp,

    // Serie completa para gráficos
    faena,
  });
}
