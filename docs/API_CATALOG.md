# 📖 Katalog Lengkap API Internal Stockbit Desktop

Dokumentasi ini merangkum seluruh endpoint API internal yang digunakan oleh **Stockbit Desktop v2.2.0** (Tauri v2 + WebView2), header autentikasi, parameter, dan pemetaannya ke modul **StockbitBridge**, **REST API Dashboard**, dan **MCP Tools**.

---

## 1. Mekanisme Autentikasi & Header

Stockbit menyimpan sesi aktif di `window.localStorage` dalam format Base64:

| Kunci Storage | Tipe Data | Deskripsi & Kegunaan |
| :--- | :--- | :--- |
| **`at`** | JWT (Base64) | **Access Token Umum**. Digunakan untuk request ke `exodus.stockbit.com` (Market data, orderbook, bandarmologi, fundamental, charting). |
| **`ats`** | JWT (Base64) | **Access Token Sekuritas**. Berisi klaim `ACCOUNT_TYPE_EQUITY`. Digunakan untuk request ke `carina.stockbit.com` (Portofolio, RDN, Orders, Performance). |
| **`au`** | JSON (Base64) | **Account User**. Profil user (`username`, `fullname`, `email`, `watchlist_id`, `avatar`). |
| **`tan`** | String (Base64) | **Trading Account Number**. Nomor SID/Rekening trading di sekuritas. |

### Header Standar Request
Semua request API internal wajib menyertakan header berikut:
```http
Authorization: Bearer <DECODED_JWT_TOKEN>
X-Platform: desktop
X-AppVersion: 2.2.0
Accept: application/json, text/plain, */*
Origin: http://tauri.localhost
Referer: http://tauri.localhost/
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0
```

---

## 2. Katalog Endpoint Sekuritas (Carina API)

Host: `https://carina.stockbit.com`  
Token: `ats` (Access Token Sekuritas)

| Path Endpoint | Method | Method Bridge | Tool MCP | Deskripsi |
| :--- | :--- | :--- | :--- | :--- |
| `/portfolio/v2/list` | `GET` | `getPortfolio()` | `stockbit_get_portfolio` | Ringkasan saldo, modal, floating P&L, holdings |
| `/account/bank` | `GET` | `getBankDetail()` | `stockbit_get_bank_account` | Detail RDN bank kustodian dan saldo kas riil |
| `/history/performance/trade` | `GET` | `getPortfolioPerformance()` | `stockbit_get_portfolio_performance` | Win rate, profit factor, total realized gain/loss |
| `/history/performance/portfolio/cumulative-return` | `GET` | `getPortfolioReturns()` | `stockbit_get_portfolio_returns` | Riwayat return kumulatif harian vs IHSG |
| `/order/v2/list` | `GET` | `getOrders()` | `stockbit_get_orders` | Antrean order hari ini (Open, Matched, Rejected) |
| `/history?page={p}&limit={l}&period={pr}` | `GET` | `getOrderHistory(page, limit, period)` | `stockbit_get_order_history` | Riwayat transaksi masa lalu, fee, dividen, mutasi |
| `/v2/sub-account/list` | `GET` | `getSubAccounts()` | `stockbit_get_sub_accounts` | Rekening sekuritas (Reguler, Margin) & status limit |

---

## 3. Katalog Endpoint Pasar & Emiten (Exodus API)

Host: `https://exodus.stockbit.com`  
Token: `at` (Access Token Umum)

