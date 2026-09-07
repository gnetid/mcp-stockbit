# 🤖 Stockbit Model Context Protocol (MCP) — Complete Developer & AI Reference

> **Dokumentasi referensi teknis resmi untuk seluruh 45 Tools MCP Stockbit Desktop Bridge v2.3.**  
> Dokumen ini dirancang agar pengembang aplikasi (Web/Mobile/Bot) maupun AI Assistant (Claude Desktop, Cursor, Antigravity, Gemini) dapat langsung mengonsumsi data pasar IDX, portofolio sekuritas, bandarmologi, charting multi-timeframe lengkap (Chartbit semua menit, jam, hari), laporan keuangan tabular (Financials), perbandingan peers (Comparison), konsensus analis, order queue, alert harga, portofolio obligasi/SBN, dan notifikasi akun secara presisi tanpa perlu melakukan reverse-engineering ulang.


---

## 📑 Daftar Isi

1. [Standar Envelope Response](#1-standar-envelope-response)
2. [Modul 1: Akun & Portofolio](#2-modul-1-akun--portofolio)
3. [Modul 2: Transaksi & Order Management](#3-modul-2-transaksi--order-management)
4. [Modul 3: Market Depth & Tape Reading](#4-modul-3-market-depth--tape-reading)
5. [Modul 4: Bandarmologi & Analisis Broker](#5-modul-4-bandarmologi--analisis-broker)
6. [Modul 5: Charting & Analisis Teknikal](#6-modul-5-charting--analisis-teknikal)
7. [Modul 6: Fundamental, Rasio & Konsensus Analis](#7-modul-6-fundamental-rasio--konsensus-analis)
8. [Modul 7: Profil Korporat, Insiders & Corporate Actions](#8-modul-7-profil-korporat-insiders--corporate-actions)
9. [Modul 8: Market Discovery, Screener & Community Stream](#9-modul-8-market-discovery-screener--community-stream)
10. [Modul 9: Fundamental Deep Dive, Financials & Peer Comparison](#10-modul-9-fundamental-deep-dive-financials--peer-comparison)
11. [Modul 10: Alat Tambahan, Notifikasi & Obligasi (SBN)](#11-modul-10-alat-tambahan-notifikasi--obligasi-sbn)
12. [Panduan Integrasi Aplikasi Eksternal (TypeScript / React / Python)](#12-panduan-integrasi-aplikasi-eksternal)

---

## 1. Standar Envelope Response

Setiap tool MCP mengembalikan payload JSON terstandarisasi:

```typescript
interface StockbitMcpResponse<T> {
  success: boolean;
  data: T;
  meta: {
    source: "carina" | "exodus";
    timestamp: string; // ISO-8601
    [key: string]: any;
  };
}
```

Format jika terjadi error:
```json
{
  "success": false,
  "error": {
    "tool": "stockbit_get_portfolio",
    "message": "Stockbit main page not found in running WebView2 targets.",
    "hint": "Pastikan Stockbit Desktop sedang berjalan dengan flag --remote-debugging-port=9222 dan Anda sudah login."
  }
}
```

---

## 2. Modul 1: Akun & Portofolio

### 2.1. `stockbit_get_portfolio`
- **Kegunaan**: Mengambil modal terinvestasi, kas siap pakai, floating P&L, dan rincian seluruh saham yang di-hold.
- **Parameter**: Tidak ada.
- **Host**: `https://carina.stockbit.com` (Token: `ats`)
- **Contoh Payload**:
```json
{
  "success": true,
  "data": {
    "summary": {
      "trading": { "balance": 25000000 },
      "amount": { "invested": 100000000 },
      "profit_loss": { "unrealised": 5000000 },
      "gain": 0.05
    },
    "holdings": [
      {
        "symbol": "BBCA",
        "company_name": "Bank Central Asia Tbk.",
        "quantity": 100,
        "shares": 10000,
        "avg_price": 9500,
        "current_price": 10000,
        "market_value": 100000000,
        "profit_loss": 5000000,
        "gain": 0.0526
      }
    ]
  },
  "meta": { "source": "carina", "timestamp": "2026-09-07T00:40:00Z" }
}
```

### 2.2. `stockbit_get_bank_account`
- **Kegunaan**: Mengambil detail rekening bank kustodian RDN dan saldo kas riil.
- **Parameter**: Tidak ada.
- **Host**: `https://carina.stockbit.com` (Token: `ats`)
- **Contoh Payload**:
```json
{
  "success": true,
  "data": {
    "account": {
      "rdn": {
        "name": "BCA",
        "number": "1234567890",
        "holder_name": "INVESTOR SUKSES"
      }
    },
    "balance": 25000000
  },
  "meta": { "source": "carina", "timestamp": "2026-09-07T00:40:00Z" }
}
```

### 2.3. `stockbit_get_portfolio_performance`
- **Kegunaan**: Evaluasi performa trading akun (Win Rate %, Profit Factor, Realized Gain/Loss, total dividen, saham paling aktif).
- **Parameter**: Tidak ada.
- **Host**: `https://carina.stockbit.com` (Token: `ats`)
- **Contoh Payload**:
```json
{
  "success": true,
  "data": {
    "performance_rating": {
      "win_rate": 65.0,
      "profit_factor": 1.85,
      "total_trade": "20",
      "total_win": "13",
      "total_loss": "7",
      "total_tpv": 120000000
    },
    "trade_sum": {
      "total_realized": 10000000,
      "realized_gain": 15000000,
      "realized_loss": -5000000,
      "total_dividend_received": 1500000
    },
    "most_traded_stocks": [
      { "symbol": "BBCA", "total_trade": "8", "trade_performance": { "amount": 5000000, "percentage": 5.0 } }
    ]
  },
  "meta": { "source": "carina", "timestamp": "2026-09-07T00:40:00Z" }
}
```

### 2.4. `stockbit_get_portfolio_returns`
- **Kegunaan**: Riwayat return portofolio harian kumulatif (%) akun pengguna vs indeks acuan IHSG.
- **Parameter**: Tidak ada.
- **Host**: `https://carina.stockbit.com` (Token: `ats`)
- **Contoh Payload**:
```json
{
  "success": true,
  "data": {
    "percentage": 10.50,
    "portfolio_returns": [
      { "date": "2026-09-01T17:00:00Z", "percentage": 0.50, "cumulative_return": 10.00 },
      { "date": "2026-09-02T17:00:00Z", "percentage": 0.50, "cumulative_return": 10.50 }
    ]
  },
  "meta": { "source": "carina", "timestamp": "2026-09-07T00:40:00Z" }
}
```

### 2.5. `stockbit_get_sub_accounts`
- **Kegunaan**: Daftar rekening sub-account sekuritas (Reguler, Margin, Day Trading).
- **Parameter**: Tidak ada.
- **Host**: `https://carina.stockbit.com` (Token: `ats`)
- **Contoh Payload**:
```json
{
  "success": true,
  "data": [
    {
      "sub_account_id": "SUB-REG-001",
      "account_type": "REGULAR",
      "status": "ACTIVE",
      "trading_limit": 50000000
    }
  ],
  "meta": { "source": "carina" }
}
```

---

## 3. Modul 2: Transaksi & Order Management

### 3.1. `stockbit_get_orders`
- **Kegunaan**: Mengambil antrean order bursa hari ini dengan status OPEN, MATCHED, PARTIAL, atau REJECTED.
- **Parameter**: Tidak ada.
- **Host**: `https://carina.stockbit.com` (Token: `ats`)
- **Contoh Payload**:
```json
{
  "success": true,
  "data": [
    {
      "order_id": "ORD-20260907-0001",
      "symbol": "BBCA",
      "action": "BUY",
      "price": 10000,
      "lot": 10,
      "shares": 1000,
      "status": "OPEN",
      "date": "07 Sep 2026",
      "time": "09:05:00"
    }
  ],
  "meta": { "source": "carina" }
}
```

### 3.2. `stockbit_get_order_history`
- **Kegunaan**: Riwayat transaksi lampau lengkap (matched orders, fee bursa/broker, realized gain/loss, dividen, dan mutasi kas).
- **Parameter**:
  - `page` *(number, opsional, default 1)*
  - `limit` *(number, opsional, default 50)*
  - `period` *(string, opsional: "all", "1m", "3m", "1y", default "all")*
- **Contoh Payload Item**:
```json
{
  "command": "BUY",
  "symbol": "BBCA",
  "price": 9800,
  "lot": 10,
  "shares": 1000,
  "amount": 9800000,
  "fee": 14700,
  "netamount": 9814700,
  "status": "MATCH",
  "realized_amount": 0,
  "realized_percentage": 0,
  "date": "01 Sep 2026",
  "time": "09:30:15"
}
```

---

## 4. Modul 3: Market Depth & Tape Reading

### 4.1. `stockbit_get_orderbook`
- **Kegunaan**: Kedalaman pasar 10-20 level Bid & Offer dengan queue & volume lot.
- **Parameter**:
  - `symbol` *(string, wajib, contoh: "BBCA")*
- **Contoh Payload**:
```json
{
  "success": true,
  "data": {
    "symbol": "BBCA",
    "average": 10185,
    "bid": [
      { "price": 10200, "volume": 12450, "que_num": 42 },
      { "price": 10175, "volume": 35000, "que_num": 88 }
    ],
    "offer": [
      { "price": 10225, "volume": 8900, "que_num": 25 },
      { "price": 10250, "volume": 41200, "que_num": 110 }
    ]
  },
  "meta": { "source": "exodus", "symbol": "BBCA" }
}
```

### 4.2. `stockbit_get_tradebook`
- **Kegunaan**: Rincian transaksi terlaksana di setiap baris harga (matched buy lot vs sell lot, dominasi buyer vs seller %, big money).
- **Parameter**:
  - `symbol` *(string, wajib, contoh: "BBCA")*
- **Contoh Payload**:
```json
{
  "success": true,
  "data": {
    "book": [
      {
        "price": "6,850",
        "buy": { "lot": "235", "frequency": "12", "value": "160.98M" },
        "sell": { "lot": "-", "frequency": "-", "value": "-" }
      }
    ],
    "book_total": {
      "buy_lot": "388,666",
      "sell_lot": "550,569",
      "buy_percentage": "41%",
      "sell_percentage": "59%",
      "buy_value": "262.80B",
      "sell_value": "371.42B"
    }
  }
}
```

### 4.3. `stockbit_get_trade_flow`
- **Kegunaan**: Mengambil time-series aliran transaksi per menit (**Trade Flow Chart**) bursa IDX live: pergerakan frekuensi, lot, dan value (Rp) Beli vs Jual menit-per-menit, serta aliran transaksi *Big Money* (transaksi paus/institusi).
- **Parameter**:
  - `symbol` *(string, wajib, contoh: "BBCA")*
  - `time_interval` *(string, opsional: "1m", "5m", default "1m")*
- **Host**: `https://exodus.stockbit.com` (Token: `at`)
- **Contoh Payload**:
```json
{
  "success": true,
  "data": {
    "symbol": "BBCA",
    "time_interval": "1m",
    "trade_flow": {
      "buy": [
        {
          "time": "09:00",
          "lot": { "raw": "19564", "formatted": "19,564" },
          "value": { "raw": "13314125000", "formatted": "13.31B" },
          "frequency": { "raw": "712", "formatted": "712" }
        },
        {
          "time": "09:01",
          "lot": { "raw": "25043", "formatted": "25,043" },
          "value": { "raw": "16980000000", "formatted": "16.98B" },
          "frequency": { "raw": "970", "formatted": "970" }
        }
      ],
      "sell": [
        {
          "time": "09:00",
          "lot": { "raw": "12100", "formatted": "12,100" },
          "value": { "raw": "8240100000", "formatted": "8.24B" },
          "frequency": { "raw": "480", "formatted": "480" }
        }
      ]
    },
    "running_trade_chart": {
      "big_money_flow": [
        { "time": "09:05", "action": "BUY", "lot": 5000, "broker": "YU" }
      ]
    }
  },
  "meta": { "source": "exodus", "symbol": "BBCA", "time_interval": "1m" }
}
```

### 4.4. `stockbit_get_running_trade`
- **Kegunaan**: Pita rekaman transaksi live bursa IDX dengan kode broker pembeli & penjual, penanda Asing/Lokal, papan RG/NG.
- **Parameter**:
  - `limit` *(number, default 80)*
  - `symbol` *(string, opsional)*
  - `action_type` *(string: "ALL", "BUY", "SELL")*
  - `market_board` *(string: "ALL", "RG", "NG")*
- **Contoh Item**:
```json
{
  "time": "16:27:05",
  "action": "buy",
  "code": "BBCA",
  "price": "6,775",
  "lot": "0.14",
  "buyer": "AK [F]",
  "seller": "AK [F]",
  "market_board": "NG",
  "buyer_type": "BROKER_TYPE_FOREIGN",
  "seller_type": "BROKER_TYPE_FOREIGN"
}
```

### 4.5. `stockbit_get_quote`
- **Kegunaan**: Profil ringkas emiten, keanggotaan indeks, batas ARA/ARB, dan tick harga.
- **Parameter**: `symbol` *(string, wajib)*

### 4.6. `stockbit_get_market_session`
- **Kegunaan**: Status jam bursa IDX terkini (`STATE_NAME_MARKET_OPEN`, `STATE_NAME_BREAK`, `STATE_NAME_PRE_CLOSING`, `STATE_NAME_MARKET_CLOSED`).
- **Parameter**: Tidak ada.

---

## 5. Modul 4: Bandarmologi & Analisis Broker

### 5.1. `stockbit_get_broker_summary`
- **Kegunaan**: Mengambil **tabel murni Broker Summary** (ranking Buyer vs Seller broker teratas) untuk hari ini atau rentang tanggal tertentu, lengkap dengan volume lot, value (Rp), average price, identifikasi Asing/Lokal, dan status bandarmologi.
- **Parameter**:
  - `symbol` *(string, wajib, contoh: "BBCA")*
  - `from_date` *(string YYYY-MM-DD, opsional)*
  - `to_date` *(string YYYY-MM-DD, opsional)*
- **Host**: `https://exodus.stockbit.com` (Token: `at`)
- **Contoh Payload**:
```json
{
  "success": true,
  "data": {
    "symbol": "BBCA",
    "from": "2026-09-04",
    "to": "2026-09-04",
    "bandar_detector_stance": "Dist",
    "average_price": 6748.18,
    "total_buyer_brokers": 36,
    "total_seller_brokers": 34,
    "total_value": 284868300000,
    "total_volume": 422141,
    "top_buyers": [
      {
        "broker_code": "YU",
        "type": "Asing",
        "lot": 205265,
        "value": 138568207500,
        "avg_price": 6747.70,
        "frequency": 2470
      },
      {
        "broker_code": "SQ",
        "type": "Lokal",
        "lot": 46485,
        "value": 31365852500,
        "avg_price": 6759.80,
        "frequency": 1210
      }
    ],
    "top_sellers": [
      {
        "broker_code": "RX",
        "type": "Asing",
        "lot": 150000,
        "value": 101250000000,
        "avg_price": 6750.00,
        "frequency": 1820
      }
    ]
  },
  "meta": { "source": "exodus", "symbol": "BBCA" }
}
```

### 5.2. `stockbit_get_broker_distribution`
- **Kegunaan**: Mengambil **matrix Broker Distribution** bursa IDX live: pemetaan broker pembeli mana yang menyerap saham dari broker penjual mana, dikelompokkan secara terpisah berdasarkan nilai transaksi (`by_value`) dan volume lot (`by_volume`).
- **Parameter**:
  - `symbol` *(string, wajib, contoh: "BBCA")*
- **Host**: `https://exodus.stockbit.com` (Token: `at`)
- **Contoh Payload**:
```json
{
  "success": true,
  "data": {
    "date_info": "2026-09-04",
    "by_value": {
      "top_broker_buy": [
        {
          "detail": { "code": "YU", "type": "Asing", "amount": 154039777500 },
          "distribute_to": [
            { "code": "RX", "type": "Asing", "amount": 33830462500 },
            { "code": "CC", "type": "Pemerintah", "amount": 23468005000 },
            { "code": "AK", "type": "Asing", "amount": 21010560000 }
          ]
        }
      ]
    },
    "by_volume": {
      "top_broker_buy": [
        {
          "detail": { "code": "YU", "type": "Asing", "lot": 228207 },
          "distribute_to": [
            { "code": "RX", "type": "Asing", "lot": 50119 },
            { "code": "CC", "type": "Pemerintah", "lot": 34767 }
          ]
        }
      ]
    }
  },
  "meta": { "source": "exodus", "symbol": "BBCA" }
}
```

### 5.3. `stockbit_get_broker_flow`
- **Kegunaan**: Melacak **visualisasi perputaran aliran dana broker tertentu (Broker Flow)**: ke saham IDX apa saja broker tersebut memutar dananya (net buy/sell, turnover value, dan visualisasi time-series).
- **Parameter**:
  - `broker_code` *(string, wajib, contoh: "YU", "AK", "ZP", "CC", "PD")*
- **Host**: `https://exodus.stockbit.com` (Token: `at`)
- **Contoh Payload**:
```json
{
  "success": true,
  "data": {
    "broker_code": "YU",
    "activity": {
      "from": "2026-09-04",
      "to": "2026-09-04",
      "chart_data": [
        {
          "type": "TYPE_CHART_VALUE",
          "symbols": ["BBCA", "BBRI", "BMRI", "BULL", "ASII", "TINS"],
          "charts": [
            {
              "symbol": "BMRI",
              "chart": [
                {
                  "date": "2026-09-04",
                  "time": "09:00",
                  "value": { "raw": "1432575000", "formatted": "1.43B" }
                }
              ]
            }
          ]
        }
      ]
    }
  },
  "meta": { "source": "exodus", "broker_code": "YU" }
}
```

### 5.4. `stockbit_get_foreign_flow`
- **Kegunaan**: Analisis komprehensif **aliran modal investor asing (Foreign Flow)**: riwayat harian Foreign Buy, Foreign Sell, Net Foreign, akumulasi kumulatif, Foreign Stance (Akumulasi vs Distribusi Asing), dan persentase partisipasi asing terhadap turnover bursa (% Foreign Participation).
- **Parameter**:
  - `symbol` *(string, wajib, contoh: "BBCA")*
  - `days` *(number, opsional, default 30)*
- **Host**: `https://exodus.stockbit.com` (Token: `at`)
- **Contoh Payload**:
```json
{
  "success": true,
  "data": {
    "symbol": "BBCA",
    "analyzed_days": 15,
    "period": "2026-08-20 s/d 2026-09-07",
    "cumulative_net_foreign": 297990577500,
    "foreign_stance": "NET ACCUMULATION (Asing Net Buy)",
    "foreign_participation_rate": "57.52%",
    "total_foreign_buy": 1363857417500,
    "total_foreign_sell": 1065866840000,
    "daily_history": [
      {
        "date": "2026-09-04",
        "close": 6700,
        "foreign_buy": 324334220000,
        "foreign_sell": 387920965000,
        "net_foreign": -63586745000,
        "foreign_flow_cumulative": 4768725666990
      },
      {
        "date": "2026-09-03",
        "close": 6775,
        "foreign_buy": 514617230000,
        "foreign_sell": 395120000000,
        "net_foreign": 119497230000,
        "foreign_flow_cumulative": 4832312411990
      }
    ]
  },
  "meta": { "source": "exodus", "symbol": "BBCA", "days": 15 }
}
```

### 5.5. `stockbit_get_bandar_detector`
- **Kegunaan**: Analisis Bandarmologi komprehensif untuk **rentang tanggal kustom** (`from_date` dan `to_date`).
- **Parameter**:
  - `symbol` *(string, wajib)*
  - `from_date` *(string YYYY-MM-DD, opsional)*
  - `to_date` *(string YYYY-MM-DD, opsional)*
- **Contoh Payload**:
```json
{
  "success": true,
  "data": {
    "bandar_detector": {
      "broker_accdist": "Acc",
      "average": 6748.18,
      "top1": { "accdist": "Small Acc", "amount": 25543207000, "percent": 8.97, "vol": 37852 },
      "top3": { "accdist": "Small Dist", "amount": -33765190000, "percent": -11.85, "vol": -50036 },
      "total_buyer": 36,
      "total_seller": 34,
      "value": 284868300000,
      "volume": 422141
    },
    "broker_summary": {
      "brokers_buy": [
        { "netbs_broker_code": "YU", "type": "Asing", "blot": "205265", "bval": "1.385e+11", "netbs_buy_avg_price": "6747.7" }
      ],
      "brokers_sell": [
        { "netbs_broker_code": "RX", "type": "Asing", "slot": "150000", "sval": "1.012e+11", "netbs_sell_avg_price": "6750.0" }
      ]
    }
  }
}
```

### 5.6. `stockbit_get_broker_activity_historical`
- **Kegunaan**: Riwayat aktivitas akumulasi broker untuk rentang tanggal tertentu.
- **Parameter**: `symbol`, `from_date`, `to_date`.

### 5.7. `stockbit_get_foreign_domestic_flow`
- **Kegunaan**: Rincian arus transaksi Asing vs Domestik (Gross buy/sell, Net buy/sell).
- **Parameter**: `symbol` *(string, wajib)*

### 5.8. `stockbit_get_broker_list`
- **Kegunaan**: Master direktori seluruh kode broker bursa IDX (kode, nama sekuritas, kelompok Asing/Lokal, izin).
- **Parameter**: `limit` *(default 100)*, `page` *(default 1)*.

### 5.9. `stockbit_get_top_brokers`
- **Kegunaan**: Top broker pembeli dan penjual saham tertentu hari ini.
- **Parameter**: `symbol` *(string, wajib)*.

---

## 6. Modul 5: Charting & Analisis Teknikal

### 6.1. `stockbit_get_chart_data`
- **Kegunaan**: Candlestick harian OHLCV, volume, frekuensi, akumulasi Foreign Flow, dan Frequency Analyzer.
- **Parameter**:
  - `symbol` *(string, wajib)*
  - `start_date` *(string YYYY-MM-DD, opsional)*
  - `end_date` *(string YYYY-MM-DD, opsional)*
- **Contoh Bar**:
```json
{
  "date": "2024-12-30",
  "open": 9800,
  "high": 9825,
  "low": 9675,
  "close": 9675,
  "volume": 56350100,
  "lot": 563501,
  "net_foreign": -38795600000,
  "foreign_flow": 4768725666990,
  "freq_analyzer": 5.81
}
```

### 6.2. `stockbit_get_intraday`
- **Kegunaan**: Candlestick intraday 1 menit atau 60 menit.
- **Parameter**: `symbol`, `multiplier` (1 atau 60).

### 6.3. `stockbit_get_price_performance`
- **Kegunaan**: Return multi-timeframe lengkap (1D, 1W, 1M, 3M, 6M, YTD, 1Y, 3Y, 5Y, 10Y) dengan harga High & Low.
- **Parameter**: `symbol` *(string, wajib)*.

### 6.4. `stockbit_get_historical_data`
- **Kegunaan**: Mengambil data **tabel historis lengkap** sesuai tab **"Historical Data"** di Stockbit Desktop: Open, High, Low, Close, Average Price, Change (Rp), Change (%), Volume (lot), Turnover Value (Rp), Frequency, Foreign Buy (Rp), Foreign Sell (Rp), dan Net Foreign (Rp) per hari perdagangan.
- **Parameter**:
  - `symbol` *(string, wajib, contoh: "BBCA")*
  - `page` *(number, opsional, default 1)*
  - `limit` *(number, opsional, default 50)*
- **Host**: `https://exodus.stockbit.com` (Token: `at`)
- **Contoh Payload**:
```json
{
  "success": true,
  "data": {
    "result": [
      {
        "date": "2026-09-04",
        "open": 6800,
        "high": 6850,
        "low": 6675,
        "close": 6700,
        "average": 6753,
        "change": -75,
        "change_percentage": -1.11,
        "volume": 939235,
        "value": 634219732500,
        "frequency": 24606,
        "foreign_buy": 324334220000,
        "foreign_sell": 387920965000,
        "net_foreign": -63586745000
      },
      {
        "date": "2026-09-03",
        "open": 6700,
        "high": 6825,
        "low": 6650,
        "close": 6775,
        "average": 6718,
        "change": 100,
        "change_percentage": 1.50,
        "volume": 1123299,
        "value": 754664312500,
        "frequency": 31036,
        "foreign_buy": 514617230000,
        "foreign_sell": 395120000000,
        "net_foreign": 119497230000
      }
    ]
  },
  "meta": { "source": "exodus", "symbol": "BBCA", "page": 1, "limit": 50 }
}
```

### 6.5. `stockbit_get_chartbit`
- **Kegunaan**: Mesin candlestick Chartbit **LENGKAP untuk SEMUA timeframe**:
  - **Semua Menit**: `1m`, `3m`, `5m`, `10m`, `15m`, `30m`, `45m` (agregasi intraday presisi standar TradingView).
  - **Semua Jam**: `1h` (`60m`), `2h` (`120m`), `3h` (`180m`), `4h` (`240m`) (multi-hour candle).
  - **Semua Hari & Makro**: `1D` (Harian), `1W` (Mingguan), `1M` (Bulanan).
- **Kaya Indikator per Bar**:
  - `open`, `high`, `low`, `close`
  - `volume`, `lot`
  - `value` (Turnover nilai transaksi rupiah)
  - `frequency` (Jumlah transaksi matched)
  - `foreign_buy`, `foreign_sell`, `net_foreign` (Arus akumulasi modal asing)
- **Ringkasan Analitik (`summary`)**:
  - `highest_price`, `lowest_price`, `first_open`, `last_close`
  - `price_change` & `price_change_percentage`
  - `total_volume`, `total_turnover_value`, `total_net_foreign`
  - `foreign_stance` (`NET ACCUMULATION` vs `NET DISTRIBUTION`)
- **Parameter**:
  - `symbol` *(string, wajib)*: Kode saham IDX, contoh: `BBCA`, `TLKM`, `ASII`.
  - `timeframe` *(string, opsional, default "1D")*: Pilihan resolusi: `'1m'`, `'3m'`, `'5m'`, `'10m'`, `'15m'`, `'30m'`, `'45m'`, `'1h'`, `'2h'`, `'3h'`, `'4h'`, `'1D'`, `'1W'`, `'1M'`.
  - `range` *(string, opsional)*: Preset rentang waktu: `'1D'`, `'5D'`, `'1M'`, `'3M'`, `'6M'`, `'1Y'`, `'3Y'`, `'5Y'`, `'MAX'`.
  - `from` *(string, opsional)*: Tanggal awal `YYYY-MM-DD` atau unix timestamp detik.
  - `to` *(string, opsional)*: Tanggal akhir `YYYY-MM-DD` atau unix timestamp detik.
- **Host**: `https://exodus.stockbit.com` (Token: `at`)
- **Contoh Payload**:
```json
{
  "success": true,
  "data": {
    "symbol": "BBCA",
    "timeframe": "15m",
    "resolution_type": "minute",
    "total_bars": 68,
    "period_start": "2026-08-31 09:00:00",
    "period_end": "2026-09-04 16:00:00",
    "summary": {
      "highest_price": 6850,
      "lowest_price": 6600,
      "first_open": 6675,
      "last_close": 6700,
      "price_change": 25,
      "price_change_percentage": "+0.37%",
      "total_volume": 42100000,
      "total_turnover_value": 283500000000,
      "total_net_foreign": 14500000000,
      "foreign_stance": "NET ACCUMULATION (Net Buy)"
    },
    "bars": [
      {
        "datetime": "2026-09-04 16:00:00",
        "timestamp": 1788512400,
        "open": 6700,
        "high": 6700,
        "low": 6700,
        "close": 6700,
        "volume": 8338000,
        "lot": 83380,
        "value": 55864600000,
        "frequency": 1420,
        "foreign_buy": 32500000000,
        "foreign_sell": 18200000000,
        "net_foreign": 14300000000
      }
    ]
  },
  "meta": { "source": "exodus", "symbol": "BBCA", "timeframe": "15m", "range": "5D" }
}
```

---


## 7. Modul 6: Fundamental, Rasio & Konsensus Analis

### 7.1. `stockbit_get_keystats`
- **Kegunaan**: Rasio keuangan fundamental lengkap terkini terbagi per grup rapi:
  - `Current Valuation`: PE, PBV, PS, PCF, EV/EBITDA, EV/EBIT, PEG Ratio.
  - `Per Share`: EPS TTM, Revenue/Share, Cash/Share, BVPS, FCF/Share.
  - `Solvency`: DER, Quick Ratio, Current Ratio, Debt/Assets, Altman Z-Score, NPL, CAR, LDR.
  - `Management Effectiveness`: ROA, ROE, ROCE, ROIC, CASA, Asset Turnover.
  - `Profitability`: NIM, GPM, OPM, NPM.
- **Parameter**: `symbol` *(string, wajib)*.

### 7.2. `stockbit_get_keystats_history`
- **Kegunaan**: Deret waktu 10 tahun rasio keuangan historis untuk evaluasi valuasi historis (PE/PBV Band).
- **Parameter**: `symbol`, `year_limit` *(default 10)*.

### 7.3. `stockbit_get_seasonality`
- **Kegunaan**: Analisis musiman bulanan saham selama 5-10 tahun: probabilitas naik (%) dan rata-rata persentase return per bulan (Jan-Des).
- **Parameter**: `symbol`, `year`, `back_year`.
- **Contoh Payload**:
```json
{
  "price_change": {
    "Jan": 1.85,
    "Feb": -0.50,
    "Dec": 3.40
  },
  "prob": {
    "Jan": "60.00%",
    "Dec": "80.00%"
  }
}
```

### 7.4. `stockbit_get_analyst_consensus`
- **Kegunaan**: Konsensus analis sekuritas profesional: target harga (Mean, High, Low) dan breakdown rekomendasi (Buy, Hold, Sell).
- **Parameter**: `symbol` *(string, wajib)*.

---

## 8. Modul 7: Profil Korporat, Insiders & Corporate Actions

### 8.1. `stockbit_get_company_profile`
- **Kegunaan**: Profil korporat lengkap:
  - `key_executive`: Dewan Direksi & Komisaris
  - `shareholder`: Pemegang Saham >5%
  - `shareholder_one_percent`: Pemegang Saham >1%
  - `subsidiary`: Anak Perusahaan
  - `beneficiary`: Pemilik Manfaat Akhir (Ultimate Beneficial Owner)
  - `listing_information`: Tanggal IPO, Underwriter, Lembar Saham Beredar, Sektor & Industri.
- **Parameter**: `symbol` *(string, wajib)*.

### 8.2. `stockbit_get_insider_transactions`
- **Kegunaan**: Transaksi orang dalam (Insider Activity) jual/beli saham oleh Direksi, Komisaris, atau Pemegang Saham Pengendali.
- **Parameter**: `symbol`, `page` *(default 1)*.

### 8.3. `stockbit_get_shareholder_composition`
- **Kegunaan**: Komposisi kepemilikan saham (Institusi Asing vs Domestik vs Ritel) dari waktu ke waktu.
- **Parameter**: `symbol` *(string, wajib)*.

### 8.4. `stockbit_get_corporate_actions`
- **Kegunaan**: Seluruh aksi korporasi emiten: Dividen tunai (Cum date, Ex date, Payment date, DPS), Stock Split, Rights Issue, Waran, dan jadwal RUPS.
- **Parameter**: `symbol` *(string, wajib)*.

---

## 9. Modul 8: Market Discovery, Screener & Community Stream

### 9.1. `stockbit_get_market_movers`
- **Kegunaan**: Saham penggerak pasar bursa:
  - `top_gainer`, `top_loser`, `top_volume`, `top_value`, `top_frequency`, `most_active`, `top_net_foreign_buy`, `top_net_foreign_sell`.
- **Parameter**: `category` *(default "top_gainer")*.

### 9.2. `stockbit_get_top_stocks`
- **Kegunaan**: Saham teratas berdasarkan perputaran transaksi asing dan turnover value.
- **Parameter**: `type` ("value", "volume", "frequency").

### 9.3. `stockbit_get_screener_presets`
- **Kegunaan**: Katalog template screener Stockbit: Guru Screener (Buffettology, Ben Graham, CAN-SLIM, Magic Formula, Peter Lynch), Momentum Screener, dan Valuation Screener.
- **Parameter**: Tidak ada.

### 9.4. `stockbit_get_stream`
- **Kegunaan**: Mengambil postingan feed diskusi media sosial **Stockbit Stream** dari komunitas investor & trader. Dapat mengambil diskusi untuk emiten spesifik (misal: "BBCA", "BBRI", "AMMN") atau timeline umum bursa menggunakan kode indeks `"IHSG"`.
- **Parameter**:
  - `symbol` *(string, wajib)*: Kode saham (contoh: "BBCA", "BBRI") atau "IHSG" untuk timeline bursa umum.
  - `limit` *(number, opsional, default 20)*: Jumlah postingan yang diambil.
- **Host**: `https://exodus.stockbit.com` (Token: `at`)
- **Contoh Payload**:
```json
{
  "success": true,
  "data": [
    {
      "id": 14209512,
      "user": {
        "username": "investor_cerdas",
        "name": "Budi Santoso",
        "avatar": "https://assets.stockbit.com/avatars/user123.jpg",
        "verified": true
      },
      "content": "Akumulasi YU dan RX di $BBCA hari ini luar biasa tebal, net buy tembus Rp297B. Support kuat di 6700 terjaga.",
      "sentiment": "BULLISH",
      "likes_count": 84,
      "comments_count": 19,
      "created_at": "2026-09-04T15:45:10Z"
    }
  ],
  "meta": { "source": "exodus", "symbol": "BBCA", "limit": 20 }
}
```

### 9.5. `stockbit_get_trending`
- **Kegunaan**: Saham yang paling ramai dicari dan diperbincangkan saat ini di Stockbit.
- **Parameter**: Tidak ada.

### 9.6. `stockbit_get_watchlist`
- **Kegunaan**: Saham dalam watchlist pantauan pengguna beserta update harga real-time.
- **Parameter**: `limit` *(default 50)*.
- **Host**: `https://exodus.stockbit.com` (Token: `at`)
- **Contoh Payload**:
```json
{
  "success": true,
  "data": [
    {
      "symbol": "BBCA",
      "company_name": "Bank Central Asia Tbk.",
      "price": 10200,
      "change": 150,
      "percentage": 1.49
    },
    {
      "symbol": "TLKM",
      "company_name": "Telkom Indonesia Tbk.",
      "price": 3100,
      "change": -20,
      "percentage": -0.64
    }
  ],
  "meta": { "source": "exodus", "watchlist_id": 1234567 }
}
```

### 9.7. `stockbit_search_emiten`
- **Kegunaan**: Pencarian kode ticker, nama perusahaan, sektor, dan orang dalam di bursa IDX.
- **Parameter**: `query` *(string, wajib)*, `type` *(opsional, default "company")*.

---

## 10. Modul 9: Fundamental Deep Dive, Financials & Peer Comparison

### 10.1. `stockbit_get_financials`
- **Kegunaan**: Mengambil Laporan Keuangan lengkap (*Financial Statements*) emiten:
  - **Laba Rugi (*Income Statement*)**: Revenue, Cost of Goods Sold, Gross Profit, Operating Expenses, Operating Profit, Net Income, EPS.
  - **Neraca (*Balance Sheet*)**: Total Assets, Current Assets, Cash & Equivalents, Total Liabilities, Short/Long-Term Debt, Total Equity.
  - **Arus Kas (*Cash Flow*)**: Cash Flow from Operating Activities, Investing Activities, Financing Activities, Net Change in Cash.
- **Parameter**:
  - `symbol` *(string, wajib)*: Kode saham IDX, contoh: `BBCA`, `TLKM`, `ASII`.
  - `statement_type` *(string, opsional, default "income_statement")*: Pilihan `income_statement`, `balance_sheet`, atau `cash_flow`.
  - `report_type` *(string, opsional, default "quarterly")*: Pilihan `quarterly` (kuartalan), `annual` (tahunan), atau `ttm` (trailing twelve months).
  - `limit` *(number, opsional, default 12)*: Jumlah periode terbaru yang ingin diambil (maksimal hingga 74 periode historis).
- **Host**: `https://exodus.stockbit.com` (Token: `at`)
- **Contoh Payload**:
```json
{
  "success": true,
  "data": {
    "symbol": "BBCA",
    "statement_type": "income_statement",
    "report_type": "quarterly",
    "currency": "IDR",
    "total_periods_available": 74,
    "periods_returned": 4,
    "periods": ["Q325", "Q425", "Q126", "Q226"],
    "accounts": [
      {
        "name_en": "Total Revenue",
        "name_id": "Total Pendapatan",
        "is_header": true,
        "values": {
          "Q325": 30875157000000,
          "Q425": 27144302000000,
          "Q126": 29653619000000,
          "Q226": 32493339000000
        }
      },
      {
        "name_en": "Net Income",
        "name_id": "Laba Bersih",
        "is_header": false,
        "values": {
          "Q325": 14205000000000,
          "Q425": 13980000000000,
          "Q126": 14500000000000,
          "Q226": 15120000000000
        }
      }
    ]
  },
  "meta": { "source": "exodus", "symbol": "BBCA", "statement_type": "income_statement", "report_type": "quarterly", "limit": 4 }
}
```

### 10.2. `stockbit_get_comparison`
- **Kegunaan**: Perbandingan fundamental emiten secara *side-by-side* terhadap peers kompetitor langsung di subsektor yang sama, rasio valuasi perbandingan (PE, PBV, ROE, NPM, DER, dll.), serta benchmark rata-rata industri (*industry average*) dan rata-rata sektor (*sector average*).
- **Parameter**:
  - `symbol` *(string, wajib)*: Kode saham IDX, contoh: `BBCA`, `TLKM`.
  - `include_peers` *(boolean, opsional, default true)*: Mengikutsertakan rasio dari 3-4 peers kompetitor utama secara otomatis.
- **Host**: `https://exodus.stockbit.com` (Token: `at`)
- **Contoh Payload**:
```json
{
  "success": true,
  "data": {
    "symbol": "BBCA",
    "competitors": ["BBRI", "BMRI", "BBNI"],
    "comparison_metrics_count": 66,
    "comparison_table": [
      {
        "fitem_id": 12148,
        "metric": "Current PE Ratio (Annualised)",
        "category": "Current Valuation",
        "BBCA": "13.98",
        "BBRI": "8.32",
        "BMRI": "6.78",
        "BBNI": "6.83",
        "industry_avg": "12.44",
        "sector_avg": "15.09"
      },
      {
        "fitem_id": 2896,
        "metric": "Price to Book Value (Quarter)",
        "category": "Current Valuation",
        "BBCA": "3.05",
        "BBRI": "1.89",
        "BMRI": "1.74",
        "BBNI": "1.08",
        "industry_avg": "1.92",
        "sector_avg": "2.10"
      }
    ]
  },
  "meta": { "source": "exodus", "symbol": "BBCA", "include_peers": true }
}
```

### 10.3. `stockbit_get_analysis`
- **Kegunaan**: Analisis konsensus target harga analis Wall St / Sekuritas profesional yang meng-cover saham:
  - Consensus Target Price (Best/Median Target, Lowest Target, Highest Target)
  - Current Market Price & Upside Potential (%)
  - Breakdown rekomendasi analis: Buy, Hold, Sell, dan Total Analis yang meng-cover.
  - Proyeksi kinerja keuangan tahun mendatang (Revenue, Operating Profit, Net Income, EPS).
- **Parameter**:
  - `symbol` *(string, wajib)*: Kode saham IDX, contoh: `BBCA`, `TLKM`, `ASII`.
- **Host**: `https://exodus.stockbit.com` (Token: `at`)
- **Contoh Payload**:
```json
{
  "success": true,
  "data": {
    "symbol": "BBCA",
    "recommendation": "Buy",
    "consensus_target_price": 8143,
    "current_price": 6700,
    "upside_potential": "+21.54%",
    "price_target_range": {
      "low": 6500,
      "median": 8143,
      "high": 10100
    },
    "ratings_breakdown": {
      "buy": 35,
      "hold": 2,
      "sell": 0,
      "total_analysts": 37
    },
    "last_updated": "07 Sep 26",
    "forecasts": [
      { "name": "Revenue", "items": [...] },
      { "name": "Net Income", "items": [...] }
    ]
  },
  "meta": { "source": "exodus", "symbol": "BBCA" }
}
```

---

## 11. Modul 10: Alat Tambahan, Notifikasi & Obligasi (SBN)

### 11.1. `stockbit_get_order_queue`
- **Kegunaan**: Mengambil antrean order transaksi bursa pengguna pada level harga tertentu untuk saham IDX spesifik: nomor antrean, rincian order, dan status sesi pasar.
- **Parameter**:
  - `symbol` *(string, wajib)*: Kode saham IDX, contoh: `BBCA`, `TLKM`.
- **Host**: `https://exodus.stockbit.com` (Token: `at`)
- **Contoh Payload**:
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "price": 10200,
        "queue_number": 14,
        "lot": 20,
        "side": "BUY",
        "status": "QUEUE"
      }
    ],
    "is_open_market": true,
    "pagination": { "has_next_page": false }
  },
  "meta": { "source": "exodus", "symbol": "BBCA" }
}
```

### 11.2. `stockbit_get_price_alerts`
- **Kegunaan**: Mengambil daftar seluruh alert dan pengingat target harga (Price Alerts) yang sedang aktif atau pernah dipasang oleh pengguna di Stockbit.
- **Parameter**: Tidak ada.
- **Host**: `https://exodus.stockbit.com` (Token: `at`)
- **Contoh Payload**:
```json
{
  "success": true,
  "data": [
    {
      "id": 105234,
      "symbol": "BBCA",
      "target_price": 10500,
      "condition": "GREATER_THAN_OR_EQUAL",
      "status": "ACTIVE",
      "created_at": "2026-09-01T08:30:00Z"
    }
  ],
  "meta": { "source": "exodus" }
}
```

### 11.3. `stockbit_get_chart_layouts`
- **Kegunaan**: Mengambil daftar layout chart TradingView Stockbit yang disimpan pengguna: nama layout chart, simbol emiten acuan, resolusi waktu candle, dan tanggal modifikasi.
- **Parameter**: Tidak ada.
- **Host**: `https://exodus.stockbit.com` (Token: `at`)
- **Contoh Payload**:
```json
{
  "success": true,
  "data": [
    {
      "id": "layout-std-001",
      "name": "STANDARD_SETUP",
      "symbol": "BBCA",
      "resolution": "15",
      "timestamp": "2026-09-07T08:00:00Z"
    }
  ],
  "meta": { "source": "exodus" }
}
```

### 11.4. `stockbit_get_bond_portfolio`
- **Kegunaan**: Mengambil portofolio investasi Obligasi dan Surat Berharga Negara (SBN seperti ORI, SR, FR, PBS) di akun sekuritas: modal terinvestasi, nilai pasar, kupon bunga berjalan (*accrued interest*), dan proyeksi return.
- **Parameter**: Tidak ada.
- **Host**: `https://carina.stockbit.com` (Token: `ats`)
- **Contoh Payload**:
```json
{
  "success": true,
  "data": {
    "invested_amount": 50000000,
    "market_value": 51250000,
    "accrued_interest": 425000,
    "total_portfolio": 51675000,
    "yield_rate": 6.85,
    "portfolios": [
      {
        "series": "ORI025",
        "units": "50",
        "invested": 50000000,
        "market_price": 102.5,
        "coupon_rate": 6.85
      }
    ]
  },
  "meta": { "source": "carina" }
}
```

### 11.5. `stockbit_get_notifications`
- **Kegunaan**: Mengambil feed notifikasi akun bursa: dividen masuk, matched order, post alerts dari investor yang diikuti, serta jumlah total notifikasi yang belum dibaca (*unread count*).
- **Parameter**:
  - `limit` *(number, opsional, default 20)*: Jumlah notifikasi yang diambil.
- **Host**: `https://exodus.stockbit.com` (Token: `at`)
- **Contoh Payload**:
```json
{
  "success": true,
  "data": {
    "unread_count": 0,
    "notifications": [
      {
        "id": 86602769,
        "type": "NOTIF_TYPE_CORPORATE_ACTION",
        "message": "Dividen tunai interim BBCA sebesar Rp 45/lembar telah efektif dibayarkan ke saldo RDN.",
        "created": "2026-09-06T19:18:05Z",
        "is_read": true
      }
    ]
  },
  "meta": { "source": "exodus", "limit": 20 }
}
```

---

## 12. Panduan Integrasi Aplikasi Eksternal

### 12.1. Daftar Endpoint REST API Siap Pakai

Jalankan server REST & Dashboard internal:
```bash
npm run dashboard
```
Server aktif di `http://localhost:3030`. Seluruh modul data dapat langsung dikonsumsi aplikasi Anda via HTTP:

| Modul Data | Method | Endpoint REST | Query Param Contoh |
| :--- | :---: | :--- | :--- |
| **Chartbit (Semua Timeframe)** | `GET` | `/api/chartbit` | `?symbol=BBCA&timeframe=5m&range=1D` |
| **Financials** | `GET` | `/api/financials` | `?symbol=BBCA&statement_type=income_statement&report_type=quarterly&limit=12` |
| **Comparison** | `GET` | `/api/comparison` | `?symbol=BBCA&include_peers=true` |
| **Analysis** | `GET` | `/api/analysis` | `?symbol=BBCA` |
| **Order Queue** | `GET` | `/api/order-queue` | `?symbol=BBCA` |
| **Price Alerts** | `GET` | `/api/alerts` | *(tanpa parameter)* |
| **Chart Layouts** | `GET` | `/api/chart-layouts` | *(tanpa parameter)* |
| **Bonds / SBN Portfolio** | `GET` | `/api/bonds` | *(tanpa parameter)* |
| **Notifications** | `GET` | `/api/notifications` | `?limit=20` |
| **Trade Flow** | `GET` | `/api/trade-flow` | `?symbol=BBCA&interval=1m` |
| **Broker Flow** | `GET` | `/api/broker-flow` | `?broker=YU` |
| **Broker Summary** | `GET` | `/api/broker-summary` | `?symbol=BBCA&from=YYYY-MM-DD&to=YYYY-MM-DD` |
| **Broker Distribution** | `GET` | `/api/broker-distribution` | `?symbol=BBCA` |
| **Foreign Flow** | `GET` | `/api/foreign-flow` | `?symbol=BBCA&days=30` |
| **Historical Data** | `GET` | `/api/historical-data` | `?symbol=BBCA&page=1&limit=50` |
| **Community Stream** | `GET` | `/api/stream` | `?symbol=BBCA&limit=20` |
| **Bandar Detector** | `GET` | `/api/bandar-detector` | `?symbol=BBCA&from=YYYY-MM-DD&to=YYYY-MM-DD` |
| **Orderbook** | `GET` | `/api/orderbook` | `?symbol=BBCA` |
| **Tradebook** | `GET` | `/api/tradebook` | `?symbol=BBCA` |
| **Portofolio Saham** | `GET` | `/api/portfolio` | *(tanpa parameter)* |

---

### 11.2. Contoh Integrasi Frontend (React / Next.js / TypeScript)


```typescript
// hooks/useStockbitFlow.ts
import { useState, useEffect } from 'react';

export function useStockbitFlow(symbol: string) {
  const [data, setData] = useState<{
    tradeFlow: any;
    foreignFlow: any;
    brokerSummary: any;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [tf, ff, bs] = await Promise.all([
          fetch(`http://localhost:3030/api/trade-flow?symbol=${symbol}`).then(r => r.json()),
          fetch(`http://localhost:3030/api/foreign-flow?symbol=${symbol}&days=30`).then(r => r.json()),
          fetch(`http://localhost:3030/api/broker-summary?symbol=${symbol}`).then(r => r.json())
        ]);
        setData({ tradeFlow: tf, foreignFlow: ff, brokerSummary: bs });
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, [symbol]);

  return { data, loading };
}
```

---

### 10.3. Contoh Analisis Kuantitatif Python (Pandas / Jupyter Notebook)

```python
import requests
import pandas as pd

# 1. Tarik Data Historis Tabular Tab Stockbit
res = requests.get('http://localhost:3030/api/historical-data?symbol=BBCA&limit=100').json()
df = pd.DataFrame(res['result'])

# 2. Hitung Sinyal Foreign Flow Kumulatif
df['net_foreign_billions'] = df['net_foreign'] / 1e9
df['foreign_flow_cumulative'] = df['net_foreign_billions'].cumsum()

print("Ringkasan Foreign Flow Saham BBCA:")
print(df[['date', 'close', 'change_percentage', 'net_foreign_billions', 'foreign_flow_cumulative']].head())
```

---

### 10.4. Menghubungkan ke AI Assistant (Antigravity / Cursor / Claude Desktop)

Tambahkan konfigurasi MCP berikut ke file config client AI Anda:

```json
{
  "mcpServers": {
    "stockbit": {
      "command": "node",
      "args": ["C:\\path\\to\\mcp-stockbit\\src\\mcpServer.mjs"]
    }
  }
}
```
