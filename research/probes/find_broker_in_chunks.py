# find_broker_in_chunks.py
import urllib.request
import re

# Chunk hashes from remoteEntry:
# Let's search all strings in remoteEntry that look like .js
req = urllib.request.Request('https://storage.stockbit.com/broker-distribution/2.1.6/static/remoteEntry.js', headers={'User-Agent': 'Mozilla/5.0'})
raw = urllib.request.urlopen(req).read().decode('utf-8', errors='ignore')

# In webpack 5: chunk mapping is {5209:"hash", 7322:"hash", ...}
mapping = dict(re.findall(r'(\d+):"([a-f0-9]+)"', raw))
print("Found chunks in broker-distribution:", len(mapping))

for cid, chash in mapping.items():
    curl = f"https://storage.stockbit.com/broker-distribution/2.1.6/static/{cid}.{chash}.js"
    try:
        creq = urllib.request.Request(curl, headers={'User-Agent': 'Mozilla/5.0'})
        ctext = urllib.request.urlopen(creq).read().decode('utf-8', errors='ignore')
        # find urls and paths
        for u in re.findall(r'https?://[a-zA-Z0-9\.\-_]+\.stockbit\.com[a-zA-Z0-9_\-\/\.\?=&%]*', ctext):
            print(f"[{cid}] URL: {u}")
        for p in re.findall(r'["\'](/[\w\-]+(?:/[\w\-]+)*)["\']', ctext):
            if any(k in p.lower() for k in ['broker', 'summary', 'distrib', 'accum', 'transaction']):
                print(f"[{cid}] PATH: {p}")
    except Exception as e:
        pass
