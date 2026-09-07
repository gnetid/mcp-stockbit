import re

with open('./research/dumps/main-BOmpvOgp.js', 'r', encoding='utf-8') as f:
    text = f.read()

# Find all occurrences of exodusServiceApi.get(...)
calls = re.findall(r'exodusServiceApi\.(?:get|post)\([`\'"]([^`\'"]+)[`\'"]', text)
print(f"Found {len(calls)} exodusServiceApi calls:")
for c in sorted(set(calls)):
    print(" ", c)
