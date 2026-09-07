// research/probes/test_user_requested_features.mjs
import { StockbitBridge } from '../../src/stockbitBridge.mjs';

async function main() {
  const bridge = new StockbitBridge();
  await bridge.ensureConnected();

  console.log('--- 1. Testing Trade Flow Candidates ---');
  const tfCandidates = [
    { name: 'Running Trade Chart', url: 'https://exodus.stockbit.com/order-trade/running-trade/chart/BBCA' },
    { name: 'Trade Book Chart', url: 'https://exodus.stockbit.com/order-trade/trade-book/chart?symbol=BBCA&time_interval=1m' },
    { name: 'Trade Book 5m Chart', url: 'https://exodus.stockbit.com/order-trade/trade-book/chart?symbol=BBCA&time_interval=5m' },
    { name: 'Trade Flow BBCA', url: 'https://exodus.stockbit.com/order-trade/trade-flow?symbol=BBCA' }
  ];
  for (const c of tfCandidates) {
    try {
      const res = await bridge.fetchStockbitApi(c.url, 'at');
      console.log(`[PASS] ${c.name} -> keys:`, Object.keys(res.data || res));
      console.log(' sample:', JSON.stringify(res.data || res).slice(0, 200));
    } catch(e) {
      console.log(`[FAIL] ${c.name} ->`, e.message.slice(0, 80));
    }
  }

  console.log('\n--- 2. Testing Broker Flow Candidates ---');
  const bfCandidates = [
    { name: 'Broker Activity Chart', url: 'https://exodus.stockbit.com/order-trade/broker/activity-chart?symbol=BBCA' },
    { name: 'Broker Activity Chart with params', url: 'https://exodus.stockbit.com/order-trade/broker/activity-chart?symbols%5B%5D=BBCA&date_from=2024-08-01&date_to=2024-08-30' },
    { name: 'Broker Flow BBCA', url: 'https://exodus.stockbit.com/order-trade/broker-flow?symbol=BBCA' },
    { name: 'Broker Activity Historical BBCA', url: 'https://exodus.stockbit.com/order-trade/broker/activity/historical?symbols%5B%5D=BBCA&date_from=2024-08-01&date_to=2024-08-30' }
  ];
  for (const c of bfCandidates) {
    try {
      const res = await bridge.fetchStockbitApi(c.url, 'at');
      console.log(`[PASS] ${c.name} -> keys:`, Object.keys(res.data || res));
      console.log(' sample:', JSON.stringify(res.data || res).slice(0, 200));
    } catch(e) {
      console.log(`[FAIL] ${c.name} ->`, e.message.slice(0, 80));
    }
  }

  console.log('\n--- 3. Testing Broker Summary & Broker Distribution ---');
  const bsCandidates = [
    { name: 'Broker Distribution', url: 'https://exodus.stockbit.com/order-trade/broker/distribution?symbol=BBCA' },
    { name: 'Broker Summary (Marketdetectors)', url: 'https://exodus.stockbit.com/marketdetectors/BBCA' },
    { name: 'Broker Summary Direct', url: 'https://exodus.stockbit.com/order-trade/broker/broker-summary?symbol=BBCA' }
  ];
  for (const c of bsCandidates) {
    try {
      const res = await bridge.fetchStockbitApi(c.url, 'at');
      console.log(`[PASS] ${c.name} -> keys:`, Object.keys(res.data || res));
    } catch(e) {
      console.log(`[FAIL] ${c.name} ->`, e.message.slice(0, 80));
    }
  }

  console.log('\n--- 4. Testing Foreign Flow Candidates ---');
  const ffCandidates = [
    { name: 'Foreign Domestic Summary', url: 'https://exodus.stockbit.com/order-trade/foreign-domestic/summary?symbols%5B%5D=BBCA' },
    { name: 'Foreign Domestic Historical', url: 'https://exodus.stockbit.com/order-trade/foreign-domestic/historical?symbols%5B%5D=BBCA&date_from=2024-08-01&date_to=2024-08-30' },
    { name: 'Chartbit Daily Foreign Flow', url: 'https://exodus.stockbit.com/chartbit/BBCA/price/daily?from=2024-08-30&to=2024-08-01' }
  ];
  for (const c of ffCandidates) {
    try {
      const res = await bridge.fetchStockbitApi(c.url, 'at');
      console.log(`[PASS] ${c.name} -> keys:`, Object.keys(res.data || res));
      console.log(' sample:', JSON.stringify(res.data || res).slice(0, 200));
    } catch(e) {
      console.log(`[FAIL] ${c.name} ->`, e.message.slice(0, 80));
    }
  }

  console.log('\n--- 5. Testing Historical Data Candidates ---');
  const histCandidates = [
    { name: 'Company Price Feed Historical Summary', url: 'https://exodus.stockbit.com/company-price-feed/historical/summary/BBCA' },
    { name: 'Company Price Feed Historical Summary with Page', url: 'https://exodus.stockbit.com/company-price-feed/historical/summary/BBCA?page=1&limit=20' },
    { name: 'Daily Price', url: 'https://exodus.stockbit.com/company-price-feed/prices/close?stock_code=BBCA' }
  ];
  for (const c of histCandidates) {
    try {
      const res = await bridge.fetchStockbitApi(c.url, 'at');
      console.log(`[PASS] ${c.name} -> keys:`, Object.keys(res.data || res));
      console.log(' sample:', JSON.stringify(res.data || res).slice(0, 250));
    } catch(e) {
      console.log(`[FAIL] ${c.name} ->`, e.message.slice(0, 80));
    }
  }

  console.log('\n--- 6. Testing Stream Candidates ---');
  const streamCandidates = [
    { name: 'Stream by Symbol', url: 'https://exodus.stockbit.com/stream/symbol/BBCA?limit=5' },
    { name: 'Stream Trending', url: 'https://exodus.stockbit.com/stream/trending?limit=5' },
    { name: 'Stream Popular', url: 'https://exodus.stockbit.com/stream/popular?limit=5' },
    { name: 'Stream Timeline', url: 'https://exodus.stockbit.com/stream/timeline?limit=5' }
  ];
  for (const c of streamCandidates) {
    try {
      const res = await bridge.fetchStockbitApi(c.url, 'at');
      console.log(`[PASS] ${c.name} -> keys:`, Object.keys(res.data || res));
      console.log(' sample:', JSON.stringify(res.data || res).slice(0, 200));
    } catch(e) {
      console.log(`[FAIL] ${c.name} ->`, e.message.slice(0, 80));
    }
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
