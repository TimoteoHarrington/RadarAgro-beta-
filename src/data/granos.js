// ============================================================
// data/granos.js — Sin datos mock
// Todos los datos provienen de APIs en vivo:
//   FOB: MAGyP Ley 21.453 (/api/fob)
//   CBOT/Futuros: Yahoo Finance (vía /api/mundo)
//   Matba-Rofex: sin API pública disponible → no se muestra
//   Pizarras locales: sin API pública disponible → no se muestran
//   Histórico: sin API pública disponible → no se muestra
// ============================================================

// Único dato estructural que se mantiene: el mapeo NCM → clave interna
// (no es un precio, es una tabla de configuración)
export const NCM_MAP = {
  '1201': 'soja',
  '1005': 'maiz',
  '1001': 'trigo',
  '1206': 'girasol',
  '1003': 'cebada',
  '1007': 'sorgo',
  '2304': 'harina_soja',
  '1507': 'aceite_soja',
};
