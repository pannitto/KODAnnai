import re, math

svg = open('public/Main_building_MAP_fornavigate.svg').read()
rects = re.findall(r'<rect class="st12"([^/]*/?)>', svg)

results = []
for r in rects:
    xm = re.search(r' x="([^"]+)"', r)
    ym = re.search(r' y="([^"]+)"', r)
    wm = re.search(r'width="([^"]+)"', r)
    hm = re.search(r'height="([^"]+)"', r)
    if not (xm and ym and wm and hm): continue
    x,y,w,h = float(xm.group(1)),float(ym.group(1)),float(wm.group(1)),float(hm.group(1))
    tm = re.search(r'transform="translate\(([^)]+)\) rotate\(([^)]+)\)"', r)
    if tm:
        tx,ty = map(float,tm.group(1).split())
        angle = float(tm.group(2))
        cx_l, cy_l = x+w/2, y+h/2
        rad = math.radians(angle)
        cx = math.cos(rad)*cx_l - math.sin(rad)*cy_l + tx
        cy = math.sin(rad)*cx_l + math.cos(rad)*cy_l + ty
    else:
        cx, cy = x+w/2, y+h/2
    results.append((cx, cy))

print("All boxes near y=300 (sorted by x):")
for cx,cy in sorted(results, key=lambda r: r[0]):
    if 250 < cy < 350:
        print(f"  cx={cx:.2f}, cy={cy:.2f}")
