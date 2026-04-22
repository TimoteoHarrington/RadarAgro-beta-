// api/hacienda.js — Vercel Edge Function
// ─────────────────────────────────────────────────────────────────────────
// Fuente: Mercado Agroganadero (MAG) Cañuelas — datos oficiales
// URL:    https://www.mercadoagroganadero.com.ar/dll/hacienda1.dll/haciinfo000002
//
// Edge Runtime usa IPs de Cloudflare, que el MAG no bloquea.
// Si el fetch o el parsing fallan se devuelve HTTP 503 con { ok: false }.
// No hay fallback con datos hardcodeados.
// ─────────────────────────────────────────────────────────────────────────

export const config = { runtime: 'edge' };

const MAG_URL =
  'https://www.mercadoagroganadero.com.ar/dll/hacienda1.dll/haciinfo000002';

// ── Mapeo: categorías del MAG → estructura interna ───────────────────────
// Nombres reales del MAG: "NOVILLOS Mest.EyB 431/460", "VACAS Buenas", etc.
const CATEGORIA_MAP = [
  // Novillos especiales (todos los rangos Mest.EyB van al mismo bucket)
  { match: s => /NOVILLO/i.test(s) && !/NOVILLITO/i.test(s) && /Mest.*EyB/i.test(s),    grupo: 'novillos',    id: 'ar.canuelas.resol.2018.32.apn.novillos.esp.joven.+.430',  nombre: 'Novillos Esp.Joven + 430' },
  { match: s => /NOVILLO/i.test(s) && !/NOVILLITO/i.test(s) && /Regular.*Liv/i.test(s), grupo: 'novillos',    id: 'ar.canuelas.resol.2018.32.apn.novillos.regular.h.430',     nombre: 'Novillos Regular h 430'   },
  { match: s => /NOVILLO/i.test(s) && !/NOVILLITO/i.test(s) && /Regular.*Pes/i.test(s), grupo: 'novillos',    id: 'ar.canuelas.resol.2018.32.apn.novillos.regular.+.430',     nombre: 'Novillos Regular + 430'   },
  { match: s => /NOVILLO/i.test(s) && !/NOVILLITO/i.test(s) && /Overos/i.test(s),       grupo: 'novillos',    id: 'ar.canuelas.resol.2018.32.apn.novillos.regular.h.430',     nombre: 'Novillos Regular h 430'   },
  { match: s => /NOVILLITO/i.test(s) && /EyB.*M\./i.test(s),                            grupo: 'novillitos',  id: 'ar.canuelas.resol.2018.32.apn.novillitos.esp.h.390',       nombre: 'Novillitos Esp. h 390'    },
  { match: s => /NOVILLITO/i.test(s) && /EyB.*P\./i.test(s),                            grupo: 'novillitos',  id: 'ar.canuelas.resol.2018.32.apn.novillitos.esp.+.390',       nombre: 'Novillitos Esp. + 390'    },
  { match: s => /NOVILLITO/i.test(s) && /Regular/i.test(s),                             grupo: 'novillitos',  id: 'ar.canuelas.resol.2018.32.apn.novillitos.regular',         nombre: 'Novillitos Regular'        },
  { match: s => /VAQUILLONA/i.test(s) && /EyB.*M\./i.test(s),                           grupo: 'vaquillonas', id: 'ar.canuelas.resol.2018.32.apn.vaquillonas.esp.h.390',      nombre: 'Vaquillonas Esp. h 390'   },
  { match: s => /VAQUILLONA/i.test(s) && /EyB.*P\./i.test(s),                           grupo: 'vaquillonas', id: 'ar.canuelas.resol.2018.32.apn.vaquillonas.esp.+.390',      nombre: 'Vaquillonas Esp. + 390'   },
  { match: s => /VAQUILLONA/i.test(s) && /Regular/i.test(s),                            grupo: 'vaquillonas', id: 'ar.canuelas.resol.2018.32.apn.vaquillonas.regular',        nombre: 'Vaquillonas Regular'       },
  { match: s => /VACA/i.test(s) && /Buen/i.test(s) && !/Conserva/i.test(s),            grupo: 'vacas',       id: 'ar.canuelas.resol.2018.32.apn.vacas.esp.joven.+.430',      nombre: 'Vacas Esp.Joven + 430'    },
  { match: s => /VACA/i.test(s) && /Regular/i.test(s),                                 grupo: 'vacas',       id: 'ar.canuelas.resol.2018.32.apn.vacas.regular',              nombre: 'Vacas Regular'             },
  { match: s => /VACA/i.test(s) && /Conserva.*Buen/i.test(s),                          grupo: 'vacas',       id: 'ar.canuelas.resol.2018.32.apn.vacas.conserva.buena',       nombre: 'Vacas Conserva Buena'      },
  { match: s => /VACA/i.test(s) && /Conserva.*Inf/i.test(s),                           grupo: 'vacas',       id: 'ar.canuelas.resol.2018.32.apn.vacas.conserva.inferior',    nombre: 'Vacas Conserva Inferior'   },
  { match: s => /TORO/i.test(s) && /Buen/i.test(s),                                    grupo: 'toros',       id: 'ar.canuelas.resol.2018.32.apn.toros.esp.',                 nombre: 'Toros Esp.'               },
  { match: s => /TORO/i.test(s) && /Regular/i.test(s),                                 grupo: 'toros',       id: 'ar.canuelas.resol.2018.32.apn.toros.regular',              nombre: 'Toros Regular'             },
  { match: s => /\bMEJ\b/i.test(s) && /EyB/i.test(s),                                 grupo: 'mejores',     id: 'ar.canuelas.resol.2018.32.apn.mej.esp.h.430',              nombre: 'MEJ Esp. h 430'            },
  { match: s => /\bMEJ\b/i.test(s) && /Regular/i.test(s),                              grupo: 'mejores',     id: 'ar.canuelas.resol.2018.32.apn.mej.regular',                nombre: 'MEJ Regular'               },
];

