# KODAnnai — Copilot Instructions

KODAIRA祭（学園祭）来場者向けキャンパスナビゲーション Web アプリ。Next.js 14 / React 18 / TypeScript / Tailwind CSS v4 / next-themes、Vercel にデプロイ。

## アーキテクチャ概要

```
lib/route-finder.ts          ← 経路探索エンジン（GRAPH_EDGES・NODE_TRIPLETS・Dijkstra・findRoute）
app/locations-server.tsx     ← 全施設データ（LOCATIONS配列）・全マーカー定義・TRANSIT_NODE_META
app/home-page-client.tsx     ← メインUI（出発地/目的地選択・モード切替・ルート実行）
components/
  outdoor-navigation-map.tsx ← SVGマップ表示・マーカータップで出発地選択・建物MAP切替
  navigation-view.tsx        ← ルート結果の写真ステップ表示
app/api/route/route.ts       ← REST API GET /api/route?departure=&destination=&rainy=&barrierFree=
public/assembly/             ← ナビ画像 512枚（命名規則: {prev}_{curr}_{next}.png）
public/                      ← SVGマップファイル群
```

## データモデルと核心的な決まり

### ノード体系
- ノード 1〜99: LOCATIONS エントリに対応する施設ノード（locid と一致）
- ノード 100〜400: 経路上の通過点（交差点・廊下）— `TRANSIT_NODE_META` で名称管理
- Dijkstra は `GRAPH_NODES`（400ノード）全体を対象とし、特殊な skip はない

### NODE_TRIPLETS と画像命名
ナビの各ステップは「前→現在→次」3ノードの組合せ（NodeTriplet）で決まる。  
画像は `public/assembly/{previous}_{current}_{next}.png`。  
**トリプレットが存在しないと `findRoute()` が例外を投げる**ためデータ追加時は必ずセットで追加する。

```typescript
// 2ノードパス（隣接ノード直結）は特別処理：previous を問わず current+next だけで検索
if (path.length === 2) { /* path.length === 2 分岐 */ }
```

### 特殊 locid（自動選択）
`"m"` 男子トイレ / `"f"` 女子トイレ / `"u"` 多目的トイレ / `"g"` ゴミステーション / `"r"` 休憩所  
→ `home-page-client.tsx` で最近傍ノードを Dijkstra で自動選択し仮想 Location オブジェクトに変換

### 雨天・バリアフリーモード
`getEdges({ rainy, barrierFree })` でエッジセットを切り替え（ペナルティ係数方式）。  
`outdoor: true` → 雨天時に大きなペナルティ / `hasStairs: true` → バリアフリー時に大きなペナルティ。

## SVGマップとダークモード

- ライト/ダークは**別ファイル**: `GRAND_MAP_fornavigate.svg` / `GRAND_MAP_fornavigate_dark.svg`
- `outdoor-navigation-map.tsx` で `useTheme()` の `resolvedTheme` により切り替え
- 建物内マップは 3 種（共通 viewBox `0 0 295.32 413.16`、`scale(0.765)` + `translate(0 80)` でコンテンツ配置）:
  - `Main_building_MAP_fornavigate.svg` / `Bekkan_MAP_fornavigate.svg` / `Chibikko_MAP_fornavigate.svg`
- SVGマーカーの座標（cx, cy）は **SVG viewBox 座標系**で指定し `locations-server.tsx` に一元管理

### マーカー定義（locations-server.tsx に全集約）
```typescript
OUTDOOR_START_POINT_MARKERS      // 屋外マップ（12マーカー）
MAIN_BUILDING_START_POINT_MARKERS // 企画本館（5マーカー）
BEKKAN_START_POINT_MARKERS        // 企画別館（3マーカー）
CHIBIKKO_START_POINT_MARKERS      // ちびっこ館（2マーカー）
```

## 開発コマンド

```bash
pnpm dev    # 開発サーバー起動
pnpm build  # ビルド（TypeScript/ESLint エラーは無視: next.config.mjs 参照）
pnpm lint   # ESLint
```

> **重要**: `next.config.mjs` で `ignoreBuildErrors: true` / `ignoreDuringBuilds: true` が設定済み。型エラーはビルドを止めないが、実行時エラーの原因になるため修正すること。

## 主要コンポーネントのデータフロー

```
SVGマーカークリック
  → OutdoorNavigationMap.onStartPointSelected(nodeId)
  → HomePageClient.selectedOutdoorNodeId → currentLocation (仮想Location)

LocationSelector（テキスト検索）
  → HomePageClient.currentLocation / destination

「ルートを探す」ボタン
  → GET /api/route?departure={locid}&destination={locid}&rainy=&barrierFree=
  → findRoute() → Dijkstra → NODE_TRIPLETS マッチ → route[] 配列
  → NavigationView でステップ表示（public/assembly/ の画像）
```

## URL 共有
クエリパラメータ `dep=`, `dest=`, `rainy=`, `bf=`, `qr=` で状態を保持・復元。`isUpdatingURL` ref で無限ループを防止。

## ファイル規模の注意点

- `lib/route-finder.ts`: **約10,673行**（GRAPH_EDGES + NODE_TRIPLETS をインライン定義）。編集時はファイル末尾の `findRoute()` / `dijkstra()` 関数の位置を確認してから作業すること。
- `app/locations-server.tsx`: **約2,593行**（全施設・全マーカー定義）。

## SVG 編集の注意点

- Webpack は `@svgr/webpack`（SVGO無効）でSVGをロード → クラス名・ID が保持される
- SVGスタイルは `st*` クラスで管理（例: `st17` = 青枠ヘッダー, `st27` = 道路色）
- ダークSVG編集時はライト版も確認し、両ファイルを同期させること
