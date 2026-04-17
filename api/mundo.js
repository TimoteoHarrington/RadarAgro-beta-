// api/mundo.js — Vercel Serverless Function
// Proxea Yahoo Finance para precios globales con sparklines intradiarios

import https from 'https';

const YAHOO_BASE = process.env.YAHOO_FINANCE ?? 'https://query1.finance.yahoo.com/v8/finance/chart';

const SYMBOLS = [
  // ── Agro — futuros CBOT ──
  { id: 'soy',     symbol: 'ZS%3DF',     name: 'Soja',          icon: '🌱', group: 'Agro', toTon: 0.367437 },
  { id: 'soymeal', symbol: 'ZM%3DF',     name: 'Harina Soja',   icon: '🫘', group: 'Agro', toTon: 1.10231  },
  { id: 'soyoil',  symbol: 'ZL%3DF',     name: 'Aceite Soja',   icon: '🫙', group: 'Agro', toTon: 220.462  },
  { id: 'corn',    symbol: 'ZC%3DF',     name: 'Maíz',          icon: '🌽', group: 'Agro', toTon: 0.393683 },
  { id: 'wheat',   symbol: 'ZW%3DF',     name: 'Trigo CBOT',    icon: '🌾', group: 'Agro', toTon: 0.367437 },
  { id: 'kwheat',  symbol: 'KE%3DF',     name: 'Trigo KC',      icon: '🌾', group: 'Agro', toTon: 0.367437 },
  { id: 'sunfl',   symbol: 'SB%3DF',     name: 'Girasol (SB)',  icon: '🌻', group: 'Agro', toTon: 22.0462  },
  { id: 'cotton',  symbol: 'CT%3DF',     name: 'Algodón',       icon: '🌿', group: 'Agro', toTon: 22.0462  },
  // ── Energía ──
  { id: 'oil',     symbol: 'CL%3DF',     name: 'WTI',           icon: '🛢️', group: 'Energía' },
  { id: 'brent',   symbol: 'BZ%3DF',     name: 'Brent',         icon: '🛢️', group: 'Energía' },
  { id: 'natgas',  symbol: 'NG%3DF',     name: 'Gas Natural',   icon: '🔥', group: 'Energía' },
  { id: 'heatoil', symbol: 'HO%3DF',     name: 'Gasoil',        icon: '⛽', group: 'Energía' },
  // ── Metales ──
  { id: 'gold',    symbol: 'GC%3DF',     name: 'Oro',           icon: '🥇', group: 'Metales' },
  { id: 'silver',  symbol: 'SI%3DF',     name: 'Plata',         icon: '🥈', group: 'Metales' },
  { id: 'copper',  symbol: 'HG%3DF',     name: 'Cobre',         icon: '🔶', group: 'Metales' },
  { id: 'plat',    symbol: 'PL%3DF',     name: 'Platino',       icon: '⬜', group: 'Metales' },
  // ── Monedas ──
  { id: 'eurusd',  symbol: 'EURUSD%3DX', name: 'EUR/USD',       icon: '🇪🇺', group: 'Monedas' },
  { id: 'gbpusd',  symbol: 'GBPUSD%3DX', name: 'GBP/USD',       icon: '🇬🇧', group: 'Monedas' },
  { id: 'usdjpy',  symbol: 'JPY%3DX',    name: 'USD/JPY',       icon: '🇯🇵', group: 'Monedas' },
  { id: 'usdcny',  symbol: 'CNY%3DX',    name: 'USD/CNY',       icon: '🇨🇳', group: 'Monedas' },
  { id: 'usdbrl',  symbol: 'BRL%3DX',    name: 'USD/BRL',       icon: '🇧🇷', group: 'Monedas' },
  { id: 'usdclp',  symbol: 'CLP%3DX',    name: 'USD/CLP',       icon: '🇨🇱', group: 'Monedas' },
  { id: 'usdmxn',  symbol: 'MXN%3DX',    name: 'USD/MXN',       icon: '🇲🇽', group: 'Monedas' },
  { id: 'usdcop',  symbol: 'COP%3DX',    name: 'USD/COP',       icon: '🇨🇴', group: 'Monedas' },
  // ── Índices ──
  { id: 'merval',  symbol: '%5EMERV',    name: 'Merval',        icon: '🇦🇷', group: 'Índices' },
  { id: 'spx',     symbol: 'ES%3DF',     name: 'S&P 500',       icon: '📈', group: 'Índices' },
  { id: 'nasdaq',  symbol: 'NQ%3DF',     name: 'Nasdaq 100',    icon: '💻', group: 'Índices' },
  { id: 'dow',     symbol: 'YM%3DF',     name: 'Dow Jones',     icon: '🏦', group: 'Índices' },
  { id: 'bovespa', symbol: '%5EBVSP',    name: 'Bovespa',       icon: '🇧🇷', group: 'Índices' },
  { id: 'dax',     symbol: '%5EGDAXI',   name: 'DAX',           icon: '🇩🇪', group: 'Índices' },
  { id: 'nikkei',  symbol: '%5EN225',    name: 'Nikkei 225',    icon: '🇯🇵', group: 'Índices' },
  { id: 'vix',     symbol: '%5EVIX',     name: 'VIX',           icon: '📊', group: 'Índices' },
  // ── Tasas EE.UU. ──
  { id: 'us2y',    symbol: '%5EIRX',     name: 'UST 2Y',        icon: '🇺🇸', group: 'Tasas' },
  { id: 'us5y',    symbol: '%5EFVX',     name: 'UST 5Y',        icon: '🇺🇸', group: 'Tasas' },
  { id: 'tnx',     symbol: '%5ETNX',     name: 'UST 10Y',       icon: '🇺🇸', group: 'Tasas' },
  { id: 'us30y',   symbol: '%5ETYX',     name: 'UST 30Y',       icon: '🇺🇸', group: 'Tasas' },
  // ── Crypto ──
  { id: 'btc',     symbol: 'BTC-USD',    name: 'Bitcoin',       icon: '₿',  group: 'Crypto' },
  { id: 'eth',     symbol: 'ETH-USD',    name: 'Ethereum',      icon: 'Ξ',  group: 'Crypto' },
  { id: 'sol',     symbol: 'SOL-USD',    name: 'Solana',        icon: '◎',  group: 'Crypto' },
  { id: 'usdt',    symbol: 'USDT-USD',   name: 'USDT',          icon: '💵', group: 'Crypto' },
];

