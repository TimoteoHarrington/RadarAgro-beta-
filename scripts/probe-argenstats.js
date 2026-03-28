// Probe ArgensStats API endpoints — tests multiple bases, paths and auth headers
const TOKEN = 'as_prod_s8CJrLnfKrAfesUAUszH78dHM43otLX7';

const BASES = [
  'https://argenstats.com',
  'https://argenstats.com.ar',
  'https://api.argenstats.com',
  'https://api.argenstats.com.ar',
];

const PATHS = [
  '/api/v1/ipc',
  '/api/v1/emae',
  '/api/v1/riesgo-pais',
  '/api/v1/inflation',
  '/api/v1/economic-activity',
  '/api/v1/country-risk',
  '/api/v1/indec/ipc',
  '/api/v1/indec/emae',
  '/api/v1/indices/ipc',
  '/api/v1/indices/emae',
  '/api/v1/indices/riesgo-pais',
  '/api/ipc',
  '/api/emae',
  '/api/riesgo-pais',
  '/v1/ipc',
  '/v1/emae',
  '/v1/riesgo-pais',
];

const HEADER_VARIANTS = [
  { label: 'x-api-key',       headers: { 'x-api-key': TOKEN } },
  { label: 'Bearer',          headers: { 'Authorization': `Bearer ${TOKEN}` } },
  { label: 'Token',           headers: { 'Authorization': `Token ${TOKEN}` } },
  { label: 'api-key',         headers: { 'api-key': TOKEN } },
  { label: 'Bearer+x-api-key', headers: { 'Authorization': `Bearer ${TOKEN}`, 'x-api-key': TOKEN } },
];

async function probe(url, headers) {
  try {
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json', ...headers },
      signal: AbortSignal.timeout(6000),
    });
    const text = await res.text();
    const isHtml = text.trimStart().startsWith('<!');
    const preview = text.slice(0, 250).replace(/\s+/g, ' ');
    return { status: res.status, isHtml, preview };
  } catch (e) {
    return { status: 0, isHtml: false, preview: e.message.slice(0, 80) };
  }
}

async function main() {
  console.log('Probing ArgensStats API...\n');
  const successes = [];

  for (const base of BASES) {
    for (const path of PATHS) {
      const url = `${base}${path}`;
      // Try first header variant
      const { status, isHtml, preview } = await probe(url, HEADER_VARIANTS[0].headers);
      if (status === 200 && !isHtml) {
        console.log(`[200 OK] ${url}`);
        console.log(`  ${preview}\n`);
        successes.push({ url, status, preview });
      } else if (status !== 404 && status !== 0 && !isHtml) {
        console.log(`[${status}] ${url} — ${preview}`);
      }
    }
  }

  // If nothing worked, try all header variants on key paths
  if (successes.length === 0) {
    console.log('\nNo 200s found. Trying all auth header variants on key paths...\n');
    for (const base of BASES) {
      for (const path of ['/api/v1/ipc', '/api/v1/emae', '/api/v1/riesgo-pais']) {
        for (const { label, headers } of HEADER_VARIANTS) {
          const url = `${base}${path}`;
          const { status, isHtml, preview } = await probe(url, headers);
          if (status !== 0) {
            console.log(`[${status}] (${label}) ${url}`);
            if (!isHtml && status !== 404) console.log(`  => ${preview}`);
          }
        }
      }
    }
  }

  console.log('\nDone.');
}

main();
