// api/hacienda.js — Vercel Edge Function
// Fuente: Mercado Agroganadero (MAG) Cañuelas — datos oficiales
// Edge Runtime usa IPs de Cloudflare, que el MAG no bloquea.
// Sin fallback: si falla → HTTP 503 { ok: false }.

export const config = { runtime: 'edge' };

const MAG_URL =
  'https://www.mercadoagroganadero.com.ar/dll/hacienda1.dll/haciinfo000002';

// Mapeo categorías del MAG → estructura interna
const CATEGORIA_MAP = [
  { match: s => /NOVILLO/i.test(s) && !/NOVILLITO/i.test(s) && /Mest.*EyB/i.test(s),    grupo: 'novillos',    id: 'novillos.esp',      nombre: 'Novillos Esp.' },
  { match: s => /NOVILLO/i.test(s) && !/NOVILLITO/i.test(s) && /Regular.*Liv/i.test(s), grupo: 'novillos',    id: 'novillos.reg.liv',  nombre: 'Novillos Reg. Livianos' },
  { match: s => /NOVILLO/i.test(s) && !/NOVILLITO/i.test(s) && /Regular.*Pes/i.test(s), grupo: 'novillos',    id: 'novillos.reg.pes',  nombre: 'Novillos Reg. Pesados' },
  { match: s => /NOVILLO/i.test(s) && !/NOVILLITO/i.test(s) && /Overos/i.test(s),       grupo: 'novillos',    id: 'novillos.overos',   nombre: 'Novillos Overos' },
  { match: s => /NOVILLITO/i.test(s) && /EyB.*M\./i.test(s),                            grupo: 'novillitos',  id: 'novillitos.esp.m',  nombre: 'Novillitos Esp. Medianos' },
  { match: s => /NOVILLITO/i.test(s) && /EyB.*P\./i.test(s),                            grupo: 'novillitos',  id: 'novillitos.esp.p',  nombre: 'Novillitos Esp. Pesados' },
  { match: s => /NOVILLITO/i.test(s) && /Regular/i.test(s),                             grupo: 'novillitos',  id: 'novillitos.reg',    nombre: 'Novillitos Regulares' },
  { match: s => /VAQUILLONA/i.test(s) && /EyB.*M\./i.test(s),                           grupo: 'vaquillonas', id: 'vaq.esp.m',         nombre: 'Vaquillonas Esp. Medianas' },
  { match: s => /VAQUILLONA/i.test(s) && /EyB.*P\./i.test(s),                           grupo: 'vaquillonas', id: 'vaq.esp.p',         nombre: 'Vaquillonas Esp. Pesadas' },
  { match: s => /VAQUILLONA/i.test(s) && /Regular/i.test(s),                            grupo: 'vaquillonas', id: 'vaq.reg',           nombre: 'Vaquillonas Regulares' },
  { match: s => /VACA/i.test(s) && /Buen/i.test(s) && !/Conserva/i.test(s),            grupo: 'vacas',       id: 'vacas.buenas',      nombre: 'Vacas Buenas' },
  { match: s => /VACA/i.test(s) && /Regular/i.test(s),                                 grupo: 'vacas',       id: 'vacas.reg',         nombre: 'Vacas Regulares' },
  { match: s => /VACA/i.test(s) && /Conserva.*Buen/i.test(s),                          grupo: 'vacas',       id: 'vacas.cons.b',      nombre: 'Vacas Conserva Buena' },
  { match: s => /VACA/i.test(s) && /Conserva.*Inf/i.test(s),                           grupo: 'vacas',       id: 'vacas.cons.i',      nombre: 'Vacas Conserva Inferior' },
  { match: s => /TORO/i.test(s) && /Buen/i.test(s),                                    grupo: 'toros',       id: 'toros.buenos',      nombre: 'Toros Buenos' },
  { match: s => /TORO/i.test(s) && /Regular/i.test(s),                                 grupo: 'toros',       id: 'toros.reg',         nombre: 'Toros Regulares' },
  { match: s => /\bMEJ\b/i.test(s) && /EyB/i.test(s),                                 grupo: 'mejores',     id: 'mej.eyb',           nombre: 'MEJ EyB' },
  { match: s => /\bMEJ\b/i.test(s) && /Regular/i.test(s),                              grupo: 'mejores',     id: 'mej.reg',           nombre: 'MEJ Regulares' },
];

