// research/probes/find_chunk_keywords.mjs
import fs from 'fs';

const html = fs.readFileSync('C:/Users/andra/.gemini/antigravity-ide/brain/f7d9b5ee-18c7-422f-b016-9e4ab812b9ae/.system_generated/steps/546/content.md', 'utf8');
const scriptMatches = Array.from(html.matchAll(/src="(\/_next\/static\/chunks\/[^"]+)"/g)).map(m => m[1]);

console.log(`Found ${scriptMatches.length} script chunks.`);

async function checkChunks() {
  for (const s of scriptMatches) {
    const url = 'https://stockbit.com' + s;
    try {
      const res = await fetch(url);
      const text = await res.text();
      if (text.includes('comparison') || text.includes('financials') || text.includes('peers')) {
        console.log(`\nMatch in ${s}:`);
        for (const kw of ['comparison', 'financials', 'peers']) {
          let idx = 0;
          while ((idx = text.indexOf(kw, idx + 1)) !== -1) {
            console.log(`  [${kw}]:`, text.substring(Math.max(0, idx - 60), Math.min(text.length, idx + 100)).replace(/\n/g, ' '));
            break; // just first match per keyword
          }
        }
      }
    } catch(e) {
      // ignore
    }
  }
}

checkChunks();
