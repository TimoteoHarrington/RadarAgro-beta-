// services/api.js
const DOLAR_BASE  = 'https://dolarapi.com/v1';
const AD_BASE     = 'https://api.argentinadatos.com/v1';
const SERIES_BASE = 'https://apis.datos.gob.ar/series/api';
const BCRA_BASE   = 'https://api.bcra.gob.ar/estadisticas/v2.0';
const EBCRA_BASE  = 'https://api.estadisticasbcra.com';
const EBCRA_TOKEN = 'eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE4MDYxOTc4OTMsInR5cGUiOiJleHRlcm5hbCIsInVzZXIiOiJqb2luZXJoZWRtYW5AZ21haWwuY29tIn0.sENLFWz-Jk0bLZEFVvGb4zBzaxIm3J0dYEqxXa10FP8ww6K8GRqMIw7SJ43Sc3jzB5UdsFLHXMPiGbpFMxA';

async function get(url, headers = {}) {
  try {
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { data: await res.json(), error: null };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

async function getEBCRA(path) {
  return get(`${EBCRA_BASE}${path}`, {
    Authorization: `BEARER ${EBCRA_TOKEN}`,
  });
}

// ── Dólares (DolarApi.com) ────────────────────────────────
export async function fetchDolares() {
  return get(`${DOLAR_BASE}/dolares`);
}

// ── UVA ───────────────────────────────────────────────────
export async function fetchUVA() {
  return get(`${AD_BASE}/finanzas/indices/uva`);
}

// ── Inflación IPC ─────────────────────────────────────────
export async function fetchInflacion() {
  return get(`${AD_BASE}/finanzas/indices/inflacion`);
}
export async function fetchInflacionInteranual() {
  return get(`${AD_BASE}/finanzas/indices/inflacionInteranual`);
}

// ── Tasas BCRA (ArgentinaDatos) ───────────────────────────
export async function fetchTasasPlazoFijo() {
  return get(`${AD_BASE}/finanzas/tasas/plazoFijo`);
}
export async function fetchTasasDepositos() {
  return get(`${AD_BASE}/finanzas/tasas/depositos30Dias`);
}

// ── Riesgo País ───────────────────────────────────────────
export async function fetchRiesgoPais() {
  return get(`${AD_BASE}/finanzas/indices/riesgo-pais`);
}
export async function fetchRiesgoPaisUltimo() {
  return get(`${AD_BASE}/finanzas/indices/riesgo-pais/ultimo`);
}

// ── Feriados ──────────────────────────────────────────────
export async function fetchFeriados(year = 2026) {
  return get(`${AD_BASE}/feriados/${year}`);
}

// ── EMAE — Series de Tiempo INDEC (datos.gob.ar) ─────────
// Serie 11.3_VMATC_2004_M_12 = variación % interanual mensual
export async function fetchEmae() {
  return get(
    `${SERIES_BASE}/series/?ids=11.3_VMATC_2004_M_12&limit=60&format=json&sort=asc`
  );
}

// ── BCRA Oficial — Variables principales ─────────────────
export async function fetchBCRAVariables() {
  return get(`${BCRA_BASE}/principalesvariables`);
}
export async function fetchBCRAVariable(idVariable, desde, hasta) {
  return get(`${BCRA_BASE}/datosvariable/${idVariable}/${desde}/${hasta}`);
}

// ── EstadísticasBCRA — Reservas históricas ───────────────
export async function fetchReservas() {
  return getEBCRA('/reservas');
}

// ── EstadísticasBCRA — Base Monetaria ────────────────────
export async function fetchBaseMonetaria() {
  return getEBCRA('/base');
}

// ── EstadísticasBCRA — Merval ────────────────────────────
export async function fetchMerval() {
  return getEBCRA('/merval');
}
export async function fetchMervalUSD() {
  return getEBCRA('/merval_usd');
}

// ── EstadísticasBCRA — Tasas ─────────────────────────────
export async function fetchTasaBADLAR() {
  return getEBCRA('/tasa_badlar');
}
export async function fetchTasaPoliticaMonetaria() {
  return getEBCRA('/tasa_pase_pasivas_1_dia');
}
