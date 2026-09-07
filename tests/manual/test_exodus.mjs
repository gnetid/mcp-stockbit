// test_exodus.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const trafficPath = path.resolve(__dirname, '../../captured_traffic.json');
const traffic = fs.existsSync(trafficPath) ? JSON.parse(fs.readFileSync(trafficPath, 'utf8')) : { requests: [] };
const sampleReq = traffic.requests.find(r => r.url.includes('exodus.stockbit.com/emitten/BBCA/info'));

console.log("Using extracted headers to test exodus endpoints...");
const headers = { ...sampleReq.headers };

const urls = [
  'https://exodus.stockbit.com/emitten/BBCA/info',
  'https://exodus.stockbit.com/orderbook/companies/BBCA',
  'https://exodus.stockbit.com/chartbit/BBCA/price/intraday?from=1788679386&to=1786294799&limit=5',
  'https://exodus.stockbit.com/auth/websocket/key'
];

for (const u of urls) {
  const resp = await fetch(u, { headers });
  console.log(`\nTesting: [${resp.status}] ${u}`);
  const json = await resp.json();
  console.log("Result:", JSON.stringify(json, null, 2).substring(0, 500) + '...');
}
