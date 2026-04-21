// ============================================================
// src/data/hacienda.js
// Datos estáticos de referencia del MAG Cañuelas
// Fuente: Mercado Agroganadero · Remate 21/04/2026
//
// Estos valores se usan como fallback visual cuando /api/hacienda
// no está disponible, y para alimentar los gráficos históricos.
// Los datos en tiempo real vienen de /api/hacienda (scraping MAG).
// ============================================================

// ── OVERVIEW — Mejores precios por categoría principal ───────
export const HACIENDA_OVERVIEW = [
  { id:'novillo',        nombre:'Novillo Esp.',    subcategoria:'Esp.Joven + 430kg', precio:4416, var:+3.2, varDir:'up', unidad:'ARS/kg vivo', fuente:'Cañuelas' },
  { id:'novillito',      nombre:'Novillito Esp.',  subcategoria:'Esp. h 390kg',      precio:4993, var:+3.8, varDir:'up', unidad:'ARS/kg vivo', fuente:'Cañuelas' },
  { id:'vaquillona',     nombre:'Vaquillona Esp.', subcategoria:'Esp. h 390kg',      precio:4609, var:+2.9, varDir:'up', unidad:'ARS/kg vivo', fuente:'Cañuelas' },
  { id:'vaca',           nombre:'Vaca Buena',      subcategoria:'Esp.Joven + 430kg', precio:3251, var:+1.8, varDir:'up', unidad:'ARS/kg vivo', fuente:'Cañuelas' },
  { id:'canuelas-inmag', nombre:'Cañuelas INMAG',  subcategoria:'Índice mercado',    precio:4272, var:+2.4, varDir:'up', unidad:'ARS/kg vivo', fuente:'Cañuelas' },
  { id:'canuelas-igmag', nombre:'Cañuelas IGMAG',  subcategoria:'Índice general',    precio:3574, var:+1.9, varDir:'up', unidad:'ARS/kg vivo', fuente:'Cañuelas' },
];

// ── NOVILLOS ─────────────────────────────────────────────────
export const HACIENDA_NOVILLOS = [
  { categoria:'Novillos Esp.Joven + 430kg', minimo:3500, maximo:4800, promedio:4416, semAnterior:4280, varPct:+3.2, varDir:'up', fuente:'Cañuelas MAG · 21/04/2026' },
  { categoria:'Novillos Regular h 430kg',   minimo:3000, maximo:4600, promedio:3242, semAnterior:3150, varPct:+2.9, varDir:'up', fuente:'Cañuelas MAG · 21/04/2026' },
  { categoria:'Novillos Regular + 430kg',   minimo:3800, maximo:4500, promedio:4030, semAnterior:3920, varPct:+2.8, varDir:'up', fuente:'Cañuelas MAG · 21/04/2026' },
];

// ── NOVILLITOS ────────────────────────────────────────────────
export const HACIENDA_NOVILLITOS = [
  { categoria:'Novillitos Esp. h 390kg',  minimo:4500, maximo:5500, promedio:4993, semAnterior:4810, varPct:+3.8, varDir:'up', fuente:'Cañuelas MAG · 21/04/2026' },
  { categoria:'Novillitos Esp. + 390kg',  minimo:4300, maximo:5240, promedio:4779, semAnterior:4600, varPct:+3.9, varDir:'up', fuente:'Cañuelas MAG · 21/04/2026' },
  { categoria:'Novillitos Regular',       minimo:3000, maximo:5320, promedio:4104, semAnterior:3980, varPct:+3.1, varDir:'up', fuente:'Cañuelas MAG · 21/04/2026' },
];

// ── VAQUILLONAS ───────────────────────────────────────────────
export const HACIENDA_VAQUILLONAS = [
  { categoria:'Vaquillonas Esp. h 390kg', minimo:3500, maximo:5550, promedio:4609, semAnterior:4480, varPct:+2.9, varDir:'up', fuente:'Cañuelas MAG · 21/04/2026' },
  { categoria:'Vaquillonas Esp. + 390kg', minimo:2620, maximo:4400, promedio:4006, semAnterior:3890, varPct:+3.0, varDir:'up', fuente:'Cañuelas MAG · 21/04/2026' },
  { categoria:'Vaquillonas Regular',      minimo:3000, maximo:5000, promedio:3877, semAnterior:3760, varPct:+3.1, varDir:'up', fuente:'Cañuelas MAG · 21/04/2026' },
];

// ── VACAS ─────────────────────────────────────────────────────
export const HACIENDA_VACAS = [
  { categoria:'Vacas Esp.Joven h 430kg',  minimo:2400, maximo:4000, promedio:2820, semAnterior:2750, varPct:+2.5, varDir:'up', fuente:'Cañuelas MAG · 21/04/2026' },
  { categoria:'Vacas Esp.Joven + 430kg',  minimo:2320, maximo:4500, promedio:3251, semAnterior:3195, varPct:+1.8, varDir:'up', fuente:'Cañuelas MAG · 21/04/2026' },
  { categoria:'Vacas Regular',            minimo:1800, maximo:3800, promedio:2679, semAnterior:2640, varPct:+1.5, varDir:'up', fuente:'Cañuelas MAG · 21/04/2026' },
  { categoria:'Vacas Conserva Buena',     minimo:1800, maximo:2700, promedio:2149, semAnterior:2200, varPct:-2.3, varDir:'dn', fuente:'Cañuelas MAG · 21/04/2026' },
  { categoria:'Vacas Conserva Inferior',  minimo:1700, maximo:2320, promedio:1959, semAnterior:2010, varPct:-2.5, varDir:'dn', fuente:'Cañuelas MAG · 21/04/2026' },
];

