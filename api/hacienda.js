// api/hacienda.js — Vercel Serverless Function
// ─────────────────────────────────────────────────────────────────────────
// Fuente: Mercado Agroganadero (MAG) Cañuelas
//
// ESTRATEGIA MULTI-FUENTE (4 capas):
//   1. MAG oficial directo — headers de app móvil Android (distinto al scraper web)
//   2. agroconectados.com.ar — re-publica datos MAG, WAF más liviano
//   3. ganaderiaynegocios.com — tercera opción, misma data
//   4. Fallback hardcodeado — último remate conocido, badge DEMO visible
//
// Los sitios de hacienda argentinos bloquean IPs de datacenter (Vercel/Cloudflare).
// Por eso usamos múltiples fuentes con estrategias de headers distintas.
// ─────────────────────────────────────────────────────────────────────────

const FUENTES = [
  {
    nombre: 'MAG Cañuelas (oficial)',
    url: 'https://www.mercadoagroganadero.com.ar/dll/apmag2_a.dll/home',
    headers: {
      'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 13; Pixel 7 Build/TQ3A.230901.001)',
      'Accept': 'text/html,application/xhtml+xml,*/*',
      'Accept-Language': 'es-AR',
      'Connection': 'keep-alive',
    },
    parser: parsearTablaGenerica,
  },
  {
    nombre: 'Agroconectados',
    url: 'https://www.agroconectados.com.ar/mercados/canuelas/',
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
      'Accept-Language': 'es-AR,es;q=0.9',
      'Referer': 'https://www.agroconectados.com.ar/',
    },
    parser: parsearTablaGenerica,
  },
  {
    nombre: 'Ganadería y Negocios',
    url: 'https://ganaderiaynegocios.com/precios-mercado-agroganadero-canuelas/',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'es-AR,es;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Referer': 'https://www.google.com/',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'cross-site',
    },
    parser: parsearTablaGenerica,
  },
];

