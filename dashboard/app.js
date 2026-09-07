// dashboard/app.js - Stockbit Dashboard Interactive Engine

const API_BASE = window.location.origin;

// State
let appState = {
  activeSymbol: 'BBCA',
  watchlist: [],
  filteredWatchlist: [],
  portfolio: null,
  bank: null,
  user: null,
  trending: [],
  orderbook: null,
  brokerSummary: null,
  chartData: null,
  chartMonths: 6,
  autoRefreshTimer: null
};

// Utilities
function formatRupiah(num) {
  if (num === null || num === undefined || isNaN(num)) return 'Rp 0';
  return 'Rp ' + Math.round(num).toLocaleString('id-ID');
}

function formatNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return '0';
  return Number(num).toLocaleString('id-ID');
}

function generateSparkline(prices, isPositive) {
  if (!prices || prices.length < 2) return '';
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const width = 80;
  const height = 24;

  const points = prices.map((p, i) => {
    const x = (i / (prices.length - 1)) * width;
    const y = height - ((p - min) / range) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const strokeColor = isPositive ? '#10b981' : '#f43f5e';
  return `
    <svg class="sparkline-svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <polyline fill="none" stroke="${strokeColor}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" points="${points}" />
    </svg>
  `;
}

// Clock
function updateClock() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB';
  const el = document.getElementById('liveClock');
  if (el) el.textContent = timeStr;
}
setInterval(updateClock, 1000);
updateClock();

// Tab Switching
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

    btn.classList.add('active');
    const tabName = btn.getAttribute('data-tab');
    const pane = document.getElementById(`pane-${tabName}`);
    if (pane) pane.classList.add('active');
    if (tabName === 'chart' && appState.chartData) {
      setTimeout(() => renderChart(appState.chartData), 50);
    }
  });
});

// Watchlist Search
const searchInput = document.getElementById('watchlistSearch');
if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    if (!q) {
      appState.filteredWatchlist = [...appState.watchlist];
    } else {
      appState.filteredWatchlist = appState.watchlist.filter(c => 
        c.symbol.toLowerCase().includes(q) || 
        (c.name && c.name.toLowerCase().includes(q))
      );
    }
    renderWatchlist();
  });
}

// Data Fetchers
async function fetchStatus() {
  try {
    const res = await fetch(`${API_BASE}/api/status`);
    const data = await res.json();
    const badge = document.getElementById('connectionStatus');
    if (data.status === 'connected') {
      badge.className = 'status-badge';
      badge.innerHTML = `<span class="status-dot pulsing"></span><span class="status-text">Connected • Desktop Real-Time</span>`;
    } else {
      badge.className = 'status-badge disconnected';
      badge.innerHTML = `<span class="status-dot"></span><span class="status-text">Disconnected • Buka Stockbit</span>`;
    }
  } catch (err) {
    const badge = document.getElementById('connectionStatus');
    badge.className = 'status-badge disconnected';
    badge.innerHTML = `<span class="status-dot"></span><span class="status-text">Server Offline</span>`;
  }
}

async function fetchUser() {
  try {
    const res = await fetch(`${API_BASE}/api/user`);
    const data = await res.json();
    if (data && data.fullname) {
      appState.user = data;
      document.getElementById('userFullname').textContent = data.fullname;
      document.getElementById('userHandle').textContent = `@${data.username} • Acc: ${data.id || ''}`;
      if (data.avatar) {
        document.getElementById('userAvatar').src = data.avatar;
      }
    }
  } catch (err) {}
}

async function fetchBank() {
  try {
    const res = await fetch(`${API_BASE}/api/bank`);
    const data = await res.json();
    if (data) {
      appState.bank = data;
      document.getElementById('rdnBalance').textContent = formatRupiah(data.balance);
      const bankName = data.account?.rdn?.name || 'Bank';
      const accNum = data.account?.rdn?.account_number || '';
      document.getElementById('rdnBankName').textContent = `Bank: ${bankName}`;
      document.getElementById('rdnAccountNumber').textContent = `No: ${accNum}`;
    }
  } catch (err) {}
}

