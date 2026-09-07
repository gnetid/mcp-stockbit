// test_cdp_fetch.mjs
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
  console.log("Testing fetch via Stockbit CDP Runtime context...");

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

        const res = await fetch('https://exodus.stockbit.com/emitten/BBCA/info', { headers });
        const json = await res.json();
        return { status: res.status, data: json };
      })()
    `,
    awaitPromise: true,
    returnByValue: true
  });

  console.log("Result from CDP fetch:");
  console.log(JSON.stringify(evalRes.result.value, null, 2));

  ws.close();
  process.exit(0);
});
