// netlify/functions/mundo.js
// Proxea Yahoo Finance para precios globales con sparklines intradiarios

import https from 'https';

const SYMBOLS = [
  // ── Agro — futuros CBOT, los más relevantes para el mercado argentino ──
  { id: 'soy',     symbol: 'ZS%3DF',     name: 'Soja',          icon: '🌱', group: 'Agro', toTon: 0.367437 }, // ¢/bu → USD/t  (1bu=27.2155kg)
  { id: 'soymeal', symbol: 'ZM%3DF',     name: 'Harina Soja',   icon: '🫘', group: 'Agro', toTon: 1.10231  }, // USD/short ton → USD/t
  { id: 'soyoil',  symbol: 'ZL%3DF',     name: 'Aceite Soja',   icon: '🫙', group: 'Agro', toTon: 220.462  }, // ¢/lb → USD/t
  { id: 'corn',    symbol: 'ZC%3DF',     name: 'Maíz',          icon: '🌽', group: 'Agro', toTon: 0.393683 }, // ¢/bu → USD/t  (1bu=25.4kg)
  { id: 'wheat',   symbol: 'ZW%3DF',     name: 'Trigo CBOT',    icon: '🌾', group: 'Agro', toTon: 0.367437 }, // ¢/bu → USD/t
  { id: 'kwheat',  symbol: 'KE%3DF',     name: 'Trigo KC',      icon: '🌾', group: 'Agro', toTon: 0.367437 }, // Trigo duro Kansas
  { id: 'sunfl',   symbol: 'SB%3DF',     name: 'Girasol (SB)',  icon: '🌻', group: 'Agro', toTon: 22.0462  }, // ¢/lb → USD/t  (proxy girasol)
  { id: 'cotton',  symbol: 'CT%3DF',     name: 'Algodón',       icon: '🌿', group: 'Agro', toTon: 22.0462  }, // ¢/lb → USD/t

  // ── Energía — impacta en costos agro: gasoil, gas, fertilizantes ──
  { id: 'oil',     symbol: 'CL%3DF',     name: 'WTI',           icon: '🛢️', group: 'Energía' }, // USD/barril
  { id: 'brent',   symbol: 'BZ%3DF',     name: 'Brent',         icon: '🛢️', group: 'Energía' }, // USD/barril
  { id: 'natgas',  symbol: 'NG%3DF',     name: 'Gas Natural',   icon: '🔥', group: 'Energía' }, // USD/MMBtu — base fertilizantes nitrogenados
  { id: 'heatoil', symbol: 'HO%3DF',     name: 'Gasoil',        icon: '⛽', group: 'Energía' }, // USD/galón — referencia gasoil agrícola

  // ── Metales ──
  { id: 'gold',    symbol: 'GC%3DF',     name: 'Oro',           icon: '🥇', group: 'Metales' },
  { id: 'silver',  symbol: 'SI%3DF',     name: 'Plata',         icon: '🥈', group: 'Metales' },
  { id: 'copper',  symbol: 'HG%3DF',     name: 'Cobre',         icon: '🔶', group: 'Metales' }, // Indicador actividad industrial global

  // ── Monedas — socios comerciales clave de Argentina ──
  { id: 'eurusd',  symbol: 'EURUSD%3DX', name: 'EUR/USD',       icon: '🇪🇺', group: 'Monedas' },
  { id: 'usdcny',  symbol: 'CNY%3DX',    name: 'USD/CNY',       icon: '🇨🇳', group: 'Monedas' }, // China: 1° comprador soja argentina
  { id: 'usdbrl',  symbol: 'BRL%3DX',    name: 'USD/BRL',       icon: '🇧🇷', group: 'Monedas' }, // Brasil: principal competidor
  { id: 'usdclp',  symbol: 'CLP%3DX',    name: 'USD/CLP',       icon: '🇨🇱', group: 'Monedas' },
  { id: 'usdmxn',  symbol: 'MXN%3DX',    name: 'USD/MXN',       icon: '🇲🇽', group: 'Monedas' },

  // ── Índices bursátiles ──
  { id: 'spx',     symbol: 'ES%3DF',     name: 'S&P 500',       icon: '📈', group: 'Índices' },
  { id: 'nasdaq',  symbol: 'NQ%3DF',     name: 'Nasdaq 100',    icon: '💻', group: 'Índices' },
  { id: 'dow',     symbol: 'YM%3DF',     name: 'Dow Jones',     icon: '🏦', group: 'Índices' },
  { id: 'bovespa', symbol: '%5EBVSP',    name: 'Bovespa',       icon: '🇧🇷', group: 'Índices' }, // Brasil — referencia regional
  { id: 'vix',     symbol: '%5EVIX',     name: 'VIX',           icon: '📊', group: 'Índices' }, // Volatilidad: sube → emergentes caen

  // ── Tasas de interés EE.UU. ──
  { id: 'us2y',    symbol: '%5EIRX',     name: 'UST 2Y',        icon: '🇺🇸', group: 'Tasas' },
  { id: 'tnx',     symbol: '%5ETNX',     name: 'UST 10Y',       icon: '🇺🇸', group: 'Tasas' },
  { id: 'us30y',   symbol: '%5ETYX',     name: 'UST 30Y',       icon: '🇺🇸', group: 'Tasas' },

  // ── Crypto ──
  { id: 'btc',     symbol: 'BTC-USD',    name: 'Bitcoin',       icon: '₿',  group: 'Crypto' },
  { id: 'eth',     symbol: 'ETH-USD',    name: 'Ethereum',      icon: 'Ξ',  group: 'Crypto' },
  { id: 'usdt',    symbol: 'USDT-USD',   name: 'USDT',          icon: '💵', group: 'Crypto' },
];


