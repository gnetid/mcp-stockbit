// find_porto.mjs
import fs from 'fs';
const traffic = JSON.parse(fs.readFileSync('D:/BOLT/mcp-stockbit/captured_traffic.json', 'utf8'));

console.log("Searching captured requests for portfolio/balance/account...");
for (const r of traffic.requests) {
  if (/porto|balance|account|holding|equity|fund/i.test(r.url)) {
    console.log(`[${r.method}] ${r.url}`);
  }
}
