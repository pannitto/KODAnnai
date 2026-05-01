#!/usr/bin/env python3
"""
企画別館(東2号館) ノード305-326 の空トリプレットにナビ文言を一括生成・挿入するスクリプト。

使い方:
  python3 scripts/fill_bekkan.py          # 実行(route-finder.tsを上書き)
  python3 scripts/reset_bekkan.py         # ロールバック(空に戻す)

生成ルール:
  - 階段接続: "階段でX階に上がる/降りる"
  - EV接続:   "エレベーターでX階に行く"
  - 部屋到着: "右手/左手のXXが目的地"
  - 廊下移動: "そのまま進む" / "右折する" / "左折する"
  - 方向計算: PDF座標の外積(cross product)で左右判定
"""

import re
import json
import math
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
ROUTE_FINDER = os.path.join(PROJECT_DIR, "lib", "route-finder.ts")
BACKUP_FILE = os.path.join(SCRIPT_DIR, "bekkan_backup.json")

# ============================================================
# Node metadata
# ============================================================

NODE_FLOOR = {
    305: 1, 306: 1, 307: 1, 308: 1, 309: 1, 310: 1, 311: 1, 312: 1, 313: 1,
    314: 2, 315: 2, 316: 2, 317: 2, 318: 2, 319: 2, 320: 2,
    321: 3, 322: 3, 323: 3, 324: 3, 325: 3, 326: 3,
    97: 1, 98: 1, 99: 1,
    100: 2, 101: 2, 102: 2,
    103: 3, 104: 3,
    228: 0, 239: 0,
}

NODE_TYPE = {
    305: "entrance", 306: "junction", 307: "corridor", 308: "junction",
    309: "stairs", 310: "ev", 311: "corridor", 312: "corridor", 313: "stairs",
    314: "stairs", 315: "corridor", 316: "ev", 317: "corridor", 318: "stairs",
    319: "corridor", 320: "corridor",
    321: "stairs", 322: "ev", 323: "corridor", 324: "corridor", 325: "stairs",
    326: "exit",
    97: "room", 98: "room", 99: "room",
    100: "room", 101: "room", 102: "room",
    103: "room", 104: "room",
    228: "outdoor", 239: "outdoor",
}

ROOM_DESC = {
    97:  "ひとつなびLounge",
    98:  "多目的トイレ",
    99:  "トイレ",
    100: "2203教室",
    101: "2205教室",
    102: "トイレ",
    103: "2301教室",
    104: "トイレ",
}

# Stair direct connections (bidirectional pairs)
STAIR_CONNECTIONS = {
    (309, 314), (314, 309),
    (313, 318), (318, 313),
    (314, 321), (321, 314),
    (318, 325), (325, 318),
}

# EV direct connections (bidirectional pairs)
EV_CONNECTIONS = {
    (310, 316), (316, 310),
    (310, 322), (322, 310),
    (316, 322), (322, 316),
}

# Coordinates extracted from PDF pages (per-floor coordinate system)
COORDS = {
    # 1F (PDF page 5)
    305: (363, 391), 306: (348, 316), 307: (423, 326), 308: (367, 229),
    309: (436, 242), 310: (312, 254), 311: (240, 248), 312: (233, 148),
    313: (193, 152), 97: (471, 326), 98: (278, 327), 99: (292, 275),
    # 2F (PDF page 6)
    314: (415, 278), 315: (360, 261), 316: (278, 261), 317: (220, 263),
    318: (186, 143), 319: (344, 138), 320: (531, 155),
    100: (233, 111), 101: (528, 177), 102: (240, 215),
    # 3F (PDF page 7)
    321: (415, 283), 322: (264, 283), 323: (181, 267), 324: (180, 162),
    325: (120, 151), 326: (485, 273), 103: (311, 325), 104: (201, 209),
    # Outdoor (approximate, for direction calc)
    228: (363, 450), 239: (550, 273),
}

# ============================================================
# Helper functions
# ============================================================

def is_stair(a, b):
    return (a, b) in STAIR_CONNECTIONS

