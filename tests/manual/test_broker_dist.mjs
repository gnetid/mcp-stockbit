// test_broker_dist.mjs
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
  const evalRes = await sendCommand('Runtime.evaluate', {
    expression: `
      (async () => {
        const at = localStorage.getItem('at');
        const token = at ? atob(at) : '';
        const headers = {
          'Authorization': 'Bearer ' + token,
          'X-Platform': 'desktop',
          'X-AppVersion': '2.2.0',
          'Accept': 'application/json, text/plain, */*'
        };

        const testUrls = [
          'https://exodus.stockbit.com/order-trade/broker/distribution?symbol=BBCA',
          'https://carina.stockbit.com/order-trade/broker/distribution?symbol=BBCA',
          'https://exodus.stockbit.com/order-trade/broker/distribution',
          'https://carina.stockbit.com/order-trade/broker/distribution'
        ];

        const out = {};
        for (const u of testUrls) {
          try {
            const r = await fetch(u, { headers });
            out[u] = { status: r.status, data: await r.text() };
          } catch(e) {
            out[u] = { error: e.message };
          }
        }
        return out;
      })()
    `,
    awaitPromise: true,
    returnByValue: true
  });

  for (const [u, r] of Object.entries(evalRes.result.value)) {
    console.log(`[${r.status}] ${u}`);
    console.log("  Body:", r.data?.substring(0, 300));
  }

  ws.close();
  process.exit(0);
});
