// netlify/functions/indec.js
// Proxea la API de Series de Tiempo de datos.gob.ar
// Fuente: INDEC — EMAE (mensual) y PBI (trimestral)

const API_BASE = 'https://apis.datos.gob.ar';
const API_PATH = '/series/api/series/';

// ── IDs de series ────────────────────────────────────────────
// EMAE General — índice base 2004=100, frecuencia MENSUAL
// Verificado: devuelve datos hasta 2026-01-01 con 265 registros mensuales
const EMAE_IDX_ID = '143.3_NO_PR_2004_A_21';

// PBI trimestral — índice a precios constantes de 2004
// Calculamos interanual manualmente comparando mismo trimestre año anterior
const PBI_IDX_ID  = '4.2_OGP_2004_T_17'; // Oferta Global trimestral (proxy PBI, 88 registros desde 2004)

// Sectores EMAE — índice base 2004=100
const SECTOR_IDS = {
  'Agro, ganadería y silvicultura': '11.3_ISOM_2004_M_39',
  'Pesca':                          '11.3_VIPAA_2004_M_5',
  'Explotación minera':             '11.3_ISD_2004_M_26',
  'Industria manufacturera':        '11.3_VMASD_2004_M_23',
  'Electricidad, gas y agua':       '11.3_ITC_2004_M_21',
  'Construcción':                   '11.3_VMATC_2004_M_12',
  'Comercio may. y minorista':      '11.3_AGCS_2004_M_41',
  'Hoteles y restaurantes':         '11.3_P_2004_M_20',
  'Transporte y comunicaciones':    '11.3_EMC_2004_M_25',
  'Intermediación financiera':      '11.3_IM_2004_M_25',
  'Servicios inmobiliarios':        '11.3_SEGA_2004_M_48',
  'Administración pública':         '11.3_C_2004_M_60',
  'Enseñanza':                      '11.3_CMMR_2004_M_10',
  'Salud':                          '11.3_HR_2004_M_24',
};

