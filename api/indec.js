// api/indec.js — Vercel Serverless Function
// Proxea la API de Series de Tiempo de datos.gob.ar
// Fuente: INDEC — EMAE (mensual) y PBI (trimestral)

const API_BASE = process.env.INDEC_API ?? 'https://apis.datos.gob.ar';
const API_PATH = '/series/api/series/';

const EMAE_IDX_ID = '143.3_NO_PR_2004_A_21';
const PBI_IDX_ID  = '4.2_OGP_2004_T_17';

// IDs EMAE (índice mensual, para variación interanual por sector)
const SECTOR_IDS = {
  'Agric., ganadería, caza y silvicultura': '11.3_ISOM_2004_M_39',
  'Pesca':                                  '11.3_VIPAA_2004_M_5',
  'Explotación de minas y canteras':        '11.3_ISD_2004_M_26',
  'Industria manufacturera':                '11.3_VMASD_2004_M_23',
  'Electricidad, gas y agua':               '11.3_ITC_2004_M_21',
  'Construcción':                           '11.3_VMATC_2004_M_12',
  'Comercio may., minorista y reparac.':    '11.3_AGCS_2004_M_41',
  'Hoteles y restaurantes':                 '11.3_P_2004_M_20',
  'Transporte y comunicaciones':            '11.3_EMC_2004_M_25',
  'Intermediación financiera':              '11.3_IM_2004_M_25',
  'Act. inmobiliarias, empres. y alquiler': '11.3_SEGA_2004_M_48',
  'Adm. pública, defensa y seg. social':   '11.3_C_2004_M_60',
  'Enseñanza':                              '11.3_CMMR_2004_M_10',
  'Servicios sociales y de salud':          '11.3_HR_2004_M_24',
};

const VAB_TOTAL_ID = '305.2_VALOR_AGRECOS_0_36'; // VAB total a precios corrientes trimestrales · sspm_305.2
// IDs VAB por sector a precios corrientes trimestrales
// Fuente: datos.gob.ar · dataset sspm_305 · recurso 305.2
// 17 sectores completos (A–P) según clasificación INDEC Cuentas Nacionales
const VAB_SECTOR_IDS = {
  'Agric., ganadería, caza y silvicultura': '305.2_AGRI_GANADTAL_0_27',
  'Pesca':                                  '305.2_PESCASCA_0_5',
  'Explotación de minas y canteras':        '305.2_EXPLO_MINATAL_0_22',
  'Industria manufacturera':                '305.2_IND_MANUFATAL_0_17',
  'Electricidad, gas y agua':               '305.2_ELEC_GAS_ATAL_0_19',
  'Construcción':                           '305.2_CONSTRUCCIION_0_12',
  'Comercio may., minorista y reparac.':    '305.2_COMERCIO_MNES_0_41',
  'Hoteles y restaurantes':                 '305.2_HOTELES_RETAL_0_20',
  'Transporte y comunicaciones':            '305.2_TRANSP_COMTAL_0_17',
  'Intermediación financiera':              '305.2_INTERMEDIATAL_0_26',
  'Act. inmobiliarias, empres. y alquiler': '305.2_ACT_INMOBITAL_0_36',
  'Adm. pública, defensa y seg. social':   '305.2_ADM_PUB_DERIA_0_59',
  'Enseñanza':                              '305.2_ENSENIANZATAL_0_16',
  'Servicios sociales y de salud':          '305.2_SERV_SOC_STAL_0_20',
  'Otras act. serv. comunit. y personales': '305.2_OTRAS_ACT_TAL_0_42',
  'Hogares privados con serv. doméstico':   '305.2_HOGARES_PRICO_0_39',
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
      ...vabBatches.map(ids => fetchSeries(ids, 8)),  // 8 filas = margen para nulls por lag
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
    // Para cada batch, buscar el primer valor no-null por columna (las series
    // pueden tener distinto lag y data[0] puede ser null para algunas)
    const vabValueMap = {};
    for (let bi = 0; bi < vabBatches.length; bi++) {
      const batchIds  = vabBatches[bi];
      const batchRes  = vabBatchResults[bi];
      const batchData = batchRes?.status === 'fulfilled' ? batchRes.value : null;
      if (!batchData?.data?.length) continue;

      batchIds.forEach((id, colIdx) => {
        // Buscar primera fila donde esta columna no sea null
        for (const row of batchData.data) {
          const val = row[colIdx + 1];
          if (val != null) {
            vabValueMap[id] = parseFloat(val);
            break;
          }
        }
      });
    }

    const vabTotal = vabValueMap[VAB_TOTAL_ID] ?? null;

    // Calcular share sobre la suma de sectores (no sobre vabTotal que incluye impuestos netos)
    // para que los porcentajes sumen 100%
    const vabSectorValues = vabSectorNames.map(nombre => ({
      nombre,
      vab: vabValueMap[VAB_SECTOR_IDS[nombre]] ?? null,
    }));
    const vabSectoresSum = vabSectorValues.reduce((s, x) => s + (x.vab ?? 0), 0) || null;

    const pbiSectors = vabSectorValues
      .map(({ nombre, vab }) => {
        const share = (vabSectoresSum && vab != null)
          ? Math.round((vab / vabSectoresSum) * 1000) / 10
          : null;
        return { nombre, share, vab };
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
        sectors:       pbiSectors,
        vabTotal,
      },
      timestamp: new Date().toISOString(),
    };

    return res.status(200).json(result);
  } catch (error) {
    return res.status(502).json({ error: 'Error al consultar INDEC', message: error.message });
  }
}
