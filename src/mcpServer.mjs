#!/usr/bin/env node
// src/mcpServer.mjs
// Model Context Protocol (MCP) Server for Stockbit Desktop
// Comprehensive suite of 36 tools covering 100% of Stockbit pages and features

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { StockbitBridge } from './stockbitBridge.mjs';

const bridge = new StockbitBridge();

// Initialize MCP Server
const server = new McpServer({
  name: 'stockbit-mcp',
  version: '2.0.0'
});

// Helper for standardized successful envelope
function formatResponse(data, source = 'exodus', extraMeta = {}) {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          data,
          meta: {
            source,
            timestamp: new Date().toISOString(),
            ...extraMeta
          }
        }, null, 2)
      }
    ]
  };
}

// Helper for error formatting
function handleBridgeError(err, toolName) {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: {
            tool: toolName,
            message: err.message,
            hint: 'Pastikan Stockbit Desktop sedang berjalan dengan flag --remote-debugging-port=9222 dan Anda sudah login.'
          }
        }, null, 2)
      }
    ],
    isError: true
  };
}

// ==========================================
// MODUL 1: AKUN & PORTOFOLIO (CARINA API)
// ==========================================

// 1. Tool: stockbit_get_portfolio
server.tool(
  'stockbit_get_portfolio',
  'Mengambil data portofolio pengguna Stockbit: saldo kas trading, modal terinvestasi, floating profit/loss, gain percentage, dan daftar kepemilikan saham (holdings).',
  {},
  async () => {
    try {
      const data = await bridge.getPortfolio();
      return formatResponse(data?.data || data, 'carina');
    } catch (err) {
      return handleBridgeError(err, 'stockbit_get_portfolio');
    }
  }
);

// 2. Tool: stockbit_get_bank_account
server.tool(
  'stockbit_get_bank_account',
  'Mengambil informasi rekening RDN (Rekening Dana Nasabah) bank kustodian, nomor rekening, nama pemilik, dan saldo kas riil.',
  {},
  async () => {
    try {
      const data = await bridge.getBankDetail();
      return formatResponse(data?.data || data, 'carina');
    } catch (err) {
      return handleBridgeError(err, 'stockbit_get_bank_account');
    }
  }
);

// 3. Tool: stockbit_get_portfolio_performance
server.tool(
  'stockbit_get_portfolio_performance',
  'Mengambil analisis performa trading historis akun pengguna: win rate (%), profit factor, total transaksi menang/kalah, total realized gain/loss, total dividen yang diterima, dan daftar saham yang paling sering ditradingkan.',
  {},
  async () => {
    try {
      const data = await bridge.getPortfolioPerformance();
      return formatResponse(data?.data || data, 'carina');
    } catch (err) {
      return handleBridgeError(err, 'stockbit_get_portfolio_performance');
    }
  }
);

// 4. Tool: stockbit_get_portfolio_returns
server.tool(
  'stockbit_get_portfolio_returns',
  'Mengambil riwayat return portofolio harian kumulatif (%) akun pengguna dibandingkan dengan benchmark IHSG.',
  {},
  async () => {
    try {
      const data = await bridge.getPortfolioReturns();
      return formatResponse(data?.data || data, 'carina');
    } catch (err) {
      return handleBridgeError(err, 'stockbit_get_portfolio_returns');
    }
  }
);

// 5. Tool: stockbit_get_sub_accounts
server.tool(
  'stockbit_get_sub_accounts',
  'Mengambil daftar rekening sub-account sekuritas pengguna (Reguler, Margin, Day Trading) dan status limit trading.',
  {},
  async () => {
    try {
      const data = await bridge.getSubAccounts();
      return formatResponse(data?.data || data, 'carina');
    } catch (err) {
      return handleBridgeError(err, 'stockbit_get_sub_accounts');
    }
  }
);

// ==========================================
// MODUL 2: TRANSAKSI & ORDER MANAGEMENT (CARINA API)
// ==========================================

// 6. Tool: stockbit_get_orders
server.tool(
  'stockbit_get_orders',
  'Mengambil daftar antrean order jual/beli saham hari ini yang berstatus OPEN (antre), MATCHED (terlaksana), PARTIAL, atau REJECTED.',
  {},
  async () => {
    try {
      const data = await bridge.getOrders();
      return formatResponse(data?.data || data, 'carina');
    } catch (err) {
      return handleBridgeError(err, 'stockbit_get_orders');
    }
  }
);

// 7. Tool: stockbit_get_order_history
server.tool(
  'stockbit_get_order_history',
  'Mengambil riwayat lengkap transaksi lampau akun pengguna (matched orders, fee bursa/broker, realized gain/loss, dividen, dan mutasi kas).',
  {
    page: z.number().optional().describe('Nomor halaman (default 1)'),
    limit: z.number().optional().describe('Jumlah riwayat per halaman (default 50)'),
    period: z.string().optional().describe('Filter periode: "all", "1m", "3m", "1y" (default "all")')
  },
  async ({ page = 1, limit = 50, period = 'all' }) => {
    try {
      const data = await bridge.getOrderHistory(page, limit, period);
      return formatResponse(data?.data || data, 'carina', { page, limit, period });
    } catch (err) {
      return handleBridgeError(err, 'stockbit_get_order_history');
    }
  }
);

// ==========================================
// MODUL 3: MARKET DEPTH & TAPE READING (EXODUS API)
// ==========================================

// 8. Tool: stockbit_get_orderbook
server.tool(
  'stockbit_get_orderbook',
  'Mengambil kedalaman pasar (Orderbook) 10-20 level Bid dan Offer lengkap dengan jumlah antrean (queue) dan volume lot untuk emiten tertentu.',
  {
    symbol: z.string().describe('Kode saham emiten di IDX, contoh: BBCA, BBRI, BREN, ANTM')
  },
  async ({ symbol }) => {
    try {
      const sym = symbol.toUpperCase().trim();
      const data = await bridge.getOrderbook(sym);
      return formatResponse(data?.data || data, 'exodus', { symbol: sym });
    } catch (err) {
      return handleBridgeError(err, 'stockbit_get_orderbook');
    }
  }
);

