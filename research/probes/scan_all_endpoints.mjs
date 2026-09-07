// research/probes/scan_all_endpoints.mjs
import fs from 'fs';

async function scanChunks() {
  const traffic = JSON.parse(fs.readFileSync('research/dumps/captured_traffic.json', 'utf8'));
  const jsUrls = Array.from(new Set(
    (traffic.requests || []).map(r => r.url).filter(u => u && u.endsWith('.js') && u.includes('storage.stockbit.com'))
  ));
  console.log('Total storage JS chunks to scan:', jsUrls.length);

  const foundEndpoints = new Set();
  const foundHosts = new Set();

  for (const u of jsUrls) {
    try {
      const res = await fetch(u);
      const text = await res.text();
      
      const urls = text.match(/https:\/\/[a-zA-Z0-9_\-\.]+\.stockbit\.com\/[a-zA-Z0-9_\-\/]+/g) || [];
      urls.forEach(x => {
        foundEndpoints.add(x);
        try { foundHosts.add(new URL(x).host); } catch(e) {}
      });

      const relPaths = text.match(/["'`](\/(?:v[1-9]|order-trade|financial|chartbit|screener|emitten|keystats|watchlist|movers|insider|notification|market|corporate-action|company-price-feed|order|portfolio)[a-zA-Z0-9_\-\/]+)["'`]/g) || [];
      relPaths.forEach(x => {
        const clean = x.slice(1, -1);
        foundEndpoints.add(clean);
      });
    } catch(e) {}
  }

  console.log('\nDiscovered Hosts:', Array.from(foundHosts));
  console.log('\nDiscovered Endpoints count:', foundEndpoints.size);
  Array.from(foundEndpoints).sort().forEach(ep => console.log('  ', ep));
}

scanChunks();
