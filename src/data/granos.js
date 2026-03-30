// ============================================================
// data/granos.js — Mock data based on Downtack API coverage
// Replace with real API calls in production
// Endpoint pattern: /api/granos/{commodity}
// ============================================================

// ── OVERVIEW CARDS (Pizarras - precio disponible local) ─────
export const GRANOS_OVERVIEW = [
  { id:'soja',   nombre:'Soja',   precioARS:456000, precioUSD:366, variacionPct:-1.9, varDir:'dn', deltaARS:-9000,  fob:396, fas:308, sparkPts:'0,32 12,28 24,24 36,26 48,18 60,20 72,13 80,10', color:'green' },
  { id:'maiz',   nombre:'Maíz',   precioARS:251600, precioUSD:202, variacionPct:-0.3, varDir:'dn', deltaARS:-800,   fob:218, fas:196, sparkPts:'0,24 12,26 24,30 36,24 48,20 60,22 72,16 80,14', color:'gold'  },
  { id:'trigo',  nombre:'Trigo',  precioARS:248000, precioUSD:199, variacionPct:-1.2, varDir:'dn', deltaARS:-3050,  fob:215, fas:194, sparkPts:'0,30 12,26 24,22 36,24 48,18 60,16 72,18 80,14', color:'blue'  },
  { id:'girasol',nombre:'Girasol',precioARS:519460, precioUSD:417, variacionPct:-1.4, varDir:'dn', deltaARS:-7600,  fob:440, fas:410, sparkPts:'0,22 12,18 24,15 36,14 48,11 60,12 72,9 80,10',  color:'gold'  },
  { id:'sorgo',  nombre:'Sorgo',  precioARS:218500, precioUSD:175, variacionPct:0,    varDir:'fl', deltaARS:0,      fob:188, fas:172, sparkPts:'0,20 15,20 30,22 45,20 60,21 75,19 80,20',       color:'flat'  },
  { id:'cebada', nombre:'Cebada', precioARS:231000, precioUSD:185, variacionPct:0.65, varDir:'up', deltaARS:1500,   fob:202, fas:185, sparkPts:'0,26 12,24 24,28 36,22 48,20 60,18 72,15 80,14', color:'green' },
];

// ── PIZARRAS por ciudad ──────────────────────────────────────
export const GRANOS_PIZARRAS = [
  { producto:'Soja',   rosario:456000, bsas:null,   bahia:null,   queq:null,   cordoba:null,   var:-9000,  varPct:-1.9, varDir:'dn' },
  { producto:'Maíz',   rosario:251600, bsas:249000, bahia:249500, queq:248500, cordoba:250200, var:-800,   varPct:-0.3, varDir:'dn' },
  { producto:'Trigo',  rosario:248000, bsas:246000, bahia:246000, queq:245500, cordoba:null,   var:-3050,  varPct:-1.2, varDir:'dn' },
  { producto:'Girasol',rosario:519460, bsas:null,   bahia:515000, queq:null,   cordoba:null,   var:-7600,  varPct:-1.4, varDir:'dn' },
  { producto:'Sorgo',  rosario:218500, bsas:null,   bahia:null,   queq:null,   cordoba:null,   var:0,      varPct:0,    varDir:'fl' },
  { producto:'Cebada', rosario:231000, bsas:229500, bahia:228000, queq:null,   cordoba:null,   var:1500,   varPct:0.65, varDir:'up' },
];

// ── FOB / FAS por cereal ─────────────────────────────────────
export const GRANOS_FOB_FAS = [
  { id:'soja',          nombre:'Soja',           fob:396,  fas:308,  varFob:-2.1, varFas:-1.8, retencion:'33%',  nota:'Puerto Rosario' },
  { id:'soja-harina',   nombre:'Harina Soja',    fob:298,  fas:null, varFob:-1.4, varFas:null, retencion:'—',    nota:'Subproducto · 47% proteína' },
  { id:'soja-aceite',   nombre:'Aceite Soja',    fob:1090, fas:null, varFob:+0.8, varFas:null, retencion:'—',    nota:'USD/tn · Exportación' },
  { id:'maiz',          nombre:'Maíz',           fob:218,  fas:196,  varFob:+0.5, varFas:+0.3, retencion:'12%',  nota:'Puerto Rosario' },
  { id:'trigo',         nombre:'Trigo',          fob:215,  fas:194,  varFob:-0.9, varFas:-0.7, retencion:'12%',  nota:'Puerto Rosario' },
  { id:'trigo-pan',     nombre:'Trigo Pan FOB',  fob:220,  fas:198,  varFob:-0.8, varFas:-0.6, retencion:'12%',  nota:'Calidad panadera' },
  { id:'girasol',       nombre:'Girasol',        fob:440,  fas:410,  varFob:-1.5, varFas:-1.2, retencion:'7%',   nota:'Bahía Blanca' },
  { id:'girasol-aceite',nombre:'Aceite Girasol', fob:1180, fas:null, varFob:+1.2, varFas:null, retencion:'—',    nota:'USD/tn · Exportación' },
  { id:'sorgo',         nombre:'Sorgo',          fob:188,  fas:172,  varFob:0,    varFas:0,    retencion:'12%',  nota:'Puerto Rosario' },
  { id:'cebada-forr',   nombre:'Cebada Forraj.', fob:195,  fas:178,  varFob:+0.5, varFas:+0.4, retencion:'12%',  nota:'Calidad forrajera' },
  { id:'cebada-cer',    nombre:'Cebada Cerv.',   fob:210,  fas:190,  varFob:+0.7, varFas:+0.5, retencion:'12%',  nota:'Calidad cervecera' },
];

