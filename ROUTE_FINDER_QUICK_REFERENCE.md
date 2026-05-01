# route-finder.ts 日本語ガイド - クイックリファレンス

## 概要図

```
【ユーザーの使い方】
  出発地点（location.id） ─────→ 
        ↓
    findRoute() 関数
        ↓
    ├─ location.id を node.id に変換
    ├─ rainy/barrierFree フラグをチェック
    ├─ getEdges() で適切なエッジセットを取得
    ├─ dijkstra() で最短経路を計算
    ├─ getNodeTriplet() で各ステップの画像・指示を取得
    └─ ↓
     経路情報（ルート）
     ├─ node id
     ├─ 表示テキスト
     ├─ 画像
     └─ 注釈
```

---

## ファイル内の主要部分（行番号目安）

| 部分 | 行番号 | 内容 |
|------|--------|------|
| **型定義** | 1～30 | GraphNode, GraphEdge, NodeTriplet の定義 |
| **GRAPH_NODES** | 48～49 | 1～200のノード配列（交差点リスト） |
| **GRAPH_EDGES** | 50～ | エッジ配列（通路リスト）← **ここを KODAIRA祭用に置き換え** |
| **GRAPH_EDGES_RAINY** | ~400 | 古い雨用エッジ← **削除可能** |
| **getEdges()** | ~760 | ペナルティ適用関数（rainy/barrierFree対応） |
| **NODE_TRIPLETS** | ~800～ | ナビゲーション画像・指示（3つのノード組み合わせ） |
| **dijkstra()** | ~6584 | 経路探索エンジン |
| **findRoute()** | ~6670 | ユーザー向けメイン関数 |

---

## 用語集

| 用語 | 説明 |
|------|------|
| **ノード (Node)** | グラフ内の「点」= 交差点やポイント（ID: 1～100） |
| **エッジ (Edge)** | ノード間の「線」= 通路や階段（from → to） |
| **距離 (distance)** | エッジの長さ（メートル単位など） |
| **outdoor** | `true` = 屋外通路（雨で避ける） |
| **hasStairs** | `true` = 階段通路（バリアフリーで避ける） |
| **locid** | 施設が配置されているノード番号 |
| **location.id** | 施設の一意なID（"1", "2"など） |
| **Dijkstra** | 最短経路探索アルゴリズム |
| **トリプレット** | 3つのノード（前→現在→次）の組み合わせ |

---

## 実装例（KODAIRA祭用）

### 1. GRAPH_EDGES の置き換え例

```typescript
const GRAPH_EDGES: GraphEdge[] = [
  // 玄関周辺
  { from: 1, to: 2, distance: 35.0, outdoor: true },
  { from: 2, to: 1, distance: 35.0, outdoor: true },
  
  // 屋内廊下
  { from: 2, to: 3, distance: 20.0, outdoor: false },
  { from: 3, to: 2, distance: 20.0, outdoor: false },
  
  // 階段（垂直移動）
  { from: 3, to: 4, distance: 15.0, hasStairs: true },
  { from: 4, to: 3, distance: 15.0, hasStairs: true },
  
  // エレベーター（垂直移動だが階段ではない）
  { from: 3, to: 5, distance: 10.0, hasStairs: false },
  { from: 5, to: 3, distance: 10.0, hasStairs: false },
];
```

### 2. locations-server.ts の接続例

```typescript
export const LOCATIONS: Location[] = [
  {
    id: "101",
    locid: 2,  // ← ノード2に配置
    name: "体育館",
    category: "sports",
  },
  {
    id: "102",
    locid: 3,  // ← ノード3に配置
    name: "図書館",
    category: "education",
  },
];
```

### 3. NODE_TRIPLETS の登録例

```typescript
const NODE_TRIPLETS: NodeTriplet[] = [
  {
    previous: 1,
    current: 2,
    next: 3,
    prev_name: "玄関を出ます",
    curr_name: "左に曲がって廊下へ",
    next_name: "階段へ向かいます",
    image: "1_1-2-3.jpg"  // ← 実際の写真
  },
  {
    previous: 2,
    current: 3,
    next: 4,
    prev_name: "廊下から右折",
    curr_name: "階段の入口です",
    next_name: "階段を登ります",
    image: "2_2-3-4.jpg"
  },
];
```

---

## 重要な注意点

### ❌ これはダメ
```typescript
// 片方向だけ → 経路が見つからない
{ from: 1, to: 2, distance: 20 }
```

### ✅ これが正しい
```typescript
// 双方向で登録 → 正しく経路探索される
{ from: 1, to: 2, distance: 20 },
{ from: 2, to: 1, distance: 20 }
```

---

## モード別の動作

### 通常モード
```
getEdges({}) 
→ GRAPH_EDGES をそのまま使用
→ 最短経路を計算
```

### 雨モード
```
getEdges({ rainy: true })
→ outdoor: true なエッジを distance × 10,000,000
→ 屋内ルートが大幅に優先される
→ 結果: 雨に濡れにくいルート
```

### バリアフリーモード
```
getEdges({ barrierFree: true })
→ hasStairs: true なエッジを distance × 100,000,000
→ エレベータールートが大幅に優先される
→ 結果: 階段を避けたルート
```

### 両方有効
```
getEdges({ rainy: true, barrierFree: true })
→ 両方のペナルティが適用
→ 屋内 + エレベーター を最優先
```

---

## デバッグのコツ

### 経路が見つからない場合
1. **GRAPH_EDGES が不完全**
   - すべてのノードが接続されているか確認
   - 孤立したノードがないか確認

2. **locid が間違っている**
   - locations-server.ts の `locid` が実在するノード番号か確認
   - ノード1～100 の範囲内か確認

### 経路が不自然な場合
1. **距離が不正確**
   - 実際のルートと比較
   - メートル単位で正確に測定しているか確認

2. **属性（outdoor/hasStairs）が未設定**
   - 屋外なのに `outdoor: false` になっていないか
   - 階段なのに `hasStairs: false` になっていないか

---

## API 呼び出し例

### TypeScript/JavaScript から
```typescript
import { findRoute } from "@/lib/route-finder";

// 通常モード
const route = await findRoute(101, 102);

// 雨モード
const rainyRoute = await findRoute(101, 102, [], true);

// バリアフリーモード
const accessibleRoute = await findRoute(101, 102, [], false, true);

// 両方有効
const safRoute = await findRoute(101, 102, [], true, true);
```

### HTTP API から（app/api/route/route.ts）
```
GET /api/route?from=101&to=102&rainy=true&barrier=true
```

---

## 次のステップ

1. **KODAIRA祭のマップ情報を収集**
   - 校舎図、交差点位置、距離

2. **GRAPH_EDGES を新規作成**
   - すべての通路を定義
   - outdoor/hasStairs フラグを付与

3. **locations-server.ts を更新**
   - 各施設の `locid` を設定

4. **ナビゲーション画像を撮影・登録**
   - NODE_TRIPLETS に追加

5. **API/UI で機能確認**
   - 実際にナビが作動するか確認
