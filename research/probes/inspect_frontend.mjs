// inspect_frontend.mjs
const res = await fetch('http://127.0.0.1:9222/json');
const targets = await res.json();
const mainTarget = targets.find(t => t.url.includes('/main') || t.title === 'Stockbit');
const ws = new WebSocket(mainTarget.webSocketDebuggerUrl);

let msgId = 1;
function sendCommand(method, params = {}) {
  return new Promise((resolve) => {
    const id = msgId++;
    const handler = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.id === id) {
          ws.removeEventListener('message', handler);
          resolve(data.result);
        }
      } catch (err) {}
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

ws.addEventListener('open', async () => {
  // Let's inspect window keys, globals, or performance resource timing
  const perf = await sendCommand('Runtime.evaluate', {
    expression: `
      (() => {
        const entries = performance.getEntriesByType('resource')
          .filter(e => e.name.includes('stockbit.com') || e.name.includes('api'))
          .map(e => e.name);
        return {
          urls: entries,
          globals: Object.keys(window).filter(k => !k.startsWith('webkit') && !k.startsWith('on'))
        };
      })()
    `,
    returnByValue: true
  });

  console.log("Captured Network URLs from performance timing:");
  const urls = Array.from(new Set(perf.result.value.urls));
  urls.forEach(u => console.log(" ", u));

  console.log("\nGlobal objects on window (sample):");
  console.log(perf.result.value.globals.slice(0, 30));

  ws.close();
  process.exit(0);
});