### 3.1 Market Depth & Tape Reading
| Path Endpoint | Method | Method Bridge | Tool MCP | Deskripsi |
| :--- | :--- | :--- | :--- | :--- |
| `/company-price-feed/v2/orderbook/companies/{SYMBOL}` | `GET` | `getOrderbook(symbol)` | `stockbit_get_orderbook` | 10-20 level Bid & Offer dengan queue & volume |
| `/order-trade/trade-book?symbol={SYMBOL}` | `GET` | `getTradebook(symbol)` | `stockbit_get_tradebook` | Distribusi volume transaksi per level harga |
| `/order-trade/trade-book/chart?symbol={SYM}&time_interval=1m` | `GET` | `getTradeFlow(symbol, interval)` | `stockbit_get_trade_flow` | Time-series aliran transaksi per menit (Trade Flow) |
| `/order-trade/running-trade` | `GET` | `getRunningTrade(limit, symbol, ...)` | `stockbit_get_running_trade` | Real-time matched tape dengan broker tags & board |
| `/emitten/{SYMBOL}/info` | `GET` | `getCompanyInfo(symbol)` | `stockbit_get_quote` | Profil ringkas, auto-rejection limit, tick harga |
| `/company-price-feed/market-time/session` | `GET` | `getMarketSession()` | `stockbit_get_market_session` | Status fase jam bursa IDX (Open, Break, Closed) |

### 3.2 Bandarmologi & Analisis Broker
| Path Endpoint | Method | Method Bridge | Tool MCP | Deskripsi |
| :--- | :--- | :--- | :--- | :--- |
| `/marketdetectors/{SYMBOL}?from={F}&to={T}` | `GET` | `getBrokerSummary(symbol, from, to)` | `stockbit_get_broker_summary` | Tabel murni Broker Summary (ranking Top Buyer & Seller) |
| `/order-trade/broker/distribution?symbol={SYMBOL}` | `GET` | `getBrokerDistribution(symbol)` | `stockbit_get_broker_distribution` | Matrix distribusi broker hari ini (by value & volume) |
| `/order-trade/broker/activity-chart?broker_code={CODE}` | `GET` | `getBrokerFlow(brokerCode)` | `stockbit_get_broker_flow` | Aliran transaksi dan portofolio broker tertentu |
| `/marketdetectors/{SYMBOL}?from={F}&to={T}` | `GET` | `getBandarDetector(symbol, from, to)` | `stockbit_get_bandar_detector` | Bandar detector lengkap & rincian akumulasi/distribusi |
| Agregasi Daily Candles & Foreign-Domestic Summary | `GET` | `getForeignFlow(symbol, days)` | `stockbit_get_foreign_flow` | Analisis kumulatif aliran modal asing & partisipasi % |
| `/order-trade/broker/activity/historical?symbols[]={SYMBOL}` | `GET` | `getBrokerActivityHistorical(...)` | `stockbit_get_broker_activity_historical` | Riwayat akumulasi broker dalam rentang tanggal |
| `/order-trade/foreign-domestic/summary?symbols[]={SYMBOL}` | `GET` | `getForeignDomesticFlow(symbol)` | `stockbit_get_foreign_domestic_flow` | Arus dana Asing vs Domestik (gross & net) |
| `/findata-view/marketdetectors/brokers?limit={L}&page={P}` | `GET` | `getBrokerList(limit, page)` | `stockbit_get_broker_list` | Direktori master seluruh kode broker IDX |
| `/order-trade/broker/top?symbol={SYMBOL}` | `GET` | `getTopBrokers(symbol)` | `stockbit_get_top_brokers` | Top broker pembeli & penjual saham hari ini |