async function fetchPortfolio() {
  try {
    const res = await fetch(`${API_BASE}/api/portfolio`);
    const data = await res.json();
    if (data && data.summary) {
      appState.portfolio = data;
      const s = data.summary;

      const invested = s.amount?.invested || 0;
      const unrealized = s.profit_loss?.unrealised || 0;
      const totalEq = invested + unrealized;
      const gainPct = (s.gain || 0) * 100;
      const cash = s.trading?.balance || 0;
      const credit = s.amount?.credit_limit || 0;
      const realized = s.profit_loss?.realised || 0;

      document.getElementById('totalEquity').textContent = formatRupiah(totalEq);
      document.getElementById('totalInvested').textContent = formatRupiah(invested);

      const pnlEl = document.getElementById('unrealizedPnl');
      const badgeEl = document.getElementById('pnlPercentBadge');
      pnlEl.textContent = (unrealized >= 0 ? '+' : '') + formatRupiah(unrealized);
      
      if (unrealized >= 0) {
        pnlEl.className = 'metric-value text-emerald';
        badgeEl.className = 'badge-pill pos';
        badgeEl.textContent = `+${gainPct.toFixed(2)}%`;
      } else {
        pnlEl.className = 'metric-value text-rose';
        badgeEl.className = 'badge-pill neg';
        badgeEl.textContent = `${gainPct.toFixed(2)}%`;
      }

      document.getElementById('realizedPnl').textContent = formatRupiah(realized);
      document.getElementById('tradingCash').textContent = formatRupiah(cash);
      document.getElementById('creditLimit').textContent = formatRupiah(credit);

      renderHoldings(data.holdings || []);
    }
  } catch (err) {}
}

async function fetchWatchlist() {
  try {
    const res = await fetch(`${API_BASE}/api/watchlist?limit=50`);
    const data = await res.json();
    if (data && data.companies) {
      appState.watchlist = data.companies;
      if (!searchInput.value.trim()) {
        appState.filteredWatchlist = [...data.companies];
      }
      document.getElementById('watchlistCount').textContent = `${data.total || data.companies.length} Saham`;
      renderWatchlist();
    }
  } catch (err) {}
}

async function fetchTrending() {
  try {
    const res = await fetch(`${API_BASE}/api/trending`);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      appState.trending = data;
      renderTrending();
    }
  } catch (err) {}
}

async function fetchMarketSession() {
  try {
    const res = await fetch(`${API_BASE}/api/market-session`);
    const data = await res.json();
    if (data && data.detail) {
      const state = data.detail.fca?.state_name || 'MARKET';
      const cleanState = state.replace('STATE_NAME_', '').replace(/_/g, ' ');
      document.getElementById('marketSessionText').textContent = `IDX: ${cleanState}`;
    }
  } catch (err) {}
}

async function fetchActiveStockData(symbol) {
  appState.activeSymbol = symbol;
  
  // Update header info from watchlist if available
  const match = appState.watchlist.find(w => w.symbol === symbol);
  if (match) {
    document.getElementById('activeStockCode').textContent = match.symbol;
    document.getElementById('activeStockName').textContent = match.name || '';
    document.getElementById('activeStockLast').textContent = formatRupiah(Number(match.last));
    const isPos = match.change && match.change.startsWith('+');
    const chEl = document.getElementById('activeStockChange');
    chEl.textContent = `${match.change} (${match.percent}%)`;
    chEl.className = 'price-change-large ' + (isPos ? 'text-emerald' : 'text-rose');
    if (match.icon_url) {
      document.getElementById('activeStockLogo').src = match.icon_url;
    }
  }

  // Fetch Orderbook
  try {
    const obRes = await fetch(`${API_BASE}/api/orderbook?symbol=${symbol}`);
    const obData = await obRes.json();
    if (obData) {
      renderOrderbook(obData);
    }
  } catch (err) {}

  // Fetch Broker Summary
  try {
    const bsRes = await fetch(`${API_BASE}/api/broker-summary?symbol=${symbol}`);
    const bsData = await bsRes.json();
    if (bsData) {
      renderBrokerSummary(bsData);
    }
  } catch (err) {}

  // Fetch Chart & Foreign Flow
  fetchChartData(symbol);
}

