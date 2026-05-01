# KODAnnai 作業履歴・引き継ぎ資料

> **最終更新**: 2026年5月1日  
> **プロジェクト**: KODAnnai — KODAIRA祭キャンパスナビゲーションアプリ  
> **技術スタック**: Next.js 14 / React 18 / TypeScript / Tailwind CSS v4 / next-themes / Vercel

---

## 目次

1. [プロジェクト概要](#プロジェクト概要)
2. [ファイル構成と役割](#ファイル構成と役割)
3. [作業履歴（AI実施分）](#作業履歴ai実施分)
4. [作業履歴（手動実施分）](#作業履歴手動実施分)
5. [既存ドキュメントの統合サマリー](#既存ドキュメントの統合サマリー)
6. [現在の状態と残課題](#現在の状態と残課題)

---

## プロジェクト概要

KODAnnai は、KODAIRA祭（学園祭）の来場者向けキャンパスナビゲーション Web アプリ。出発地点と目的地を選ぶと、Dijkstra アルゴリズムで最短経路を算出し、写真付きのターンバイターンナビゲーションを提供する。

### 主な機能

- **経路検索**: 出発地 → 目的地のルートをDijkstraで算出
- **写真ナビ**: 各経路ステップにNODE_TRIPLETS（3ノード組合せ）の撮影画像を表示
- **雨天モード**: 屋外通路を避けるルーティング（outdoor フラグにペナルティ）
- **バリアフリーモード**: 階段を避けるルーティング（hasStairs フラグにペナルティ）
- **ダークモード**: next-themes による明暗切り替え（SVGマップも別ファイルで対応）
- **屋外マップ選択**: SVGマップ上のマーカーをタップして出発地点を選択
- **建物内マップ選択**: 企画本館・企画別館・ちびっこ館の建物マップからも出発地選択可能
- **URL共有**: クエリパラメータで出発地・目的地・モードを保持

---

## ファイル構成と役割

### コア・ロジック

| ファイル                             | 役割                                                                               |
| ------------------------------------ | ---------------------------------------------------------------------------------- |
| `lib/route-finder.ts`                | 経路探索エンジン。型定義、GRAPH_EDGES、NODE_TRIPLETS、Dijkstra、findRoute()        |
| `app/locations-server.tsx`           | 全施設データ (LOCATIONS配列)、マーカー定義（屋外・各建物）、locidマッピング        |
| `app/api/route/route.ts`             | HTTP API エンドポイント `/api/route?from=&to=&rainy=&barrier=`                     |

### UI コンポーネント

| ファイル                                        | 役割                                                                                     |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `app/home-page-client.tsx`                      | メインページ。出発地/目的地選択UI、タブ切替、検索実行                                    |
| `components/location-selector.tsx`              | 場所選択コンポーネント。カテゴリフィルタ、テキスト検索                                   |
| `components/outdoor-navigation-map.tsx`         | 屋外SVGマップ表示。マーカー・建物エリアタップで出発地選択。建物MAP切替。ダーク/ライト切替 |
| `components/navigation-view.tsx`                | ルート結果表示コンポーネント                                                             |
| `app/page.tsx`                                  | サーバーコンポーネント。OGメタデータ生成 + HomePageClient呼出                           |
| `app/layout.tsx`                                | ルートレイアウト。ThemeProvider設定                                                      |

### 地図 SVG ファイル（public/）

| ファイル                              | 用途                                                  |
| ------------------------------------- | ----------------------------------------------------- |
| `GRAND_MAP.svg`                       | 屋外マップ全体図（非ナビ用、閲覧用）                  |
| `GRAND_MAP_fornavigate.svg`           | ナビゲーション用マップ（**ライトモード**）             |
| `GRAND_MAP_fornavigate_dark.svg`      | ナビゲーション用マップ（**ダークモード**）             |
| `Main_building_MAP_fornavigate.svg`   | 企画本館 建物内MAP（青枠ヘッダー・オレンジマーカー付き）|
| `Bekkan_MAP_fornavigate.svg`          | 企画別館 建物内MAP（青枠ヘッダー・オレンジマーカー付き）|
| `Chibikko_MAP_fornavigate.svg`        | ちびっこ館 建物内MAP（青枠ヘッダー付き）              |

### ナビゲーション画像

- `public/assembly/` — 512枚のPNG画像
- 命名規則: `{previous}_{current}_{next}.png`（NODE_TRIPLETSの `image` に対応）

---

## 作業履歴（AI実施分）

以下は GitHub Copilot (AI) が実施した変更の一覧です。

### 1. ダークモード SVG マップの作成・分離

**対象ファイル**: `GRAND_MAP_fornavigate_dark.svg` (新規), `GRAND_MAP_fornavigate.svg` (復元)

- ライトモードSVGのスタイルを変更してダーク版を試作 → ライトに影響が出たため**別ファイルに分離**する方針に変更
- `GRAND_MAP_fornavigate_dark.svg` を新規作成し、以下のスタイルを適用:
  - `st27` (道路): `#f5ebd3` → **`#334155`** (ダークスレートグレー)
  - `st10`, `st12` (道路名テキスト): `#231815` → **`#fff`** (白)
  - `st24` (クラス模擬店ロータリー芝生): `#bad695` → **`#6fbf5f`** (明るい緑、暗背景での視認性確保)
  - `st9` (建物名): 白のまま維持（黒を試したが戻した）
- `GRAND_MAP_fornavigate.svg` はオリジナルの色に完全復元:
  - `st27`: `#f5ebd3` (ベージュ), `st10/st12`: `#231815` (ダーク), `st7`: `#231815`

### 2. outdoor-navigation-map.tsx のダークモード対応

**対象ファイル**: `components/outdoor-navigation-map.tsx`

- `useTheme()` (next-themes) を導入
- `resolvedTheme === "dark"` で SVG ファイルを切り替え:
  ```
  dark → /GRAND_MAP_fornavigate_dark.svg
  light → /GRAND_MAP_fornavigate.svg
  ```

### 3. SVGテキスト調整（全3マップ共通）

**対象ファイル**: `GRAND_MAP.svg`, `GRAND_MAP_fornavigate.svg`, `GRAND_MAP_fornavigate_dark.svg`

- **「クラス模擬店ロータリー」テキスト**: font-size を **6.6px** に拡大（視認性向上）
- **「正門通り」テキスト**: x座標を **136.59** に調整（位置の中央寄せ）

### 4. GRAND_MAP.svg ヘッダーボックス調整

**対象ファイル**: `GRAND_MAP.svg`

- タイトル「KODAIRA祭屋外MAP」を囲む青枠 rect を調整:
  - `width`: 268.01 → **224**（テキスト幅に合わせて縮小）
  - `height`: 元の 67.84 → **24.78**（サブテキスト削除分）
  - 角丸 `rx="6" ry="6"` 追加
- タイトルテキストを **`text-anchor="middle"`** で中央揃え
  - translate X を `8.6` → **`115.18`**（rect中心 = 3.18 + 224/2）

### 5. route-finder.ts の隣接ノード（2ノードパス）バグ修正

**対象ファイル**: `lib/route-finder.ts`

- **問題**: 出発地と目的地が隣接（例: ノード261→56）の場合、`path.length === 2` となり、通常の for ループで `path[i-1]` (previous) が `undefined` になりトリプレット検索が失敗
- **修正**: `findRoute()` 内に `if (path.length === 2)` の早期分岐を追加
  - `current` と `next` のみで NODE_TRIPLETS を検索（`previous` は問わない）
  - 出発ステップと到着ステップの2要素だけの route を構築

### 6. home-page-client.tsx タブスタイリング

**対象ファイル**: `app/home-page-client.tsx`

- 「出発地点を検索」/「地図から検索」タブボタンのスタイルを反復調整:
  - タブコンテナ: `bg-transparent border border-border dark:bg-transparent dark:border-gray-700`
  - 選択中タブ: `bg-background text-foreground shadow-sm dark:bg-gray-900 dark:text-white`
  - 非選択タブ: `text-muted-foreground hover:text-foreground dark:text-gray-400 dark:hover:text-gray-100`

### 7. ナビゲーション画像の複製

**対象ファイル**: `public/assembly/63_263_269.png`, `63_263_284.png`, `63_263_300.png`

- `63_263_EV.png` を元に3ファイルをコピー生成（ターミナルで `cp` コマンド実行）
- route-finder.ts の該当 triplet エントリの image 参照用

### 8. ズームモーダルに進捗バー追加

**対象ファイル**: `components/navigation-view.tsx`

- ズームモーダルのフッター部（前へ/次へボタンの上）に進捗バーを追加
- グレー背景 + 青の達成済みバーで進捗を表示
- 「次へ」/「前へ」ボタンで `transition-all duration-500 ease-in-out` の滑らかなアニメーション
- 進捗基準: triplet 1ステップ = 1単位、`(currentZoomIndex + 1) / (routeSteps.length - 1)` で算出
- ピクトグラム人形は試行錯誤の末削除（絵文字🚶 → SVG棒人間 → SVG歩行ピクトグラム → 不要と判断し削除）

### 9. 建物MAPナビゲーション実装（企画本館・企画別館・ちびっこ館）

**対象ファイル**: `public/Main_building_MAP_fornavigate.svg`, `public/Bekkan_MAP_fornavigate.svg`, `public/Chibikko_MAP_fornavigate.svg`, `components/outdoor-navigation-map.tsx`, `app/locations-server.tsx`

#### 共通仕様（3建物MAP）

- **青枠ヘッダー**: `st17`クラス（`fill:#77a3ce stroke:#749dc5`）、`rx="6" ry="6"` の角丸矩形
- **タイトルフォント**: `st18`クラス (`font-size:21px`)
- **説明文**: `st20`クラス (`font-size:6.5px fill:#231815`)
- **viewBox統一**: `0 0 295.32 413.16`
- **地図コンテンツ変換**: `<g transform="translate(0 80) scale(0.765 or 0.754)">` でラップ

#### 企画本館MAP（Main_building_MAP_fornavigate.svg）

- オレンジ色マーカー5個（`st14`クラスのピンク矢印）実装
- `MAIN_BUILDING_MARKERS` 配列を locations-server.tsx に追加
- outdoor-navigation-map.tsx に `showMainBuildingMap` state と本館エリアタップハンドラを追加

#### 企画別館MAP（Bekkan_MAP_fornavigate.svg）

- オレンジ色マーカー3個実装
- `BEKKAN_MARKERS` 配列を locations-server.tsx に追加
- outdoor-navigation-map.tsx に `showBekkanMap` state と別館エリアタップハンドラを追加
- 1F/2F/3Fラベルを追加試みたが正確な座標が取れず削除

#### ちびっこ館MAP（Chibikko_MAP_fornavigate.svg）

- 元SVG（viewBox 386.23×280.39、横長）を295.32×413.16に再設計
- 青枠ヘッダー、タイトル「KODAIRA祭ちびっこ館MAP」（他2館と統一フォーマット）
- 地図コンテンツを `scale(0.765)` + `translate(0 80)` で縮小・配置
- `_下地`・`_アイコン1` グループを外側 `<g transform>` でラップ
- ちびっこ館のマーカーは未実装（ノード座標の特定待ち）

#### outdoor-navigation-map.tsx のちびっこ館対応

```tsx
const [isChibikkoHovered, setIsChibikkoHovered] = useState(false);
const [showChibikkoMap, setShowChibikkoMap] = useState(false);

const handleChibikkoTap = () => {
  setPendingMarker(null);
  setShowChibikkoMap(true);
};
```

- タップ領域: GRAND_MAP.svg から実際の建物 path を抽出して使用
- 表示: `Image src="/Chibikko_MAP_fornavigate.svg?v=20260425-1"` width=386 height=280、「← 屋外MAPへ戻る」ボタン付き

#### マーカー定義の一元管理

- OUTDOOR_MAP_MARKERS, MAIN_BUILDING_MARKERS, BEKKAN_MARKERS を `app/locations-server.tsx` に集約
- outdoor-navigation-map.tsx は props でマーカーを受け取る形に整理

### 10. ロータリーマーカー名の統一

**対象ファイル**: `app/locations-server.tsx`, `components/outdoor-navigation-map.tsx`

- ロータリーマーカーの表示名を全て「クラス模擬店ロータリー」に統一
- ノードID（例: `node: 263`）の付記を全て削除してユーザー向け表示をシンプルに

### 11. assembly PDF → PNG 一括変換

**対象ファイル**: `public/assembly/` 内の40個のPDFファイル

- `public/assembly/` に混在していた40個のPDFファイルをすべてPNGに変換
- macOS 標準の `sips -s format png` コマンドを使用（ImageMagick/Homebrew未インストール環境）
- 変換手順:
  1. テスト変換: `86_298_281.pdf` → `86_298_281.png`（574×765, RGBA）で成功確認
  2. 全40ファイルを一括変換ループで処理
  3. 「86_300_269.pdf のコピー.pdf」（不正ファイル名）→ 変換後 `86_300_269.png` にリネーム、コピーファイル削除
  4. 全PDFに対応するPNGの存在を検証
  5. 元PDFファイル39個を削除
- 変換後の `public/assembly/` 内PNG数: **512枚**

---

## 作業履歴（手動実施分）

以下はユーザー（開発者本人）が手動で実施した作業です。

### グラフデータの構築（route-finder.ts）

- **GRAPH_NODES**: 1〜200のノード配列を定義
- **GRAPH_EDGES**: KODAIRA祭キャンパスの全通路データを作成（双方向エッジ、距離、outdoor/hasStairs属性）
- **NODE_TRIPLETS**: 472件のナビゲーション指示データを手動登録（previous, current, next, テキスト指示, 画像ファイル名）
- **NODE_MAP_MARKERS**: 屋外マップSVG上の各ノード座標(x,y)を手動マッピング

### 施設データの構築（locations-server.tsx）

- **LOCATIONS配列**: 全施設データ（id, locid, name, description, floor, category等）を登録
- 特殊エントリ: 最寄りトイレ、ゴミステーション等の自動選択プリセット
- 出発地点プリセット（id: "9001"〜）: 正門通り、クラス模擬店ロータリー等

### ナビゲーション写真の撮影・配置

- `public/assembly/` に472枚のPNG画像を配置
- 命名規則 `{previous}_{current}_{next}.png` に従いファイル名を付与

### SVGマップの作成

- `GRAND_MAP.svg` / `GRAND_MAP_fornavigate.svg` の元データ作成（Illustrator等で制作と推測）
- マーカー位置（NODE_MAP_MARKERS）とSVG上の座標の対応付け

### UIデザイン・ページ構成

- home-page-client.tsx のUI全体設計（タブ構造、検索フロー）
- location-selector.tsx のカテゴリフィルタ・検索UI
- navigation-view.tsx のルート表示UI
- footer.tsx, logo.tsx 等の共通コンポーネント

### デバッグスクリプト

- `scripts/check_locations.js` — 施設データの整合性チェック
- `scripts/find_duplicate_ids_strict.js` — 重複ID検出
- `scripts/fix_locations.js` — 施設データ修正用

### 12. GRAPH_NODES 拡張・∞バグ修正

**対象ファイル**: `lib/route-finder.ts`

- **問題**: `GRAPH_NODES` が `Array.from({ length: 200 })` で定義されており、ノード番号201〜328（中継ノード）が存在しないため Dijkstra が∞を返すケースがあった
- **修正**: `Array.from({ length: 400 })` に拡張
- **結果**: `scripts/nearest_facilities_report.mjs` による全67出発地×全施設の到達確認で **∞ 0件** を確認

### 13. nearest_facilities_report.mjs BASE_URL 修正

**対象ファイル**: `scripts/nearest_facilities_report.mjs`

- `BASE_URL` が `http://localhost:3001` のままだったため接続不可だった
- `http://localhost:3000` に修正し、スクリプト正常動作を確認

### 14. 全ルート 500 エラー網羅スキャン・修正

**対象ファイル**: `lib/route-finder.ts`

- 全 locid（117ノード）の全ペアでAPIを叩く Node.js スクリプトを作成・実行
- 発見したエラーと対処:
  - `(41, 2321, 44)` → `current: 2321` が typo（正: `current: 43`）。ユーザーが手動修正済み → 確認
  - `(119, 328, 120)` / `(120, 328, 119)` → トイレ同士の移動のため意図的に対応なし
  - `X → 7` 系 → ノード7は意図的に孤立（到達可能だが案内対象外）
- **結果**: 意図しない 500 エラーは **全件解消**

---

## 既存ドキュメントの統合サマリー

以下は `KODANNAI_SETUP_CHECKLIST.md`, `ROUTE_FINDER_EXPLANATION.md`, `ROUTE_FINDER_QUICK_REFERENCE.md` に記載されていた情報の要約です。これらのドキュメントは**初期構築時の計画ガイド**であり、現在は大部分が実装済みです。

### route-finder.ts の構造（クイックリファレンス）

| 部分             | 行番号(目安) | 内容                              | 状態                  |
| ---------------- | ------------ | --------------------------------- | --------------------- |
| 型定義           | 1〜30        | GraphNode, GraphEdge, NodeTriplet | ✅ 完了               |
| NODE_MAP_MARKERS | 31〜         | SVGマーカー座標                   | ✅ 完了               |
| GRAPH_NODES      | 〜48         | ノード配列(1〜200)                | ✅ 完了               |
| GRAPH_EDGES      | 50〜         | 通路データ(双方向)                | ✅ 完了               |
| getEdges()       | 〜760        | 雨/バリアフリーペナルティ         | ✅ 完了               |
| NODE_TRIPLETS    | 〜800〜      | ナビ画像・指示(472件)             | ✅ 完了               |
| dijkstra()       | 〜6584       | 経路探索アルゴリズム              | ✅ 完了               |
| findRoute()      | 〜6670       | メインAPI関数                     | ✅ 完了(2ノードfix済) |

### モード別動作

- **通常**: GRAPH_EDGES そのまま使用 → 最短経路
- **雨天**: outdoor=true のエッジ distance × 10,000,000 → 屋内優先
- **バリアフリー**: hasStairs=true のエッジ distance × 100,000,000 → 階段回避
- **両方**: 両ペナルティ同時適用

### セットアップチェックリストの達成状況

- ✅ フェーズ1: グラフ設計（交差点決定、隣接関係、距離測定、属性標記）
- ✅ フェーズ2: GRAPH_EDGES の置き換え（KODAIRA祭用データで完成）
- ✅ フェーズ3: locations-server.tsx との接続（locid設定済み）
- ✅ フェーズ4: NODE_TRIPLETS ナビゲーション画像（472件登録済み）
- ✅ フェーズ5: GRAPH_EDGES_RAINY 廃止 → getEdges() のペナルティ方式に統一

---

## 現在の状態と残課題

### 完了済み ✅

| 項目                          | 詳細                                                           |
| ----------------------------- | -------------------------------------------------------------- |
| 経路探索コア                  | Dijkstra + findRoute() 動作                                    |
| 施設データ                    | 全施設 LOCATIONS 配列登録済                                    |
| ナビ画像                      | 512枚（PDF→PNG変換40枚含む）                                   |
| ダークモードSVG分離           | ライト/ダークで別ファイル切替                                  |
| 2ノードパスバグ修正           | 隣接ノード間ルーティング対応                                   |
| タブUIスタイリング            | ダーク/ライト両対応                                            |
| SVGテキスト調整               | ロータリー文字拡大、正門通り位置                               |
| GRAND_MAP.svgヘッダー         | 枠縮小+タイトル中央揃え                                        |
| ズームモーダル進捗バー        | ステップ進捗の可視化バー実装                                   |
| 建物MAPナビ（企画本館）       | 青枠ヘッダー・オレンジマーカー5個・屋外MAPタップで開く         |
| 建物MAPナビ（企画別館）       | 青枠ヘッダー・オレンジマーカー3個・屋外MAPタップで開く         |
| 建物MAPナビ（ちびっこ館）     | 青枠ヘッダー・屋外MAPちびっこ館建物タップで開く                |
| マーカー定義の一元管理        | locations-server.tsx に OUTDOOR/BEKKAN/MAIN_BUILDING マーカー集約 |
| ゴミステーション最寄り分析    | scripts/nearest_garbage_station.ts で近接分析実施              |
| ロータリーマーカー名統一      | 全て「クラス模擬店ロータリー」に統一（ノードID付記なし）       |
| ちびっこ館 viewBox統一        | 295.32×413.16 に変更、地図を0.765スケールで縮小               |
| GRAPH_NODES 拡張              | length 200 → 400 に修正、中継ノード201〜328を正しく認識        |
| 全ルート∞バグ解消             | 全67出発地×全施設の最寄り確認で∞ 0件達成                      |
| 全ルート500エラー解消         | 全117 locidペアスキャン実施、意図しない500エラー全件解消       |

### 既知の残課題 🔄

| 項目                                    | 詳細                                                          |
| --------------------------------------- | ------------------------------------------------------------- |
| ちびっこ館 建物内マーカー              | 現在マーカーなし。ノード座標の特定・追加が必要                |
| ナビ画像の一部がプレースホルダー        | 一部の画像がコピーによる暫定対応                              |
| 別館1F/2F/3F 階数ラベル                | 追加試みたが座標が合わず削除済。再挑戦が必要                  |
| 屋外MAPのちびっこ館タップ領域         | pathで建物形状を使用中、実際の表示で境界を要確認              |

---

_このドキュメントは KODANNAI_SETUP_CHECKLIST.md, ROUTE_FINDER_EXPLANATION.md, ROUTE_FINDER_QUICK_REFERENCE.md の内容を統合し、実際の開発作業履歴を加えたものです。_
