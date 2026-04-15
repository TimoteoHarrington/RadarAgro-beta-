// scripts/generar_historial.cjs
const fs = require('fs');
const readline = require('readline');
const path = require('path');

const FILE_PATH = path.join(__dirname, 'precios-historicos.csv');

const ZONA_NUCLEO = ['santa fe', 'córdoba', 'cordoba', 'buenos aires', 'entre ríos', 'entre rios', 'la pampa'];
const PRODUCTOS = { 2: 'ns', 3: 'np', 19: 'g2', 21: 'g3' };

console.log("⏳ Iniciando procesamiento del histórico local con filtro de fechas...");

if (!fs.existsSync(FILE_PATH)) {
  console.error("❌ ERROR: No se encontró el archivo local.");
  process.exit(1);
}

const fileStream = fs.createReadStream(FILE_PATH);
const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

let isFirstLine = true;
let headers = [];
const bucketsMensuales = {};

// 1. Detección automática del mes actual
const hoy = new Date();
const currentYear = hoy.getFullYear();

rl.on('line', (line) => {
  const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/); 

  if (isFirstLine) {
    headers = cols.map(h => h.trim().toLowerCase().replace(/^\uFEFF/, '').replace(/"/g, ''));
    isFirstLine = false;
    return;
  }

  const idProd = parseInt(cols[headers.indexOf('idproducto')] || cols[headers.indexOf('id_producto')], 10);
  if (!PRODUCTOS[idProd]) return;

  const precio = parseFloat((cols[headers.indexOf('precio')] || '').replace(/"/g, '').replace(',', '.'));
  if (isNaN(precio) || precio <= 50) return;

  const fechaRaw = cols[headers.indexOf('fecha_vigencia')] || cols[headers.indexOf('vigencia')] || cols[headers.indexOf('fecha')];
  if (!fechaRaw) return;

  const fechaLimpia = fechaRaw.replace(/"/g, '');
  let year, month;
  
  const arMatch = fechaLimpia.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (arMatch) {
    year = parseInt(arMatch[3], 10); month = arMatch[2];
  } else {
    const isoMatch = fechaLimpia.match(/^(\d{4})-(\d{2})/);
    if (isoMatch) {
      year = parseInt(isoMatch[1], 10); month = isoMatch[2];
    } else return;
  }

  // FILTRO ANTI-BASURA TEMPORAL: 
  // Ignoramos fechas del futuro y fechas de hace más de 3 años.
  if (year > currentYear || year < currentYear - 3) return;

  const mesClave = `${year}-${month}`; 
  const provincia = (cols[headers.indexOf('provincia')] || '').toLowerCase().replace(/"/g, '');

  if (!bucketsMensuales[mesClave]) bucketsMensuales[mesClave] = {};

  const prodKey = PRODUCTOS[idProd];
  const paisKey = `${prodKey}-pais`;
  const nucleoKey = `${prodKey}-nucleo`;

  if (!bucketsMensuales[mesClave][paisKey]) bucketsMensuales[mesClave][paisKey] = { sum: 0, count: 0 };
  bucketsMensuales[mesClave][paisKey].sum += precio;
  bucketsMensuales[mesClave][paisKey].count++;

  if (ZONA_NUCLEO.some(zn => provincia.includes(zn))) {
    if (!bucketsMensuales[mesClave][nucleoKey]) bucketsMensuales[mesClave][nucleoKey] = { sum: 0, count: 0 };
    bucketsMensuales[mesClave][nucleoKey].sum += precio;
    bucketsMensuales[mesClave][nucleoKey].count++;
  }
});

rl.on('close', () => {
  console.log("✅ Lectura completada. Extrayendo los últimos 11 meses válidos...\n");

  // Ordenamos alfabéticamente (YYYY-MM)
  const mesesOrdenados = Object.keys(bucketsMensuales).sort();
  
  // Tomamos los últimos 11 meses.
  const ultimos11Meses = mesesOrdenados.slice(-12, -1); 

  const HIST_DATA = {
    'g2-nucleo': [], 'g3-nucleo': [], 'ns-nucleo': [], 'np-nucleo': [],
    'g2-pais': [], 'g3-pais': [], 'ns-pais': [], 'np-pais': []
  };

  const keys = Object.keys(HIST_DATA);

  ultimos11Meses.forEach(mes => {
    keys.forEach(k => {
      const dataMes = bucketsMensuales[mes][k];
      if (dataMes && dataMes.count > 0) {
        HIST_DATA[k].push(Math.round(dataMes.sum / dataMes.count));
      } else {
        HIST_DATA[k].push(null);
      }
    });
  });

  keys.forEach(k => HIST_DATA[k].push(null));

  console.log("==========================================================================");
  console.log("🔥 COPIA ESTE BLOQUE Y REEMPLAZA LA CONSTANTE EN TU InsumosPage.jsx 🔥");
  console.log("==========================================================================\n");
  
  console.log("  const HIST_DATA = {");
  keys.forEach(k => {
    // Solución al problema de las "comas vacías": Forzamos a imprimir la palabra 'null'
    const arrayParseado = HIST_DATA[k].map(val => val === null ? 'null' : val).join(', ');
    console.log(`    '${k}': [${arrayParseado}],`);
  });
  console.log("    // --- Fertilizantes (Aún fijos hasta que conectes su API) ---");
  console.log("    'urea':      [280, 295, 310, 330, 355, 370, 390, 410, 430, 455, 476, 484],");
  console.log("    'map':       [310, 325, 340, 365, 385, 405, 430, 460, 500, 530, 572, 572],");
  console.log("    'dap':       [300, 315, 332, 350, 368, 390, 415, 445, 490, 520, 544, 548],");
  console.log("    'uan':       [170, 180, 195, 210, 225, 240, 255, 275, 290, 302, 312, 312],");
  console.log("  };");
});