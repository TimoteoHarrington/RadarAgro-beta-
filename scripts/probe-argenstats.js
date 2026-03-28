// Probe ArgensStats API endpoints to discover the correct URL structure
const TOKEN = 'as_prod_s8CJrLnfKrAfesUAUszH78dHM43otLX7';

const candidates = [
  'https://argenstats.com/api/v1/ipc',
  'https://argenstats.com/api/v1/emae',
  'https://argenstats.com/api/v1/riesgo-pais',
  'https://argenstats.com/api/v1/indices/ipc',
  'https://argenstats.com/api/v1/indices/emae',
  'https://argenstats.com/api/v1/indices/riesgo-pais',
  'https://argenstats.com/api/v1/indec/ipc',
  'https://argenstats.com/api/v1/indec/emae',
  'https://argenstats.com/api/ipc',
  'https://argenstats.com/api/emae',
  'https://argenstats.com/api/riesgo-pais',
  'https://api.argenstats.com/v1/ipc',
  'https://api.argenstats.com/v1/emae',
  'https://api.argenstats.com/v1/riesgo-pais',
  'https://api.argenstats.com/ipc',
  'https://api.argenstats.com/emae',
  'https://api.argenstats.com/riesgo-pais',
];

async function probe(url) {
  const headers = {
    'Authorization': `Bearer ${TOKEN}`,
    'x-api-key': TOKEN,
  };
  try {
    const res = await fetch(url, { headers });
    const text = await res.text();
    const preview = text.slice(0, 300).replace(/\s+/g, ' ');
    const isHtml = text.trimStart().startsWith('<!');
    console.log(`[${res.status}] ${url}`);
    if (res.status !== 404 && !isHtml) {
      console.log(`  => ${preview}`);
    }
  } catch (e) {
    console.log(`[ERR] ${url} — ${e.message}`);
  }
}

async function main() {
  console.log('Probing ArgensStats API endpoints...\n');
  for (const url of candidates) {
    await probe(url);
  }
}

main();