// 9. Tool: stockbit_get_tradebook
server.tool(
  'stockbit_get_tradebook',
  'Mengambil Trade Book emiten IDX: rincian volume lot transaksi terlaksana di setiap baris harga (matched buy lot vs sell lot, dominasi buyer vs seller %, serta transaksi big money).',
  {
    symbol: z.string().describe('Kode saham emiten di IDX, contoh: BBCA, ASII, BMRI')
  },
  async ({ symbol }) => {
    try {
      const sym = symbol.toUpperCase().trim();
      const data = await bridge.getTradebook(sym);
      return formatResponse(data?.data || data, 'exodus', { symbol: sym });
    } catch (err) {
      return handleBridgeError(err, 'stockbit_get_tradebook');
    }
  }
);

// 9b. Tool: stockbit_get_trade_flow
server.tool(
  'stockbit_get_trade_flow',
  'Mengambil time-series aliran transaksi per menit (Trade Flow) bursa IDX live: volume, lot, frekuensi beli vs jual menit-per-menit, serta aliran transaksi Big Money (paus/institusi).',
  {
    symbol: z.string().describe('Kode saham emiten di IDX, contoh: BBCA, BBRI, ASII'),
    time_interval: z.string().optional().describe('Interval waktu time-series ("1m", default "1m")')
  },
  async ({ symbol, time_interval = '1m' }) => {
    try {
      const sym = symbol.toUpperCase().trim();
      const data = await bridge.getTradeFlow(sym, time_interval);
      return formatResponse(data, 'exodus', { symbol: sym, time_interval });
    } catch (err) {
      return handleBridgeError(err, 'stockbit_get_trade_flow');
    }
  }
);

// 10. Tool: stockbit_get_running_trade
server.tool(
  'stockbit_get_running_trade',
  'Mengambil rekaman transaksi real-time (Running Trade) bursa IDX live: kode saham, waktu transaksi, harga, lot, papan transaksi (RG/NG), kode broker pembeli & penjual, serta identifikasi broker Asing vs Domestik.',
  {
    limit: z.number().min(1).max(200).optional().describe('Jumlah transaksi yang ingin diambil (default 80)'),
    symbol: z.string().optional().describe('Filter berdasarkan kode saham tertentu (contoh: BBCA). Kosongkan untuk seluruh bursa.'),
    action_type: z.string().optional().describe('Filter tipe transaksi: "ALL", "BUY", "SELL" (default "ALL")'),
    market_board: z.string().optional().describe('Filter papan bursa: "ALL", "RG" (Reguler), "NG" (Negosiasi) (default "ALL")')
  },
  async ({ limit = 80, symbol, action_type = 'ALL', market_board = 'ALL' }) => {
    try {
      const data = await bridge.getRunningTrade(limit, symbol, action_type, market_board);
      return formatResponse(data?.data || data, 'exodus', { symbol, limit });
    } catch (err) {
      return handleBridgeError(err, 'stockbit_get_running_trade');
    }
  }
);

// 11. Tool: stockbit_get_quote
server.tool(
  'stockbit_get_quote',
  'Mengambil profil ringkas emiten saham IDX: status corporate action, keanggotaan indeks (LQ45, IDX30, SRI-KEHATI), auto-rejection limit (ARA/ARB), dan tick harga terkini.',
  {
    symbol: z.string().describe('Kode saham emiten di IDX, contoh: BBCA, BBRI, TLKM, ASII')
  },
  async ({ symbol }) => {
    try {
      const sym = symbol.toUpperCase().trim();
      const info = await bridge.getCompanyInfo(sym);
      const prices = await bridge.getPriceList(sym).catch(() => null);
      return formatResponse({ company: info?.data || info, price_ticks: prices?.data || prices }, 'exodus', { symbol: sym });
    } catch (err) {
      return handleBridgeError(err, 'stockbit_get_quote');
    }
  }
);

// 12. Tool: stockbit_get_market_session
server.tool(
  'stockbit_get_market_session',
  'Mengambil status fase jam perdagangan bursa saham Indonesia (IDX) terkini: Pre-Opening, Session 1, Break, Session 2, Pre-Closing, Post-Trading, atau Market Closed.',
  {},
  async () => {
    try {
      const data = await bridge.getMarketSession();
      return formatResponse(data?.data || data, 'exodus');
    } catch (err) {
      return handleBridgeError(err, 'stockbit_get_market_session');
    }
  }
);

// ==========================================
// MODUL 4: BANDARMOLOGI & BROKER ANALYTICS (EXODUS API)
// ==========================================

// 13. Tool: stockbit_get_broker_summary
server.tool(
  'stockbit_get_broker_summary',
  'Mengambil tabel murni Broker Summary (ranking Top Buyer vs Top Seller broker) untuk hari ini atau rentang tanggal tertentu, lengkap dengan volume lot, value (Rp), average price, kategori Asing vs Domestik, dan status bandarmologi.',
  {
    symbol: z.string().describe('Kode saham emiten di IDX, contoh: BBCA, BMRI, AMMN'),
    from_date: z.string().optional().describe('Tanggal awal YYYY-MM-DD (contoh: 2024-08-01). Default: hari ini'),
    to_date: z.string().optional().describe('Tanggal akhir YYYY-MM-DD (contoh: 2024-08-30). Default: hari ini')
  },
  async ({ symbol, from_date, to_date }) => {
    try {
      const sym = symbol.toUpperCase().trim();
      const data = await bridge.getBrokerSummary(sym, from_date, to_date);
      return formatResponse(data, 'exodus', { symbol: sym, from_date, to_date });
    } catch (err) {
      return handleBridgeError(err, 'stockbit_get_broker_summary');
    }
  }
);

