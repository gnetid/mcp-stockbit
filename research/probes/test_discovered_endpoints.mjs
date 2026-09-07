// research/probes/test_discovered_endpoints.mjs
import { StockbitBridge } from '../../src/stockbitBridge.mjs';

async function main() {
  const bridge = new StockbitBridge();
  await bridge.ensureConnected();

  const tests = [
    { name: 'Financial Statements (Income/Balance/Cash)', url: 'https://exodus.stockbit.com/findata-view/company/financial?symbol=BBCA', token: 'at' },
    { name: 'Market Mover', url: 'https://exodus.stockbit.com/order-trade/market-mover?category=top_gainer', token: 'at' },
    { name: 'Top Stock', url: 'https://exodus.stockbit.com/order-trade/top-stock?type=value', token: 'at' },
    { name: 'Trade Book BBCA', url: 'https://exodus.stockbit.com/order-trade/trade-book?symbol=BBCA&group_by=GROUP_BY_PRICE&mode=TRADE_BOOK_MODE_OVERALL', token: 'at' },
    { name: 'Insider Shareholding BBCA', url: 'https://exodus.stockbit.com/insider/shareholding/composition/companies/BBCA', token: 'at' },
    { name: 'Foreign Domestic Summary BBCA', url: 'https://exodus.stockbit.com/order-trade/foreign-domestic/summary?symbol=BBCA', token: 'at' },
    { name: 'Foreign Domestic Historical BBCA', url: 'https://exodus.stockbit.com/order-trade/foreign-domestic/historical?symbol=BBCA', token: 'at' },
    { name: 'Broker Activity BBCA', url: 'https://exodus.stockbit.com/order-trade/broker/activity?symbol=BBCA', token: 'at' },
    { name: 'Broker Activity Historical BBCA', url: 'https://exodus.stockbit.com/order-trade/broker/activity/historical?symbol=BBCA', token: 'at' },
    { name: 'Market Detectors BBCA', url: 'https://exodus.stockbit.com/marketdetectors/BBCA', token: 'at' },
    { name: 'Historical Summary BBCA', url: 'https://exodus.stockbit.com/company-price-feed/historical/summary/BBCA', token: 'at' },
    { name: 'Price Performance BBCA', url: 'https://exodus.stockbit.com/company-price-feed/price-performance/BBCA', token: 'at' },
    { name: 'Portfolio Cumulative Return', url: 'https://carina.stockbit.com/history/performance/portfolio/cumulative-return', token: 'ats' },
    { name: 'Portfolio Equity Return', url: 'https://carina.stockbit.com/history/performance/portfolio/total-equity-return', token: 'ats' },
    { name: 'Portfolio Trade Performance', url: 'https://carina.stockbit.com/history/performance/trade', token: 'ats' }
  ];

  for (const t of tests) {
    try {
      const res = await bridge.fetchStockbitApi(t.url, t.token);
      const keys = res && typeof res === 'object' ? Object.keys(res.data || res) : typeof res;
      console.log(`[PASS] ${t.name} -> keys:`, Array.isArray(keys) ? keys.slice(0, 10) : keys);
    } catch (err) {
      console.log(`[FAIL] ${t.name} -> ${err.message.slice(0, 120)}`);
    }
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
