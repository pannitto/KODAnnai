"""REBUILD
Main_building_MAP_fornavigate.svg からダーク版を生成するスクリプト

変換ルール:
  - #fff (白=壁/背景)  → #1e293b (ダーク背景)
  - #231815 (黒=テキストパス) → #e2e8f0 (明るい文字色)
  - #bad695 (薄緑)       → #6fbf5f
  - #a2b3bc (グレー)     → #94a3b8 (明るめグレー、中央廊下)
  - #fff (白ストローク)  → #e2e8f0

2/3/4F の真ん中部分 (rect208 + 追加矩形) を薄いグレーにする:
  ライト版では st15 クラス (fill: #a2b3bc) で1つの大きな矩形(rect208)が存在。
  これに相当する各フロアの中央廊下エリアを特定して薄グレーにする。
"""

import re
import shutil

SRC = '/Users/pannitto/Downloads/KODAnnai_main/public/Main_building_MAP_fornavigate.svg'
DST = '/Users/pannitto/Downloads/KODAnnai_main/public/Main_building_MAP_fornavigate_dark.svg'

with open(SRC, 'r', encoding='utf-8') as f:
    content = f.read()

# --- CSS の色変換 ---
# ライト版 CSS を確認してダーク版 CSS を生成する
# 変換マッピング (CSS内の色値を置換)
css_replacements = [
    # 背景・壁の白 → ダーク背景
    ('fill: #fff', 'fill: #1e293b'),
    # 黒系テキストパス → 明るい文字色
    ('fill: #231815', 'fill: #e2e8f0'),
    # 薄緑 → ダーク薄緑
    ('fill: #bad695', 'fill: #6fbf5f'),
    # グレー中央廊下 → やや明るいグレー
    ('fill: #a2b3bc', 'fill: #94a3b8'),
    # stroke の白はそのまま or 薄く
    # stroke: #000 は #fff に
    ('stroke: #000', 'stroke: #94a3b8'),
    # stroke: #231815 (暗い線) → 薄いグレー
    ('stroke: #231815', 'stroke: #94a3b8'),
]

# CSS部分だけ変換
css_match = re.search(r'(<style[^>]*>)(.*?)(</style>)', content, re.DOTALL)
if css_match:
    css_block = css_match.group(2)
    
    dark_css = css_block
    for old, new in css_replacements:
        dark_css = dark_css.replace(old, new)
    
    # #fff → #1e293b はfill以外にも適用（fillの後に残った単独 #fff）
    # strokeの #fff はそのまま保持したいので注意
    # → stroke: #fff はそのまま (白ストロークは白のまま)
    # なので上記 fill: #fff だけ変換済みで問題なし
    
    content = content[:css_match.start(2)] + dark_css + content[css_match.end(2):]

# --- インライン style/fill 属性の変換 ---
# CSS で既に管理されているのでインラインは基本不要だが念のため
# fill="#fff" のインライン属性
content = content.replace('fill="#fff"', 'fill="#1e293b"')
content = content.replace('fill="#ffffff"', 'fill="#1e293b"')
content = content.replace('fill="#231815"', 'fill="#e2e8f0"')

# --- 2/3/4F 真ん中部分を薄いグレーにする ---
# ライト版では st15 クラスが中央廊下 (rect208: x=22.21, y=98.2, w=116.33, h=92.33)
# ダーク版では st15 の fill: #a2b3bc → #94a3b8 (上記CSS変換で対応済み)
# 
# ただし2F・3F・4Fそれぞれにある「真ん中部分」をグレーにする必要がある。
# ライト版でその部分が #fff (白) であれば、新しい CSS クラスを追加して対応。
#
# 調査から: 
#   rect208 (st15 = gray) は y=98-190 のフロア中央 (1フロア分)
#   y=224-316 のフロアには同等のグレー矩形が存在しない可能性
#
# → 追加矩形を挿入する方法 OR 既存要素のクラスを変更する方法
#
# ここでは CSS に .floor-center クラスを追加し、
# 既存の白矩形の中から中央廊下に相当するものを特定してクラスを付与

# 各フロアの構造を解析して中央廊下を特定
# フロア1 (y=98-190): rect208 (st15) → 既にグレー → ダーク版では #94a3b8
# フロア2 (y=224-316): 中央廊下に対応する大きな白矩形を探す
# フロア3 (y=~320-413または別位置): 同様

# rect要素を全て解析
rect_pattern = re.compile(r'<rect([^/]*)/>', re.DOTALL)
rects_info = []
for m in rect_pattern.finditer(content):
    attrs = m.group(1)
    cls_m = re.search(r'class="([^"]+)"', attrs)
    x_m = re.search(r'\bx="([^"]+)"', attrs)
    y_m = re.search(r'\by="([^"]+)"', attrs)
    w_m = re.search(r'width="([^"]+)"', attrs)
    h_m = re.search(r'height="([^"]+)"', attrs)
    id_m = re.search(r'\bid="([^"]+)"', attrs)
    if cls_m and x_m and y_m and w_m and h_m:
        cls = cls_m.group(1)
        try:
            x = float(x_m.group(1))
            y = float(y_m.group(1))
            w = float(w_m.group(1))
            h = float(h_m.group(1))
            rid = id_m.group(1) if id_m else '?'
            rects_info.append((rid, cls, x, y, w, h, m.start(), m.end(), m.group()))
        except:
            pass

# 中央廊下候補: 幅が広い(w>50)で高さが中程度の白系矩形 (st4/st8/st9)
# ただし現時点でCSS変換後は白→#1e293b になっているため判断が難しい
# → 元のライト版でst15(gray)以外の大きな矩形で中央廊下になりそうなものを特定

print('=== 幅広矩形リスト (w>40) ===')
for rid, cls, x, y, w, h, s, e, raw in rects_info:
    if w > 40:
        print(f'  {rid}: class={cls}, x={x}, y={y}, w={w}, h={h}')

with open(DST, 'w', encoding='utf-8') as f:
    f.write(content)

print(f'\nダーク版を生成: {DST}')
print('2/3/4F中央廊下の特定が必要な場合は上記リストを参照')
