import re

with open('/Users/pannitto/Downloads/KODAnnai_main/public/GRAND_MAP_fornavigate.svg', 'r') as f:
    light = f.read()
with open('/Users/pannitto/Downloads/KODAnnai_main/public/GRAND_MAP_fornavigate_dark.svg', 'r') as f:
    dark = f.read()

def parse_fill_map(css_text):
    result = {}
    blocks = re.findall(r'(\.st\d+[^{]*)\{([^}]*)\}', css_text)
    for selector, props in blocks:
        classes = re.findall(r'\.st(\d+)', selector)
        fill = re.search(r'fill:\s*(#[0-9a-fA-F]{3,6})', props)
        if fill:
            for c in classes:
                result[int(c)] = fill.group(1).lower()
    return result

light_css = re.search(r'<style[^>]*>(.*?)</style>', light, re.DOTALL).group(1)
dark_css = re.search(r'<style[^>]*>(.*?)</style>', dark, re.DOTALL).group(1)

light_map = parse_fill_map(light_css)
dark_map = parse_fill_map(dark_css)

print("=== ライト色マップ ===")
for k,v in sorted(light_map.items()): print(f"  st{k}: {v}")
print("\n=== ダーク色マップ ===")
for k,v in sorted(dark_map.items()): print(f"  st{k}: {v}")

# 色→色の変換ルール（ライト色がダーク色にどう変わるか）
# 同一の色値を持つクラスが対応していると仮定して、色の変換ルールを導出
light_color_to_classes = {}
for cls, color in light_map.items():
    light_color_to_classes.setdefault(color, []).append(cls)

dark_color_to_classes = {}
for cls, color in dark_map.items():
    dark_color_to_classes.setdefault(color, []).append(cls)

# 共通色（変わっていない色）
light_colors = set(light_map.values())
dark_colors = set(dark_map.values())
print("\n=== ライトにのみある色 ===")
for c in sorted(light_colors - dark_colors): print(f"  {c}")
print("\n=== ダークにのみある色 ===")
for c in sorted(dark_colors - light_colors): print(f"  {c}")
print("\n=== 両方にある色 ===")
for c in sorted(light_colors & dark_colors): print(f"  {c}")
