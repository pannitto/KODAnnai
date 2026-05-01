from pathlib import Path
import re

src = Path('/Users/pannitto/Downloads/KODAnnai_main/lib/route-finder.ts')
out = Path('/Users/pannitto/Downloads/KODAnnai_main/image_names_upto_5765.txt')

text = src.read_text(encoding='utf-8')
lines = text.splitlines()
segment = '\n'.join(lines[659:5765])

pattern = re.compile(
    r'previous:\s*(\d+),.*?current:\s*(\d+),.*?next:\s*(\d+),.*?image:\s*"([^"]*)"',
    re.S,
)

rows = []
for prev, curr, nxt, image in pattern.findall(segment):
    if image:
        rows.append((int(prev), int(curr), int(nxt), image))

unique_images = []
seen = set()
for _, _, _, image in rows:
    if image not in seen:
        seen.add(image)
        unique_images.append(image)

content = []
content.append('5765行目までの3点結び画像一覧')
content.append('')
content.append('[triplet -> image]')
for prev, curr, nxt, image in rows:
    content.append(f'{prev},{curr},{nxt} -> {image}')
content.append('')
content.append('[unique image names]')
for image in unique_images:
    content.append(image)
content.append('')
content.append(f'total triplets with image: {len(rows)}')
content.append(f'unique image names: {len(unique_images)}')

out.write_text('\n'.join(content) + '\n', encoding='utf-8')
print(out)
print(f'triplets={len(rows)} unique={len(unique_images)}')
