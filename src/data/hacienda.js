// api/hacienda.js — Vercel Serverless Function
// ─────────────────────────────────────────────────────────────────────────
// INTEGRACIÓN PENDIENTE: reemplazar MOCK_DATA con llamada real al proveedor
//
//   const res = await fetch(PROVEEDOR_URL, {
//     headers: { 'Authorization': `Bearer ${process.env.DOWNTACK_API_KEY}` }
//   });
//   const json = await res.json();
//
// La forma del JSON esperado está documentada en MOCK_DATA abajo.
// ─────────────────────────────────────────────────────────────────────────

// TODO: reemplazar con URL real del proveedor
const PROVEEDOR_URL = process.env.DOWNTACK_API_URL ?? null;
const PROVEEDOR_KEY = process.env.DOWNTACK_API_KEY ?? null;

// ── Datos de ejemplo (estructura exacta del proveedor) ────────────────────
// Cuando tengas la API real, este objeto deja de usarse.
const MOCK_DATA = {
  downtackcom: 1775843699,
  data: {
    hacienda: [
      { nombre: 'inmag',                    valor: '4329.886',  valorPara: '2026-04-08T00:00:00-04:00', moneda: 'ar.canuelas.inmag'                                          },
      { nombre: 'igmag',                    valor: '3675.201',  valorPara: '2026-04-08T00:00:00-04:00', moneda: 'ar.canuelas.igmag'                                          },
      { nombre: 'arrendamiento',            valor: '4498.698',  valorPara: '2026-04-08T00:00:00-04:00', moneda: 'ar.canuelas.arrendamiento'                                   },
      { nombre: 'Novillos Esp.joven + 430', valor: '4365.072',  valorPara: '2026-04-10T11:27:11-04:00', moneda: 'ar.canuelas.resol.2018.32.apn.novillos.esp.joven.+.430'     },
      { nombre: 'Novillos Regular H 430',   valor: '3986.069',  valorPara: '2026-04-10T11:27:11-04:00', moneda: 'ar.canuelas.resol.2018.32.apn.novillos.regular.h.430'        },
      { nombre: 'Novillos Regular + 430',   valor: '3840.501',  valorPara: '2026-04-10T11:27:11-04:00', moneda: 'ar.canuelas.resol.2018.32.apn.novillos.regular.+.430'        },
      { nombre: 'Novillitos Esp. H 390',    valor: '4830',      valorPara: '2026-04-10T11:27:11-04:00', moneda: 'ar.canuelas.resol.2018.32.apn.novillitos.esp.h.390'          },
      { nombre: 'Novillitos Esp. + 390',    valor: '4487.866',  valorPara: '2026-04-10T11:27:11-04:00', moneda: 'ar.canuelas.resol.2018.32.apn.novillitos.esp.+.390'          },
      { nombre: 'Novillitos Regular',       valor: '3878.16',   valorPara: '2026-04-10T11:27:11-04:00', moneda: 'ar.canuelas.resol.2018.32.apn.novillitos.regular'            },
      { nombre: 'Vaquillonas Esp. H 390',   valor: '4784.117',  valorPara: '2026-04-10T11:27:11-04:00', moneda: 'ar.canuelas.resol.2018.32.apn.vaquillonas.esp.h.390'        },
      { nombre: 'Vaquillonas Esp. + 390',   valor: '4085.257',  valorPara: '2026-04-10T11:27:11-04:00', moneda: 'ar.canuelas.resol.2018.32.apn.vaquillonas.esp.+.390'        },
      { nombre: 'Vaquillonas Regular',      valor: '3398.712',  valorPara: '2026-04-10T11:27:11-04:00', moneda: 'ar.canuelas.resol.2018.32.apn.vaquillonas.regular'          },
      { nombre: 'Vacas Esp.joven H 430',    valor: '2377.397',  valorPara: '2026-04-10T11:27:11-04:00', moneda: 'ar.canuelas.resol.2018.32.apn.vacas.esp.joven.h.430'        },
      { nombre: 'Vacas Esp.joven + 430',    valor: '3212.238',  valorPara: '2026-04-10T11:27:11-04:00', moneda: 'ar.canuelas.resol.2018.32.apn.vacas.esp.joven.+.430'        },
      { nombre: 'Vacas Regular',            valor: '2656.082',  valorPara: '2026-04-10T11:27:11-04:00', moneda: 'ar.canuelas.resol.2018.32.apn.vacas.regular'                },
      { nombre: 'Vacas Conserva Buena',     valor: '2209.302',  valorPara: '2026-04-10T11:27:11-04:00', moneda: 'ar.canuelas.resol.2018.32.apn.vacas.conserva.buena'         },
      { nombre: 'Vacas Conserva Inferior',  valor: '1970.54',   valorPara: '2026-04-10T11:27:11-04:00', moneda: 'ar.canuelas.resol.2018.32.apn.vacas.conserva.inferior'      },
      { nombre: 'Toros Esp.',               valor: '2854.99',   valorPara: '2026-04-10T11:27:11-04:00', moneda: 'ar.canuelas.resol.2018.32.apn.toros.esp.'                   },
      { nombre: 'Toros Regular',            valor: '2464.061',  valorPara: '2026-04-10T11:27:11-04:00', moneda: 'ar.canuelas.resol.2018.32.apn.toros.regular'               },
      { nombre: 'Mej Esp. H 430',           valor: '4209.657',  valorPara: '2026-04-10T11:27:11-04:00', moneda: 'ar.canuelas.resol.2018.32.apn.mej.esp.h.430'               },
      { nombre: 'Mej Regular',              valor: '2119.104',  valorPara: '2026-04-10T11:27:11-04:00', moneda: 'ar.canuelas.resol.2018.32.apn.mej.regular'                 },
    ],
  },
};

