// research/probes/map_financial_types.mjs
import { StockbitBridge } from '../../src/stockbitBridge.mjs';

async function main() {
  const bridge = new StockbitBridge();
  await bridge.ensureConnected();

  for (let st = 1; st <= 4; st++) {
    try {
      const res = await bridge.fetchStockbitApi(`https://exodus.stockbit.com/findata-view/company/financial?symbol=BBCA&data_type=1&report_type=1&statement_type=${st}`, 'at');
      const table = res.data?.data_tables || [];
      const sampleNames = table.slice(0, 3).map(r => r.name || r.label || r.title || Object.keys(r)[0]);
      console.log(`statement_type=${st}: row count=${table.length}, sample rows:`, sampleNames);
    } catch(e) {
      console.log(`statement_type=${st} failed:`, e.message);
    }
  }

  for (let rt = 1; rt <= 4; rt++) {
    try {
      const res = await bridge.fetchStockbitApi(`https://exodus.stockbit.com/findata-view/company/financial?symbol=BBCA&data_type=1&report_type=${rt}&statement_type=1`, 'at');
      const periods = res.data?.data_tables?.[0]?.data?.map(d => d.period || d.year || d.label) || [];
      console.log(`report_type=${rt}: sample periods:`, periods.slice(0, 4));
    } catch(e) {
      console.log(`report_type=${rt} failed:`, e.message);
    }
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
