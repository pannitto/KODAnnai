# KODAnnai — 保守・引き継ぎメモ

**最終更新**: 2026-08-26

## 概要
本リポジトリはKODAIRA祭向けのキャンパスナビゲーションWebアプリ（Next.js 14 / TypeScript）。来場者が出発地と目的地を指定すると Dijkstra による最短経路を算出し、ステップごとに写真（画像）で案内します。

## 主要に実施した変更（要点）
- assembly画像の一括最適化（PNG圧縮・WebP化）を実行し、配信サイズを大幅に削減
- `public/assembly/` を WebP 運用に移行、不要な PNG は削除
- `lib/route-finder.ts` の `NODE_TRIPLETS` を `.webp` 参照に統一
- `components/navigation-view.tsx`
  - ズームモーダルでのスクロールの誤爆（多重 smooth scroll）を防止（modal中はスクロール抑止）
  - 前/次ボタンの連打防止（短時間 disabled フラグ）を追加
  - 現在ステップのノードに応じて地図タブを `Main_building_MAP_fornavigate.svg` / `Bekkan_MAP_fornavigate.svg` / `Chibikko_MAP_fornavigate.svg` / `GRAND_MAP.svg` に切替
  - route検索成功時に `route_searched` のカスタムイベント（`@vercel/analytics`）を送信するコードを追加（ただし Vercel の Pro 機能が必要でない場合は Logs 集計で代替）
- `/api/route` にログ出力を追加して、`[route] from="..." to="..." ...` 形式で Vercel Logs に残すようにした（カスタムイベントが使えない場合の代替）
- `scripts/generate_triplets.js` の出力拡張子を `.webp` に変更
- 画像ファイル名・NODE_TRIPLETS の整合性を検証して欠損ファイルを補完

## このサイトでできる主な機能
- 出発地点／目的地入力 → API 呼び出し → 経路（node list / edge list / step list）を取得
- ステップ単位の詳細表示（写真）と拡大モーダル
- 雨天モード／バリアフリーモードによる経路分岐（edge にペナルティを付与）
- SVG マップ切替（屋外全体図と建物別マップ）
- 画像は WebP 前提で配信（軽量化）
- アクセス解析: Vercel Analytics（Overview/Pages/Events）
- 代替のログ集約: Vercel Logs に `[route]` ログを出力（イベント未使用時の集計手段）

## 運用・計測（引き継ぎ手順）
### 1) Vercel ダッシュボード
- Project: KODAnnai を開く
- Analytics → Overview / Pages / Events を確認（Events は Pro の場合カスタム集計可）
- Logs タブで `route` をフィルタ:  `message` に `[route]` を含むログを検索

### 2) カスタムイベント
- 無料枠で簡単に集計したいなら `/api/route` に書いた `console.log` を利用し、デプロイ後 Logs をダウンロードして集計
- Pro プランでカスタムイベント利用が可能なら、Analytics → Events で `route_searched` を見る（UI上でランキングなどの可視化が可能）

### 3) リアルタイムカウント（Upstash / Redis）
- Upstash Redis を Vercel Marketplace 経由で追加
- Vercel の Stores 画面でプロジェクトに Connect し、`.env.local` を `npx vercel env pull .env.local` で取得
- 取得された環境変数（`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`）を使ってサーバー側でカウンターを増加可能
- Upstash 無料枠: **10,000 コマンド/日**（1検索=1コマンド目安）→ 文化祭2日間なら概ね十分

## 本番当日のチェックリスト（簡潔）
- デプロイ確認: `vercel` による最新コミットが `main` にデプロイ済みか
- Analytics: Overview のトラフィックグラフが動いているか
- Logs: `route` フィルタでアクセスログが流れているか（`[route] from=... to=...`）
- 画像配信: サイトでナビを開き、画像が表示されるか（WebPで404が出ないか）
- Map 切替: ナビ拡大→Map タブで本館/別館/ちびっこ館が適切に切替されるか
- 負荷確認: 短時間に何件かルート検索を試し、API レイテンシが許容内（数十〜数百ms）か確認

## 参照コマンド（ローカル）
```bash
# 最新環境変数をローカルに取得（Vercel CLIにログイン必要）
npx vercel env pull .env.local

# ログをリアルタイムで見る（Vercel GUI推奨）
# ローカルで簡易的にAPIを叩く
curl "https://<your-deploy-url>/api/route?departure=260&destination=263&rainy=false&barrierFree=false"
```

## ファイル / 重要箇所（参照）
- ルート計算: `lib/route-finder.ts`（Dijkstra / NODE_TRIPLETS / findRoute）
- 画像一覧・生成: `public/assembly/`（WebPで運用）
- ルートAPI: `app/api/route/route.ts`（ログ出力を追加）
- UI: `components/navigation-view.tsx`（ズームモーダル・地図切替・イベント送信）
- 生成スクリプト: `scripts/generate_triplets.js`（出力拡張子を webp に変更）
- 施設データ: `app/locations-server.tsx`（LOCATIONS 配列・マーカー定義）
- 作業履歴: `WORK_HISTORY.md`

## 変更履歴（要約）
- 画像最適化（PNG圧縮→WebP、PNG削除）による配信サイズ削減
- ナビUX改善（スクロール誤動作修正・連打抑止）
- 画像参照の .webp 化（`lib/route-finder.ts` と生成スクリプト）
- ルート検索ログ出力（Vercel Logs）と Analytics イベント送信コードの追加
- 建物マップの自動切替（現在ノードに基づく）

## 引き継ぎメモ（運用上の注意）
- `public/assembly/` を直接編集する場合は、`scripts/generate_triplets.js` の出力フォーマットに注意（現状 `.webp` を想定）
- NODE_TRIPLETS にトリプレットを追加する際は、対応する画像（`previous_current_next.webp`）が必須。画像が無いと `findRoute()` は placeholder を返す
- 画像を再圧縮・差し戻す作業は git 操作と大容量のpushを伴うため、履歴が肥大化する点に注意

---

必要であれば、次の追加作業を提案します（やりたいものを選んでください）:
- Upstash Redis を使ったリアルタイム集計の実装（カウンターAPI + `/stats` ページ）
- Vercel Analytics の Events を Pro で有効にした場合の集計ダッシュボード作成
- `WORK_HISTORY.md` の更なる整備（コミットSHAと日付の自動挿入）

```text
ファイル生成先: MAINTENANCE_AND_HANDOVER.md
```
