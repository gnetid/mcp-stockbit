// research/probes/inspect_broker_flow.mjs
import fs from 'fs';

const traffic = JSON.parse(fs.readFileSync('research/dumps/captured_traffic.json', 'utf8'));
const bfUrls = (traffic.requests || []).map(r => r.url).filter(u => u && u.includes('broker-flow/1.2.11') && u.endsWith('.js'));

async function inspectBF() {
  console.log('Broker flow chunk count:', bfUrls.length);
  const calls = new Set();
  for (const u of bfUrls) {
    try {
      const res = await fetch(u);
      const text = await res.text();
      const matches = text.match(/(?:get|post)\([`'"][^`'"]+[`'"]/g) || [];
      matches.forEach(m => calls.add(m));
      const urls = text.match(/https?:\/\/[^\s"'`]+/g) || [];
      urls.forEach(x => { if (x.includes('stockbit.com')) calls.add(x); });
      const paths = text.match(/["'`](\/(?:order-trade|broker|flow|company)[^"'`]+)["'`]/g) || [];
      paths.forEach(p => calls.add(p.slice(1, -1)));
    } catch(e) {}
  }
  console.log('Calls found in Broker-Flow MFE:');
  Array.from(calls).forEach(c => console.log(' ', c));
}

inspectBF();
