# KODAnnai カスタマイズ機能 技術設計ドキュメント

## 概要

本ドキュメントは、既存の筑駒GO文化祭案内アプリケーションをベースに、KODAnnai（私の学校の文化祭用ナビゲーションアプリ）にカスタマイズする機能の技術設計を定義します。

### 設計目標

- 既存のNext.js + TypeScriptアーキテクチャを維持
- 型安全性を保ちながら場所データを全面書き換え
- 雨天モードとバリアフリーモードの新機能を追加
- ゴミステーション検索機能を追加
- ブランディング要素を「Tsukukoma GO」から「KODAnnai」に変更
- 既存のトイレ検索、ルート検索、検索機能を保持

### スコープ

**含まれるもの:**

- ブランディング要素の変更（アプリ名、ロゴ、メタデータ）
- 場所データの全面書き換え
- 雨天モード機能の実装
- ゴミステーション検索機能の追加
- バリアフリーモード機能の実装
- 地図画像差し替え箇所の明示

**含まれないもの:**

- アプリケーションの基本アーキテクチャの変更
- ルート検索アルゴリズムの変更
- UIフレームワークの変更
- バックエンドAPIの追加

## アーキテクチャ

### システム構成

```
KODAnnai Application
├── Frontend (Next.js 14+ App Router)
│   ├── app/
│   │   ├── page.tsx (メインページ)
│   │   ├── layout.tsx (レイアウト・メタデータ)
│   │   ├── home-page-client.tsx (クライアントコンポーネント)
│   │   ├── locations-server.tsx (場所データ定義)
│   │   └── api/
│   │       └── route/ (ルート検索API)
│   ├── components/
│   │   ├── location-selector.tsx (場所選択UI)
│   │   ├── navigation-view.tsx (ナビゲーション表示)
│   │   └── logo.tsx (ロゴコンポーネント)
│   └── lib/
│       └── route-finder.ts (ルート検索ロジック)
└── Data Layer
    ├── LOCATIONS (場所データ配列)
    ├── GRAPH_NODES (グラフノード定義)
    ├── GRAPH_EDGES (通常時エッジ重み)
    └── GRAPH_EDGES_RAINY (雨天時エッジ重み)
```

### アーキテクチャ原則

1. **型安全性の維持**: TypeScript strict modeを使用し、全てのデータ操作で型チェックを実施
2. **データ駆動設計**: 場所データとグラフデータを分離し、設定変更で動作を制御
3. **クライアントサイドレンダリング**: ユーザーインタラクションの高速化のため、主要コンポーネントはクライアントサイドで実行
4. **段階的機能追加**: 既存機能を保持しながら新機能を追加
5. **保守性重視**: コメントとドキュメントで将来のメンテナンスを容易化

## コンポーネントとインターフェース

### 1. データモデル

#### Location型定義

```typescript
export type Location = {
  id: string; // 内部ID（一意）
  locid: string; // グラフノードID
  name: string; // 表示名
  category: string; // カテゴリ（展示、体験、トイレなど）
  organizer: string; // 主催者
  position: string; // 位置情報（テキスト）
  keywords: string[]; // 検索キーワード（ひらがな）
};
```

#### Configuration型定義（新規）

```typescript
export type AppConfiguration = {
  rainyMode: boolean; // 雨天モード有効/無効
  barrierFreeMode?: boolean; // バリアフリーモード有効/無効（雨天モード時のみ）
};
```

### 2. 主要コンポーネント

#### LocationSelector

**責務**: 場所の検索と選択UI

**Props**:

```typescript
interface LocationSelectorProps {
  label: string;
  placeholder: string;
  value: Location | null;
  departure: boolean; // 出発地点か目的地か
  onChange: (location: Location | null) => void;
}
```

**機能**:

- キーワード検索（カタカナ→ひらがな変換）
- 検索結果のランキング（名前 > 主催者 > キーワード > カテゴリ > 位置）
- ユーティリティ場所（トイレ、階段）の優先度低下
- 自動選択機能（最寄りのトイレ、ゴミステーション）

#### NavigationView

**責務**: ルート案内の表示

**Props**:

```typescript
interface NavigationViewProps {
  from: Location;
  to: Location;
  onBack: () => void;
  rainyMode?: boolean;
  barrierFreeMode?: boolean; // 新規追加
}
```

