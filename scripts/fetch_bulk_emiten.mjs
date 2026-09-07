#!/usr/bin/env node
// scripts/fetch_bulk_emiten.mjs
// Bulk download historical candles & foreign flow for multiple IDX stocks

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { StockbitBridge } from '../src/stockbitBridge.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data', 'charts');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Default list: LQ45 & Blue Chip sample
const DEFAULT_SYMBOLS = [
  'BBCA', 'BBRI', 'BMRI', 'BBNI', 'TLKM',
  'ASII', 'ICBP', 'INDF', 'UNVR', 'AMRT',
  'ADRO', 'PTBA', 'ANTM', 'MDKA', 'INCO',
  'CPIN', 'JPFA', 'KLBF', 'GOTO', 'BULL'
];

const bridge = new StockbitBridge();

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runBulkDownload() {
  console.log('======================================================');
  console.log(' 📥 STOCKBIT BULK CHART DATA FETCHER');
  console.log('======================================================');
  console.log(`Target Directory: ${DATA_DIR}`);
  console.log(`Stocks to fetch : ${DEFAULT_SYMBOLS.join(', ')}\n`);

  const isRunning = await bridge.isAppRunning();
  if (!isRunning) {
    console.error('[Error] Stockbit Desktop tidak terdeteksi di port 9222. Jalankan launch-stockbit.bat terlebih dahulu.');
    process.exit(1);
  }

  const results = [];
  const startDate = '2024-01-01';
  const endDate = '2024-12-31';

  for (let i = 0; i < DEFAULT_SYMBOLS.length; i++) {
    const sym = DEFAULT_SYMBOLS[i];
    process.stdout.write(`[${i + 1}/${DEFAULT_SYMBOLS.length}] Mengunduh ${sym}... `);

    try {
      const data = await bridge.getDailyCandles(sym, startDate, endDate);
      const filePath = path.join(DATA_DIR, `${sym}_daily.json`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

      const totalForeign = data.bars.reduce((acc, b) => acc + (b.net_foreign || 0), 0);
      const stance = totalForeign >= 0 ? 'NET BUY' : 'NET SELL';
      console.log(`✓ ${data.total_bars} bars | Net Foreign: Rp ${(totalForeign / 1e9).toFixed(2)} Miliar (${stance})`);
      
      results.push({
        symbol: sym,
        bars: data.total_bars,
        net_foreign_billion: Number((totalForeign / 1e9).toFixed(2)),
        stance
      });
    } catch (err) {
      console.log(`✗ Gagal: ${err.message}`);
    }

    // Polite delay between requests
    await delay(150);
  }

  console.log('\n======================================================');
  console.log(' 🎉 BULK DOWNLOAD SELESAI!');
  console.log('======================================================');
  console.log(`Data tersimpan dalam format JSON di: ${DATA_DIR}`);
  console.log('Dapat langsung dibuka dengan Python (pandas.read_json) atau script Node.js.\n');
}

runBulkDownload();
