// ============================================================
// data/hacienda.js — Mock data based on Downtack API coverage
// Replace with real API calls in production
// Endpoints: /api/hacienda/{category}
// ============================================================

// ── OVERVIEW — Mejores precios por categoría principal ───────
export const HACIENDA_OVERVIEW = [
  { id:'novillo',     nombre:'Novillo Esp.',    subcategoria:'Esp.joven + 430kg', precio:5650, var:+2.7, varDir:'up', unidad:'ARS/kg vivo', fuente:'Cañuelas' },
  { id:'novillito',   nombre:'Novillito Esp.',  subcategoria:'Esp. H 390kg',      precio:5800, var:+3.2, varDir:'up', unidad:'ARS/kg vivo', fuente:'Cañuelas' },
  { id:'vaquillona',  nombre:'Vaquillona Esp.', subcategoria:'Esp. H 390kg',      precio:5400, var:+2.8, varDir:'up', unidad:'ARS/kg vivo', fuente:'Cañuelas' },
  { id:'vaca',        nombre:'Vaca Esp.',       subcategoria:'Esp.joven + 430kg', precio:4200, var:+1.5, varDir:'up', unidad:'ARS/kg vivo', fuente:'Cañuelas' },
  { id:'rosgan-inv',  nombre:'ROSGAN Inv.',     subcategoria:'Índice invernada',  precio:6250, var:+4.1, varDir:'up', unidad:'ARS/kg vivo', fuente:'ROSGAN' },
  { id:'canuelas-inmag', nombre:'Cañuelas INMAG', subcategoria:'Índice mercado', precio:5480, var:+2.4, varDir:'up', unidad:'ARS/kg vivo', fuente:'Cañuelas' },
];

// ── NOVILLOS — Categorías del PDF ───────────────────────────
export const HACIENDA_NOVILLOS = [
  { categoria:'Novillo Esp.joven + 430kg', minimo:5400, maximo:5900, promedio:5650, semAnterior:5500, varPct:+2.7, varDir:'up', fuente:'Cañuelas' },
  { categoria:'Novillo Regular H 430kg',   minimo:5000, maximo:5500, promedio:5250, semAnterior:5100, varPct:+2.9, varDir:'up', fuente:'Cañuelas' },
  { categoria:'Novillo Regular + 430kg',   minimo:5100, maximo:5600, promedio:5350, semAnterior:5200, varPct:+2.9, varDir:'up', fuente:'Cañuelas' },
];

// ── NOVILLITOS ───────────────────────────────────────────────
export const HACIENDA_NOVILLITOS = [
  { categoria:'Novillito Esp. H 390kg',  minimo:5600, maximo:6000, promedio:5800, semAnterior:5620, varPct:+3.2, varDir:'up', fuente:'Cañuelas' },
  { categoria:'Novillito Esp. + 390kg',  minimo:5700, maximo:6100, promedio:5900, semAnterior:5710, varPct:+3.3, varDir:'up', fuente:'Cañuelas' },
  { categoria:'Novillito Regular',       minimo:5200, maximo:5600, promedio:5400, semAnterior:5240, varPct:+3.1, varDir:'up', fuente:'Cañuelas' },
];

// ── VAQUILLONAS ──────────────────────────────────────────────
export const HACIENDA_VAQUILLONAS = [
  { categoria:'Vaquillona Esp. H 390kg', minimo:5200, maximo:5600, promedio:5400, semAnterior:5250, varPct:+2.9, varDir:'up', fuente:'Cañuelas' },
  { categoria:'Vaquillona Esp. + 390kg', minimo:5300, maximo:5700, promedio:5500, semAnterior:5340, varPct:+3.0, varDir:'up', fuente:'Cañuelas' },
  { categoria:'Vaquillona Regular',      minimo:4800, maximo:5200, promedio:5000, semAnterior:4860, varPct:+2.9, varDir:'up', fuente:'Cañuelas' },
];