**機能**:

- ステップバイステップのナビゲーション表示
- 画像付きルート案内
- 雨天モード表示
- バリアフリーモード表示（新規）
- 地図画像の拡大表示

#### HomePageClient

**責務**: メインページのクライアントサイドロジック

**State**:

```typescript
const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
const [destination, setDestination] = useState<Location | null>(null);
const [rainyMode, setRainyMode] = useState(false);
const [barrierFreeMode, setBarrierFreeMode] = useState(false); // 新規追加
```

**機能**:

- URL パラメータからの状態復元
- 最寄り施設の自動選択（トイレ、ゴミステーション）
- ナビゲーション開始

### 3. ルート検索システム

#### RouteFinder

**責務**: グラフベースの最短経路探索

**入力**:

- 出発地点のLocation ID
- 目的地のLocation ID
- 雨天モードフラグ
- バリアフリーモードフラグ（新規）

**出力**:

```typescript
interface RouteStep {
  id: string;
  title: string;
  image: string;
  notice?: {
    text: string;
    color: "red" | "yellow" | "blue" | "green" | "gray";
  };
}
```

**アルゴリズム**: Dijkstraの最短経路アルゴリズム

**グラフデータ構造**:

- `GRAPH_NODES`: 最大200ノード
- `GRAPH_EDGES`: 通常時のエッジ重み
- `GRAPH_EDGES_RAINY`: 雨天時のエッジ重み（屋外経路の重みを増加）
- `GRAPH_EDGES_BARRIER_FREE`: バリアフリー時のエッジ重み（階段・狭い通路を回避）（新規）

## データモデル

### 場所データ構造

#### カテゴリ定義

```typescript
type LocationCategory =
  | "展示"
  | "体験"
  | "パフォーマンス"
  | "映画"
  | "演劇"
  | "男子トイレ"
  | "女子トイレ"
  | "男女トイレ"
  | "男子トイレ自動選択"
  | "女子トイレ自動選択"
  | "ゴミステーション" // 新規追加
  | "ゴミステーション自動選択" // 新規追加
  | "その他"
  | "避難所";
```

#### 特殊なLocation ID

- `"m"`: 最寄りの男子トイレ（自動選択トリガー）
- `"f"`: 最寄りの女子トイレ（自動選択トリガー）
- `"g"`: 最寄りのゴミステーション（自動選択トリガー）（新規）
- `"169"`: グラウンド（避難所、雨天モード無効）

### グラフデータ構造

#### ノード定義

```typescript
export interface GraphNode {
  id: number;
  coordinates?: { floor: string };
}
```

#### エッジ定義

```typescript
export interface GraphEdge {
  from: number;
  to: number;
  distance: number;
  notice?: {
    text: string;
    color: "red" | "yellow" | "blue" | "green" | "gray";
  };
  barrierFree?: boolean; // 新規: バリアフリー対応エッジ
}
```

#### エッジ重み調整ルール

**通常モード (`GRAPH_EDGES`)**:

- 基本距離をそのまま使用

**雨天モード (`GRAPH_EDGES_RAINY`)**:

- 屋外経路の距離を4倍に増加（屋内経路を優先）
- 例: 20m → 80.4m

**バリアフリーモード (`GRAPH_EDGES_BARRIER_FREE`)** (新規):

- 階段を含むエッジを除外または重みを大幅に増加
- 狭い通路（幅1.2m未満）を回避
- エレベーター・スロープを優先

### ナビゲーション画像データ

#### NodeTriplet構造

```typescript
export interface NodeTriplet {
  previous: number | null;
  current: number;
  next: number | null;
  prev_name: string | null;
  curr_name: string;
  next_name: string | null;
  image: string; // /public/assembly/ 配下の画像ファイル名
}
```

#### 画像ファイル命名規則

- フォーマット: `{index}_{previous}-{current}-{next}.jpg`
- 例: `1_2-1-18.jpg`
- 配置場所: `/public/assembly/`

**地図画像差し替え箇所**:

```typescript
// components/navigation-view.tsx
// 地図画像の参照箇所
<Image
  src="/grandmap.png"  // ← ここを差し替え: 学校全体図
  alt="学校全体図"
  height="800"
  width="600"
/>

// 期待されるフォーマット: PNG または SVG
// 推奨サイズ: 幅600px、高さ800px
// 配置場所: /public/
```

