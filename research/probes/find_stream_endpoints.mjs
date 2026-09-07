// research/probes/find_stream_endpoints.mjs
import fs from 'fs';

const text = fs.readFileSync('research/dumps/main-BOmpvOgp.js', 'utf8');
const matches = text.match(/["'`](\/stream[a-zA-Z0-9_\-\/]+)["'`]/gi) || [];
console.log('Stream paths in main bundle:', Array.from(new Set(matches.map(s => s.slice(1, -1)))));

const traffic = JSON.parse(fs.readFileSync('research/dumps/captured_traffic.json', 'utf8'));
const streamUrls = (traffic.requests || []).map(r => r.url).filter(u => u && u.includes('/stream'));
console.log('Stream URLs in captured traffic:', Array.from(new Set(streamUrls)));
