/**
 * 各出発地点から最寄りのトイレ・ゴミステーション・休憩所を一覧化するスクリプト
 * 使用前にローカルサーバーを起動しておくこと: pnpm dev
 * 実行: node scripts/nearest_facilities_report.mjs
 */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const BASE_URL = "http://localhost:3000";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const src = readFileSync(
  join(__dirname, "../app/locations-server.tsx"),
  "utf-8",
);
const locationRegex =
  /\{\s*\n\s*id:\s*"([^"]+)",\s*\n\s*locid:\s*"([^"]+)",\s*\n\s*name:\s*"([^"]+)",\s*\n\s*category:\s*"([^"]+)"/g;
const allLocations = [];
let matchLoc;
while ((matchLoc = locationRegex.exec(src)) !== null) {
  allLocations.push({
    id: matchLoc[1],
    locid: matchLoc[2],
    name: matchLoc[3],
    category: matchLoc[4],
  });
}

const SPECIAL_CATS = [
  "男子トイレ自動選択",
  "女子トイレ自動選択",
  "ゴミステーション自動選択",
  "飲食スペース・休憩所自動選択",
  "多目的トイレ自動選択",
];
const TOILET_MALE_LIST = allLocations.filter((l) =>
  ["男子トイレ", "男女トイレ"].includes(l.category),
);
const TOILET_FEMALE_LIST = allLocations.filter((l) =>
  ["女子トイレ", "男女トイレ"].includes(l.category),
);
const TOILET_MULTI_LIST = allLocations.filter(
  (l) => l.category === "多目的トイレ",
);
const GARBAGE_LIST = allLocations.filter(
  (l) => l.category === "ゴミステーション",
);
const REST_LIST = allLocations.filter((l) =>
  ["休憩所", "飲食スペース", "飲食スペース・休憩所"].includes(l.category),
);
const FACILITY_CATS = [
  "男子トイレ",
  "女子トイレ",
  "男女トイレ",
  "多目的トイレ",
  "ゴミステーション",
  "休憩所",
  "飲食スペース",
  "飲食スペース・休憩所",
  ...SPECIAL_CATS,
];
const DEPARTURES_LIST = allLocations.filter(
  (l) => !FACILITY_CATS.includes(l.category),
);

console.log(
  `LOCATIONS: ${allLocations.length}件 / 出発地: ${DEPARTURES_LIST.length}件`,
);
console.log(
  `男子T:${TOILET_MALE_LIST.length} 女子T:${TOILET_FEMALE_LIST.length} 多目的:${TOILET_MULTI_LIST.length} ゴミ:${GARBAGE_LIST.length} 休憩:${REST_LIST.length}\n`,
);

async function getCost(from, to) {
  try {
    const res = await fetch(
      `${BASE_URL}/api/route?departure=${from}&destination=${to}`,
    );
    if (!res.ok) return Infinity;
    const data = await res.json();
    return typeof data.cost === "number" ? data.cost : Infinity;
  } catch {
    return Infinity;
  }
}

async function findNearest(fromLocid, candidates) {
  if (!candidates.length) return null;
  let best = { loc: candidates[0], cost: Infinity };
  for (const cand of candidates) {
    const cost = await getCost(fromLocid, cand.locid);
    if (cost < best.cost) best = { loc: cand, cost };
  }
  return best;
}

async function main() {
  const results = [];
  let i = 0;
  for (const dep of DEPARTURES_LIST) {
    i++;
    process.stdout.write(
      `[${i}/${DEPARTURES_LIST.length}] ${dep.name}...          \r`,
    );
    const [m, f, u, g, r] = await Promise.all([
      findNearest(dep.locid, TOILET_MALE_LIST),
      findNearest(dep.locid, TOILET_FEMALE_LIST),
      findNearest(dep.locid, TOILET_MULTI_LIST),
      findNearest(dep.locid, GARBAGE_LIST),
      findNearest(dep.locid, REST_LIST),
    ]);
    results.push({ dep, m, f, u, g, r });
  }

  console.log("\n\n=== TSV（スプレッドシートに貼り付け可）===");
  console.log(
    "出発地\tlocid\t男子トイレ\tコスト\t女子トイレ\tコスト\t多目的トイレ\tコスト\tゴミステーション\tコスト\t休憩所\tコスト",
  );
  for (const r of results) {
    console.log(
      [
        r.dep.name,
        r.dep.locid,
        r.m?.loc.name ?? "-",
        r.m?.cost === Infinity ? "∞" : (r.m?.cost ?? "-"),
        r.f?.loc.name ?? "-",
        r.f?.cost === Infinity ? "∞" : (r.f?.cost ?? "-"),
        r.u?.loc.name ?? "-",
        r.u?.cost === Infinity ? "∞" : (r.u?.cost ?? "-"),
        r.g?.loc.name ?? "-",
        r.g?.cost === Infinity ? "∞" : (r.g?.cost ?? "-"),
        r.r?.loc.name ?? "-",
        r.r?.cost === Infinity ? "∞" : (r.r?.cost ?? "-"),
      ].join("\t"),
    );
  }

  const warnings = results.filter((r) =>
    [r.m, r.f, r.u, r.g, r.r].some((x) => x?.cost === Infinity),
  );
  if (warnings.length) {
    console.log(`\n⚠️  到達不能(∞)検出: ${warnings.length}件`);
    for (const w of warnings) {
      const issues = [];
      if (w.m?.cost === Infinity) issues.push("男子T");
      if (w.f?.cost === Infinity) issues.push("女子T");
      if (w.u?.cost === Infinity) issues.push("多目的T");
      if (w.g?.cost === Infinity) issues.push("ゴミ");
      if (w.r?.cost === Infinity) issues.push("休憩所");
      console.log(`  ${w.dep.name}(${w.dep.locid}): ${issues.join(", ")}`);
    }
  } else {
    console.log("\n✅ 到達不能なし（全出発地から全施設に到達可能）");
  }
}

main().catch(console.error);