def is_ev(a, b):
    return (a, b) in EV_CONNECTIONS

def is_floor_change(a, b):
    return is_stair(a, b) or is_ev(a, b)

def same_floor(a, b):
    return NODE_FLOOR.get(a, -1) == NODE_FLOOR.get(b, -2)

def get_turn(prev, curr, nxt):
    """Cross-product direction at curr. PDF coords: y-down → cross>0 = right."""
    if not all(n in COORDS for n in (prev, curr, nxt)):
        return "unknown"
    if not same_floor(prev, curr) or not same_floor(curr, nxt):
        return "unknown"

    px, py = COORDS[prev]
    cx, cy = COORDS[curr]
    nx, ny = COORDS[nxt]

    dx1, dy1 = cx - px, cy - py
    dx2, dy2 = nx - cx, ny - cy
    mag1 = math.hypot(dx1, dy1)
    mag2 = math.hypot(dx2, dy2)
    if mag1 < 1 or mag2 < 1:
        return "unknown"

    cross = dx1 * dy2 - dy1 * dx2
    dot   = dx1 * dx2 + dy1 * dy2
    cos_a = max(-1, min(1, dot / (mag1 * mag2)))
    angle = math.degrees(math.acos(cos_a))

    if angle < 35:
        return "straight"
    elif angle > 145:
        return "uturn"
    elif cross > 0:
        return "right"
    else:
        return "left"

def stair_text(src, dst):
    f = NODE_FLOOR[dst]
    if NODE_FLOOR[dst] > NODE_FLOOR[src]:
        return f"階段で{f}階に上がる"
    return f"階段で{f}階に降りる"

def ev_text(src, dst):
    return f"エレベーターで{NODE_FLOOR[dst]}階に行く"

def dir_text(d):
    return {"straight": "そのまま進む", "right": "右折する",
            "left": "左折する", "uturn": "振り返って進む"}.get(d, "進む")

def room_with_dir(d, node):
    name = ROOM_DESC.get(node, "目的地")
    if d == "right":
        return f"右手の{name}が目的地"
    if d == "left":
        return f"左手の{name}が目的地"
    if d == "straight":
        return f"正面の{name}が目的地"
    return f"{name}が目的地"

# ============================================================
# Main text generation
# ============================================================