// 13b. Tool: stockbit_get_broker_distribution
server.tool(
  'stockbit_get_broker_distribution',
  'Mengambil matrix distribusi broker (Broker Distribution): pemetaan broker pembeli mana yang menyerap barang dari broker penjual mana, dikelompokkan berdasarkan nilai (by value) dan volume lot (by volume).',
  {
    symbol: z.string().describe('Kode saham emiten di IDX, contoh: BBCA, BBRI, GOTO')
  },
  async ({ symbol }) => {
    try {
      const sym = symbol.toUpperCase().trim();
      const data = await bridge.getBrokerDistribution(sym);
      return formatResponse(data?.data || data, 'exodus', { symbol: sym });
    } catch (err) {
      return handleBridgeError(err, 'stockbit_get_broker_distribution');
    }
  }
);

// 13c. Tool: stockbit_get_broker_flow
server.tool(
  'stockbit_get_broker_flow',
  'Mengambil visualisasi aliran dana broker (Broker Flow): melacak ke saham apa saja broker tertentu mengalirkan dananya (net buy/sell dan aktivitas transaksi).',
  {
    broker_code: z.string().describe('Kode broker 2 huruf bursa IDX, contoh: YU, AK, ZP, CC, PD, NI, SQ, DR')
  },
  async ({ broker_code }) => {
    try {
      const code = broker_code.toUpperCase().trim();
      const data = await bridge.getBrokerFlow(code);
      return formatResponse(data, 'exodus', { broker_code: code });
    } catch (err) {
      return handleBridgeError(err, 'stockbit_get_broker_flow');
    }
  }
);

// 14. Tool: stockbit_get_bandar_detector
server.tool(
  'stockbit_get_bandar_detector',
  'Mengambil analisis Bandarmologi (Bandar Detector) komprehensif untuk RENTANG TANGGAL TERTENTU: status akumulasi (Big Acc, Normal Acc, Neutral, Normal Dist, Big Dist), top 1, 3, 5, 10 broker, harga rata-rata bandar, serta tabel lengkap pembelian dan penjualan seluruh broker.',
  {
    symbol: z.string().describe('Kode saham emiten di IDX, contoh: BBCA, GOTO, ANTM'),
    from_date: z.string().optional().describe('Tanggal awal analisis format YYYY-MM-DD (contoh: 2024-08-01). Default: hari ini'),
    to_date: z.string().optional().describe('Tanggal akhir analisis format YYYY-MM-DD (contoh: 2024-08-30). Default: hari ini')
  },
  async ({ symbol, from_date, to_date }) => {
    try {
      const sym = symbol.toUpperCase().trim();
      const data = await bridge.getBandarDetector(sym, from_date, to_date);
      return formatResponse(data?.data || data, 'exodus', { symbol: sym, from_date, to_date });
    } catch (err) {
      return handleBridgeError(err, 'stockbit_get_bandar_detector');
    }
  }
);

// 15. Tool: stockbit_get_broker_activity_historical
server.tool(
  'stockbit_get_broker_activity_historical',
  'Mengambil riwayat transaksi broker saham tertentu dalam rentang tanggal lampau: volume lot, nilai transaksi, harga rata-rata transaksi, dan broker summary historis.',
  {
    symbol: z.string().describe('Kode saham emiten di IDX, contoh: BBCA, ASII'),
    from_date: z.string().describe('Tanggal awal format YYYY-MM-DD (contoh: 2024-08-01)'),
    to_date: z.string().describe('Tanggal akhir format YYYY-MM-DD (contoh: 2024-08-30)')
  },
  async ({ symbol, from_date, to_date }) => {
    try {
      const sym = symbol.toUpperCase().trim();
      const data = await bridge.getBrokerActivityHistorical(sym, from_date, to_date);
      return formatResponse(data?.data || data, 'exodus', { symbol: sym, from_date, to_date });
    } catch (err) {
      return handleBridgeError(err, 'stockbit_get_broker_activity_historical');
    }
  }
);

// 16. Tool: stockbit_get_foreign_domestic_flow
server.tool(
  'stockbit_get_foreign_domestic_flow',
  'Mengambil rincian pergerakan dana Investor Asing vs Domestik (Gross buy/sell, Net buy/sell) untuk saham tertentu.',
  {
    symbol: z.string().describe('Kode saham emiten di IDX, contoh: BBCA, TLKM, BBNI')
  },
  async ({ symbol }) => {
    try {
      const sym = symbol.toUpperCase().trim();
      const data = await bridge.getForeignDomesticFlow(sym);
      return formatResponse(data?.data || data, 'exodus', { symbol: sym });
    } catch (err) {
      return handleBridgeError(err, 'stockbit_get_foreign_domestic_flow');
    }
  }
);

// 16b. Tool: stockbit_get_foreign_flow
server.tool(
  'stockbit_get_foreign_flow',
  'Mengambil analisis mendalam arus modal asing (Foreign Flow): Net Foreign historis harian & kumulatif, Foreign Stance (Akumulasi/Distribusi Asing), persentase partisipasi asing terhadap turnover bursa, serta rincian gross/net buy-sell asing.',
  {
    symbol: z.string().describe('Kode saham emiten di IDX, contoh: BBCA, BBRI, TLKM, ASII'),
    days: z.number().optional().describe('Jumlah hari bursa ke belakang yang dianalisis (default 30)')
  },
  async ({ symbol, days = 30 }) => {
    try {
      const sym = symbol.toUpperCase().trim();
      const data = await bridge.getForeignFlow(sym, days);
      return formatResponse(data, 'exodus', { symbol: sym, days });
    } catch (err) {
      return handleBridgeError(err, 'stockbit_get_foreign_flow');
    }
  }
);

