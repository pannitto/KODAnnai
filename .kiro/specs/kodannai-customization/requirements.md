# Requirements Document

## Introduction

このドキュメントは、既存の筑駒GO文化祭案内アプリをベースに、KODAnnai（私の学校の文化祭用ナビゲーションアプリ）にカスタマイズする機能の要件を定義します。文化祭来場客への案内を目的とし、ブランディング、場所情報、新機能の追加を含みます。

## Glossary

- **Application**: KODAnnaiナビゲーションアプリケーション
- **Location_Data**: 文化祭の展示や施設の場所情報（名前、カテゴリ、位置、キーワードを含む）
- **Graph_System**: ルート検索に使用されるノードとエッジのグラフ構造
- **Rainy_Mode**: 雨天時に開催場所が変わる展示に対応するモード
- **Branding_Assets**: ロゴ、アプリ名、テーマカラーなどのブランド要素
- **Nearest_Facility_Finder**: 最寄りのトイレやゴミステーションを検索する機能
- **Barrier_Free_Mode**: バリアフリー対応のルート案内モード
- **Type_Definitions**: TypeScriptの型定義（Location型など）
- **Map_Image**: SVG形式の地図画像
- **Configuration_System**: 雨天モードやバリアフリーモードの設定を管理するシステム

## Requirements

### Requirement 1: ブランディングのカスタマイズ

**User Story:** As a 文化祭運営者, I want アプリのブランディングを「Tsukukoma GO」から「KODAnnai」に変更する, so that 私の学校の文化祭に合ったアプリになる

#### Acceptance Criteria

1. THE Application SHALL display "KODAnnai" as the application name in all user-facing text
2. THE Application SHALL replace the "Tsukukoma GO" logo with a "Sparkle" theme-based logo
3. THE Application SHALL update all metadata (page titles, descriptions) to reference "KODAnnai"
4. THE Application SHALL maintain consistent branding across all pages and components

### Requirement 2: 場所情報の全面書き換え

**User Story:** As a 文化祭運営者, I want 全ての場所情報を私の学校の文化祭に合わせて書き換える, so that 来場客が正しい場所に案内される

#### Acceptance Criteria

1. THE Application SHALL replace all Location_Data entries with new festival-specific data
2. THE Application SHALL preserve the Location type structure (id, locid, name, category, organizer, position, keywords)
3. WHEN Location_Data is updated, THE Application SHALL maintain type safety through TypeScript definitions
4. THE Application SHALL support Japanese keywords for location search functionality
5. THE Application SHALL categorize locations appropriately (展示, 体験, パフォーマンス, トイレ, その他, etc.)

### Requirement 3: 雨天モード対応

**User Story:** As a 文化祭来場客, I want 雨天時に開催場所が変わる展示に対応したルート案内を受ける, so that 天候に関わらず正しい場所に到達できる

#### Acceptance Criteria

1. THE Application SHALL provide a toggle switch for Rainy_Mode
2. WHEN Rainy_Mode is enabled, THE Graph_System SHALL use rainy weather edge weights (GRAPH_EDGES_RAINY)
3. WHEN Rainy_Mode is disabled, THE Graph_System SHALL use normal weather edge weights (GRAPH_EDGES)
4. THE Application SHALL display location-specific position information that reflects weather conditions
5. THE Application SHALL persist the Rainy_Mode setting during the user session

### Requirement 4: 最寄りのゴミステーション機能

**User Story:** As a 文化祭来場客, I want 最寄りのゴミステーションを検索できる, so that ゴミを適切に処分できる

#### Acceptance Criteria

1. THE Application SHALL add a "最寄りのゴミステーション" category to Location_Data
2. THE Nearest_Facility_Finder SHALL automatically select the nearest garbage station based on user's current location
3. THE Application SHALL display garbage station locations on the map
4. THE Application SHALL provide route navigation to the selected garbage station
5. THE Application SHALL support keyword search for garbage stations (e.g., "ごみすてーしょん", "ゴミ", "ごみ")

