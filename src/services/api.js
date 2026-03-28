// services/api.js — corregido con endpoints correctos
const DOLAR_BASE = 'https://dolarapi.com/v1';
const AD_BASE    = 'https://api.argentinadatos.com/v1';

async function get(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { data: await res.json(), error: null };
  } catch (err) {
    return { data: null, error: err.message };
  }
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

// ── Tasas BCRA ────────────────────────────────────────────
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
