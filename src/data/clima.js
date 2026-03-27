// ============================================================
// data/clima.js — Mock weather data (7-day forecast)
// ============================================================

export const CLIMA_DIAS = [
  { dia: 'HOY',  fecha: 'DOM 23/2',  icono: '⛅', max: '28°', min: '18°', mm: '4 mm',  lluvia: true,  today: true },
  { dia: 'LUN',  fecha: '24/2',      icono: '🌤', max: '31°', min: '20°', mm: '0 mm',  lluvia: false },
  { dia: 'MAR',  fecha: '25/2',      icono: '☀️', max: '33°', min: '22°', mm: '0 mm',  lluvia: false },
  { dia: 'MIÉ',  fecha: '26/2',      icono: '🌧', max: '24°', min: '17°', mm: '18 mm', lluvia: true  },
  { dia: 'JUE',  fecha: '27/2',      icono: '⛈', max: '22°', min: '15°', mm: '35 mm', lluvia: true  },
  { dia: 'VIE',  fecha: '28/2',      icono: '🌦', max: '26°', min: '16°', mm: '8 mm',  lluvia: true  },
  { dia: 'SÁB',  fecha: '1/3',       icono: '☀️', max: '30°', min: '19°', mm: '0 mm',  lluvia: false },
];

export const CLIMA_ALERTAS = [
  { tipo: 'warn', texto: 'Alerta amarilla por tormentas intensas — JUE 27/2 · zona núcleo pampeana' },
];