// Render Functions
function renderTrending() {
  const container = document.getElementById('trendingMarquee');
  if (!container) return;

  const items = appState.trending.map(t => {
    const isPos = t.percent && !t.percent.startsWith('-');
    const sign = isPos && !t.percent.startsWith('+') ? '+' : '';
    return `
      <div class="ticker-item" onclick="selectStock('${t.symbol}')">
        <span class="ticker-symbol">${t.symbol}</span>
        <span class="ticker-price">${formatNumber(t.last)}</span>
        <span class="ticker-change ${isPos ? 'pos' : 'neg'}">${sign}${Number(t.percent).toFixed(2)}%</span>
      </div>
    `;
  }).join('');

  container.innerHTML = items + items; // Duplicate for smooth infinite marquee
}

function renderWatchlist() {
  const tbody = document.getElementById('watchlistTableBody');
  if (!tbody) return;

  if (appState.filteredWatchlist.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-muted">Tidak ada saham yang cocok</td></tr>`;
    return;
  }

  tbody.innerHTML = appState.filteredWatchlist.map(item => {
    const isPos = item.change && item.change.startsWith('+');
    const isNeg = item.change && item.change.startsWith('-');
    const colorClass = isPos ? 'text-emerald' : isNeg ? 'text-rose' : 'text-muted';
    const isActive = item.symbol === appState.activeSymbol ? 'active-row' : '';
    const spark = generateSparkline(item.prices, isPos);

    return `
      <tr class="${isActive}" onclick="selectStock('${item.symbol}')">
        <td>
          <div class="stock-cell">
            <img class="stock-logo" src="${item.icon_url || 'https://assets.stockbit.com/logos/companies/' + item.symbol + '.png'}" onerror="this.src='https://assets.stockbit.com/logos/companies/BBCA.png'">
            <div>
              <div class="stock-sym">${item.symbol}</div>
              <div class="stock-name-cell">${item.name || ''}</div>
            </div>
          </div>
        </td>
        <td class="text-right font-mono font-bold">
          ${formatNumber(item.last)}
        </td>
        <td class="text-right font-mono ${colorClass}">
          ${item.change} (${item.percent}%)
        </td>
        <td class="text-center">
          ${spark}
        </td>
        <td class="text-right font-mono text-muted">
          ${formatNumber(Math.round(Number(item.volume || 0) / 100))} Lot
        </td>
        <td class="text-center">
          <button class="view-btn" onclick="selectStock('${item.symbol}')">Lihat</button>
        </td>
      </tr>
    `;
  }).join('');
}

function renderOrderbook(ob) {
  const bids = ob.bid || [];
  const offers = ob.offer || [];

  // Calculate totals and max
  let totalBidVol = 0;
  let totalOfferVol = 0;
  let maxVol = 1;

  bids.forEach(b => {
    const v = Number(b.volume || 0);
    totalBidVol += v;
    if (v > maxVol) maxVol = v;
  });

  offers.forEach(o => {
    const v = Number(o.volume || 0);
    totalOfferVol += v;
    if (v > maxVol) maxVol = v;
  });

  // Update Ratio
  const totalVol = totalBidVol + totalOfferVol || 1;
  const bidPct = ((totalBidVol / totalVol) * 100).toFixed(1);
  const offerPct = (100 - bidPct).toFixed(1);

  document.getElementById('totalBidVolText').textContent = `Total Bid: ${formatNumber(Math.round(totalBidVol / 100))} Lot (${bidPct}%)`;
  document.getElementById('totalOfferVolText').textContent = `Total Offer: ${formatNumber(Math.round(totalOfferVol / 100))} Lot (${offerPct}%)`;
  document.getElementById('ratioBidFill').style.width = `${bidPct}%`;
  document.getElementById('ratioOfferFill').style.width = `${offerPct}%`;

  // Render Bid Rows (up to 10)
  const bidHtml = bids.slice(0, 10).map(b => {
    const vol = Number(b.volume || 0);
    const fillWidth = ((vol / maxVol) * 100).toFixed(1);
    return `
      <div class="ob-row">
        <div class="ob-bar-fill bid" style="width: ${fillWidth}%"></div>
        <span class="ob-que">${b.que_num || '-'}</span>
        <span class="ob-vol">${formatNumber(Math.round(vol / 100))}</span>
        <span class="ob-price bid">${formatNumber(b.price)}</span>
      </div>
    `;
  }).join('');
  document.getElementById('obBidRows').innerHTML = bidHtml || '<div class="text-center py-4 text-muted">No Bid Data</div>';

  // Render Offer Rows (up to 10)
  const offerHtml = offers.slice(0, 10).map(o => {
    const vol = Number(o.volume || 0);
    const fillWidth = ((vol / maxVol) * 100).toFixed(1);
    return `
      <div class="ob-row">
        <div class="ob-bar-fill offer" style="width: ${fillWidth}%"></div>
        <span class="ob-price offer">${formatNumber(o.price)}</span>
        <span class="ob-vol">${formatNumber(Math.round(vol / 100))}</span>
        <span class="ob-que">${o.que_num || '-'}</span>
      </div>
    `;
  }).join('');
  document.getElementById('obOfferRows').innerHTML = offerHtml || '<div class="text-center py-4 text-muted">No Offer Data</div>';
}

