// ==========================================
// 経路の線表示用データ（ノードの地図上の座標）
// ==========================================
// ナビ画面の「地図」で、経路をノード同士を結ぶ線として描くためのデータ。
// 座標は地図SVGの viewBox（0 0 295.32 413.16）の単位。
//
// ■ データの作り方
//   /route-editor を開き、ノードを選んで地図をタップ → 下に出るコードを
//   NODE_POINTS に貼り付ける。
//
// ■ 自動で入る初期値（NODE_POINTS に書けばそちらが優先）
//   - 「地図から検索」の現在地マーカー（app/locations-server.tsx の *_START_POINT_MARKERS）
//   - 企画マップ（lib/map-spots.ts）の部屋の四角の中心
//
// ■ 1つのノードが複数の地図に出る場合（建物の出入口など）は、地図ごとに座標を書く。
//   例: 260: { outdoor: [190, 270], main: [52.6, 144.4] }

import {
  OUTDOOR_START_POINT_MARKERS,
  BEKKAN_START_POINT_MARKERS,
  CHIBIKKO_START_POINT_MARKERS,
  MAIN_BUILDING_START_POINT_MARKERS,
  LOCATIONS,
} from "@/app/locations-server";
import { MAP_SPOTS, type MapId } from "@/lib/map-spots";
import { isFloorMoveEdge } from "@/lib/floor-moves";

export type Point = [number, number];
export type NodePoints = Partial<Record<MapId, Point>>;

