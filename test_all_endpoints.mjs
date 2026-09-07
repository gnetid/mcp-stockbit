// test_all_endpoints.mjs
// Automated verification suite for all Stockbit Bridge & MCP data methods

import { StockbitBridge } from './src/stockbitBridge.mjs';

async function runAllTests() {
  console.log('='.repeat(70));
  console.log('⚡ STOCKBIT FULL SUITE VERIFICATION TEST');
  console.log('='.repeat(70));

  const bridge = new StockbitBridge();
  const isRunning = await bridge.isAppRunning();
  console.log(`[CDP Connection]: ${isRunning ? 'CONNECTED (Port 9222)' : 'DISCONNECTED'}`);

  if (!isRunning) {
    console.error('Stockbit Desktop is not reachable on port 9222. Please start Stockbit.');
    process.exit(1);
  }

  const tests = [
    // Modul 1: Akun & Portofolio
    { name: '1. User Profile', fn: () => bridge.getUserProfile() },
    { name: '2. Portfolio & Holdings', fn: () => bridge.getPortfolio() },
    { name: '3. Bank Account & RDN', fn: () => bridge.getBankDetail() },
    { name: '4. Portfolio Performance', fn: () => bridge.getPortfolioPerformance() },
    { name: '5. Portfolio Cumulative Returns', fn: () => bridge.getPortfolioReturns() },
    { name: '6. Sub-Accounts List', fn: () => bridge.getSubAccounts() },

    // Modul 2: Orders & Riwayat Transaksi
    { name: '7. Active & Today Orders', fn: () => bridge.getOrders() },
    { name: '8. Order History (Pagination & Fees)', fn: () => bridge.getOrderHistory(1, 10, 'all') },

    // Modul 3: Market Depth & Tape
    { name: '9. Orderbook (10-20 level depth)', fn: () => bridge.getOrderbook('BBCA') },
    { name: '10. Trade Book (Price Distribution)', fn: () => bridge.getTradebook('BBCA') },
    { name: '11. Trade Flow (Time-Series Buy vs Sell 1m)', fn: () => bridge.getTradeFlow('BBCA', '1m') },
    { name: '12. Running Trade Live Feed', fn: () => bridge.getRunningTrade(20, 'BBCA') },
    { name: '13. Quote & Price Ticks', fn: () => bridge.getCompanyInfo('BBCA') },
    { name: '14. IDX Market Session Status', fn: () => bridge.getMarketSession() },

    // Modul 4: Bandarmologi & Broker Analytics
    { name: '15. Broker Summary (Clean Table Buyer/Seller)', fn: () => bridge.getBrokerSummary('BBCA') },
    { name: '16. Broker Distribution Matrix (By Value/Volume)', fn: () => bridge.getBrokerDistribution('BBCA') },
    { name: '17. Broker Flow (Broker Net Asset Flow to Symbols)', fn: () => bridge.getBrokerFlow('YU') },
    { name: '18. Bandar Detector (Custom Date Range)', fn: () => bridge.getBandarDetector('BBCA', '2024-08-01', '2024-08-30') },
    { name: '19. Broker Activity Historical', fn: () => bridge.getBrokerActivityHistorical('BBCA', '2024-08-01', '2024-08-30') },
    { name: '20. Foreign Flow (Cumulative Net Foreign & Stance)', fn: () => bridge.getForeignFlow('BBCA', 15) },
    { name: '21. Foreign vs Domestic Breakdown', fn: () => bridge.getForeignDomesticFlow('BBCA') },
    { name: '22. Broker Directory Master List', fn: () => bridge.getBrokerList(20, 1) },
    { name: '23. Top Brokers per Symbol', fn: () => bridge.getTopBrokers('BBCA') },

    // Modul 5: Charting & Analisis Teknikal
    { name: '24. Daily OHLCV & Foreign Flow', fn: () => bridge.getDailyCandles('BBCA', '2024-01-01', '2024-09-01') },
    { name: '25. Intraday Candlestick 1m', fn: () => bridge.getIntradayCandles('BBCA', null, null, 1) },
    { name: '26. Historical Data (Tabular OHLCV & Foreign)', fn: () => bridge.getHistoricalData('BBCA', 1, 10) },
    { name: '27. Price Performance Multi-Timeframe', fn: () => bridge.getPricePerformance('BBCA') },

    // Modul 6: Fundamental, Rasio & Konsensus
    { name: '28. Key Stats Ratios Terkini', fn: () => bridge.getKeyStats('BBCA') },
    { name: '29. Key Stats 10-Yr Historical Ratios', fn: () => bridge.getKeyStatsHistorical('BBCA', 10) },
    { name: '30. Seasonality Month-by-Month Analysis', fn: () => bridge.getSeasonality('BBCA', 2024, 5) },
    { name: '31. Analyst Ratings & Target Price', fn: () => bridge.getAnalystRatings('BBCA') },
    { name: '32. Analyst Consensus Breakdown', fn: () => bridge.getAnalystConsensus('BBCA') },

    // Modul 7: Profil Korporat & Insiders
    { name: '33. Company Profile & Executives/Subsidiaries', fn: () => bridge.getCompanyProfile('BBCA') },
    { name: '34. Insider Transactions (Direksi/Owners)', fn: () => bridge.getInsiderTransactions('BBCA', 1) },
    { name: '35. Shareholder Composition Historical', fn: () => bridge.getShareholderComposition('BBCA') },
    { name: '36. Corporate Actions & Dividends Calendar', fn: () => bridge.getCorporateActions('BBCA') },

    // Modul 8: Market Discovery, Screener & Stream
    { name: '37. Market Movers (Top Gainer/Loser/Active)', fn: () => bridge.getMarketMovers('top_gainer') },
    { name: '38. Top Stocks by Turnover Value', fn: () => bridge.getTopStocks('value') },
    { name: '39. Screener Presets Catalog (Guru/Graham)', fn: () => bridge.getScreenerPresets() },
    { name: '40. Community Stream Posts & Sentiment', fn: () => bridge.getStream('BBCA', 10) },
    { name: '41. Watchlist with Live Quotes', fn: () => bridge.getWatchlist(20) },
    { name: '42. Search Emiten IDX', fn: () => bridge.searchEmiten('bank') },

    // Modul 9: Financial Statements & Peer Comparison Deep Dive
    { name: '43. Financials (Income Statement Quarterly)', fn: () => bridge.getFinancials('BBCA', 'income_statement', 'quarterly', 6) },
    { name: '44. Financials (Balance Sheet Annual)', fn: () => bridge.getFinancials('BBCA', 'balance_sheet', 'annual', 5) },
    { name: '45. Comparison (Peers & Industry/Sector Averages)', fn: () => bridge.getComparison('BBCA', true) },
    { name: '46. Consolidated Analyst Analysis & Price Targets', fn: () => bridge.getAnalystAnalysis('BBCA') },

    // Modul 10: Complete Chartbit Multi-Timeframe Engine
    { name: '47. Chartbit Intraday 5m (Minute Aggregation)', fn: () => bridge.getChartbit('BBCA', { timeframe: '5m', range: '1D' }) },
    { name: '48. Chartbit Intraday 15m (15-Minute Candle)', fn: () => bridge.getChartbit('BBCA', { timeframe: '15m', range: '5D' }) },
    { name: '49. Chartbit Hourly 2h (Multi-Hour Aggregation)', fn: () => bridge.getChartbit('BBCA', { timeframe: '2h', range: '1M' }) },
    { name: '50. Chartbit Macro Weekly 1W (OHLCV & Foreign)', fn: () => bridge.getChartbit('BBCA', { timeframe: '1W', range: '1Y' }) },
    { name: '51. Chartbit Macro Monthly 1M (Multi-Year Accumulation)', fn: () => bridge.getChartbit('BBCA', { timeframe: '1M', range: '3Y' }) },
    { name: '52. Order Queue per Saham (BBCA)', fn: () => bridge.getOrderQueue('BBCA') },
    { name: '53. Price Alerts List', fn: () => bridge.getPriceAlerts() },
    { name: '54. Chartbit Saved Layouts & Drawings', fn: () => bridge.getChartLayouts() },
    { name: '55. Bond & SBN Portfolio', fn: () => bridge.getBondPortfolio() },
    { name: '56. Notifications & Unread Count', fn: () => bridge.getNotifications(10) }
  ];



  let passed = 0;
  let failed = 0;
  const results = [];

  for (const t of tests) {
    const t0 = Date.now();
    try {
      const data = await t.fn();
      const elapsed = Date.now() - t0;
      passed++;
      results.push({
        status: 'PASS',
        name: t.name,
        time: `${elapsed}ms`,
        detail: Array.isArray(data) ? `${data.length} items` : (data?.data ? (Array.isArray(data.data) ? `${data.data.length} items` : Object.keys(data.data).length + ' keys') : (typeof data === 'object' ? Object.keys(data).length + ' keys' : 'OK'))
      });
      console.log(`✅ [PASS] ${t.name} (${elapsed}ms)`);
    } catch (err) {
      const elapsed = Date.now() - t0;
      failed++;
      results.push({
        status: 'FAIL',
        name: t.name,
        time: `${elapsed}ms`,
        detail: err.message.slice(0, 45)
      });
      console.log(`❌ [FAIL] ${t.name} (${elapsed}ms) -> ${err.message.slice(0, 80)}`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED / ${failed} FAILED (TOTAL: ${tests.length})`);
  console.log('='.repeat(70));

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runAllTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

