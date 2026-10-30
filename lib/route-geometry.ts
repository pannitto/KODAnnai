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

export type Point = [number, number];
export type NodePoints = Partial<Record<MapId, Point>>;

/** 手で登録したノード座標（/route-editor で作ったものを貼る） */
export const NODE_POINTS: Record<number, NodePoints> = {
  // 例: 205: { outdoor: [136.6, 311.0] },
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

function seedPoints(): Record<number, NodePoints> {
  const out: Record<number, NodePoints> = {};
  const put = (node: number, map: MapId, p: Point) => {
    out[node] = { ...(out[node] ?? {}), [map]: p };
  };
  for (const m of OUTDOOR_START_POINT_MARKERS) put(m.nodeId, "outdoor", [m.cx, m.cy]);
  for (const m of MAIN_BUILDING_START_POINT_MARKERS) put(m.nodeId, "main", [m.cx, m.cy]);
  for (const m of BEKKAN_START_POINT_MARKERS) put(m.nodeId, "bekkan", [m.cx, m.cy]);
  for (const m of CHIBIKKO_START_POINT_MARKERS) put(m.nodeId, "chibikko", [m.cx, m.cy]);
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
  // 企画本館: ノード86(4F)および260-304
  if (nodeId === 86 || (nodeId >= 260 && nodeId <= 304)) return "main";
  // 企画別館: ノード305-328
  if (nodeId >= 305 && nodeId <= 328) return "bekkan";
  // ちびっこ館: ノード46-60および251-259
  if ((nodeId >= 46 && nodeId <= 60) || (nodeId >= 251 && nodeId <= 259)) return "chibikko";
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
      index: i,
    });
  }
  return segs;
}
