// research/probes/inspect_fin.mjs
import fs from 'fs';

const traffic = JSON.parse(fs.readFileSync('research/dumps/captured_traffic.json', 'utf8'));
const finUrls = (traffic.requests || []).map(r => r.url).filter(u => u && u.includes('financial/1.1.10') && u.endsWith('.js'));

async function inspect() {
  for (const u of finUrls) {
    const res = await fetch(u);
    const text = await res.text();
    // Look for path templates e.g. `${...}` or `/api/...` or axios/fetch calls
    const getCalls = text.match(/(?:get|post)\([`'"][^`'"]+[`'"]/g) || [];
    if (getCalls.length > 0) {
      console.log('Calls in', u.split('/').pop(), ':', getCalls.slice(0, 10));
    }
  }
}
inspect();
