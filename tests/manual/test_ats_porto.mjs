// test_ats_porto.mjs
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
        const ats = localStorage.getItem('ats');
        const token = ats ? atob(ats) : '';
        const headers = {
          'Authorization': 'Bearer ' + token,
          'X-Platform': 'desktop',
          'X-AppVersion': '2.2.0',
          'Accept': 'application/json, text/plain, */*'
        };

        const endpoints = [
          'https://carina.stockbit.com/portfolio/v2/list',
          'https://carina.stockbit.com/order/v2/list',
          'https://carina.stockbit.com/v2/sub-account/list',
          'https://carina.stockbit.com/account/bank'
        ];

        const out = {};
        for (const u of endpoints) {
          try {
            const r = await fetch(u, { headers });
            out[u] = { status: r.status, data: await r.json() };
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

  console.log("Results with ATS token:");
  for (const [u, res] of Object.entries(evalRes.result.value)) {
    console.log(`\n=== ${u} (Status: ${res.status}) ===`);
    console.log(JSON.stringify(res.data, null, 2).substring(0, 500) + '...');
  }

  ws.close();
  process.exit(0);
});
