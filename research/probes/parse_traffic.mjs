// parse_traffic.mjs
import fs from 'fs';
const traffic = JSON.parse(fs.readFileSync('D:/BOLT/mcp-stockbit/captured_traffic.json', 'utf8'));

console.log("=== EXODUS API REQUESTS SAMPLE ===");
const exodusReqs = traffic.requests.filter(r => r.url.includes('exodus.stockbit.com'));
for (const r of exodusReqs.slice(0, 10)) {
  console.log(`\nURL: [${r.method}] ${r.url}`);
  console.log("Headers:", JSON.stringify(r.headers, null, 2));
}

console.log("\n=== WEBSOCKET FRAMES SAMPLE ===");
console.log(`Total WS Frames captured: ${traffic.wsFrames.length}`);
for (const f of traffic.wsFrames.slice(0, 5)) {
  console.log(`Frame: ${f.payloadData.substring(0, 150)}...`);
}
