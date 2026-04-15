// api/insumos.js — Vercel Edge Function
export const config = { runtime: 'edge' };

// Recurso liviano de Precios Vigentes (Res 314)
const API_URL = "https://datos.energia.gob.ar/api/3/action/datastore_search?resource_id=80ac25f3-5151-469a-91d1-425f16429532";
const ZONA_NUCLEO = ['Santa Fe', 'Córdoba', 'Buenos Aires', 'Entre Ríos', 'La Pampa'];

export default async function handler(req) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

  try {
    const res = await fetch(`${API_URL}&limit=5000`, {
      headers: { 'User-Agent': 'Mozilla/5.0 RadarAgro/1.0', 'Accept': 'application/json' }
    });

    if (!res.ok) throw new Error(`Portal Energía Down: ${res.status}`);

    const json = await res.json();
    const records = json.result.records;

    // Procesamiento simplificado
    const data = procesar(records);

    return new Response(JSON.stringify({
      ok: true,
      fuente: 'Secretaría de Energía',
      ...data
    }), { status: 200, headers: cors });

  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500, headers: cors });
  }
}

function procesar(records) {
  const ids = { "19": "g2", "21": "g3", "2": "super", "3": "premium", "6": "gnc" };
  const init = () => ({ sum: 0, c: 0, nSum: 0, nC: 0 });
  const s = { g2: init(), g3: init(), super: init(), premium: init(), gnc: init() };

  records.forEach(r => {
    const k = ids[r.idproducto];
    const p = parseFloat(r.precio);
    if (!k || isNaN(p)) return;
    s[k].sum += p; s[k].c++;
    const prov = r.provincia || '';
    if (ZONA_NUCLEO.some(z => prov.toLowerCase().includes(z.toLowerCase()))) {
      s[k].nSum += p; s[k].nC++;
    }
  });

  const get = (k) => ({
    pais: { promedio: s[k].c > 0 ? s[k].sum / s[k].c : null },
    nucleo: { promedio: s[k].nC > 0 ? s[k].nSum / s[k].nC : null }
  });

  return { gasoil: { g2: get('g2'), g3: get('g3') }, nafta: { super: get('super'), premium: get('premium'), gnc: get('gnc') } };
}