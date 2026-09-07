// research/probes/find_mfe_chunks.mjs
async function main() {
  const r = await fetch('https://storage.stockbit.com/financial/1.1.10/static/remoteEntry.js');
  const t = await r.text();
  
  const chunkMapRegex = /\{(?:\d+:"[a-f0-9]+",?)+\}/g;
  const matches = t.match(chunkMapRegex) || [];
  const map = eval('(' + matches[0] + ')');
  const ids = Object.keys(map);
  console.log(`Found ${ids.length} chunks in financial MFE.`);

  for (const id of ids) {
    const url = `https://storage.stockbit.com/financial/1.1.10/static/${id}.${map[id]}.js`;
    try {
      const res = await fetch(url);
      const text = await res.text();
      // Look for API calls or endpoints
      const endpoints = Array.from(text.matchAll(/['"`](\/[a-zA-Z0-9_\-\/]+)['"`]/g)).map(m => m[1]);
      const interesting = endpoints.filter(e => e.includes('financial') || e.includes('findata') || e.includes('statement') || e.includes('keystats') || e.includes('balance') || e.includes('income'));
      if (interesting.length > 0) {
        console.log(`\nChunk ${id} interesting endpoints:`, Array.from(new Set(interesting)));
      }
    } catch(e) {}
  }
}
main();
