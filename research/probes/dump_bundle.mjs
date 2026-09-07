// dump_bundle.mjs
import fs from 'fs';
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
  console.log("Fetching bundle...");
  const evalRes = await sendCommand('Runtime.evaluate', {
    expression: `fetch('/assets/main-BOmpvOgp.js').then(r => r.text())`,
    awaitPromise: true,
    returnByValue: true,
    maxNodeDepth: 1
  });

  const text = evalRes?.result?.result?.value;
  if (text) {
    fs.writeFileSync('D:/BOLT/mcp-stockbit/main-BOmpvOgp.js', text, 'utf8');
    console.log(`Saved main-BOmpvOgp.js (${text.length} chars)`);
  } else {
    console.error("Failed to fetch text", evalRes);
  }
  ws.close();
  process.exit(0);
});
