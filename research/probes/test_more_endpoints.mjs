// research/probes/test_more_endpoints.mjs
import { StockbitBridge } from '../../src/stockbitBridge.mjs';

async function main() {
  const bridge = new StockbitBridge();
  await bridge.ensureConnected();

  const tests = [
    { name: 'Broker Top', url: 'https://exodus.stockbit.com/order-trade/broker/top?symbol=BBCA', token: 'at' },
    { name: 'Market Detectors Brokers', url: 'https://exodus.stockbit.com/findata-view/marketdetectors/brokers?symbol=BBCA', token: 'at' },
    { name: 'Broker Activity', url: 'https://exodus.stockbit.com/order-trade/broker/activity?symbols%5B%5D=BBCA&action_type=ALL', token: 'at' },
    { name: 'Broker Activity Historical', url: 'https://exodus.stockbit.com/order-trade/broker/activity/historical?symbols%5B%5D=BBCA&date_from=2024-08-01&date_to=2024-09-01', token: 'at' },
    { name: 'Foreign Domestic Summary', url: 'https://exodus.stockbit.com/order-trade/foreign-domestic/summary?symbols%5B%5D=BBCA', token: 'at' },
    { name: 'Foreign Domestic Historical', url: 'https://exodus.stockbit.com/order-trade/foreign-domestic/historical?symbols%5B%5D=BBCA&date_from=2024-08-01&date_to=2024-09-01', token: 'at' },
    { name: 'Insider Majorholder Ownership', url: 'https://exodus.stockbit.com/insider/majorholder/ownership?symbol=BBCA', token: 'at' },
    { name: 'Shareholders Chart BBCA', url: 'https://exodus.stockbit.com/emitten-metadata/shareholders/BBCA/chart', token: 'at' }
  ];

  for (const t of tests) {
    try {
      const res = await bridge.fetchStockbitApi(t.url, t.token);
      const k = res && typeof res === 'object' ? Object.keys(res.data || res) : typeof res;
      console.log(`[PASS] ${t.name} ->`, k);
    } catch(err) {
      console.log(`[FAIL] ${t.name} -> ${err.message.slice(0, 100)}`);
    }
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
