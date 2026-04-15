// api/insumos.js — Vercel Edge Function
export const config = { runtime: 'edge' };

// Usamos el recurso de PRECIOS VIGENTES: mucho más liviano (JSON)
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
    // 1. Fetch con User-Agent para evitar bloqueos de la Secretaría
    const response = await fetch(`${API_VIGENTES}&limit=4000`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) throw new Error(`Error de red: ${response.status}`);

    const json = await response.json();
    const records = json.result.records;

    // 2. Procesamiento ultra-rápido de promedios
    const data = procesarCombustibles(records);

    return new Response(JSON.stringify({
      ok: true,
      fuente: 'Secretaría de Energía · Res. 314/2016',
      fecha: new Date().toISOString(),
      ...data
    }), { status: 200, headers: corsHeaders });

  } catch (err) {
    console.error("Error en /api/insumos:", err.message);
    return new Response(JSON.stringify({ ok: false, error: err.message }), { 
      status: 500, 
      headers: corsHeaders 
    });
  }
}

function procesarCombustibles(records) {
  const ids = { "19": "g2", "21": "g3", "2": "super", "3": "premium", "6": "gnc" };
  const init = () => ({ sum: 0, count: 0, nSum: 0, nCount: 0 });
  const stats = { g2: init(), g3: init(), super: init(), premium: init(), gnc: init() };

  records.forEach(r => {
    const key = ids[r.idproducto];
    const precio = parseFloat(r.precio);
    if (!key || isNaN(precio)) return;

    stats[key].sum += precio;
    stats[key].count++;

    const prov = r.provincia || '';
    if (ZONA_NUCLEO.some(z => prov.toLowerCase().includes(z.toLowerCase()))) {
      stats[key].nSum += precio;
      stats[key].nCount++;
    }
  });

  const getRes = (k) => ({
    pais: { promedio: stats[k].count > 0 ? stats[k].sum / stats[k].count : null },
    nucleo: { promedio: stats[k].nCount > 0 ? stats[k].nSum / stats[k].nCount : null }
  });

  return {
    gasoil: { g2: getRes('g2'), g3: getRes('g3') },
    nafta: { super: getRes('super'), premium: getRes('premium'), gnc: getRes('gnc') }
  };
}