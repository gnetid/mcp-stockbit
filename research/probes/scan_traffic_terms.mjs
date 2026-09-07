// research/probes/scan_traffic_terms.mjs
import fs from 'fs';

const traffic = JSON.parse(fs.readFileSync('research/dumps/captured_traffic.json', 'utf8'));
const urls = (traffic.requests || []).map(r => r.url).filter(Boolean);
const terms = ['keystats', 'seasonality', 'insider', 'corpaction', 'profile', 'compare', 'comparison', 'peer', 'analyst', 'analysis', 'financial', 'statement'];

for (const term of terms) {
  const matching = urls.filter(u => u.toLowerCase().includes(term));
  console.log(`=== Term '${term}': ${matching.length} requests ===`);
  for (const u of Array.from(new Set(matching)).slice(0, 10)) {
    console.log('  ', u);
  }
}
