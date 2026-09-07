---
name: stockbit
description: >-
  Mengakses data pasar saham Indonesia (IDX), portofolio pengguna, saldo RDN,
  orderbook, antrean order, bandarmologi rentang tanggal, seasonality, konsensus analis,
  transaksi insider, profil korporat lengkap, tradebook, dan screening secara real-time
  langsung dari Stockbit Desktop Bridge v2.0. Gunakan saat pengguna meminta analisis
  saham IDX, evaluasi portofolio, bandarmologi, riset fundamental, atau strategi trading.
---

# Stockbit Desktop MCP Tools Integration v2.0

Skill ini memandu penggunaan Model Context Protocol (MCP) untuk Stockbit Desktop yang menyediakan **36 tool enterprise-grade** yang mencakup 100% data pasar modal Indonesia.

---

## 🧭 Panduan Cepat Pemilihan Tool Berdasarkan Kebutuhan

| Pertanyaan / Kebutuhan Pengguna | Rekomendasi Tool MCP |
| :--- | :--- |
| Evaluasi performa portofolio, alokasi aset, floating P&L | `stockbit_get_portfolio`, `stockbit_get_portfolio_performance` |
| Saldo kas trading siap pakai & rekening kustodian RDN | `stockbit_get_bank_account` |
| Cek antrean order hari ini atau riwayat transaksi masa lalu | `stockbit_get_orders`, `stockbit_get_order_history` |
| Cek ketebalan Bid vs Offer dan antrean lot (Orderbook) | `stockbit_get_orderbook` |
| Cek matched volume di setiap level harga & dominasi buyer/seller | `stockbit_get_tradebook` |
| Aliran transaksi menit-per-menit (Trade Flow Chart) & Big Money | `stockbit_get_trade_flow` |
| Pantau pita transaksi live & broker buyer/seller secara real-time | `stockbit_get_running_trade` |
| Tabel murni Broker Summary (ranking Top Buyer vs Seller) | `stockbit_get_broker_summary` |
| Matrix Broker Distribution (siapa menyerap dari siapa, value & lot) | `stockbit_get_broker_distribution` |
| Aliran portofolio dan akumulasi broker tertentu (Broker Flow) | `stockbit_get_broker_flow` |
| Analisis mendalam arus modal asing (Foreign Flow & % Partisipasi) | `stockbit_get_foreign_flow` |
| Analisis Bandarmologi **rentang tanggal kustom** (1 minggu / 1 bulan lalu) | `stockbit_get_bandar_detector`, `stockbit_get_broker_activity_historical` |
| Cek arus dana Asing vs Domestik (Gross/Net) | `stockbit_get_foreign_domestic_flow` |
| Cek direktori master kode broker bursa efek | `stockbit_get_broker_list` |
| Tabel harga harian lengkap tab **"Historical Data"** (OHLCV, Asing, Turnover) | `stockbit_get_historical_data` |
| Analisis teknikal candlestick, OHLCV, Foreign Flow, MA | `stockbit_get_chart_data`, `stockbit_get_intraday` |
| Performa harga multi-timeframe (1D, 1W, 1M, 3M, 6M, YTD, 1Y s/d 10Y) | `stockbit_get_price_performance` |
| Evaluasi rasio fundamental (PE, PBV, ROE, DER, NPM, EPS) | `stockbit_get_keystats`, `stockbit_get_keystats_history` |
| Cek probabilitas musiman saham per bulan (Jan-Des) | `stockbit_get_seasonality` |
| Cek target harga analis sekuritas & rekomendasi Buy/Hold/Sell | `stockbit_get_analyst_consensus` |
| Cek dewan direksi, komisaris, pemegang saham >5%, anak usaha, IPO | `stockbit_get_company_profile` |
| Cek transaksi beli/jual orang dalam (Direksi/Pemilik Saham) | `stockbit_get_insider_transactions` |
| Cek jadwal dividen, cum date, ex date, DPS, split, RUPS | `stockbit_get_corporate_actions` |
| Saham paling gainer, loser, atau paling aktif di bursa | `stockbit_get_market_movers`, `stockbit_get_top_stocks` |
| Cari template screener (Buffettology, CAN-SLIM, Graham) | `stockbit_get_screener_presets` |
| Pantau diskusi & sentimen komunitas trader (Stream) | `stockbit_get_stream`, `stockbit_get_trending` |
| Pantau watchlist pribadi | `stockbit_get_watchlist` |
| Cari kode saham atau nama emiten | `stockbit_search_emiten` |

---

## 📋 Katalog 36 Tool MCP

### 1. Akun & Portofolio (Carina API)
- `stockbit_get_portfolio`: Saldo kas trading, modal terinvestasi, unrealized P&L, gain %, dan holdings.
- `stockbit_get_bank_account`: Rekening bank kustodian RDN dan saldo kas riil.
- `stockbit_get_portfolio_performance`: Win rate %, profit factor, total realized P&L, total dividen, saham paling aktif.
- `stockbit_get_portfolio_returns`: Riwayat return harian kumulatif portofolio vs IHSG.
- `stockbit_get_sub_accounts`: Daftar rekening sub-account sekuritas (Reguler, Margin).

### 2. Transaksi & Order Management (Carina API)
- `stockbit_get_orders`: Antrean order hari ini (Open, Matched, Rejected).
- `stockbit_get_order_history` *(page, limit, period)*: Riwayat transaksi lampau, fee, dividen, dan mutasi.

