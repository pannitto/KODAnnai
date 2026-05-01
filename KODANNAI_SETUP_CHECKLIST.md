# KODAnnai グラフ構築チェックリスト

## 現状
- ✅ TypeScript型定義完了 (GraphNode, GraphEdge, NodeTriplet)
- ✅ getEdges()関数実装（雨・バリアフリーモード対応）
- ✅ Dijkstraアルゴリズム完成
- ❌ **KODAIRA祭用の交差点・通路データなし**
- ❌ **ナビゲーション画像なし**

---

## やることリスト

### フェーズ1: グラフ設計（設計・測定）
1. **KODAIRA祭の校舎マップを用意**
   - キャンパスの全体図を印刷/デジタル化

2. **交差点を決める**
   - どこが交差点か？（廊下の十字路、階段口、教室入口など）
   - 各交差点に ID を割り当て（1～100の番号）
   
3. **隣接関係を決める**
   - 交差点A↔交差点B が直結しているか？
   - 中間に別の交差点を経由するか？

4. **距離を測定**
   - 実際に歩いてメートルで計測
   - または CAD ベースの設計図から計算

5. **属性を標記**
   - 屋外ですか？ → `outdoor: true`
   - 階段ですか？ → `hasStairs: true`

---

### フェーズ2: GRAPH_EDGES の置き換え

現在の `GRAPH_EDGES` は **tsukukomago用** で、距離もKODAIRA祭向きではありません。

**作業**:
1. 既存の `GRAPH_EDGES` を全削除
2. KODAIRA祭の交差点・通路データで置き換え

例:
```typescript
const GRAPH_EDGES: GraphEdge[] = [
  { from: 1, to: 2, distance: 35.0, outdoor: true },  // 玄関→体育館前（屋外）
  { from: 2, to: 1, distance: 35.0, outdoor: true },
  { from: 2, to: 3, distance: 20.0, outdoor: false }, // 体育館前→図書館前（屋内）
  { from: 3, to: 2, distance: 20.0, outdoor: false },
  { from: 3, to: 4, distance: 15.0, hasStairs: true }, // 図書館前→2階（階段）
  { from: 4, to: 3, distance: 15.0, hasStairs: true },
  // ... さらに追加
];
```

---

### フェーズ3: locations-server.ts との接続

各施設に `locid` を設定して、ノードにマッピング。

```typescript
export const LOCATIONS: Location[] = [
  {
    id: "101",
    locid: 2,        // ← ノード2（体育館前）にある
    name: "体育館",
    // ...
  },
  {
    id: "102",
    locid: 3,        // ← ノード3（図書館前）にある
    name: "図書館",
    // ...
  },
  // ...
];
```

**ルール**:
- `locid` は 1～100（ノード範囲）
- 同じ `locid` に複数の施設を割り当て可能（同じ部屋に複数のクラスなど）

---

### フェーズ4: NODE_TRIPLETS ナビゲーション画像

各経路パターン（前→現在→次）に対して：
1. **写真を撮影** (スマートフォンでOK)
   - ノード from → current → next のルート
   
2. **ファイル名を付ける**
   - 形式: `{番号}_{from}-{current}-{to}.jpg`
   - 例: `1_1-2-3.jpg`, `2_2-1-18.jpg`

3. **NODE_TRIPLETS に登録**
   ```typescript
   const NODE_TRIPLETS: NodeTriplet[] = [
     {
       previous: 1,
       current: 2,
       next: 3,
       prev_name: "玄関を出る",
       curr_name: "体育館前を左折",
       next_name: "図書館へ進む",
       image: "1_1-2-3.jpg"
     },
     // ...
   ];
   ```

**注意**: すべてのルート組み合わせを用意する必要があります。
- 3つのノード A→B→C の組み合わせが N×N×N 個
- 全部が必要ではなく、実際に使われるルートだけでOK

---

### フェーズ5: GRAPH_EDGES_RAINY の扱い

**現在**: 既存の `GRAPH_EDGES_RAINY` は古いデータ
**対処**:
1. 削除するか
2. 新しい KODAIRA祭用グラフから自動生成するか

推奨: **削除して、getEdges()の距離ペナルティに統一** する

---

## 質問点

1. **グラフの規模**: KODAIRA祭で何個の交差点が必要ですか？
   - 10個？ 20個？ 50個？

2. **ナビゲーション画像**: 全パターン撮影できますか？
   - 手間がかかります。優先度の高いルートだけでも可

3. **属性マーク**: 屋内/屋外・階段/エレベーターはすぐわかりますか？
   - わかれば手作業でマーク可能

4. **距離測定**: どうやって計測しますか？
   - 歩測？ GPS？ CAD設計図から？

---

## 次のステップ

### 短期（必須）
- [ ] KODAIRA祭のグラフデータを確定
- [ ] GRAPH_EDGES を新データで置き換え
- [ ] locations-server.ts の `locid` を設定

### 中期（推奨）
- [ ] ナビゲーション画像を撮影・登録
- [ ] NODE_TRIPLETS を完成

### 長期（オプション）
- [ ] バリアフリー・雨モード対応の動作確認
- [ ] UI で ノード/エッジの可視化（デバッグ用）