## 正確性プロパティ

_プロパティとは、システムの全ての有効な実行において真であるべき特性や動作のことです。プロパティは、人間が読める仕様と機械で検証可能な正確性保証の橋渡しとなります。_

### プロパティリフレクション

受入基準を分析した結果、以下のプロパティの冗長性と統合の機会を特定しました:

**統合されたプロパティ**:

- 2.2と6.2: Location型の構造維持と型安全性は同じ概念を検証
- 8.2と8.3: 最寄りのトイレ自動選択は同じメカニズムを使用
- 3.2と3.3: 雨天モードのエッジ選択は同じプロパティの異なる状態

**除外されたプロパティ**:

- 1.4: ブランディングの一貫性は主観的で自動テスト困難
- 6.3: 型定義の更新は開発プロセスの要件で自動テスト不可

### プロパティ 1: Location型構造の保持

_任意の_ Locationオブジェクトについて、id、locid、name、category、organizer、position、keywordsの全フィールドが存在し、TypeScriptの型定義に準拠している必要があります。

**検証要件**: 2.2, 6.1, 6.2

### プロパティ 2: 日本語キーワード検索

_任意の_ 日本語キーワード（ひらがな、カタカナ、漢字）について、カタカナがひらがなに変換され、場所名、カテゴリ、主催者、位置、キーワードフィールドで検索が実行される必要があります。

**検証要件**: 2.4, 10.1, 10.2, 10.3

### プロパティ 3: カテゴリの妥当性

_任意の_ Locationオブジェクトについて、categoryフィールドが定義された有効なカテゴリ（展示、体験、パフォーマンス、トイレ、ゴミステーション、その他など）のいずれかである必要があります。

**検証要件**: 2.5

### プロパティ 4: 雨天モードのエッジ選択

_任意の_ ルート検索について、rainyModeがtrueの場合はGRAPH_EDGES_RAINYが使用され、falseの場合はGRAPH_EDGESが使用される必要があります。

**検証要件**: 3.2, 3.3

### プロパティ 5: 雨天モード設定の永続化

_任意の_ ユーザーセッションについて、雨天モードの設定がURLパラメータに保存され、ページ遷移後も保持される必要があります。

**検証要件**: 3.5

### プロパティ 6: 天候に応じた位置情報表示

_任意の_ 場所について、雨天モードが有効な場合、雨天時の位置情報（例: 「総合案内所 (雨天時)」）が表示される必要があります。

**検証要件**: 3.4

### プロパティ 7: 最寄り施設の自動選択

_任意の_ 出発地点について、目的地が「最寄りの男子トイレ」「最寄りの女子トイレ」「最寄りのゴミステーション」の場合、全候補の中から最短距離の施設が自動的に選択される必要があります。

**検証要件**: 4.2, 8.2, 8.3

### プロパティ 8: ゴミステーションのキーワード検索

_任意の_ ゴミステーション関連キーワード（「ごみすてーしょん」「ゴミ」「ごみ」など）について、検索結果にゴミステーションカテゴリの場所が含まれる必要があります。

**検証要件**: 4.5

### プロパティ 9: ルートナビゲーションの提供

_任意の_ 有効な出発地点と目的地のペアについて、ルート検索APIがステップバイステップのナビゲーション指示を含むRouteStepの配列を返す必要があります。

**検証要件**: 4.4, 8.5, 9.3

### プロパティ 10: バリアフリーモードのエッジ選択

_任意の_ ルート検索について、barrierFreeModeがtrueの場合、階段や狭い通路を含むエッジが回避され、アクセシブルなルートが優先される必要があります。

**検証要件**: 5.2

### プロパティ 11: バリアフリー情報の表示

_任意の_ 場所について、バリアフリーモードが有効な場合、その場所のアクセシビリティ情報（エレベーター有無、スロープ有無など）が表示される必要があります。

**検証要件**: 5.3, 5.4

### プロパティ 12: 代替ルートの提供

_任意の_ ルート検索について、最短経路がバリアフリー対応でない場合、バリアフリーモードが有効な時は代替のアクセシブルなルートが提供される必要があります。

**検証要件**: 5.5

