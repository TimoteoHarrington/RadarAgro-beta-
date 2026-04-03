// api/cotizaciones.js — Vercel Serverless Function
// Proxea: Dólar Oficial (Yahoo), CCL y MEP (data912), Riesgo País (ArgentinaDatos)

import https from 'https';

const YAHOO_BASE = process.env.YAHOO_FINANCE ?? 'https://query1.finance.yahoo.com/v8/finance/chart';

function fetchJSON(url, maxRedirects = 3) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && maxRedirects > 0) {
        res.resume();
        return resolve(fetchJSON(res.headers.location, maxRedirects - 1));
      }
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('JSON inválido desde ' + url)); }
      });
    }).on('error', reject);
  });
}

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, max-age=60',
};

export default async function handler(req, res) {
  Object.entries(HEADERS).forEach(([k, v]) => res.setHeader(k, v));

  try {
    const [yahooData, bonds, riesgo] = await Promise.allSettled([
      fetchJSON(`${YAHOO_BASE}/ARS%3DX?interval=1d&range=5d`),
      fetchJSON('https://data912.com/live/arg_bonds'),
      fetchJSON('https://api.argentinadatos.com/v1/finanzas/indices/riesgo-pais/ultimo'),
    ]);

    // Dólar Oficial desde Yahoo Finance (ARS=X)
    let oficial = null;
    if (yahooData.status === 'fulfilled') {
      try {
        const meta = yahooData.value.chart.result[0].meta;
        oficial = {
          price:     meta.regularMarketPrice,
          prevClose: meta.chartPreviousClose || meta.previousClose || 0,
        };
      } catch (e) { /* ignorar */ }
    }

    // CCL y MEP desde data912 (bonos AL30)
    let ccl = null, mep = null;
    if (bonds.status === 'fulfilled' && Array.isArray(bonds.value)) {
      const al30  = bonds.value.find(b => b.symbol === 'AL30');
      const al30d = bonds.value.find(b => b.symbol === 'AL30D');
      const al30c = bonds.value.find(b => b.symbol === 'AL30C');
      const arsPrice = al30 ? parseFloat(al30.c) : 0;

      if (al30c && arsPrice > 0) {
        const cclUsd = parseFloat(al30c.c);
        if (cclUsd > 0) ccl = { price: Math.round((arsPrice / cclUsd) * 100) / 100 };
      }
      if (al30d && arsPrice > 0) {
        const mepUsd = parseFloat(al30d.c);
        if (mepUsd > 0) mep = { price: Math.round((arsPrice / mepUsd) * 100) / 100 };
      }
    }

    // Riesgo País desde ArgentinaDatos
    let riesgoPais = null;
    if (riesgo.status === 'fulfilled') {
      const val = riesgo.value;
      if (val?.valor != null) riesgoPais = { value: val.valor };
    }

    return res.status(200).json({ oficial, ccl, mep, riesgoPais, updated: new Date().toISOString() });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
