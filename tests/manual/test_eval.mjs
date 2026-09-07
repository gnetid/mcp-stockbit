// test_eval.mjs
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
      try {
        const r = await fetch('/assets/main-BOmpvOgp.js');
        const text = await r.text();
        return { length: text.length };
      } catch(e) {
        return { err: e.message };
      }
    })()`,
    awaitPromise: true,
    returnByValue: true
  });

  console.log("Result:", JSON.stringify(evalRes, null, 2));
  ws.close();
  process.exit(0);
});
