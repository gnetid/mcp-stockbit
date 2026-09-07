// research/probes/test_financial_grid.mjs
import { StockbitBridge } from '../../src/stockbitBridge.mjs';

async function main() {
  const bridge = new StockbitBridge();
  await bridge.ensureConnected();

  for (let dt = 1; dt <= 2; dt++) {
    for (let st = 1; st <= 3; st++) {
      for (let rt = 1; rt <= 3; rt++) {
        try {
          const res = await bridge.fetchStockbitApi(`https://exodus.stockbit.com/findata-view/company/financial?symbol=BBRI&data_type=${dt}&report_type=${rt}&statement_type=${st}`, 'at');
          const tables = res.data?.data_tables;
          console.log(`dt=${dt} st=${st} rt=${rt} -> periods: ${tables?.periods?.length || 0}, accounts: ${tables?.accounts?.length || 0}`);
          if (tables?.accounts?.length > 0) {
            console.log('Sample account:', tables.accounts[0]);
          }
        } catch(e) {
          console.log(`dt=${dt} st=${st} rt=${rt} err:`, e.message.slice(0, 70));
        }
      }
    }
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