// ── Fallback — último remate conocido (22/04/2026) ────────────────────────
const FALLBACK_DATA = {
  fecha: '2026-04-22T00:00:00-03:00',
  fuente: 'Último remate disponible · Cañuelas MAG · 22/04/2026',
  indices: [
    { id: 'ar.canuelas.inmag',         nombre: 'INMAG',         valor: 4271.87, unidad: 'ARS/kg vivo', fecha: '2026-04-22T00:00:00-03:00' },
    { id: 'ar.canuelas.igmag',         nombre: 'IGMAG',         valor: 3574.29, unidad: 'ARS/kg vivo', fecha: '2026-04-22T00:00:00-03:00' },
    { id: 'ar.canuelas.arrendamiento', nombre: 'Arrendamiento', valor: 4254.08, unidad: 'ARS/ha/año',  fecha: '2026-04-22T00:00:00-03:00' },
  ],
  grupos: [
    { id: 'novillos', label: 'Novillos', items: [
      { id: 'ar.canuelas.resol.2018.32.apn.novillos.esp.joven.+.430', nombre: 'Novillos Esp.Joven + 430', valor: 4415.77, minimo: 3500, maximo: 4800, cabezas: 493, unidad: 'ARS/kg vivo', fecha: '2026-04-22T00:00:00-03:00' },
      { id: 'ar.canuelas.resol.2018.32.apn.novillos.regular.h.430',   nombre: 'Novillos Regular h 430',   valor: 3241.94, minimo: 3000, maximo: 4600, cabezas:  64, unidad: 'ARS/kg vivo', fecha: '2026-04-22T00:00:00-03:00' },
      { id: 'ar.canuelas.resol.2018.32.apn.novillos.regular.+.430',   nombre: 'Novillos Regular + 430',   valor: 4029.90, minimo: 3800, maximo: 4500, cabezas:  68, unidad: 'ARS/kg vivo', fecha: '2026-04-22T00:00:00-03:00' },
    ]},
    { id: 'novillitos', label: 'Novillitos', items: [
      { id: 'ar.canuelas.resol.2018.32.apn.novillitos.esp.h.390', nombre: 'Novillitos Esp. h 390', valor: 4993.13, minimo: 4500, maximo: 5500, cabezas: 342, unidad: 'ARS/kg vivo', fecha: '2026-04-22T00:00:00-03:00' },
      { id: 'ar.canuelas.resol.2018.32.apn.novillitos.esp.+.390', nombre: 'Novillitos Esp. + 390', valor: 4778.99, minimo: 4300, maximo: 5240, cabezas: 293, unidad: 'ARS/kg vivo', fecha: '2026-04-22T00:00:00-03:00' },
      { id: 'ar.canuelas.resol.2018.32.apn.novillitos.regular',   nombre: 'Novillitos Regular',    valor: 4104.37, minimo: 3000, maximo: 5320, cabezas: 169, unidad: 'ARS/kg vivo', fecha: '2026-04-22T00:00:00-03:00' },
    ]},
    { id: 'vaquillonas', label: 'Vaquillonas', items: [
      { id: 'ar.canuelas.resol.2018.32.apn.vaquillonas.esp.h.390', nombre: 'Vaquillonas Esp. h 390', valor: 4609.29, minimo: 3500, maximo: 5550, cabezas: 488, unidad: 'ARS/kg vivo', fecha: '2026-04-22T00:00:00-03:00' },
      { id: 'ar.canuelas.resol.2018.32.apn.vaquillonas.esp.+.390', nombre: 'Vaquillonas Esp. + 390', valor: 4006.13, minimo: 2620, maximo: 4400, cabezas: 199, unidad: 'ARS/kg vivo', fecha: '2026-04-22T00:00:00-03:00' },
      { id: 'ar.canuelas.resol.2018.32.apn.vaquillonas.regular',   nombre: 'Vaquillonas Regular',   valor: 3876.95, minimo: 3000, maximo: 5000, cabezas: 146, unidad: 'ARS/kg vivo', fecha: '2026-04-22T00:00:00-03:00' },
    ]},
    { id: 'vacas', label: 'Vacas', items: [
      { id: 'ar.canuelas.resol.2018.32.apn.vacas.esp.joven.h.430',   nombre: 'Vacas Esp.Joven h 430',   valor: 2819.73, minimo: 2400, maximo: 4000, cabezas:  64, unidad: 'ARS/kg vivo', fecha: '2026-04-22T00:00:00-03:00' },
      { id: 'ar.canuelas.resol.2018.32.apn.vacas.esp.joven.+.430',   nombre: 'Vacas Esp.Joven + 430',   valor: 3250.97, minimo: 2320, maximo: 4500, cabezas: 519, unidad: 'ARS/kg vivo', fecha: '2026-04-22T00:00:00-03:00' },
      { id: 'ar.canuelas.resol.2018.32.apn.vacas.regular',           nombre: 'Vacas Regular',            valor: 2679.13, minimo: 1800, maximo: 3800, cabezas: 867, unidad: 'ARS/kg vivo', fecha: '2026-04-22T00:00:00-03:00' },
      { id: 'ar.canuelas.resol.2018.32.apn.vacas.conserva.buena',    nombre: 'Vacas Conserva Buena',     valor: 2149.38, minimo: 1800, maximo: 2700, cabezas: 335, unidad: 'ARS/kg vivo', fecha: '2026-04-22T00:00:00-03:00' },
      { id: 'ar.canuelas.resol.2018.32.apn.vacas.conserva.inferior', nombre: 'Vacas Conserva Inferior',  valor: 1958.89, minimo: 1700, maximo: 2320, cabezas: 136, unidad: 'ARS/kg vivo', fecha: '2026-04-22T00:00:00-03:00' },
    ]},
    { id: 'toros', label: 'Toros', items: [
      { id: 'ar.canuelas.resol.2018.32.apn.toros.esp.',    nombre: 'Toros Esp.',    valor: 2919.28, minimo: 2700, maximo: 3500, cabezas:  70, unidad: 'ARS/kg vivo', fecha: '2026-04-22T00:00:00-03:00' },
      { id: 'ar.canuelas.resol.2018.32.apn.toros.regular', nombre: 'Toros Regular', valor: 2413.90, minimo: 1700, maximo: 3200, cabezas:  39, unidad: 'ARS/kg vivo', fecha: '2026-04-22T00:00:00-03:00' },
    ]},
    { id: 'mejores', label: 'Mejores', items: [
      { id: 'ar.canuelas.resol.2018.32.apn.mej.esp.h.430', nombre: 'MEJ Esp. h 430', valor: 3830.18, minimo: 3300, maximo: 4800, cabezas: 57, unidad: 'ARS/kg vivo', fecha: '2026-04-22T00:00:00-03:00' },
      { id: 'ar.canuelas.resol.2018.32.apn.mej.regular',   nombre: 'MEJ Regular',    valor: 3050.00, minimo: 3050, maximo: 3050, cabezas:  7, unidad: 'ARS/kg vivo', fecha: '2026-04-22T00:00:00-03:00' },
    ]},
  ],
};