function fetchYahooRaw(symbolEncoded, interval, range) {
  return new Promise((resolve, reject) => {
    const url = `${YAHOO_BASE}/${symbolEncoded}?interval=${interval}&range=${range}`;
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
    req.setTimeout(12000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function fetchYahoo(symbolEncoded) {
  const result = await fetchYahooRaw(symbolEncoded, '5m', '1d');
  if (result.sparkline.length < 10) {
    return fetchYahooRaw(symbolEncoded, '15m', '5d');
  }
  return result;
}

function fetchYahooChart(symbolEncoded, interval, range) {
  return new Promise((resolve, reject) => {
    const url = `${YAHOO_BASE}/${symbolEncoded}?interval=${interval}&range=${range}`;
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
          resolve(points);
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.setTimeout(12000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, max-age=60',
};

export default async function handler(req, res) {
  Object.entries(HEADERS).forEach(([k, v]) => res.setHeader(k, v));

  const { symbol, range } = req.query;

  // Modo detalle: /api/mundo?symbol=soy&range=5d
  if (symbol) {
    try {
      const sym = SYMBOLS.find(s => s.id === symbol);
      if (!sym) return res.status(404).json({ error: 'Unknown symbol' });

      let resolvedRange = range || '5d';
      let interval = resolvedRange === '1d' ? '5m' : resolvedRange === '5d' ? '15m' : resolvedRange === '1mo' ? '1h' : '1d';
      let points = await fetchYahooChart(sym.symbol, interval, resolvedRange);

      if (points.length === 0 && resolvedRange === '1d') {
        resolvedRange = '5d'; interval = '15m';
        points = await fetchYahooChart(sym.symbol, interval, resolvedRange);
      }

      const factor = sym.toTon || 1;
      const convertedPoints = factor !== 1
        ? points.map(p => ({ t: p.t, v: Math.round(p.v * factor * 100) / 100 }))
        : points;

      return res.status(200).json({ id: sym.id, name: sym.name, icon: sym.icon, group: sym.group, range: resolvedRange, points: convertedPoints });
    } catch (e) {
      return res.status(500).json({ error: e.message });
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
          price:     conv(price),
          prevClose: conv(prevClose),
          change:    Math.round(change * 1000) / 1000,
          sparkline: sparkline.map(v => conv(v)),
        };
      }
      return { ...s, price: null, prevClose: null, change: null, sparkline: [], error: true };
    });

    return res.status(200).json({ data, updated: new Date().toISOString() });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
