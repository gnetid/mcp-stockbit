// research/probes/find_screener_chunks.mjs
import fs from 'fs';

const traffic = JSON.parse(fs.readFileSync('research/dumps/captured_traffic.json', 'utf8'));
const jsUrls = Array.from(new Set(
  (traffic.requests || []).map(r => r.url).filter(u => u && u.endsWith('.js') && u.includes('storage.stockbit.com'))
));

async function findScreener() {
  const matches = new Set();
  for (const u of jsUrls) {
    try {
      const res = await fetch(u);
      const text = await res.text();
      const m = text.match(/["'`](\/screener[a-zA-Z0-9_\-\/]+)["'`]/g) || [];
      m.forEach(x => matches.add(x.slice(1, -1)));
    } catch(e) {}
  }
  console.log('Screener paths found in chunks:', Array.from(matches));
}

findScreener();
