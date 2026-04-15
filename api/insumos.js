// api/insumos.js — Vercel Edge Function
export const config = { runtime: 'edge' };

// Recurso de Precios Vigentes (mucho más liviano que el histórico)
const API_VIGENTES = "https://datos.energia.gob.ar/api/3/action/datastore_search?resource_id=80ac25f3-5151-469a-91d1-425f16429532";

export default async function handler(req) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });

  try {
    // Pedimos los últimos 5000 registros para asegurar cobertura nacional reciente
    const response = await fetch(`${API_VIGENTES}&limit=5000`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });

    if (!response.ok) throw new Error(`Error Secretaría de Energía: ${response.status}`);

    const json = await response.json();
    const records = json.result.records;

    if (!records || records.length === 0) throw new Error("No se recibieron registros de la API.");

    const dataProcesada = procesarPrecios(records);

    return new Response(JSON.stringify({
      ok: true,
      fuente: 'Secretaría de Energía',
      data: dataProcesada
    }), { status: 200, headers: corsHeaders });

  } catch (err) {
    console.error("Error en API Insumos:", err.message);
    return new Response(JSON.stringify({ ok: false, error: err.message }), { 
      status: 500, 
      headers: corsHeaders 
    });
  }
}

function procesarPrecios(records) {
  const productos = {
    "2":  { sum: 0, count: 0, label: 'super' },
    "3":  { sum: 0, count: 0, label: 'premium' },
    "19": { sum: 0, count: 0, label: 'g2' },
    "21": { sum: 0, count: 0, label: 'g3' },
    "6":  { sum: 0, count: 0, label: 'gnc' }
  };

  records.forEach(r => {
    const id = r.idproducto.toString();
    const precio = parseFloat(r.precio);
    if (productos[id] && !isNaN(precio) && precio > 0) {
      productos[id].sum += precio;
      productos[id].count++;
    }
  });

  const res = {};
  for (const id in productos) {
    const p = productos[id];
    res[p.label] = p.count > 0 ? (p.sum / p.count).toFixed(2) : "0.00";
  }

  // Devolvemos la estructura exacta que espera tu RadarAgro
  return {
    gasoil: { g2: res.g2, g3: res.g3 },
    nafta: { super: res.super, premium: res.premium, gnc: res.gnc }
  };
}