### プロパティ 13: 地図画像ファイルの命名規則

_任意の_ 地図画像ファイルについて、ファイル名が一貫した命名規則（例: floor-1.svg, floor-2.svg）に従っている必要があります。

**検証要件**: 7.5

### プロパティ 14: トイレのタイプ別分類

_任意の_ トイレの場所について、カテゴリが「男子トイレ」「女子トイレ」「男女トイレ」のいずれかである必要があります。

**検証要件**: 8.4

### プロパティ 15: 最短経路の計算

_任意の_ 有効な出発地点と目的地のペアについて、ルート検索アルゴリズムが最短経路（最小コスト）を返す必要があります。

**検証要件**: 9.2

### プロパティ 16: ルートセグメントの情報提供

_任意の_ ルートセグメントについて、距離と方向の情報（notice）が提供される必要があります。

**検証要件**: 9.5

### プロパティ 17: 検索結果のランキング

_任意の_ 検索クエリについて、検索結果が関連性でランク付けされ、完全一致の名前 > 主催者 > キーワード > カテゴリ > 位置の順で優先される必要があります。

**検証要件**: 10.4

### プロパティ 18: ユーティリティ場所の優先度低下

_任意の_ 検索クエリについて、トイレや階段などのユーティリティ場所が、それらを明示的に検索しない限り、検索結果で優先度を下げられる必要があります。

**検証要件**: 10.5

## エラーハンドリング

### エラーケース

1. **無効な場所ID**
   - 検証: URLパラメータのdep/destが存在しないIDの場合
   - 処理: ホームページにリダイレクト
   - ユーザーへの通知: なし（自動リダイレクト）

2. **同一の出発地点と目的地**
   - 検証: dep === dest の場合
   - 処理: ホームページにリダイレクト
   - ユーザーへの通知: なし（自動リダイレクト）

3. **ルート検索失敗**
   - 検証: APIが経路を見つけられない場合
   - 処理: エラーメッセージを表示、サーバーにログ送信
   - ユーザーへの通知: 「経路探索に失敗しました」メッセージと戻るボタン

4. **無効な出発地点**
   - 検証: 出発地点が["m", "f", "g", "169"]に含まれる場合
   - 処理: ホームページにリダイレクト
   - ユーザーへの通知: なし（自動リダイレクト）

5. **無効な目的地**
   - 検証: 目的地が["106"]に含まれる場合
   - 処理: ホームページにリダイレクト
   - ユーザーへの通知: なし（自動リダイレクト）

6. **TypeScriptコンパイルエラー**
   - 検証: 型定義に違反するコードの場合
   - 処理: ビルド時にエラーを表示
   - 開発者への通知: コンパイルエラーメッセージ

### エラーログ

```typescript
// エラーログAPI呼び出し
await fetch(
  `/api/logerror?error=${encodeURIComponent(errorMessage)}&from=${fromId}&to=${toId}&rainy=${rainyMode}`,
);
```

## テスト戦略

### デュアルテストアプローチ

本プロジェクトでは、ユニットテストとプロパティベーステストの両方を使用して包括的なテストカバレッジを実現します。

**ユニットテスト**:

- 特定の例とエッジケースの検証
- コンポーネント間の統合ポイントのテスト
- エラー条件の検証

**プロパティベーステスト**:

- 全ての入力に対して成立すべき普遍的なプロパティの検証
- ランダム化による包括的な入力カバレッジ
- 各テストは最低100回の反復実行

### プロパティベーステストライブラリ

**選択**: `fast-check` (TypeScript/JavaScript用)

**理由**:

- TypeScriptとの優れた統合
- Next.jsプロジェクトとの互換性
- 豊富なジェネレーター機能
- アクティブなメンテナンス

### テストタグ規約

各プロパティベーステストには、設計ドキュメントのプロパティを参照するタグを含めます:

```typescript
// Feature: kodannai-customization, Property 1: Location型構造の保持
test("Location objects maintain required structure", () => {
  fc.assert(
    fc.property(locationArbitrary, (location) => {
      // テストロジック
    }),
    { numRuns: 100 },
  );
});
```

### テストカバレッジ目標

