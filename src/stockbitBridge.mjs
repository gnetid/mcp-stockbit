// src/stockbitBridge.mjs
// Core CDP and API Bridge for Stockbit Desktop (Tauri v2 + WebView2)
// macOS: build Stockbit (Tauri v2 + WKWebView) tidak punya port CDP 9222.
// Token sesi disimpan WKWebView di disk -> dibaca native lalu REST dipanggil langsung.

import { WebSocket } from 'ws';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// ---- macOS native session support ----

function findMacLocalStorageDb() {
  if (process.platform !== 'darwin') return null;
  const webKitRoot = path.join(os.homedir(), 'Library', 'WebKit');
  let rootEntries = [];
  try { rootEntries = fs.readdirSync(webKitRoot, { withFileTypes: true }); } catch { return null; }
  for (const rootEntry of rootEntries) {
    if (!rootEntry.isDirectory() || !rootEntry.name.startsWith('com.stockbit')) continue;
    const websiteData = path.join(webKitRoot, rootEntry.name, 'WebsiteData');
    const hits = [];
    try {
      const walk = (dir) => {
        for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
          const p = path.join(dir, ent.name);
          if (ent.isDirectory()) walk(p);
          else if (ent.name === 'localstorage.sqlite3') hits.push(p);
        }
      };
      walk(websiteData);
    } catch { /* folder tak terbaca -> lewati */ }
    if (hits.length > 0) return hits[0];
  }
  return null;
}

let macDbCache = null;
function getMacStorageDb() {
  if (process.platform !== 'darwin') return null;
  if (macDbCache !== null) return macDbCache;
  macDbCache = findMacLocalStorageDb();
  return macDbCache;
}

function decodeB64Token(val) {
  if (!val) return null;
  try { return Buffer.from(val, 'base64').toString('utf8'); } catch { return val; }
}

export class StockbitBridge {
  constructor(port = process.env.STOCKBIT_PORT || 9222) {
    this.port = Number(port);
    this.cdpUrl = `http://127.0.0.1:${this.port}`;
    this.ws = null;
    this.msgId = 1;
    this.pendingCommands = new Map();
    this.userCache = null;
  }

  /** macOS native mode: token dibaca dari localStorage WKWebView di disk */
  isMacNative() {
    return process.platform === 'darwin' && Boolean(getMacStorageDb());
  }

  /** Baca token sesi dari disk (mode macOS). Mirip bentuk getTokens() CDP. */
  readTokensFromDisk() {
    const dbPath = getMacStorageDb();
    if (!dbPath) {
      throw new Error('Penyimpanan sesi Stockbit (WKWebView localStorage) tidak ditemukan. Buka aplikasi Stockbit dan login terlebih dahulu.');
    }
    const db = new DatabaseSync(dbPath, { readOnly: true });
    try {
      const rows = db.prepare('SELECT key, value FROM ItemTable WHERE key IN (?, ?, ?, ?, ?)')
        .all('at', 'ats', 'au', 'tan', 'ate');
      const map = new Map(rows.map(r => [r.key, Buffer.from(r.value).toString('utf8')]));
      const auRaw = decodeB64Token(map.get('au'));
      return {
        at: decodeB64Token(map.get('at')),
        ats: decodeB64Token(map.get('ats')),
        au: auRaw ? JSON.parse(auRaw) : null,
        tan: decodeB64Token(map.get('tan')),
        ate: decodeB64Token(map.get('ate'))
      };
    } finally {
      db.close();
    }
  }

  async isAppRunning() {
    // Mode macOS: tidak ada CDP; app dianggap running bila sesi tersimpan ada.
    if (this.isMacNative()) {
      try {
        const tokens = this.readTokensFromDisk();
        return Boolean(tokens.at || tokens.ats);
      } catch {
        return false;
      }
    }
    try {
      const targets = await this.getTargets();
      const mainTarget = targets.find(t => 
        (t.title && t.title.toLowerCase().includes('stockbit')) ||
        (t.url && (t.url.includes('/main') || t.url.includes('tauri.localhost') || t.url.includes('stockbit')))
      );
      return Boolean(mainTarget);
    } catch {
      return false;
    }
  }

  async getTargets() {
    const candidates = [
      `http://[::1]:${this.port}`,
      `http://127.0.0.1:${this.port}`,
      `http://localhost:${this.port}`
    ];

    // Priority 1: Check which endpoint has an actual Stockbit page
    for (const url of candidates) {
      try {
        const res = await fetch(`${url}/json`, { signal: AbortSignal.timeout(1500) });
        if (res.ok) {
          const targets = await res.json();
          if (Array.isArray(targets)) {
            const hasStockbit = targets.some(t => 
              (t.title && t.title.toLowerCase().includes('stockbit')) ||
              (t.url && (t.url.includes('/main') || t.url.includes('tauri.localhost') || t.url.includes('stockbit')))
            );
            if (hasStockbit) {
              this.cdpUrl = url;
              return targets;
            }
          }
        }
      } catch {}
    }

    // Priority 2: Fallback to any reachable CDP endpoint
    for (const url of candidates) {
      try {
        const res = await fetch(`${url}/json`, { signal: AbortSignal.timeout(1500) });
        if (res.ok) {
          this.cdpUrl = url;
          return await res.json();
        }
      } catch {}
    }

    throw new Error(`Failed to fetch targets from port ${this.port} (tried [::1], 127.0.0.1, localhost)`);
  }

