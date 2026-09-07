#!/bin/bash
# ========================================================
#   Stockbit Dashboard (macOS) — Klik dua kali untuk jalan
#   Mode macOS: token dibaca dari sesi WKWebView di disk
#   (tidak butuh port CDP 9222 seperti Windows).
# ========================================================
cd "$(dirname "$0")"

echo "========================================================"
echo "  Starting Stockbit Intelligence Dashboard (macOS)"
echo "  http://localhost:3030"
echo "========================================================"

# Buka dashboard di browser default setelah server siap
( sleep 2 && open "http://localhost:3030" ) &

node src/server.mjs
