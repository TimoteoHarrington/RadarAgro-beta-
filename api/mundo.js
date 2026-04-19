// api/mundo.js — Vercel Edge Function
// Proxea Yahoo Finance para precios globales con sparklines intradiarios
// Migrado a Edge Runtime: usa fetch nativo (más rápido, IPs de Cloudflare)

export const config = { runtime: 'edge' };

const YAHOO_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';

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
  // ── Contratos CBOT por vencimiento (futuros específicos) ──
  { id: 'zs_may26', symbol: 'ZSK26',  name: 'Soja May26',    icon: '🌱', group: 'AgroFut', toTon: 0.367437, contrato: 'MAY 26', grano: 'soja'  },
  { id: 'zs_jul26', symbol: 'ZSN26',  name: 'Soja Jul26',    icon: '🌱', group: 'AgroFut', toTon: 0.367437, contrato: 'JUL 26', grano: 'soja'  },
  { id: 'zs_nov26', symbol: 'ZSX26',  name: 'Soja Nov26',    icon: '🌱', group: 'AgroFut', toTon: 0.367437, contrato: 'NOV 26', grano: 'soja'  },
  { id: 'zc_may26', symbol: 'ZCK26',  name: 'Maíz May26',    icon: '🌽', group: 'AgroFut', toTon: 0.393683, contrato: 'MAY 26', grano: 'maiz'  },
  { id: 'zc_jul26', symbol: 'ZCN26',  name: 'Maíz Jul26',    icon: '🌽', group: 'AgroFut', toTon: 0.393683, contrato: 'JUL 26', grano: 'maiz'  },
  { id: 'zc_sep26', symbol: 'ZCU26',  name: 'Maíz Sep26',    icon: '🌽', group: 'AgroFut', toTon: 0.393683, contrato: 'SEP 26', grano: 'maiz'  },
  { id: 'zc_dic26', symbol: 'ZCZ26',  name: 'Maíz Dic26',    icon: '🌽', group: 'AgroFut', toTon: 0.393683, contrato: 'DIC 26', grano: 'maiz'  },
  { id: 'zw_may26', symbol: 'ZWK26',  name: 'Trigo May26',   icon: '🌾', group: 'AgroFut', toTon: 0.367437, contrato: 'MAY 26', grano: 'trigo' },
  { id: 'zw_jul26', symbol: 'ZWN26',  name: 'Trigo Jul26',   icon: '🌾', group: 'AgroFut', toTon: 0.367437, contrato: 'JUL 26', grano: 'trigo' },
  { id: 'zw_sep26', symbol: 'ZWU26',  name: 'Trigo Sep26',   icon: '🌾', group: 'AgroFut', toTon: 0.367437, contrato: 'SEP 26', grano: 'trigo' },
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

const YAHOO_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
  'Accept': 'application/json',
};

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, s-maxage=60',
};

// Fetch con timeout usando AbortController (compatible con Edge Runtime)
async function fetchWithTimeout(url, ms = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { headers: YAHOO_HEADERS, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

async function fetchYahooRaw(symbolEncoded, interval, range) {
  const url = `${YAHOO_BASE}/${symbolEncoded}?interval=${interval}&range=${range}`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`Yahoo HTTP ${res.status}`);
  const json = await res.json();
  const result = json.chart.result[0];
  const meta = result.meta;
  const closes = result.indicators.quote[0].close || [];
  const spark = closes.filter(v => v !== null);
  return {
    price:     meta.regularMarketPrice,
    prevClose: meta.chartPreviousClose || meta.previousClose || 0,
    sparkline: spark,
  };
}

async function fetchYahoo(symbolEncoded) {
  const result = await fetchYahooRaw(symbolEncoded, '5m', '1d');
  if (result.sparkline.length < 10) {
    return fetchYahooRaw(symbolEncoded, '15m', '5d');
  }
  return result;
}

async function fetchYahooChart(symbolEncoded, interval, range) {
  const url = `${YAHOO_BASE}/${symbolEncoded}?interval=${interval}&range=${range}`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`Yahoo HTTP ${res.status}`);
  const json = await res.json();
  const result = json.chart.result[0];
  const timestamps = result.timestamp || [];
  const closes = result.indicators.quote[0].close || [];
  const points = [];
  for (let i = 0; i < timestamps.length; i++) {
    if (closes[i] !== null) points.push({ t: timestamps[i] * 1000, v: closes[i] });
  }
  return points;
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  const url = new URL(req.url);
  const symbol = url.searchParams.get('symbol');
  const range  = url.searchParams.get('range');

  // Modo detalle: /api/mundo?symbol=soy&range=5d
  if (symbol) {
    try {
      const sym = SYMBOLS.find(s => s.id === symbol);
      if (!sym) {
        return new Response(JSON.stringify({ error: 'Unknown symbol' }), { status: 404, headers: CORS });
      }

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

      return new Response(
        JSON.stringify({ id: sym.id, name: sym.name, icon: sym.icon, group: sym.group, range: resolvedRange, points: convertedPoints }),
        { status: 200, headers: CORS }
      );
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS });
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

    return new Response(
      JSON.stringify({ data, updated: new Date().toISOString() }),
      { status: 200, headers: CORS }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS });
  }
}
