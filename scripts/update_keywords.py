#!/usr/bin/env python3
"""locations-server.tsx のキーワードを一括更新するスクリプト"""
import re, json, os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
TARGET = os.path.join(PROJECT_DIR, "app", "locations-server.tsx")
BACKUP = os.path.join(SCRIPT_DIR, "keywords_backup.json")

# ── 更新データ: id → 希望キーワード(フィルタ前) ──
RAW = {
    "1":  ["迷子", "案内", "落とし物", "インフォメーション", "総合案内", "キャンパスツアー", "相談"],
    "3":  ["マップ", "情報", "案内", "一覧"],
    "4":  ["撮影", "パネルアート", "出口", "帰宅", "退場口", "ゲート"],
    "5":  ["委員会企画", "景品", "アンケート"],
    "6":  ["装飾", "子供", "参加型", "メッセージ"],
    "7":  ["模擬店", "優勝", "屋台"],
    # 1-25クラス(id 8-32)
    **{str(i): ["もぎてん", f"{i-7}くらす", "一年生", "食べ物", "飲食"] for i in range(8, 33)},
    # 26-31クラス(id 33-38)
    **{str(i): ["もぎてん", f"{i-7}くらす", "一年生", "食べ物", "飲食"] for i in range(33, 39)},
    "39": ["燃えるゴミ", "燃えないゴミ", "ペットボトル", "割り箸", "エコトレー", "串", "ビン", "カン"],
    "40": ["歌うま", "中夜祭", "オープニング", "opening", "スピカ", "ダンス", "チェリッシュ", "CHERISH", "セファ", "Unplugged", "アンプラ", "アコースティック", "TFC", "The First Cry", "アカペラ", "ライブ"],
    "41": ["吹奏楽", "アンサンブル", "書道", "まれひと", "ジャグリング", "セファ", "ダンス", "Papalina", "フラ"],
    "42": ["燃えるゴミ", "燃えないゴミ", "ペットボトル", "割り箸", "エコトレー", "串", "ビン", "カン"],
    "43": ["食事", "飲食", "座れる", "休憩"],
    "44": ["子供", "思い出", "記念撮影", "記念写真", "アート"],
    "45": ["子供", "思い出", "記念品", "手作り", "スノードーム"],
    "46": ["便所", "化粧室", "お手洗い"],
    "47": ["赤ちゃん"],
    "48": ["緊急時", "体調不良", "熱中症", "怪我", "火傷"],
    "49": ["赤ちゃん", "乳児", "幼児", "授乳"],
    "50": ["赤ちゃん", "乳児", "幼児", "おむつ"],
    "51": ["こども", "子供"],
    "52": [],
    "53": ["ヒーロー", "マジック", "ジャグリング", "子供"],
    "54": ["読み聞かせ"],
    "56": ["マップ", "企画案内"],
    "57": ["燃えるゴミ", "燃えないゴミ", "ペットボトル", "割り箸", "エコトレー", "串", "ビン", "カン"],
    "58": ["飲み物", "水", "茶"],
    "59": ["食事", "休憩", "座れる"],
    "60": [],
    "61": ["便所", "化粧室", "お手洗い"],
    "62": ["販売"],
    "63": ["格付けチェック", "クイズ", "イントロ", "爆笑", "お笑い", "ヒッターズ", "HITters", "オタ芸", "ヲタ芸", "フォーク", "フォーソン", "FSC", "軽音", "バンド", "ハルモニア", "アイドル", "ライブ"],
    "64": ["便所", "化粧室", "お手洗い"],
    "65": ["ダンス", "チェリッシュ"],
    "66": ["バンド", "演奏", "軽音"],
    "67": ["展示"],
    "68": ["ボッチャ", "パラリン"],
    "69": ["バンド", "演奏", "ジャズ研"],
    "70": ["マジック"],
    "71": ["体験", "ボドゲ"],
    "72": ["歌", "アカペラ", "TFC"],
    "73": ["便所", "化粧室", "お手洗い"],
    "74": ["展示", "講義"],
    "75": ["ポーカー", "ブラックジャック", "バカラ", "ルーレット"],
    "76": ["謎解き"],
    "77": ["ゴルフ", "ダーツ", "ボウリング", "スポーツ", "遊び"],
    "78": ["バンド", "演奏", "フォーソン", "軽音"],
    "79": ["食べ物", "飲食"],
    "80": ["イラスト", "誌", "小説", "販売"],
    "81": ["展示", "講義"],
    "82": ["似顔絵", "陶器", "絵"],
    "83": ["書道"],
    "84": ["便所", "化粧室", "お手洗い"],
    "85": ["アンプラ", "ギター", "演奏", "バンド"],
    "87": ["受験生", "受験", "相談"],
    "88": ["受験生", "受験", "入試答案", "入試", "歴代入試"],
    "89": ["受験生", "受験", "参考書"],
    "90": ["受験生", "受験", "模試"],
    "91": ["受験生", "受験", "黄本", "冊子", "応援"],
    "92": ["受験生", "受験", "受験資料", "参考書展示"],
    "93": ["受験生", "受験", "LIVE", "対策"],
    "94": ["便所", "化粧室", "お手洗い"],
    "97": ["休憩所", "飲食スペース"],
    "98": [],
    "99": ["便所", "化粧室", "お手洗い"],
    "100": ["工作", "体験"],
    "101": ["演奏", "ケーキ", "オケ", "オーケストラ"],
    "102": ["便所", "化粧室", "お手洗い"],
    "103": ["漫才", "ライブ", "ネタ", "コント"],
    "104": ["便所", "化粧室", "お手洗い"],
    "105": ["食事", "飲食", "座れる", "休憩"],
    "106": ["燃えるゴミ", "燃えないゴミ", "ペットボトル", "割り箸", "エコトレー", "串", "ビン", "カン"],
    "107": ["陶器", "似顔絵", "模擬店"],
    "108": ["世界史", "数学", "受験生", "模擬店", "問題"],
    "109": ["燃えるゴミ", "燃えないゴミ", "ペットボトル", "割り箸", "エコトレー", "串", "ビン", "カン"],
    "110": ["飲み物", "水", "茶"],
    "111": ["チュロングトーン", "チュロス", "食べ物", "飲食", "スイーツ", "デザート", "お菓子", "甘い", "揚げ物", "模擬店"],
    "112": ["焼きそば", "B級グルメ", "グルメ", "B級", "食べ物", "飲食", "麺", "模擬店", "主食"],
    "113": ["食べ物", "飲食", "ホットケーキ", "パンケーキ", "スイーツ", "デザート", "甘い", "模擬店"],
    "114": ["ナチョス", "たまこまち", "タコス", "食べ物", "飲食", "しょっぱい", "スナック", "模擬店"],
    "115": ["プロック", "Pro", "プロケー", "焼きそば", "食べ物", "飲食", "麺", "模擬店", "主食"],
    "116": ["焼き鳥", "焼鳥", "やきとり", "CTC", "ctc", "食べ物", "飲食", "模擬店"],
    "117": ["ひとつだ", "ブリトー", "食べ物", "飲食", "模擬店"],
    "119": [],
    "120": ["便所", "化粧室", "お手洗い"],
    "121": ["格付けチェック", "クイズ", "イントロ", "爆笑", "お笑い", "ヒッターズ", "HITters", "オタ芸", "ヲタ芸", "フォーク", "フォーソン", "FSC", "軽音", "バンド", "ハルモニア", "アイドル"],
    "122": ["松丸亮吾", "謎解き"],
}

