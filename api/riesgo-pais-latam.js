// api/riesgo-pais-latam.js — Vercel Serverless Function
// Fuente: API del Banco Mundial (api.worldbank.org) — pública, gratuita, sin auth.
// Indicador: EMBI.PBND.SR — EMBI bond spread por país, frecuencia mensual.
// Documentación: https://datahelpdesk.worldbank.org/knowledgebase/articles/898581
//
// Si el Banco Mundial falla o no tiene dato reciente, cae a fallbacks
// actualizados a abril 2026 (fuente: Infobae / Bloomberg Línea).

import https from 'https';

const PAISES = [
  { nombre: 'Brasil',    iso: 'bra', wbCode: 'BR',  emoji: '🇧🇷', fallback: 201 },
  { nombre: 'México',    iso: 'mex', wbCode: 'MX',  emoji: '🇲🇽', fallback: 236 },
  { nombre: 'Colombia',  iso: 'col', wbCode: 'CO',  emoji: '🇨🇴', fallback: 274 },
  { nombre: 'Chile',     iso: 'chl', wbCode: 'CL',  emoji: '🇨🇱', fallback: 97  },
  { nombre: 'Perú',      iso: 'per', wbCode: 'PE',  emoji: '🇵🇪', fallback: 128 },
  { nombre: 'Uruguay',   iso: 'ury', wbCode: 'UY',  emoji: '🇺🇾', fallback: 70  },
  { nombre: 'Ecuador',   iso: 'ecu', wbCode: 'EC',  emoji: '🇪🇨', fallback: 490 },
  { nombre: 'Paraguay',  iso: 'pry', wbCode: 'PY',  emoji: '🇵🇾', fallback: 126 },
  { nombre: 'Bolivia',   iso: 'bol', wbCode: 'BO',  emoji: '🇧🇴', fallback: 517 },
  { nombre: 'Venezuela', iso: 'ven', wbCode: 'VE',  emoji: '🇻🇪', fallback: 9625 },
];

// El Banco Mundial devuelve el spread en puntos porcentuales (ej: 2.01 = 201 pb)
// Necesitamos multiplicar x100 para convertir a puntos básicos.
function fetchWorldBank(wbCode) {
  return new Promise((resolve, reject) => {
    // mrv=1 = most recent value; format=json
    const url = `https://api.worldbank.org/v2/country/${wbCode}/indicator/EMBI.PBND.SR?format=json&mrv=1&per_page=1`;
    const req = https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RadarAgro/1.0)' },
    }, res => {
      let body = '';
      res.on('data', c => (body += c));
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          // Estructura: [metadata, [{ value, date, ... }]]
          const records = json[1];
          if (!records || records.length === 0) throw new Error('sin datos');
          const val = records[0]?.value;
          if (val == null) throw new Error('valor null');
          // El Banco Mundial lo devuelve en puntos básicos directamente
          const pb = Math.round(parseFloat(val));
          if (isNaN(pb) || pb <= 0) throw new Error('valor inválido');
          resolve(pb);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(12000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  // 6hs de cache — el dato del Banco Mundial es mensual, no tiene sentido refrescar más seguido
  'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=43200',
};

export default async function handler(req, res) {
  Object.entries(HEADERS).forEach(([k, v]) => res.setHeader(k, v));

  const settled = await Promise.allSettled(
    PAISES.map(p => fetchWorldBank(p.wbCode))
  );

  const data = PAISES.map((p, i) => {
    const r = settled[i];
    const live = r.status === 'fulfilled';
    return {
      nombre: p.nombre,
      iso:    p.iso,
      emoji:  p.emoji,
      pb:     live ? r.value : p.fallback,
      live,   // false = usando fallback estático
    };
  });

  return res.status(200).json({ data, updated: new Date().toISOString() });
}