- **ユニットテスト**: 主要コンポーネントとユーティリティ関数の80%以上
- **プロパティベーステスト**: 全18個の正確性プロパティをカバー
- **統合テスト**: 主要なユーザーフロー（場所選択 → ルート検索 → ナビゲーション表示）

### ユニットテストの例

```typescript
// 特定の例: ブランディング要素の検証
describe('Branding', () => {
  test('displays KODAnnai as application name', () => {
    // 要件 1.1
    const { getByText } = render(<Logo />);
    expect(getByText(/KODAnnai/i)).toBeInTheDocument();
  });

  test('uses Sparkle theme logo', () => {
    // 要件 1.2
    const { container } = render(<Logo />);
    const logo = container.querySelector('svg');
    expect(logo).toHaveAttribute('data-theme', 'sparkle');
  });
});

// エッジケース: 無効な入力の処理
describe('Error Handling', () => {
  test('redirects when departure and destination are the same', () => {
    // 要件: エラーハンドリング
    const router = { replace: jest.fn() };
    render(<HomePageClient />, {
      searchParams: { dep: '1', dest: '1' }
    });
    expect(router.replace).toHaveBeenCalledWith('/');
  });
});

// 統合テスト: 最寄り施設の自動選択
describe('Nearest Facility Selection', () => {
  test('selects nearest male toilet from departure point', async () => {
    // 要件 8.2
    const departure = LOCATIONS.find(loc => loc.id === '56');
    const destination = LOCATIONS.find(loc => loc.id === 'm');

    const result = await findNearestFacility(departure, maleBathrooms);

    expect(result).toBeDefined();
    expect(result.category).toBe('男子トイレ');
  });
});
```

### プロパティベーステストの例

```typescript
import fc from "fast-check";

// Feature: kodannai-customization, Property 2: 日本語キーワード検索
test("Japanese keyword search converts katakana to hiragana", () => {
  fc.assert(
    fc.property(fc.string({ minLength: 1, maxLength: 20 }), (searchTerm) => {
      const result = searchLocations(searchTerm);
      const convertedTerm = kanaToHira(searchTerm.toLowerCase());

      // 検索結果の全ての場所が検索語を含むことを確認
      result.forEach((location) => {
        const matchesName = kanaToHira(location.name.toLowerCase()).includes(
          convertedTerm,
        );
        const matchesKeywords = location.keywords.some((kw) =>
          kanaToHira(kw.toLowerCase()).includes(convertedTerm),
        );
        const matchesCategory = kanaToHira(
          location.category.toLowerCase(),
        ).includes(convertedTerm);

        expect(matchesName || matchesKeywords || matchesCategory).toBe(true);
      });
    }),
    { numRuns: 100 },
  );
});

// Feature: kodannai-customization, Property 4: 雨天モードのエッジ選択
test("rainy mode uses correct edge weights", () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 0, max: LOCATIONS.length - 1 }),
      fc.integer({ min: 0, max: LOCATIONS.length - 1 }),
      fc.boolean(),
      async (depIndex, destIndex, rainyMode) => {
        if (depIndex === destIndex) return true; // スキップ

        const departure = LOCATIONS[depIndex];
        const destination = LOCATIONS[destIndex];

        const route = await findRoute(departure.id, destination.id, rainyMode);

        // 使用されたエッジが正しいセットから来ていることを確認
        const expectedEdges = rainyMode ? GRAPH_EDGES_RAINY : GRAPH_EDGES;
        // エッジ検証ロジック

        return true;
      },
    ),
    { numRuns: 100 },
  );
});

// Feature: kodannai-customization, Property 7: 最寄り施設の自動選択
test("nearest facility selection returns closest facility", () => {
  fc.assert(
    fc.property(
      fc.constantFrom(
        ...LOCATIONS.filter((loc) => !["m", "f", "g"].includes(loc.id)),
      ),
      fc.constantFrom("m", "f", "g"),
      async (departure, facilityType) => {
        const facilities =
          facilityType === "m"
            ? maleBathrooms
            : facilityType === "f"
              ? femaleBathrooms
              : garbageStations;

        const selected = await findNearestFacility(departure, facilities);

        // 選択された施設が全候補の中で最短距離であることを確認
        const distances = await Promise.all(
          facilities.map((f) => calculateDistance(departure, f)),
        );
        const minDistance = Math.min(...distances);
        const selectedDistance = await calculateDistance(departure, selected);

        expect(selectedDistance).toBe(minDistance);
      },
    ),
    { numRuns: 100 },
  );
});
```