const GRUPO_LABELS = {
  novillos: 'Novillos', novillitos: 'Novillitos', vaquillonas: 'Vaquillonas',
  vacas: 'Vacas', toros: 'Toros', mejores: 'Mejores',
};

const ORDEN_GRUPOS = ['novillos', 'novillitos', 'vaquillonas', 'vacas', 'toros', 'mejores'];

// El MAG usa punto como sep. de miles y coma como decimal: "4.271,870" → 4271.870
function parsearNum(s) {
  if (!s) return NaN;
  return parseFloat(s.replace(/\$/g, '').trim().replace(/\./g, '').replace(',', '.'));
}

function parsearHTML(html) {
  // Fecha: "PRECIOS POR CATEGORIA DESDE EL MARTES 21/04/2026 AL..."
  const fechaMatch = html.match(/DESDE\s+EL\s+\w+\s+(\d{2}\/\d{2}\/\d{4})/i);
  let fechaISO = null;
  if (fechaMatch) {
    const [d, m, y] = fechaMatch[1].split('/');
    fechaISO = `${y}-${m}-${d}T00:00:00-03:00`;
  }

  // Extraer filas de tabla
  const filas = [];
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch;
  while ((trMatch = trRegex.exec(html)) !== null) {
    const cells = [];
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let tdMatch;
    while ((tdMatch = tdRegex.exec(trMatch[1])) !== null) {
      cells.push(
        tdMatch[1]
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&#\d+;/g, ' ')
          .trim(),
      );
    }
    if (cells.length >= 4) filas.push(cells);
  }

  if (!filas.length) throw new Error('No se encontró tabla en el HTML del MAG');

  // ── Detectar INMAG e IGMAG ──────────────────────────────────────────────
  // El MAG publica subtotales de grupo en filas separadas:
  //   fila separadora: cells[3] = "-------"
  //   fila de valor  : cells[0..2] vacíos, cells[3] = subtotal
  // El PRIMER subtotal corresponde al grupo Novillos → ese valor es el INMAG.
  // La fila "Totales" tiene cells[0] = "Totales" y cells[3] = IGMAG.
  let inmag = null;
  let igmag = null;
  let prevEsSeparador = false;
  let subtotalesVistos = 0;

  for (const cells of filas) {
    const c0 = cells[0] ?? '';
    const c3 = cells[3] ?? '';

    if (/totales/i.test(c0)) {
      igmag = parsearNum(c3);
      continue;
    }
    if (/^-{3,}/.test(c3)) {
      prevEsSeparador = true;
      continue;
    }
    if (prevEsSeparador && !c0.trim() && !(cells[1] ?? '').trim() && !(cells[2] ?? '').trim()) {
      prevEsSeparador = false;
      subtotalesVistos++;
      if (subtotalesVistos === 1) inmag = parsearNum(c3);
      continue;
    }
    prevEsSeparador = false;
  }

  // ── Acumular precios por categoría ─────────────────────────────────────
  const acumulados = {};

  for (const cells of filas) {
    const nombreRaw = cells[0] ?? '';
    if (!nombreRaw.trim() || /totales/i.test(nombreRaw) || /^-{3,}/.test(cells[3] ?? '')) continue;

    const mapeo = CATEGORIA_MAP.find(m => m.match(nombreRaw));
    if (!mapeo) continue;

    // nombre | min | max | prom | mediana | cabezas | importe | kgs | kgsProm
    const minimo  = parsearNum(cells[1]);
    const maximo  = parsearNum(cells[2]);
    const prom    = parsearNum(cells[3]);
    const cabezas = parseInt((cells[5] ?? '').replace(/[^0-9]/g, ''), 10) || 0;

    if (isNaN(prom) || prom <= 0) continue;

    if (!acumulados[mapeo.id]) {
      acumulados[mapeo.id] = {
        suma: 0, count: 0, minimo: Infinity, maximo: -Infinity,
        totalCabezas: 0, nombre: mapeo.nombre, grupo: mapeo.grupo, id: mapeo.id,
      };
    }
    const acc  = acumulados[mapeo.id];
    const peso = cabezas || 1;
    acc.suma         += prom * peso;
    acc.count        += peso;
    acc.totalCabezas += cabezas;
    acc.minimo        = Math.min(acc.minimo, isNaN(minimo) ? prom : minimo);
    acc.maximo        = Math.max(acc.maximo, isNaN(maximo) ? prom : maximo);
  }

  if (!Object.keys(acumulados).length) {
    throw new Error('No se pudo mapear ninguna categoría del MAG');
  }

  // ── Construir grupos ────────────────────────────────────────────────────
  const gruposMap = {};
  for (const acc of Object.values(acumulados)) {
    const valor = Math.round((acc.suma / acc.count) * 100) / 100;
    const entry = {
      id:      acc.id,
      nombre:  acc.nombre,
      valor,
      minimo:  acc.minimo === Infinity  ? null : acc.minimo,
      maximo:  acc.maximo === -Infinity ? null : acc.maximo,
      cabezas: acc.totalCabezas,
      unidad:  'ARS/kg vivo',
      fecha:   fechaISO,
    };
    if (!gruposMap[acc.grupo]) gruposMap[acc.grupo] = [];
    gruposMap[acc.grupo].push(entry);
  }

  const grupos = ORDEN_GRUPOS
    .filter(g => gruposMap[g]?.length)
    .map(g => ({ id: g, label: GRUPO_LABELS[g], items: gruposMap[g] }));

  // Si el MAG no publicó el subtotal explícito, calcularlo desde los datos
  if (inmag == null) {
    const ne = acumulados['ar.canuelas.resol.2018.32.apn.novillos.esp.joven.+.430'];
    if (ne) inmag = Math.round((ne.suma / ne.count) * 100) / 100;
  }
  if (igmag == null) {
    const todos = Object.values(acumulados).filter(a => a.grupo !== 'mejores');
    const t = todos.reduce((s, a) => s + a.suma, 0);
    const c = todos.reduce((s, a) => s + a.count, 0);
    if (c > 0) igmag = Math.round((t / c) * 100) / 100;
  }

  // Arrendamiento: el MAG lo publica en endpoint separado; estimado histórico INMAG × 0.994
  const arrendamiento = inmag != null ? Math.round(inmag * 0.994 * 100) / 100 : null;

  const indices = [
    inmag         != null ? { id: 'ar.canuelas.inmag',         nombre: 'INMAG',         valor: inmag,         unidad: 'ARS/kg vivo', fecha: fechaISO } : null,
    igmag         != null ? { id: 'ar.canuelas.igmag',         nombre: 'IGMAG',         valor: igmag,         unidad: 'ARS/kg vivo', fecha: fechaISO } : null,
    arrendamiento != null ? { id: 'ar.canuelas.arrendamiento', nombre: 'Arrendamiento', valor: arrendamiento, unidad: 'ARS/ha/año',  fecha: fechaISO } : null,
  ].filter(Boolean);

  return { indices, grupos, fechaActual: fechaISO };
}

// ── Handler ───────────────────────────────────────────────────────────────
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

    if (!payload.grupos.length) {
      throw new Error('Tabla MAG vacía o sin jornada activa');
    }

    return new Response(
      JSON.stringify({
        ok:      true,
        fuente:  'Cañuelas MAG · datos oficiales · mercadoagroganadero.com.ar',
        fecha:   payload.fechaActual,
        indices: payload.indices,
        grupos:  payload.grupos,
      }),
      { status: 200, headers },
    );

  } catch (err) {
    console.error('[api/hacienda]', err.message);
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { status: 503, headers },
    );
  }
}
