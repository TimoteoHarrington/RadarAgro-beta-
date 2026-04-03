// api/indec.js — Vercel Serverless Function
// Proxea la API de Series de Tiempo de datos.gob.ar
// Fuente: INDEC — EMAE (mensual) y PBI (trimestral)

const API_BASE = process.env.INDEC_API ?? 'https://apis.datos.gob.ar';
const API_PATH = '/series/api/series/';

const EMAE_IDX_ID = '143.3_NO_PR_2004_A_21';
const PBI_IDX_ID  = '4.2_OGP_2004_T_17';

// IDs EMAE (índice mensual, para variación interanual por sector)
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

// IDs VAB por sector a precios corrientes trimestrales (307.2_*)
// Fuente: datos.gob.ar dataset sspm_305, recurso 305.2
const VAB_TOTAL_ID = '307.2_VALOR_AGRECOS_0_T_36';
const VAB_SECTOR_IDS = {
  'Agro, ganadería y silvicultura': '307.2_AGRICULTURTAL_0_T_45',
  'Pesca':                          '307.2_PESCASCA_0_T_5',
  'Explotación minera':             '307.2_EXPLOTACIOTAL_0_T_32',
  'Industria manufacturera':        '307.2_INDUSTRIA_TAL_0_T_29',
  'Electricidad, gas y agua':       '307.2_ELECTRICIDTAL_0_T_27',
  'Construcción':                   '307.2_CONSTRUCCIION_0_T_12',
  'Comercio may. y minorista':      '307.2_COMERCIO_MNES_0_T_41',
  'Hoteles y restaurantes':         '307.2_HOTELES_RETAL_0_T_26',
  'Transporte y comunicaciones':    '307.2_TRANSPORTETAL_0_T_46',
  'Intermediación financiera':      '307.2_INTERMEDIATAL_0_T_31',
  'Servicios inmobiliarios':        '307.2_ACTIVIDADETAL_0_T_54',
  'Administración pública':         '307.2_ADMINISTRANSA_0_T_30',
  'Enseñanza':                      '307.2_ENSENIANZATAL_0_T_16',
  'Salud':                          '307.2_SERVICIOS_TAL_0_T_30',
};

async function fetchSeries(ids, limit = 5) {
  const idsStr = Array.isArray(ids) ? ids.join(',') : ids;
  const url = `${API_BASE}${API_PATH}?ids=${idsStr}&limit=${limit}&sort=desc&format=json&metadata=none`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
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

function extractHistory(apiData) {
  if (!apiData?.data?.length) return [];
  return apiData.data
    .filter(r => r[1] != null)
    .map(r => ({ fecha: r[0], valor: parseFloat(r[1]) }))
    .reverse();
}

function calcInteranualMensual(history) {
  if (history.length < 13) return [];
  return history.slice(12).map((d, i) => ({
    fecha: d.fecha,
    valor: ((d.valor / history[i].valor) - 1) * 100,
  }));
}

function calcInteranualTrimestral(history) {
  if (history.length < 5) return [];
  return history.slice(4).map((d, i) => ({
    fecha: d.fecha,
    valor: ((d.valor / history[i].valor) - 1) * 100,
  }));
}

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, max-age=3600',
};

