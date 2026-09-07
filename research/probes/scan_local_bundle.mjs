// research/probes/scan_local_bundle.mjs
import fs from 'fs';

const text = fs.readFileSync('research/dumps/main-BOmpvOgp.js', 'utf8');
console.log('Local bundle size:', text.length);

const fullUrls = new Set(text.match(/https:\/\/[a-zA-Z0-9_\-\.]+\.stockbit\.com\/[a-zA-Z0-9_\-\/]+/g) || []);
console.log('Full Stockbit URLs in local bundle (' + fullUrls.size + '):');
Array.from(fullUrls).sort().forEach(u => console.log('  ', u));

const relMatch = text.match(/["'`](\/(?:v[1-9]|order-trade|financial|chartbit|screener|emitten|keystats|watchlist|movers|insider|notification|market|corporate-action|company-price-feed|order|portfolio|seasonality)[a-zA-Z0-9_\-\/]+)["'`]/g) || [];
const relPaths = new Set(relMatch.map(x => x.slice(1, -1)));
console.log('\nRelative paths in local bundle (' + relPaths.size + '):');
Array.from(relPaths).slice(0, 100).forEach(p => console.log('  ', p));
