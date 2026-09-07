// check_carina_auth.mjs
import fs from 'fs';
const traffic = JSON.parse(fs.readFileSync('D:/BOLT/mcp-stockbit/captured_traffic.json', 'utf8'));

const req = traffic.requests.find(r => r.url.includes('carina.stockbit.com/portfolio/v2/list'));
console.log("URL:", req?.url);
console.log("Headers for Carina portfolio:", JSON.stringify(req?.headers, null, 2));
