# find_running_trade.py
with open(r'D:\BOLT\mcp-stockbit\main-BOmpvOgp.js', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

import re
matches = set(re.findall(r'["\'](/[\w\-]+(?:/[\w\-]+)*running[\w\-]*(?:/[\w\-]+)*)["\']', text, re.IGNORECASE))
print("Matches in main bundle:", matches)

# Also check for tradebook or recent trades
matches2 = set(re.findall(r'["\'](/[\w\-]+(?:/[\w\-]+)*(?:recent-trade|trade-book|running-trade|running_trade)[\w\-]*(?:/[\w\-]+)*)["\']', text, re.IGNORECASE))
print("Trade matches:", matches2)
