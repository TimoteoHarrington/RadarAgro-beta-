// api/hacienda-faena.js — Vercel Serverless Function
//
// Descarga el XLS de indicadores bovinos del MAGYP, lo parsea y devuelve
// los datos estructurados de faena, precios históricos y ciclo ganadero.
//
// Cache de Vercel: 24 horas (s-maxage=86400) — el MAGYP actualiza mensualmente.
// Si el XLS no está disponible, devuelve los datos del fallback embebido.
//
// Fuente: Secretaría de Agricultura, Ganadería y Pesca (SAGyP/MAGYP)
// URL: magyp.gob.ar/sitio/areas/bovinos/informacion_sectorial/

import * as XLSX from 'xlsx';
import { load } from 'cheerio';

const MAGYP_BASE = 'https://www.magyp.gob.ar';
const MAGYP_PAGE = `${MAGYP_BASE}/sitio/areas/bovinos/informacion_sectorial/`;

// URL conocida del XLS — nombre estable, actualizado cada mes por el MAGYP
// Si falla, el handler scrapea la página para encontrar la URL actual
const XLS_URL_CONOCIDA = `${MAGYP_BASE}/sitio/areas/bovinos/informacion_sectorial/_archivos/000030_Indicadores/000001-%20Indicadores%20bovinos.xls`;

