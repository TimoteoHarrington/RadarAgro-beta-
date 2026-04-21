// api/hacienda.js — Vercel Serverless Function
// ─────────────────────────────────────────────────────────────────────────
// Fuente: Mercado Agroganadero (MAG) Cañuelas
// Los datos del MAG son públicos pero su servidor bloquea IPs de datacenter.
// ganaderiaynegocios.com re-publica los mismos datos en HTML abierto y
// se actualiza en cada jornada de remates (lunes y miércoles).
//
// Estrategia:
//   1. Fetch HTML de ganaderiaynegocios.com/precios-mercado-agroganadero-canuelas
//   2. Parsear tabla <table> con categorías MAG
//   3. Transformar al mismo formato interno que usaba el proveedor anterior
//   4. Si el scraping falla → fallback a FALLBACK_DATA (último remate conocido)
// ─────────────────────────────────────────────────────────────────────────

const MAG_URL = 'https://ganaderiaynegocios.com/precios-mercado-agroganadero-canuelas/';

// ── Fallback — datos del último remate conocido (21/04/2026) ─────────────
// Se usa solo si el scraping falla por cualquier motivo.
const FALLBACK_DATA = {
  fecha: '2026-04-21T00:00:00-03:00',
  fuente: 'Cañuelas MAG · datos del último remate disponible (fallback)',
  indices: [
    { id: 'ar.canuelas.inmag',         nombre: 'INMAG',         valor: 4271.87,  unidad: 'ARS/kg vivo',   fecha: '2026-04-21T00:00:00-03:00' },
    { id: 'ar.canuelas.igmag',         nombre: 'IGMAG',         valor: 3574.29,  unidad: 'ARS/kg vivo',   fecha: '2026-04-21T00:00:00-03:00' },
    { id: 'ar.canuelas.arrendamiento', nombre: 'Arrendamiento', valor: 4254.08,  unidad: 'ARS/ha/año',    fecha: '2026-04-21T00:00:00-03:00' },
  ],
  grupos: [
    {
      id: 'novillos', label: 'Novillos',
      items: [
        { id: 'ar.canuelas.resol.2018.32.apn.novillos.esp.joven.+.430', nombre: 'Novillos Esp.Joven + 430', valor: 4415.77, minimo: 3500, maximo: 4800, cabezas: 493, unidad: 'ARS/kg vivo', fecha: '2026-04-21T00:00:00-03:00' },
        { id: 'ar.canuelas.resol.2018.32.apn.novillos.regular.h.430',   nombre: 'Novillos Regular h 430',   valor: 3241.94, minimo: 3000, maximo: 4600, cabezas:  64, unidad: 'ARS/kg vivo', fecha: '2026-04-21T00:00:00-03:00' },
        { id: 'ar.canuelas.resol.2018.32.apn.novillos.regular.+.430',   nombre: 'Novillos Regular + 430',   valor: 4029.90, minimo: 3800, maximo: 4500, cabezas:  68, unidad: 'ARS/kg vivo', fecha: '2026-04-21T00:00:00-03:00' },
      ],
    },
    {
      id: 'novillitos', label: 'Novillitos',
      items: [
        { id: 'ar.canuelas.resol.2018.32.apn.novillitos.esp.h.390',  nombre: 'Novillitos Esp. h 390', valor: 4993.13, minimo: 4500, maximo: 5500, cabezas: 342, unidad: 'ARS/kg vivo', fecha: '2026-04-21T00:00:00-03:00' },
        { id: 'ar.canuelas.resol.2018.32.apn.novillitos.esp.+.390',  nombre: 'Novillitos Esp. + 390', valor: 4778.99, minimo: 4300, maximo: 5240, cabezas: 293, unidad: 'ARS/kg vivo', fecha: '2026-04-21T00:00:00-03:00' },
        { id: 'ar.canuelas.resol.2018.32.apn.novillitos.regular',    nombre: 'Novillitos Regular',    valor: 4104.37, minimo: 3000, maximo: 5320, cabezas: 169, unidad: 'ARS/kg vivo', fecha: '2026-04-21T00:00:00-03:00' },
      ],
    },
    {
      id: 'vaquillonas', label: 'Vaquillonas',
      items: [
        { id: 'ar.canuelas.resol.2018.32.apn.vaquillonas.esp.h.390', nombre: 'Vaquillonas Esp. h 390', valor: 4609.29, minimo: 3500, maximo: 5550, cabezas: 488, unidad: 'ARS/kg vivo', fecha: '2026-04-21T00:00:00-03:00' },
        { id: 'ar.canuelas.resol.2018.32.apn.vaquillonas.esp.+.390', nombre: 'Vaquillonas Esp. + 390', valor: 4006.13, minimo: 2620, maximo: 4400, cabezas: 199, unidad: 'ARS/kg vivo', fecha: '2026-04-21T00:00:00-03:00' },
        { id: 'ar.canuelas.resol.2018.32.apn.vaquillonas.regular',   nombre: 'Vaquillonas Regular',   valor: 3876.95, minimo: 3000, maximo: 5000, cabezas: 146, unidad: 'ARS/kg vivo', fecha: '2026-04-21T00:00:00-03:00' },
      ],
    },
    {
      id: 'vacas', label: 'Vacas',
      items: [
        { id: 'ar.canuelas.resol.2018.32.apn.vacas.esp.joven.h.430',       nombre: 'Vacas Esp.Joven h 430',    valor: 2819.73, minimo: 2400, maximo: 4000, cabezas:  64, unidad: 'ARS/kg vivo', fecha: '2026-04-21T00:00:00-03:00' },
        { id: 'ar.canuelas.resol.2018.32.apn.vacas.esp.joven.+.430',       nombre: 'Vacas Esp.Joven + 430',    valor: 3250.97, minimo: 2320, maximo: 4500, cabezas: 519, unidad: 'ARS/kg vivo', fecha: '2026-04-21T00:00:00-03:00' },
        { id: 'ar.canuelas.resol.2018.32.apn.vacas.regular',               nombre: 'Vacas Regular',            valor: 2679.13, minimo: 1800, maximo: 3800, cabezas: 867, unidad: 'ARS/kg vivo', fecha: '2026-04-21T00:00:00-03:00' },
        { id: 'ar.canuelas.resol.2018.32.apn.vacas.conserva.buena',        nombre: 'Vacas Conserva Buena',     valor: 2149.38, minimo: 1800, maximo: 2700, cabezas: 335, unidad: 'ARS/kg vivo', fecha: '2026-04-21T00:00:00-03:00' },
        { id: 'ar.canuelas.resol.2018.32.apn.vacas.conserva.inferior',     nombre: 'Vacas Conserva Inferior',  valor: 1958.89, minimo: 1700, maximo: 2320, cabezas: 136, unidad: 'ARS/kg vivo', fecha: '2026-04-21T00:00:00-03:00' },
      ],
    },
    {
      id: 'toros', label: 'Toros',
      items: [
        { id: 'ar.canuelas.resol.2018.32.apn.toros.esp.',    nombre: 'Toros Esp.',    valor: 2919.28, minimo: 2700, maximo: 3500, cabezas:  70, unidad: 'ARS/kg vivo', fecha: '2026-04-21T00:00:00-03:00' },
        { id: 'ar.canuelas.resol.2018.32.apn.toros.regular', nombre: 'Toros Regular', valor: 2413.90, minimo: 1700, maximo: 3200, cabezas:  39, unidad: 'ARS/kg vivo', fecha: '2026-04-21T00:00:00-03:00' },
      ],
    },
    {
      id: 'mejores', label: 'Mejores',
      items: [
        { id: 'ar.canuelas.resol.2018.32.apn.mej.esp.h.430', nombre: 'MEJ Esp. h 430', valor: 3830.18, minimo: 3300, maximo: 4800, cabezas: 57, unidad: 'ARS/kg vivo', fecha: '2026-04-21T00:00:00-03:00' },
        { id: 'ar.canuelas.resol.2018.32.apn.mej.regular',   nombre: 'MEJ Regular',    valor: 3050.00, minimo: 3050, maximo: 3050, cabezas:  7, unidad: 'ARS/kg vivo', fecha: '2026-04-21T00:00:00-03:00' },
      ],
    },
  ],
};

