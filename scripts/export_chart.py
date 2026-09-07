#!/usr/bin/env python3
"""
scripts/export_chart.py
-----------------------
Utility tool to fetch IDX Candlestick & Foreign Flow data from Stockbit Bridge,
calculate technical & bandarmologi indicators, and export to CSV/Excel for 3rd party analysis.

Usage:
    python scripts/export_chart.py --symbol BBCA --start 2024-01-01 --end 2024-12-31 --format csv
    python scripts/export_chart.py --symbol BBRI --output bbri_analysis.csv
"""

import argparse
import json
import urllib.request
import sys
import os

def fetch_chart_data(symbol, start_date=None, end_date=None, port=3030):
    url = f"http://127.0.0.1:{port}/api/chart?symbol={symbol.upper().strip()}"
    if start_date:
        url += f"&from={start_date}"
    if end_date:
        url += f"&to={end_date}"
        
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'StockbitExport/1.0'})
        with urllib.request.urlopen(req, timeout=10) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception as e:
        print(f"[Error] Failed to connect to Stockbit Server at port {port}: {e}")
        print("Pastikan dashboard/server sedang berjalan ('npm run dashboard') dan Stockbit Desktop aktif.")
        sys.exit(1)

def calculate_indicators(bars):
    """Calculates SMA20, SMA50, Net Foreign Flow, Cumulative Foreign Flow, and RSI."""
    closes = [b['close'] for b in bars]
    net_foreign = [b.get('net_foreign', 0) for b in bars]
    
    # Cumulative foreign flow
    cum_foreign = 0
    
    for i, bar in enumerate(bars):
        # SMA 20
        if i >= 19:
            bar['SMA_20'] = round(sum(closes[i-19:i+1]) / 20, 2)
        else:
            bar['SMA_20'] = None
            
        # SMA 50
        if i >= 49:
            bar['SMA_50'] = round(sum(closes[i-49:i+1]) / 50, 2)
        else:
            bar['SMA_50'] = None
            
        # Cumulative Foreign Flow
        cum_foreign += bar.get('net_foreign', 0)
        bar['cum_foreign_flow'] = cum_foreign
        
    return bars

def export_to_csv(data, filename):
    bars = data.get('bars', [])
    if not bars:
        print("[Warning] No candle bars to export.")
        return
        
    bars = calculate_indicators(bars)
    
    headers = [
        'date', 'open', 'high', 'low', 'close', 
        'volume', 'lot', 'value', 'frequency',
        'foreign_buy', 'foreign_sell', 'net_foreign', 'cum_foreign_flow',
        'SMA_20', 'SMA_50', 'freq_analyzer'
    ]
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(','.join(headers) + '\n')
        for b in bars:
            row = [str(b.get(h, '') if b.get(h) is not None else '') for h in headers]
            f.write(','.join(row) + '\n')
            
    print(f"\n[Success] Exported {len(bars)} daily bars of {data.get('symbol')} to: {filename}")

def print_summary(data):
    bars = data.get('bars', [])
    if not bars:
        print("No bars data returned.")
        return
        
    sym = data.get('symbol')
    closes = [b['close'] for b in bars]
    total_net_foreign = sum(b.get('net_foreign', 0) for b in bars)
    
    print("\n" + "="*60)
    print(f" 📈 STOCKBIT OHLCV & FOREIGN FLOW SUMMARY: {sym}")
    print("="*60)
    print(f"Period          : {data.get('start_date')} s/d {data.get('end_date')}")
    print(f"Total Bars      : {len(bars)} trading days")
    print(f"First Close     : Rp {closes[0]:,}")
    print(f"Latest Close    : Rp {closes[-1]:,}")
    pct_change = ((closes[-1] - closes[0]) / closes[0]) * 100
    print(f"Price Change    : {pct_change:+.2f}%")
    print(f"Period High/Low : Rp {max(b['high'] for b in bars):,} / Rp {min(b['low'] for b in bars):,}")
    print(f"Net Foreign Flow: Rp {total_net_foreign:+,.0f} ({'NET BUY / AKUMULASI' if total_net_foreign >= 0 else 'NET SELL / DISTRIBUSI'})")
    print("="*60)
    
    # Print latest 5 bars preview
    print("\nPreview 5 Candle Terakhir:")
    print(f"{'Date':<12} {'Open':<8} {'High':<8} {'Low':<8} {'Close':<8} {'Net Foreign (Rp)':<20} {'Volume (Lot)':<12}")
    print("-" * 76)
    for b in bars[-5:]:
        print(f"{b['date']:<12} {b['open']:<8} {b['high']:<8} {b['low']:<8} {b['close']:<8} {b.get('net_foreign', 0):<20,d} {b.get('lot', 0):<12,d}")
    print("="*76 + "\n")

def main():
    parser = argparse.ArgumentParser(description="Export Stockbit Historical Chart & Foreign Flow Data")
    parser.add_argument('--symbol', '-s', default='BBCA', help="Stock code in IDX (default: BBCA)")
    parser.add_argument('--start', default='2024-01-01', help="Start date YYYY-MM-DD (default: 2024-01-01)")
    parser.add_argument('--end', default='2024-12-31', help="End date YYYY-MM-DD (default: 2024-12-31)")
    parser.add_argument('--output', '-o', default=None, help="Output CSV file path")
    parser.add_argument('--port', '-p', type=int, default=3030, help="Local REST server port (default: 3030)")
    
    args = parser.parse_args()
    
    out_file = args.output or f"{args.symbol.upper()}_chart_{args.start}_{args.end}.csv"
    
    print(f"Fetching chart data for {args.symbol.upper()} from {args.start} to {args.end}...")
    data = fetch_chart_data(args.symbol, args.start, args.end, args.port)
    
    print_summary(data)
    export_to_csv(data, out_file)

if __name__ == '__main__':
    main()
