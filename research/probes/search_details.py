# search_details.py
import re

with open(r'D:\BOLT\mcp-stockbit\main-BOmpvOgp.js', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

# Find all occurrences of exodus.stockbit.com and api-sekuritas
for match in re.finditer(r'(https?://(?:exodus|api-sekuritas)\.stockbit\.com[^"\'\s`,)]+)', text):
    print("Found:", match.group(1))

# Find axios / fetch base paths
paths = set(re.findall(r'["\'](/v\d+/[^"\'\s]+|/api/[^"\'\s]+)["\']', text))
print("\nPaths count:", len(paths))
for p in sorted(paths)[:30]:
    print(" ", p)