/** 手で登録したノード座標（/route-editor で作ったものを貼る） */
export const NODE_POINTS: Record<number, NodePoints> = {
  1: { outdoor: [122.6, 390.3] }, // パンフレット配布テント
  2: { outdoor: [122.2, 343.6] }, // インフォメーションセンター
  3: { outdoor: [123, 329.5] }, // KODAIRA祭MAP
  4: { outdoor: [137.7, 373.1] }, // 正門
  5: { outdoor: [149.1, 350.1] }, // 来場者アンケート景品ブース
  6: { outdoor: [149.4, 338.5] }, // パネルアート
  7: { outdoor: [151.3, 321.2] }, // 屋台王決定戦投票所
  8: { outdoor: [119.8, 322.1] }, // カステラ in ONEderland
  9: { outdoor: [113.9, 319.5] }, // 二橋カステラ
  10: { outdoor: [109.6, 316.1] }, // 如水餃子
  11: { outdoor: [106.7, 311] }, // ビアード４の焼きたてマシュマロ
  12: { outdoor: [104.1, 306.8] }, // 爆裂コーン弾けてる
  13: { outdoor: [102, 302.1] }, // 龍球
  14: { outdoor: [98.6, 294] }, // セブンのフランクフルト
  15: { outdoor: [95.9, 280.7] }, // 文系王将
  16: { outdoor: [96.7, 273.9] }, // フラン9フルト
  17: { outdoor: [99.7, 265.4] }, // ポテトはね、巻いとかないと。
  18: { outdoor: [102.8, 259.2] }, // KAWA11 ワッフル LAB.
  19: { outdoor: [107.9, 253.7] }, // ポテつばし
  20: { outdoor: [114.3, 250.3] }, // 世界のポテトについて。
  21: { outdoor: [177.4, 241.8] }, // 生地からワンダッフル!
  22: { outdoor: [177.4, 245.7] }, // フル　ぽんぽんぽん　美味すぎて滅！-
  23: { outdoor: [177, 249.5] }, // とくべチュロス
  24: { outdoor: [177, 252.5] }, // seventeen crepe
  25: { outdoor: [177, 255] }, // 爆裂ポテしてる
  26: { outdoor: [178.3, 258.4] }, // ギルティドッグ　HOPE
  27: { outdoor: [177.9, 280.9] }, // 今日、焼きになりました。〜小籠包編〜
  28: { outdoor: [178.3, 285.2] }, // 檸檬
  29: { outdoor: [176.2, 288.6] }, // 学際的からあげ論
  30: { outdoor: [173.6, 291.1] }, // トッポギ兄さん（23）
  31: { outdoor: [170.6, 294.5] }, // クロッフる？
  32: { outdoor: [166.8, 297.9] }, // おふくろっふる　〜おふくろの味〜
  33: { outdoor: [171.1, 300.1] }, // チョコ風呂浸かりばなな
  34: { outdoor: [178.8, 300] }, // フランクフルトとか無いんか？
  35: { outdoor: [185.1, 300] }, // 再履修確定餃子
  36: { outdoor: [193.3, 300.5] }, // Hit-gyU
  37: { outdoor: [202.6, 300.5] }, // wanna be わらびー！
  38: { outdoor: [209.8, 300.5] }, // Koda Cola
  39: { outdoor: [175.8, 265] }, // ゴミステーション
  40: { outdoor: [138.4, 225.1] }, // KODAステージ
  41: { outdoor: [212.3, 339] }, // フィールド
  42: { outdoor: [216.7, 300.5] }, // ゴミステーション
  44: { outdoor: [228.3, 300.3] }, // 顔出しパネル
  45: { outdoor: [234.7, 300.3] }, // スノードーム工房
  46: { chibikko: [79, 109.6] }, // ちびっこ館トイレ
  47: { chibikko: [86.3, 145.7] }, // ベビーカー預かり所
  48: { chibikko: [125.4, 124.1] }, // 救護室
  49: { chibikko: [124.9, 161.9] }, // 授乳室
  50: { chibikko: [85.8, 161] }, // おむつ替え室
  51: { chibikko: [213.7, 147.9] }, // アトラクション
  56: { main: [72.2, 159.3] }, // 企画本館MAP
  57: { main: [93.1, 156.4] }, // ゴミステーション
  58: { main: [94.3, 132.6] }, // 飲料販売所
  59: { main: [93.9, 142.3] }, // 飲食スペース
  60: { main: [60.8, 108.4] }, // 企画本館1F多目的トイレ
  64: { main: [62, 181.4] }, // 企画本館1F男女トイレ(EV付近)
  73: { main: [199.7, 180.6] }, // 企画本館2F男女トイレ
  84: { main: [61.2, 306.4] }, // 企画本館3F男女トイレ
  94: { main: [200.1, 307.2] }, // 企画本館4F男女トイレ
  98: { bekkan: [53.5, 159.8] }, // 企画別館多目的トイレ
  99: { bekkan: [54.3, 146.8] }, // 企画別館男女トイレ
  102: { bekkan: [53.4, 269] }, // 企画別館2F男女トイレ
  104: { bekkan: [199.4, 263.9] }, // 企画別館3F男女トイレ
  105: { outdoor: [104.5, 243.1] }, // メインステージ前休憩所
  106: { outdoor: [90.9, 243.1] }, // ゴミステーション
  107: { outdoor: [78.2, 242.6] }, // 似顔絵・陶器販売
  108: { outdoor: [68.4, 242.6] }, // 一橋世界史経済同好会
  109: { outdoor: [51, 243.9] }, // ゴミ集積所
  110: { outdoor: [101.1, 223.5] }, // 飲料販売所
  111: { outdoor: [187.4, 239.7] }, // チュロングトーーーン
  112: { outdoor: [194.2, 239.7] }, // 焼きそば番長
  113: { outdoor: [202.7, 239.7] }, // TEDxホットケーキ
  114: { outdoor: [210.8, 239.7] }, // ナイスなナチョス
  115: { outdoor: [219.3, 239.7] }, // やほレン海鮮焼きそば
  116: { outdoor: [225.2, 240.1] }, // 焼鳥C.T. C.
  117: { outdoor: [232, 240.1] }, // ひとつだブリトー
  119: { outdoor: [87.7, 136.1] }, // 体育館多目的トイレ
  120: { outdoor: [96.6, 141.2] }, // 体育館男女トイレ
  201: { outdoor: [136.2, 390.8] }, // 正門前
  202: { outdoor: [137.5, 351.3] }, // 正門通り
  203: { outdoor: [136.6, 341.9] }, // 正門通り
  204: { outdoor: [136.6, 330.7] }, // 正門通り
  207: { outdoor: [121.6, 308.5] }, // クラス模擬店ロータリー
  208: { outdoor: [111.4, 297] }, // クラス模擬店ロータリー
  210: { outdoor: [109.3, 271.4] }, // クラス模擬店ロータリー
  211: { outdoor: [114.4, 262.5] }, // クラス模擬店ロータリー
  212: { outdoor: [121.6, 254.8] }, // クラス模擬店ロータリー
  214: { outdoor: [162, 239.5] }, // クラス模擬店ロータリー
  215: { outdoor: [168.8, 245.5] }, // クラス模擬店ロータリー
  216: { outdoor: [166.2, 255.2] }, // クラス模擬店ロータリー
  218: { outdoor: [167.5, 284.1] }, // クラス模擬店ロータリー
  219: { outdoor: [161.1, 294.8] }, // クラス模擬店ロータリー
  220: { outdoor: [152.6, 304.5] }, // クラス模擬店ロータリー
  222: { outdoor: [160.7, 309.2] }, // クラス模擬店ロータリー
  224: { outdoor: [195.1, 307.9] }, // クラス模擬店ロード
  225: { outdoor: [203.6, 307.5] }, // クラス模擬店ロード
  226: { outdoor: [119.3, 237.5] }, // クラス模擬店ロード
  227: { outdoor: [113.8, 231.8] }, // クラス模擬店ロード
  228: { outdoor: [123.6, 231] }, // クラス模擬店ロード
  229: { outdoor: [139.7, 236.5] }, // クラス模擬店ロード
  230: { outdoor: [219.6, 308] }, // ファミリーエリア
  231: { outdoor: [228.1, 308.4] }, // ファミリーエリア
  232: { outdoor: [234.4, 308.4] }, // ファミリーエリア
  233: { outdoor: [239.1, 317.4] }, // ファミリーエリア
  234: { outdoor: [232.7, 340.3] }, // ファミリーエリア
  235: { outdoor: [221, 300.9] }, // 企画本館
  237: { outdoor: [177, 276.4] }, // クラス模擬店ロータリー
  238: { outdoor: [108.6, 155.2] }, // 体育館と繋ぐ道
  239: { outdoor: [86.9, 156.5] }, // 体育館と繋ぐ道
  240: { outdoor: [105.3, 232.2] }, // 北サークルロード
  241: { outdoor: [92, 233.4] }, // 北サークルロード
  242: { outdoor: [75.5, 233.4] }, // 北サークルロード
  243: { outdoor: [51.1, 232.5] }, // 北サークルロード
  244: { outdoor: [194.4, 233.7] }, // 南サークルロード
  245: { outdoor: [218.2, 234.1] }, // 南サークルロード
  246: { outdoor: [231.4, 234.2] }, // 南サークルロード
  251: { chibikko: [73.5, 128.8] }, // ちびっこ館
  254: { chibikko: [93.5, 130.5] }, // ちびっこ館
  255: { chibikko: [103.7, 130] }, // ちびっこ館
  256: { chibikko: [104.5, 123.7] }, // ちびっこ館
  257: { chibikko: [100.3, 162.3] }, // ちびっこ館
  259: { chibikko: [204.4, 168.7] }, // ちびっこ館
  261: { main: [72.7, 144] }, // 企画本館 吹き抜け
  262: { main: [50.6, 122.4] }, // 企画本館 1F
  263: { main: [48.4, 160.6] }, // 企画本館 1F
  265: { main: [61.2, 165.7] }, // 企画本館 1F
  267: { main: [189.1, 124.1] }, // 企画本館 2F
  269: { main: [189.1, 158.5] }, // 企画本館 2F
  271: { main: [199.7, 166.1] }, // 企画本館 2F
  272: { main: [216.3, 166.1] }, // 企画本館 2F
  273: { main: [234.6, 165.7] }, // 企画本館 2F
  274: { main: [246.7, 160.8] }, // 企画本館 2F
  276: { main: [247.1, 141.6] }, // 企画本館 2F
  277: { main: [247.1, 134.1] }, // 企画本館 2F
  278: { main: [247.1, 123.9] }, // 企画本館 2F
  279: { main: [216.5, 123.4] }, // 企画本館 2F
  281: { main: [50.6, 248.6] }, // 企画本館 3F
  282: { main: [50.6, 263] }, // 企画本館 3F
  284: { main: [50.1, 287.7] }, // 企画本館 3F
  286: { main: [60.8, 292.8] }, // 企画本館 3F
  287: { main: [75.6, 292.7] }, // 企画本館 3F
  288: { main: [94.3, 292.3] }, // 企画本館 3F
  289: { main: [108.3, 292.3] }, // 企画本館 3F
  291: { main: [107.9, 282.9] }, // 企画本館 3F
  292: { main: [107.9, 273.1] }, // 企画本館 3F
  294: { main: [107.9, 249.8] }, // 企画本館 3F
  295: { main: [94.3, 249.8] }, // 企画本館 3F
  296: { main: [74.7, 249.4] }, // 企画本館 3F
  298: { main: [189.1, 256.7] }, // 企画本館 4F
  300: { main: [188.7, 287.7] }, // 企画本館 4F
  302: { main: [200.2, 293.2] }, // 企画本館 4F
  303: { main: [217.5, 293] }, // 企画本館 4F
  304: { main: [188.6, 238.6] }, // 企画本館 4F
  305: { bekkan: [75.6, 170.6] }, // 企画別館 1F
  306: { bekkan: [74.4, 160.4] }, // 企画別館 1F
  307: { bekkan: [85, 160.4] }, // 企画別館 1F
  308: { bekkan: [74.8, 146.3] }, // 企画別館 1F
  309: { bekkan: [85.4, 145.9] }, // 企画別館 1F
  310: { bekkan: [65.9, 146.3] }, // 企画別館 1F
  314: { bekkan: [89.6, 281] }, // 企画別館 2F
  315: { bekkan: [79.4, 281] }, // 企画別館 2F
  317: { bekkan: [52.7, 281.9] }, // 企画別館 2F
  318: { bekkan: [51.4, 253.4] }, // 企画別館 2F
  319: { bekkan: [78.6, 253] }, // 企画別館 2F
  320: { bekkan: [101.1, 252.1] }, // 企画別館 2F
  321: { bekkan: [242.9, 282.7] }, // 企画別館 3F
  322: { bekkan: [215.6, 282.7] }, // 企画別館 3F
  323: { bekkan: [199, 282.3] }, // 企画別館 3F
  326: { bekkan: [255.3, 283.2] }, // 企画別館 3F
};

