import urllib.request
import json
import re

url = 'https://storage.stockbit.com/financial/1.1.10/static/remoteEntry.js'
req = urllib.request.urlopen(url)
text = req.read().decode('utf-8')

# Find chunk map
chunk_map_match = re.search(r'\{(?:\d+:"[a-f0-9]+",?)+\}', text)
if chunk_map_match:
    # Convert js object to valid json
    raw = chunk_map_match.group(0)
    fixed = re.sub(r'(\d+):', r'"\1":', raw)
    chunk_map = json.loads(fixed)
    print(f"Found {len(chunk_map)} chunks in financial MFE.")
    
    found_urls = set()
    for chunk_id, chunk_hash in chunk_map.items():
        chunk_url = f"https://storage.stockbit.com/financial/1.1.10/static/{chunk_id}.{chunk_hash}.js"
        try:
            c_text = urllib.request.urlopen(chunk_url).read().decode('utf-8')
            # Look for api endpoints
            apis = re.findall(r'[\'"`](/(?:findata|order-trade|company|emitten|keystats|market|stream|analyst|corpaction|insider)[a-zA-Z0-9_\-/]*)[\'"`]', c_text)
            for a in apis:
                found_urls.add(a)
        except Exception as e:
            pass
            
    print("\nAPI Endpoints found in financial MFE chunks:")
    for u in sorted(found_urls):
        print(" ", u)
