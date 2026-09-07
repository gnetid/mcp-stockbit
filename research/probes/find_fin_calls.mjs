// research/probes/find_fin_calls.mjs
import fs from 'fs';

const traffic = JSON.parse(fs.readFileSync('research/dumps/captured_traffic.json', 'utf8'));
const finUrls = (traffic.requests || []).map(r => r.url).filter(u => u && u.includes('financial/1.1.10') && u.endsWith('.js'));

async function inspect() {
  const calls = new Set();
  for (const u of finUrls) {
    try {
      const res = await fetch(u);
      const text = await res.text();
      const matches = text.match(/(?:get|post)\([`'"][^`'"]+[`'"]/g) || [];
      matches.forEach(m => calls.add(m));
      // Also match endpoints
      const endpoints = text.match(/https?:\/\/[a-zA-Z0-9_\-\.]+\.stockbit\.com\/[^\s\"\'\`]+/g) || [];
      endpoints.forEach(e => calls.add(e));
      const paths = text.match(/["'`](\/(?:keystats|financial|findata|emitten|seasonality|ratio)[^"'`]+)["'`]/g) || [];
      paths.forEach(p => calls.add(p.slice(1, -1)));
    } catch(e) {}
  }
  console.log('Calls in financial MFE (' + calls.size + '):');
  Array.from(calls).forEach(c => console.log(' ', c));
}

inspect();
