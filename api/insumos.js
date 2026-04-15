// api/insumos.js — Vercel Edge Function
export const config = { runtime: 'edge' };

// Usamos el recurso de PRECIOS VIGENTES (Res 314) que es mucho más liviano
const API_VIGENTES = "https://datos.energia.gob.ar/api/3/action/datastore_search?resource_id=80ac25f3-5151-469a-91d1-425f16429532";

const ZONA_NUCLEO = ['Santa Fe', 'Córdoba', 'Buenos Aires', 'Entre Ríos', 'La Pampa'];

export default async function handler(req) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });

  try {
    // Agregamos un limit alto para traer todo el país y procesar nosotros
    const response = await fetch(`${API_VIGENTES}&limit=5000`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) throw new Error(`Secretaría respondió con status ${response.status}`);

    const json = await response.json();
    const records = json.result.records;

    // Procesamos promedios nacionales y zona núcleo
    const data = procesarCombustibles(records);

    return new Response(JSON.stringify({
      ok: true,
      fuente: 'Secretaría de Energía · Res. 314/2016',
      fecha: new Date().toISOString(),
      ...data
    }), { status: 200, headers: corsHeaders });

  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), { 
      status: 500, 
      headers: corsHeaders 
    });
  }
}

function procesarCombustibles(records) {
  const mapeo = {
    "19": "g2", "21": "g3", "2": "super", "3": "premium", "6": "gnc"
  };

  const inicial = () => ({ sum: 0, count: 0, nucleoSum: 0, nucleoCount: 0 });
  const stats = { g2: inicial(), g3: inicial(), super: inicial(), premium: inicial(), gnc: inicial() };

  records.forEach(r => {
    const prodKey = mapeo[r.idproducto];
    const precio = parseFloat(r.precio);
    if (!prodKey || isNaN(precio)) return;

    stats[prodKey].sum += precio;
    stats[prodKey].count++;

    const prov = r.provincia || '';
    if (ZONA_NUCLEO.some(z => prov.toLowerCase().includes(z.toLowerCase()))) {
      stats[prodKey].nucleoSum += precio;
      stats[prodKey].nucleoCount++;
    }
  });

  const final = (key) => ({
    pais: { promedio: stats[key].count > 0 ? stats[key].sum / stats[key].count : null },
    nucleo: { promedio: stats[key].nucleoCount > 0 ? stats[key].nucleoSum / stats[key].nucleoCount : null }
  });

  return {
    gasoil: { g2: final('g2'), g3: final('g3') },
    nafta: { super: final('super'), premium: final('premium'), gnc: final('gnc') }
  };
}