### 3.3 Charting & Analisis Teknikal
| Path Endpoint | Method | Method Bridge | Tool MCP | Deskripsi |
| :--- | :--- | :--- | :--- | :--- |
| `/chartbit/{SYM}/price/...` (Agregasi Multi-Timeframe) | `GET` | `getChartbit(symbol, options)` | `stockbit_get_chartbit` | Candlestick LENGKAP semua timeframe: menit (1m-45m), jam (1h-4h), hari, minggu, bulan dengan Foreign Flow |
| `/chartbit/{SYMBOL}/price/daily?from={F}&to={T}` | `GET` | `getDailyCandles(symbol, start, end)` | `stockbit_get_chart_data` | Candlestick OHLCV, Foreign Flow, Frequency Analyzer |
| `/chartbit/{SYMBOL}/price/intraday?from={F}&to={T}` | `GET` | `getIntradayCandles(...)` | `stockbit_get_intraday` | Candlestick intraday resolusi 1 menit / 60 menit |
| `/company-price-feed/historical/summary/{SYM}?page={P}&limit={L}` | `GET` | `getHistoricalData(symbol, page, limit)` | `stockbit_get_historical_data` | Data historis tabular OHLCV, turnover & foreign flow |
| `/company-price-feed/price-performance/{SYMBOL}` | `GET` | `getPricePerformance(symbol)` | `stockbit_get_price_performance` | Performa harga (1D, 1W, 1M, 3M, 6M, YTD, 1Y s/d 10Y) |


### 3.4 Fundamental, Rasio & Konsensus
| Path Endpoint | Method | Method Bridge | Tool MCP | Deskripsi |
| :--- | :--- | :--- | :--- | :--- |
| `/keystats/{SYMBOL}` | `GET` | `getKeyStats(symbol)` | `stockbit_get_keystats` | Rasio fundamental lengkap terbagi per kategori |
| `/keystats/ratio/v1/{SYMBOL}?year_limit={Y}` | `GET` | `getKeyStatsHistorical(sym, year)` | `stockbit_get_keystats_history` | Deret waktu 10 tahun rasio finansial historis |
| `/company-price-feed/seasonality/{SYMBOL}?year={Y}&back_year={B}` | `GET` | `getSeasonality(symbol, year, back)` | `stockbit_get_seasonality` | Probabilitas & rata-rata return per bulan (5-10 thn) |
| `/analyst-ratings/{SYMBOL}` | `GET` | `getAnalystRatings(symbol)` | `stockbit_get_analyst_consensus` | Target harga konsensus & rekomendasi Buy/Hold/Sell |

### 3.5 Profil Korporat, Insiders & Corporate Actions
| Path Endpoint | Method | Method Bridge | Tool MCP | Deskripsi |
| :--- | :--- | :--- | :--- | :--- |
| `/emitten/{SYMBOL}/profile` | `GET` | `getCompanyProfile(symbol)` | `stockbit_get_company_profile` | Direksi, Komisaris, Pemegang Saham >5%, Anak Perusahaan, IPO |
| `/insider/company/majorholder?symbol={SYMBOL}` | `GET` | `getInsiderTransactions(sym, page)` | `stockbit_get_insider_transactions` | Transaksi orang dalam (Insider Activity) real-time |
| `/insider/shareholding/composition/companies/{SYMBOL}` | `GET` | `getShareholderComposition(sym)` | `stockbit_get_shareholder_composition` | Komposisi kepemilikan saham dari waktu ke waktu |
| `/corpaction/{SYMBOL}` | `GET` | `getCorporateActions(symbol)` | `stockbit_get_corporate_actions` | Dividen, Stock Split, Rights Issue, Waran, RUPS |

### 3.6 Market Discovery, Screener & Community Stream
| Path Endpoint | Method | Method Bridge | Tool MCP | Deskripsi |
| :--- | :--- | :--- | :--- | :--- |
| `/order-trade/market-mover?category={CAT}` | `GET` | `getMarketMovers(category)` | `stockbit_get_market_movers` | Top Gainer, Loser, Most Active, Net Foreign Buy/Sell |
| `/order-trade/top-stock?type={TYPE}` | `GET` | `getTopStocks(type)` | `stockbit_get_top_stocks` | Saham dengan perputaran nilai asing terbesar |
| `/screener/preset` | `GET` | `getScreenerPresets()` | `stockbit_get_screener_presets` | Katalog preset screener Guru & Teknikal Stockbit |
| `/stream/symbol/{SYMBOL}?limit={LIMIT}` | `GET` | `getStream(symbol, limit)` | `stockbit_get_stream` | Postingan diskusi & sentimen komunitas trader |
| `/emitten/trending` | `GET` | `getTrendingStocks()` | `stockbit_get_trending` | Saham paling ramai dicari di komunitas Stockbit |
| `/watchlist/{WATCHLIST_ID}?limit={L}` | `GET` | `getWatchlist(limit)` | `stockbit_get_watchlist` | Saham dalam watchlist pantauan pengguna |
| `/search?keyword={Q}&type={TYPE}` | `GET` | `searchEmiten(query, type)` | `stockbit_search_emiten` | Pencarian kode saham, perusahaan, dan sektor |

