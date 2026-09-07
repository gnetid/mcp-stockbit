// research/probes/find_financials_chunk.mjs
import fs from 'fs';

const html = fs.readFileSync('C:/Users/andra/.gemini/antigravity-ide/brain/f7d9b5ee-18c7-422f-b016-9e4ab812b9ae/.system_generated/steps/576/content.md', 'utf8');
const scriptMatches = Array.from(html.matchAll(/src="(\/_next\/static\/chunks\/[^"]+)"/g)).map(m => m[1]);

console.log(`Found ${scriptMatches.length} script chunks in financials page.`);

async function check() {
  for (const s of scriptMatches) {
    try {
      const res = await fetch('https://stockbit.com' + s);
      const text = await res.text();
      if (text.includes('Income Statement') || text.includes('Balance Sheet') || text.includes('Cash Flow') || text.includes('income_statement') || text.includes('balance_sheet')) {
        console.log(`\nMatch in ${s}:`);
        for (const kw of ['Income Statement', 'Balance Sheet', 'Cash Flow', 'income_statement', 'balance_sheet']) {
          let idx = 0;
          while ((idx = text.indexOf(kw, idx + 1)) !== -1) {
            console.log(`  [${kw}]:`, text.substring(Math.max(0, idx - 60), Math.min(text.length, idx + 100)).replace(/\n/g, ' '));
            break;
          }
        }
      }
    } catch(e) {}
  }
}
check();