### 3. Market Depth & Tape Reading (Exodus API)
- `stockbit_get_orderbook` *(symbol)*: Kedalaman antrean 10-20 baris Bid/Offer.
- `stockbit_get_tradebook` *(symbol)*: Volume lot terlaksana di setiap tick harga.
- `stockbit_get_trade_flow` *(symbol, time_interval)*: Time-series aliran transaksi beli vs jual per menit (Trade Flow Chart).
- `stockbit_get_running_trade` *(limit, symbol, action_type, market_board)*: Pita rekaman transaksi live.
- `stockbit_get_quote` *(symbol)*: Profil ringkas, auto-rejection limit, tick harga.
- `stockbit_get_market_session`: Status jam perdagangan bursa IDX live.

### 4. Bandarmologi & Broker Analytics (Exodus API)
- `stockbit_get_broker_summary` *(symbol, from_date, to_date)*: Tabel murni ranking Top Buyer vs Seller, avg price, lot.
- `stockbit_get_broker_distribution` *(symbol)*: Matrix distribusi broker live (siapa menyerap dari siapa, by value & volume).
- `stockbit_get_broker_flow` *(broker_code)*: Aliran transaksi dan perputaran portofolio broker tertentu ke berbagai saham IDX.
- `stockbit_get_foreign_flow` *(symbol, days)*: Analisis mendalam aliran modal asing (kumulatif net foreign, stance, % partisipasi).
- `stockbit_get_bandar_detector` *(symbol, from_date, to_date)*: Bandar detector rentang tanggal kustom.
- `stockbit_get_broker_activity_historical` *(symbol, from_date, to_date)*: Riwayat akumulasi broker tertentu.
- `stockbit_get_foreign_domestic_flow` *(symbol)*: Arus transaksi Asing vs Domestik.
- `stockbit_get_broker_list` *(limit, page)*: Direktori master kode broker IDX.
- `stockbit_get_top_brokers` *(symbol)*: Top broker pembeli & penjual hari ini.

### 5. Charting & Analisis Teknikal (Exodus API)
- `stockbit_get_chart_data` *(symbol, start_date, end_date)*: Candlestick OHLCV harian + Foreign Flow.
- `stockbit_get_intraday` *(symbol, multiplier)*: Candlestick intraday 1m atau 60m.
- `stockbit_get_historical_data` *(symbol, page, limit)*: Data tabel historis harian lengkap (OHLCV, Volume, Turnover, Asing).
- `stockbit_get_price_performance` *(symbol)*: Return multi-timeframe lengkap (1D s/d 10Y).

### 6. Fundamental, Rasio & Konsensus Analis (Exodus API)
- `stockbit_get_keystats` *(symbol)*: Rasio fundamental lengkap terbagi per grup rapi.
- `stockbit_get_keystats_history` *(symbol, year_limit)*: Deret waktu 10 tahun rasio finansial historis.
- `stockbit_get_seasonality` *(symbol, year, back_year)*: Probabilitas & return bulanan selama 5-10 tahun.
- `stockbit_get_analyst_consensus` *(symbol)*: Target harga & rekomendasi Buy/Hold/Sell analis.

### 7. Profil Korporat, Insiders & Corporate Actions (Exodus API)
- `stockbit_get_company_profile` *(symbol)*: Direksi, Komisaris, Pemegang Saham >5%, Anak Perusahaan, Data IPO.
- `stockbit_get_insider_transactions` *(symbol, page)*: Transaksi jual/beli orang dalam (Insider Activity).
- `stockbit_get_shareholder_composition` *(symbol)*: Struktur kepemilikan saham emiten dari waktu ke waktu.
- `stockbit_get_corporate_actions` *(symbol)*: Dividen, Stock Split, Rights Issue, Waran, RUPS.

### 8. Market Discovery, Screener & Community Stream (Exodus API)
- `stockbit_get_market_movers` *(category)*: Top Gainer, Loser, Most Active, Net Foreign Buy/Sell.
- `stockbit_get_top_stocks` *(type)*: Saham dengan perputaran nilai asing terbesar.
- `stockbit_get_screener_presets`: Katalog preset screener Guru & Teknikal Stockbit.
- `stockbit_get_stream` *(symbol, limit)*: Diskusi komunitas trader Stockbit.
- `stockbit_get_trending`: Saham paling ramai dicari saat ini.
- `stockbit_get_watchlist` *(limit)*: Saham dalam watchlist pantauan pengguna.
- `stockbit_search_emiten` *(query, type)*: Pencarian kode saham, perusahaan, dan sektor.

### 9. Fundamental Deep Dive, Financials & Peer Comparison (Exodus API)
- `stockbit_get_financials` *(symbol, statement_type, report_type, limit)*: Laporan Keuangan lengkap hingga 74 periode.
- `stockbit_get_comparison` *(symbol, include_peers)*: Komparasi 66 metrik emiten vs peers, industri, dan sektor.
- `stockbit_get_analysis` *(symbol)*: Konsensus analis, potensi kenaikan (upside %), rekomendasi, dan proyeksi keuangan.

### 10. Alat Tambahan, Notifikasi & Obligasi (Exodus & Carina API)
- `stockbit_get_order_queue` *(symbol)*: Antrean order transaksi bursa pengguna pada level harga tertentu.
- `stockbit_get_price_alerts`: Daftar seluruh alarm & pengingat target harga (Price Alerts) aktif.
- `stockbit_get_chart_layouts`: Template layout chart TradingView Stockbit yang disimpan pengguna.
- `stockbit_get_bond_portfolio`: Portofolio investasi Obligasi dan Surat Berharga Negara (SBN / Bonds).
- `stockbit_get_notifications` *(limit)*: Feed notifikasi akun bursa, info dividen, & jumlah notifikasi unread.

---

## ⚠️ Catatan Operasional:
- Stockbit Desktop harus dalam keadaan aktif di latar belakang dengan flag `--remote-debugging-port=9222`.
- Jika koneksi gagal, ingatkan pengguna untuk membuka Stockbit Desktop via `launch-stockbit.bat` dan login.