// 17. Tool: stockbit_get_broker_list
server.tool(
  'stockbit_get_broker_list',
  'Mengambil daftar master seluruh kode broker di Bursa Efek Indonesia (IDX): kode broker (YU, AK, ZP, CC, PD, NI, dll.), nama perusahaan sekuritas, kategori (Asing / Lokal / Pemerintah), dan izin keanggotaan bursa.',
  {
    limit: z.number().min(1).max(200).optional().describe('Jumlah broker per halaman (default 100)'),
    page: z.number().optional().describe('Halaman (default 1)')
  },
  async ({ limit = 100, page = 1 }) => {
    try {
      const data = await bridge.getBrokerList(limit, page);
      return formatResponse(data?.data || data, 'exodus', { limit, page });
    } catch (err) {
      return handleBridgeError(err, 'stockbit_get_broker_list');
    }
  }
);

// 18. Tool: stockbit_get_top_brokers
server.tool(
  'stockbit_get_top_brokers',
  'Mengambil daftar broker teratas (top buyer dan top seller) untuk saham tertentu pada hari bursa berjalan.',
  {
    symbol: z.string().describe('Kode saham emiten di IDX, contoh: BBCA, BMRI')
  },
  async ({ symbol }) => {
    try {
      const sym = symbol.toUpperCase().trim();
      const data = await bridge.getTopBrokers(sym);
      return formatResponse(data?.data || data, 'exodus', { symbol: sym });
    } catch (err) {
      return handleBridgeError(err, 'stockbit_get_top_brokers');
    }
  }
);

// ==========================================
// MODUL 5: CHARTING & TEKNIKAL (EXODUS API)
// ==========================================

// 19. Tool: stockbit_get_chart_data
server.tool(
  'stockbit_get_chart_data',
  'Mengambil data candlestick historis harian (OHLCV), volume transaksi, turnover value, dan akumulasi Foreign Flow untuk analisis teknikal, support/resistance, moving average, dan foreign flow trend.',
  {
    symbol: z.string().describe('Kode saham emiten di IDX, contoh: BBCA, BBRI, TLKM, ASII'),
    start_date: z.string().optional().describe('Tanggal awal data dalam format YYYY-MM-DD (contoh: 2024-01-01). Default: 1 tahun lalu'),
    end_date: z.string().optional().describe('Tanggal akhir data dalam format YYYY-MM-DD (contoh: 2024-12-31). Default: hari ini')
  },
  async ({ symbol, start_date, end_date }) => {
    try {
      const sym = symbol.toUpperCase().trim();
      const data = await bridge.getDailyCandles(sym, start_date, end_date);
      
      let summary = null;
      if (data.bars && data.bars.length > 0) {
        const closes = data.bars.map(b => b.close);
        const highs = data.bars.map(b => b.high);
        const lows = data.bars.map(b => b.low);
        const totalNetForeign = data.bars.reduce((acc, b) => acc + (b.net_foreign || 0), 0);
        const firstClose = closes[0];
        const lastClose = closes[closes.length - 1];

        summary = {
          symbol: data.symbol,
          period: `${data.start_date} s/d ${data.end_date}`,
          total_trading_days: data.total_bars,
          first_close: firstClose,
          latest_close: lastClose,
          period_return_percent: (((lastClose - firstClose) / firstClose) * 100).toFixed(2) + '%',
          highest_high: Math.max(...highs),
          lowest_low: Math.min(...lows),
          cumulative_net_foreign_flow: totalNetForeign,
          foreign_stance: totalNetForeign >= 0 ? 'NET ACCUMULATION (Net Buy)' : 'NET DISTRIBUTION (Net Sell)'
        };
      }

      return formatResponse({ summary, bars: data.bars }, 'exodus', { symbol: sym });
    } catch (err) {
      return handleBridgeError(err, 'stockbit_get_chart_data');
    }
  }
);

// 20. Tool: stockbit_get_intraday
server.tool(
  'stockbit_get_intraday',
  'Mengambil data candlestick intraday resolusi tinggi (1 menit atau 60 menit) untuk analisis momentum, chart intraday, dan scalping.',
  {
    symbol: z.string().describe('Kode saham emiten di IDX, contoh: BBCA, ASII'),
    multiplier: z.number().optional().describe('Multiplier menit: 1 untuk candle 1-menit, 60 untuk candle 1-jam (default 1)')
  },
  async ({ symbol, multiplier = 1 }) => {
    try {
      const sym = symbol.toUpperCase().trim();
      const data = await bridge.getIntradayCandles(sym, null, null, multiplier);
      return formatResponse(data, 'exodus', { symbol: sym, multiplier });
    } catch (err) {
      return handleBridgeError(err, 'stockbit_get_intraday');
    }
  }
);

// 21. Tool: stockbit_get_price_performance
server.tool(
  'stockbit_get_price_performance',
  'Mengambil ringkasan performa kenaikan/penurunan harga saham multi-timeframe lengkap: 1 Hari (1D), 1 Minggu (1W), 1 Bulan (1M), 3 Bulan (3M), 6 Bulan (6M), YTD, 1 Tahun (1Y), 3 Tahun (3Y), 5 Tahun (5Y), dan 10 Tahun (10Y) beserta harga Highest dan Lowest di setiap periode.',
  {
    symbol: z.string().describe('Kode saham emiten di IDX, contoh: BBCA, BBRI, TLKM')
  },
  async ({ symbol }) => {
    try {
      const sym = symbol.toUpperCase().trim();
      const data = await bridge.getPricePerformance(sym);
      return formatResponse(data?.data || data, 'exodus', { symbol: sym });
    } catch (err) {
      return handleBridgeError(err, 'stockbit_get_price_performance');
    }
  }
);

