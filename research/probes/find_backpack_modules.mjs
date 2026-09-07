// research/probes/find_backpack_modules.mjs
async function main() {
  const r = await fetch('https://storage.stockbit.com/backpack/1.2.14/static/remoteEntry.js');
  const t = await r.text();
  const re = /"\.\/([a-zA-Z0-9_\-]+)"/g;
  const exposed = [];
  let m;
  while ((m = re.exec(t)) !== null) {
    exposed.push(m[1]);
  }
  console.log('Exposed in backpack MFE:', exposed);
}
main();
