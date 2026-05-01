// 各出発点から最寄りのゴミステーションを計算

const OUTDOOR_MARKERS = [
  { id: 1, label: "クラス模擬店ロータリー①" },
  { id: 2, label: "クラス模擬店ロータリー②" },
  { id: 3, label: "クラス模擬店ロータリー③" },
  { id: 4, label: "クラス模擬店ロータリー④" },
  { id: 5, label: "クラス模擬店ロータリー⑤" },
  { id: 6, label: "クラス模擬店ロータリー⑥" },
  { id: 7, label: "南サークル通り" },
  { id: 41, label: "本館南入口" },
  { id: 45, label: "ステージ前" },
  { id: 48, label: "ファミリーエリア" },
];

const BEKKAN_MARKERS = [
  { id: 306, label: "別館1F" },
  { id: 316, label: "別館2F" },
  { id: 322, label: "別館3F" },
];

const MAIN_BUILDING_MARKERS = [
  { id: 260, label: "本館1F" },
  { id: 266, label: "本館1F" },
  { id: 268, label: "本館2F" },
  { id: 283, label: "本館3F" },
  { id: 300, label: "本館4F" },
];

const GARBAGE_STATIONS = [
  { id: 39, name: "クラス模擬店ロータリー" },
  { id: 42, name: "ファミリーエリア" },
  { id: 57, name: "企画本館吹き抜け" },
  { id: 106, name: "北サークル通り" },
  { id: 109, name: "北サークル通り" },
];

// route-finder.ts から必要な関数をインポート
const fs = require('fs');
const path = require('path');

// route-finder.tsの内容を読み込んで評価（簡易的な方法）
async function calculateNearestGarbage() {
  console.log("=".repeat(80));
  console.log("各出発点から最寄りのゴミステーション");
  console.log("=".repeat(80));
  console.log("");

  const allMarkers = [
    { category: "屋外マップ", markers: OUTDOOR_MARKERS },
    { category: "企画別館", markers: BEKKAN_MARKERS },
    { category: "企画本館", markers: MAIN_BUILDING_MARKERS },
  ];

  for (const { category, markers } of allMarkers) {
    console.log(`\n【${category}】`);
    console.log("-".repeat(80));
    
    for (const marker of markers) {
      console.log(`\n出発点: ${marker.label} (ノード${marker.id})`);
      
      // 各ゴミステーションまでの距離を計算（APIを使用）
      const results = [];
      
      for (const garbage of GARBAGE_STATIONS) {
        try {
          const response = await fetch(
            `http://localhost:3000/api/route?from=${marker.id}&to=${garbage.id}`
          );
          
          if (response.ok) {
            const data = await response.json();
            results.push({
              station: garbage.name,
              stationId: garbage.id,
              distance: data.distance || 0,
              steps: data.route?.length || 0
            });
          }
        } catch (error) {
          // エラーは無視
        }
      }
      
      // 距離でソート
      results.sort((a, b) => a.distance - b.distance);
      
      if (results.length > 0) {
        const nearest = results[0];
        console.log(`  → 最寄り: ${nearest.station} (ノード${nearest.stationId}) - 距離: ${nearest.distance}m, ${nearest.steps}ステップ`);
        
        // 2番目以降も表示
        for (let i = 1; i < Math.min(3, results.length); i++) {
          const alt = results[i];
          console.log(`     次点: ${alt.station} (ノード${alt.stationId}) - 距離: ${alt.distance}m`);
        }
      } else {
        console.log(`  → 計算できませんでした`);
      }
    }
  }
  
  console.log("\n" + "=".repeat(80));
}

// サーバーが起動していることを確認してから実行
console.log("計算中... (開発サーバーが起動している必要があります)");
console.log("");

calculateNearestGarbage().catch(err => {
  console.error("エラー:", err.message);
  console.error("\n開発サーバーが起動していることを確認してください:");
  console.error("  npm run dev");
});
