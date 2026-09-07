// research/probes/find_financials_endpoint.mjs
import { StockbitBridge } from '../../src/stockbitBridge.mjs';

async function main() {
  const bridge = new StockbitBridge();
  await bridge.ensureConnected();

  const candidates = [
    // Findata-view candidates with various types
    'https://exodus.stockbit.com/findata-view/company/financial?symbol=BBCA&data_type=1&report_type=1&statement_type=1',
    'https://exodus.stockbit.com/findata-view/company/financial?symbol=BBCA&data_type=1&report_type=2&statement_type=1',
    'https://exodus.stockbit.com/findata-view/company/financial?symbol=BBCA&data_type=1&report_type=3&statement_type=1',
    'https://exodus.stockbit.com/findata-view/company/financial?symbol=BBCA&data_type=2&report_type=1&statement_type=1',
    'https://exodus.stockbit.com/findata-view/company/financial?symbol=BBCA&data_type=1&report_type=1&statement_type=2',
    'https://exodus.stockbit.com/findata-view/company/financial?symbol=BBCA&data_type=1&report_type=1&statement_type=3',
    'https://exodus.stockbit.com/findata-view/company/financial?symbol=BBCA&data_type=1&report_type=2&statement_type=2',
    'https://exodus.stockbit.com/findata-view/company/financial?symbol=BBCA&data_type=1&report_type=2&statement_type=3',
    
    // Other common stockbit financial paths
    'https://exodus.stockbit.com/financials/BBCA',
    'https://exodus.stockbit.com/financial/BBCA',
    'https://exodus.stockbit.com/financial/income-statement/BBCA',
    'https://exodus.stockbit.com/financial/balance-sheet/BBCA',
    'https://exodus.stockbit.com/financial/cash-flow/BBCA',
    'https://exodus.stockbit.com/company/BBCA/financials',
    'https://exodus.stockbit.com/findata-view/financials/BBCA',
    'https://exodus.stockbit.com/keystats/financial/BBCA'
  ];

  for (const url of candidates) {
    try {
      const res = await bridge.fetchStockbitApi(url, 'at');
      const d = res.data || res;
      console.log(`[PASS] ${url}`);
      console.log('   Keys:', Object.keys(d));
      if (d.data_tables) {
        console.log('   data_tables keys:', Object.keys(d.data_tables));
        console.log('   periods:', d.data_tables.periods?.length, 'accounts:', d.data_tables.accounts?.length);
        if (d.data_tables.accounts?.length > 0) {
          console.log('   first account:', d.data_tables.accounts[0].name || d.data_tables.accounts[0].title);
        }
      }
    } catch(err) {
      console.log(`[FAIL] ${url} -> ${err.message.slice(0, 50)}`);
    }
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
