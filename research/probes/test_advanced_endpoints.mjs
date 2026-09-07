// research/probes/test_advanced_endpoints.mjs
import { StockbitBridge } from '../../src/stockbitBridge.mjs';

async function main() {
  const bridge = new StockbitBridge();
  await bridge.ensureConnected();

  // Test analyst ratings
  try {
    const res = await bridge.fetchStockbitApi('https://exodus.stockbit.com/analyst-ratings/BBCA', 'at');
    console.log('[PASS] Analyst ratings BBCA:', Object.keys(res.data || res));
  } catch(e) {
    console.log('[FAIL] Analyst ratings BBCA:', e.message.slice(0, 80));
  }

  // Test analyst ratings consensus
  try {
    const res = await bridge.fetchStockbitApi('https://exodus.stockbit.com/analyst-ratings/BBCA/consensus', 'at');
    console.log('[PASS] Consensus BBCA:', Object.keys(res.data || res));
  } catch(e) {
    console.log('[FAIL] Consensus BBCA:', e.message.slice(0, 80));
  }

  // Test seasonality with year and back_year
  try {
    const res = await bridge.fetchStockbitApi('https://exodus.stockbit.com/company-price-feed/seasonality/BBCA?year=2024&back_year=5', 'at');
    console.log('[PASS] Seasonality BBCA:', Object.keys(res.data || res));
  } catch(e) {
    console.log('[FAIL] Seasonality BBCA:', e.message.slice(0, 80));
  }

  // Test keystats ratio v1
  try {
    const res = await bridge.fetchStockbitApi('https://exodus.stockbit.com/keystats/ratio/v1/BBCA?year_limit=10', 'at');
    console.log('[PASS] Keystats Ratio v1 BBCA:', Object.keys(res.data || res));
  } catch(e) {
    console.log('[FAIL] Keystats Ratio v1 BBCA:', e.message.slice(0, 80));
  }

  // Test insider majorholder
  try {
    const res = await bridge.fetchStockbitApi('https://exodus.stockbit.com/insider/company/majorholder?symbol=BBCA&page=1', 'at');
    console.log('[PASS] Insider Majorholder BBCA:', Object.keys(res.data || res));
  } catch(e) {
    console.log('[FAIL] Insider Majorholder BBCA:', e.message.slice(0, 80));
  }

  // Test financial statement combinations
  const reports = ['annual', 'quarter', 'ttm', 'Quarter', 'Annual', 'TTM', '1', '2', '3'];
  const statements = ['income_statement', 'balance_sheet', 'cash_flow', '1', '2', '3', 'income-statement', 'balance-sheet', 'cash-flow'];

  let foundFin = false;
  for (const r of reports) {
    for (const s of statements) {
      try {
        const res = await bridge.fetchStockbitApi(`https://exodus.stockbit.com/findata-view/company/financial?symbol=BBCA&data_type=1&report_type=${r}&statement_type=${s}`, 'at');
        console.log(`[SUCCESS FIN] report_type=${r} statement_type=${s} ->`, Object.keys(res.data || res));
        foundFin = true;
        break;
      } catch(e) {}
    }
    if (foundFin) break;
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