## 実装ガイドライン

### ブランディング変更手順

1. **ロゴファイルの差し替え**

   ```
   /public/tsukukomago.svg → /public/kodannai-sparkle.svg
   ```

   - Sparkleテーマのロゴを作成
   - SVGフォーマットを維持
   - 推奨サイズ: 幅256px

2. **Logoコンポーネントの更新**

   ```typescript
   // components/logo.tsx
   import KODANNAI from "@/public/kodannai-sparkle.svg";

   export default function Logo() {
     return (
       <div className="flex items-center justify-center pt-6">
         <div className="w-full h-auto flex justify-center">
           <div className="w-64">
             <KODANNAI width="100%" height="auto" />
           </div>
         </div>
       </div>
     );
   }
   ```

3. **メタデータの更新**

   ```typescript
   // app/page.tsx
   export async function generateMetadata({
     searchParams,
   }: any): Promise<Metadata> {
     let title = "KODAnnai | 文化祭経路ナビ";
     let description = "KODAnnaiで文化祭を楽しもう！";
     // ... 残りのロジック
   }
   ```

4. **レイアウトの更新**
   ```typescript
   // app/layout.tsx
   <head>
     <meta name="apple-mobile-web-app-title" content="KODAnnai" />
   </head>
   ```

### 場所データ書き換え手順

1. **LOCATIONSデータの準備**
   - 既存の`app/locations-server.tsx`のLOCATIONS配列を新しいデータで置き換え
   - Location型の構造を維持
   - 必須フィールド: id, locid, name, category, organizer, position, keywords

2. **特殊IDの設定**

   ```typescript
   // 最寄りのトイレ（既存）
   { id: "m", locid: "m", name: "最寄りの男子トイレ", ... }
   { id: "f", locid: "f", name: "最寄りの女子トイレ", ... }

   // 最寄りのゴミステーション（新規追加）
   { id: "g", locid: "g", name: "最寄りのゴミステーション",
     category: "ゴミステーション自動選択", ... }
   ```

3. **カテゴリの設定**
   - 展示、体験、パフォーマンス、映画、演劇
   - 男子トイレ、女子トイレ、男女トイレ
   - ゴミステーション（新規）
   - その他、避難所

4. **キーワードの設定**
   - 全てひらがなで記述
   - 複数の読み方を含める
   - 例: `["ごみすてーしょん", "ごみ", "ゴミ箱", "ごみばこ"]`

### グラフデータ書き換え手順

#### 1. GRAPH_NODESの更新

グラフノードは、ルート検索システムの基礎となる地点を定義します。

```typescript
// app/locations-server.tsx
export const GRAPH_NODES: GraphNode[] = [
  { id: 1, coordinates: { floor: "1F" } },
  { id: 2, coordinates: { floor: "1F" } },
  { id: 3, coordinates: { floor: "2F" } },
  // ... 最大200ノードまで追加可能
];
```

**更新手順**:

1. 学校の地図を確認し、主要な交差点や分岐点を特定
2. 各地点に一意のID（1から順番に）を割り当て
3. 各ノードに階層情報（floor）を設定
4. LocationのlocidフィールドとノードIDを対応させる

**注意事項**:

- ノードIDは連番である必要はありませんが、一意である必要があります
- 階段の上下、エレベーターの各階など、同じ場所でも階が異なる場合は別ノードとして定義
- 最大200ノードまでサポート

#### 2. GRAPH_EDGESの設定（通常時）

通常時のエッジは、2つのノード間の移動距離を定義します。

```typescript
// app/locations-server.tsx
export const GRAPH_EDGES: GraphEdge[] = [
  {
    from: 1,
    to: 2,
    distance: 15.5, // メートル単位
    notice: {
      text: "右に曲がってください",
      color: "blue",
    },
  },
  {
    from: 2,
    to: 3,
    distance: 20.0,
    notice: {
      text: "階段を上がってください",
      color: "yellow",
    },
  },
  // ... 全てのエッジを定義
];
```

**設定手順**:

