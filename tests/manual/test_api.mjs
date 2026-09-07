// test_api.mjs
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
    expression: `JSON.stringify({ at: localStorage.getItem('at'), watchlist_id: JSON.parse(atob(localStorage.getItem('au'))).watchlist_id })`,
    returnByValue: true
  });
  const { at, watchlist_id } = JSON.parse(ls.result.value);
  const token = Buffer.from(at, 'base64').toString('utf8');

  console.log("Testing Stockbit API calls with captured token...");
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Stockbit/2.2.0'
  };

  const endpoints = [
    'https://api.stockbit.com/v2.1/user',
    `https://api.stockbit.com/v2.1/watchlist`,
    `https://api.stockbit.com/v2.1/watchlist/${watchlist_id}`,
    'https://api.stockbit.com/v2.1/company/BBCA',
    'https://exodus.stockbit.com/api/v1/portfolio/summary'
  ];

  for (const url of endpoints) {
    try {
      const resp = await fetch(url, { headers });
      console.log(`\nURL: ${url}`);
      console.log(`Status: ${resp.status} ${resp.statusText}`);
      if (resp.status === 200) {
        const data = await resp.json();
        console.log("Response preview:", JSON.stringify(data).substring(0, 300) + '...');
      } else {
        const text = await resp.text();
        console.log("Error response:", text.substring(0, 200));
      }
    } catch (e) {
      console.error(`Failed ${url}:`, e.message);
    }
  }

  ws.close();
  process.exit(0);
});
