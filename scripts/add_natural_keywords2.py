#!/usr/bin/env python3
"""名称・団体名から推定される追加キーワードを補完（堅牢版）"""
import re, os

TARGET = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "app", "locations-server.tsx")

# id → 追加するキーワード
ADDITIONS = {
    # id=8 に "1くらす" が抜けている
    "8": ["1くらす"],

    # ── 英語名のカタカナ/ひらがな読み ──
    "72": ["ざふぁーすとくらい", "ざふぁ"],  # The First Cry
    "71": ["ふえご"],  # Juego
    "103": ["あいおーけー"],  # IOK
    "78": ["えふえすしー"],  # FSC
    "113": ["てっど", "てどっくす"],  # TEDx
    "41": ["ぱぱりな"],  # Papalina
    "63": ["ひったーず"],  # HITters
    "121": ["ひったーず"],
    "122": ["まつまる", "りょうご"],  # 松丸亮吾
    "40": ["こだすてーじ"],  # KODAステージ

    # ── organizer/name中の漢字のひらがな読み ──
    "101": ["かんげんがくだん", "きっさ"],  # 管弦楽団, 喫茶
    "100": ["しょくじゅかい"],  # 植樹会
    "79": ["おちゃ", "さどう", "おもてせんけ", "抹茶", "まっちゃ"],  # 表千家茶道部
    "80": ["そうさくどうこうかい", "おみくじ"],  # 創作同好会
    "111": ["すいそうがくだん"],  # 吹奏楽団
    "82": ["びじゅつぶ"],  # 美術部
    "107": ["びじゅつぶ"],
    "67": ["しゃしんぶ"],  # 写真部
    "83": ["たんせい"],  # 淡成
    "69": ["じゃずけん"],  # ジャズ研
    "112": ["びーきゅう"],  # B級
    "108": ["せかいし", "けいざい"],  # 世界史経済
    "95": ["こーる"],  # コール・メルクール

    # ── ユーザーが自然に検索しそうな表現 ──
    "68": ["えいが", "映画"],  # 自主制作映画上映会
    "70": ["手品", "てじな"],  # まれひと→マジック
    "75": ["とらんぷ", "トランプ", "ぎゃんぶる"],  # カジノ
    "76": ["すいり", "推理"],  # ミステリー
    "49": ["みるく"],  # 授乳室
    "48": ["ぐあい", "具合"],  # 救護室
    "43": ["べんち"],  # 休憩所
    "59": ["ごはん"],  # 飲食スペース
    "105": ["ごはん"],
    "58": ["じはんき", "じゅーす"],  # 飲料販売所
    "110": ["じはんき", "じゅーす"],
    "62": ["ただ", "無料", "むりょう"],  # 0円古本市
    "87": ["しんろ", "進路"],  # 受験生相談室
    "118": ["あげもの", "揚げ物"],  # 脳破壊ポテト
    "114": ["めきしかん"],  # ナチョス
    "117": ["ぶりとー"],  # ブリドー
    "115": ["かいせん", "海鮮"],  # 海鮮焼きそば
    "47": ["にもつ", "荷物"],  # ベビーカー預かり所
    "44": ["ふぉとすぽっと"],  # 顔出しパネル
    "54": ["こども", "子供"],  # 絵本企画
    "97": ["らうんじ"],  # Lounge
    "45": ["ものづくり"],  # スノードーム工房
    "51": ["あそび", "遊び"],  # アトラクション企画
    "52": ["ものづくり"],  # 工作企画
    "66": ["けいおんがくぶ"],  # 軽音楽部
    "85": ["あんぷらぐど"],  # Unplugged
    "1": ["ぱんふ", "ぱんふれっと"],  # パンフレット配布所
    "74": ["れきし", "歴史"],  # 日中戦争をどう学ぶか
    "81": ["れきし", "歴史"],  # 戦争と一橋生
    "86": ["ひかく", "比較"],  # データで見るライバル今
    "88": ["にゅうし", "入試"],  # 入試答案
    "89": ["ふりま", "ふりーまーけっと"],  # 参考書フリーマーケット
    "77": ["あそび"],  # コダッチャ - already has 遊び/あそび, check
    "53": ["てじな"],  # ショー企画ちびっこ
    "93": ["にゅうし", "入試"],  # 入試徹底解剖
    "91": ["おうえん", "応援"],  # 受験生応援冊子
    "116": ["しーてぃーしー"],  # C.T.C.
    "65": ["すとりーとだんす"],  # CHERISH
    "96": ["こぴーだんす"],  # Spica
}


def main():
    with open(TARGET, "r", encoding="utf-8") as f:
        content = f.read()

    changes = 0
    total_added = 0

    for loc_id, new_kws in sorted(ADDITIONS.items(), key=lambda x: int(x[0])):
        # Robust: just find `id: "XX"` then find the next `keywords: [...]`
        id_pat = re.compile(rf'id: "{re.escape(loc_id)}",')
        id_match = id_pat.search(content)
        if not id_match:
            print(f"⚠️  id={loc_id} IDマッチせず")
            continue

        # Find the keywords array after this id
        kw_pat = re.compile(r'keywords: \[(.*?)\]', re.DOTALL)
        kw_match = kw_pat.search(content, id_match.start())
        if not kw_match or (kw_match.start() - id_match.start()) > 500:
            print(f"⚠️  id={loc_id} keywordsマッチせず")
            continue

        existing_kws = re.findall(r'"([^"]*)"', kw_match.group(1))
        actually_new = [kw for kw in new_kws if kw not in existing_kws]
        if not actually_new:
            continue

        all_kws = existing_kws + actually_new

        if len(all_kws) <= 3:
            inner = ", ".join(f'"{kw}"' for kw in all_kws)
            new_block = f"keywords: [{inner}]"
        else:
            lines = ",\n      ".join(f'"{kw}"' for kw in all_kws)
            new_block = f"keywords: [\n      {lines},\n    ]"

        content = content[:kw_match.start()] + new_block + content[kw_match.end():]
        changes += 1
        total_added += len(actually_new)

    with open(TARGET, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"✅ {changes}件のエントリに計{total_added}個のキーワードを追加しました")


if __name__ == "__main__":
    main()