// ── fetchSeries ──────────────────────────────────────────────
// Usa fetch global (Node 18+). sort=desc + limit=N → N datos más recientes.
async function fetchSeries(ids, limit = 5) {
  const idsStr = Array.isArray(ids) ? ids.join(',') : ids;
  const url = `${API_BASE}${API_PATH}?ids=${idsStr}&limit=${limit}&sort=desc&format=json&metadata=none`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'RadarAgro/1.0' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// Extrae [{fecha, valor}] de una respuesta de serie única.
// La API devuelve sort=desc → revertimos para orden cronológico ascendente.
function extractHistory(apiData) {
  if (!apiData?.data?.length) return [];
  return apiData.data
    .filter(r => r[1] != null)
    .map(r => ({ fecha: r[0], valor: parseFloat(r[1]) }))
    .reverse();
}

// Calcula variación interanual mensual manualmente:
// compara cada mes con el mismo mes del año anterior (12 períodos atrás).
function calcInteranualMensual(history) {
  if (history.length < 13) return [];
  return history.slice(12).map((d, i) => ({
    fecha: d.fecha,
    valor: ((d.valor / history[i].valor) - 1) * 100,
  }));
}

// Calcula variación interanual trimestral manualmente:
// compara cada trimestre con el mismo trimestre del año anterior (4 períodos atrás).
function calcInteranualTrimestral(history) {
  if (history.length < 5) return [];
  return history.slice(4).map((d, i) => ({
    fecha: d.fecha,
    valor: ((d.valor / history[i].valor) - 1) * 100,
  }));
}

export const handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=3600',
  };

  try {
    console.log('[indec] Fetching EMAE + PBI...');

    // Fetch en paralelo: EMAE índice base 2004=100 (36 meses para calcular IA del primer año) + PBI índice base
    const [emaeIdxRes, pbiIdxRes] = await Promise.allSettled([
      fetchSeries(EMAE_IDX_ID, 36), // 36 meses: 12 de margen + 24 de historia visible
      fetchSeries(PBI_IDX_ID, 24),  // últimos 24 trimestres de índice (para calcular IA manual)
    ]);

    console.log('[indec] emaeIdx:', emaeIdxRes.status,
      emaeIdxRes.status === 'fulfilled'
        ? JSON.stringify(emaeIdxRes.value).slice(0, 250)
        : emaeIdxRes.reason?.message);
    console.log('[indec] pbiIdx:', pbiIdxRes.status,
      pbiIdxRes.status === 'fulfilled'
        ? JSON.stringify(pbiIdxRes.value).slice(0, 250)
        : pbiIdxRes.reason?.message);

    // ── Procesar EMAE general
    // Calculamos la variación interanual mensual desde el índice base 2004=100
    const emaeIdxRaw  = emaeIdxRes.status === 'fulfilled' ? extractHistory(emaeIdxRes.value) : [];
    const emaeHistory = calcInteranualMensual(emaeIdxRaw)
      .map(d => ({ ...d, valor: Math.round(d.valor * 10) / 10 }));

    const lastEmae   = emaeHistory.length ? emaeHistory[emaeHistory.length - 1] : null;
    const prevEmae   = emaeHistory.length > 1 ? emaeHistory[emaeHistory.length - 2] : null;

    const yearNow    = new Date().getFullYear().toString();
    const thisYearIA = emaeHistory.filter(d => d.fecha.startsWith(yearNow));
    const acumAnio   = thisYearIA.length
      ? Math.round((thisYearIA.reduce((s, d) => s + d.valor, 0) / thisYearIA.length) * 10) / 10
      : null;

    // ── Fetch sectores: de a 5 IDs por request para no saturar la API
    const sectorNames  = Object.keys(SECTOR_IDS);
    const sectorIds    = Object.values(SECTOR_IDS);
    const BATCH        = 5;  // máx IDs por request
    const sectorHistories = new Array(sectorNames.length).fill(null);

    for (let b = 0; b < sectorIds.length; b += BATCH) {
      const batchNames = sectorNames.slice(b, b + BATCH);
      const batchIds   = sectorIds.slice(b, b + BATCH);

      const res = await fetchSeries(batchIds, 26).catch(e => {
        console.log(`[indec] sectores batch ${b} error:`, e.message);
        return null;
      });

      console.log(`[indec] sectores batch ${b}:`, res ? 'ok' : 'error',
        res ? JSON.stringify(res).slice(0, 300) : '');

      if (!res?.data?.length) continue;

      // Multiserie y serie única: data = [[fecha, val0, val1?, ...], ...]
      // sort=desc → [0] = más reciente. NO filtramos nulls aquí para preservar
      // la alineación temporal: cada fila representa un mes concreto.
      for (let i = 0; i < batchIds.length; i++) {
        const colIdx = i + 1;
        // Guardamos solo las filas donde esta columna tiene valor real
        const hist = res.data
          .filter(r => r[colIdx] != null)
          .map(r => ({ fecha: r[0], valor: parseFloat(r[colIdx]) }));
        // hist ya viene sort=desc: hist[0] = dato más reciente con valor real
        sectorHistories[b + i] = hist;
      }
    }

    // ── Calcular variación interanual por sector
    const sectors = [];
    for (let i = 0; i < sectorNames.length; i++) {
      const hist = sectorHistories[i];
      if (!hist || hist.length === 0) {
        console.log(`[indec] sector ${sectorNames[i]}: sin datos`);
        continue;
      }

      // hist viene sort=desc: [0] = más reciente
      const fechaActual = hist[0].fecha;
      const valActual   = hist[0].valor;

      // Buscar el mismo mes del año anterior por prefijo YYYY-MM
      const [y, m] = fechaActual.split('-').map(Number);
      const prefix12 = `${y - 1}-${String(m).padStart(2, '0')}`;
      const row12    = hist.find(r => r.fecha.startsWith(prefix12));

      console.log(`[indec] sector ${sectorNames[i]}: fecha=${fechaActual} val=${valActual} fecha12=${prefix12} row12=${row12?.valor ?? 'NOT FOUND'} histLen=${hist.length}`);

      if (!row12) continue;

      const ia = Math.round(((valActual / row12.valor) - 1) * 1000) / 10;
      sectors.push({ nombre: sectorNames[i], fecha: fechaActual, valor: ia });
    }
    sectors.sort((a, b) => b.valor - a.valor);
    console.log('[indec] sectores procesados:', sectors.length, sectors.map(s => s.nombre + ':' + s.valor));

    // ── Procesar PBI
    const pbiIdxHistory = pbiIdxRes.status === 'fulfilled' ? extractHistory(pbiIdxRes.value) : [];
    const pbiIaHistory  = calcInteranualTrimestral(pbiIdxHistory);

    const lastPbi = pbiIaHistory.length ? pbiIaHistory[pbiIaHistory.length - 1] : null;
    const prevPbi = pbiIaHistory.length > 1 ? pbiIaHistory[pbiIaHistory.length - 2] : null;

    const result = {
      emae: {
        general: {
          valor:         lastEmae?.valor ?? null,
          valorAnterior: prevEmae?.valor ?? null,
          fecha:         lastEmae?.fecha ?? null,
          fechaAnterior: prevEmae?.fecha ?? null,
        },
        acumAnio,
        anoAcum:   yearNow,
        mesesAcum: thisYearIA.length,
        history:   emaeHistory,
        sectors,
      },
      pbi: {
        lastIa:        lastPbi  ? Math.round(lastPbi.valor * 10) / 10  : null,
        prevIa:        prevPbi  ? Math.round(prevPbi.valor * 10) / 10  : null,
        fecha:         lastPbi?.fecha ?? null,
        fechaAnterior: prevPbi?.fecha ?? null,
        history:       pbiIaHistory.map(d => ({ ...d, valor: Math.round(d.valor * 10) / 10 })),
      },
      timestamp: new Date().toISOString(),
    };

    console.log('[indec] ✓ EMAE:', result.emae.general, '| PBI:', result.pbi.lastIa, result.pbi.fecha, '| Sectores:', sectors.length);

    return { statusCode: 200, headers, body: JSON.stringify(result) };

  } catch (error) {
    console.error('[indec] Error general:', error.message);
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ error: 'Error al consultar INDEC', message: error.message }),
    };
  }
};
