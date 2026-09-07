#!/usr/bin/env node
// src/server.mjs
// Local Dashboard & REST Server for Stockbit Data

import http from 'http';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { StockbitBridge } from './stockbitBridge.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DASHBOARD_DIR = path.join(__dirname, '..', 'dashboard');

const bridge = new StockbitBridge();
const PORT = process.env.PORT || 3030;

/**
 * Mematikan proses yang sedang menduduki port tertentu
 * @param {number} port 
 */
export function freePort(port) {
  try {
    if (process.platform === 'win32') {
      const output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
      const lines = output.trim().split('\n');
      const pids = new Set();
      for (const line of lines) {
        if (line.includes('LISTENING')) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && pid !== '0' && Number(pid) !== process.pid) {
            pids.add(pid);
          }
        }
      }
      for (const pid of pids) {
        try {
          console.log(`[Auto-Kill] Menghentikan proses PID ${pid} pada port ${port}...`);
          execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
        } catch {}
      }
    } else {
      execSync(`fuser -k ${port}/tcp`, { stdio: 'ignore' });
    }
  } catch {}
}

// Jika dijalankan dengan flag --kill atau --free-port
if (process.argv.includes('--kill') || process.argv.includes('--free-port')) {
  console.log(`Mengosongkan port ${PORT}...`);
  freePort(PORT);
  console.log(`Port ${PORT} siap digunakan.`);
  process.exit(0);
}


