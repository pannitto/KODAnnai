import re
import shutil

light_path = '/Users/pannitto/Downloads/KODAnnai_main/public/GRAND_MAP_fornavigate.svg'
dark_path = '/Users/pannitto/Downloads/KODAnnai_main/public/GRAND_MAP_fornavigate_dark.svg'

with open(light_path, 'r', encoding='utf-8') as f:
    content = f.read()

# ライト→ダークの色変換ルール（ライト版のCSSクラス分析から導出）
# ライトにのみある2色をダーク用に置き換え
color_rules = {
    '#f5ebd3': '#334155',  # ベージュ背景 → ダーク青灰
    '#F5EBD3': '#334155',
    '#bad695': '#6fbf5f',  # 薄緑 → 明るい緑
    '#BAD695': '#6fbf5f',
}

result = content
for light_color, dark_color in color_rules.items():
    result = result.replace(light_color, dark_color)

# 大文字小文字混在対応（正規表現で）
result = re.sub(r'#[Ff]5[Ee][Bb][Dd]3', '#334155', result)
result = re.sub(r'#[Bb][Aa][Dd]695', '#6fbf5f', result)

with open(dark_path, 'w', encoding='utf-8') as f:
    f.write(result)

# 変更された色の確認
changes = []
for light_color, dark_color in color_rules.items():
    count = content.lower().count(light_color.lower())
    if count > 0:
        changes.append(f"  {light_color} -> {dark_color}: {count}箇所")

print("=== 変換完了 ===")
for c in changes:
    print(c)
print(f"\n出力: {dark_path}")
