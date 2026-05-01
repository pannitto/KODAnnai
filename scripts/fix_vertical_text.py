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

STYLE = 'style="-webkit-writing-mode:vertical-rl;writing-mode:vertical-rl;-webkit-text-orientation:upright;text-orientation:upright;"'

def add_style(m):
    cls = m.group(1)
    rest = m.group(2)
    if 'style=' in rest:
        return m.group(0)
    return f'<text class="{cls}"{rest} {STYLE}>'

pattern = re.compile(r'<text class="(st5|st9|st10|st12|st15|st16)"([^>]*)>')

for f in files:
    with open(f, 'r', encoding='utf-8') as fp:
        content = fp.read()
    new_content = pattern.sub(add_style, content)
    with open(f, 'w', encoding='utf-8') as fp:
        fp.write(new_content)
    count = len(pattern.findall(content))
    print(f"Fixed {count} elements: {os.path.basename(f)}")