// ── Mapeo: nombre en la tabla MAG → categoría interna ────────────────────
// Clave: fragmento lowercase que aparece en el nombre de la categoría del HTML
const CATEGORIA_MAP = [
  // Novillos
  { match: s => /novillo/i.test(s) && !/novillito/i.test(s) && /mest.*e.*b.*\+.*520/i.test(s),     grupo: 'novillos',    id: 'ar.canuelas.resol.2018.32.apn.novillos.esp.joven.+.430',   nombre: 'Novillos Esp.Joven + 430' },
  { match: s => /novillo/i.test(s) && !/novillito/i.test(s) && /mest.*e.*b.*4[36][01]/i.test(s),   grupo: 'novillos',    id: 'ar.canuelas.resol.2018.32.apn.novillos.esp.joven.+.430',   nombre: 'Novillos Esp.Joven + 430' },
  { match: s => /novillo/i.test(s) && !/novillito/i.test(s) && /mest.*e.*b.*4[679][01]/i.test(s),  grupo: 'novillos',    id: 'ar.canuelas.resol.2018.32.apn.novillos.esp.joven.+.430',   nombre: 'Novillos Esp.Joven + 430' },
  { match: s => /novillo/i.test(s) && !/novillito/i.test(s) && /mest.*e.*b.*4[89][12]/i.test(s),   grupo: 'novillos',    id: 'ar.canuelas.resol.2018.32.apn.novillos.esp.joven.+.430',   nombre: 'Novillos Esp.Joven + 430' },
  { match: s => /novillo/i.test(s) && !/novillito/i.test(s) && /overo/i.test(s),                   grupo: 'novillos',    id: 'ar.canuelas.resol.2018.32.apn.novillos.regular.h.430',      nombre: 'Novillos Regular h 430' },
  { match: s => /novillo/i.test(s) && !/novillito/i.test(s) && /regular.*liv/i.test(s),            grupo: 'novillos',    id: 'ar.canuelas.resol.2018.32.apn.novillos.regular.+.430',      nombre: 'Novillos Regular + 430' },
  { match: s => /novillo/i.test(s) && !/novillito/i.test(s) && /regular.*pes/i.test(s),            grupo: 'novillos',    id: 'ar.canuelas.resol.2018.32.apn.novillos.regular.+.430',      nombre: 'Novillos Regular + 430' },
  // Novillitos
  { match: s => /novillito/i.test(s) && /e.*b.*m\.|300.*390/i.test(s),                            grupo: 'novillitos',  id: 'ar.canuelas.resol.2018.32.apn.novillitos.esp.h.390',        nombre: 'Novillitos Esp. h 390' },
  { match: s => /novillito/i.test(s) && /e.*b.*p\.|391.*430/i.test(s),                            grupo: 'novillitos',  id: 'ar.canuelas.resol.2018.32.apn.novillitos.esp.+.390',        nombre: 'Novillitos Esp. + 390' },
  { match: s => /novillito/i.test(s) && /regular/i.test(s),                                       grupo: 'novillitos',  id: 'ar.canuelas.resol.2018.32.apn.novillitos.regular',          nombre: 'Novillitos Regular' },
  // Vaquillonas
  { match: s => /vaquillona/i.test(s) && (/e.*b.*m\.|270.*390/i.test(s)),                         grupo: 'vaquillonas', id: 'ar.canuelas.resol.2018.32.apn.vaquillonas.esp.h.390',       nombre: 'Vaquillonas Esp. h 390' },
  { match: s => /vaquillona/i.test(s) && (/e.*b.*p\.|391.*430/i.test(s)),                         grupo: 'vaquillonas', id: 'ar.canuelas.resol.2018.32.apn.vaquillonas.esp.+.390',       nombre: 'Vaquillonas Esp. + 390' },
  { match: s => /vaquillona/i.test(s) && /regular/i.test(s),                                      grupo: 'vaquillonas', id: 'ar.canuelas.resol.2018.32.apn.vaquillonas.regular',         nombre: 'Vaquillonas Regular' },
  // Vacas
  { match: s => /vaca/i.test(s) && /buena/i.test(s) && !/conserva/i.test(s),                      grupo: 'vacas',       id: 'ar.canuelas.resol.2018.32.apn.vacas.esp.joven.+.430',       nombre: 'Vacas Esp.Joven + 430' },
  { match: s => /vaca/i.test(s) && /regular/i.test(s),                                            grupo: 'vacas',       id: 'ar.canuelas.resol.2018.32.apn.vacas.regular',               nombre: 'Vacas Regular' },
  { match: s => /vaca/i.test(s) && /conserva.*buena/i.test(s),                                    grupo: 'vacas',       id: 'ar.canuelas.resol.2018.32.apn.vacas.conserva.buena',        nombre: 'Vacas Conserva Buena' },
  { match: s => /vaca/i.test(s) && /conserva.*inferior/i.test(s),                                 grupo: 'vacas',       id: 'ar.canuelas.resol.2018.32.apn.vacas.conserva.inferior',     nombre: 'Vacas Conserva Inferior' },
  // Toros
  { match: s => /toro/i.test(s) && /buen/i.test(s),                                               grupo: 'toros',       id: 'ar.canuelas.resol.2018.32.apn.toros.esp.',                  nombre: 'Toros Esp.' },
  { match: s => /toro/i.test(s) && /regular/i.test(s),                                            grupo: 'toros',       id: 'ar.canuelas.resol.2018.32.apn.toros.regular',               nombre: 'Toros Regular' },
  // MEJ
  { match: s => /mej/i.test(s) && /e.*b|eyb/i.test(s),                                           grupo: 'mejores',     id: 'ar.canuelas.resol.2018.32.apn.mej.esp.h.430',               nombre: 'MEJ Esp. h 430' },
  { match: s => /mej/i.test(s) && /regular/i.test(s),                                             grupo: 'mejores',     id: 'ar.canuelas.resol.2018.32.apn.mej.regular',                 nombre: 'MEJ Regular' },
];

