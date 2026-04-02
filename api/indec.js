// api/indec.js — Vercel Serverless Function
// Proxea la API de Series de Tiempo de datos.gob.ar
// Fuente: INDEC — EMAE (mensual) y PBI (trimestral)

const API_BASE = 'https://apis.datos.gob.ar';
const API_PATH = '/series/api/series/';

const EMAE_IDX_ID = '143.3_NO_PR_2004_A_21';
const PBI_IDX_ID  = '4.2_OGP_2004_T_17';

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
    const [emaeIdxRes, pbiIdxRes] = await Promise.allSettled([
      fetchSeries(EMAE_IDX_ID, 36),
      fetchSeries(PBI_IDX_ID, 24),
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

    return res.status(200).json(result);
  } catch (error) {
    return res.status(502).json({ error: 'Error al consultar INDEC', message: error.message });
  }
}