def generate(prev, curr, nxt):
    pt = NODE_TYPE.get(prev, "?")
    ct = NODE_TYPE.get(curr, "?")
    nt = NODE_TYPE.get(nxt, "?")

    prev_name = ""
    curr_name = ""
    next_name = ""

    # ---------- prev_name (start step) ----------
    if is_stair(prev, curr):
        prev_name = stair_text(prev, curr)
    elif is_ev(prev, curr):
        prev_name = ev_text(prev, curr)
    elif pt == "room":
        prev_name = f"{ROOM_DESC.get(prev, '部屋')}を出る"
    elif pt == "outdoor":
        prev_name = "企画別館に入る"
    elif pt == "entrance":
        prev_name = "入口から進む"
    elif pt == "exit":
        prev_name = ""

    # ---------- curr_name (middle step) ----------
    # Priority 1: curr→nxt floor change
    if is_stair(curr, nxt):
        curr_name = stair_text(curr, nxt)
    elif is_ev(curr, nxt):
        curr_name = ev_text(curr, nxt)

    # Priority 2: nxt is a room (destination)
    elif nt == "room":
        d = get_turn(prev, curr, nxt)
        arrived_stair = is_stair(prev, curr)
        arrived_ev    = is_ev(prev, curr)
        room_dir = room_with_dir(d, nxt)

        if arrived_stair:
            fl = NODE_FLOOR[curr]
            up = NODE_FLOOR[curr] > NODE_FLOOR[prev]
            verb = "上がって" if up else "降りて"
            curr_name = f"階段を{verb}、{room_dir}"
        elif arrived_ev:
            curr_name = f"エレベーターを降りて、{room_dir}"
        elif pt == "room":
            curr_name = f"{ROOM_DESC.get(prev, '部屋')}を出て、{room_dir}"
        else:
            if d in ("right", "left"):
                curr_name = f"進んで{room_dir}"
            else:
                curr_name = room_dir

    # Priority 3: nxt is outdoor / entrance / exit
    elif nt in ("outdoor", "entrance"):
        curr_name = "出口に向かって進む"
    elif nt == "exit":
        curr_name = "進む"

    # Priority 4: same-floor corridor movement
    else:
        arrived_stair = is_stair(prev, curr)
        arrived_ev    = is_ev(prev, curr)
        d = get_turn(prev, curr, nxt)
        dt = dir_text(d)

        if arrived_stair:
            up = NODE_FLOOR[curr] > NODE_FLOOR[prev]
            verb = "上がって" if up else "降りて"
            if d in ("right", "left", "straight"):
                curr_name = f"階段を{verb}、{dt}"
            else:
                curr_name = f"階段を{verb}進む"
        elif arrived_ev:
            if d in ("right", "left", "straight"):
                curr_name = f"エレベーターを降りて、{dt}"
            else:
                curr_name = f"エレベーターを降りて進む"
        elif pt == "room":
            if d in ("right", "left", "straight"):
                curr_name = f"{ROOM_DESC.get(prev, '部屋')}を出て{dt}"
            else:
                curr_name = f"{ROOM_DESC.get(prev, '部屋')}を出て進む"
        elif pt == "outdoor":
            curr_name = f"建物に入って{dt}" if d != "unknown" else "建物に入って進む"
        else:
            curr_name = dt

    # ---------- next_name (end step / arrival) ----------
    if nt == "room":
        next_name = f"{ROOM_DESC.get(nxt, '目的地')}が目的地"
    elif nt == "outdoor":
        next_name = "建物の外に出る"
    elif nt == "entrance":
        next_name = "出口"

    return prev_name, curr_name, next_name

# ============================================================
# Apply to file
# ============================================================

def main():
    with open(ROUTE_FINDER, "r", encoding="utf-8") as f:
        content = f.read()

    # Match empty triplet blocks
    pattern = (
        r'(    previous: (\d+),\n'
        r'    current: (\d+),\n'
        r'    next: (\d+),\n)'
        r'    prev_name: "",\n'
        r'    curr_name: "",\n'
        r'    next_name: "",\n'
        r'(    image: "[^"]+",)'
    )

    modified = []
    def replacer(m):
        prev = int(m.group(2))
        curr = int(m.group(3))
        nxt  = int(m.group(4))
        # Only target 企画別館 range
        if not any(305 <= n <= 326 for n in (prev, curr, nxt)):
            return m.group(0)

        pn, cn, nn = generate(prev, curr, nxt)
        modified.append({
            "prev": prev, "curr": curr, "next": nxt,
            "prev_name": pn, "curr_name": cn, "next_name": nn,
        })
        return (
            f'{m.group(1)}'
            f'    prev_name: "{pn}",\n'
            f'    curr_name: "{cn}",\n'
            f'    next_name: "{nn}",\n'
            f'{m.group(5)}'
        )

    new_content = re.sub(pattern, replacer, content)

    # Save backup (list of modified triplets)
    with open(BACKUP_FILE, "w", encoding="utf-8") as f:
        json.dump(modified, f, ensure_ascii=False, indent=2)
    print(f"✅ バックアップ保存: {BACKUP_FILE}")

    # Write modified file
    with open(ROUTE_FINDER, "w", encoding="utf-8") as f:
        f.write(new_content)

    print(f"✅ {len(modified)} 件のトリプレットを更新しました")
    print()

    # Show samples
    for entry in modified[:10]:
        print(f"  ({entry['prev']}, {entry['curr']}, {entry['next']})")
        print(f"    prev_name: \"{entry['prev_name']}\"")
        print(f"    curr_name: \"{entry['curr_name']}\"")
        print(f"    next_name: \"{entry['next_name']}\"")
        print()
    if len(modified) > 10:
        print(f"  ... 他 {len(modified) - 10} 件")

if __name__ == "__main__":
    main()