const GRUPO_LABELS = {
  novillos:    'Novillos',
  novillitos:  'Novillitos',
  vaquillonas: 'Vaquillonas',
  vacas:       'Vacas',
  toros:       'Toros',
  mejores:     'Mejores',
};

// ── Parser de HTML ────────────────────────────────────────────────────────
// Extrae filas de la primera <table> del HTML de ganaderiaynegocios.com
function parsearHTML(html) {
  // Extraer fecha del texto "Datos correspondientes a: DD/MM/YYYY"
  const fechaMatch = html.match(/Datos correspondientes a:\s*(\d{1,2}\/\d{1,2}\/\d{4})/);
  let fechaISO = null;
  if (fechaMatch) {
    const [d, m, y] = fechaMatch[1].split('/');
    fechaISO = `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}T00:00:00-03:00`;
  }

  // Extraer filas de tabla: <tr><td>CATEGORIA</td><td>min</td><td>max</td><td>prom</td>...
  const filas = [];
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch;
  while ((trMatch = trRegex.exec(html)) !== null) {
    const cells = [];
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let tdMatch;
    while ((tdMatch = tdRegex.exec(trMatch[1])) !== null) {
      // Limpiar HTML interno y normalizar el número
      const txt = tdMatch[1]
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .trim();
      cells.push(txt);
    }
    if (cells.length >= 4) filas.push(cells);
  }

  if (!filas.length) throw new Error('Sin filas en la tabla del MAG');

  // Acumular por id (varios renglones de la tabla se mapean a la misma categoría interna)
  const acumulados = {}; // id → { suma, count, minimo, maximo, cabezas, nombre, grupo }

  for (const cells of filas) {
    const nombreRaw = cells[0];
    if (!nombreRaw) continue;

    // Buscar mapeo
    const mapeo = CATEGORIA_MAP.find(m => m.match(nombreRaw));
    if (!mapeo) continue;

    const parseNum = s => {
      if (!s) return NaN;
      return parseFloat(s.replace(/[.,\s]/g, m => m === '.' && s.indexOf('.') !== s.lastIndexOf('.') ? '' : m === ',' ? '.' : ''));
    };

    // Columnas: [nombre, min, max, prom, mediana, cabezas, importe, kgTotal, kgProm]
    const minimo  = parseNum(cells[1]);
    const maximo  = parseNum(cells[2]);
    const prom    = parseNum(cells[3]);
    const cabezas = parseInt(cells[5]?.replace(/\D/g, '') || '0', 10);

    if (isNaN(prom) || prom <= 0) continue;

    if (!acumulados[mapeo.id]) {
      acumulados[mapeo.id] = { suma: 0, count: 0, minimo: Infinity, maximo: -Infinity, totalCabezas: 0, nombre: mapeo.nombre, grupo: mapeo.grupo, id: mapeo.id };
    }
    const acc = acumulados[mapeo.id];
    acc.suma         += prom * (cabezas || 1);
    acc.count        += (cabezas || 1);
    acc.totalCabezas += cabezas;
    acc.minimo        = Math.min(acc.minimo, isNaN(minimo) ? prom : minimo);
    acc.maximo        = Math.max(acc.maximo, isNaN(maximo) ? prom : maximo);
  }

  if (!Object.keys(acumulados).length) throw new Error('No se pudo mapear ninguna categoría');

  // Construir grupos
  const gruposMap = {};
  for (const acc of Object.values(acumulados)) {
    const valor = acc.suma / acc.count;
    const entry = {
      id:      acc.id,
      nombre:  acc.nombre,
      valor:   Math.round(valor * 100) / 100,
      minimo:  acc.minimo === Infinity ? null : acc.minimo,
      maximo:  acc.maximo === -Infinity ? null : acc.maximo,
      cabezas: acc.totalCabezas,
      unidad:  'ARS/kg vivo',
      fecha:   fechaISO,
    };
    if (!gruposMap[acc.grupo]) gruposMap[acc.grupo] = [];
    gruposMap[acc.grupo].push(entry);
  }

  const ORDEN_GRUPOS = ['novillos','novillitos','vaquillonas','vacas','toros','mejores'];
  const grupos = ORDEN_GRUPOS
    .filter(g => gruposMap[g]?.length)
    .map(g => ({ id: g, label: GRUPO_LABELS[g], items: gruposMap[g] }));

  // Calcular INMAG (promedio ponderado novillos especiales) e IGMAG (promedio general)
  const novillosEsp = acumulados['ar.canuelas.resol.2018.32.apn.novillos.esp.joven.+.430'];
  const inmag = novillosEsp ? Math.round((novillosEsp.suma / novillosEsp.count) * 100) / 100 : null;

  // IGMAG = promedio ponderado de todos los grupos de faena (excluye mejores)
  const todosExceptMej = Object.values(acumulados).filter(a => a.grupo !== 'mejores');
  const igmagTotal = todosExceptMej.reduce((s, a) => s + a.suma, 0);
  const igmagCount = todosExceptMej.reduce((s, a) => s + a.count, 0);
  const igmag = igmagCount > 0 ? Math.round((igmagTotal / igmagCount) * 100) / 100 : null;

  // Arrendamiento: según el INMAG, el índice de arrendamiento se calcula como ~INMAG * 0.994
  // (relación histórica Cañuelas; en ausencia de fuente directa usamos este estimado)
  const arrendamiento = inmag ? Math.round(inmag * 0.994 * 100) / 100 : null;

  const indices = [
    inmag         != null ? { id: 'ar.canuelas.inmag',         nombre: 'INMAG',         valor: inmag,         unidad: 'ARS/kg vivo', fecha: fechaISO } : null,
    igmag         != null ? { id: 'ar.canuelas.igmag',         nombre: 'IGMAG',         valor: igmag,         unidad: 'ARS/kg vivo', fecha: fechaISO } : null,
    arrendamiento != null ? { id: 'ar.canuelas.arrendamiento', nombre: 'Arrendamiento', valor: arrendamiento, unidad: 'ARS/ha/año',  fecha: fechaISO } : null,
  ].filter(Boolean);

  return { indices, grupos, fechaActual: fechaISO };
}