// 21b. Tool: stockbit_get_historical_data
server.tool(
  'stockbit_get_historical_data',
  'Mengambil data harga historis tabular lengkap emiten sesuai tab "Historical Data" di Stockbit Desktop: Open, High, Low, Close, Average Price, Change, Change %, Volume (lot), Turnover Value (Rp), Frequency, Foreign Buy (Rp), Foreign Sell (Rp), dan Net Foreign (Rp) per hari bursa.',
  {
    symbol: z.string().describe('Kode saham emiten di IDX, contoh: BBCA, BBRI, BMRI, ASII'),
    page: z.number().optional().describe('Nomor halaman data historis (default 1)'),
    limit: z.number().optional().describe('Jumlah baris per halaman (default 50)')
  },
  async ({ symbol, page = 1, limit = 50 }) => {
    try {
      const sym = symbol.toUpperCase().trim();
      const data = await bridge.getHistoricalData(sym, page, limit);
      return formatResponse(data?.data || data, 'exodus', { symbol: sym, page, limit });
    } catch (err) {
      return handleBridgeError(err, 'stockbit_get_historical_data');
    }
  }
);

// ==========================================
// MODUL 6: FUNDAMENTAL, RASIO & KONSENSUS (EXODUS API)
// ==========================================

// 22. Tool: stockbit_get_keystats
server.tool(
  'stockbit_get_keystats',
  'Mengambil indikator rasio keuangan fundamental lengkap terkini (Key Stats): Valuasi (PE, PBV, PS, PCF, EV/EBITDA, PEG), Per Lembar Saham (EPS TTM, BVPS, Cash/Share, FCF/Share), Solvabilitas (DER, Quick/Current Ratio, Debt/Assets, Altman Z-Score), Profitabilitas (ROE, ROA, ROCE, ROIC), Efektivitas Manajemen (CASA, Asset Turnover), dan Margin (NIM, GPM, OPM, NPM).',
  {
    symbol: z.string().describe('Kode saham emiten di IDX, contoh: BBCA, BBRI, ASII, ICBP')
  },
  async ({ symbol }) => {
    try {
      const sym = symbol.toUpperCase().trim();
      const data = await bridge.getKeyStats(sym);
      return formatResponse(data?.data || data, 'exodus', { symbol: sym });
    } catch (err) {
      return handleBridgeError(err, 'stockbit_get_keystats');
    }
  }
);

// 23. Tool: stockbit_get_keystats_history
server.tool(
  'stockbit_get_keystats_history',
  'Mengambil data historis deret waktu 10 tahun rasio keuangan emiten untuk analisis tren pertumbuhan dan valuasi historis (PE Band, PBV Band, pertumbuhan dividen tahun ke tahun).',
  {
    symbol: z.string().describe('Kode saham emiten di IDX, contoh: BBCA, BBRI, TLKM'),
    year_limit: z.number().optional().describe('Batas jumlah tahun historis (default 10)')
  },
  async ({ symbol, year_limit = 10 }) => {
    try {
      const sym = symbol.toUpperCase().trim();
      const data = await bridge.getKeyStatsHistorical(sym, year_limit);
      return formatResponse(data?.data || data, 'exodus', { symbol: sym, year_limit });
    } catch (err) {
      return handleBridgeError(err, 'stockbit_get_keystats_history');
    }
  }
);

// 24. Tool: stockbit_get_seasonality
server.tool(
  'stockbit_get_seasonality',
  'Mengambil analisis musiman saham (Seasonality) selama 5-10 tahun terakhir: probabilitas kenaikan harga (%) dan rata-rata persentase return di setiap bulan dari Januari sampai Desember.',
  {
    symbol: z.string().describe('Kode saham emiten di IDX, contoh: BBCA, ASII, ANTM'),
    year: z.number().optional().describe('Tahun acuan (default: tahun berjalan)'),
    back_year: z.number().optional().describe('Jumlah tahun ke belakang yang dihitung (default: 5)')
  },
  async ({ symbol, year = new Date().getFullYear(), back_year = 5 }) => {
    try {
      const sym = symbol.toUpperCase().trim();
      const data = await bridge.getSeasonality(sym, year, back_year);
      return formatResponse(data?.data || data, 'exodus', { symbol: sym, year, back_year });
    } catch (err) {
      return handleBridgeError(err, 'stockbit_get_seasonality');
    }
  }
);

// 25. Tool: stockbit_get_analyst_consensus
server.tool(
  'stockbit_get_analyst_consensus',
  'Mengambil konsensus riset analis sekuritas profesional: target harga (Mean, High, Low), rekomendasi agregat (BUY, HOLD, SELL), jumlah analis yang meng-cover, serta perkiraan laba konsensus.',
  {
    symbol: z.string().describe('Kode saham emiten di IDX, contoh: BBCA, BBRI, BMRI, TLKM')
  },
  async ({ symbol }) => {
    try {
      const sym = symbol.toUpperCase().trim();
      const ratings = await bridge.getAnalystRatings(sym);
      const consensus = await bridge.getAnalystConsensus(sym).catch(() => null);
      return formatResponse({
        ratings: ratings?.data || ratings,
        consensus: consensus?.data || consensus
      }, 'exodus', { symbol: sym });
    } catch (err) {
      return handleBridgeError(err, 'stockbit_get_analyst_consensus');
    }
  }
);

// ==========================================
// MODUL 7: PROFIL KORPORAT, INSIDERS & CORP ACTIONS (EXODUS API)
// ==========================================