def is_redundant(keyword, name, category, organizer, position):
    """keyword が name/category/organizer/position に既に含まれていたら冗長"""
    kw = keyword.lower()
    if not kw:
        return True
    fields = (name.lower(), category.lower(), organizer.lower(), position.lower())
    for f in fields:
        if kw in f:
            return True
    return False

def main():
    with open(TARGET, "r", encoding="utf-8") as f:
        content = f.read()

    # Parse all locations to get their fields
    loc_pattern = re.compile(
        r'\{\s*id:\s*"([^"]+)",\s*'
        r'locid:\s*"[^"]*",\s*'
        r'name:\s*"([^"]*)",\s*'
        r'category:\s*"([^"]*)",\s*'
        r'organizer:\s*"([^"]*)",\s*'
        r'position:\s*"([^"]*)",\s*'
        r'keywords:\s*\[([^\]]*)\]',
        re.DOTALL
    )

    backup = {}
    changes = 0

    def replacer(m):
        nonlocal changes
        loc_id = m.group(1)
        name = m.group(2)
        cat = m.group(3)
        org = m.group(4)
        pos = m.group(5)
        old_kw_str = m.group(6)

        if loc_id not in RAW:
            return m.group(0)

        raw_kws = RAW[loc_id]
        # Filter redundant keywords
        filtered = [kw for kw in raw_kws if not is_redundant(kw, name, cat, org, pos)]

        # Save backup
        backup[loc_id] = {
            "name": name,
            "old_keywords_raw": old_kw_str.strip(),
            "new_keywords": filtered,
        }

        # Format new keywords array
        if not filtered:
            new_kw_str = ""
        elif len(filtered) <= 3:
            inner = ", ".join(f'"{kw}"' for kw in filtered)
            new_kw_str = inner
        else:
            inner = ",\n      ".join(f'"{kw}"' for kw in filtered)
            new_kw_str = f"\n      {inner},\n    "

        changes += 1
        full = m.group(0)
        # Replace only the keywords array content
        return full[:m.start(6) - m.start(0)] + new_kw_str + full[m.end(6) - m.start(0):]

    new_content = loc_pattern.sub(replacer, content)

    # Save backup
    with open(BACKUP, "w", encoding="utf-8") as f:
        json.dump(backup, f, ensure_ascii=False, indent=2)
    print(f"✅ バックアップ保存: {BACKUP}")

    with open(TARGET, "w", encoding="utf-8") as f:
        f.write(new_content)

    print(f"✅ {changes} 件のロケーションのキーワードを更新しました")

    # Show summary of filtered keywords
    print("\n=== フィルタで除外されたキーワード ===")
    for loc_id in sorted(RAW.keys(), key=lambda x: int(x)):
        if loc_id not in backup:
            continue
        name = backup[loc_id]["name"]
        raw = RAW[loc_id]
        final = backup[loc_id]["new_keywords"]
        removed = [kw for kw in raw if kw not in final and kw]
        if removed:
            print(f"  id={loc_id} ({name}): 除外 → {removed}")

if __name__ == "__main__":
    main()