function fetchYahooRaw(symbolEncoded, interval, range) {
  return new Promise((resolve, reject) => {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbolEncoded}?interval=${interval}&range=${range}`;
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const result = json.chart.result[0];
          const meta = result.meta;
          const closes = result.indicators.quote[0].close || [];
          const spark = closes.filter(v => v !== null);
          resolve({
            price:     meta.regularMarketPrice,
            prevClose: meta.chartPreviousClose || meta.previousClose || 0,
            sparkline: spark,
          });
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function fetchYahoo(symbolEncoded) {
  const result = await fetchYahooRaw(symbolEncoded, '5m', '1d');
  // Si el mercado está cerrado (fin de semana / feriado), fallback a 5d
  if (result.sparkline.length < 10) {
    return fetchYahooRaw(symbolEncoded, '15m', '5d');
  }
  return result;
}

function fetchYahooChart(symbolEncoded, interval, range) {
  return new Promise((resolve, reject) => {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbolEncoded}?interval=${interval}&range=${range}`;
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const result = json.chart.result[0];
          const timestamps = result.timestamp || [];
          const closes = result.indicators.quote[0].close || [];
          const points = [];
          for (let i = 0; i < timestamps.length; i++) {
            if (closes[i] !== null) points.push({ t: timestamps[i] * 1000, v: closes[i] });
          }
          resolve(points);  // raw — conversion applied per-symbol below
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

export const handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=60',
  };

  const qs = event.queryStringParameters || {};

  // Modo detalle: /api/mundo?symbol=soy&range=5d
  if (qs.symbol) {
    try {
      const sym = SYMBOLS.find(s => s.id === qs.symbol);
      if (!sym) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Unknown symbol' }) };

      let range = qs.range || '5d';
      let interval = range === '1d' ? '5m' : range === '5d' ? '15m' : range === '1mo' ? '1h' : '1d';
      let points = await fetchYahooChart(sym.symbol, interval, range);

      // Fallback: si 1d viene vacío (mercado cerrado), usar 5d
      if (points.length === 0 && range === '1d') {
        range = '5d'; interval = '15m';
        points = await fetchYahooChart(sym.symbol, interval, range);
      }

      const factor = sym.toTon || 1;
      const convertedPoints = factor !== 1
        ? points.map(p => ({ t: p.t, v: Math.round(p.v * factor * 100) / 100 }))
        : points;
      return {
        statusCode: 200, headers,
        body: JSON.stringify({ id: sym.id, name: sym.name, icon: sym.icon, group: sym.group, range, points: convertedPoints }),
      };
    } catch (e) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
    }
  }

  // Modo resumen: todos los símbolos
  try {
    const results = await Promise.allSettled(SYMBOLS.map(s => fetchYahoo(s.symbol)));

    const data = SYMBOLS.map((s, i) => {
      const r = results[i];
      if (r.status === 'fulfilled') {
        const { price, prevClose, sparkline } = r.value;
        const change = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;
        const factor = s.toTon || 1;
        const conv = v => v != null ? Math.round(v * factor * 100) / 100 : null;
        return { ...s,
          price:    conv(price),
          prevClose: conv(prevClose),
          change: Math.round(change * 1000) / 1000,
          sparkline: sparkline.map(v => conv(v)),
        };
      }
      return { ...s, price: null, prevClose: null, change: null, sparkline: [], error: true };
    });

    return {
      statusCode: 200, headers,
      body: JSON.stringify({ data, updated: new Date().toISOString() }),
    };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
