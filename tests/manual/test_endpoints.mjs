// test_endpoints.mjs
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
        const user = JSON.parse(atob(localStorage.getItem('au')));
        const headers = {
          'Authorization': 'Bearer ' + token,
          'X-Platform': 'desktop',
          'X-AppVersion': '2.2.0',
          'Accept': 'application/json, text/plain, */*'
        };

        const testUrls = [
          'https://exodus.stockbit.com/orderbook/companies/BBCA',
          'https://exodus.stockbit.com/watchlist/watchlist-all',
          'https://exodus.stockbit.com/watchlist/' + user.watchlist_id,
          'https://exodus.stockbit.com/securities/portfolio',
          'https://exodus.stockbit.com/securities/portfolio/summary',
          'https://exodus.stockbit.com/securities/balance',
          'https://exodus.stockbit.com/securities/order',
          'https://exodus.stockbit.com/broker/summary/BBCA',
          'https://exodus.stockbit.com/company-price-feed/market-time/session',
          'https://exodus.stockbit.com/auth/websocket/key'
        ];

        const results = {};
        for (const u of testUrls) {
          try {
            const r = await fetch(u, { headers });
            let body = null;
            try { body = await r.json(); } catch(e) { body = await r.text(); }
            results[u] = { status: r.status, body: body };
          } catch (e) {
            results[u] = { error: e.message };
          }
        }
        return results;
      })()
    `,
    awaitPromise: true,
    returnByValue: true
  });

  const results = evalRes.result.value;
  for (const [url, res] of Object.entries(results)) {
    console.log(`\nURL: ${url}`);
    console.log(`Status: ${res.status}`);
    const preview = JSON.stringify(res.body);
    console.log(`Body: ${preview ? preview.substring(0, 300) : 'null'}...`);
  }

  ws.close();
  process.exit(0);
});