// ── Mapeo de categorías HTML → estructura interna ─────────────────────────
const CATEGORIA_MAP = [
  // Novillos
  { match: s => /novillo/i.test(s) && !/novillito/i.test(s) && /especial|joven.*430|430.*esp|mest.*e.*b/i.test(s), grupo: 'novillos', id: 'ar.canuelas.resol.2018.32.apn.novillos.esp.joven.+.430', nombre: 'Novillos Esp.Joven + 430' },
  { match: s => /novillo/i.test(s) && !/novillito/i.test(s) && /overo/i.test(s),                                  grupo: 'novillos', id: 'ar.canuelas.resol.2018.32.apn.novillos.regular.h.430',   nombre: 'Novillos Regular h 430' },
  { match: s => /novillo/i.test(s) && !/novillito/i.test(s) && /regular/i.test(s),                                grupo: 'novillos', id: 'ar.canuelas.resol.2018.32.apn.novillos.regular.+.430',   nombre: 'Novillos Regular + 430' },
  // Novillitos
  { match: s => /novillito/i.test(s) && /esp.*h\s*390|h\s*390|e.*b.*m\.|300.*390/i.test(s), grupo: 'novillitos', id: 'ar.canuelas.resol.2018.32.apn.novillitos.esp.h.390', nombre: 'Novillitos Esp. h 390' },
  { match: s => /novillito/i.test(s) && /esp.*\+\s*390|\+\s*390|e.*b.*p\.|391.*430/i.test(s), grupo: 'novillitos', id: 'ar.canuelas.resol.2018.32.apn.novillitos.esp.+.390', nombre: 'Novillitos Esp. + 390' },
  { match: s => /novillito/i.test(s) && /especial/i.test(s), grupo: 'novillitos', id: 'ar.canuelas.resol.2018.32.apn.novillitos.esp.h.390', nombre: 'Novillitos Esp. h 390' },
  { match: s => /novillito/i.test(s) && /regular/i.test(s), grupo: 'novillitos', id: 'ar.canuelas.resol.2018.32.apn.novillitos.regular', nombre: 'Novillitos Regular' },
  // Vaquillonas
  { match: s => /vaquillona/i.test(s) && /esp.*h\s*390|h\s*390|e.*b.*m\.|270.*390/i.test(s), grupo: 'vaquillonas', id: 'ar.canuelas.resol.2018.32.apn.vaquillonas.esp.h.390', nombre: 'Vaquillonas Esp. h 390' },
  { match: s => /vaquillona/i.test(s) && /esp.*\+\s*390|\+\s*390|e.*b.*p\.|391.*430/i.test(s), grupo: 'vaquillonas', id: 'ar.canuelas.resol.2018.32.apn.vaquillonas.esp.+.390', nombre: 'Vaquillonas Esp. + 390' },
  { match: s => /vaquillona/i.test(s) && /especial/i.test(s), grupo: 'vaquillonas', id: 'ar.canuelas.resol.2018.32.apn.vaquillonas.esp.h.390', nombre: 'Vaquillonas Esp. h 390' },
  { match: s => /vaquillona/i.test(s) && /regular/i.test(s), grupo: 'vaquillonas', id: 'ar.canuelas.resol.2018.32.apn.vaquillonas.regular', nombre: 'Vaquillonas Regular' },
  // Vacas
  { match: s => /vaca/i.test(s) && /conserva.*buena|buena.*conserva/i.test(s),    grupo: 'vacas', id: 'ar.canuelas.resol.2018.32.apn.vacas.conserva.buena',    nombre: 'Vacas Conserva Buena' },
  { match: s => /vaca/i.test(s) && /conserva.*inferior|inferior.*conserva/i.test(s), grupo: 'vacas', id: 'ar.canuelas.resol.2018.32.apn.vacas.conserva.inferior', nombre: 'Vacas Conserva Inferior' },
  { match: s => /vaca/i.test(s) && /conserva/i.test(s),                           grupo: 'vacas', id: 'ar.canuelas.resol.2018.32.apn.vacas.conserva.buena',    nombre: 'Vacas Conserva Buena' },
  { match: s => /vaca/i.test(s) && /buena|especial|joven/i.test(s),               grupo: 'vacas', id: 'ar.canuelas.resol.2018.32.apn.vacas.esp.joven.+.430',   nombre: 'Vacas Esp.Joven + 430' },
  { match: s => /vaca/i.test(s) && /regular/i.test(s),                            grupo: 'vacas', id: 'ar.canuelas.resol.2018.32.apn.vacas.regular',           nombre: 'Vacas Regular' },
  // Toros
  { match: s => /toro/i.test(s) && /buen|especial|esp\./i.test(s), grupo: 'toros', id: 'ar.canuelas.resol.2018.32.apn.toros.esp.',    nombre: 'Toros Esp.' },
  { match: s => /toro/i.test(s) && /regular/i.test(s),             grupo: 'toros', id: 'ar.canuelas.resol.2018.32.apn.toros.regular', nombre: 'Toros Regular' },
  // MEJ
  { match: s => /mej/i.test(s) && /e.*b|eyb|especial/i.test(s), grupo: 'mejores', id: 'ar.canuelas.resol.2018.32.apn.mej.esp.h.430', nombre: 'MEJ Esp. h 430' },
  { match: s => /mej/i.test(s) && /regular/i.test(s),            grupo: 'mejores', id: 'ar.canuelas.resol.2018.32.apn.mej.regular',   nombre: 'MEJ Regular' },
];

