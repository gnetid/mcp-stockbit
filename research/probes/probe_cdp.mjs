// probe_cdp.mjs - Inspect Stockbit via Chrome DevTools Protocol
const res = await fetch('http://127.0.0.1:9222/json');
const targets = await res.json();
console.log('Available CDP Targets:');
targets.forEach((t, i) => console.log(`[${i}] ${t.title} (${t.type}) -> ${t.url}`));

const mainTarget = targets.find(t => t.url.includes('/main') || t.title === 'Stockbit');
if (!mainTarget) {
  console.error('Stockbit main page not found!');
  process.exit(1);
}

console.log('\nConnecting to Stockbit target:', mainTarget.webSocketDebuggerUrl);
const ws = new WebSocket(mainTarget.webSocketDebuggerUrl);

let msgId = 1;
function sendCommand(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = msgId++;
    const handler = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.id === id) {
          ws.removeEventListener('message', handler);
          if (data.error) reject(data.error);
          else resolve(data.result);
        }
      } catch (err) {
        // ignore
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

ws.addEventListener('open', async () => {
  console.log('Connected to Stockbit via CDP!\n');

  try {
    // 1. Evaluate document.title and URL
    const docInfo = await sendCommand('Runtime.evaluate', {
      expression: '({ title: document.title, location: window.location.href, keys: Object.keys(localStorage) })',
      returnByValue: true
    });
    console.log('Page Info & localStorage Keys:');
    console.log(JSON.stringify(docInfo.result.value, null, 2));

    // 2. Extract localStorage items
    const lsData = await sendCommand('Runtime.evaluate', {
      expression: `
        (() => {
          const res = {};
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            res[key] = localStorage.getItem(key);
          }
          return res;
        })()
      `,
      returnByValue: true
    });
    console.log('\nLocalStorage Items:');
    const items = lsData.result.value || {};
    for (const [k, v] of Object.entries(items)) {
      const displayVal = typeof v === 'string' && v.length > 80 ? v.substring(0, 80) + '...' : v;
      console.log(`  ${k}: ${displayVal}`);
    }

    // 3. Extract Cookies via Network domain
    await sendCommand('Network.enable');
    const cookieData = await sendCommand('Network.getCookies');
    console.log(`\nCaptured Cookies (${cookieData.cookies.length} cookies):`);
    for (const c of cookieData.cookies) {
      console.log(`  Domain: ${c.domain.padEnd(25)} Name: ${c.name.padEnd(25)} Secure: ${c.secure}`);
    }

  } catch (err) {
    console.error('Error executing CDP command:', err);
  } finally {
    ws.close();
    process.exit(0);
  }
});

ws.addEventListener('error', (err) => {
  console.error('WebSocket Error:', err);
  process.exit(1);
});