export default async function handler(req, res) {
  Object.entries(HEADERS).forEach(([k, v]) => res.setHeader(k, v));

  try {
    // VAB sectorial: total + 14 sectores en batches de 5
    const vabSectorNames  = Object.keys(VAB_SECTOR_IDS);
    const vabSectorIdList = Object.values(VAB_SECTOR_IDS);
    const vabAllIds       = [VAB_TOTAL_ID, ...vabSectorIdList];
    const vabBatches      = Array.from(
      { length: Math.ceil(vabAllIds.length / 5) },
      (_, b) => vabAllIds.slice(b * 5, b * 5 + 5)
    );

    const [emaeIdxRes, pbiIdxRes, ...vabBatchResults] = await Promise.allSettled([
      fetchSeries(EMAE_IDX_ID, 36),
      fetchSeries(PBI_IDX_ID, 24),
      ...vabBatches.map(ids => fetchSeries(ids, 4)),
    ]);

    const emaeIdxRaw  = emaeIdxRes.status === 'fulfilled' ? extractHistory(emaeIdxRes.value) : [];
    const emaeHistory = calcInteranualMensual(emaeIdxRaw)
      .map(d => ({ ...d, valor: Math.round(d.valor * 10) / 10 }));

    const lastEmae = emaeHistory.length ? emaeHistory[emaeHistory.length - 1] : null;
    const prevEmae = emaeHistory.length > 1 ? emaeHistory[emaeHistory.length - 2] : null;

    const yearNow    = new Date().getFullYear().toString();
    const thisYearIA = emaeHistory.filter(d => d.fecha.startsWith(yearNow));
    const acumAnio   = thisYearIA.length
      ? Math.round((thisYearIA.reduce((s, d) => s + d.valor, 0) / thisYearIA.length) * 10) / 10
      : null;

    const sectorNames = Object.keys(SECTOR_IDS);
    const sectorIds   = Object.values(SECTOR_IDS);
    const BATCH       = 5;

    // Armar batches
    const batches = [];
    for (let b = 0; b < sectorIds.length; b += BATCH) {
      batches.push({ start: b, ids: sectorIds.slice(b, b + BATCH) });
    }

    // Lanzar todos los batches en paralelo
    const batchResults = await Promise.allSettled(
      batches.map(({ ids }) => fetchSeries(ids, 26).catch(() => null))
    );

    // Reconstruir sectorHistories en orden
    const sectorHistories = new Array(sectorNames.length).fill(null);
    batchResults.forEach((res, bi) => {
      const { start, ids } = batches[bi];
      const result = res.status === 'fulfilled' ? res.value : null;
      if (!result?.data?.length) return;

      for (let i = 0; i < ids.length; i++) {
        const colIdx = i + 1;
        sectorHistories[start + i] = result.data
          .filter(r => r[colIdx] != null)
          .map(r => ({ fecha: r[0], valor: parseFloat(r[colIdx]) }));
      }
    });

    const sectors = [];
    for (let i = 0; i < sectorNames.length; i++) {
      const hist = sectorHistories[i];
      if (!hist || hist.length === 0) continue;

      const fechaActual = hist[0].fecha;
      const valActual   = hist[0].valor;
      const [y, m]      = fechaActual.split('-').map(Number);
      const prefix12    = `${y - 1}-${String(m).padStart(2, '0')}`;
      const row12       = hist.find(r => r.fecha.startsWith(prefix12));

      if (!row12) continue;

      const ia = Math.round(((valActual / row12.valor) - 1) * 1000) / 10;
      sectors.push({ nombre: sectorNames[i], fecha: fechaActual, valor: ia });
    }
    sectors.sort((a, b) => b.valor - a.valor);

    const pbiIdxHistory = pbiIdxRes.status === 'fulfilled' ? extractHistory(pbiIdxRes.value) : [];
    const pbiIaHistory  = calcInteranualTrimestral(pbiIdxHistory);

    const lastPbi = pbiIaHistory.length ? pbiIaHistory[pbiIaHistory.length - 1] : null;
    const prevPbi = pbiIaHistory.length > 1 ? pbiIaHistory[pbiIaHistory.length - 2] : null;

    // ── VAB sectorial: calcular participación % desde la API ─────────────
    // Reconstruir mapa de valores: { id → último valor }
    const vabValueMap = {};
    let batchOffset = 0;
    for (let bi = 0; bi < vabBatches.length; bi++) {
      const batchIds  = vabBatches[bi];
      const batchRes  = vabBatchResults[bi];
      const batchData = batchRes?.status === 'fulfilled' ? batchRes.value : null;
      if (batchData?.data?.length) {
        // La API devuelve columnas: [fecha, col1, col2, ...] por cada id en orden
        const lastRow = batchData.data[0]; // sort=desc → primer registro = más reciente
        batchIds.forEach((id, colIdx) => {
          const val = lastRow[colIdx + 1];
          if (val != null) vabValueMap[id] = parseFloat(val);
        });
      }
      batchOffset += batchIds.length;
    }

    const vabTotal = vabValueMap[VAB_TOTAL_ID] ?? null;
    const pbiSectors = vabSectorNames
      .map(nombre => {
        const id    = VAB_SECTOR_IDS[nombre];
        const valor = vabValueMap[id] ?? null;
        const share = (vabTotal && valor != null)
          ? Math.round((valor / vabTotal) * 1000) / 10  // % con 1 decimal
          : null;
        return { nombre, share, vab: valor };
      })
      .filter(s => s.share != null)
      .sort((a, b) => b.share - a.share);

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
        sectors:       pbiSectors,   // ← participación % real desde API
        vabTotal,                    // ← total VAB en MM$ corrientes
      },
      timestamp: new Date().toISOString(),
    };

    return res.status(200).json(result);
  } catch (error) {
    return res.status(502).json({ error: 'Error al consultar INDEC', message: error.message });
  }
}
