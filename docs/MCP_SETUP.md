# Panduan Integrasi Model Context Protocol (MCP) Stockbit

Dokumen ini menjelaskan cara menghubungkan **Stockbit MCP Server** ke berbagai aplikasi AI Agent seperti **Claude Desktop**, **Antigravity IDE**, **Cursor**, dan ekstensi AI lainnya.

---

## 1. Prasyarat

Sebelum mengonfigurasi MCP client, pastikan:
1. **Node.js 18+** sudah terpasang di sistem (`node -v`).
2. Proyek ini sudah terinstal dependensinya (`npm install`).
3. **Stockbit Desktop** sudah terpasang ([Download Aplikasi Saham Stockbit Desktop App untuk Mac dan Windows](https://stockbit.com/desktop)) dan sudah login.

Persyaratan koneksi bergantung platform:

- **Windows**: Stockbit harus berjalan dengan remote debugging port aktif:
  ```powershell
  # Contoh menjalankan via shortcut atau PowerShell
  & "C:\Users\<username>\AppData\Local\Programs\Stockbit\Stockbit.exe" --remote-debugging-port=9222
  ```
- **macOS**: tanpa port debug. Bridge membaca sesi langsung dari localStorage WKWebView di disk (`~/Library/WebKit/com.stockbit.desktop/`) dan memanggil REST API. Cukup buka aplikasi & login seperti biasa.

---

## 2. Konfigurasi MCP Client

### A. Claude Desktop (Windows)
File konfigurasi terletak di:
`%APPDATA%\Claude\claude_desktop_config.json`  
(biasanya di `C:\Users\<username>\AppData\Roaming\Claude\claude_desktop_config.json`).

Buka file tersebut dan tambahkan konfigurasi berikut ke bagian `mcpServers`:

```json
{
  "mcpServers": {
    "stockbit": {
      "command": "node",
      "args": [
        "C:\\path\\to\\mcp-stockbit\\src\\mcpServer.mjs"
      ],
      "env": {}
    }
  }
}
```
*(Sesuaikan path `C:\\path\\to\\mcp-stockbit` dengan lokasi folder proyek Anda)*.

Setelah disimpan, **restart Claude Desktop**. Anda akan melihat ikon palu (tools) bertuliskan `stockbit` dengan tools tersedia.

---

### B. Antigravity IDE
Pada Antigravity IDE, konfigurasi MCP server didukung secara otomatis melalui sistem kustomisasi workspace di folder `.agents/`.

File konfigurasi telah dipasang di:
- [`.agents/mcp_config.json`](file:///.agents/mcp_config.json)
- [`.agents/plugins/stockbit/`](file:///.agents/plugins/stockbit/)

Isi konfigurasi:
```json
{
  "mcpServers": {
    "stockbit": {
      "command": "node",
      "args": [
        "C:\\path\\to\\mcp-stockbit\\src\\mcpServer.mjs"
      ],
      "env": {}
    }
  }
}
```

> [!TIP]
> Anda dapat melihat status server MCP yang aktif di Antigravity IDE dengan mengklik ikon **titik tiga (`...`)** di panel obrolan agen -> pilih **MCP Servers**. Jika belum muncul, klik **Reload / Refresh MCP**.

---

### C. Cursor IDE
Pada Cursor, buka:
`Settings` -> `Features` -> `MCP` -> **Add New MCP Server**

Isikan:
- **Name**: `stockbit`
- **Type**: `command`
- **Command**: `node C:/path/to/mcp-stockbit/src/mcpServer.mjs`

Atau tambahkan ke file `.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "stockbit": {
      "command": "node",
      "args": ["C:/path/to/mcp-stockbit/src/mcpServer.mjs"]
    }
  }
}
```

---

### D. Roo Code / Cline (VSCode Extension)
Tambahkan ke file `cline_mcp_settings.json`:
```json
{
  "mcpServers": {
    "stockbit": {
      "command": "node",
      "args": ["C:/path/to/mcp-stockbit/src/mcpServer.mjs"],
      "disabled": false,
      "autoApprove": [
        "stockbit_get_portfolio",
        "stockbit_get_watchlist",
        "stockbit_get_quote",
        "stockbit_get_orderbook",
        "stockbit_get_broker_summary",
        "stockbit_get_orders",
        "stockbit_get_bank_account",
        "stockbit_get_trending"
      ]
    }
  }
}
```

---

## 3. Daftar Tools MCP yang Tersedia

| Nama Tool | Parameter | Deskripsi |
| :--- | :--- | :--- |
| **`stockbit_get_portfolio`** | *(tanpa parameter)* | Mengambil data portofolio pengguna, saldo kas trading, modal terinvestasi, unrealised P&L, gain %, serta detail kepemilikan saham. |
| **`stockbit_get_watchlist`** | `limit` *(opsional, 1-100)* | Mengambil daftar saham yang dipantau di Watchlist Stockbit pengguna, harga terkini, dan riwayat tick. |
| **`stockbit_get_quote`** | `symbol` *(string, wajib)* | Mengambil profil emiten IDX, konstituen indeks (LQ45, dll.), dan tick harga. |
| **`stockbit_get_orderbook`** | `symbol` *(string, wajib)* | Mengambil kedalaman antrean pasar (Bid & Offer) beserta jumlah antrean (queue) dan volume lot. |
| **`stockbit_get_broker_summary`** | `symbol` *(string, wajib)* | Mengambil analisis Bandarmologi (akumulasi/distribusi broker, broker asing vs domestik, top buy/sell). |
| **`stockbit_get_orders`** | *(tanpa parameter)* | Mengambil antrean order beli/jual hari ini yang berstatus open, matched, atau rejected. |
| **`stockbit_get_bank_account`** | *(tanpa parameter)* | Mengambil info bank kustodian RDN, nomor rekening, dan saldo kas riil. |
| **`stockbit_get_trending`** | *(tanpa parameter)* | Mengambil daftar saham yang sedang paling ramai diperbincangkan di bursa saat ini. |
| **`stockbit_get_chart_data`** | `symbol` *(wajib)*, `start_date`, `end_date` | Mengambil data candlestick historis harian (OHLCV), volume, dan arus modal asing (Foreign Flow) untuk analisis teknikal dan deteksi akumulasi. |
| **`stockbit_search_emiten`** | `query` *(string, wajib)* | Mencari kode saham (ticker) dan nama perusahaan di IDX berdasarkan kata kunci. |

---

## 4. Contoh Prompt untuk AI Assistant

Setelah MCP terhubung, Anda dapat memberikan prompt analisis berbasis data riil langsung ke AI Assistant:

### Skenario 1: Evaluasi & Review Portofolio
> *"Tolong periksa portofolio saham Stockbit saya saat ini. Analisis saham mana yang memiliki floating loss terbesar dan berikan saran manajemen risiko atau rebalancing sesuai profil risiko moderat."*

### Skenario 2: Analisis Bandarmologi & Foreign Flow
> *"Cek broker summary untuk saham BBCA dan BMRI hari ini. Apakah terlihat adanya akumulasi bersih dari broker asing atau institusi besar? Bandingkan dengan kedalaman orderbook-nya."*

### Skenario 3: Morning Briefing Pasar & Watchlist
> *"Lihat daftar saham di watchlist saya dan saham yang sedang trending hari ini. Rangkum emiten mana yang mengalami lonjakan volume atau persentase kenaikan tertinggi."*

### Skenario 4: Cek Likuiditas & Status Order
> *"Periksa apakah ada order beli/jual saya yang belum match hari ini, dan berapa sisa saldo kas RDN yang siap dipakai untuk transaksi berikutnya."*

### Skenario 5: Analisis Teknikal Candlestick & Foreign Flow Historis
> *"Ambil data chart harian BBRI dari awal tahun hingga sekarang menggunakan tool chart data. Analisis bagaimana tren akumulasi asing mempengaruhi pergerakan harga saham, dan tentukan level support resistance utamanya."*

---

## 5. Troubleshooting MCP

1. **Error: "Stockbit is not running on port 9222"**:
   - Pastikan aplikasi Stockbit Desktop dibuka dengan flag `--remote-debugging-port=9222`.
   - Cek browser Anda di `http://127.0.0.1:9222/json` — jika halamannya tidak muncul, flag belum aktif.
2. **Error: "Stockbit main page not found"**:
   - Pastikan Anda sudah login ke dalam aplikasi Stockbit Desktop hingga halaman utama terbuka.
3. **AI tidak merespons / Timeout**:
   - Pastikan path ke `node` dan file `src/mcpServer.mjs` di file konfigurasi MCP ditulis dengan path absolut dan tanda backslash ganda (`\\`) di Windows.