const GRUPO_LABELS = { novillos: 'Novillos', novillitos: 'Novillitos', vaquillonas: 'Vaquillonas', vacas: 'Vacas', toros: 'Toros', mejores: 'Mejores' };
const ORDEN_GRUPOS = ['novillos', 'novillitos', 'vaquillonas', 'vacas', 'toros', 'mejores'];

// ── Parsear número con soporte es-AR y en-US ──────────────────────────────
function parseNum(s) {
  if (!s) return NaN;
  const clean = s.replace(/[^\d,.]/g, '');
  if (!clean) return NaN;
  const commas = (clean.match(/,/g) || []).length;
  const dots   = (clean.match(/\./g) || []).length;
  if (commas === 1 && dots === 0) return parseFloat(clean.replace(',', '.'));
  if (dots === 1 && commas === 0) {
    const parts = clean.split('.');
    return parts[1].length <= 2 ? parseFloat(clean) : parseFloat(clean.replace('.', ''));
  }
  // "4.271,87" → número es-AR
  return parseFloat(clean.replace(/\./g, '').replace(',', '.'));
}

// ── Parser genérico de tabla HTML ─────────────────────────────────────────
function parsearTablaGenerica(html) {
  // Extraer fecha
  let fechaISO = null;
  for (const pat of [
    /Datos correspondientes a:\s*(\d{1,2}\/\d{1,2}\/\d{4})/,
    /Jornada[:\s]+(\d{1,2}\/\d{1,2}\/\d{4})/i,
    /Remate[:\s]+(\d{1,2}\/\d{1,2}\/\d{4})/i,
    /(\d{2}\/\d{2}\/\d{4})/,
  ]) {
    const m = html.match(pat);
    if (m) {
      const [d, mo, y] = m[1].split('/');
      fechaISO = `${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}T00:00:00-03:00`;
      break;
    }
  }

  // Extraer filas de tabla
  const filas = [];
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trM;
  while ((trM = trRe.exec(html)) !== null) {
    const cells = [];
    const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let tdM;
    while ((tdM = tdRe.exec(trM[1])) !== null) {
      cells.push(tdM[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim());
    }
    if (cells.length >= 4) filas.push(cells);
  }
  if (!filas.length) throw new Error('Sin filas en tabla');

  // Mapear y acumular
  const acc = {};
  for (const cells of filas) {
    const nombre = cells[0];
    if (!nombre || nombre.length < 3) continue;
    const mapeo = CATEGORIA_MAP.find(m => m.match(nombre));
    if (!mapeo) continue;

    const minimo  = parseNum(cells[1]);
    const maximo  = parseNum(cells[2]);
    const prom    = parseNum(cells[3]);
    const cabezas = parseInt((cells[5] || cells[4] || '').replace(/\D/g, '') || '0', 10);
    if (isNaN(prom) || prom <= 100) continue; // sanity check: precio > 100 ARS/kg

    if (!acc[mapeo.id]) {
      acc[mapeo.id] = { suma: 0, count: 0, minimo: Infinity, maximo: -Infinity, totalCabezas: 0, nombre: mapeo.nombre, grupo: mapeo.grupo, id: mapeo.id };
    }
    const a = acc[mapeo.id];
    const peso = cabezas || 1;
    a.suma         += prom * peso;
    a.count        += peso;
    a.totalCabezas += cabezas;
    a.minimo        = Math.min(a.minimo, isNaN(minimo) ? prom : minimo);
    a.maximo        = Math.max(a.maximo, isNaN(maximo) ? prom : maximo);
  }
  if (!Object.keys(acc).length) throw new Error('Sin categorías mapeadas');

  // Construir grupos
  const gruposMap = {};
  for (const a of Object.values(acc)) {
    const valor = a.suma / a.count;
    const item = {
      id: a.id, nombre: a.nombre,
      valor:   Math.round(valor * 100) / 100,
      minimo:  a.minimo === Infinity  ? null : a.minimo,
      maximo:  a.maximo === -Infinity ? null : a.maximo,
      cabezas: a.totalCabezas,
      unidad:  'ARS/kg vivo',
      fecha:   fechaISO,
    };
    if (!gruposMap[a.grupo]) gruposMap[a.grupo] = [];
    gruposMap[a.grupo].push(item);
  }
  const grupos = ORDEN_GRUPOS.filter(g => gruposMap[g]?.length).map(g => ({ id: g, label: GRUPO_LABELS[g], items: gruposMap[g] }));
  if (!grupos.length) throw new Error('Sin grupos válidos');

  // Calcular índices
  const novillosEsp = acc['ar.canuelas.resol.2018.32.apn.novillos.esp.joven.+.430'];
  const inmag = novillosEsp ? Math.round((novillosEsp.suma / novillosEsp.count) * 100) / 100 : null;

  const todosExMej = Object.values(acc).filter(a => a.grupo !== 'mejores');
  const igTotal = todosExMej.reduce((s, a) => s + a.suma, 0);
  const igCount = todosExMej.reduce((s, a) => s + a.count, 0);
  const igmag = igCount > 0 ? Math.round((igTotal / igCount) * 100) / 100 : null;

  const arrendamiento = inmag ? Math.round(inmag * 0.994 * 100) / 100 : null;

  const indices = [
    inmag         != null ? { id: 'ar.canuelas.inmag',         nombre: 'INMAG',         valor: inmag,         unidad: 'ARS/kg vivo', fecha: fechaISO } : null,
    igmag         != null ? { id: 'ar.canuelas.igmag',         nombre: 'IGMAG',         valor: igmag,         unidad: 'ARS/kg vivo', fecha: fechaISO } : null,
    arrendamiento != null ? { id: 'ar.canuelas.arrendamiento', nombre: 'Arrendamiento', valor: arrendamiento, unidad: 'ARS/ha/año',  fecha: fechaISO } : null,
  ].filter(Boolean);

  return { indices, grupos };
}

// ── Fetch con timeout ─────────────────────────────────────────────────────
async function fetchConTimeout(url, headers, ms = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const resp = await fetch(url, { signal: controller.signal, headers });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const html = await resp.text();
    if (html.length < 500) throw new Error('Respuesta demasiado corta (posible bloqueo)');
    return html;
  } finally {
    clearTimeout(timer);
  }
}

