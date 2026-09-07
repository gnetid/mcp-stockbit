import json

with open(r'D:\BOLT\mcp-stockbit\captured_traffic.json', 'r', encoding='utf-8') as f:
    traffic = json.load(f)

print("Total requests:", len(traffic['requests']))
print("Total responses:", len(traffic['responses']))
print("Total wsFrames:", len(traffic['wsFrames']))

for r in traffic['requests']:
    if 'ws' in r['url'].lower() or 'socket' in r['url'].lower() or 'feed' in r['url'].lower():
        print(f"Request: [{r['method']}] {r['url']}")
