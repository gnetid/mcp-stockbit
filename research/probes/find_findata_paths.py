import re

with open('./research/dumps/main-BOmpvOgp.js', 'r', encoding='utf-8') as f:
    text = f.read()

matches = re.findall(r'[\'"`](/[a-zA-Z0-9_\-/]*findata[a-zA-Z0-9_\-/]*)[\'"`]', text)
print('Findata paths in bundle:', set(matches))
