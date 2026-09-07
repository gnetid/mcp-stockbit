# inspect_mfe.py
import urllib.request
import re

mfes = [
    'https://storage.stockbit.com/top-stocks/1.0.9/static/remoteEntry.js',
    'https://storage.stockbit.com/movers/1.1.9/static/remoteEntry.js',
    'https://storage.stockbit.com/porto-performance/1.1.7/static/remoteEntry.js',
    'https://storage.stockbit.com/broker-flow/1.2.11/static/remoteEntry.js',
]

for url in mfes:
    name = url.split('/')[3]
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        content = urllib.request.urlopen(req).read().decode('utf-8', errors='ignore')
        print(f"\n=== MFE: {name} (size: {len(content)}) ===")
        # Look for API calls or endpoints
        endpoints = set(re.findall(r'https?://[a-zA-Z0-9.\-_]+\.stockbit\.com[a-zA-Z0-9_\-/\.\?=&%]*', content))
        for ep in sorted(endpoints):
            print("  EP:", ep)
        # Also look for paths like /api/ or /v1/ or /v2/
        paths = set(re.findall(r'["\'](/[\w\-]+(?:/[\w\-]+)+)["\']', content))
        for p in sorted(paths):
            if any(k in p for k in ['porto', 'mover', 'broker', 'top', 'stock', 'order', 'trade', 'summary']):
                print("  Path:", p)
    except Exception as e:
        print(f"Failed {name}: {e}")