// ── Fetch helper ──────────────────────────────────────────────────────────────
async function fetchTimeout(url, timeoutMs = 25000, opts = {}) {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...opts,
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept':     '*/*',
        ...(opts.headers ?? {}),
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// ── Paso 1: Encontrar URL del XLS scrapeando la página ───────────────────────
async function encontrarUrlXLS() {
  // Primero intentamos la URL conocida con HEAD
  try {
    await fetchTimeout(XLS_URL_CONOCIDA, 8000, { method: 'HEAD' });
    return XLS_URL_CONOCIDA;
  } catch {
    console.log('[hacienda-faena] URL conocida no disponible, scrapeando página...');
  }

  // Si falla, scrapeamos la página para encontrar el link actual
  const res  = await fetchTimeout(MAGYP_PAGE, 15000);
  const html = await res.text();
  const $    = load(html);

  const candidatos = [];
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    if (!/(\.xls|\.xlsx)$/i.test(href)) return;
    const texto = $(el).text().trim().toLowerCase();
    const score =
      (texto.includes('indicador') ? 3 : 0) +
      (texto.includes('bovino')    ? 2 : 0) +
      (texto.includes('mensual')   ? 2 : 0) +
      (texto.includes('2026')      ? 3 : 0) +
      (texto.includes('2025')      ? 1 : 0);
    if (score > 0) candidatos.push({ href, score });
  });

  candidatos.sort((a, b) => b.score - a.score);
  if (!candidatos.length) throw new Error('No se encontró XLS en la página del MAGYP');

  const href = candidatos[0].href;
  return href.startsWith('http') ? href : MAGYP_BASE + href;
}

// ── Paso 2: Descargar y parsear el XLS ───────────────────────────────────────
async function descargarYParsear(url) {
  console.log(`[hacienda-faena] Descargando XLS: ${url}`);
  const res    = await fetchTimeout(url, 30000);
  const buffer = await res.arrayBuffer();
  console.log(`[hacienda-faena] XLS descargado: ${(buffer.byteLength / 1024).toFixed(0)} KB`);

  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });

  // Buscar la hoja de indicadores mensuales
  const KEYWORDS = ['indicador', 'mensual', 'datos', 'faena', 'bovino'];
  const hoja = wb.SheetNames.find(n =>
    KEYWORDS.some(k => n.toLowerCase().includes(k))
  ) ?? wb.SheetNames[0];

  console.log(`[hacienda-faena] Hojas: ${wb.SheetNames.join(', ')} → usando "${hoja}"`);

  const ws   = wb.Sheets[hoja];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
  return rows;
}

// ── Paso 3: Detectar columnas y extraer datos ─────────────────────────────────
function extraerDatos(rows) {
  // Encontrar fila de encabezado
  let headerIdx = -1;
  let headers   = [];

  for (let i = 0; i < Math.min(25, rows.length); i++) {
    const row = (rows[i] || []).map(c => String(c ?? '').toLowerCase().trim());
    if (row.some(c => c.includes('faena') || c.includes('fecha') || c.includes('año'))) {
      headerIdx = i;
      headers   = row;
      break;
    }
  }

  if (headerIdx < 0) throw new Error('No se encontró fila de encabezados en el XLS');
  console.log(`[hacienda-faena] Encabezados (fila ${headerIdx}): ${headers.slice(0, 8).join(' | ')}`);

  // Mapeo flexible de columnas por palabras clave
  const col = (...keywords) => {
    const idx = headers.findIndex(h => keywords.some(k => h.includes(k)));
    return idx >= 0 ? idx : null;
  };

  const C = {
    fecha:   col('fecha', 'periodo'),
    anio:    col('año', 'anio', 'year'),
    mes:     col('mes', 'month'),
    faena:   col('faena', 'total cab', 'cabezas'),
    ph:      col('hembra', '% hem', 'participacion hem'),
    prodkt:  col('miles de ton', 'produccion', 'prod'),
    pesoRes: col('peso prom', 'peso res', 'kilo gancho', 'kg gancho'),
    precioN: col('novillo', '$/kg', 'precio nov'),
    precioU: col('usd', 'us$', 'dólar', 'dolar'),
    consInt: col('consumo interno', 'consumo ap'),
    consPc:  col('per capita', 'per cápita', 'cp'),
    expTon:  col('exportac', 'exp ton'),
  };

  // Parser de número robusto
  const num = (row, idx) => {
    if (idx === null || !row[idx]) return null;
    const v = String(row[idx]).replace(/\./g, '').replace(',', '.').trim();
    const n = parseFloat(v);
    return isNaN(n) ? null : +n.toFixed(4);
  };

  // Parser de fecha desde varios formatos
  const parseFecha = (row) => {
    // Intentar columna fecha directa
    if (C.fecha !== null && row[C.fecha]) {
      const raw = row[C.fecha];
      if (raw instanceof Date) {
        const y = raw.getFullYear();
        const m = String(raw.getMonth() + 1).padStart(2, '0');
        return `${y}-${m}`;
      }
      const s = String(raw).trim();
      const m1 = s.match(/^(\d{4})-(\d{2})/);
      const m2 = s.match(/^(\d{2})\/(\d{4})/);
      const m3 = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
      if (m1) return `${m1[1]}-${m1[2]}`;
      if (m2) return `${m2[2]}-${m2[1]}`;
      if (m3) return `${m3[3]}-${m3[2]}`;
    }
    // Intentar año + mes separados
    if (C.anio !== null && C.mes !== null && row[C.anio] && row[C.mes]) {
      const y = parseInt(row[C.anio], 10);
      const m = parseInt(row[C.mes],  10);
      if (y >= 1990 && y <= 2030 && m >= 1 && m <= 12) {
        return `${y}-${String(m).padStart(2, '0')}`;
      }
    }
    return null;
  };

  const historico = [];

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every(c => c === null)) continue;

    const fecha = parseFecha(row);
    if (!fecha) continue;

    const [y] = fecha.split('-').map(Number);
    if (y < 1990 || y > 2030) continue;

    const fa = num(row, C.faena);
    if (!fa || fa < 100000) continue; // faena mensual siempre > 100k cabezas

    historico.push({
      f:   fecha,
      fa:  Math.round(fa),
      ph:  num(row, C.ph),      // % hembras
      pk:  num(row, C.prodkt),  // producción en kt
      pr:  num(row, C.pesoRes), // peso res kg
      pn:  num(row, C.precioN), // precio novillo ARS/kg
      pu:  num(row, C.precioU), // precio novillo USD/kg
      ca:  num(row, C.consInt), // consumo aparente kt
      cp:  num(row, C.consPc),  // consumo per cápita kg/hab/año
      ve:  num(row, C.expTon),  // exportaciones toneladas
    });
  }

  historico.sort((a, b) => a.f.localeCompare(b.f));
  return historico;
}

// ── Fallback embebido — últimos 12 meses del haciendaXLS.js ──────────────────
// Se usa si el MAGYP no responde. Actualizar manualmente cuando sea necesario.
const FALLBACK_FECHA = '2026-03';
const FALLBACK_HISTORICO = [
  { f:'2025-04', fa:1134031, ph:48.1, pk:259.9,  pr:229.2, pn:2788.1, pu:2.44 },
  { f:'2025-05', fa:1128454, ph:47.5, pk:262.1,  pr:232.2, pn:2799.7, pu:2.41 },
  { f:'2025-06', fa:1135113, ph:47.9, pk:262.3,  pr:231.0, pn:2822.7, pu:2.36 },
  { f:'2025-07', fa:1247730, ph:47.8, pk:291.3,  pr:233.4, pn:2924.3, pu:2.28 },
  { f:'2025-08', fa:1161398, ph:47.1, pk:272.0,  pr:234.2, pn:3028.5, pu:2.26 },
  { f:'2025-09', fa:1174526, ph:47.3, pk:272.3,  pr:231.9, pn:3132.5, pu:2.21 },
  { f:'2025-10', fa:1203178, ph:47.7, pk:279.0,  pr:231.9, pn:3248.8, pu:2.22 },
  { f:'2025-11', fa:1052187, ph:48.3, pk:246.5,  pr:234.2, pn:3855.5, pu:2.65 },
  { f:'2025-12', fa:1134940, ph:47.6, pk:260.6,  pr:229.6, pn:4085.6, pu:2.78 },
  { f:'2026-01', fa:1019078, ph:47.4, pk:240.1,  pr:235.6, pn:4117.7, pu:2.80 },
  { f:'2026-02', fa:924972,  ph:48.0, pk:216.9,  pr:234.4, pn:4460.1, pu:3.13 },
  { f:'2026-03', fa:1029000, ph:47.8, pk:243.3,  pr:236.4, pn:4441.9, pu:3.14 },
];

// Ciclo ganadero según % hembras en faena
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
  // Cache de 24 horas en Vercel CDN — el MAGYP actualiza mensualmente
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');

  let historico     = [];
  let esFallback    = false;
  let errorMsg      = null;
  let urlUsada      = null;

  try {
    urlUsada  = await encontrarUrlXLS();
    const rows = await descargarYParsear(urlUsada);
    historico  = extraerDatos(rows);

    if (historico.length === 0) throw new Error('XLS parseado pero sin registros válidos');

    console.log(`[hacienda-faena] OK: ${historico.length} registros, último: ${historico[historico.length-1].f}`);

  } catch (err) {
    console.warn('[hacienda-faena] Usando fallback:', err.message);
    esFallback = true;
    errorMsg   = err.message;
    historico  = FALLBACK_HISTORICO;
  }

  // Datos derivados del último mes disponible
  const ultimo  = historico[historico.length - 1] ?? null;
  const penult  = historico[historico.length - 2] ?? null;
  const ciclo   = calcularCiclo(ultimo?.ph);

  // Faena últimos 12 meses
  const ultimos12 = historico.slice(-12);
  const faena12   = ultimos12.reduce((s, d) => s + (d.fa ?? 0), 0);

  // Variación faena vs mismo periodo año anterior
  const hace12  = historico.slice(-24, -12);
  const faena12ant = hace12.reduce((s, d) => s + (d.fa ?? 0), 0);
  const varFaena12 = (faena12 && faena12ant)
    ? +((faena12 - faena12ant) / faena12ant * 100).toFixed(1)
    : null;

  // Variación precio m/m
  const varPrecio = (ultimo?.pn && penult?.pn)
    ? +((ultimo.pn - penult.pn) / penult.pn * 100).toFixed(1)
    : null;

  return res.status(200).json({
    ok:          true,
    esFallback,
    fuente:      esFallback
      ? `Fallback · MAGYP hasta ${FALLBACK_FECHA}`
      : `MAGYP · Secretaría de Agricultura (hasta ${ultimo?.f ?? '—'})`,
    errorMsg,
    urlFuente:   urlUsada,
    fechaUltimo: ultimo?.f ?? null,

    // Resumen del último mes
    ultimo: ultimo ? {
      fecha:     ultimo.f,
      faena:     ultimo.fa,
      hembras:   ultimo.ph,
      prodKt:    ultimo.pk,
      pesoRes:   ultimo.pr,
      precioN:   ultimo.pn,
      precioUSD: ultimo.pu,
    } : null,

    // Indicadores derivados
    kpis: {
      faena12meses:    faena12   || null,
      varFaena12meses: varFaena12,
      varPrecioMensual: varPrecio,
      cicloGanadero:   ciclo,
    },

    // Serie completa para gráficos
    historico,
  });
}
