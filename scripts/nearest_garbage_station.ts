// 各出発点から最寄りのゴミステーションを計算
import { findRoute } from "../lib/route-finder";

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

  const summaryByGarbage: Record<number, string[]> = {
    39: [],
    42: [],
    57: [],
    106: [],
    109: [],
  };

  for (const { category, markers } of allMarkers) {
    console.log(`\n【${category}】`);
    console.log("-".repeat(80));

    for (const marker of markers) {
      console.log(`\n出発点: ${marker.label} (ノード${marker.id})`);

      const results = [];

      for (const garbage of GARBAGE_STATIONS) {
        try {
          const routeData = await findRoute(
            marker.id,
            garbage.id,
            [],
            false,
            false,
          );

          if (routeData && routeData.route && routeData.route.length > 0) {
            results.push({
              station: garbage.name,
              stationId: garbage.id,
              cost: routeData.cost || 0,
              steps: routeData.route.length,
            });
          }
        } catch (error) {
          // エラーは無視
        }
      }

      results.sort((a, b) => a.cost - b.cost);

      if (results.length > 0) {
        const nearest = results[0];
        console.log(
          `  ✓ 最寄り: ${nearest.station} (ノード${nearest.stationId})`,
        );
        console.log(`    コスト: ${nearest.cost}, ${nearest.steps}ステップ`);

        // サマリーに追加
        summaryByGarbage[nearest.stationId].push(
          `${marker.label} (${marker.id})`,
        );

        for (let i = 1; i < Math.min(3, results.length); i++) {
          const alt = results[i];
          const diff = alt.cost - nearest.cost;
          console.log(
            `    次点: ${alt.station} (ノード${alt.stationId}) +${diff.toFixed(0)}`,
          );
        }
      } else {
        console.log(`  ✗ ルートが見つかりませんでした`);
      }
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log("ゴミステーション別の最寄り出発点一覧");
  console.log("=".repeat(80));

  for (const garbage of GARBAGE_STATIONS) {
    const points = summaryByGarbage[garbage.id];
    console.log(`\n【${garbage.name} (ノード${garbage.id})】`);
    if (points.length > 0) {
      points.forEach((point) => console.log(`  • ${point}`));
    } else {
      console.log(`  (該当なし)`);
    }
  }

  console.log("\n" + "=".repeat(80));
}

calculateNearestGarbage().catch((err) => {
  console.error("エラー:", err.message);
  console.error(err.stack);
});