const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const apiCache = new Map();
function getCached(key, ttlMs) {
  const item = apiCache.get(key);
  if (item && (Date.now() - item.ts < ttlMs)) {
    return item.data;
  }
  return null;
}
function setCached(key, data) {
  if (data) apiCache.set(key, { data, ts: Date.now() });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API Endpoints
  if (pathname.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json');
    try {
      if (pathname === '/api/status') {
        const isRunning = await bridge.isAppRunning();
        res.writeHead(200);
        res.end(JSON.stringify({ status: isRunning ? 'connected' : 'disconnected' }));
        return;
      }

      if (pathname === '/api/user' || pathname === '/api/profile') {
        const user = await bridge.getUserProfile();
        res.writeHead(200);
        res.end(JSON.stringify(user || {}));
        return;
      }

      if (pathname === '/api/bank') {
        const bank = await bridge.getBankDetail();
        res.writeHead(200);
        res.end(JSON.stringify(bank.data || {}));
        return;
      }

      if (pathname === '/api/portfolio') {
        const porto = await bridge.getPortfolio();
        res.writeHead(200);
        res.end(JSON.stringify(porto.data || {}));
        return;
      }

      if (pathname === '/api/watchlist') {
        const limit = parseInt(url.searchParams.get('limit') || '50', 10);
        const wl = await bridge.getWatchlist(limit);
        res.writeHead(200);
        res.end(JSON.stringify(wl.data || {}));
        return;
      }

      if (pathname === '/api/company-info' || pathname === '/api/quote') {
        const symbol = (url.searchParams.get('symbol') || 'BBCA').toUpperCase();
        const cacheKey = `info_${symbol}`;
        let data = getCached(cacheKey, 60000);
        if (!data) {
          const info = await bridge.getCompanyInfo(symbol);
          data = info.data || {};
          setCached(cacheKey, data);
        }
        res.writeHead(200);
        res.end(JSON.stringify(data));
        return;
      }

      if (pathname === '/api/keystats') {
        const symbol = (url.searchParams.get('symbol') || 'BBCA').toUpperCase();
        const cacheKey = `keystats_${symbol}`;
        let data = getCached(cacheKey, 60000);
        if (!data) {
          const keystats = await bridge.getKeyStats(symbol);
          data = keystats.data || {};
          setCached(cacheKey, data);
        }
        res.writeHead(200);
        res.end(JSON.stringify(data));
        return;
      }

      if (pathname === '/api/orderbook') {
        const symbol = url.searchParams.get('symbol') || 'BBCA';
        const ob = await bridge.getOrderbook(symbol);
        res.writeHead(200);
        res.end(JSON.stringify(ob.data || {}));
        return;
      }

      if (pathname === '/api/broker-summary') {
        const symbol = url.searchParams.get('symbol') || 'BBCA';
        const bs = await bridge.getBrokerDistribution(symbol);
        res.writeHead(200);
        res.end(JSON.stringify(bs.data || {}));
        return;
      }

      if (pathname === '/api/running-trade') {
        const limit = parseInt(url.searchParams.get('limit') || '80', 10);
        const symbol = url.searchParams.get('symbol') || null;
        const actionType = url.searchParams.get('action_type') || 'ALL';
        const marketBoard = url.searchParams.get('market_board') || 'ALL';
        const rt = await bridge.getRunningTrade(limit, symbol, actionType, marketBoard);
        res.writeHead(200);
        res.end(JSON.stringify(rt.data || {}));
        return;
      }

      if (pathname === '/api/trending') {
        const tr = await bridge.getTrendingStocks();
        res.writeHead(200);
        res.end(JSON.stringify(tr.data || []));
        return;
      }

      if (pathname === '/api/orders') {
        const orders = await bridge.getOrders();
        res.writeHead(200);
        res.end(JSON.stringify(orders.data || []));
        return;
      }

      if (pathname === '/api/order-history') {
        const page = parseInt(url.searchParams.get('page') || '1', 10);
        const limit = parseInt(url.searchParams.get('limit') || '100', 10);
        const period = url.searchParams.get('period') || 'all';
        const hist = await bridge.getOrderHistory(page, limit, period);
        res.writeHead(200);
        res.end(JSON.stringify(hist.data || {}));
        return;
      }

      if (pathname === '/api/market-session') {
        const ms = await bridge.getMarketSession();
        res.writeHead(200);
        res.end(JSON.stringify(ms.data || {}));
        return;
      }

      if (pathname === '/api/chart') {
        const symbol = url.searchParams.get('symbol') || 'BBCA';
        const from = url.searchParams.get('from') || '';
        const to = url.searchParams.get('to') || '';
        const chartData = await bridge.getDailyCandles(symbol, from, to);
        res.writeHead(200);
        res.end(JSON.stringify(chartData));
        return;
      }

      if (pathname === '/api/intraday') {
        const symbol = url.searchParams.get('symbol') || 'BBCA';
        const from = parseInt(url.searchParams.get('from') || '0', 10) || undefined;
        const to = parseInt(url.searchParams.get('to') || '0', 10) || undefined;
        const multiplier = parseInt(url.searchParams.get('multiplier') || '1', 10);
        const data = await bridge.getIntradayCandles(symbol, from, to, multiplier);
        res.writeHead(200);
        res.end(JSON.stringify(data));
        return;
      }

      if (pathname === '/api/search') {
        const q = url.searchParams.get('q') || '';
        const searchResults = await bridge.searchEmiten(q);
        res.writeHead(200);
        res.end(JSON.stringify(searchResults.data || []));
        return;
      }

      if (pathname === '/api/sub-accounts') {
        const sa = await bridge.getSubAccounts();
        res.writeHead(200);
        res.end(JSON.stringify(sa.data || {}));
        return;
      }

      if (pathname === '/api/portfolio-performance') {
        const perf = await bridge.getPortfolioPerformance();
        res.writeHead(200);
        res.end(JSON.stringify(perf.data || {}));
        return;
      }

      if (pathname === '/api/portfolio-returns') {
        const ret = await bridge.getPortfolioReturns();
        res.writeHead(200);
        res.end(JSON.stringify(ret.data || {}));
        return;
      }

      if (pathname === '/api/tradebook') {
        const symbol = url.searchParams.get('symbol') || 'BBCA';
        const tb = await bridge.getTradebook(symbol);
        res.writeHead(200);
        res.end(JSON.stringify(tb.data || {}));
        return;
      }

      if (pathname === '/api/trade-flow') {
        const symbol = url.searchParams.get('symbol') || 'BBCA';
        const interval = url.searchParams.get('interval') || '1m';
        const tf = await bridge.getTradeFlow(symbol, interval);
        res.writeHead(200);
        res.end(JSON.stringify(tf));
        return;
      }

      if (pathname === '/api/broker-flow') {
        const brokerCode = url.searchParams.get('broker') || url.searchParams.get('broker_code') || 'YU';
        const bf = await bridge.getBrokerFlow(brokerCode);
        res.writeHead(200);
        res.end(JSON.stringify(bf));
        return;
      }

      if (pathname === '/api/broker-summary') {
        const symbol = url.searchParams.get('symbol') || 'BBCA';
        const fromDate = url.searchParams.get('from') || null;
        const toDate = url.searchParams.get('to') || null;
        const bs = await bridge.getBrokerSummary(symbol, fromDate, toDate);
        res.writeHead(200);
        res.end(JSON.stringify(bs));
        return;
      }

      if (pathname === '/api/broker-distribution') {
        const symbol = url.searchParams.get('symbol') || 'BBCA';
        const bd = await bridge.getBrokerDistribution(symbol);
        res.writeHead(200);
        res.end(JSON.stringify(bd.data || bd));
        return;
      }

      if (pathname === '/api/foreign-flow') {
        const symbol = url.searchParams.get('symbol') || 'BBCA';
        const days = parseInt(url.searchParams.get('days') || '30', 10);
        const ff = await bridge.getForeignFlow(symbol, days);
        res.writeHead(200);
        res.end(JSON.stringify(ff));
        return;
      }

      if (pathname === '/api/historical-data') {
        const symbol = url.searchParams.get('symbol') || 'BBCA';
        const page = parseInt(url.searchParams.get('page') || '1', 10);
        const limit = parseInt(url.searchParams.get('limit') || '50', 10);
        const hd = await bridge.getHistoricalData(symbol, page, limit);
        res.writeHead(200);
        res.end(JSON.stringify(hd.data || hd));
        return;
      }

      if (pathname === '/api/bandar-detector') {
        const symbol = url.searchParams.get('symbol') || 'BBCA';
        const fromDate = url.searchParams.get('from') || null;
        const toDate = url.searchParams.get('to') || null;
        const bd = await bridge.getBandarDetector(symbol, fromDate, toDate);
        res.writeHead(200);
        res.end(JSON.stringify(bd.data || {}));
        return;
      }

      if (pathname === '/api/broker-activity-historical') {
        const symbol = url.searchParams.get('symbol') || 'BBCA';
        const fromDate = url.searchParams.get('from') || '2024-08-01';
        const toDate = url.searchParams.get('to') || '2024-08-30';
        const bah = await bridge.getBrokerActivityHistorical(symbol, fromDate, toDate);
        res.writeHead(200);
        res.end(JSON.stringify(bah.data || {}));
        return;
      }

      if (pathname === '/api/foreign-domestic-flow') {
        const symbol = url.searchParams.get('symbol') || 'BBCA';
        const fdf = await bridge.getForeignDomesticFlow(symbol);
        res.writeHead(200);
        res.end(JSON.stringify(fdf.data || {}));
        return;
      }

      if (pathname === '/api/broker-list') {
        const limit = parseInt(url.searchParams.get('limit') || '100', 10);
        const page = parseInt(url.searchParams.get('page') || '1', 10);
        const bl = await bridge.getBrokerList(limit, page);
        res.writeHead(200);
        res.end(JSON.stringify(bl.data || {}));
        return;
      }

      if (pathname === '/api/top-brokers') {
        const symbol = url.searchParams.get('symbol') || 'BBCA';
        const tb = await bridge.getTopBrokers(symbol);
        res.writeHead(200);
        res.end(JSON.stringify(tb.data || {}));
        return;
      }

      if (pathname === '/api/price-performance') {
        const symbol = url.searchParams.get('symbol') || 'BBCA';
        const pp = await bridge.getPricePerformance(symbol);
        res.writeHead(200);
        res.end(JSON.stringify(pp.data || {}));
        return;
      }

      if (pathname === '/api/seasonality') {
        const symbol = url.searchParams.get('symbol') || 'BBCA';
        const year = parseInt(url.searchParams.get('year') || String(new Date().getFullYear()), 10);
        const backYear = parseInt(url.searchParams.get('back_year') || '5', 10);
        const seas = await bridge.getSeasonality(symbol, year, backYear);
        res.writeHead(200);
        res.end(JSON.stringify(seas.data || {}));
        return;
      }

      if (pathname === '/api/analyst-consensus') {
        const symbol = url.searchParams.get('symbol') || 'BBCA';
        const ratings = await bridge.getAnalystRatings(symbol);
        const consensus = await bridge.getAnalystConsensus(symbol).catch(() => null);
        res.writeHead(200);
        res.end(JSON.stringify({ ratings: ratings?.data || ratings, consensus: consensus?.data || consensus }));
        return;
      }

      if (pathname === '/api/company-profile') {
        const symbol = url.searchParams.get('symbol') || 'BBCA';
        const profile = await bridge.getCompanyProfile(symbol);
        res.writeHead(200);
        res.end(JSON.stringify(profile.data || {}));
        return;
      }

      if (pathname === '/api/insiders') {
        const symbol = url.searchParams.get('symbol') || 'BBCA';
        const page = parseInt(url.searchParams.get('page') || '1', 10);
        const ins = await bridge.getInsiderTransactions(symbol, page);
        res.writeHead(200);
        res.end(JSON.stringify(ins.data || {}));
        return;
      }

      if (pathname === '/api/shareholder-composition') {
        const symbol = url.searchParams.get('symbol') || 'BBCA';
        const sc = await bridge.getShareholderComposition(symbol);
        res.writeHead(200);
        res.end(JSON.stringify(sc.data || {}));
        return;
      }

      if (pathname === '/api/corporate-actions') {
        const symbol = url.searchParams.get('symbol') || 'BBCA';
        const ca = await bridge.getCorporateActions(symbol);
        res.writeHead(200);
        res.end(JSON.stringify(ca.data || {}));
        return;
      }

      if (pathname === '/api/market-movers') {
        const category = url.searchParams.get('category') || 'top_gainer';
        const mm = await bridge.getMarketMovers(category);
        res.writeHead(200);
        res.end(JSON.stringify(mm.data || {}));
        return;
      }

      if (pathname === '/api/top-stocks') {
        const type = url.searchParams.get('type') || 'value';
        const ts = await bridge.getTopStocks(type);
        res.writeHead(200);
        res.end(JSON.stringify(ts.data || {}));
        return;
      }

      if (pathname === '/api/screener-presets') {
        const sp = await bridge.getScreenerPresets();
        res.writeHead(200);
        res.end(JSON.stringify(sp.data || {}));
        return;
      }

      if (pathname === '/api/stream') {
        const symbol = url.searchParams.get('symbol') || 'BBCA';
        const limit = parseInt(url.searchParams.get('limit') || '20', 10);
        const st = await bridge.getStream(symbol, limit);
        res.writeHead(200);
        res.end(JSON.stringify(st.data || {}));
        return;
      }

      if (pathname === '/api/keystats-history') {
        const symbol = url.searchParams.get('symbol') || 'BBCA';
        const yearLimit = parseInt(url.searchParams.get('year_limit') || '10', 10);
        const kh = await bridge.getKeyStatsHistorical(symbol, yearLimit);
        res.writeHead(200);
        res.end(JSON.stringify(kh.data || {}));
        return;
      }

      if (pathname === '/api/financials') {
        const symbol = url.searchParams.get('symbol') || 'BBCA';
        const statementType = url.searchParams.get('statement_type') || 'income_statement';
        const reportType = url.searchParams.get('report_type') || 'quarterly';
        const limit = parseInt(url.searchParams.get('limit') || '12', 10);
        const data = await bridge.getFinancials(symbol, statementType, reportType, limit);
        res.writeHead(200);
        res.end(JSON.stringify(data));
        return;
      }

      if (pathname === '/api/comparison') {
        const symbol = url.searchParams.get('symbol') || 'BBCA';
        const includePeers = url.searchParams.get('include_peers') !== 'false';
        const data = await bridge.getComparison(symbol, includePeers);
        res.writeHead(200);
        res.end(JSON.stringify(data));
        return;
      }

      if (pathname === '/api/analysis') {
        const symbol = url.searchParams.get('symbol') || 'BBCA';
        const data = await bridge.getAnalystAnalysis(symbol);
        res.writeHead(200);
        res.end(JSON.stringify(data));
        return;
      }

      if (pathname === '/api/chartbit') {
        const symbol = url.searchParams.get('symbol') || 'BBCA';
        const timeframe = url.searchParams.get('timeframe') || '1D';
        const range = url.searchParams.get('range') || undefined;
        const from = url.searchParams.get('from') || undefined;
        const to = url.searchParams.get('to') || undefined;
        const data = await bridge.getChartbit(symbol, { timeframe, range, from, to });
        res.writeHead(200);
        res.end(JSON.stringify(data));
        return;
      }

      if (pathname === '/api/order-queue') {
        const symbol = url.searchParams.get('symbol') || 'BBCA';
        const data = await bridge.getOrderQueue(symbol);
        res.writeHead(200);
        res.end(JSON.stringify(data));
        return;
      }

      if (pathname === '/api/alerts') {
        const data = await bridge.getPriceAlerts();
        res.writeHead(200);
        res.end(JSON.stringify(data));
        return;
      }

      if (pathname === '/api/chart-layouts') {
        const data = await bridge.getChartLayouts();
        res.writeHead(200);
        res.end(JSON.stringify(data));
        return;
      }

      if (pathname === '/api/bonds') {
        const data = await bridge.getBondPortfolio();
        res.writeHead(200);
        res.end(JSON.stringify(data));
        return;
      }

      if (pathname === '/api/notifications') {
        const limit = parseInt(url.searchParams.get('limit') || '20', 10);
        const data = await bridge.getNotifications(limit);
        res.writeHead(200);
        res.end(JSON.stringify(data));
        return;
      }


      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Endpoint not found' }));
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Static File Serving
  let filePath = path.join(DASHBOARD_DIR, pathname === '/' ? 'index.html' : pathname);
  const ext = path.extname(filePath).toLowerCase();

  try {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const content = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'text/plain' });
      res.end(content);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
    }
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('500 Server Error');
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`\n⚠️  Port ${PORT} sedang digunakan oleh proses lain.`);
    console.log(`🔄 Menghentikan proses lama pada port ${PORT} dan merestart...`);
    freePort(PORT);
    setTimeout(() => {
      server.listen(PORT, '0.0.0.0', () => {
        console.log(`\n======================================================`);
        console.log(` STOCKBIT CUSTOM DASHBOARD & API SERVER`);
        console.log(` Running at: http://localhost:${PORT}`);
        console.log(` MCP Endpoint available via stdio (npm run mcp)`);
        console.log(`======================================================\n`);
      });
    }, 1000);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(` STOCKBIT CUSTOM DASHBOARD & API SERVER`);
  console.log(` Running at: http://localhost:${PORT}`);
  console.log(` MCP Endpoint available via stdio (npm run mcp)`);
  console.log(`======================================================\n`);
});