/**
 * 直線で結ぶと建物を突っ切ってしまう辺に中継点を足す。
 * キーは "小さい番号-大きい番号"。点は小さい番号側から順に並べる（逆向きは自動で反転）。
 * jump: true にすると、線ではなく点線（階段・エレベーターで階をまたぐ移動）で描く。
 */
export const EDGE_OPTIONS: Record<string, { via?: Point[]; jump?: boolean }> = {
  // 例: "205-220": { via: [[150, 300]] },
};

// ------------------------------------------
// 初期値の組み立て
// ------------------------------------------

/**
 * 建物の出入口の「外側」のノードを、館内MAPにも置く初期位置。
 * 館内MAPに描いてあるピンクの出入口の矢印の外側の端に置いてある。
 * これで館内MAPでも「どちらへ外に出るか」が線で分かる（/route-editor で動かせる）。
 */
const ENTRANCE_SEEDS: Record<number, NodePoints> = {
  237: { main: [13, 143.5] }, // 企画本館 左（西）の出入口の外 → クラス模擬店ロータリー
  235: { main: [78, 199] }, // 企画本館 下（南）の出入口の外
  228: { bekkan: [74.5, 178] }, // 企画別館 出入口の外 → KODAステージ側
  233: { chibikko: [59, 126] }, // ちびっこ館 出入口の外 → ファミリーエリア
};

