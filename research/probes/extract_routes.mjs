// extract_routes.mjs
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
          resolve(data);
        }
      } catch (err) {}
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

ws.addEventListener('open', async () => {
  const evalRes = await sendCommand('Runtime.evaluate', {
    expression: `(async () => {
      const r = await fetch('/assets/main-BOmpvOgp.js');
      const text = await r.text();
      const urls = text.match(/https?:\/\/[a-zA-Z0-9.\-]+\.stockbit\.(?:com|io)[a-zA-Z0-9_\-\/.]*/g) || [];
      const exodus = text.match(/\/api\/[a-zA-Z0-9_\-\/]+|\/v[0-9]\/[a-zA-Z0-9_\-\/]+/g) || [];
      return {
        size: text.length,
        stockbitUrls: Array.from(new Set(urls)),
        apiPaths: Array.from(new Set(exodus)).slice(0, 50)
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });

  const val = evalRes.result.result.value;
  console.log("Bundle size:", val.size);
  console.log("\nStockbit URLs in main bundle:");
  val.stockbitUrls.forEach(u => console.log(" ", u));
  console.log("\nAPI Paths sample:");
  val.apiPaths.forEach(p => console.log(" ", p));

  ws.close();
  process.exit(0);
});