// 26. Tool: stockbit_get_company_profile
server.tool(
  'stockbit_get_company_profile',
  'Mengambil profil korporasi mendalam: Dewan Direksi (Board of Directors), Dewan Komisaris (Board of Commissioners), Sekretaris Perusahaan, Pemegang Saham >5%, Pemegang Saham 1%, Kepemilikan Saham Direksi, Daftar Anak Perusahaan (Subsidiaries), Pemilik Manfaat Akhir (Beneficial Owner), dan Data Pencatatan IPO (tanggal, underwriter, lembar saham tercatat, sektor & industri).',
  {
    symbol: z.string().describe('Kode saham emiten di IDX, contoh: BBCA, ASII, UNVR')
  },
  async ({ symbol }) => {
    try {
      const sym = symbol.toUpperCase().trim();
      const data = await bridge.getCompanyProfile(sym);
      return formatResponse(data?.data || data, 'exodus', { symbol: sym });
    } catch (err) {
      return handleBridgeError(err, 'stockbit_get_company_profile');
    }
  }
);

// 27. Tool: stockbit_get_insider_transactions
server.tool(
  'stockbit_get_insider_transactions',
  'Mengambil rekaman transaksi orang dalam (Insider Activity) real-time: transaksi jual atau beli saham oleh Direksi, Komisaris, atau Pemegang Saham Pengendali, lengkap dengan nama direktur, jumlah lot, harga pelaksanaan, dan persentase kepemilikan saham sebelum vs sesudah transaksi.',
  {
    symbol: z.string().describe('Kode saham emiten di IDX, contoh: BBCA, BRIS, AMMN'),
    page: z.number().optional().describe('Nomor halaman transaksi (default 1)')
  },
  async ({ symbol, page = 1 }) => {
    try {
      const sym = symbol.toUpperCase().trim();
      const data = await bridge.getInsiderTransactions(sym, page);
      return formatResponse(data?.data || data, 'exodus', { symbol: sym, page });
    } catch (err) {
      return handleBridgeError(err, 'stockbit_get_insider_transactions');
    }
  }
);

// 28. Tool: stockbit_get_shareholder_composition
server.tool(
  'stockbit_get_shareholder_composition',
  'Mengambil komposisi struktur kepemilikan saham emiten (Institusi Asing, Ritel Domestik, Pemerintah, Korporasi) dari waktu ke waktu.',
  {
    symbol: z.string().describe('Kode saham emiten di IDX, contoh: BBCA, BBRI')
  },
  async ({ symbol }) => {
    try {
      const sym = symbol.toUpperCase().trim();
      const data = await bridge.getShareholderComposition(sym);
      return formatResponse(data?.data || data, 'exodus', { symbol: sym });
    } catch (err) {
      return handleBridgeError(err, 'stockbit_get_shareholder_composition');
    }
  }
);

// 29. Tool: stockbit_get_corporate_actions
server.tool(
  'stockbit_get_corporate_actions',
  'Mengambil kalender dan riwayat seluruh aksi korporasi emiten: Dividen tunai (Cum date, Ex date, Recording date, Payment date, Dividen per lembar / DPS), Stock Split / Reverse Split, Rights Issue, Waran, dan jadwal RUPS (Rapat Umum Pemegang Saham) / Public Expose.',
  {
    symbol: z.string().describe('Kode saham emiten di IDX, contoh: BBCA, ASII, ITMG, PTBA')
  },
  async ({ symbol }) => {
    try {
      const sym = symbol.toUpperCase().trim();
      const data = await bridge.getCorporateActions(sym);
      return formatResponse(data?.data || data, 'exodus', { symbol: sym });
    } catch (err) {
      return handleBridgeError(err, 'stockbit_get_corporate_actions');
    }
  }
);

// ==========================================
// MODUL 8: MARKET DISCOVERY, SCREENER & STREAM (EXODUS API)
// ==========================================

// 30. Tool: stockbit_get_market_movers
server.tool(
  'stockbit_get_market_movers',
  'Mengambil daftar saham penggerak pasar bursa IDX: Top Gainer, Top Loser, Most Active by Value, Most Active by Volume, Most Active by Frequency, Top Net Foreign Buy, atau Top Net Foreign Sell.',
  {
    category: z.enum([
      'top_gainer',
      'top_loser',
      'top_volume',
      'top_value',
      'top_frequency',
      'most_active',
      'top_net_foreign_buy',
      'top_net_foreign_sell',
      'net_foreign_buy',
      'net_foreign_sell'
    ]).optional().describe('Kategori mover (default "top_gainer")')
  },
  async ({ category = 'top_gainer' }) => {
    try {
      const data = await bridge.getMarketMovers(category);
      return formatResponse(data?.data || data, 'exodus', { category });
    } catch (err) {
      return handleBridgeError(err, 'stockbit_get_market_movers');
    }
  }
);

// 31. Tool: stockbit_get_top_stocks
server.tool(
  'stockbit_get_top_stocks',
  'Mengambil daftar saham dengan akumulasi nilai transaksi, frekuensi, dan perputaran investor asing terbesar di bursa IDX.',
  {
    type: z.enum(['value', 'volume', 'frequency']).optional().describe('Metrik perangkingan (default "value")')
  },
  async ({ type = 'value' }) => {
    try {
      const data = await bridge.getTopStocks(type);
      return formatResponse(data?.data || data, 'exodus', { type });
    } catch (err) {
      return handleBridgeError(err, 'stockbit_get_top_stocks');
    }
  }
);

// 32. Tool: stockbit_get_screener_presets
server.tool(
  'stockbit_get_screener_presets',
  'Mengambil seluruh katalog template Screener bawaan Stockbit: Guru Screener (Buffettology, Ben Graham Net Nets, CAN-SLIM, Magic Formula, Peter Lynch Growth), Technical Screener (52 Week High Momentum, Golden Cross), dan Bargain/Value Screener.',
  {},
  async () => {
    try {
      const data = await bridge.getScreenerPresets();
      return formatResponse(data?.data || data, 'exodus');
    } catch (err) {
      return handleBridgeError(err, 'stockbit_get_screener_presets');
    }
  }
);