function seedPoints(): Record<number, NodePoints> {
  const out: Record<number, NodePoints> = {};
  const put = (node: number, map: MapId, p: Point) => {
    out[node] = { ...(out[node] ?? {}), [map]: p };
  };
  for (const m of OUTDOOR_START_POINT_MARKERS) put(m.nodeId, "outdoor", [m.cx, m.cy]);
  for (const m of MAIN_BUILDING_START_POINT_MARKERS) put(m.nodeId, "main", [m.cx, m.cy]);
  for (const m of BEKKAN_START_POINT_MARKERS) put(m.nodeId, "bekkan", [m.cx, m.cy]);
  for (const m of CHIBIKKO_START_POINT_MARKERS) put(m.nodeId, "chibikko", [m.cx, m.cy]);
  for (const [k, v] of Object.entries(ENTRANCE_SEEDS))
    for (const [m, p] of Object.entries(v)) put(Number(k), m as MapId, p as Point);
  // 企画マップの部屋（四角）の中心を、その企画のノードの初期位置にする
  for (const spot of MAP_SPOTS) {
    if (spot.shape !== "rect") continue;
    for (const id of spot.locationIds) {
      const loc = LOCATIONS.find((l) => l.id === id);
      const node = loc ? Number(loc.locid) : NaN;
      if (!Number.isFinite(node) || out[node]?.[spot.map]) continue;
      put(node, spot.map, [spot.x + spot.w / 2, spot.y + spot.h / 2]);
    }
  }
  return out;
}

