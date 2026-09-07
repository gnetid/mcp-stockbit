// research/probes/find_financial_api_calls.mjs
async function main() {
  const r = await fetch('https://stockbit.com/_next/static/chunks/58988-b9e02cd2f247f460.js');
  const t = await r.text();
  console.log('Chunk length:', t.length);

  // Look for URL patterns or endpoints
  const re = /['"`](\/[a-zA-Z0-9_\-\/]+)['"`]/g;
  const urls = new Set();
  let m;
  while ((m = re.exec(t)) !== null) {
    if (m[1].length > 3 && !m[1].includes('node_modules') && !m[1].endsWith('.js')) {
      urls.add(m[1]);
    }
  }
  console.log('Endpoints found in 58988:');
  for (const u of urls) {
    console.log(' ', u);
  }
}
main();