const GRUPO_LABELS = {
  novillos: 'Novillos', novillitos: 'Novillitos', vaquillonas: 'Vaquillonas',
  vacas: 'Vacas', toros: 'Toros', mejores: 'Mejores',
};
const ORDEN_GRUPOS = ['novillos', 'novillitos', 'vaquillonas', 'vacas', 'toros', 'mejores'];

// MAG usa punto como sep. de miles y coma como decimal: "4.271,870" → 4271.87
function pNum(s) {
  if (!s) return NaN;
  return parseFloat(s.replace(/\$/g, '').trim().replace(/\./g, '').replace(',', '.'));
}

function parsearHTML(html) {
  // Fecha: "DESDE EL MARTES 21/04/2026"
  const fechaMatch = html.match(/DESDE\s+EL\s+\w+\s+(\d{2}\/\d{2}\/\d{4})/i);
  let fechaISO = null;
  if (fechaMatch) {
    const [d, m, y] = fechaMatch[1].split('/');
    fechaISO = `${y}-${m}-${d}T00:00:00-03:00`;
  }

  // Extraer todas las filas
  const filas = [];
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trM;
  while ((trM = trRe.exec(html)) !== null) {
    const cells = [];
    const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let tdM;
    while ((tdM = tdRe.exec(trM[1])) !== null) {
      cells.push(
        tdM[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&#\d+;/g, ' ').trim()
      );
    }
    if (cells.length >= 4) filas.push(cells);
  }
  if (!filas.length) throw new Error('No se encontró tabla en el HTML del MAG');

  // Detectar INMAG (1er subtotal), IGMAG (fila Totales) e ingreso total
  let inmag = null, igmag = null, totalCabezas = null, totalImporte = null;
  let prevSep = false, subtotalesVistos = 0;

  for (const cells of filas) {
    const c0 = cells[0] ?? '', c3 = cells[3] ?? '';
    if (/totales/i.test(c0)) {
      igmag         = pNum(c3);
      totalCabezas  = parseInt((cells[5] ?? '').replace(/[^0-9]/g, ''), 10) || null;
      totalImporte  = pNum(cells[6]);
      continue;
    }
    if (/^-{3,}/.test(c3)) { prevSep = true; continue; }
    if (prevSep && !c0.trim() && !(cells[1] ?? '').trim() && !(cells[2] ?? '').trim()) {
      prevSep = false;
      subtotalesVistos++;
      if (subtotalesVistos === 1) inmag = pNum(c3); // primer subtotal = INMAG novillos
      continue;
    }
    prevSep = false;
  }

  // Acumular por categoría interna + guardar filas raw del MAG
  const acumulados = {};
  const rawFilas   = []; // una entrada por fila de la tabla MAG (para la vista detallada)

  for (const cells of filas) {
    const nombreRaw = cells[0] ?? '';
    if (!nombreRaw.trim() || /totales/i.test(nombreRaw) || /^-{3,}/.test(cells[3] ?? '')) continue;
    const mapeo = CATEGORIA_MAP.find(m => m.match(nombreRaw));
    if (!mapeo) continue;

    // Columnas MAG: nombre|min|max|prom|mediana|cabezas|importe|kgTotal|kgProm
    const minimo   = pNum(cells[1]);
    const maximo   = pNum(cells[2]);
    const prom     = pNum(cells[3]);
    const mediana  = pNum(cells[4]);
    const cabezas  = parseInt((cells[5] ?? '').replace(/[^0-9]/g, ''), 10) || 0;
    const importe  = pNum(cells[6]);
    const kgTotal  = pNum(cells[7]);
    const kgProm   = pNum(cells[8]);

    if (isNaN(prom) || prom <= 0) continue;

    // Guardar fila raw (vista detallada)
    rawFilas.push({
      id:       `${mapeo.grupo}.${nombreRaw.replace(/\s+/g,'-').toLowerCase()}`,
      nombreRaw,
      nombre:   mapeo.nombre,
      grupo:    mapeo.grupo,
      minimo:   isNaN(minimo)  ? null : minimo,
      maximo:   isNaN(maximo)  ? null : maximo,
      promedio: prom,
      mediana:  isNaN(mediana) ? null : mediana,
      cabezas,
      importe:  isNaN(importe) ? null : importe,
      kgTotal:  isNaN(kgTotal) ? null : kgTotal,
      kgProm:   isNaN(kgProm)  ? null : kgProm,
      unidad:   'ARS/kg vivo',
      fecha:    fechaISO,
    });

    // Acumular para grupos
    if (!acumulados[mapeo.id]) {
      acumulados[mapeo.id] = {
        suma: 0, count: 0, minimo: Infinity, maximo: -Infinity,
        totalCabezas: 0, nombre: mapeo.nombre, grupo: mapeo.grupo, id: mapeo.id,
      };
    }
    const acc = acumulados[mapeo.id];
    const peso = cabezas || 1;
    acc.suma         += prom * peso;
    acc.count        += peso;
    acc.totalCabezas += cabezas;
    acc.minimo        = Math.min(acc.minimo, isNaN(minimo) ? prom : minimo);
    acc.maximo        = Math.max(acc.maximo, isNaN(maximo) ? prom : maximo);
  }

  if (!rawFilas.length) throw new Error('No se pudo mapear ninguna categoría del MAG');

  // Construir grupos
  const gruposMap = {};
  for (const acc of Object.values(acumulados)) {
    const valor = Math.round((acc.suma / acc.count) * 100) / 100;
    const entry = {
      id: acc.id, nombre: acc.nombre, valor,
      minimo:  acc.minimo === Infinity  ? null : acc.minimo,
      maximo:  acc.maximo === -Infinity ? null : acc.maximo,
      cabezas: acc.totalCabezas, unidad: 'ARS/kg vivo', fecha: fechaISO,
    };
    if (!gruposMap[acc.grupo]) gruposMap[acc.grupo] = [];
    gruposMap[acc.grupo].push(entry);
  }
  const grupos = ORDEN_GRUPOS.filter(g => gruposMap[g]?.length)
    .map(g => ({ id: g, label: GRUPO_LABELS[g], items: gruposMap[g] }));

  // Fallback de cálculo si el MAG no publicó subtotales
  if (inmag == null) {
    const ne = acumulados['novillos.esp'];
    if (ne) inmag = Math.round((ne.suma / ne.count) * 100) / 100;
  }
  if (igmag == null) {
    const todos = Object.values(acumulados).filter(a => a.grupo !== 'mejores');
    const t = todos.reduce((s, a) => s + a.suma, 0);
    const c = todos.reduce((s, a) => s + a.count, 0);
    if (c > 0) igmag = Math.round((t / c) * 100) / 100;
  }

  // Arrendamiento: estimado histórico INMAG × 0.994
  const arrendamiento = inmag != null ? Math.round(inmag * 0.994 * 100) / 100 : null;

  const indices = [
    inmag         != null ? { id: 'ar.canuelas.inmag',         nombre: 'INMAG',         valor: inmag,         unidad: 'ARS/kg vivo', fecha: fechaISO } : null,
    igmag         != null ? { id: 'ar.canuelas.igmag',         nombre: 'IGMAG',         valor: igmag,         unidad: 'ARS/kg vivo', fecha: fechaISO } : null,
    arrendamiento != null ? { id: 'ar.canuelas.arrendamiento', nombre: 'Arrendamiento', valor: arrendamiento, unidad: 'ARS/ha/año',  fecha: fechaISO } : null,
  ].filter(Boolean);

  return { indices, grupos, rawFilas, fechaActual: fechaISO, totalCabezas, totalImporte };
}

export default async function handler(req) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200',
  };
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    let html;
    try {
      const resp = await fetch(MAG_URL, {
        signal: controller.signal,
        headers: {
          'User-Agent':      'Mozilla/5.0 (compatible; RadarAgro/1.0)',
          'Accept':          'text/html,application/xhtml+xml',
          'Accept-Language': 'es-AR,es;q=0.9',
        },
      });
      if (!resp.ok) throw new Error(`MAG respondió HTTP ${resp.status}`);
      html = await resp.text();
    } finally {
      clearTimeout(timer);
    }

    const payload = parsearHTML(html);
    if (!payload.rawFilas.length) throw new Error('Tabla MAG vacía o sin jornada activa');

    return new Response(JSON.stringify({
      ok:            true,
      fuente:        'Cañuelas MAG · datos oficiales · mercadoagroganadero.com.ar',
      fecha:         payload.fechaActual,
      indices:       payload.indices,
      grupos:        payload.grupos,
      categorias:    payload.rawFilas,
      totalCabezas:  payload.totalCabezas,
      totalImporte:  payload.totalImporte,
    }), { status: 200, headers });

  } catch (err) {
    console.error('[api/hacienda]', err.message);
    return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 503, headers });
  }
}
