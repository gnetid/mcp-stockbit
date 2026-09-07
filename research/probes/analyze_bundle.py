# analyze_bundle.py
import re

with open(r'D:\BOLT\mcp-stockbit\main-BOmpvOgp.js', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

print("File size:", len(text))

# Search for exodus endpoints
exodus_eps = set(re.findall(r'/[\w\-]+(?:/[\w\-]+)*', text))
interesting_words = ['portfolio', 'watchlist', 'orderbook', 'broker', 'trade', 'balance', 'emitten', 'company', 'stream', 'socket', 'user']

found = {}
for ep in exodus_eps:
    for word in interesting_words:
        if word in ep.lower() and len(ep) > 5 and len(ep) < 60:
            found.setdefault(word, set()).add(ep)

for word, eps in found.items():
    print(f"\n=== Word: {word} ({len(eps)} matches) ===")
    for ep in sorted(eps)[:15]:
        print(" ", ep)

# Search for full URLs
urls = set(re.findall(r'https?://[a-zA-Z0-9\.\-_]+\.stockbit\.[a-z]+[a-zA-Z0-9_\-\/\.\?=&%]*', text))
print(f"\n=== Stockbit URLs ({len(urls)} found) ===")
for u in sorted(urls):
    if len(u) < 80:
        print(" ", u)
