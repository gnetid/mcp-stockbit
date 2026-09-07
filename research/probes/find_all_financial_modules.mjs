// research/probes/find_all_financial_modules.mjs
async function main() {
  const r = await fetch('https://storage.stockbit.com/financial/1.1.10/static/remoteEntry.js');
  const t = await r.text();
  const re = /"\.\/([a-zA-Z0-9_\-]+)"/g;
  const exposed = [];
  let m;
  while ((m = re.exec(t)) !== null) {
    exposed.push(m[1]);
  }
  console.log('Exposed in financial MFE:', exposed);
}
main();