// ── FUTUROS Matba-Rofex y CBOT ───────────────────────────────
export const GRANOS_FUTUROS = [
  {
    id:'soja', nombre:'Soja',
    matba:[
      { contrato:'ENE 26', precio:340000, varPct:-1.2, varDir:'dn' },
      { contrato:'MAR 26', precio:348000, varPct:-0.9, varDir:'dn' },
      { contrato:'MAY 26', precio:355000, varPct:-0.6, varDir:'dn' },
      { contrato:'JUL 26', precio:362000, varPct:-0.4, varDir:'dn' },
    ],
    us:[
      { contrato:'MAR 26', precio:418.9, varPct:-1.19, varDir:'dn', open:420.1, max:420.8, min:417.2 },
      { contrato:'MAY 26', precio:424.5, varPct:-0.95, varDir:'dn', open:425.6, max:426.1, min:423.0 },
      { contrato:'JUL 26', precio:429.0, varPct:-0.72, varDir:'dn', open:430.1, max:430.8, min:428.2 },
      { contrato:'NOV 26', precio:436.5, varPct:-0.50, varDir:'dn', open:437.7, max:438.2, min:435.8 },
    ],
  },
  {
    id:'soja-harina-fut', nombre:'Harina Soja',
    matba:[],
    us:[
      { contrato:'MAR 26', precio:295.5, varPct:-0.80, varDir:'dn', open:297.8, max:298.2, min:294.6 },
      { contrato:'MAY 26', precio:300.0, varPct:-0.65, varDir:'dn', open:301.9, max:302.3, min:299.1 },
    ],
  },
  {
    id:'soja-aceite-fut', nombre:'Aceite Soja',
    matba:[],
    us:[
      { contrato:'MAR 26', precio:43.80, varPct:+0.92, varDir:'up', open:43.40, max:44.10, min:43.20 },
      { contrato:'MAY 26', precio:44.20, varPct:+0.68, varDir:'up', open:43.90, max:44.45, min:43.70 },
    ],
  },
  {
    id:'maiz', nombre:'Maíz',
    matba:[
      { contrato:'ENE 26', precio:245000, varPct:-0.3, varDir:'dn' },
      { contrato:'MAR 26', precio:249000, varPct:+0.2, varDir:'up' },
      { contrato:'MAY 26', precio:252000, varPct:+0.4, varDir:'up' },
      { contrato:'JUL 26', precio:255000, varPct:+0.3, varDir:'up' },
    ],
    us:[
      { contrato:'MAR 26', precio:185.8, varPct:+0.31, varDir:'up', open:185.5, max:186.2, min:184.9 },
      { contrato:'MAY 26', precio:188.2, varPct:+0.45, varDir:'up', open:187.7, max:188.8, min:187.3 },
      { contrato:'JUL 26', precio:190.5, varPct:+0.32, varDir:'up', open:190.0, max:191.1, min:189.7 },
      { contrato:'DIC 26', precio:195.0, varPct:+0.20, varDir:'up', open:194.6, max:195.5, min:194.2 },
    ],
  },
  {
    id:'trigo', nombre:'Trigo',
    matba:[
      { contrato:'ENE 26', precio:240000, varPct:-1.0, varDir:'dn' },
      { contrato:'MAR 26', precio:243000, varPct:-0.8, varDir:'dn' },
      { contrato:'MAY 26', precio:247000, varPct:-0.5, varDir:'dn' },
      { contrato:'JUL 26', precio:250000, varPct:-0.3, varDir:'dn' },
    ],
    us:[
      { contrato:'MAR 26', precio:203.5, varPct:-0.47, varDir:'dn', open:204.0, max:204.5, min:202.8 },
      { contrato:'MAY 26', precio:206.8, varPct:-0.35, varDir:'dn', open:207.5, max:207.8, min:206.3 },
      { contrato:'JUL 26', precio:210.0, varPct:-0.24, varDir:'dn', open:210.5, max:210.9, min:209.5 },
    ],
  },
];

