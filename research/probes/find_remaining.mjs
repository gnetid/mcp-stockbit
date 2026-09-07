import fs from 'fs';

const text = fs.readFileSync('research/dumps/main-BOmpvOgp.js', 'utf8');
const pattern = /["'`](\/(?:news|alert|screener|bond|chat|ipo|notification|snips|feed|virtual|academy|order|portfolio|market|emitten)[a-zA-Z0-9_\-\/]+)["'`]/g;
const matches = new Set();
let match;
while ((match = pattern.exec(text)) !== null) {
  matches.add(match[1]);
}
console.log('Total routes found:', matches.size);
Array.from(matches).sort().forEach(m => console.log(' ', m));