// ── TOROS ─────────────────────────────────────────────────────
export const HACIENDA_TOROS = [
  { categoria:'Toros Esp.',    minimo:2700, maximo:3500, promedio:2919, semAnterior:2950, varPct:-1.1, varDir:'dn', fuente:'Cañuelas MAG · 21/04/2026' },
  { categoria:'Toros Regular', minimo:1700, maximo:3200, promedio:2414, semAnterior:2450, varPct:-1.5, varDir:'dn', fuente:'Cañuelas MAG · 21/04/2026' },
];

// ── MEJORES ───────────────────────────────────────────────────
export const HACIENDA_MEJORES = [
  { categoria:'MEJ Esp. h 430kg', minimo:3300, maximo:4800, promedio:3830, semAnterior:3710, varPct:+3.2, varDir:'up', fuente:'Cañuelas MAG · 21/04/2026' },
  { categoria:'MEJ Regular',      minimo:3050, maximo:3050, promedio:3050, semAnterior:2980, varPct:+2.3, varDir:'up', fuente:'Cañuelas MAG · 21/04/2026' },
];

// ── CAÑUELAS INDICADORES ──────────────────────────────────────
export const HACIENDA_CANUELAS = [
  {
    id:'inmag',
    nombre:'INMAG',
    descripcion:'Índice de Novillo MAGna - precio de referencia de novillos especiales',
    precio:4272,
    semAnterior:4134,
    mesAnterior:3980,
    var1s:+3.3, var1sDir:'up',
    var1m:+7.3, var1mDir:'up',
    var3m:+19.1, var3mDir:'up',
    histPrecio:[2900,3050,3180,3280,3380,3500,3620,3740,3870,3980,4134,4272],
  },
  {
    id:'igmag',
    nombre:'IGMAG',
    descripcion:'Índice General MAGna - promedio ponderado del mercado Cañuelas',
    precio:3574,
    semAnterior:3508,
    mesAnterior:3350,
    var1s:+1.9, var1sDir:'up',
    var1m:+6.7, var1mDir:'up',
    var3m:+17.4, var3mDir:'up',
    histPrecio:[2500,2620,2730,2820,2900,2980,3060,3140,3230,3350,3508,3574],
  },
  {
    id:'arrendamiento',
    nombre:'Arrendamiento',
    descripcion:'Índice de arrendamiento en equivalente hacienda - ARS/ha/año',
    precio:4254,
    semAnterior:4108,
    mesAnterior:3952,
    var1s:+3.5, var1sDir:'up',
    var1m:+7.6, var1mDir:'up',
    var3m:+19.4, var3mDir:'up',
    unidad:'ARS/ha/año',
    histPrecio:[2880,3020,3150,3260,3370,3480,3600,3720,3850,3952,4108,4254],
  },
];

// ── HISTÓRICO 12 meses por categoría ─────────────────────────
export const HIST_MESES_HAC = ['May','Jun','Jul','Ago','Sep','Oct','Nov','Dic','Ene','Feb','Mar','Abr'];
export const HIST_NOVILLO_ESP   = [2280,2410,2560,2700,2860,3020,3180,3400,3720,4050,4280,4416];
export const HIST_NOVILLITO_ESP = [2450,2590,2750,2910,3080,3260,3450,3710,4050,4380,4810,4993];
export const HIST_VAQUILLONA    = [2100,2230,2370,2500,2650,2810,2980,3200,3550,3880,4480,4609];
export const HIST_VACA_ESP      = [1740,1840,1950,2060,2180,2300,2430,2600,2880,3100,3195,3251];

// ── BACKWARD COMPAT ───────────────────────────────────────────
export const HACIENDA_INVERNADA = [
  { cat:'Novillitos 390 kg',  precio:4993, var:'+3,8%', varDir:'up', sub:'Cañuelas MAG · ARS/kg vivo' },
  { cat:'Novillos + 430 kg',  precio:4416, var:'+3,2%', varDir:'up', sub:'Cañuelas MAG · ARS/kg vivo' },
  { cat:'Vaquillonas 390 kg', precio:4609, var:'+2,9%', varDir:'up', sub:'Cañuelas MAG · ARS/kg vivo' },
  { cat:'Vaca Buena + 430 kg',precio:3251, var:'+1,8%', varDir:'up', sub:'Cañuelas MAG · ARS/kg vivo' },
];
export const HACIENDA_FAENA = [
  { cat:'Novillo Esp.',    precio:4416, var:'+3,2%', varDir:'up' },
  { cat:'Novillito Esp.',  precio:4993, var:'+3,8%', varDir:'up' },
  { cat:'Vaquillona Esp.', precio:4609, var:'+2,9%', varDir:'up' },
  { cat:'Vaca Buena',      precio:3251, var:'+1,8%', varDir:'up' },
];
