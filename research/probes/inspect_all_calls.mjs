// research/probes/inspect_all_calls.mjs
import fs from 'fs';

const traffic = JSON.parse(fs.readFileSync('research/dumps/captured_traffic.json', 'utf8'));
const jsUrls = Array.from(new Set(
  (traffic.requests || []).map(r => r.url).filter(u => u && u.endsWith('.js') && u.includes('storage.stockbit.com'))
));

async function inspectAll() {
  const discoveredCalls = new Set();
  for (const u of jsUrls) {
    try {
      const res = await fetch(u);
      const text = await res.text();
      // Match patterns like .get("path" or .post("path" or .get(`path`
      const matches = text.match(/\b(?:get|post|put|delete)\(\s*[`'"]([^`'"]+)['"`]/g) || [];
      for (const m of matches) {
        const cleaned = m.replace(/^(?:get|post|put|delete)\(\s*[`'"]/, '').replace(/[`'"]$/, '');
        if (cleaned.length > 2 && !cleaned.includes(';') && !cleaned.includes('{') && (cleaned.includes('/') || cleaned.startsWith('http'))) {
          discoveredCalls.add(cleaned);
        }
      }
      
      // Also match template literals like `/some/path/${...}`
      const tmpl = text.match(/[`'"](\/[a-zA-Z0-9_\-\/]+\/\$\{[^}]+\}[^`'"]*)['"`]/g) || [];
      for (const t of tmpl) {
        discoveredCalls.add(t.slice(1, -1));
      }
    } catch(e) {}
  }

  console.log('Total discovered API call patterns:', discoveredCalls.size);
  Array.from(discoveredCalls).sort().forEach(c => console.log('  ', c));
}

inspectAll();