// ── SIO PROMEDIOS ────────────────────────────────────────────
export const GRANOS_SIO = [
  {
    id:'soja', nombre:'Soja',
    camara:  { precio:458200, var:-0.8, varDir:'dn', nota:'Soja Cámara (Promedio) SIO' },
    fabrica: { precio:461000, var:-0.6, varDir:'dn', nota:'Soja Fábrica (Promedio) SIO' },
    ros:     { ars:456000, usd:366, nota:'SOJA.ROS/Disp.' },
  },
  {
    id:'maiz', nombre:'Maíz',
    camara: null, fabrica: null,
    ros:      { ars:251600, usd:202, nota:'MAIZ.ROS/Disp.' },
    promedio: { precio:250400, var:-0.3, varDir:'dn', nota:'Maíz (Promedio) SIO' },
  },
  {
    id:'girasol', nombre:'Girasol',
    camara:  { precio:520000, var:-1.2, varDir:'dn', nota:'Girasol Cámara (Promedio) SIO' },
    fabrica: { precio:522000, var:-1.0, varDir:'dn', nota:'Girasol Fábrica (Promedio) SIO' },
    ros:     { ars:519460, usd:417, nota:'GIR.ROS.P/Disp.' },
  },
  {
    id:'trigo', nombre:'Trigo',
    camara: null, fabrica: null,
    ros:     { ars:248000, usd:199, nota:'TRI.ROS.P/DIS26' },
    ba:      { ars:246000, usd:197, nota:'TRI.BA.P/DIS26' },
    promedio:{ precio:247500, var:-1.2, varDir:'dn', nota:'Trigo (Promedio) SIO' },
  },
  {
    id:'sorgo', nombre:'Sorgo',
    camara: null, fabrica: null,
    ros:     { ars:218500, usd:175, nota:'SOR.ROS/DIS26' },
    promedio:{ precio:218000, var:0, varDir:'fl', nota:'Sorgo (Promedio) SIO' },
  },
  {
    id:'cebada-forr', nombre:'Cebada Forrajera',
    camara: null, fabrica: null,
    promedio:{ precio:231000, var:+0.65, varDir:'up', nota:'Forr. (Promedio) SIO' },
  },
  {
    id:'cebada-cer', nombre:'Cebada Cervecera',
    camara: null, fabrica: null,
    promedio:{ precio:242000, var:+0.80, varDir:'up', nota:'Cer. (Promedio) SIO' },
  },
];

// ── SUBPRODUCTOS Soja & Girasol ──────────────────────────────
export const GRANOS_SUBPRODUCTOS = {
  soja: {
    harinaFob:   { precio:298,   var:-1.4, varDir:'dn', unidad:'USD/tn', nota:'Harina Soja FOB' },
    aceiteFob:   { precio:1090,  var:+0.8, varDir:'up', unidad:'USD/tn', nota:'Aceite Soja FOB' },
    harinaFutUs: { precio:295.5, var:-0.8, varDir:'dn', unidad:'USD/tn', nota:'Harina Soja Fut US MAR26' },
    aceiteFutUs: { precio:43.80, var:+0.9, varDir:'up', unidad:'USc/lb', nota:'Aceite Soja Fut US MAR26' },
    relacionHarinaAceite: 2.49,
    crush: 84.5,
  },
  girasol: {
    aceiteFob: { precio:1180, var:+1.2, varDir:'up', unidad:'USD/tn', nota:'Aceite Girasol FOB' },
  },
};

// ── HISTÓRICO 12 meses ───────────────────────────────────────
export const HIST_MESES   = ['Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic','Ene','Feb'];
export const HIST_SOJA    = [395,388,376,362,351,348,355,362,370,376,368,366];
export const HIST_MAIZ    = [220,218,212,208,204,200,202,206,210,214,208,202];
export const HIST_TRIGO   = [228,222,218,212,206,204,206,209,212,215,210,199];
export const HIST_GIRASOL = [430,428,424,420,418,415,418,421,424,428,422,417];
export const HIST_SORGO   = [192,190,186,182,178,175,176,178,180,182,178,175];
export const HIST_HARINA_SOJA = [310,308,304,300,296,294,297,300,302,304,300,298];
export const HIST_ACEITE_SOJA = [1050,1060,1065,1070,1080,1075,1085,1090,1095,1095,1088,1090];
export const HIST_BASIS_SOJA  = [-48,-50,-52,-54,-56,-55,-52,-50,-51,-50,-52,-53];
export const HIST_BASIS_MAIZ  = [14,12,10,11,12,10,11,12,12,14,13,16];
export const HIST_BASIS_TRIGO = [-8,-7,-6,-7,-6,-5,-5,-5,-5,-5,-6,-5];

// ── CBOT (backward compat) ───────────────────────────────────
export const CBOT_DATA = [
  { nombre:'Soja',  usd:'418,9', var:'−1,19', varDir:'dn', open:'420,1', max:'420,8', min:'417,2' },
  { nombre:'Maíz',  usd:'185,8', var:'+0,31', varDir:'up', open:'185,5', max:'186,2', min:'184,9' },
  { nombre:'Trigo', usd:'203,5', var:'−0,47', varDir:'dn', open:'204,0', max:'204,5', min:'202,8' },
];