function renderBrokerSummary(bs) {
  if (bs.date_info) {
    document.getElementById('brokerDateBadge').textContent = `Data Transaksi: ${bs.date_info}`;
  }

  const buyers = bs.by_value?.top_broker_buy || [];
  const sellers = bs.by_value?.top_broker_sell || [];

  const buyList = document.getElementById('topBuyersList');
  if (buyers.length === 0) {
    buyList.innerHTML = '<div class="broker-placeholder">Tidak ada data broker pembeli</div>';
  } else {
    buyList.innerHTML = buyers.slice(0, 5).map(b => {
      const code = b.detail?.code || '-';
      const type = b.detail?.type || 'Domestik';
      const typeClass = type.toLowerCase().includes('asing') ? 'asing' : 'domestik';
      const amt = b.detail?.amount || 0;
      return `
        <div class="broker-item">
          <div class="broker-code-tag">
            <span class="broker-code">${code}</span>
            <span class="broker-type-pill ${typeClass}">${type}</span>
          </div>
          <span class="broker-amount text-emerald">${formatRupiah(amt)}</span>
        </div>
      `;
    }).join('');
  }

  const sellList = document.getElementById('topSellersList');
  if (sellers.length === 0) {
    sellList.innerHTML = '<div class="broker-placeholder">Tidak ada data broker penjual</div>';
  } else {
    sellList.innerHTML = sellers.slice(0, 5).map(s => {
      const code = s.detail?.code || '-';
      const type = s.detail?.type || 'Domestik';
      const typeClass = type.toLowerCase().includes('asing') ? 'asing' : 'domestik';
      const amt = s.detail?.amount || 0;
      return `
        <div class="broker-item">
          <div class="broker-code-tag">
            <span class="broker-code">${code}</span>
            <span class="broker-type-pill ${typeClass}">${type}</span>
          </div>
          <span class="broker-amount text-rose">${formatRupiah(amt)}</span>
        </div>
      `;
    }).join('');
  }
}

