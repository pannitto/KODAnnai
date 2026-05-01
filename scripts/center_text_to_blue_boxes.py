#!/usr/bin/env python3
import re
from math import hypot
from pathlib import Path

svg_path = Path('/Users/pannitto/Downloads/KODAnnai_main/public/Main_building_MAP_fornavigate.svg')
text = svg_path.read_text(encoding='utf-8')

# ---- collect blue box centers (.st12 rect) ----
rect_pat = re.compile(
    r'<rect class="st12" x="([\d.\-]+)" y="([\d.\-]+)" width="([\d.\-]+)" height="([\d.\-]+)"(?: transform="([^"]+)")?\s*/>'
)

boxes = []
for m in rect_pat.finditer(text):
    x, y, w, h = map(float, m.group(1, 2, 3, 4))
    cx = x + w / 2
    cy = y + h / 2
    tf = m.group(5)

    if tf:
        # Illustrator output in this file is typically: translate(tx ty) rotate(90)
        mt = re.search(r'translate\(([-\d.]+)\s+([-\d.]+)\)\s*rotate\(([-\d.]+)\)', tf)
        if mt:
            tx, ty, deg = float(mt.group(1)), float(mt.group(2)), float(mt.group(3))
            if abs(deg - 90) < 1e-6:
                rx, ry = -cy, cx  # rotate 90deg around origin
                cx, cy = rx + tx, ry + ty

    boxes.append((cx, cy))

# ---- find all room-number texts (.st6) ----
text_pat = re.compile(
    r'(<text class="st6" transform="translate\()([\d.\-]+)\s+([\d.\-]+)(\)"><tspan>)([^<]+)(</tspan></text>)'
)

used = [False] * len(boxes)
changes = 0


def repl(m):
    global changes
    old_x, old_y = float(m.group(2)), float(m.group(3))
    label = m.group(5).strip()

    # "ロビー" は青ボックス番号ではないのでそのまま
    if not re.fullmatch(r'\d{4}', label):
        return m.group(0)

    # nearest unused blue box center
    best_i = None
    best_d = 1e18
    for i, (bx, by) in enumerate(boxes):
        if used[i]:
            continue
        d = hypot(old_x - bx, old_y - by)
        if d < best_d:
            best_d = d
            best_i = i

    if best_i is None:
        return m.group(0)

    used[best_i] = True
    nx, ny = boxes[best_i]
    changes += 1
    return f"{m.group(1)}{nx:.2f} {ny:.2f}{m.group(4)}{label}{m.group(6)}"


new_text = text_pat.sub(repl, text)
svg_path.write_text(new_text, encoding='utf-8')
print(f'updated room labels: {changes}')
