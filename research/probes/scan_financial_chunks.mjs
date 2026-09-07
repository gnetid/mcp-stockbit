// research/probes/scan_financial_chunks.mjs
async function main() {
  const url = 'https://storage.stockbit.com/financial/1.1.10/static/remoteEntry.js';
  const r = await fetch(url);
  const text = await r.text();

  const chunkMapMatch = text.match(/\{(?:\d+:"[a-f0-9]+",?)+\}/);
  if (!chunkMapMatch) return;

  const raw = chunkMapMatch[0];
  const fixed = raw.replace(/(\d+):/g, '"$1":');
  const chunkMap = JSON.parse(fixed);
  console.log(`Found ${Object.keys(chunkMap).length} chunks in financial MFE.`);

  const foundUrls = new Set();
  const ids = Object.keys(chunkMap);

  for (const chunkId of ids) {
    const chunkUrl = `https://storage.stockbit.com/financial/1.1.10/static/${chunkId}.${chunkMap[chunkId]}.js`;
    try {
      const cRes = await fetch(chunkUrl);
      const cText = await cRes.text();
      const apis = Array.from(cText.matchAll(/['"`](\/(?:findata|order-trade|company|emitten|keystats|market|stream|analyst|corpaction|insider|financial)[a-zA-Z0-9_\-/]*)['"`]/g)).map(m => m[1]);
      for (const a of apis) foundUrls.add(a);
    } catch(e) {}
  }

  console.log('\nAPI Endpoints found in financial MFE chunks:');
  for (const u of Array.from(foundUrls).sort()) {
    console.log(' ', u);
  }
}
main();
