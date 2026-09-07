// check_400.mjs
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

        const r = await fetch('https://exodus.stockbit.com/company-price-feed/prices?symbols=BBCA,BBRI,TLKM', { headers });
        return { status: r.status, body: await r.text() };
      })()
    `,
    awaitPromise: true,
    returnByValue: true
  });

  console.log("Price feed 400 detail:", evalRes.result.value);
  ws.close();
  process.exit(0);
});
