// check_carina.mjs
import fs from 'fs';
const traffic = JSON.parse(fs.readFileSync('D:/BOLT/mcp-stockbit/captured_traffic.json', 'utf8'));

console.log("=== CARINA REQUESTS ===");
for (const r of traffic.requests) {
  if (r.url.includes('carina.stockbit.com')) {
    console.log(`[${r.method}] ${r.url}`);
  }
}