1. 地図上で実際に歩ける経路を特定
2. 各経路の距離を測定（メートル単位）
3. 双方向の移動が可能な場合は、両方向のエッジを定義
4. 必要に応じてnoticeフィールドで案内メッセージを追加

**noticeの色の使い分け**:

- `red`: 注意が必要な場所（段差、狭い通路など）
- `yellow`: 階段、エレベーター
- `blue`: 方向指示
- `green`: 目的地到着
- `gray`: 補足情報

#### 3. GRAPH_EDGES_RAINYの設定（雨天モード対応）

雨天時は屋外経路の重みを増やし、屋内経路を優先させます。

```typescript
// app/locations-server.tsx
export const GRAPH_EDGES_RAINY: GraphEdge[] = [
  {
    from: 1,
    to: 2,
    distance: 15.5, // 屋内経路はそのまま
    notice: {
      text: "右に曲がってください",
      color: "blue",
    },
  },
  {
    from: 5,
    to: 6,
    distance: 80.4, // 屋外経路: 20m × 4 = 80m（元の距離の4倍）
    notice: {
      text: "屋外を通ります（雨天時は濡れる可能性があります）",
      color: "red",
    },
  },
  // ... 全てのエッジを定義
];
```

**設定手順**:

1. GRAPH_EDGESをコピーして基礎とする
2. 屋外経路を特定する
3. 屋外経路の距離を4倍に増やす（例: 20m → 80m）
4. 屋外経路のnoticeに雨天時の注意を追加
5. 屋内経路はそのまま維持

**屋外経路の判定基準**:

- 建物の外を通る経路
- 屋根のない渡り廊下
- 中庭を横切る経路

**重み調整の理論**:

- 距離を4倍にすることで、アルゴリズムが屋外経路を避けるようになる
- ただし、屋内経路が存在しない場合は屋外経路も使用される

#### 4. GRAPH_EDGES_BARRIER_FREEの設定（バリアフリーモード対応）

バリアフリーモードでは、階段や狭い通路を避け、エレベーターやスロープを優先します。

```typescript
// app/locations-server.tsx
export const GRAPH_EDGES_BARRIER_FREE: GraphEdge[] = [
  {
    from: 1,
    to: 2,
    distance: 15.5, // 通常の通路
    barrierFree: true, // バリアフリー対応
  },
  {
    from: 2,
    to: 3,
    distance: 999.0, // 階段: 実質的に使用不可にする
    notice: {
      text: "階段（バリアフリー非対応）",
      color: "red",
    },
    barrierFree: false,
  },
  {
    from: 2,
    to: 4,
    distance: 25.0, // エレベーター経由の代替ルート
    notice: {
      text: "エレベーターを使用してください",
      color: "green",
    },
    barrierFree: true,
  },
  // ... 全てのエッジを定義
];
```

**設定手順**:

1. GRAPH_EDGESをコピーして基礎とする
2. 各エッジにbarrierFreeフィールドを追加
3. バリアフリー非対応のエッジ（階段、狭い通路）の距離を999に設定
4. エレベーター、スロープ、広い通路をbarrierFree: trueに設定
5. 代替ルートが存在することを確認

**バリアフリー非対応の判定基準**:

- 階段（エレベーターやスロープの代替がない場合）
- 幅1.2m未満の通路
- 段差が5cm以上ある場所
- 急な坂道（勾配8%以上）

**バリアフリー対応の判定基準**:

- エレベーター
- スロープ（勾配8%以下）
- 幅1.2m以上の平坦な通路
- 自動ドア、または開放されたドア

**重み調整の理論**:

- 距離を999に設定することで、他のルートが存在する限り使用されない
- ただし、他にルートがない場合は警告付きで使用される可能性がある

### 雨天モード実装手順

#### 1. UIトグルスイッチの追加

