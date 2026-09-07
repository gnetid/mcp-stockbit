// check_response.mjs
import fs from 'fs';
const traffic = JSON.parse(fs.readFileSync('D:/BOLT/mcp-stockbit/captured_traffic.json', 'utf8'));

const req = traffic.requests.find(r => r.url.includes('exodus.stockbit.com/emitten/BBCA/info'));
console.log("Request ID:", req?.requestId);
console.log("Full Request Headers:", JSON.stringify(req?.headers, null, 2));

const resp = traffic.responses.find(r => r.requestId === req?.requestId);
console.log("\nResponse Status:", resp?.status);
console.log("Response Headers:", JSON.stringify(resp?.headers, null, 2));
