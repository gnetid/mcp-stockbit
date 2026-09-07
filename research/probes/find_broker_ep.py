# find_broker_ep.py
import urllib.request
import re

url = "https://storage.stockbit.com/broker-distribution/2.1.6/static/remoteEntry.js"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
text = urllib.request.urlopen(req).read().decode('utf-8', errors='ignore')

# find chunk files in remoteEntry
chunks = re.findall(r'["\']([0-9]+\.[a-f0-9]+\.js)["\']', text)
print("Chunks in broker-distribution:", len(chunks))

for c in chunks[:5]:
    c_url = f"https://storage.stockbit.com/broker-distribution/2.1.6/static/{c}"
    c_req = urllib.request.Request(c_url, headers={'User-Agent': 'Mozilla/5.0'})
    c_text = urllib.request.urlopen(c_req).read().decode('utf-8', errors='ignore')
    
    # search for /broker/ or /distribution/ or api calls
    matches = set(re.findall(r'["\'](/[\w\-]+(?:/[\w\-]+)*)["\']', c_text))
    for m in matches:
        if 'broker' in m or 'distribution' in m or 'summary' in m or 'exodus' in m:
            print(f"Chunk {c} -> {m}")
