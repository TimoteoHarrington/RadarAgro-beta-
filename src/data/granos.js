// ============================================================
// data/granos.js
// ============================================================
// GRANOS_OVERVIEW — precios de referencia ARS/tn (pizarra Rosario)
// GRANOS_PIZARRAS — tabla de plazas ARS/tn (BCR · Cámara Arbitral)
// NCM_MAP — mapeo NCM → clave interna (para parsear API FOB MAGyP)
//
// NOTA: estos valores son datos estáticos de referencia para widgets
// (IndicesWidget, RetencionesWidget, PizarrasWidget). Los precios en
// vivo de la página Granos provienen 100% de las APIs (/api/fob y
// /api/mundo) y no leen este archivo.
// ============================================================

// Mapeo NCM → clave interna (usado para parsear respuesta de /api/fob)
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

// Precios de referencia por grano (pizarra Rosario, ARS/tn)
// Usados por IndicesWidget y RetencionesWidget para calcular índices
// estructurales (feedlot, relaciones insumo/producto, retenciones).
// Actualizar manualmente cuando los valores se alejen mucho del mercado.
export const GRANOS_OVERVIEW = [
  { id: 'soja',    nombre: 'Soja',    precioARS: 385000, precioUSD: 295 },
  { id: 'maiz',    nombre: 'Maíz',    precioARS: 195000, precioUSD: 150 },
  { id: 'trigo',   nombre: 'Trigo',   precioARS: 220000, precioUSD: 175 },
  { id: 'girasol', nombre: 'Girasol', precioARS: 430000, precioUSD: 340 },
  { id: 'sorgo',   nombre: 'Sorgo',   precioARS: 175000, precioUSD: 135 },
  { id: 'cebada',  nombre: 'Cebada',  precioARS: 200000, precioUSD: 158 },
];

// Precios por plaza (ARS/tn) — referencia BCR · Cámara Arbitral
// Usados por el widget de pizarras en el dashboard.
export const GRANOS_PIZARRAS = [
  {
    producto: 'Soja',
    rosario:  385000,
    bsas:     383000,
    bahia:    380000,
    queq:     379000,
    varPct:   0.8,
    varDir:   'up',
  },
  {
    producto: 'Maíz',
    rosario:  195000,
    bsas:     194000,
    bahia:    192000,
    queq:     191000,
    varPct:   -0.3,
    varDir:   'dn',
  },
  {
    producto: 'Trigo',
    rosario:  220000,
    bsas:     219000,
    bahia:    218000,
    queq:     217000,
    varPct:   0.2,
    varDir:   'up',
  },
  {
    producto: 'Girasol',
    rosario:  430000,
    bsas:     null,
    bahia:    426000,
    queq:     null,
    varPct:   1.1,
    varDir:   'up',
  },
  {
    producto: 'Sorgo',
    rosario:  175000,
    bsas:     174000,
    bahia:    null,
    queq:     null,
    varPct:   -0.5,
    varDir:   'dn',
  },
];