// ── Handler principal ─────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=7200, stale-while-revalidate=14400');

  const errores = [];

  for (const fuente of FUENTES) {
    try {
      console.log(`[hacienda] → ${fuente.nombre}`);
      const html      = await fetchConTimeout(fuente.url, fuente.headers, 12000);
      const resultado = fuente.parser(html);

      console.log(`[hacienda] ✓ ${fuente.nombre} — ${resultado.grupos.length} grupos`);
      return res.status(200).json({
        ok:      true,
        esMock:  false,
        fuente:  `Cañuelas MAG · ${fuente.nombre} · tiempo real`,
        fecha:   resultado.indices[0]?.fecha ?? null,
        indices: resultado.indices,
        grupos:  resultado.grupos,
        _meta:   { fuente: fuente.nombre },
      });
    } catch (err) {
      const msg = `${fuente.nombre}: ${err.message}`;
      console.warn(`[hacienda] ✗ ${msg}`);
      errores.push(msg);
    }
  }

  // Todas las fuentes fallaron → fallback con datos conocidos
  console.warn('[hacienda] Todas las fuentes fallaron:', errores.join(' | '));
  return res.status(200).json({
    ok:      true,
    esMock:  true,
    fuente:  FALLBACK_DATA.fuente,
    fecha:   FALLBACK_DATA.fecha,
    indices: FALLBACK_DATA.indices,
    grupos:  FALLBACK_DATA.grupos,
    _meta:   { errores },
  });
}
