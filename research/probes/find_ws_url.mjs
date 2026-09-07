// find_ws_url.mjs
import fs from 'fs';
const traffic = JSON.parse(fs.readFileSync('D:/BOLT/mcp-stockbit/captured_traffic.json', 'utf8'));

for (const r of traffic.requests) {
  if (r.url.startsWith('ws://') || r.url.startsWith('wss://')) {
    console.log("WebSocket Request URL:", r.url);
    console.log("Headers:", JSON.stringify(r.headers, null, 2));
  }
}
