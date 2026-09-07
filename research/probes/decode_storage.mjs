// decode_storage.mjs
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
  const ls = await sendCommand('Runtime.evaluate', {
    expression: `JSON.stringify({
      at: localStorage.getItem('at'),
      au: localStorage.getItem('au'),
      tan: localStorage.getItem('tan'),
      ate: localStorage.getItem('ate'),
      multiPorto: localStorage.getItem('multi-portfolio-storage')
    })`,
    returnByValue: true
  });

  const parsed = JSON.parse(ls.result.value);
  console.log("=== ACCESS TOKEN (First 60 chars) ===");
  const rawAt = Buffer.from(parsed.at, 'base64').toString('utf8');
  console.log(rawAt.substring(0, 60) + '...');

  console.log("\n=== USER INFO (au) ===");
  console.log(Buffer.from(parsed.au, 'base64').toString('utf8'));

  console.log("\n=== TRADING ACCOUNT (tan) ===");
  console.log(Buffer.from(parsed.tan, 'base64').toString('utf8'));

  console.log("\n=== TOKEN EXPIRY (ate) ===");
  console.log(Buffer.from(parsed.ate, 'base64').toString('utf8'));

  console.log("\n=== MULTI PORTFOLIO STORAGE ===");
  console.log(parsed.multiPorto);

  ws.close();
  process.exit(0);
});
