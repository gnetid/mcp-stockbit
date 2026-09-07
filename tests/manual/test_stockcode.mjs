// test_stockcode.mjs
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

        const urls = [
          'https://exodus.stockbit.com/company-price-feed/prices?StockCode=BBCA',
          'https://exodus.stockbit.com/company-price-feed/prices?stock_code=BBCA',
          'https://exodus.stockbit.com/company-price-feed/prices?stockCode=BBCA',
          'https://exodus.stockbit.com/company-price-feed/prices?stock_code[]=BBCA'
        ];

        const out = {};
        for (const u of urls) {
          const r = await fetch(u, { headers });
          out[u] = { status: r.status, data: await r.json() };
        }
        return out;
      })()
    `,
    awaitPromise: true,
    returnByValue: true
  });

  for (const [u, res] of Object.entries(evalRes.result.value)) {
    console.log(`\n${u} -> Status: ${res.status}`);
    console.log(JSON.stringify(res.data, null, 2).substring(0, 300));
  }

  ws.close();
  process.exit(0);
});
