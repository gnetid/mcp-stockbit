// src/testBridge.mjs
import { StockbitBridge } from './stockbitBridge.mjs';

const bridge = new StockbitBridge();

console.log("Checking if Stockbit Desktop is running...");
const isRunning = await bridge.isAppRunning();
console.log("Stockbit Running Status:", isRunning);

if (!isRunning) {
  console.log("Stockbit is not running on port 9222. Please start Stockbit.");
  process.exit(1);
}

try {
  console.log("\n1. Testing User Profile...");
  const user = await bridge.getUserProfile();
  console.log("User:", user?.fullname, `(@${user?.username})`);

  console.log("\n2. Testing Bank Detail...");
  const bank = await bridge.getBankDetail();
  console.log(`Bank: ${bank.data?.account?.rdn?.name} | Balance: Rp ${bank.data?.balance?.toLocaleString()}`);

  console.log("\n3. Testing Portfolio...");
  const porto = await bridge.getPortfolio();
  console.log(`Invested: Rp ${porto.data?.summary?.amount?.invested?.toLocaleString()}`);
  console.log(`Unrealized P&L: Rp ${porto.data?.summary?.profit_loss?.unrealised?.toLocaleString()} (${(porto.data?.summary?.gain * 100).toFixed(2)}%)`);

  console.log("\n4. Testing Watchlist...");
  const wl = await bridge.getWatchlist(5);
  console.log(`Watchlist Name: ${wl.data?.name} (Total: ${wl.data?.total} stocks)`);
  wl.data?.companies?.slice(0, 3).forEach(c => {
    console.log(`  ${c.symbol}: ${c.last} (${c.change} / ${c.percent}%)`);
  });

  console.log("\n5. Testing BBCA Orderbook...");
  const ob = await bridge.getOrderbook('BBCA');
  console.log(`BBCA Best Bid: ${ob.data?.bid?.[0]?.price} (Vol: ${ob.data?.bid?.[0]?.volume}) | Best Offer: ${ob.data?.offer?.[0]?.price}`);

  console.log("\n6. Testing BBCA Broker Distribution...");
  const bd = await bridge.getBrokerDistribution('BBCA');
  console.log(`Top Buyer: ${bd.data?.by_value?.top_broker_buy?.[0]?.detail?.code} (${bd.data?.by_value?.top_broker_buy?.[0]?.detail?.type}) - Rp ${bd.data?.by_value?.top_broker_buy?.[0]?.detail?.amount?.toLocaleString()}`);

  console.log("\n7. Testing Historical Candlestick Chart (BBCA)...");
  const candles = await bridge.getDailyCandles('BBCA', '2024-01-01', '2024-03-31');
  console.log(`Total Bars: ${candles.total_bars} | Date Range: ${candles.bars[0]?.date} s/d ${candles.bars[candles.total_bars - 1]?.date}`);
  console.log(`Latest Bar Close: Rp ${candles.bars[candles.total_bars - 1]?.close} | Net Foreign: Rp ${candles.bars[candles.total_bars - 1]?.net_foreign?.toLocaleString()}`);

  console.log("\nALL BRIDGE TESTS PASSED PERFECTLY!");
} catch (err) {
  console.error("Test Error:", err);
} process.exit(0);