// ── VACAS ────────────────────────────────────────────────────
export const HACIENDA_VACAS = [
  { categoria:'Vaca Esp.joven H 430kg',  minimo:4000, maximo:4400, promedio:4200, semAnterior:4140, varPct:+1.4, varDir:'up', fuente:'Cañuelas' },
  { categoria:'Vaca Esp.joven + 430kg',  minimo:4100, maximo:4500, promedio:4300, semAnterior:4240, varPct:+1.4, varDir:'up', fuente:'Cañuelas' },
  { categoria:'Vaca Regular',            minimo:3400, maximo:3800, promedio:3600, semAnterior:3600, varPct:0.0,  varDir:'fl', fuente:'Cañuelas' },
  { categoria:'Vaca Conserva Buena',     minimo:3000, maximo:3400, promedio:3200, semAnterior:3270, varPct:-2.1, varDir:'dn', fuente:'Cañuelas' },
  { categoria:'Vaca Conserva Inferior',  minimo:2400, maximo:2800, promedio:2600, semAnterior:2680, varPct:-3.0, varDir:'dn', fuente:'Cañuelas' },
];

// ── TOROS ────────────────────────────────────────────────────
export const HACIENDA_TOROS = [
  { categoria:'Toro Esp.',     minimo:3800, maximo:4200, promedio:4000, semAnterior:4100, varPct:-2.4, varDir:'dn', fuente:'Cañuelas' },
  { categoria:'Toro Regular',  minimo:2800, maximo:3200, promedio:3000, semAnterior:3100, varPct:-3.2, varDir:'dn', fuente:'Cañuelas' },
];

// ── MEJORES ──────────────────────────────────────────────────
export const HACIENDA_MEJORES = [
  { categoria:'Mej Esp. H 430kg', minimo:5500, maximo:5900, promedio:5700, semAnterior:5530, varPct:+3.1, varDir:'up', fuente:'Cañuelas' },
  { categoria:'Mej Regular',      minimo:5000, maximo:5400, promedio:5200, semAnterior:5060, varPct:+2.8, varDir:'up', fuente:'Cañuelas' },
];

// ── CAÑUELAS INDICADORES ─────────────────────────────────────
export const HACIENDA_CANUELAS = [
  {
    id:'inmag',
    nombre:'INMAG',
    descripcion:'Índice de Novillo MAGna - precio de referencia de novillos especiales',
    precio:5480,
    semAnterior:5352,
    mesAnterior:5100,
    var1s:+2.4, var1sDir:'up',
    var1m:+7.5, var1mDir:'up',
    var3m:+18.2, var3mDir:'up',
    histPrecio:[4200,4350,4480,4550,4680,4780,4850,4920,5010,5100,5352,5480],
  },
  {
    id:'igmag',
    nombre:'IGMAG',
    descripcion:'Índice General MAGna - promedio ponderado del mercado Cañuelas',
    precio:4820,
    semAnterior:4705,
    mesAnterior:4520,
    var1s:+2.4, var1sDir:'up',
    var1m:+6.6, var1mDir:'up',
    var3m:+14.8, var3mDir:'up',
    histPrecio:[3800,3950,4050,4120,4220,4310,4380,4450,4520,4620,4705,4820],
  },
  {
    id:'arrendamiento',
    nombre:'Arrendamiento',
    descripcion:'Índice de arrendamiento en equivalente hacienda - ARS/ha/año',
    precio:142000,
    semAnterior:138500,
    mesAnterior:130000,
    var1s:+2.5, var1sDir:'up',
    var1m:+9.2, var1mDir:'up',
    var3m:+22.4, var3mDir:'up',
    unidad:'ARS/ha/año',
    histPrecio:[105000,108000,112000,115000,118000,121000,124000,127000,130000,135000,138500,142000],
  },
];

