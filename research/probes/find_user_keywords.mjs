// research/probes/find_user_keywords.mjs
import fs from 'fs';

const content = fs.readFileSync('./research/dumps/main-BOmpvOgp.js', 'utf8');
const keywords = ['financial', 'comparison', 'compare', 'peer', 'keystats', 'seasonality', 'insider', 'corpaction', 'profile', 'analysis'];

for (const kw of keywords) {
  let idx = 0;
  let count = 0;
  console.log(`\n=== Keyword: ${kw} ===`);
  while ((idx = content.indexOf(kw, idx + 1)) !== -1 && count < 5) {
    const start = Math.max(0, idx - 60);
    const end = Math.min(content.length, idx + 80);
    console.log(`[pos ${idx}]:`, content.substring(start, end).replace(/\n/g, ' '));
    count++;
  }
}