// ── Transformación del JSON del proveedor → formato interno ───────────────
// Agrupa por categoría y extrae variaciones cuando el histórico esté disponible.
function transformar(json) {
  const items = json?.data?.hacienda ?? [];
  if (!items.length) throw new Error('Sin datos de hacienda en la respuesta');

  // Separar índices Cañuelas vs categorías de faena
  const INDICES_IDS = ['ar.canuelas.inmag', 'ar.canuelas.igmag', 'ar.canuelas.arrendamiento'];

  const indices = [];
  const categorias = [];

  for (const item of items) {
    const valor = parseFloat(item.valor);
    if (isNaN(valor)) continue;

    const entry = {
      id:        item.moneda,
      nombre:    item.nombre.trim(),
      valor,
      fecha:     item.valorPara,
      unidad:    item.moneda === 'ar.canuelas.arrendamiento' ? 'ARS/ha/año' : 'ARS/kg vivo',
    };

    if (INDICES_IDS.includes(item.moneda)) {
      indices.push(entry);
    } else {
      categorias.push(entry);
    }
  }

  // Agrupar categorías por tipo (novillos, novillitos, vaquillonas, vacas, toros, mejores)
  const GRUPOS = [
    { id: 'novillos',    label: 'Novillos',    match: n => n.toLowerCase().includes('novillo') && !n.toLowerCase().includes('novillito') },
    { id: 'novillitos',  label: 'Novillitos',  match: n => n.toLowerCase().includes('novillito') },
    { id: 'vaquillonas', label: 'Vaquillonas', match: n => n.toLowerCase().includes('vaquillona') },
    { id: 'vacas',       label: 'Vacas',       match: n => n.toLowerCase().includes('vaca') },
    { id: 'toros',       label: 'Toros',       match: n => n.toLowerCase().includes('toro') },
    { id: 'mejores',     label: 'Mejores',     match: n => n.toLowerCase().startsWith('mej') },
  ];

  const grupos = GRUPOS.map(g => ({
    ...g,
    items: categorias.filter(c => g.match(c.nombre)),
  })).filter(g => g.items.length > 0);

  // Fecha más reciente disponible
  const fechas = items.map(i => i.valorPara).filter(Boolean).sort().reverse();
  const fechaActual = fechas[0] ?? null;

  return { indices, grupos, fechaActual, raw: items };
}

// ── Handler ───────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');

  let json;
  let fuente;
  let esMock = false;

  try {
    if (PROVEEDOR_URL && PROVEEDOR_KEY) {
      // ── Llamada real al proveedor ────────────────────────────────────────
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      try {
        const apiRes = await fetch(PROVEEDOR_URL, {
          signal:  controller.signal,
          headers: {
            'Authorization': `Bearer ${PROVEEDOR_KEY}`,
            'Accept':        'application/json',
            'User-Agent':    'RadarAgro/1.0',
          },
        });
        if (!apiRes.ok) throw new Error(`Proveedor HTTP ${apiRes.status}`);
        json   = await apiRes.json();
        fuente = 'Cañuelas MAG · datos en tiempo real';
      } finally {
        clearTimeout(timer);
      }
    } else {
      // ── Sin credenciales → usar mock ─────────────────────────────────────
      json    = MOCK_DATA;
      fuente  = 'Cañuelas MAG · datos de ejemplo (configurar DOWNTACK_API_URL y DOWNTACK_API_KEY)';
      esMock  = true;
    }

    const payload = transformar(json);

    return res.status(200).json({
      ok:      true,
      esMock,
      fuente,
      fecha:   payload.fechaActual,
      indices: payload.indices,
      grupos:  payload.grupos,
    });

  } catch (err) {
    console.error('[api/hacienda]', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
