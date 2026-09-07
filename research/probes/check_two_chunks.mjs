// research/probes/check_two_chunks.mjs
async function main() {
  for (const c of ['24087-66449c29245751f9.js', '78169-a893206881304fe1.js']) {
    const url = 'https://stockbit.com/_next/static/chunks/' + c;
    const r = await fetch(url);
    const t = await r.text();
    console.log(`\n=== Chunk ${c} (len: ${t.length}) ===`);
    for (const kw of ['financial', 'statement', 'income', 'balance', 'cashflow', 'cash_flow', 'findata', 'ratio']) {
      const idx = t.toLowerCase().indexOf(kw);
      if (idx !== -1) {
        console.log(`  kw '${kw}' at ${idx}:`, t.substring(Math.max(0, idx - 40), Math.min(t.length, idx + 80)).replace(/\n/g, ' '));
      }
    }
  }
}
main();
