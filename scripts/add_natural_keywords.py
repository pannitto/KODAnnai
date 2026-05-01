#!/usr/bin/env python3
"""名称・団体名から推定される追加キーワードを補完するスクリプト
- 英語名→カタカナ/ひらがな読み
- organizer/position中の漢字のひらがな読み
- ユーザーが自然に検索しそうな別名・略称
"""
import re, os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
TARGET = os.path.join(PROJECT_DIR, "app", "locations-server.tsx")

# id → 追加するキーワード (既存と重複してもスクリプト内で弾く)
ADDITIONS = {
    # ── 英語名のカタカナ/ひらがな読み ──
    # TFCアカペラライブ (id=72): organizer="アカペラサークルThe First Cry"
    "72": ["ざふぁーすとくらい", "ざふぁ"],

    # ボードゲームアリーナ(id=71): organizer="ボードゲームサークルJuego"
    "71": ["ふえご"],

    # IOKお笑いライブ(id=103): organizer含まない
    "103": ["あいおーけー"],

    # FSC教室ライブ(id=78): "FSC"は英字
    "78": ["えふえすしー"],

    # TEDxホットケーキ(id=113): organizer="TEDxHitotsubashiU"
    "113": ["てっど", "てどっくす"],

    # Papalina in フィールド(id=41) keywords
    "41": ["ぱぱりな"],

    # HITters in 本館ステージ(id=63) / 体育館ステージ(id=121)
    "63": ["ひったーず"],
    "121": ["ひったーず"],

    # 松丸亮吾(id=122): 漢字の読み
    "122": ["まつまる", "りょうご"],

    # ── organizer漢字のひらがな読み ──
    # 管弦楽団(id=101): organizer="管弦楽団"→name="名曲喫茶ハルモニア"
    "101": ["かんげんがくだん", "きっさ"],

    # 植樹会(id=100): organizer="植樹会"
    "100": ["しょくじゅかい"],

    # 表千家茶道部(id=79): organizer="表千家茶道部"
    "79": ["おちゃ", "さどう", "おもてせんけ", "抹茶", "まっちゃ"],

    # 創作同好会(id=80): organizer="創作同好会"
    "80": ["そうさくどうこうかい"],

    # 吹奏楽団(id=111 チュロングトーン): organizer="吹奏楽団"
    "111": ["すいそうがくだん"],

    # 美術部(id=82,107): organizer="美術部"
    "82": ["びじゅつぶ"],
    "107": ["びじゅつぶ"],

    # 写真部(id=67): organizer="写真部"
    "67": ["しゃしんぶ"],

    # 淡成書道会(id=83): organizer="淡成書道会"
    "83": ["たんせい"],

    # モダンジャズ研究会(id=69): organizer="モダンジャズ研究会"
    "69": ["じゃずけん"],

    # B級グルメ研究会(id=112): organizer="B級グルメ研究会"
    "112": ["びーきゅう"],

    # 世界史経済同好会(id=108)
    "108": ["せかいし", "けいざい"],

    # 男声合唱団コール・メルクール(id=95)
    "95": ["こーる"],

    # コピーダンスサークルSpica(id=96)
    # すでに"スピカ","ダンス"あり→OK

    # ── ユーザーが自然に検索しそうな別名 ──
    # ゆびっこ(id=68): 自主制作映画上映会 → "映画"
    "68": ["えいが", "映画"],

    # 魔法の部屋(id=70): まれひと → "手品", "てじな"
    "70": ["手品", "てじな"],

    # カジノ企画(id=75): "賭け", "ギャンブル", "トランプ"
    "75": ["とらんぷ", "トランプ", "ぎゃんぶる"],

    # ミステリーカフェ(id=76): "推理", "脱出"
    "76": ["すいり", "推理"],

    # 授乳室(id=49): "ミルク"
    "49": ["みるく"],

    # 救護室(id=48): "AED", "えーいーでぃー", "具合悪い"
    "48": ["ぐあい", "具合"],

    # ファミリーエリア休憩所(id=43): "ベンチ"
    "43": ["べんち"],

    # 飲食スペース(id=59,105): "ご飯","ごはん"
    "59": ["ごはん"],
    "105": ["ごはん"],

    # 飲料販売所(id=58,110): "自販機","じはんき","ジュース"
    "58": ["じはんき", "じゅーす"],
    "110": ["じはんき", "じゅーす"],

    # 0円古本市(id=62): "タダ","無料","ただ"
    "62": ["ただ", "無料", "むりょう"],

    # 受験生相談室(id=87): "進路"
    "87": ["しんろ", "進路"],

    # 脳破壊ポテト(id=118): "フライドポテト","ポテト" already there, "揚げ物"
    "118": ["あげもの", "揚げ物"],

    # ナイスなナチョス(id=114): "メキシコ","メキシカン"
    "114": ["めきしかん"],

    # ひとつだブリドー(id=117): "ブリトー"のひらがな
    "117": ["ぶりとー"],

    # 焼きそば番長(id=112) already has lots
    # やほレン海鮮焼きそば(id=115): "海鮮","かいせん"
    "115": ["かいせん", "海鮮"],

    # ベビーカー預かり所(id=47): "ベビーカー"はカタカナでOK, "荷物"
    "47": ["にもつ", "荷物"],

    # 顔出しパネル(id=44): "写真","フォトスポット"
    "44": ["ふぉとすぽっと"],

    # 絵本企画(id=54): "こども","子供"
    "54": ["こども", "子供"],

    # 開運！一創同神社(id=80) → "おみくじ","占い"  -- already adding そうさく...
    # overwrite: combine
}

# id=80 needs both sets
ADDITIONS["80"] = ["そうさくどうこうかい", "おみくじ"]


def main():
    with open(TARGET, "r", encoding="utf-8") as f:
        content = f.read()

    # For each id, find its keywords array and append
    changes = 0
    total_added = 0

    for loc_id, new_kws in ADDITIONS.items():
        # Find pattern: id: "XX", ... keywords: [...]
        # We need to find the specific entry and its keywords
        # Use a pattern that matches id: "XX" followed by keywords: [...]
        pat = re.compile(
            rf'(id: "{re.escape(loc_id)}",\s*'
            rf'locid: "[^"]*",\s*'
            rf'name: "[^"]*"(?:,)?[^\n]*\s*'  # name line (may have comment)
            rf'category: "[^"]*",\s*'
            rf'organizer: "[^"]*",\s*'
            rf'position: "[^"]*",\s*'
            rf'keywords: \[)(.*?)(\])',
            re.DOTALL
        )

        match = pat.search(content)
        if not match:
            print(f"⚠️  id={loc_id} マッチせず")
            continue

        existing_str = match.group(2)
        existing_kws = re.findall(r'"([^"]*)"', existing_str)

        # Filter out already existing keywords
        actually_new = [kw for kw in new_kws if kw not in existing_kws]
        if not actually_new:
            continue

        all_kws = existing_kws + actually_new

        # Format
        if len(all_kws) <= 3:
            inner = ", ".join(f'"{kw}"' for kw in all_kws)
            new_kw_block = inner
        else:
            lines = ",\n      ".join(f'"{kw}"' for kw in all_kws)
            new_kw_block = f"\n      {lines},\n    "

        replacement = match.group(1) + new_kw_block + match.group(3)
        content = content[:match.start()] + replacement + content[match.end():]

        changes += 1
        total_added += len(actually_new)
        # print(f"  id={loc_id}: +{len(actually_new)} ({', '.join(actually_new)})")

    with open(TARGET, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"✅ {changes}件のエントリに計{total_added}個のキーワードを追加しました")


if __name__ == "__main__":
    main()
