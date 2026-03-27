// ============================================================
// data/indices.js — Índices & precios relativos mock data
// ============================================================

export const MESES_24 = [
  'Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic','Ene',
  'Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic','Ene','Feb'
];

export const IDX_FEEDLOT = [13.8,14.2,14.6,15.2,15.8,16.1,15.8,16.4,17.2,18.1,18.4,17.9,18.2,18.8,19.1,19.4,19.6,19.8,19.4,19.7,19.9,19.8,19.9,19.8,19.8];
export const IDX_CRIA    = [1.22,1.24,1.26,1.29,1.28,1.28,1.30,1.31,1.30,1.33,1.34,1.33,1.35,1.34,1.35,1.36,1.35,1.37,1.36,1.37,1.36,1.37,1.37,1.37,1.37];
export const IDX_SOJAUREA= [1.12,1.11,1.10,1.08,1.07,1.10,1.05,1.03,1.00,0.99,0.97,0.96,0.97,0.96,0.95,0.96,0.94,0.95,0.96,0.94,0.95,0.94,0.94,0.94,0.94];

export const IDX_MAIZ_SOJA    = [0.521,0.528,0.530,0.534,0.536,0.533,0.540,0.544,0.548,0.546,0.542,0.545,0.548,0.550,0.547,0.548,0.549,0.551,0.550,0.552,0.551,0.552,0.553,0.552,0.552];
export const IDX_TRIGO_MAIZ   = [0.971,0.975,0.978,0.978,0.980,0.982,0.983,0.980,0.984,0.986,0.988,0.990,0.992,0.990,0.994,0.993,0.992,0.991,0.990,0.989,0.988,0.987,0.986,0.986,0.986];
export const IDX_GASOIL_SOJA  = [0.330,0.333,0.336,0.342,0.344,0.347,0.349,0.352,0.355,0.356,0.358,0.360,0.351,0.353,0.356,0.358,0.360,0.362,0.361,0.363,0.363,0.364,0.365,0.365,0.365];

// ============================================================
// data/macro.js — Argentina macro indicators (mock)
// ============================================================

export const MACRO_KPIS = [
  { eyebrow: 'IPC · ENE 2026', val: '2,4%', valClass: '', delta: '▼ vs 3,7% dic', deltaDir: 'up', meta: 'Acum. 2025: 117%', bar: 24, barColor: 'var(--red)', featured: true },
  { eyebrow: 'PBI 2025',        val: '+5,5%', valClass: '',  delta: '▲ vs −1,6% 2024', deltaDir: 'up', meta: 'Recuperación post-ajuste', bar: 55, barColor: 'var(--green)' },
  { eyebrow: 'RIESGO PAÍS',     val: '589',   valClass: '',  delta: '▼ 12 pb hoy',      deltaDir: 'up', meta: 'EMBI+ · puntos básicos', bar: 30, barColor: 'var(--accent)' },
  { eyebrow: 'RESERVAS BCRA',   val: 'USD 28.400M', valClass: 'sm', delta: '▲ +$210M',  deltaDir: 'up', meta: 'Brutas · al 21-feb-2026', bar: 47, barColor: 'var(--blue)' },
  { eyebrow: 'TIPO DE CAMBIO',  val: '$1.246', valClass: '', delta: '▲ +$8 hoy',         deltaDir: 'dn', meta: 'Mayorista BNA · +0,6%', bar: 62, barColor: 'var(--gold)' },
  { eyebrow: 'DESEMPLEO T3/25', val: '5,8%',  valClass: '',  delta: '▼ vs 7,1% T3/24',  deltaDir: 'up', meta: 'EPH · INDEC', bar: 58, barColor: 'var(--green)' },
];

export const INFLACION_MESES = [
  { mes: 'Feb 2025', main: 2.4, core: 2.8, alim: 2.1, ia: 81.2, latest: false, best: false },
  { mes: 'Mar 2025', main: 3.7, core: 4.1, alim: 3.9, ia: 71.4, latest: false, best: false },
  { mes: 'Abr 2025', main: 3.3, core: 3.6, alim: 3.2, ia: 62.1, latest: false, best: false },
  { mes: 'May 2025', main: 3.3, core: 3.5, alim: 3.1, ia: 57.3, latest: false, best: false },
  { mes: 'Jun 2025', main: 3.3, core: 3.6, alim: 3.3, ia: 52.4, latest: false, best: false },
  { mes: 'Jul 2025', main: 2.7, core: 2.9, alim: 2.5, ia: 46.8, latest: false, best: false },
  { mes: 'Ago 2025', main: 2.7, core: 2.9, alim: 2.6, ia: 41.2, latest: false, best: false },
  { mes: 'Sep 2025', main: 3.5, core: 3.8, alim: 3.4, ia: 40.8, latest: false, best: false },
  { mes: 'Oct 2025', main: 2.4, core: 2.6, alim: 2.2, ia: 35.6, latest: false, best: true  },
  { mes: 'Nov 2025', main: 2.4, core: 2.6, alim: 2.2, ia: 30.2, latest: false, best: true  },
  { mes: 'Dic 2025', main: 2.7, core: 2.9, alim: 2.6, ia: 28.4, latest: false, best: false },
  { mes: 'Ene 2026', main: 2.4, core: 2.7, alim: 2.3, ia: 25.8, latest: true,  best: true  },
];
