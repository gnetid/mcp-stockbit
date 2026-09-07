// find_ws_req.mjs
import fs from 'fs';
const raw = fs.readFileSync('D:/BOLT/mcp-stockbit/captured_traffic.json', 'utf8');

// Search for wss:// or ws:// anywhere in captured_traffic.json
import re from 're';
const urls = raw.match(/wss?:\/\/[^"\s\\]+/g);
console.log("WebSocket URLs found:", urls);
