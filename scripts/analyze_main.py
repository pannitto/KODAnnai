import re

with open('public/Main_building_MAP_fornavigate.svg', 'r') as f:
    content = f.read()

# y > 320 の要素を確認（4Fフロアの探索）
rect_pattern = re.compile(r'<rect\s([^/]*/?)>')
print('=== y > 320 の矩形 ===')
for m in rect_pattern.finditer(content):
    attrs = m.group(1)
    cls_m = re.search(r'class="([^"]+)"', attrs)
    y_m = re.search(r'\by="([^"]+)"', attrs)
    w_m = re.search(r'width="([^"]+)"', attrs)
    h_m = re.search(r'height="([^"]+)"', attrs)
    id_m = re.search(r'\bid="([^"]+)"', attrs)
    x_m = re.search(r'\bx="([^"]+)"', attrs)
    if not (cls_m and y_m):
        continue
    try:
        cls = cls_m.group(1)
        y = float(y_m.group(1))
        if y > 320:
            w = float(w_m.group(1)) if w_m else 0
            h = float(h_m.group(1)) if h_m else 0
            x = float(x_m.group(1)) if x_m else 0
            rid = id_m.group(1) if id_m else '?'
            print(f'  {rid}: class={cls}, x={x:.1f}, y={y:.1f}, w={w:.1f}, h={h:.1f}')
    except:
        pass

# y=8-80 の全要素（4Fヘッダー）
print()
print('=== y < 80 の矩形 ===')
for m in rect_pattern.finditer(content):
    attrs = m.group(1)
    cls_m = re.search(r'class="([^"]+)"', attrs)
    y_m = re.search(r'\by="([^"]+)"', attrs)
    w_m = re.search(r'width="([^"]+)"', attrs)
    h_m = re.search(r'height="([^"]+)"', attrs)
    id_m = re.search(r'\bid="([^"]+)"', attrs)
    x_m = re.search(r'\bx="([^"]+)"', attrs)
    if not (cls_m and y_m):
        continue
    try:
        cls = cls_m.group(1)
        y = float(y_m.group(1))
        if y < 80:
            w = float(w_m.group(1)) if w_m else 0
            h = float(h_m.group(1)) if h_m else 0
            x = float(x_m.group(1)) if x_m else 0
            rid = id_m.group(1) if id_m else '?'
            print(f'  {rid}: class={cls}, x={x:.1f}, y={y:.1f}, w={w:.1f}, h={h:.1f}')
    except:
        pass
