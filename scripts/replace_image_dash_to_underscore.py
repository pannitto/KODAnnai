import re
from pathlib import Path

p = Path('/Users/pannitto/Downloads/KODAnnai_main/lib/route-finder.ts')
s = p.read_text(encoding='utf-8')

count = 0

def repl(m):
    global count
    v = m.group(1)
    if not v:
        return m.group(0)
    nv = v.replace('-', '_')
    if nv != v:
        count += 1
    return f'image: "{nv}"'

s2 = re.sub(r'image:\s*"([^"\n]*)"', repl, s)
p.write_text(s2, encoding='utf-8')
print(f'updated: {count}')
