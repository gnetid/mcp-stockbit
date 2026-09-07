# Panduan Pengembangan (Developer Guide)

Dokumen ini ditujukan untuk developer yang ingin mengembangkan, memperluas fitur, atau menambahkan tool baru ke dalam **Stockbit Desktop Bridge & MCP Server**.

---

## 1. Struktur Modul & Tanggung Jawab Kode

```
src/
├── stockbitBridge.mjs    # Penghubung utama ke WebView2 via Chrome DevTools Protocol
├── mcpServer.mjs         # Definisi tool Model Context Protocol (MCP) untuk AI
├── server.mjs            # REST API Server & HTTP Static File Server untuk Dashboard
└── testBridge.mjs        # Script verifikasi kesehatan bridge & pembacaan token
```

### Tanggung Jawab Tiap Modul:
1. **`StockbitBridge` (`src/stockbitBridge.mjs`)**:
   - Menangani siklus koneksi WebSocket ke Chrome DevTools Protocol (`http://127.0.0.1:9222/json`).
   - Melakukan evaluasi runtime JavaScript di dalam konteks webview (`Runtime.evaluate`).
   - Menangani ekstraksi token `at` (Exodus) dan `ats` (Carina) dari `localStorage`.
   - Mengirim request in-page ke endpoint Stockbit dengan header yang valid.

2. **`McpServer` (`src/mcpServer.mjs`)**:
   - Mendefinisikan antarmuka tools MCP menggunakan `@modelcontextprotocol/sdk`.
   - Menggunakan validasi skema input dengan **Zod**.
   - Menghubungkan pemanggilan tool dari AI agent ke method di `StockbitBridge`.

3. **`HttpServer` (`src/server.mjs`)**:
   - Menyediakan endpoint REST JSON (`/api/portfolio`, `/api/watchlist`, dll.) untuk konsumsi aplikasi web atau script pihak ketiga.
   - Melayani asset statis frontend dashboard (`dashboard/index.html`, `dashboard/index.css`, `dashboard/app.js`).

---

## 2. Cara Menambahkan Tool MCP Baru

Jika Anda menemukan endpoint baru di Stockbit (misal: Corporate Action, Finansial Emiten, atau Running Trade), ikuti 3 langkah berikut:

### Langkah 1: Tambahkan Method di `src/stockbitBridge.mjs`
Tambahkan fungsi pembungkus (wrapper) pada class `StockbitBridge`:

```javascript
// Contoh: Mengambil berita emiten
async getCompanyNews(symbol) {
  const sym = symbol.toUpperCase().trim();
  return await this.fetchStockbitApi(
    `https://exodus.stockbit.com/emitten/${sym}/news`,
    'at' // Gunakan 'at' untuk Exodus, 'ats' untuk Carina
  );
}
```

### Langkah 2: Daftarkan Tool di `src/mcpServer.mjs`
Buka `src/mcpServer.mjs` dan daftarkan tool dengan deskripsi berbahasa Indonesia yang jelas serta skema parameter Zod:

```javascript
server.tool(
  'stockbit_get_company_news',
  'Mengambil daftar berita dan pengumuman resmi terbaru terkait emiten tertentu di Bursa Efek Indonesia.',
  {
    symbol: z.string().describe('Kode saham emiten di IDX, contoh: BBCA, BBRI, ASII')
  },
  async ({ symbol }) => {
    try {
      const data = await bridge.getCompanyNews(symbol);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(data, null, 2)
          }
        ]
      };
    } catch (err) {
      return handleBridgeError(err);
    }
  }
);
```

### Langkah 3: (Opsional) Tambahkan Endpoint REST di `src/server.mjs`
Jika data baru tersebut ingin ditampilkan di Dashboard Web:

```javascript
if (pathname === '/api/company-news') {
  const symbol = url.searchParams.get('symbol') || 'BBCA';
  const news = await bridge.getCompanyNews(symbol);
  res.writeHead(200);
  res.end(JSON.stringify(news.data || []));
  return;
}
```

---

## 3. Menemukan & Menguji Endpoint Baru

Di folder `research/probes/`, terdapat script-script pembantu yang dapat digunakan untuk reverse-engineering:

- **`research/probes/probe_cdp.mjs`**: Mengecek target aktif, title, dan websocket debugger URL.
- **`research/probes/sniff_traffic.mjs`**: Memantau seluruh traffic HTTP / WebSocket yang dipancarkan oleh Stockbit Desktop secara real-time.
- **`research/probes/decode_storage.mjs`**: Menginspeksi isi `localStorage` atau session state aktif.

Jalankan script pengujian cepat di folder `tests/manual/`:
```bash
node tests/manual/test_endpoints.mjs
```

---

## 4. Pengujian Otomatis

Untuk memastikan koneksi bridge dan seluruh endpoint inti tetap berjalan baik, jalankan test suite bawaan:

```bash
npm run test
```

Script ini akan menguji:
1. Status ketersediaan port 9222.
2. Pembacaan profil pengguna.
3. Fetch data bank & portofolio.
4. Fetch watchlist & orderbook.
5. Fetch analisis broker distribusi.