function renderHoldings(holdings) {
  const container = document.getElementById('holdingsList');
  if (!container) return;

  if (!holdings || holdings.length === 0) {
    container.innerHTML = `<div class="text-center py-6 text-muted">Belum ada posisi saham terbuka di portofolio ini.</div>`;
    return;
  }

  container.innerHTML = holdings.map(h => {
    const isPos = (h.profit_loss || 0) >= 0;
    return `
      <div class="holdings-item">
        <div class="stock-cell">
          <span class="stock-sym">${h.symbol || '-'}</span>
          <span class="text-dim">${formatNumber(h.lot || 0)} Lot</span>
        </div>
        <div class="text-right">
          <div class="font-mono font-bold">${formatRupiah(h.market_value)}</div>
          <div class="font-mono ${isPos ? 'text-emerald' : 'text-rose'}">
            ${isPos ? '+' : ''}${formatRupiah(h.profit_loss)} (${(h.gain_percentage || 0).toFixed(2)}%)
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Chart Engine: Canvas Candlestick & Foreign Flow
async function fetchChartData(symbol, months = appState.chartMonths) {
  try {
    const now = new Date();
    const end = now.toISOString().slice(0, 10);
    const start = new Date(now.getTime() - months * 30 * 86400 * 1000).toISOString().slice(0, 10);
    const res = await fetch(`${API_BASE}/api/chart?symbol=${symbol}&from=${start}&to=${end}`);
    const data = await res.json();
    if (data && data.bars) {
      appState.chartData = data;
      renderChart(data);
    }
  } catch (err) {
    console.error('Failed to fetch chart:', err);
  }
}

// Timeframe selector listeners
document.querySelectorAll('#tfButtonGroup .tf-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#tfButtonGroup .tf-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const months = parseInt(btn.getAttribute('data-months'), 10);
    appState.chartMonths = months;
    fetchChartData(appState.activeSymbol, months);
  });
});

let hoveredBarIndex = -1;

function renderChart(data) {
  const canvas = document.getElementById('stockCanvas');
  const tooltip = document.getElementById('chartTooltip');
  if (!canvas || !data || !data.bars || data.bars.length === 0) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const W = rect.width;
  const H = rect.height;
  const bars = data.bars;
  const n = bars.length;

  ctx.clearRect(0, 0, W, H);

  // Layout: Top 65% Price, Bottom 25% Foreign Flow, margins
  const topMargin = 20;
  const priceHeight = H * 0.62;
  const histTop = H * 0.72;
  const histHeight = H * 0.23;
  const rightAxisWidth = 65;
  const plotWidth = W - rightAxisWidth;

  const highs = bars.map(b => b.high);
  const lows = bars.map(b => b.low);
  const maxPrice = Math.max(...highs);
  const minPrice = Math.min(...lows);
  const priceRange = maxPrice - minPrice || 1;

  const netForeigns = bars.map(b => b.net_foreign || 0);
  const maxAbsFF = Math.max(...netForeigns.map(Math.abs), 1);

  // Summary Badges
  const firstClose = bars[0].close;
  const lastClose = bars[bars.length - 1].close;
  const retPct = (((lastClose - firstClose) / firstClose) * 100).toFixed(2);
  const totalFF = netForeigns.reduce((a, b) => a + b, 0);

  const hb = document.getElementById('chartHighBadge');
  const lb = document.getElementById('chartLowBadge');
  const rb = document.getElementById('chartReturnBadge');
  const fb = document.getElementById('chartForeignBadge');
  if (hb) hb.textContent = `High: Rp ${maxPrice.toLocaleString('id-ID')}`;
  if (lb) lb.textContent = `Low: Rp ${minPrice.toLocaleString('id-ID')}`;
  if (rb) {
    rb.textContent = `Return: ${retPct >= 0 ? '+' : ''}${retPct}%`;
    rb.style.color = retPct >= 0 ? '#10b981' : '#f43f5e';
  }
  if (fb) {
    const ffBill = (totalFF / 1e9).toFixed(1);
    fb.textContent = `Net Foreign: Rp ${ffBill >= 0 ? '+' : ''}${ffBill} M`;
    fb.style.color = totalFF >= 0 ? '#10b981' : '#f43f5e';
  }

  const getY = (price) => topMargin + (priceHeight - ((price - minPrice) / priceRange) * priceHeight);

  // Horizontal Grid Lines & Price Labels
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.fillStyle = '#64748b';
  ctx.font = '10px JetBrains Mono, monospace';
  ctx.textAlign = 'left';

  const gridSteps = 4;
  for (let i = 0; i <= gridSteps; i++) {
    const p = minPrice + (priceRange * i) / gridSteps;
    const y = getY(p);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(plotWidth, y);
    ctx.stroke();
    ctx.fillText(`Rp ${Math.round(p).toLocaleString('id-ID')}`, plotWidth + 6, y + 3);
  }

  // Separator Line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.beginPath();
  ctx.moveTo(0, histTop - 4);
  ctx.lineTo(W, histTop - 4);
  ctx.stroke();

  // Histogram Zero Line
  const histZeroY = histTop + histHeight / 2;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.beginPath();
  ctx.moveTo(0, histZeroY);
  ctx.lineTo(plotWidth, histZeroY);
  ctx.stroke();
  ctx.fillText('0', plotWidth + 6, histZeroY + 3);

  // Draw Candlestick & Foreign Flow Bars
  const barWidth = Math.max(1.5, (plotWidth / n) * 0.7);
  const gap = plotWidth / n;

  bars.forEach((b, i) => {
    const x = i * gap + gap / 2;
    const isUp = b.close >= b.open;
    const candleColor = isUp ? '#10b981' : '#f43f5e';

    // Wick
    ctx.strokeStyle = candleColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, getY(b.high));
    ctx.lineTo(x, getY(b.low));
    ctx.stroke();

    // Body
    const openY = getY(b.open);
    const closeY = getY(b.close);
    const bodyY = Math.min(openY, closeY);
    const bodyHeight = Math.max(2, Math.abs(closeY - openY));

    ctx.fillStyle = candleColor;
    ctx.fillRect(x - barWidth / 2, bodyY, barWidth, bodyHeight);

    // Foreign Flow Bar
    const ff = b.net_foreign || 0;
    const ffColor = ff >= 0 ? 'rgba(16, 185, 129, 0.75)' : 'rgba(244, 63, 94, 0.75)';
    const ffBarHeight = (Math.abs(ff) / maxAbsFF) * (histHeight / 2);

    ctx.fillStyle = ffColor;
    if (ff >= 0) {
      ctx.fillRect(x - barWidth / 2, histZeroY - ffBarHeight, barWidth, ffBarHeight);
    } else {
      ctx.fillRect(x - barWidth / 2, histZeroY, barWidth, ffBarHeight);
    }
  });

  // Crosshair
  if (hoveredBarIndex >= 0 && hoveredBarIndex < n) {
    const hb = bars[hoveredBarIndex];
    const hx = hoveredBarIndex * gap + gap / 2;
    const hy = getY(hb.close);

    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.6)';
    ctx.beginPath();
    ctx.moveTo(hx, 0);
    ctx.lineTo(hx, H);
    ctx.moveTo(0, hy);
    ctx.lineTo(plotWidth, hy);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Hover Interactions
  canvas.onmousemove = (e) => {
    const r = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const idx = Math.floor(mx / gap);

    if (idx >= 0 && idx < n) {
      hoveredBarIndex = idx;
      renderChart(data);

      const b = bars[idx];
      const isUp = b.close >= b.open;
      const ffBill = ((b.net_foreign || 0) / 1e9).toFixed(2);
      tooltip.style.display = 'block';
      tooltip.style.left = `${Math.min(r.width - 210, Math.max(10, e.clientX - r.left + 15))}px`;
      tooltip.style.top = `${Math.min(r.height - 130, Math.max(10, e.clientY - r.top - 20))}px`;
      tooltip.innerHTML = `
        <div style="font-weight: bold; color: #38bdf8; margin-bottom: 4px;">${b.date} • ${data.symbol}</div>
        <div>Open: <span style="color:#fff">${b.open.toLocaleString()}</span> | Close: <span style="color:${isUp ? '#10b981' : '#f43f5e'}">${b.close.toLocaleString()}</span></div>
        <div>High: <span style="color:#fff">${b.high.toLocaleString()}</span> | Low: <span style="color:#fff">${b.low.toLocaleString()}</span></div>
        <div>Volume: <span style="color:#fff">${(b.lot || 0).toLocaleString()} Lot</span></div>
        <div style="margin-top: 4px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 2px;">
          Net Foreign: <span style="color:${b.net_foreign >= 0 ? '#10b981' : '#f43f5e'}; font-weight:bold;">${b.net_foreign >= 0 ? '+' : ''}${ffBill} Miliar</span>
        </div>
      `;
    }
  };

  canvas.onmouseleave = () => {
    hoveredBarIndex = -1;
    tooltip.style.display = 'none';
    renderChart(data);
  };
}

// Interactive Stock Selection
window.selectStock = function(symbol) {
  fetchActiveStockData(symbol);
  renderWatchlist();
};

// Global Refresh Handler
async function refreshAll() {
  const btn = document.getElementById('refreshBtn');
  if (btn) btn.classList.add('spinning');

  await Promise.all([
    fetchStatus(),
    fetchUser(),
    fetchBank(),
    fetchPortfolio(),
    fetchWatchlist(),
    fetchTrending(),
    fetchMarketSession(),
    fetchActiveStockData(appState.activeSymbol)
  ]);

  if (btn) btn.classList.remove('spinning');
}

document.getElementById('refreshBtn')?.addEventListener('click', refreshAll);

// Initial Load & Polling (Every 6 seconds)
refreshAll();
setInterval(() => {
  fetchStatus();
  fetchWatchlist();
  fetchPortfolio();
  fetchActiveStockData(appState.activeSymbol);
}, 6000);