// 33. Tool: stockbit_get_stream
server.tool(
  'stockbit_get_stream',
  'Mengambil postingan diskusi dan sentimen terkini dari komunitas trader & investor Stockbit untuk saham tertentu.',
  {
    symbol: z.string().describe('Kode saham emiten di IDX, contoh: BBCA, GOTO, BREN'),
    limit: z.number().min(1).max(50).optional().describe('Batas jumlah postingan yang diambil (default 20)')
  },
  async ({ symbol, limit = 20 }) => {
    try {
      const sym = symbol.toUpperCase().trim();
      const data = await bridge.getStream(sym, limit);
      return formatResponse(data?.data || data, 'exodus', { symbol: sym, limit });
    } catch (err) {
      return handleBridgeError(err, 'stockbit_get_stream');
    }
  }
);

// 34. Tool: stockbit_get_trending
server.tool(
  'stockbit_get_trending',
  'Mengambil daftar saham yang sedang paling banyak diperbincangkan dan dicari (trending) oleh komunitas trader pasar saat ini.',
  {},
  async () => {
    try {
      const data = await bridge.getTrendingStocks();
      return formatResponse(data?.data || data, 'exodus');
    } catch (err) {
      return handleBridgeError(err, 'stockbit_get_trending');
    }
  }
);

// 35. Tool: stockbit_get_watchlist
server.tool(
  'stockbit_get_watchlist',
  'Mengambil daftar saham yang sedang dipantau di Watchlist pengguna, termasuk harga terkini, perubahan persentase, volume, dan sparkline harga.',
  {
    limit: z.number().min(1).max(100).optional().describe('Jumlah maksimal saham yang ingin diambil (default 50)')
  },
  async ({ limit = 50 }) => {
    try {
      const data = await bridge.getWatchlist(limit);
      return formatResponse(data?.data || data, 'exodus', { limit });
    } catch (err) {
      return handleBridgeError(err, 'stockbit_get_watchlist');
    }
  }
);

// 36. Tool: stockbit_search_emiten
server.tool(
  'stockbit_search_emiten',
  'Mencari kode saham (ticker) dan nama perusahaan di Bursa Efek Indonesia (IDX) berdasarkan kata kunci pencarian.',
  {
    query: z.string().describe('Kata kunci pencarian, contoh: bank, nikel, telko, atau kode saham')
  },
  async ({ query }) => {
    try {
      const data = await bridge.searchEmiten(query);
      return formatResponse(data?.data || data, 'exodus', { query });
    } catch (err) {
      return handleBridgeError(err, 'stockbit_search_emiten');
    }
  }
);

// ==========================================
// MODUL 8: FUNDAMENTAL DEEP DIVE & ANALYSIS
// ==========================================

// 37. Tool: stockbit_get_financials
server.tool(
  'stockbit_get_financials',
  'Mengambil Laporan Keuangan lengkap emiten: Laba Rugi (Income Statement), Neraca (Balance Sheet), atau Arus Kas (Cash Flow) dalam basis Kuartalan (Quarterly), Tahunan (Annual), atau TTM (Trailing Twelve Months) dengan nilai historis lengkap dan nama akun dwibahasa (ID/EN).',
  {
    symbol: z.string().describe('Kode saham IDX, contoh: BBCA, TLKM, ASII'),
    statement_type: z.enum(['income_statement', 'balance_sheet', 'cash_flow']).optional().default('income_statement').describe('Jenis laporan keuangan: income_statement (Laba Rugi), balance_sheet (Neraca), atau cash_flow (Arus Kas)'),
    report_type: z.enum(['quarterly', 'annual', 'ttm']).optional().default('quarterly').describe('Frekuensi periode pelaporan: quarterly (kuartalan), annual (tahunan), atau ttm (trailing twelve months)'),
    limit: z.number().min(1).max(74).optional().default(12).describe('Jumlah periode kuartal/tahun terbaru yang ingin diambil (default 12 periode)')
  },
  async ({ symbol, statement_type = 'income_statement', report_type = 'quarterly', limit = 12 }) => {
    try {
      const sym = symbol.toUpperCase().trim();
      const data = await bridge.getFinancials(sym, statement_type, report_type, limit);
      return formatResponse(data, 'exodus', { symbol: sym, statement_type, report_type, limit });
    } catch (err) {
      return handleBridgeError(err, 'stockbit_get_financials');
    }
  }
);

// 38. Tool: stockbit_get_comparison
server.tool(
  'stockbit_get_comparison',
  'Mengambil perbandingan komprehensif emiten terhadap peers kompetitor langsung di sektor/subsektor yang sama, rasio valuasi & efisiensi perbandingan, serta nilai rata-rata industri dan sektor.',
  {
    symbol: z.string().describe('Kode saham IDX, contoh: BBCA, BBRI, ASII'),
    include_peers: z.boolean().optional().default(true).describe('Sertakan nilai rasio kompetitor utama untuk tabel komparasi berdampingan')
  },
  async ({ symbol, include_peers = true }) => {
    try {
      const sym = symbol.toUpperCase().trim();
      const data = await bridge.getComparison(sym, include_peers);
      return formatResponse(data, 'exodus', { symbol: sym, include_peers });
    } catch (err) {
      return handleBridgeError(err, 'stockbit_get_comparison');
    }
  }
);

