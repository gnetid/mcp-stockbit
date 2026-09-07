// find_ws_events.mjs
import fs from 'fs';
const traffic = JSON.parse(fs.readFileSync('D:/BOLT/mcp-stockbit/captured_traffic.json', 'utf8'));

for (const r of traffic.requests) {
  if (r.url.includes('socket') || r.url.includes('stream') || r.url.includes('wss') || r.url.includes('ws')) {
    console.log(r.url);
  }
}
