// src/testBridge.mjs
// Bridge self-test lintas platform: Windows (CDP WebView2) & macOS (WKWebView native).
import { StockbitBridge } from './stockbitBridge.mjs';

const bridge = new StockbitBridge();

const macNative = process.platform === 'darwin' && bridge.isMacNative();

console.log("Checking if Stockbit Desktop session is available...");
const isRunning = await bridge.isAppRunning();
console.log("Stockbit Running Status:", isRunning);

if (!isRunning) {
  if (process.platform === 'darwin') {
    console.log("Sesi Stockbit (WKWebView localStorage) tidak ditemukan. Buka aplikasi Stockbit dan login terlebih dahulu.");
  } else {
    console.log("Stockbit is not running on port 9222. Please start Stockbit.");
  }
  process.exit(1);
}

if (macNative) {
  console.log("Mode: macOS native (Tauri v2 + WKWebView) — token dibaca dari disk, tanpa CDP 9222.");
} else {
  console.log("Mode: CDP WebView2 (port 9222).");
}

let passCount = 0;
let failCount = 0;
let skipCount = 0;
const failures = [];

function report(name, ok, detail, skipped = false) {
  if (skipped) { skipCount++; console.log(`  [SKIP] ${name}: ${detail}`); return; }
  if (ok) { passCount++; console.log(`  [PASS] ${name}: ${detail}`); }
  else { failCount++; failures.push(name); console.log(`  [FAIL] ${name}: ${detail}`); }
}

try {
  console.log("\n1. Testing User Profile...");
  const user = await bridge.getUserProfile();
  const userOk = Boolean(user?.username || user?.email || user?.fullname);
  report('User Profile', userOk, user ? `${user.fullname || ''} (@${user.username || user.email})`.trim() : 'empty');

  // Tests yang butuh token 'ats' (trading Carina) hanya tersedia di Windows/WebView2.
  const carinaUnavailable = macNative && !(await bridge.getTokens()).ats;

  console.log("\n2. Testing Bank Detail...");
  if (carinaUnavailable) {
    report('Bank Detail (Carina)', false, 'Token `ats` tidak tersimpan di build macOS Stockbit; fitur Carina khusus Windows.', true);
  } else {
    try {
      const bank = await bridge.getBankDetail();
      const bankName = bank?.data?.account?.rdn?.name || bank?.data?.account?.bank?.name;
      report('Bank Detail (Carina)', Boolean(bankName), `Bank: ${bankName} | Balance: Rp ${bank?.data?.balance ?? bank?.data?.cash_balance ?? 'n/a'}`);
    } catch (e) { report('Bank Detail (Carina)', false, e.message); }
  }

  console.log("\n3. Testing Portfolio...");
  if (carinaUnavailable) {
    report('Portfolio (Carina)', false, 'Token `ats` tidak tersimpan di build macOS Stockbit; fitur Carina khusus Windows.', true);
  } else {
    try {
      const porto = await bridge.getPortfolio();
      const invested = porto?.data?.summary?.amount?.invested ?? porto?.data?.summary?.invested;
      report('Portfolio (Carina)', invested !== undefined && invested !== null, `Invested: Rp ${invested?.toLocaleString?.() ?? invested}`);
    } catch (e) { report('Portfolio (Carina)', false, e.message); }
  }

  console.log("\n4. Testing Watchlist...");
  try {
    const wl = await bridge.getWatchlist(5);
    const wlName = wl?.data?.name || (Array.isArray(wl?.data) ? wl.data[0]?.name : null);
    report('Watchlist', Boolean(wlName || wl?.data), wlName ? `${wlName} (Total: ${wl?.data?.total ?? wl?.data?.companies?.length})` : JSON.stringify(wl).slice(0, 120));
    const companies = wl?.data?.companies || (Array.isArray(wl?.data) ? wl.data[0]?.companies : []) || [];
    companies.slice(0, 3).forEach(c => console.log(`    ${c.symbol}: ${c.last} (${c.change} / ${c.percent}%)`));
  } catch (e) { report('Watchlist', false, e.message); }

  console.log("\n5. Testing BBCA Orderbook...");
  try {
    const ob = await bridge.getOrderbook('BBCA');
    const bestBid = ob?.data?.bid?.[0]?.price ?? ob?.data?.bid?.[0];
    report('Orderbook BBCA', Boolean(bestBid), `Best Bid: ${JSON.stringify(bestBid)}`);
  } catch (e) { report('Orderbook BBCA', false, e.message); }

  console.log("\n6. Testing BBCA Broker Distribution...");
  try {
    const bd = await bridge.getBrokerDistribution('BBCA');
    const topBuyer = bd?.data?.by_value?.top_broker_buy?.[0] ?? bd?.data?.by_value?.top_broker_buy?.[0];
    report('Broker Distribution', Boolean(bd?.data), topBuyer ? `Top Buyer: ${topBuyer?.detail?.code} - Rp ${topBuyer?.detail?.amount?.toLocaleString?.()}` : 'no data');
  } catch (e) { report('Broker Distribution', false, e.message); }

  console.log("\n7. Testing Market Session...");
  try {
    const sess = await bridge.getMarketSession();
    const state = sess?.data?.detail?.fca?.state_name ?? sess?.data?.state_name;
    report('Market Session', Boolean(sess?.data), `Session: ${state} @ ${sess?.data?.detail?.fca?.state_start_time || ''}`);
  } catch (e) { report('Market Session', false, e.message); }

  console.log("\n8. Testing Historical Candlestick Chart (BBCA)...");
  try {
    const candles = await bridge.getDailyCandles('BBCA', '2024-01-01', '2024-03-31');
    const bars = candles?.bars || [];
    report('Daily Candles', bars.length > 0, `Total Bars: ${candles?.total_bars ?? bars.length} | Latest Close: ${bars[bars.length - 1]?.close}`);
  } catch (e) { report('Daily Candles', false, e.message); }

  console.log("\n========================================================");
  console.log(`RESULT: ${passCount} passed, ${failCount} failed, ${skipCount} skipped (macOS tanpa token Carina/ats)`);
  if (failures.length) console.log("Failed:", failures.join(', '));
  console.log("========================================================");
  process.exit(failCount > 0 ? 1 : 0);
} catch (err) {
  console.error("Test Error:", err);
  process.exit(1);
}