const SEEDED = seedPoints();

/** 初期値＋手入力をまとめたノード座標 */
export function getNodePoints(): Record<number, NodePoints> {
  const all: Record<number, NodePoints> = {};
  for (const [k, v] of Object.entries(SEEDED)) all[Number(k)] = { ...v };
  for (const [k, v] of Object.entries(NODE_POINTS))
    all[Number(k)] = { ...(all[Number(k)] ?? {}), ...v };
  return all;
}

/** 手入力分だけ（エディタの書き出し用） */
export function isSeededOnly(node: number, map: MapId): boolean {
  return !!SEEDED[node]?.[map] && !NODE_POINTS[node]?.[map];
}

// ------------------------------------------
// ノード → どの地図か
// ------------------------------------------

/** ナビ画面で表示する地図SVG（components/navigation-view.tsx から移動） */
export function getMapIdForNode(nodeId: number): MapId {
  // 企画本館: ノード86(4F)、56-60（吹き抜け・飲食スペース・1Fトイレ）、260-304
  if (nodeId === 86 || (nodeId >= 56 && nodeId <= 60) || (nodeId >= 260 && nodeId <= 304)) return "main";
  // 企画別館: ノード305-326（327・328 は体育館なので屋外MAP）
  if (nodeId >= 305 && nodeId <= 326) return "bekkan";
  // ちびっこ館: ノード46-55および251-259
  if ((nodeId >= 46 && nodeId <= 55) || (nodeId >= 251 && nodeId <= 259)) return "chibikko";
  // 企画（教室など）のノードは場所から判断
  const loc = LOCATIONS.find((l) => l.locid === String(nodeId) && l.id === String(nodeId));
  if (loc) {
    const p = loc.position;
    if (/^1\d{3}$/.test(p) || p.startsWith("企画本館")) return "main";
    if (/^2\d{3}$/.test(p) || p.startsWith("企画別館")) return "bekkan";
    if (p.startsWith("ちびっこ館")) return "chibikko";
  }
  return "outdoor";
}

export const NAV_MAP_SRC: Record<MapId, string> = {
  outdoor: "/GRAND_MAP_kikaku.svg?v=20261031-1", // GRAND_MAP.svg は端末によって文字の大きさが変わるため使わない
  main: "/Main_building_MAP_fornavigate.svg",
  bekkan: "/Bekkan_MAP_fornavigate.svg",
  chibikko: "/Chibikko_MAP_fornavigate.svg",
};

// ------------------------------------------
// 経路 → 地図ごとの線
// ------------------------------------------

export type RouteSegment = {
  from: number;
  to: number;
  points: Point[];
  jump: boolean;
  /** 階段・エレベーターで階が変わる辺（線は描かず、ピクトグラムで示す） */
  floorMove: boolean;
  /** 経路の何番目の辺か */
  index: number;
};

export function edgeKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

/**
 * 経路（ノード列）のうち、指定した地図上に両端の座標がある辺を線にする。
 * stairs: 階段の辺（API が返す hasStairs）。jump の既定値に使う。
 */
export function buildRouteSegments(
  nodes: number[],
  map: MapId,
  stairsEdges: Set<string> = new Set(),
  points: Record<number, NodePoints> = getNodePoints(),
): RouteSegment[] {
  const segs: RouteSegment[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    const a = nodes[i];
    const b = nodes[i + 1];
    const pa = points[a]?.[map];
    const pb = points[b]?.[map];
    if (!pa || !pb) continue;
    const key = edgeKey(a, b);
    const opt = EDGE_OPTIONS[key];
    const via = opt?.via ?? [];
    const mid = a < b ? via : [...via].reverse();
    segs.push({
      from: a,
      to: b,
      points: [pa, ...mid, pb],
      jump: opt?.jump ?? stairsEdges.has(key),
      floorMove: isFloorMoveEdge(a, b),
      index: i,
    });
  }
  return segs;
}