### 3.7 Fundamental Deep Dive, Financials & Peer Comparison
| Path Endpoint | Method | Method Bridge | Tool MCP | Deskripsi |
| :--- | :--- | :--- | :--- | :--- |
| `/findata-view/company/financial?symbol={SYM}&report_type={RT}&statement_type={ST}` | `GET` | `getFinancials(sym, stType, repType, limit)` | `stockbit_get_financials` | Laporan Keuangan lengkap (Laba Rugi, Neraca, Arus Kas) kuartalan/tahunan hingga 74 periode |
| `/comparison/{SYM}/industries` & `/comparison/{SYM}/ratios` | `GET` | `getComparison(symbol, includePeers)` | `stockbit_get_comparison` | Komparasi 66 rasio emiten vs peers kompetitor langsung, industri, dan sektor |
| `/analyst-ratings/{SYM}` & `/analyst-ratings/{SYM}/consensus` | `GET` | `getAnalystAnalysis(symbol)` | `stockbit_get_analysis` | Analisis konsensus target harga, potensi kenaikan (upside %), rekomendasi analis, dan proyeksi keuangan |

### 3.8 Alat Tambahan, Notifikasi & Obligasi (SBN)
| Path Endpoint | Method | Method Bridge | Tool MCP | Deskripsi |
| :--- | :--- | :--- | :--- | :--- |
| `/order-trade/order-queue?stock_code={SYM}` | `GET` | `getOrderQueue(symbol)` | `stockbit_get_order_queue` | Antrean order transaksi pengguna pada saham tertentu |
| `/alert` | `GET` | `getPriceAlerts()` | `stockbit_get_price_alerts` | Daftar alarm dan pengingat target harga saham aktif |
| `/chartbit/charts` | `GET` | `getChartLayouts()` | `stockbit_get_chart_layouts` | Template layout chart TradingView yang disimpan pengguna |
| `https://carina.stockbit.com/bond/v1/portfolio` | `GET` | `getBondPortfolio()` | `stockbit_get_bond_portfolio` | Portofolio obligasi negara & SBN (ORI, SR, PBS, FR) |
| `/notification?limit={L}` & `/notification/count/unread` | `GET` | `getNotifications(limit)` | `stockbit_get_notifications` | Feed notifikasi akun bursa & jumlah unread alert |

---

## 4. Penanganan Status Error

| HTTP Code | Penyebab | Solusi |
| :--- | :--- | :--- |
| **`400 Bad Request`** | Token tertukar (`at` vs `ats`) atau parameter query salah format. | Gunakan token `ats` untuk Carina dan `at` untuk Exodus. Periksa tipe parameter. |
| **`401 Unauthorized`** | Sesi login di Stockbit Desktop telah kedaluwarsa. | Buka aplikasi Stockbit Desktop dan login ulang. |
| **`403 Forbidden`** | Blokir WAF / Origin tidak valid. | Request dieksekusi via `evaluateInPage` agar terdeteksi dari `http://tauri.localhost`. |
| **`404 Not Found`** | Kode simbol saham salah atau endpoint tidak terdaftar. | Pastikan kode saham valid di bursa IDX (contoh: `BBCA`). |
| **`ECONNREFUSED`** | Port 9222 tidak merespons. | Pastikan Stockbit Desktop dibuka dengan flag `--remote-debugging-port=9222`. |
