// research/probes/find_bf_paths.mjs
import fs from 'fs';

const traffic = JSON.parse(fs.readFileSync('research/dumps/captured_traffic.json', 'utf8'));
const bfUrls = (traffic.requests || []).map(r => r.url).filter(u => u && u.includes('broker-flow/1.2.11') && u.endsWith('.js'));

async function inspect() {
  for (const u of bfUrls) {
    try {
      const res = await fetch(u);
      const text = await res.text();
      const m = text.match(/["'`](\/order-trade\/[a-zA-Z0-9_\-\/]+)["'`]/g) || [];
      if (m.length > 0) {
        console.log('In', u.split('/').pop(), Array.from(new Set(m.map(x => x.slice(1, -1)))));
      }
    } catch(e) {}
  }
}
inspect();
