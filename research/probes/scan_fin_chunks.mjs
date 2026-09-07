// research/probes/scan_fin_chunks.mjs
import fs from 'fs';

const traffic = JSON.parse(fs.readFileSync('research/dumps/captured_traffic.json', 'utf8'));
const finUrls = (traffic.requests || []).map(r => r.url).filter(u => u && u.includes('financial/1.1.10') && u.endsWith('.js'));
console.log('Fin chunk count:', finUrls.length);

async function checkFin() {
  for (const u of finUrls) {
    try {
      const res = await fetch(u);
      const text = await res.text();
      const matches = text.match(/["'`](\/[a-zA-Z0-9_\-\/]+)["'`]/g) || [];
      const cleaned = matches.map(m => m.slice(1, -1)).filter(m => 
        m.includes('financial') || 
        m.includes('statement') || 
        m.includes('balance') || 
        m.includes('cash') || 
        m.includes('income') || 
        m.includes('ratio') ||
        m.includes('fundachart') ||
        m.includes('comparison') ||
        m.includes('keystats')
      );
      if (cleaned.length > 0) {
        console.log('From', u.split('/').pop(), '->', Array.from(new Set(cleaned)));
      }
    } catch(e) {}
  }
}
checkFin();
