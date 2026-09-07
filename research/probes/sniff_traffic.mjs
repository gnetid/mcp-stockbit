// sniff_traffic.mjs
const res = await fetch('http://127.0.0.1:9222/json');
const targets = await res.json();
const mainTarget = targets.find(t => t.url.includes('/main') || t.title === 'Stockbit');
const ws = new WebSocket(mainTarget.webSocketDebuggerUrl);

let msgId = 1;
function send(method, params = {}) {
  const id = msgId++;
  ws.send(JSON.stringify({ id, method, params }));
}

const captured = {
  requests: [],
  responses: [],
  wsFrames: []
};

ws.addEventListener('open', async () => {
  console.log("Attached to Stockbit WebView2! Enabling Network & WebSocket tracking...");
  send('Network.enable', { maxResourceBufferSize: 10000000, maxTotalBufferSize: 20000000 });

  // Trigger a soft refresh of the page or navigate to reload all APIs
  console.log("Triggering Page.reload to capture full startup API calls...");
  send('Page.enable');
  send('Page.reload', { ignoreCache: false });

  // Record for 15 seconds
  setTimeout(async () => {
    console.log(`\nRecording finished! Requests: ${captured.requests.length}, WS Frames: ${captured.wsFrames.length}`);
    const fs = await import('fs');
    fs.writeFileSync('D:/BOLT/mcp-stockbit/captured_traffic.json', JSON.stringify(captured, null, 2));
    console.log("Saved traffic to D:/BOLT/mcp-stockbit/captured_traffic.json");

    // Print summary of API endpoints
    const apiReqs = captured.requests.filter(r => r.url.includes('stockbit.com') && !r.url.endsWith('.js') && !r.url.endsWith('.css') && !r.url.endsWith('.png'));
    console.log("\n=== Captured Stockbit API Endpoints ===");
    for (const r of apiReqs) {
      console.log(`[${r.method}] ${r.url}`);
      console.log(`   Headers: Authorization=${!!r.headers['Authorization'] || !!r.headers['authorization']}, X-App-Version=${r.headers['x-app-version'] || r.headers['X-App-Version'] || 'none'}`);
    }

    ws.close();
    process.exit(0);
  }, 12000);
});

ws.addEventListener('message', (event) => {
  try {
    const msg = JSON.parse(event.data);
    if (msg.method === 'Network.requestWillBeSent') {
      captured.requests.push({
        requestId: msg.params.requestId,
        url: msg.params.request.url,
        method: msg.params.request.method,
        headers: msg.params.request.headers
      });
    } else if (msg.method === 'Network.responseReceived') {
      captured.responses.push({
        requestId: msg.params.requestId,
        url: msg.params.response.url,
        status: msg.params.response.status,
        headers: msg.params.response.headers
      });
    } else if (msg.method === 'Network.webSocketFrameReceived') {
      captured.wsFrames.push({
        payloadData: msg.params.response.payloadData,
        opcode: msg.params.response.opcode,
        timestamp: msg.params.timestamp
      });
    }
  } catch (err) {}
});
