// ============================================================
// data/granos.js — Mock data for grains (Granos page)
// Replace with real API calls in production
// ============================================================

export const GRANOS_PLAZAS = [
  {
    nombre: 'Soja',
    ciudad: 'Rosario',
    precio: '$456.000',
    variacion: '−1,9%',
    varDir: 'dn',
    delta: '−$9.000 · USD 366/tn',
    meta: 'FAS: USD 307.520 · FOB: USD 396',
    sparkPts: '0,32 12,28 24,24 36,26 48,18 60,20 72,13 80,10',
  },
  {
    nombre: 'Maíz',
    ciudad: 'Rosario',
    precio: '$251.600',
    variacion: '−0,3%',
    varDir: 'dn',
    delta: '−$800 · USD 202/tn',
    meta: 'BsAs $249k · BBca $249,5k · Que $248,5k',
    sparkPts: '0,24 12,26 24,30 36,24 48,20 60,22 72,16 80,14',
  },
  {
    nombre: 'Trigo',
    ciudad: 'Rosario',
    precio: '$248.000',
    variacion: '−1,2%',
    varDir: 'dn',
    delta: '−$3.050 · USD 199/tn',
    meta: 'BsAs $246k · BBca $246k',
    sparkPts: '0,30 12,26 24,22 36,24 48,18 60,16 72,18 80,14',
  },
  {
    nombre: 'Girasol',
    ciudad: 'Rosario',
    precio: '$519.460',
    variacion: '−1,4%',
    varDir: 'dn',
    delta: '−$7.600 · USD 417/tn',
    meta: 'BBca $515k',
    sparkPts: '0,22 12,18 24,15 36,14 48,11 60,12 72,9 80,10',
  },
  {
    nombre: 'Sorgo',
    ciudad: 'Rosario',
    precio: '$218.500',
    variacion: '= 0%',
    varDir: 'fl',
    delta: '= sin cambios',
    meta: 'USD 175/tn',
    sparkPts: '0,20 15,20 30,22 45,20 60,21 75,19 80,20',
  },
];

export const GRANOS_TABLA = [
  { producto: 'Soja',   rosario: '$ 456.000', bsas: 'S/C',        bahia: 'S/C',        queq: 'S/C',        cordoba: 'S/C',        var: '−$9.000',   varDir: 'dn' },
  { producto: 'Maíz',   rosario: '$ 251.600', bsas: '$ 249.000',  bahia: '$ 249.500',  queq: '$ 248.500',  cordoba: '$ 250.200',  var: '−$800',     varDir: 'dn' },
  { producto: 'Trigo',  rosario: '$ 248.000', bsas: '$ 246.000',  bahia: '$ 246.000',  queq: '$ 245.500',  cordoba: 'S/C',        var: '−$3.050',   varDir: 'dn' },
  { producto: 'Girasol',rosario: '$ 519.460', bsas: 'S/C',        bahia: '$ 515.000',  queq: 'S/C',        cordoba: 'S/C',        var: '−$7.600',   varDir: 'dn' },
  { producto: 'Sorgo',  rosario: '$ 218.500', bsas: 'S/C',        bahia: 'S/C',        queq: 'S/C',        cordoba: 'S/C',        var: 'sin cambios',varDir: 'fl' },
  { producto: 'Cebada', rosario: '$ 231.000', bsas: '$ 229.500',  bahia: '$ 228.000',  queq: 'S/C',        cordoba: 'S/C',        var: '+$1.500',   varDir: 'up' },
];

export const CBOT_DATA = [
  { nombre: 'Soja',  usd: '418,9', var: '−1,19', varDir: 'dn', open: '420,1', max: '420,8', min: '417,2', pts: '0,9 14,12 28,7 42,9 56,6' },
  { nombre: 'Maíz',  usd: '185,8', var: '+0,31', varDir: 'up', open: '185,5', max: '186,2', min: '184,9', pts: '0,14 14,12 28,10 42,9 56,8' },
  { nombre: 'Trigo', usd: '203,5', var: '−0,47', varDir: 'dn', open: '204,0', max: '204,5', min: '202,8', pts: '0,10 14,12 28,9 42,9 56,8' },
];

export const HIST_MESES = ['Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic','Ene','Feb'];
export const HIST_SOJA  = [395,388,376,362,351,348,355,362,370,376,368,366];
export const HIST_MAIZ  = [220,218,212,208,204,200,202,206,210,214,208,202];
export const HIST_GIRASOL_D2 = [215,213,208,205,203,200,203,206,208,210,207,209];
