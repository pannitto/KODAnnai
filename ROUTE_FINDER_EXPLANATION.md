# route-finder.ts - 経路探索システムの解説

## 全体構成

route-finder.ts は、施設内の経路探索（ナビゲーション）を行うシステムです。グラフ理論のダイクストラアルゴリズムを使って、スタート地点からゴール地点への最短経路を計算します。

---

## 主要な型定義

### 1. **GraphNode（グラフノード）**
```typescript
export interface GraphNode {
  id: number;
  coordinates?: { floor: string };
}
```
**意味**: 建物内の「交差点」や「ポイント」を表します。
- `id`: ノードの番号（1～200まで可能）
- `coordinates`: そのノードがある階の情報（例: "地階" "1階"）

例: ノード 1 = 玄関、ノード 2 = 廊下の交差点

### 2. **GraphEdge（グラフエッジ）**
```typescript
export interface GraphEdge {
  from: number;
  to: number;
  distance: number;
  outdoor?: boolean;        // 屋外通路か（雨天時に避けたい場合に true にする）
  hasStairs?: boolean;      // 階段を使った垂直移動か
  notice?: { text: string }; // 注釈（曲がり角など）
}
```
*屋外/屋内はこの `outdoor` フラグで指定します。具体的な入力箇所は後述する `GRAPH_EDGES` 定義の配列で、各エッジに `outdoor: true` を追加してください。*
**意味**: ノード間の「通路」を表します。
- `from`: 開始ノード番号
- `to`: 終了ノード番号
- `distance`: 通路の距離（メートル単位など）
- `outdoor`: `true` = 屋外（雨の日に避ける）
- `hasStairs`: `true` = 階段（バリアフリーモードで避ける）
- `notice`: 方向指示（例: "左に曲がる"）

例: `{ from: 1, to: 2, distance: 20.0 }` = ノード1からノード2へ、20単位の距離

### 3. **NodeTriplet（ノードトリプレット）**
```typescript
export interface NodeTriplet {
  previous: number;    // 1つ前のノード
  current: number;     // 現在のノード
  next: number;        // 次のノード
  prev_name: string;   // 前のノードでの指示
  curr_name: string;   // 現在地での指示
  next_name: string;   // 次のノードでの指示
  image: string;       // 画像ファイル名
}
```
**意味**: ユーザーに表示する「ナビゲーション画像と指示」を提供します。
- 3つのノード（前→現在→次）の組み合わせで、その場面での指示を決定
- 画像は `previous→current→next` のルートを撮影した写真

例: `previous=1, current=2, next=3` なら「ノード2に到着した時、ノード3へ向かう方向を示す画像」を表示

---

## 主要な関数

### 1. **dijkstra()** - 経路探索エンジン
```typescript
function dijkstra(
  nodes: GraphNode[],
  edges: GraphEdge[],
  start: number,      // スタート（ノードID）
  end: number,        // ゴール（ノードID）
  excludedEdges: Array<{ from, to }> // 使用禁止の通路
): number[]           // 経路（ノードのリスト）
```

**何をするのか**:
- スタートからゴールへの「最短経路」を計算します
- Dijkstraアルゴリズムを使います（ナビゲーションシステムで一般的）
- 結果は `[開始ノード, 中間ノード1, 中間ノード2, ..., ゴール]` の配列

**動き方**:
1. 各ノードの距離を初期化（スタートは0、他は∞）
2. 現在地から近いノードから順に探索
3. より近い経路が見つかれば更新
4. ゴールに到達したら終了

**注意**: ノード番号が100以上のものはスキップされます（特殊ノード）

---

### 2. **getEdges(params)** - モードに応じたエッジ選択
```typescript
export type EdgeParams = { rainy?: boolean; barrierFree?: boolean };

export function getEdges(params: EdgeParams = {}): GraphEdge[] {
  // 屋外・階段にペナルティを加えたエッジセットを返す
}
```

**何をするのか**:
- `rainy=true`: 屋外通路の距離を × 10,000,000（非常に避ける）
- `barrierFree=true`: 階段の距離を × 100,000,000（非常に避ける）
- ペナルティにより、Dijkstraアルゴリズムがそのエッジを選ばなくなる

**例**:
```javascript
getEdges({ rainy: true })
// → 屋外エッジが選ばれにくくなる（屋内ルートが優先）

getEdges({ barrierFree: true })
// → 階段エッジが選ばれにくくなる（エレベーター優先）
```

---

### 3. **getNodeTriplet(previous, current, next)** - ナビ指示の取得
```typescript
function getNodeTriplet(
  previous: number,
  current: number,
  next: number
): NodeTriplet
```

**何をするのか**:
- 3つのノードの組み合わせから、対応する画像と指示テキストを検索
- ユーザーに表示する「次はどこに行く」という指示を決定