  async ensureConnected() {
    // Mode macOS: tanpa CDP, tidak ada WebSocket yang perlu dihubungkan.
    if (this.isMacNative()) {
      this.readTokensFromDisk(); // memastikan sesi ada; melempar bila tidak
      return;
    }
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    // Clean up any stale connection
    if (this.ws) {
      try { this.ws.terminate(); } catch {}
      this.ws = null;
    }

    const targets = await this.getTargets();
    const mainTarget = targets.find(t => t.url && t.url.includes('/main')) ||
      targets.find(t => t.title === 'Stockbit') ||
      targets.find(t => t.url && (t.url.includes('tauri.localhost') || t.url.includes('stockbit')));
    if (!mainTarget) {
      throw new Error('Stockbit main page not found in running WebView2 targets.');
    }

    return new Promise((resolve, reject) => {
      let settled = false;
      const ws = new WebSocket(mainTarget.webSocketDebuggerUrl);

      ws.on('open', () => {
        this.ws = ws;
        settled = true;
        resolve();
      });

      ws.on('message', (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.id && this.pendingCommands.has(parsed.id)) {
            const { resolve, reject } = this.pendingCommands.get(parsed.id);
            this.pendingCommands.delete(parsed.id);
            if (parsed.error) reject(parsed.error);
            else resolve(parsed.result);
          }
        } catch (err) {}
      });

      ws.on('error', (err) => {
        console.error('[Bridge WS Error]:', err.message);
        if (!settled) {
          settled = true;
          reject(err);
        }
        this.cleanupPending(err);
      });

      ws.on('close', () => {
        this.ws = null;
        this.cleanupPending(new Error('WebSocket connection closed'));
      });
    });
  }

  cleanupPending(err) {
    for (const [id, { reject }] of this.pendingCommands.entries()) {
      reject(err);
    }
    this.pendingCommands.clear();
  }

  sendCommand(method, params = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        await this.ensureConnected();
        const id = this.msgId++;
        
        // Command timeout safety (10 seconds)
        const timeout = setTimeout(() => {
          if (this.pendingCommands.has(id)) {
            this.pendingCommands.delete(id);
            reject(new Error(`CDP command ${method} timed out after 10s`));
          }
        }, 10000);

        this.pendingCommands.set(id, {
          resolve: (res) => { clearTimeout(timeout); resolve(res); },
          reject: (err) => { clearTimeout(timeout); reject(err); }
        });

        this.ws.send(JSON.stringify({ id, method, params }));
      } catch (err) {
        reject(err);
      }
    });
  }

  async evaluateInPage(expression) {
    const res = await this.sendCommand('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true
    });
    if (res && res.exceptionDetails) {
      throw new Error(`Evaluation failed: ${res.exceptionDetails.text || JSON.stringify(res.exceptionDetails)}`);
    }
    return res && res.result ? res.result.value : null;
  }

  async getTokens() {
    // Mode macOS: token dibaca langsung dari disk localStorage WKWebView.
    if (this.isMacNative()) {
      return this.readTokensFromDisk();
    }
    const raw = await this.evaluateInPage(`
      JSON.stringify({
        at: localStorage.getItem('at'),
        ats: localStorage.getItem('ats'),
        au: localStorage.getItem('au'),
        tan: localStorage.getItem('tan')
      })
    `);
    const parsed = JSON.parse(raw);
    const decodeB64 = (val) => {
      if (!val) return null;
      try { return Buffer.from(val, 'base64').toString('utf8'); } catch { return val; }
    };

    return {
      at: decodeB64(parsed.at),
      ats: decodeB64(parsed.ats),
      au: parsed.au ? JSON.parse(decodeB64(parsed.au)) : null,
      tan: decodeB64(parsed.tan)
    };
  }

  /** Panggil REST API Stockbit langsung dari Node (mode macOS, tanpa CDP). */
  async fetchStockbitApiNative(url, tokenType = 'at') {
    const tokens = this.readTokensFromDisk();
    const token = tokens[tokenType];
    if (!token) {
      throw new Error(`Token '${tokenType}' tidak tersedia pada build Stockbit macOS. Terminal perintah ini hanya tersedia di Windows (WebView2).`);
    }
    let res;
    try {
      res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Platform': 'desktop',
          'X-AppVersion': '2.2.0',
          'Accept': 'application/json, text/plain, */*'
        },
        signal: AbortSignal.timeout(20000)
      });
    } catch (err) {
      throw new Error(`Stockbit API request failed [NET]: ${err.message}`);
    }
    let data = null;
    try { data = await res.json(); } catch { data = await res.text(); }
    if (!res.ok) {
      const errDetail = typeof data === 'object' ? JSON.stringify(data) : (data || 'No response');
      throw new Error(`Stockbit API request failed [${res.status}]: ${errDetail}`);
    }
    return data;
  }

  async fetchStockbitApi(url, tokenType = 'at') {
    // Mode macOS: tidak ada CDP; REST dipanggil langsung dari Node.
    if (this.isMacNative()) {
      return this.fetchStockbitApiNative(url, tokenType);
    }
    const expr = `
      (async () => {
        const tokenRaw = localStorage.getItem('${tokenType}');
        const token = tokenRaw ? atob(tokenRaw) : '';
        const headers = {
          'Authorization': 'Bearer ' + token,
          'X-Platform': 'desktop',
          'X-AppVersion': '2.2.0',
          'Accept': 'application/json, text/plain, */*'
        };
        const r = await fetch('${url}', { headers });
        let data = null;
        try { data = await r.json(); } catch(e) { data = await r.text(); }
        return { status: r.status, ok: r.ok, data };
      })()
    `;

    const res = await this.evaluateInPage(expr);
    if (!res || !res.ok) {
      const errDetail = res && typeof res.data === 'object' ? JSON.stringify(res.data) : (res ? res.data : 'No response');
      throw new Error(`Stockbit API request failed [${res ? res.status : 'ERR'}]: ${errDetail}`);
    }
    return res.data;
  }

  // High-Level Data Methods
  async getUserProfile() {
    const tokens = await this.getTokens();
    return tokens.au;
  }

  async getPortfolio() {
    return await this.fetchStockbitApi('https://carina.stockbit.com/portfolio/v2/list', 'ats');
  }

  async getOrders() {
    return await this.fetchStockbitApi('https://carina.stockbit.com/order/v2/list', 'ats');
  }

  async getOrderHistory(page = 1, limit = 100, period = 'all') {
    return await this.fetchStockbitApi(`https://carina.stockbit.com/history?page=${page}&limit=${limit}&period=${period}`, 'ats');
  }

  async getBankDetail() {
    return await this.fetchStockbitApi('https://carina.stockbit.com/account/bank', 'ats');
  }

  async getSubAccounts() {
    return await this.fetchStockbitApi('https://carina.stockbit.com/v2/sub-account/list', 'ats');
  }

  async getWatchlist(limit = 50) {
    const user = await this.getUserProfile();
    const watchlistId = user?.watchlist_id;
    const url = watchlistId 
      ? `https://exodus.stockbit.com/watchlist/${watchlistId}?limit=${limit}`
      : `https://exodus.stockbit.com/watchlist?limit=${limit}`;
    return await this.fetchStockbitApi(url, 'at');
  }

  async getOrderbook(symbol) {
    const sym = symbol.toUpperCase().trim();
    return await this.fetchStockbitApi(`https://exodus.stockbit.com/company-price-feed/v2/orderbook/companies/${sym}`, 'at');
  }

  async getBrokerDistribution(symbol) {
    const sym = symbol.toUpperCase().trim();
    return await this.fetchStockbitApi(`https://exodus.stockbit.com/order-trade/broker/distribution?symbol=${sym}`, 'at');
  }

  async getRunningTrade(limit = 80, symbol = null, actionType = 'ALL', marketBoard = 'ALL') {
    let url = `https://exodus.stockbit.com/order-trade/running-trade?limit=${limit}&sort=desc&order_by=RUNNING_TRADE_ORDER_BY_TIME`;
    if (symbol) url += `&symbols%5B%5D=${symbol.toUpperCase().trim()}`;
    if (actionType && actionType !== 'ALL') url += `&action_type=${actionType}`;
    else url += `&action_type=RUNNING_TRADE_ACTION_TYPE_ALL`;
    if (marketBoard && marketBoard !== 'ALL') url += `&market_board=${marketBoard}`;
    else url += `&market_board=BOARD_TYPE_ALL`;
    return await this.fetchStockbitApi(url, 'at');
  }

  async getCompanyInfo(symbol) {
    const sym = symbol.toUpperCase().trim();
    return await this.fetchStockbitApi(`https://exodus.stockbit.com/emitten/${sym}/info`, 'at');
  }

  async getTrendingStocks() {
    return await this.fetchStockbitApi('https://exodus.stockbit.com/emitten/trending', 'at');
  }

  async getMarketSession() {
    return await this.fetchStockbitApi('https://exodus.stockbit.com/company-price-feed/market-time/session', 'at');
  }

  async getPriceList(symbol) {
    const sym = symbol.toUpperCase().trim();
    return await this.fetchStockbitApi(`https://exodus.stockbit.com/company-price-feed/prices?stock_code=${sym}`, 'at');
  }

  /**
   * Mengambil Key Stats dan Laporan Keuangan multi-tahun Stockbit
   * @param {string} symbol - Kode saham IDX
   */
  async getKeyStats(symbol) {
    const sym = symbol.toUpperCase().trim();
    return await this.fetchStockbitApi(`https://exodus.stockbit.com/keystats/${sym}`, 'at');
  }

  /**
   * Mengambil data candlestick historis harian (OHLCV, Foreign Flow, Bandarmologi)
   * @param {string} symbol - Kode saham IDX
   * @param {string} [startDate] - Tanggal awal YYYY-MM-DD
   * @param {string} [endDate] - Tanggal akhir YYYY-MM-DD
   */
  async getDailyCandles(symbol, startDate, endDate) {
    const sym = symbol.toUpperCase().trim();
    const now = new Date();
    const defEnd = now.toISOString().slice(0, 10);
    const oneYearAgo = new Date(now.getTime() - 365 * 86400 * 1000).toISOString().slice(0, 10);

    let start = startDate || oneYearAgo;
    let end = endDate || defEnd;

    // Stockbit API uses reverse order: from = newer date, to = older date
    let [dFrom, dTo] = start < end ? [end, start] : [start, end];

    const url = `https://exodus.stockbit.com/chartbit/${sym}/price/daily?from=${dFrom}&to=${dTo}`;
    const res = await this.fetchStockbitApi(url, 'at');
    const rawBars = res.data?.chartbit || [];

    // Reverse array so bars are in chronological order (oldest to newest)
    const bars = rawBars.slice().reverse().map(b => ({
      date: b.date,
      timestamp: b.unixdate,
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
      volume: b.volume,
      lot: b.lot,
      value: b.value,
      frequency: b.frequency,
      foreign_buy: b.foreignbuy,
      foreign_sell: b.foreignsell,
      net_foreign: (b.foreignbuy || 0) - (b.foreignsell || 0),
      foreign_flow: b.foreignflow,
      freq_analyzer: b.freq_analyzer
    }));

    return {
      symbol: sym,
      start_date: start,
      end_date: end,
      total_bars: bars.length,
      bars
    };
  }

  /**
   * Mengambil data candlestick intraday (menit/jam)
   * @param {string} symbol - Kode saham IDX
   * @param {number} [fromUnix] - Timestamp mulai (dalam detik)
   * @param {number} [toUnix] - Timestamp selesai (dalam detik)
   * @param {number} [multiplier] - Multiplier menit (1 atau 60)
   */
  async getIntradayCandles(symbol, fromUnix, toUnix, multiplier = 1) {
    const sym = symbol.toUpperCase().trim();
    const now = Math.floor(Date.now() / 1000);
    const defStart = now - 5 * 86400;

    let f = fromUnix || now;
    let t = toUnix || defStart;

    // Stockbit API uses reverse order: from = newer date, to = older date
    let [tFrom, tTo] = f < t ? [t, f] : [f, t];

    let url = `https://exodus.stockbit.com/chartbit/${sym}/price/intraday?from=${tFrom}&to=${tTo}`;
    if (multiplier === 60) url += '&minutes_multiplier=60';

    const res = await this.fetchStockbitApi(url, 'at');
    const rawBars = res.data?.chartbit || [];

    // Chronological order (oldest to newest)
    const bars = rawBars.slice().reverse().map(b => ({
      datetime: b.datetime,
      timestamp: parseInt(b.unix_timestamp, 10),
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
      volume: parseInt(b.volume, 10) || 0,
      lot: b.lot || 0,
      value: b.value || 0,
      frequency: parseInt(b.frequency, 10) || 0,
      foreign_buy: b.foreign_buy || 0,
      foreign_sell: b.foreign_sell || 0,
      net_foreign: (b.foreign_buy || 0) - (b.foreign_sell || 0)
    }));

    return {
      symbol: sym,
      multiplier,
      total_bars: bars.length,
      bars
    };
  }

  /**
   * Helper agregasi intraday candle menit/jam (standar TradingView Charting Library)
   * @param {Array} bars - Array bar 1m atau 60m
   * @param {number} intervalMinutes - Resolusi target dalam menit (misal: 3, 5, 15, 30, 45, 120, 240)
   */
  aggregateIntradayCandles(bars, intervalMinutes) {
    if (!bars || bars.length === 0) return [];
    if (intervalMinutes === 1) return bars;

    const intervalSec = intervalMinutes * 60;
    const buckets = new Map();

    for (const bar of bars) {
      const bucketTs = Math.floor(bar.timestamp / intervalSec) * intervalSec;
      if (!buckets.has(bucketTs)) {
        buckets.set(bucketTs, []);
      }
      buckets.get(bucketTs).push(bar);
    }

    const result = [];
    for (const [bucketTs, group] of buckets.entries()) {
      const first = group[0];
      const last = group[group.length - 1];

      let high = -Infinity;
      let low = Infinity;
      let volume = 0;
      let lot = 0;
      let value = 0;
      let frequency = 0;
      let foreignBuy = 0;
      let foreignSell = 0;

      for (const b of group) {
        if (b.high > high) high = b.high;
        if (b.low < low) low = b.low;
        volume += (b.volume || 0);
        lot += (b.lot || 0);
        value += (b.value || 0);
        frequency += (b.frequency || 0);
        foreignBuy += (b.foreign_buy || 0);
        foreignSell += (b.foreign_sell || 0);
      }

      result.push({
        datetime: first.datetime,
        timestamp: bucketTs,
        open: first.open,
        high,
        low,
        close: last.close,
        volume,
        lot,
        value,
        frequency,
        foreign_buy: foreignBuy,
        foreign_sell: foreignSell,
        net_foreign: foreignBuy - foreignSell
      });
    }

    return result;
  }

  /**
   * Helper agregasi harian ke mingguan (1W) atau bulanan (1M)
   * @param {Array} dailyBars - Array bar harian
   * @param {string} macroType - '1W' (mingguan) atau '1M' (bulanan)
   */
  aggregateDailyCandles(dailyBars, macroType = '1W') {
    if (!dailyBars || dailyBars.length === 0) return [];

    const buckets = new Map();

    for (const bar of dailyBars) {
      let key;
      if (macroType === '1M' || macroType === 'M' || macroType === 'monthly') {
        key = bar.date.slice(0, 7); // 'YYYY-MM'
      } else {
        // 1W: Cari hari Senin pada minggu tersebut
        const d = new Date(bar.date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        key = new Date(d.setDate(diff)).toISOString().slice(0, 10);
      }

      if (!buckets.has(key)) {
        buckets.set(key, []);
      }
      buckets.get(key).push(bar);
    }

    const result = [];
    for (const [key, group] of buckets.entries()) {
      const first = group[0];
      const last = group[group.length - 1];

      let high = -Infinity;
      let low = Infinity;
      let volume = 0;
      let lot = 0;
      let value = 0;
      let frequency = 0;
      let foreignBuy = 0;
      let foreignSell = 0;

      for (const b of group) {
        if (b.high > high) high = b.high;
        if (b.low < low) low = b.low;
        volume += (b.volume || 0);
        lot += (b.lot || 0);
        value += (b.value || 0);
        frequency += (b.frequency || 0);
        foreignBuy += (b.foreign_buy || 0);
        foreignSell += (b.foreign_sell || 0);
      }

      result.push({
        date: key,
        period_start: first.date,
        period_end: last.date,
        timestamp: first.timestamp,
        open: first.open,
        high,
        low,
        close: last.close,
        volume,
        lot,
        value,
        frequency,
        foreign_buy: foreignBuy,
        foreign_sell: foreignSell,
        net_foreign: foreignBuy - foreignSell,
        days_in_candle: group.length
      });
    }

    return result;
  }

  /**
   * Modul Terpadu Chartbit: Mengambil data candlestick untuk SEMUA timeframe (Menit, Jam, Hari, Minggu, Bulan)
   * @param {string} symbol - Kode saham IDX (contoh: BBCA, BBRI, ASII)
   * @param {Object} [options]
   * @param {string} [options.timeframe='1D'] - Resolusi waktu: '1m', '3m', '5m', '10m', '15m', '30m', '45m', '1h', '2h', '3h', '4h', '1D', '1W', '1M'
   * @param {string} [options.range] - Preset rentang: '1D', '5D', '1M', '3M', '6M', '1Y', '3Y', '5Y', 'MAX'
   * @param {string|number} [options.from] - Tanggal awal YYYY-MM-DD atau unix timestamp
   * @param {string|number} [options.to] - Tanggal akhir YYYY-MM-DD atau unix timestamp
   */
  async getChartbit(symbol, options = {}) {
    const sym = symbol.toUpperCase().trim();
    const rawTf = String(options.timeframe || '1D').trim();
    const tfLower = rawTf.toLowerCase();
    const range = String(options.range || '').toUpperCase();

    const nowMs = Date.now();
    const nowSec = Math.floor(nowMs / 1000);
    const nowIso = new Date(nowMs).toISOString().slice(0, 10);

    const rangeDaysMap = {
      '1D': 1,
      '5D': 5,
      '1M': 30,
      '3M': 90,
      '6M': 180,
      '1Y': 365,
      '3Y': 365 * 3,
      '5Y': 365 * 5,
      'MAX': 365 * 10
    };

    let bars = [];
    let resolutionType = 'daily';

    // A. Kategori Bulanan: '1M' (kapital M), '1mo', 'monthly'
    if (rawTf === '1M' || tfLower === '1mo' || tfLower === 'monthly') {
      resolutionType = 'monthly';
      const days = rangeDaysMap[range] || 365 * 5;

      let endStr = options.to ? (typeof options.to === 'string' ? options.to : new Date(options.to * 1000).toISOString().slice(0, 10)) : nowIso;
      let startStr = options.from ? (typeof options.from === 'string' ? options.from : new Date(options.from * 1000).toISOString().slice(0, 10)) : new Date(nowMs - days * 86400 * 1000).toISOString().slice(0, 10);

      const daily = await this.getDailyCandles(sym, startStr, endStr);
      bars = this.aggregateDailyCandles(daily.bars, '1M');
    }
    // B. Kategori Mingguan: '1W', 'W', 'weekly'
    else if (tfLower === '1w' || tfLower === 'w' || tfLower === 'weekly') {
      resolutionType = 'weekly';
      const days = rangeDaysMap[range] || 365 * 2;

      let endStr = options.to ? (typeof options.to === 'string' ? options.to : new Date(options.to * 1000).toISOString().slice(0, 10)) : nowIso;
      let startStr = options.from ? (typeof options.from === 'string' ? options.from : new Date(options.from * 1000).toISOString().slice(0, 10)) : new Date(nowMs - days * 86400 * 1000).toISOString().slice(0, 10);

      const daily = await this.getDailyCandles(sym, startStr, endStr);
      bars = this.aggregateDailyCandles(daily.bars, '1W');
    }
    // C. Kategori Jam: '1h', '60m', '2h', '120m', '3h', '180m', '4h', '240m'
    else if (tfLower === '1h' || tfLower === '60m' || tfLower === '2h' || tfLower === '120m' || tfLower === '3h' || tfLower === '180m' || tfLower === '4h' || tfLower === '240m') {
      resolutionType = 'hour';
      let hourVal = 1;
      if (tfLower.includes('2h') || tfLower.includes('120')) hourVal = 2;
      else if (tfLower.includes('3h') || tfLower.includes('180')) hourVal = 3;
      else if (tfLower.includes('4h') || tfLower.includes('240')) hourVal = 4;

      const days = rangeDaysMap[range] || 60;
      let toUnix = options.to ? (typeof options.to === 'number' ? options.to : Math.floor(new Date(options.to).getTime() / 1000)) : nowSec;
      let fromUnix = options.from ? (typeof options.from === 'number' ? options.from : Math.floor(new Date(options.from).getTime() / 1000)) : (toUnix - days * 86400);

      const raw = await this.getIntradayCandles(sym, fromUnix, toUnix, 60);
      bars = hourVal === 1 ? raw.bars : this.aggregateIntradayCandles(raw.bars, hourVal * 60);
    }
    // D. Kategori Menit: '1m', '3m', '5m', '10m', '15m', '30m', '45m'
    else if (tfLower.endsWith('m') && !isNaN(parseInt(tfLower, 10)) && parseInt(tfLower, 10) < 60) {
      resolutionType = 'minute';
      const minVal = parseInt(tfLower, 10);
      // Jika rentang 1D, berikan setidaknya 3 hari agar sesi trading terakhir (misal Jumat jika weekend/Senin pagi) terambil
      let days = rangeDaysMap[range] || (minVal <= 5 ? 3 : 10);
      if (range === '1D') days = 3;

      let toUnix = options.to ? (typeof options.to === 'number' ? options.to : Math.floor(new Date(options.to).getTime() / 1000)) : nowSec;
      let fromUnix = options.from ? (typeof options.from === 'number' ? options.from : Math.floor(new Date(options.from).getTime() / 1000)) : (toUnix - days * 86400);

      const raw = await this.getIntradayCandles(sym, fromUnix, toUnix, 1);
      bars = minVal === 1 ? raw.bars : this.aggregateIntradayCandles(raw.bars, minVal);
    }
    // E. Kategori Harian (1D / Default)
    else {
      resolutionType = 'daily';
      const days = rangeDaysMap[range] || 365;

      let endStr = options.to ? (typeof options.to === 'string' ? options.to : new Date(options.to * 1000).toISOString().slice(0, 10)) : nowIso;
      let startStr = options.from ? (typeof options.from === 'string' ? options.from : new Date(options.from * 1000).toISOString().slice(0, 10)) : new Date(nowMs - days * 86400 * 1000).toISOString().slice(0, 10);

      const daily = await this.getDailyCandles(sym, startStr, endStr);
      bars = daily.bars;
    }

    // Hitung ringkasan statistik
    let highest = bars.length ? Math.max(...bars.map(b => b.high)) : 0;
    let lowest = bars.length ? Math.min(...bars.map(b => b.low)) : 0;
    let totalVol = bars.reduce((acc, b) => acc + (b.volume || 0), 0);
    let totalVal = bars.reduce((acc, b) => acc + (b.value || 0), 0);
    let totalNetForeign = bars.reduce((acc, b) => acc + (b.net_foreign || 0), 0);

    let priceChange = 0;
    let priceChangePct = '0%';
    if (bars.length >= 1) {
      const firstClose = bars[0].open || bars[0].close;
      const lastClose = bars[bars.length - 1].close;
      priceChange = lastClose - firstClose;
      if (firstClose > 0) {
        const pct = ((priceChange / firstClose) * 100).toFixed(2);
        priceChangePct = `${pct > 0 ? '+' : ''}${pct}%`;
      }
    }

    return {
      symbol: sym,
      timeframe: rawTf,
      resolution_type: resolutionType,
      total_bars: bars.length,
      period_start: bars[0]?.datetime || bars[0]?.date || null,
      period_end: bars[bars.length - 1]?.datetime || bars[bars.length - 1]?.date || null,
      summary: {
        highest_price: highest,
        lowest_price: lowest,
        first_open: bars[0]?.open || 0,
        last_close: bars[bars.length - 1]?.close || 0,
        price_change: priceChange,
        price_change_percentage: priceChangePct,
        total_volume: totalVol,
        total_turnover_value: totalVal,
        total_net_foreign: totalNetForeign,
        foreign_stance: totalNetForeign >= 0 ? 'NET ACCUMULATION (Net Buy)' : 'NET DISTRIBUTION (Net Sell)'
      },
      bars
    };
  }


  /**
   * Mencari emiten di bursa IDX via Stockbit search
   * @param {string} query - Kata kunci / kode saham
   * @param {string} [type] - Tipe pencarian: company, all (default 'company')
   */
  async searchEmiten(query, type = 'company') {
    const q = encodeURIComponent(query.trim());
    return await this.fetchStockbitApi(`https://exodus.stockbit.com/search?keyword=${q}&type=${type}`, 'at');
  }

  /**
   * Mengambil analisis Bandarmologi (Bandar Detector) untuk rentang tanggal tertentu
   * @param {string} symbol - Kode saham IDX
   * @param {string} [fromDate] - Tanggal mulai YYYY-MM-DD
   * @param {string} [toDate] - Tanggal akhir YYYY-MM-DD
   */
  async getBandarDetector(symbol, fromDate = null, toDate = null) {
    const sym = symbol.toUpperCase().trim();
    let url = `https://exodus.stockbit.com/marketdetectors/${sym}`;
    const params = [];
    if (fromDate) params.push(`from=${fromDate}`);
    if (toDate) params.push(`to=${toDate}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    return await this.fetchStockbitApi(url, 'at');
  }

  /**
   * Mengambil riwayat aktivitas broker untuk rentang tanggal tertentu
   * @param {string} symbol - Kode saham IDX
   * @param {string} fromDate - Tanggal mulai YYYY-MM-DD
   * @param {string} toDate - Tanggal akhir YYYY-MM-DD
   */
  async getBrokerActivityHistorical(symbol, fromDate, toDate) {
    const sym = symbol.toUpperCase().trim();
    const url = `https://exodus.stockbit.com/order-trade/broker/activity/historical?symbols%5B%5D=${sym}&date_from=${fromDate}&date_to=${toDate}`;
    return await this.fetchStockbitApi(url, 'at');
  }

  /**
   * Mengambil ringkasan Foreign vs Domestic Flow (Gross & Net buy/sell)
   * @param {string} symbol - Kode saham IDX
   */
  async getForeignDomesticFlow(symbol) {
    const sym = symbol.toUpperCase().trim();
    return await this.fetchStockbitApi(`https://exodus.stockbit.com/order-trade/foreign-domestic/summary?symbols%5B%5D=${sym}`, 'at');
  }

  /**
   * Mengambil direktori master seluruh broker saham bursa IDX
   * @param {number} [limit] - Jumlah broker per page
   * @param {number} [page] - Halaman
   */
  async getBrokerList(limit = 100, page = 1) {
    return await this.fetchStockbitApi(`https://exodus.stockbit.com/findata-view/marketdetectors/brokers?limit=${limit}&page=${page}`, 'at');
  }

  /**
   * Mengambil top broker per saham
   * @param {string} symbol - Kode saham IDX
   */
  async getTopBrokers(symbol) {
    const sym = symbol.toUpperCase().trim();
    return await this.fetchStockbitApi(`https://exodus.stockbit.com/order-trade/broker/top?symbol=${sym}`, 'at');
  }

  /**
   * Mengambil Trade Book (distribusi transaksi & volume lot per level harga)
   * @param {string} symbol - Kode saham IDX
   * @param {string} [groupBy] - GROUP_BY_PRICE
   * @param {string} [mode] - TRADE_BOOK_MODE_OVERALL
   */
  async getTradebook(symbol, groupBy = 'GROUP_BY_PRICE', mode = 'TRADE_BOOK_MODE_OVERALL') {
    const sym = symbol.toUpperCase().trim();
    return await this.fetchStockbitApi(`https://exodus.stockbit.com/order-trade/trade-book?symbol=${sym}&group_by=${groupBy}&mode=${mode}`, 'at');
  }

  /**
   * Mengambil ringkasan performa harga multi-timeframe (1D, 1W, 1M, 3M, 6M, YTD, 1Y, 3Y, 5Y, 10Y)
   * @param {string} symbol - Kode saham IDX
   */
  async getPricePerformance(symbol) {
    const sym = symbol.toUpperCase().trim();
    return await this.fetchStockbitApi(`https://exodus.stockbit.com/company-price-feed/price-performance/${sym}`, 'at');
  }

  /**
   * Mengambil analisis Seasonality (probabilitas naik/turun per bulan selama 5-10 tahun)
   * @param {string} symbol - Kode saham IDX
   * @param {number} [year] - Tahun acuan (default: tahun ini)
   * @param {number} [backYear] - Jumlah tahun ke belakang (default: 5)
   */
  async getSeasonality(symbol, year = new Date().getFullYear(), backYear = 5) {
    const sym = symbol.toUpperCase().trim();
    return await this.fetchStockbitApi(`https://exodus.stockbit.com/company-price-feed/seasonality/${sym}?year=${year}&back_year=${backYear}`, 'at');
  }

  /**
   * Mengambil konsensus riset dan target harga analis sekuritas
   * @param {string} symbol - Kode saham IDX
   */
  async getAnalystRatings(symbol) {
    const sym = symbol.toUpperCase().trim();
    return await this.fetchStockbitApi(`https://exodus.stockbit.com/analyst-ratings/${sym}`, 'at');
  }

  /**
   * Mengambil detail perkiraan laba/konsensus analis
   * @param {string} symbol - Kode saham IDX
   */
  async getAnalystConsensus(symbol) {
    const sym = symbol.toUpperCase().trim();
    return await this.fetchStockbitApi(`https://exodus.stockbit.com/analyst-ratings/${sym}/consensus`, 'at');
  }

  /**
   * Mengambil profil lengkap perusahaan (Dewan Direksi, Komisaris, Pemegang Saham >5%, Anak Perusahaan, Beneficial Owner, Data IPO)
   * @param {string} symbol - Kode saham IDX
   */
  async getCompanyProfile(symbol) {
    const sym = symbol.toUpperCase().trim();
    return await this.fetchStockbitApi(`https://exodus.stockbit.com/emitten/${sym}/profile`, 'at');
  }

  /**
   * Mengambil aktivitas transaksi orang dalam (Insider Activity: Direksi / Pemegang Saham Pengendali)
   * @param {string} symbol - Kode saham IDX
   * @param {number} [page] - Nomor halaman (default 1)
   */
  async getInsiderTransactions(symbol, page = 1) {
    const sym = symbol.toUpperCase().trim();
    return await this.fetchStockbitApi(`https://exodus.stockbit.com/insider/company/majorholder?symbol=${sym}&page=${page}`, 'at');
  }

  /**
   * Mengambil komposisi kepemilikan pemegang saham
   * @param {string} symbol - Kode saham IDX
   */
  async getShareholderComposition(symbol) {
    const sym = symbol.toUpperCase().trim();
    return await this.fetchStockbitApi(`https://exodus.stockbit.com/insider/shareholding/composition/companies/${sym}`, 'at');
  }

  /**
   * Mengambil riwayat dan jadwal seluruh Corporate Actions (Dividen, Split, Right Issue, RUPS, Warrant)
   * @param {string} symbol - Kode saham IDX
   */
  async getCorporateActions(symbol) {
    const sym = symbol.toUpperCase().trim();
    return await this.fetchStockbitApi(`https://exodus.stockbit.com/corpaction/${sym}`, 'at');
  }

  /**
   * Mengambil daftar Market Movers (Top Gainer, Top Loser, Most Active, Net Foreign Buy/Sell)
   * @param {string} [category] - top_gainer, top_loser, top_volume, top_value, top_frequency, most_active, top_net_foreign_buy, top_net_foreign_sell
   */
  async getMarketMovers(category = 'top_gainer') {
    return await this.fetchStockbitApi(`https://exodus.stockbit.com/order-trade/market-mover?category=${category}`, 'at');
  }

  /**
   * Mengambil daftar Top Stocks (berdasarkan perputaran transaksi asing / value)
   * @param {string} [type] - value, volume, frequency
   */
  async getTopStocks(type = 'value') {
    return await this.fetchStockbitApi(`https://exodus.stockbit.com/order-trade/top-stock?type=${type}`, 'at');
  }

  /**
   * Mengambil seluruh Preset Screener Stockbit (Guru Screener, Graham, Buffettology, CAN-SLIM, dll.)
   */
  async getScreenerPresets() {
    return await this.fetchStockbitApi('https://exodus.stockbit.com/screener/preset', 'at');
  }

  /**
   * Mengambil postingan diskusi stream komunitas Stockbit untuk emiten tertentu
   * @param {string} symbol - Kode saham IDX
   * @param {number} [limit] - Batas jumlah postingan
   */
  async getStream(symbol, limit = 20) {
    const sym = symbol.toUpperCase().trim();
    return await this.fetchStockbitApi(`https://exodus.stockbit.com/stream/symbol/${sym}?limit=${limit}`, 'at');
  }

  /**
   * Mengambil evaluasi performa trading akun (Win Rate %, Profit Factor, Realized Gain/Loss, Saham Paling Sering Ditradingkan)
   */
  async getPortfolioPerformance() {
    return await this.fetchStockbitApi('https://carina.stockbit.com/history/performance/trade', 'ats');
  }

  /**
   * Mengambil riwayat return kumulatif portofolio harian vs benchmark IHSG
   */
  async getPortfolioReturns() {
    return await this.fetchStockbitApi('https://carina.stockbit.com/history/performance/portfolio/cumulative-return', 'ats');
  }

  /**
   * Mengambil data historis rasio keuangan 10 tahun (PE, PBV, ROE, DER, dll.)
   * @param {string} symbol - Kode saham IDX
   * @param {number} [yearLimit] - Batas tahun historis (default 10)
   */
  async getKeyStatsHistorical(symbol, yearLimit = 10) {
    const sym = symbol.toUpperCase().trim();
    return await this.fetchStockbitApi(`https://exodus.stockbit.com/keystats/ratio/v1/${sym}?year_limit=${yearLimit}`, 'at');
  }

  /**
   * Mengambil data Trade Flow (aliran beli vs jual per menit, volume, lot, frekuensi, transaksi big money)
   * @param {string} symbol - Kode saham IDX
   * @param {string} [timeInterval] - Interval menit ('1m', default '1m')
   */
  async getTradeFlow(symbol, timeInterval = '1m') {
    const sym = symbol.toUpperCase().trim();
    const tradeBookChart = await this.fetchStockbitApi(`https://exodus.stockbit.com/order-trade/trade-book/chart?symbol=${sym}&time_interval=${timeInterval}`, 'at');
    const runningTradeChart = await this.fetchStockbitApi(`https://exodus.stockbit.com/order-trade/running-trade/chart/${sym}`, 'at').catch(() => null);
    
    return {
      symbol: sym,
      time_interval: timeInterval,
      trade_flow: tradeBookChart.data || tradeBookChart,
      running_trade_chart: runningTradeChart?.data || runningTradeChart
    };
  }

  /**
   * Mengambil analisis Broker Flow (ke saham mana saja broker tertentu mengalirkan dananya)
   * @param {string} brokerCode - Kode broker 2 huruf (contoh: YU, AK, ZP, CC, PD)
   */
  async getBrokerFlow(brokerCode) {
    const code = brokerCode.toUpperCase().trim();
    const data = await this.fetchStockbitApi(`https://exodus.stockbit.com/order-trade/broker/activity-chart?broker_code=${code}`, 'at');
    return {
      broker_code: code,
      activity: data.data || data
    };
  }

  /**
   * Mengambil tabel murni Broker Summary (ranking Top Buyer vs Top Seller broker)
   * @param {string} symbol - Kode saham IDX
   * @param {string} [fromDate] - Tanggal awal YYYY-MM-DD
   * @param {string} [toDate] - Tanggal akhir YYYY-MM-DD
   */
  async getBrokerSummary(symbol, fromDate = null, toDate = null) {
    const sym = symbol.toUpperCase().trim();
    let url = `https://exodus.stockbit.com/marketdetectors/${sym}`;
    const params = [];
    if (fromDate) params.push(`from=${fromDate}`);
    if (toDate) params.push(`to=${toDate}`);
    if (params.length > 0) url += `?${params.join('&')}`;

    const res = await this.fetchStockbitApi(url, 'at');
    const data = res.data || res;
    
    return {
      symbol: sym,
      from: data.from,
      to: data.to,
      bandar_detector_stance: data.bandar_detector?.broker_accdist,
      average_price: data.bandar_detector?.average,
      total_buyer_brokers: data.bandar_detector?.total_buyer,
      total_seller_brokers: data.bandar_detector?.total_seller,
      total_value: data.bandar_detector?.value,
      total_volume: data.bandar_detector?.volume,
      top_buyers: (data.broker_summary?.brokers_buy || []).map(b => ({
        broker_code: b.netbs_broker_code,
        type: b.type,
        lot: Number(b.blot),
        value: Number(b.bval),
        avg_price: Number(b.netbs_buy_avg_price),
        frequency: Number(b.freq)
      })),
      top_sellers: (data.broker_summary?.brokers_sell || []).map(b => ({
        broker_code: b.netbs_broker_code,
        type: b.type,
        lot: Number(b.slot),
        value: Number(b.sval),
        avg_price: Number(b.netbs_sell_avg_price),
        frequency: Number(b.freq)
      }))
    };
  }

  /**
   * Mengambil data historis tabular emiten lengkap sesuai tab 'Historical Data' di Stockbit
   * @param {string} symbol - Kode saham IDX
   * @param {number} [page] - Nomor halaman (default 1)
   * @param {number} [limit] - Jumlah record per halaman (default 50)
   */
  async getHistoricalData(symbol, page = 1, limit = 50) {
    const sym = symbol.toUpperCase().trim();
    return await this.fetchStockbitApi(`https://exodus.stockbit.com/company-price-feed/historical/summary/${sym}?page=${page}&limit=${limit}`, 'at');
  }

  /**
   * Mengambil analisis mendalam Foreign Flow (Net Foreign, akumulasi/distribusi asing, dan % partisipasi)
   * @param {string} symbol - Kode saham IDX
   * @param {number} [days] - Jumlah hari historis (default 30)
   */
  async getForeignFlow(symbol, days = 30) {
    const sym = symbol.toUpperCase().trim();
    const now = new Date();
    const endStr = now.toISOString().slice(0, 10);
    const startStr = new Date(now.getTime() - days * 86400 * 1000).toISOString().slice(0, 10);

    const [dailyData, domesticForeignSummary] = await Promise.all([
      this.getDailyCandles(sym, startStr, endStr),
      this.getForeignDomesticFlow(sym).catch(() => null)
    ]);

    const bars = dailyData.bars || [];
    const totalNetForeign = bars.reduce((acc, b) => acc + (b.net_foreign || 0), 0);
    const totalTurnover = bars.reduce((acc, b) => acc + (b.value || 0), 0);
    const totalForeignBuy = bars.reduce((acc, b) => acc + (b.foreign_buy || 0), 0);
    const totalForeignSell = bars.reduce((acc, b) => acc + (b.foreign_sell || 0), 0);

    const foreignParticipationRate = totalTurnover > 0 
      ? (((totalForeignBuy + totalForeignSell) / (totalTurnover * 2)) * 100).toFixed(2) + '%'
      : '0%';

    return {
      symbol: sym,
      analyzed_days: bars.length,
      period: `${startStr} s/d ${endStr}`,
      cumulative_net_foreign: totalNetForeign,
      foreign_stance: totalNetForeign >= 0 ? 'NET ACCUMULATION (Asing Net Buy)' : 'NET DISTRIBUTION (Asing Net Sell)',
      foreign_participation_rate: foreignParticipationRate,
      total_foreign_buy: totalForeignBuy,
      total_foreign_sell: totalForeignSell,
      today_domestic_foreign_breakdown: domesticForeignSummary?.data || domesticForeignSummary,
      daily_history: bars.map(b => ({
        date: b.date,
        close: b.close,
        foreign_buy: b.foreign_buy,
        foreign_sell: b.foreign_sell,
        net_foreign: b.net_foreign,
        foreign_flow_cumulative: b.foreign_flow
      }))
    };
  }

  /**
   * Helper untuk mem-parsing HTML tabel Laporan Keuangan Stockbit menjadi JSON terstruktur
   * @param {string} html - Raw HTML dari html_report
   * @param {number} limit - Jumlah periode terbaru yang diambil (default 12)
   */
  parseFinancialHtml(html, limit = 12) {
    if (!html) return { total_periods_available: 0, periods: [], accounts: [] };

    // Ekstrak label periode dari header <th>
    const thMatches = [...html.matchAll(/<th[^>]*class="[^"]*periods-list[^"]*"[^>]*data-label="([^"]*)"/g)];
    const allLabels = thMatches.map(m => m[1]);
    const uniquePeriods = [];
    for (const l of allLabels) {
      if (!uniquePeriods.includes(l)) uniquePeriods.push(l);
    }

    const selectedPeriods = (limit && limit > 0 && limit < uniquePeriods.length)
      ? uniquePeriods.slice(-limit)
      : uniquePeriods;
    const startIndex = uniquePeriods.length - selectedPeriods.length;

    const tbodyMatch = html.match(/<tbody>([\s\S]*?)<\/tbody>/);
    const accounts = [];

    if (tbodyMatch) {
      const trMatches = [...tbodyMatch[1].matchAll(/<tr([^>]*)>([\s\S]*?)<\/tr>/g)];
      for (const tr of trMatches) {
        const attrs = tr[1];
        const inner = tr[2];
        const isHeader = attrs.includes('r_head') || attrs.includes('bold');

        const nameMatch = inner.match(/<span class="acc-name"[^>]*data-lang-1="([^"]*)"[^>]*data-lang-0="([^"]*)"/);
        const nameEn = nameMatch ? nameMatch[1].trim() : '';
        const nameId = nameMatch ? nameMatch[2].trim() : '';
        if (!nameEn && !nameId) continue;

        const tdMatches = [...inner.matchAll(/<td[^>]*class="[^"]*val[^"]*"[^>]*>([\s\S]*?)<\/td>/g)];
        const rawVals = tdMatches.map(m => m[1].replace(/<[^>]*>/g, '').trim());

        const periodValues = {};
        for (let i = 0; i < selectedPeriods.length; i++) {
          const raw = rawVals[startIndex + i];
          if (!raw || raw === '-' || raw === '') {
            periodValues[selectedPeriods[i]] = null;
          } else {
            const num = parseFloat(raw.replace(/,/g, ''));
            periodValues[selectedPeriods[i]] = isNaN(num) ? raw : num;
          }
        }

        accounts.push({
          name_en: nameEn,
          name_id: nameId,
          is_header: isHeader,
          values: periodValues
        });
      }
    }

    return {
      total_periods_available: uniquePeriods.length,
      periods_returned: selectedPeriods.length,
      periods: selectedPeriods,
      accounts
    };
  }

  /**
   * Mengambil Laporan Keuangan (Income Statement, Balance Sheet, Cash Flow)
   * @param {string} symbol - Kode saham IDX
   * @param {string|number} statementType - 'income_statement'|'balance_sheet'|'cash_flow' (atau 1, 2, 3)
   * @param {string|number} reportType - 'quarterly'|'annual'|'ttm' (atau 1, 2, 3)
   * @param {number} limit - Jumlah kuartal/tahun terbaru (default 12)
   */
  async getFinancials(symbol, statementType = 'income_statement', reportType = 'quarterly', limit = 12) {
    const sym = symbol.toUpperCase().trim();

    // In Stockbit backend:
    // report_type: 1 = Income Statement, 2 = Balance Sheet, 3 = Cash Flow
    let stockbitReportType = 1;
    let stLabel = 'income_statement';
    const stStr = String(statementType).toLowerCase();
    if (stStr === '2' || stStr.includes('balance') || stStr === 'bs') {
      stockbitReportType = 2;
      stLabel = 'balance_sheet';
    } else if (stStr === '3' || stStr.includes('cash') || stStr === 'cf') {
      stockbitReportType = 3;
      stLabel = 'cash_flow';
    }

    // statement_type: 1 = Quarterly, 2 = Annual, 3 = TTM
    let stockbitStatementType = 1;
    let rtLabel = 'quarterly';
    const rtStr = String(reportType).toLowerCase();
    if (rtStr === '2' || rtStr.includes('annual') || rtStr === 'yearly') {
      stockbitStatementType = 2;
      rtLabel = 'annual';
    } else if (rtStr === '3' || rtStr.includes('ttm')) {
      stockbitStatementType = 3;
      rtLabel = 'ttm';
    }

    const url = `https://exodus.stockbit.com/findata-view/company/financial?symbol=${sym}&report_type=${stockbitReportType}&statement_type=${stockbitStatementType}`;
    const raw = await this.fetchStockbitApi(url, 'at');
    const parsed = this.parseFinancialHtml(raw.data?.html_report, limit);


    return {
      symbol: sym,
      statement_type: stLabel,
      report_type: rtLabel,
      currency: raw.data?.default_currency || 'IDR',
      available_currencies: raw.data?.currency || ['IDR', 'USD'],
      rounding_value: raw.data?.rounding_value || [1000000000, 1000000],
      total_periods_available: parsed.total_periods_available,
      periods_returned: parsed.periods_returned,
      periods: parsed.periods,
      accounts: parsed.accounts
    };
  }

  /**
   * Mengambil metadata katalog metrik perbandingan (dengan cache in-memory)
   */
  async getComparisonMetricsMap() {
    if (this._comparisonMetricsMap) return this._comparisonMetricsMap;
    try {
      const res = await this.fetchStockbitApi('https://exodus.stockbit.com/comparison/metrics', 'at');
      const map = new Map();
      const categories = res.data || [];
      for (const cat of categories) {
        if (Array.isArray(cat.child)) {
          for (const item of cat.child) {
            map.set(Number(item.fitem_id), {
              fitem_id: Number(item.fitem_id),
              name: item.fitem_name,
              category: cat.fitem_name
            });
          }
        }
      }
      this._comparisonMetricsMap = map;
      return map;
    } catch {
      return new Map();
    }
  }

  /**
   * Mengambil data Perbandingan Emiten terhadap Peers Kompetitor dan Rata-rata Industri/Sektor
   * @param {string} symbol - Kode saham IDX
   * @param {boolean} includePeers - Sertakan rasio peers kompetitor (default true)
   */
  async getComparison(symbol, includePeers = true) {
    const sym = symbol.toUpperCase().trim();

    const [industriesRes, ratiosRes, metricsMap] = await Promise.all([
      this.fetchStockbitApi(`https://exodus.stockbit.com/comparison/${sym}/industries`, 'at'),
      this.fetchStockbitApi(`https://exodus.stockbit.com/comparison/${sym}/ratios`, 'at'),
      this.getComparisonMetricsMap()
    ]);

    const competitors = (industriesRes.data?.competitor || [])
      .map(c => c.symbol)
      .filter(s => s && s.toUpperCase() !== sym);

    const targetRatiosMap = new Map();
    for (const item of (ratiosRes.data?.data_value || [])) {
      targetRatiosMap.set(Number(item.fitem_id), item.value);
    }

    const industryMap = new Map();
    for (const item of (industriesRes.data?.industry || [])) {
      industryMap.set(Number(item.fitem_id), item.value);
    }

    const sectorMap = new Map();
    for (const item of (industriesRes.data?.sector || [])) {
      sectorMap.set(Number(item.fitem_id), item.value);
    }

    // Ambil rasio untuk kompetitor utama (maks 3-4 peers)
    const peersRatios = {};
    if (includePeers && competitors.length > 0) {
      const topPeers = competitors.slice(0, 4);
      const peerResults = await Promise.all(
        topPeers.map(peer =>
          this.fetchStockbitApi(`https://exodus.stockbit.com/comparison/${peer}/ratios`, 'at')
            .then(res => ({ peer, ratios: res.data?.data_value || [] }))
            .catch(() => ({ peer, ratios: [] }))
        )
      );

      for (const pr of peerResults) {
        const map = new Map();
        for (const item of pr.ratios) {
          map.set(Number(item.fitem_id), item.value);
        }
        peersRatios[pr.peer] = map;
      }
    }

    // Bangun tabel perbandingan komprehensif
    const comparisonTable = [];
    for (const [fitemId, val] of targetRatiosMap.entries()) {
      const meta = metricsMap.get(fitemId) || { name: `Metric #${fitemId}`, category: 'General' };
      const row = {
        fitem_id: fitemId,
        metric: meta.name,
        category: meta.category,
        [sym]: val
      };

      // Tambahkan nilai peers kompetitor
      for (const peer of Object.keys(peersRatios)) {
        row[peer] = peersRatios[peer].get(fitemId) || '-';
      }

      row.industry_avg = industryMap.get(fitemId) || '-';
      row.sector_avg = sectorMap.get(fitemId) || '-';

      comparisonTable.push(row);
    }

    return {
      symbol: sym,
      competitors: competitors,
      industry_averages_count: industryMap.size,
      sector_averages_count: sectorMap.size,
      comparison_metrics_count: comparisonTable.length,
      comparison_table: comparisonTable
    };
  }

  /**
   * Mengambil Konsensus Analis & Target Harga Lengkap
   * @param {string} symbol - Kode saham IDX
   */
  async getAnalystAnalysis(symbol) {
    const sym = symbol.toUpperCase().trim();

    const [ratingsRes, consensusRes] = await Promise.all([
      this.getAnalystRatings(sym).catch(() => null),
      this.getAnalystConsensus(sym).catch(() => null)
    ]);

    const rData = ratingsRes?.data || ratingsRes || {};
    const priceTarget = rData.price_target || {};
    const currentPrice = priceTarget.current_price || 0;
    const bestTarget = priceTarget.best_target || 0;

    let upsidePotential = '0%';
    if (currentPrice > 0 && bestTarget > 0) {
      const diffPct = (((bestTarget - currentPrice) / currentPrice) * 100).toFixed(2);
      upsidePotential = `${diffPct > 0 ? '+' : ''}${diffPct}%`;
    }

    return {
      symbol: sym,
      recommendation: rData.recommendation || 'N/A',
      consensus_target_price: bestTarget,
      current_price: currentPrice,
      upside_potential: upsidePotential,
      price_target_range: {
        low: priceTarget.best_low_target || 0,
        median: bestTarget,
        high: priceTarget.best_high_target || 0
      },
      ratings_breakdown: {
        buy: rData.total_buy || 0,
        hold: rData.total_hold || 0,
        sell: rData.total_sell || 0,
        total_analysts: rData.total_analyst || 0
      },
      last_updated: rData.last_updated || null,
      forecasts: consensusRes?.data || []
    };
  }

  // ==========================================
  // MODULE 10: EXTRA TOOLS, NOTIFICATIONS & BONDS
  // ==========================================

  async getOrderQueue(symbol) {
    const sym = symbol.toUpperCase().trim();
    return await this.fetchStockbitApi(`https://exodus.stockbit.com/order-trade/order-queue?stock_code=${sym}`, 'at');
  }

  async getPriceAlerts() {
    return await this.fetchStockbitApi('https://exodus.stockbit.com/alert', 'at');
  }

  async getChartLayouts() {
    return await this.fetchStockbitApi('https://exodus.stockbit.com/chartbit/charts', 'at');
  }

  async getBondPortfolio() {
    return await this.fetchStockbitApi('https://carina.stockbit.com/bond/v1/portfolio', 'ats');
  }

  async getNotifications(limit = 20) {
    const [feed, unread] = await Promise.all([
      this.fetchStockbitApi(`https://exodus.stockbit.com/notification?limit=${limit}`, 'at').catch(e => ({ error: e.message })),
      this.fetchStockbitApi('https://exodus.stockbit.com/notification/count/unread', 'at').catch(e => ({ error: e.message }))
    ]);
    return {
      unread_count: unread?.data?.unread ?? 0,
      notifications: feed?.data?.result ?? [],
      message: feed?.message || 'Success'
    };
  }
}


