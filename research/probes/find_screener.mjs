// research/probes/find_screener.mjs
import fs from 'fs';

const text = fs.readFileSync('research/dumps/main-BOmpvOgp.js', 'utf8');
const screenerMatches = text.match(/["'`](\/[a-zA-Z0-9_\-\/]*screener[a-zA-Z0-9_\-\/]*)["'`]/gi) || [];
console.log('Screener paths in main bundle:', Array.from(new Set(screenerMatches.map(s => s.slice(1, -1)))));
