// ============================================================
// data/feriados.js — Feriados Argentina 2026
// ============================================================

export const FERIADOS_2026 = [
  { fecha: '01/01', dia: 'Jueves',   nombre: 'Año Nuevo',                              tipo: 'inamovible' },
  { fecha: '16/02', dia: 'Lunes',    nombre: 'Carnaval',                               tipo: 'inamovible' },
  { fecha: '17/02', dia: 'Martes',   nombre: 'Carnaval',                               tipo: 'inamovible' },
  { fecha: '24/03', dia: 'Martes',   nombre: 'Día Nacional de la Memoria',             tipo: 'inamovible' },
  { fecha: '02/04', dia: 'Jueves',   nombre: 'Malvinas',                               tipo: 'inamovible' },
  { fecha: '03/04', dia: 'Viernes',  nombre: 'Viernes Santo',                          tipo: 'inamovible' },
  { fecha: '01/05', dia: 'Viernes',  nombre: 'Día del Trabajador',                     tipo: 'inamovible' },
  { fecha: '25/05', dia: 'Lunes',    nombre: 'Día de la Patria',                       tipo: 'inamovible' },
  { fecha: '15/06', dia: 'Lunes',    nombre: 'Paso a la Inmortalidad del Gral. Belgrano', tipo: 'puente' },
  { fecha: '09/07', dia: 'Jueves',   nombre: 'Día de la Independencia',                tipo: 'inamovible' },
  { fecha: '17/08', dia: 'Lunes',    nombre: 'Paso a la Inmortalidad del Gral. San Martín', tipo: 'trasladable' },
  { fecha: '12/10', dia: 'Lunes',    nombre: 'Día del Respeto a la Diversidad Cultural', tipo: 'trasladable' },
  { fecha: '20/11', dia: 'Viernes',  nombre: 'Día de la Soberanía Nacional',           tipo: 'trasladable' },
  { fecha: '08/12', dia: 'Martes',   nombre: 'Inmaculada Concepción de María',         tipo: 'inamovible' },
  { fecha: '25/12', dia: 'Viernes',  nombre: 'Navidad',                                tipo: 'inamovible' },
];

// ============================================================
// data/impositivo.js — Retenciones y datos impositivos 2026
// ============================================================

export const RETENCIONES = [
  { producto: 'Soja (poroto)', alicuota: '33%', pizarra: '$456.000', retencion: '−$150.480', neto: '$305.520', danger: true },
  { producto: 'Aceite de soja',alicuota: '33%', pizarra: '—',        retencion: '—',         neto: '—',        danger: true },
  { producto: 'Harina de soja',alicuota: '31%', pizarra: '—',        retencion: '—',         neto: '—',        danger: true },
  { producto: 'Maíz',          alicuota: '12%', pizarra: '$251.600', retencion: '−$30.192',  neto: '$221.408', danger: false },
  { producto: 'Trigo',         alicuota: '12%', pizarra: '$248.000', retencion: '−$29.760',  neto: '$218.240', danger: false },
  { producto: 'Girasol',       alicuota: '7%',  pizarra: '$519.460', retencion: '−$36.362',  neto: '$483.098', danger: false },
  { producto: 'Sorgo',         alicuota: '12%', pizarra: '$218.500', retencion: '−$26.220',  neto: '$192.280', danger: false },
  { producto: 'Cebada',        alicuota: '12%', pizarra: '$231.000', retencion: '−$27.720',  neto: '$203.280', danger: false },
  { producto: 'Colza / Canola',alicuota: '7%',  pizarra: '—',        retencion: '—',         neto: '—',        danger: false },
  { producto: 'Carne vacuna',  alicuota: '9%',  pizarra: '—',        retencion: '—',         neto: '—',        danger: false },
];