// 39. Tool: stockbit_get_analysis
server.tool(
  'stockbit_get_analysis',
  'Mengambil analisis konsensus analis pasar lengkap: target harga saham (median/best, high, low), potensi kenaikan (upside %), rekomendasi konsensus (Buy/Hold/Sell), serta perkiraan pertumbuhan kinerja keuangan (EPS, Revenue, Net Income).',
  {
    symbol: z.string().describe('Kode saham IDX, contoh: BBCA, TLKM, BMRI')
  },
  async ({ symbol }) => {
    try {
      const sym = symbol.toUpperCase().trim();
      const data = await bridge.getAnalystAnalysis(sym);
      return formatResponse(data, 'exodus', { symbol: sym });
    } catch (err) {
      return handleBridgeError(err, 'stockbit_get_analysis');
    }
  }
);

// 40. Tool: stockbit_get_chartbit
server.tool(
  'stockbit_get_chartbit',
  'Mengambil data candlestick Chartbit LENGKAP untuk SEMUA timeframe: Menit (1m, 3m, 5m, 10m, 15m, 30m, 45m), Jam (1h, 2h, 3h, 4h), dan Hari/Minggu/Bulan (1D, 1W, 1M). Setiap bar memuat Open, High, Low, Close, Volume, Lot, Turnover Value, Frekuensi, serta Foreign Buy, Foreign Sell, dan Net Foreign flow kumulatif.',
  {
    symbol: z.string().describe('Kode saham IDX, contoh: BBCA, BBRI, ASII, TLKM'),
    timeframe: z.enum(['1m', '3m', '5m', '10m', '15m', '30m', '45m', '1h', '2h', '3h', '4h', '1D', '1W', '1M']).optional().default('1D').describe('Resolusi waktu candle: 1m s/d 45m (menit), 1h s/d 4h (jam), 1D (harian), 1W (mingguan), 1M (bulanan)'),
    range: z.enum(['1D', '5D', '1M', '3M', '6M', '1Y', '3Y', '5Y', 'MAX']).optional().describe('Preset rentang waktu historis (opsional, otomatis disesuaikan dengan timeframe jika kosong)'),
    from: z.string().optional().describe('Tanggal awal YYYY-MM-DD atau unix timestamp detik (opsional)'),
    to: z.string().optional().describe('Tanggal akhir YYYY-MM-DD atau unix timestamp detik (opsional)')
  },
  async ({ symbol, timeframe = '1D', range, from, to }) => {
    try {
      const sym = symbol.toUpperCase().trim();
      const data = await bridge.getChartbit(sym, { timeframe, range, from, to });
      return formatResponse(data, 'exodus', { symbol: sym, timeframe, range });
    } catch (err) {
      return handleBridgeError(err, 'stockbit_get_chartbit');
    }
  }
);

// ==========================================
// MODUL 10: ALAT TAMBAHAN, NOTIFIKASI & OBLIGASI (EXODUS & CARINA)
// ==========================================

// 41. Tool: stockbit_get_order_queue
server.tool(
  'stockbit_get_order_queue',
  'Mengambil antrean order bursa pengguna (Order Queue) pada level harga tertentu untuk saham IDX spesifik: nomor antrean, rincian order, dan status sesi pasar.',
  {
    symbol: z.string().describe('Kode saham emiten di IDX, contoh: BBCA, BBRI, ASII')
  },
  async ({ symbol }) => {
    try {
      const sym = symbol.toUpperCase().trim();
      const data = await bridge.getOrderQueue(sym);
      return formatResponse(data?.data || data, 'exodus', { symbol: sym });
    } catch (err) {
      return handleBridgeError(err, 'stockbit_get_order_queue');
    }
  }
);

// 42. Tool: stockbit_get_price_alerts
server.tool(
  'stockbit_get_price_alerts',
  'Mengambil daftar seluruh alert dan pengingat target harga (Price Alerts) yang sedang aktif atau pernah dipasang oleh pengguna di Stockbit.',
  {},
  async () => {
    try {
      const data = await bridge.getPriceAlerts();
      return formatResponse(data?.data || data, 'exodus');
    } catch (err) {
      return handleBridgeError(err, 'stockbit_get_price_alerts');
    }
  }
);

// 43. Tool: stockbit_get_chart_layouts
server.tool(
  'stockbit_get_chart_layouts',
  'Mengambil daftar layout chart TradingView Stockbit yang disimpan pengguna: nama layout chart, simbol emiten acuan, resolusi waktu candle, dan tanggal modifikasi.',
  {},
  async () => {
    try {
      const data = await bridge.getChartLayouts();
      return formatResponse(data?.data || data, 'exodus');
    } catch (err) {
      return handleBridgeError(err, 'stockbit_get_chart_layouts');
    }
  }
);

// 44. Tool: stockbit_get_bond_portfolio
server.tool(
  'stockbit_get_bond_portfolio',
  'Mengambil portofolio investasi Obligasi dan Surat Berharga Negara (SBN seperti ORI, SR, FR, PBS) di akun sekuritas: modal terinvestasi, nilai pasar, kupon bunga berjalan (accrued interest), dan proyeksi return.',
  {},
  async () => {
    try {
      const data = await bridge.getBondPortfolio();
      return formatResponse(data?.data || data, 'carina');
    } catch (err) {
      return handleBridgeError(err, 'stockbit_get_bond_portfolio');
    }
  }
);

// 45. Tool: stockbit_get_notifications
server.tool(
  'stockbit_get_notifications',
  'Mengambil feed notifikasi akun bursa: dividen masuk, matched order, post alerts dari investor yang diikuti, serta jumlah total notifikasi yang belum dibaca (unread count).',
  {
    limit: z.number().optional().describe('Jumlah notifikasi yang ingin diambil (default 20)')
  },
  async ({ limit = 20 }) => {
    try {
      const data = await bridge.getNotifications(limit);
      return formatResponse(data, 'exodus', { limit });
    } catch (err) {
      return handleBridgeError(err, 'stockbit_get_notifications');
    }
  }
);

// Connect Stdio Transport
const transport = new StdioServerTransport();
await server.connect(transport);
console.error('Stockbit MCP Server v2.3 (45 tools) running on stdio');