### Requirement 5: バリアフリーモード

**User Story:** As a 車椅子利用者や移動に配慮が必要な来場客, I want バリアフリー対応のルート案内を受ける, so that 安全かつ快適に文化祭を楽しめる

#### Acceptance Criteria

1. WHERE Rainy_Mode is enabled, THE Application SHALL display a Barrier_Free_Mode toggle option
2. WHEN Barrier_Free_Mode is enabled, THE Graph_System SHALL prioritize accessible routes (avoiding stairs, narrow passages)
3. WHEN Barrier_Free_Mode is enabled, THE Application SHALL display accessibility information for each location
4. THE Application SHALL mark barrier-free accessible locations with appropriate indicators
5. THE Application SHALL provide alternative routes when the shortest path is not accessible

### Requirement 6: 型定義の維持

**User Story:** As a 開発者, I want TypeScriptの型定義を維持する, so that バグが起きにくい構造を保つ

#### Acceptance Criteria

1. THE Application SHALL maintain the existing Location type definition structure
2. THE Application SHALL enforce type safety for all Location_Data modifications
3. WHEN new location categories are added, THE Type_Definitions SHALL be updated accordingly
4. THE Application SHALL use TypeScript strict mode for type checking
5. THE Application SHALL provide type definitions for Rainy_Mode and Barrier_Free_Mode configurations

### Requirement 7: 地図画像の差し替え

**User Story:** As a 開発者, I want 地図画像（SVG）の差し替え場所をコメントで明示する, so that 将来的なメンテナンスが容易になる

#### Acceptance Criteria

1. THE Application SHALL include clear comments indicating where Map_Image files are referenced
2. THE Application SHALL document the expected format and dimensions for Map_Image files
3. THE Application SHALL support SVG format for map images
4. THE Application SHALL provide placeholder comments for map image paths in configuration files
5. THE Application SHALL maintain a consistent naming convention for map image files (e.g., floor-1.svg, floor-2.svg)

### Requirement 8: 既存機能の保持

**User Story:** As a 文化祭来場客, I want 既存の最寄りのトイレ検索機能を引き続き使用できる, so that 必要な時にすぐにトイレを見つけられる

#### Acceptance Criteria

1. THE Application SHALL maintain the existing Nearest_Facility_Finder for toilets
2. THE Application SHALL support automatic selection of nearest male toilets ("最寄りの男子トイレ")
3. THE Application SHALL support automatic selection of nearest female toilets ("最寄りの女子トイレ")
4. THE Application SHALL display toilet locations categorized by type (男子トイレ, 女子トイレ, 男女トイレ)
5. THE Application SHALL provide route navigation to the selected toilet

### Requirement 9: ルート検索機能の維持

**User Story:** As a 文化祭来場客, I want 出発地点から目的地までのルートを検索できる, so that 効率的に会場内を移動できる

#### Acceptance Criteria

1. THE Application SHALL maintain the existing Graph_System for route finding
2. THE Application SHALL calculate the shortest path using Dijkstra's algorithm or equivalent
3. THE Application SHALL display step-by-step navigation instructions with images
4. THE Application SHALL support up to 200 graph nodes for location mapping
5. THE Application SHALL provide distance and direction information for each route segment

### Requirement 10: 検索機能の維持

**User Story:** As a 文化祭来場客, I want キーワードで場所を検索できる, so that 目的の展示や施設を素早く見つけられる

#### Acceptance Criteria

1. THE Application SHALL support keyword-based location search
2. THE Application SHALL convert katakana to hiragana for flexible search matching
3. THE Application SHALL search across location name, category, organizer, position, and keywords fields
4. THE Application SHALL rank search results by relevance (exact name match > organizer > keywords > category > position)
5. THE Application SHALL deprioritize utility locations (toilets, staircases) in search results unless specifically searched