// ── ROSGAN INDICADORES ───────────────────────────────────────
export const HACIENDA_ROSGAN = [
  {
    id:'invernada',
    nombre:'ROSGAN Invernada',
    descripcion:'Índice de precios de hacienda para invernada - Rosario',
    precio:6250,
    semAnterior:6002,
    mesAnterior:5680,
    var1s:+4.1, var1sDir:'up',
    var1m:+10.0, var1mDir:'up',
    var3m:+24.5, var3mDir:'up',
    histPrecio:[4500,4680,4820,4950,5080,5180,5300,5420,5550,5680,6002,6250],
    composicion:[
      { cat:'Novillitos',    peso:35, precio:5900 },
      { cat:'Terneros',      peso:30, precio:6800 },
      { cat:'Vaquillonas',   peso:20, precio:5500 },
      { cat:'Terneras',      peso:15, precio:5800 },
    ],
  },
  {
    id:'cria',
    nombre:'ROSGAN Cría',
    descripcion:'Índice de precios de hacienda de cría - Rosario',
    precio:5820,
    semAnterior:5598,
    mesAnterior:5310,
    var1s:+4.0, var1sDir:'up',
    var1m:+9.6, var1mDir:'up',
    var3m:+23.1, var3mDir:'up',
    histPrecio:[4200,4350,4480,4580,4700,4800,4900,5000,5120,5310,5598,5820],
    composicion:[
      { cat:'Vacas cría',   peso:45, precio:4500 },
      { cat:'Terneros',     peso:30, precio:6800 },
      { cat:'Toros',        peso:10, precio:4000 },
      { cat:'Vaquillonas',  peso:15, precio:5500 },
    ],
  },
  {
    id:'cat-multiples',
    nombre:'ROSGAN Cat. Múltiples',
    descripcion:'Subasta con categorías múltiples - precio promedio ponderado',
    precio:5580,
    semAnterior:5360,
    mesAnterior:5080,
    var1s:+4.1, var1sDir:'up',
    var1m:+9.8, var1mDir:'up',
    var3m:+21.7, var3mDir:'up',
    histPrecio:[4100,4250,4380,4480,4600,4700,4800,4900,5000,5080,5360,5580],
  },
];

// ── HISTÓRICO 12 meses por categoría ────────────────────────
export const HIST_MESES_HAC = ['Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic','Ene','Feb'];
export const HIST_NOVILLO_ESP   = [3100,3280,3450,3620,3780,3900,4050,4200,4420,4680,5200,5650];
export const HIST_NOVILLITO_ESP = [3300,3500,3680,3860,4020,4160,4320,4500,4750,5000,5620,5800];
export const HIST_VAQUILLONA    = [2900,3080,3240,3380,3520,3640,3780,3940,4160,4400,5250,5400];
export const HIST_VACA_ESP      = [2500,2650,2780,2900,3010,3100,3220,3340,3520,3740,4140,4200];
export const HIST_ROSGAN_INV    = [3600,3800,3980,4160,4350,4500,4680,4880,5120,5420,6002,6250];

// ── BACKWARD COMPAT (legacy) ─────────────────────────────────
export const HACIENDA_INVERNADA = [
  { cat:'Novillitos 390 kg', precio:5800, var:'+3,2%', varDir:'up', sub:'Cañuelas · ARS/kg vivo' },
  { cat:'Novillos + 430 kg', precio:5650, var:'+2,7%', varDir:'up', sub:'Cañuelas · ARS/kg vivo' },
  { cat:'Vaquillonas 390 kg',precio:5400, var:'+2,9%', varDir:'up', sub:'Cañuelas · ARS/kg vivo' },
  { cat:'Vaca Esp. + 430 kg',precio:4200, var:'+1,4%', varDir:'up', sub:'Cañuelas · ARS/kg vivo' },
];
export const HACIENDA_FAENA = [
  { cat:'Novillo Esp.',   precio:5650, var:'+2,7%', varDir:'up' },
  { cat:'Novillito Esp.', precio:5800, var:'+3,2%', varDir:'up' },
  { cat:'Vaquillona Esp.',precio:5400, var:'+2,9%', varDir:'up' },
  { cat:'Vaca Esp.',      precio:4200, var:'+1,4%', varDir:'up' },
];