```typescript
// app/home-page-client.tsx
export default function HomePageClient({ locations }: Props) {
  const [rainyMode, setRainyMode] = useState(false);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 雨天モードトグル */}
      <div className="flex items-center justify-center mb-4">
        <label className="flex items-center cursor-pointer">
          <span className="mr-3 text-sm font-medium text-gray-700">
            雨天モード
          </span>
          <div className="relative">
            <input
              type="checkbox"
              className="sr-only"
              checked={rainyMode}
              onChange={(e) => setRainyMode(e.target.checked)}
            />
            <div
              className={`block w-14 h-8 rounded-full ${
                rainyMode ? "bg-blue-600" : "bg-gray-300"
              }`}
            ></div>
            <div
              className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition ${
                rainyMode ? "transform translate-x-6" : ""
              }`}
            ></div>
          </div>
        </label>
      </div>

      {/* 既存のコンポーネント */}
      <LocationSelector ... />
    </div>
  );
}
```

#### 2. 状態管理の実装

```typescript
// app/home-page-client.tsx
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function HomePageClient({ locations }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rainyMode, setRainyMode] = useState(false);

  // URLパラメータから状態を復元
  useEffect(() => {
    const rainy = searchParams.get("rainy");
    if (rainy === "true") {
      setRainyMode(true);
    }
  }, [searchParams]);

  // 雨天モードが変更されたらURLを更新
  useEffect(() => {
    if (rainyMode) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("rainy", "true");
      router.replace(`/?${params.toString()}`);
    } else {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("rainy");
      router.replace(`/?${params.toString()}`);
    }
  }, [rainyMode, router, searchParams]);

  return (
    // ... UI
  );
}
```

#### 3. URLパラメータへの保存

雨天モードの状態をURLパラメータに保存することで、ページをリロードしても設定が保持されます。

```typescript
// URLパラメータの形式
// 通常モード: https://example.com/
// 雨天モード: https://example.com/?rainy=true
// ナビゲーション中: https://example.com/?dep=1&dest=5&rainy=true

// パラメータの読み取り
const searchParams = useSearchParams();
const isRainy = searchParams.get("rainy") === "true";

// パラメータの更新
const params = new URLSearchParams(searchParams.toString());
if (rainyMode) {
  params.set("rainy", "true");
} else {
  params.delete("rainy");
}
router.replace(`/?${params.toString()}`);
```

#### 4. エッジ重みの切り替えロジック

```typescript
// lib/route-finder.ts
export function findRoute(
  fromId: string,
  toId: string,
  rainyMode: boolean = false,
  barrierFreeMode: boolean = false,
): RouteStep[] {
  // エッジセットの選択
  let edges: GraphEdge[];

  if (barrierFreeMode && rainyMode) {
    // バリアフリーモード優先
    edges = GRAPH_EDGES_BARRIER_FREE;
  } else if (rainyMode) {
    edges = GRAPH_EDGES_RAINY;
  } else {
    edges = GRAPH_EDGES;
  }

  // Dijkstraアルゴリズムでルート検索
  const route = dijkstra(fromId, toId, edges);

  return route;
}
```

**エッジ選択の優先順位**:

1. バリアフリーモード（雨天モード有効時のみ）
2. 雨天モード
3. 通常モード

### バリアフリーモード実装手順

#### 1. 雨天モード有効時のみ表示されるトグルスイッチ

バリアフリーモードは雨天モードが有効な場合のみ表示されます。

```typescript
// app/home-page-client.tsx
export default function HomePageClient({ locations }: Props) {
  const [rainyMode, setRainyMode] = useState(false);
  const [barrierFreeMode, setBarrierFreeMode] = useState(false);

  // 雨天モードが無効になったらバリアフリーモードもリセット
  useEffect(() => {
    if (!rainyMode) {
      setBarrierFreeMode(false);
    }
  }, [rainyMode]);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 雨天モードトグル */}
      <div className="flex items-center justify-center mb-4">
        <label className="flex items-center cursor-pointer">
          <span className="mr-3 text-sm font-medium text-gray-700">
            雨天モード
          </span>
          <input
            type="checkbox"
            checked={rainyMode}
            onChange={(e) => setRainyMode(e.target.checked)}
          />
        </label>
      </div>

      {/* バリアフリーモードトグル（雨天モード有効時のみ表示） */}
      {rainyMode && (
        <div className="flex items-center justify-center mb-4">
          <label className="flex items-center cursor-pointer">
            <span className="mr-3 text-sm font-medium text-gray-700">
              バリアフリーモード
            </span>
            <input
              type="checkbox"
              checked={barrierFreeMode}
              onChange={(e) => setBarrierFreeMode(e.target.checked)}
            />
          </label>
        </div>
      )}

      {/* 既存のコンポーネント */}
      <LocationSelector ... />
    </div>
  );
}
```
