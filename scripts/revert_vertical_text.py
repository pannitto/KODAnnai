import re, os

files = [
    "/Users/pannitto/Downloads/KODAnnai_main/public/GRAND_MAP_fornavigate.svg",
    "/Users/pannitto/Downloads/KODAnnai_main/public/GRAND_MAP_fornavigate_dark.svg",
    "/Users/pannitto/Downloads/KODAnnai_main/public/Bekkan_MAP_fornavigate.svg",
    "/Users/pannitto/Downloads/KODAnnai_main/public/Bekkan_MAP_fornavigate_dark.svg",
    "/Users/pannitto/Downloads/KODAnnai_main/public/Chibikko_MAP_fornavigate.svg",
    "/Users/pannitto/Downloads/KODAnnai_main/public/Chibikko_MAP_fornavigate_dark.svg",
    "/Users/pannitto/Downloads/KODAnnai_main/public/Main_building_MAP_fornavigate.svg",
    "/Users/pannitto/Downloads/KODAnnai_main/public/Main_building_MAP_fornavigate_dark.svg",
]

# text要素から追加したstyle属性を除去するパターン
inline_style = r' style="-webkit-writing-mode:vertical-rl;writing-mode:vertical-rl;-webkit-text-orientation:upright;text-orientation:upright;"'

for f in files:
    with open(f, 'r', encoding='utf-8') as fp:
        content = fp.read()

    # 1. text要素のインラインstyle属性を除去
    content = content.replace(inline_style, '')

    # 2. -webkit-writing-mode を除去
    content = re.sub(r'-webkit-writing-mode: vertical-rl; ', '', content)

    # 3. -webkit-text-orientation を除去
    content = re.sub(r'-webkit-text-orientation: upright; ', '', content)

    # 4. writing-mode: vertical-rl → writing-mode: tb に戻す
    content = content.replace('writing-mode: vertical-rl;', 'writing-mode: tb;')

    with open(f, 'w', encoding='utf-8') as fp:
        fp.write(content)
    print(f"Reverted: {os.path.basename(f)}")