例: `getNodeTriplet(1, 2, 3)` → `{ image: "1_1-2-3.jpg", curr_name: "左に曲がる" }`

---

### 4. **getEdgeInfo(from, to)** - 通路情報の取得
```typescript
function getEdgeInfo(from: number, to: number): GraphEdge | null
```

**何をするのか**:
- 2つのノード間の通路情報（距離、注釈など）を取得
- 例えば「この区間は段差があります」といった警告を表示するのに使用

---

### 5. **findRoute()** - ユーザー向けのメイン関数
```typescript
export async function findRoute(
  departure: number,        // 出発ポイント（location.id）
  destination: number,      // 目的地（location.id）
  excludedEdges?: Array<{ from, to }>,
  rainyMode?: boolean,      // 雨モード
  barrierFreeMode?: boolean // バリアフリーモード
)
```

**何をするのか**:
1. `location.id`（施設IDから `locid`（ノードID）に変換
2. `getEdges()`でモードに応じたエッジセットを取得
3. `dijkstra()`で経路を計算
4. 経路上の各ノード間について `getNodeTriplet()`で指示を取得
5. ユーザーに表示する形式に整形

---

## グラフの構造（ノード・エッジの関係）

```
実世界          グラフ表現
─────────────────────────
玄関      →     ノード 1
廊下交差点 →     ノード 2
教室 A    →     ノード 101（特殊ノード）
  ↓
2点間の通路 →  エッジ { from: 1, to: 2, distance: 20 }
```

**重要**: ノードは「交差点」で、エッジは「通路」です。

---

## KODAnnai用に修正する方法

### ステップ1: 新しい交差点（ノード）を定義
- KODAIRA祭の校舎マップで、交差点を数える
- 各交差点に ID を割り当て（1～100、100以上は施設番号用）

例:
```
ノード 1 = 玄関
ノード 2 = 体育館前
ノード 3 = 図書館前
...
```

### ステップ2: 通路（エッジ）を定義
- 隣接する交差点間に通路を引く
- 距離を測定して記入

```typescript
const GRAPH_EDGES = [
  { from: 1, to: 2, distance: 30.0, outdoor: true },  // 屋外
  { from: 2, to: 3, distance: 15.0, outdoor: false }, // 屋内
  { from: 3, to: 4, distance: 20.0, hasStairs: true }, // 階段
  // ...
];
```

### ステップ3: ナビゲーション画像を用意
- `previous→current→next` のルートごとに写真を撮影
- `NODE_TRIPLETS` に登録

```typescript
const NODE_TRIPLETS: NodeTriplet[] = [
  {
    previous: 1,
    current: 2,
    next: 3,
    prev_name: "玄関から出る",
    curr_name: "体育館前を通過",
    next_name: "図書館へ向かう",
    image: "1_1-2-3.jpg"
  },
  // ...
];
```

### ステップ4: locations-server.ts との連携
- `locations-server.ts` の各施設に `locid` フィールドを設定
- `locid` は、その施設がある「ノード番号」を指す

```typescript
// locations-server.ts
export const LOCATIONS: Location[] = [
  {
    id: "1",
    locid: 101,        // ← この施設はノード101にある
    name: "体育館"
    // ...
  },
  // ...
];
```

---

## 属性の意味

### outdoor（屋外フラグ）
- `true`: 外を通る通路（雨の日に避ける）
- `false` または省略: 屋内通路

**rainy モード時の動作**:
```
distance_in_rain = distance × 10,000,000 (屋外の場合)
```
→ Dijkstraが屋内ルートを優先する

### hasStairs（階段フラグ）
- `true`: 階段がある（バリアフリー向きでない）
- `false` または省略: エレベーターなど

**barrierFree モード時の動作**:
```
distance_accessible = distance × 100,000,000 (階段の場合)
```
→ Dijkstraがエレベータールートを優先する

---

## 実装のポイント

1. **必須**: ノードとエッジは **双方向** に設定
   ```typescript
   { from: 1, to: 2, distance: 20 },
   { from: 2, to: 1, distance: 20 }, // 逆方向も必須
   ```

2. **距離は現実的に**: メートル単位で測定
   - 長すぎる・短すぎるとナビが不自然

3. **画像は正確に**: `NodeTriplet` の画像は、実際のルートを見て撮影
   - 指示と画像がズレると混乱される

4. **ノード100以上は特殊**: `dijkstra()` 内で条件判定
   - 通常は中間ノードとして使わない
   - 目的地にのみ使う

---

## トラブルシューティング

| 問題 | 原因 | 対処 |
|------|------|------|
| 経路が見つからない | ノード/エッジが不足 | グラフを完成させる |
| 経路が不自然 | 距離設定が不正確 | 実測で修正 |
| 雨モードで作動しない | `outdoor` フラグが未設定 | 屋外エッジにマーク |
| バリアフリー無視 | `hasStairs` フラグが未設定 | 階段エッジにマーク |
