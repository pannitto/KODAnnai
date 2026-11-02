// ==========================================
// 屋外MAPの地図SVGを「文字なしの地図」と「文字だけ」に分ける
// ==========================================
// 使い方：  node scripts/split-map-labels.mjs
//
// サイトでは、下から「文字なしの地図 → 企画の丸・オレンジの丸（サイトが描く） → 文字だけ」の順に重ねる。
// こうすると、丸がエリア名（北サークルロード・正門通りなど）の文字を隠さない。
//
// ■ 分け方
//   Illustrator で書き出した SVG の「文字」レイヤー（<g id="_文字">）と、
//   下の EXTRA_LABEL_IDS に書いたもの（文字レイヤーに入っていない文字）を「文字だけ」の方へ移す。
//   来年は Illustrator で文字を「文字」レイヤーにまとめておけば、EXTRA_LABEL_IDS は空でよい。
//
// ■ 出力（public/ に上書き）
//   GRAND_MAP_kikaku.svg      → GRAND_MAP_kikaku_base.svg ／ GRAND_MAP_kikaku_labels.svg
//   GRAND_MAP_kikaku_dark.svg → GRAND_MAP_kikaku_dark_base.svg ／ GRAND_MAP_kikaku_dark_labels.svg
//   作り直したら、使っている所の ?v= の日付も変える（lib/map-spots.ts の MAPS、components/outdoor-navigation-map.tsx）。

import fs from "node:fs";
import path from "node:path";

const PUBLIC = path.join(process.cwd(), "public");
const FILES = ["GRAND_MAP_kikaku.svg", "GRAND_MAP_kikaku_dark.svg"];
const LABEL_LAYER_ID = "_文字";
// 文字レイヤーの外にある文字（2026年は「クラス模擬店ロード」だけ別のグループに入っていた）
const EXTRA_LABEL_IDS = ["g1522"];

/** id のついた <g> を、閉じタグまで含めて取り出す（入れ子の <g> を数えて対応を取る） */
function extractGroup(svg, id) {
  const idx = svg.indexOf(`id="${id}"`);
  if (idx < 0) return null;
  const start = svg.lastIndexOf("<g", idx);
  const re = /<g\b[^>]*?(\/?)>|<\/g>/g;
  re.lastIndex = start;
  let depth = 0;
  let m;
  while ((m = re.exec(svg))) {
    if (m[0] === "</g>") depth--;
    else if (m[1] !== "/") depth++;
    if (depth === 0) return { start, end: re.lastIndex, text: svg.slice(start, re.lastIndex) };
  }
  throw new Error(`<g id="${id}"> の閉じタグが見つかりません`);
}

for (const file of FILES) {
  const src = fs.readFileSync(path.join(PUBLIC, file), "utf8");
  let base = src;
  const labels = [];
  for (const id of [LABEL_LAYER_ID, ...EXTRA_LABEL_IDS]) {
    const g = extractGroup(base, id);
    if (!g) {
      console.warn(`⚠ ${file}: <g id="${id}"> がありません（とばします）`);
      continue;
    }
    labels.push(g.text);
    base = base.slice(0, g.start) + base.slice(g.end);
  }
  // 文字だけの SVG：<svg> の開始タグと <defs>（色の指定）はそのまま使う
  const defsEnd = src.indexOf("</defs>");
  if (defsEnd < 0) throw new Error(`${file}: <defs> がありません`);
  const head = src.slice(0, defsEnd + "</defs>".length);
  const labelsSvg = `${head}\n${labels.join("\n")}\n</svg>\n`;

  const name = file.replace(/\.svg$/, "");
  fs.writeFileSync(path.join(PUBLIC, `${name}_base.svg`), base);
  fs.writeFileSync(path.join(PUBLIC, `${name}_labels.svg`), labelsSvg);
  console.log(`✅ ${file} → ${name}_base.svg ／ ${name}_labels.svg（文字 ${labels.length} グループ）`);
}