// ── Handler ───────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  // Cache 1 hora; los remates son lunes y miércoles — más que suficiente
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');

  // ── Intento: scraping del MAG vía ganaderiaynegocios.com ────────────────
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    let html;
    try {
      const resp = await fetch(MAG_URL, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; RadarAgro/1.0)',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'es-AR,es;q=0.9',
        },
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status} al obtener datos del MAG`);
      html = await resp.text();
    } finally {
      clearTimeout(timer);
    }

    const payload = parsearHTML(html);

    if (!payload.grupos.length) throw new Error('Tabla del MAG vacía o sin jornada activa');

    return res.status(200).json({
      ok:      true,
      esMock:  false,
      fuente:  `Cañuelas MAG · datos en tiempo real · fuente: ganaderiaynegocios.com`,
      fecha:   payload.fechaActual,
      indices: payload.indices,
      grupos:  payload.grupos,
    });

  } catch (scrapingErr) {
    console.warn('[api/hacienda] scraping falló, usando fallback:', scrapingErr.message);
  }

  // ── Fallback ─────────────────────────────────────────────────────────────
  try {
    return res.status(200).json({
      ok:      true,
      esMock:  true,
      fuente:  FALLBACK_DATA.fuente,
      fecha:   FALLBACK_DATA.fecha,
      indices: FALLBACK_DATA.indices,
      grupos:  FALLBACK_DATA.grupos,
    });
  } catch (err) {
    console.error('[api/hacienda] error crítico:', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
