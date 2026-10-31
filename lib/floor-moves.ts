// ==========================================
// 階段・エレベーターでの階の移動
// ==========================================
// 経路の中で「階が変わる辺」を見つけて、ナビ画面で特別な表示（ピクトグラム＋「階段で3Fへ」）を出すためのデータ。
//
// ■ 階の判定
//   階段・エレベーターの乗り口になるノードだけ、何階かを NODE_FLOORS に書く。
//   両端の階が違う辺＝階の移動。
//   - lib/route-finder.ts で hasStairs: true の辺 → 階段
//   - それ以外 → エレベーター
//
// ■ ピクトグラム
//   public/pictograms/stairs.svg・elevator.svg（館内MAPの記号を切り出したもの）

export type MoveKind = "stairs" | "elevator";

export type FloorMove = {
  kind: MoveKind;
  /** 出発する階 */
  from: number;
  /** 着く階（階段を続けて上る・下りるときは最後の階） */
  to: number;
};

/** 階段・エレベーターの乗り口ノード → 何階か */
export const NODE_FLOORS: Record<number, number> = {
  // 企画本館（左の階段 262-267-281-298 / 右の階段 265-271-286-302 / エレベーター 263-269-284-300）
  262: 1, 265: 1, 263: 1,
  267: 2, 271: 2, 269: 2,
  281: 3, 286: 3, 284: 3,
  298: 4, 302: 4, 300: 4,
  // 企画別館（階段 309-314-321 / エレベーター 310-316-322）
  309: 1, 310: 1,
  314: 2, 316: 2,
  321: 3, 322: 3,
};

export const MOVE_PICTOGRAM: Record<MoveKind, string> = {
  stairs: "/pictograms/stairs.svg",
  elevator: "/pictograms/elevator.svg",
};

export const MOVE_LABEL: Record<MoveKind, string> = {
  stairs: "階段",
  elevator: "エレベーター",
};

/** 1本の辺が階の移動なら、その種類と階を返す */
export function getEdgeMove(a: number, b: number, hasStairs: boolean): FloorMove | null {
  const fa = NODE_FLOORS[a];
  const fb = NODE_FLOORS[b];
  if (fa == null || fb == null || fa === fb) return null;
  return { kind: hasStairs ? "stairs" : "elevator", from: fa, to: fb };
}

/** 「階段で3Fへ上がる」「エレベーターで1Fへ」などの文 */
export function moveText(m: FloorMove): string {
  const verb = m.kind === "stairs" ? (m.to > m.from ? "上がる" : "下りる") : "移動";
  return `${MOVE_LABEL[m.kind]}で${m.to}Fへ${verb}`;
}

export type RouteMove = FloorMove & {
  /** 階の移動が始まる経路上の位置（nodes の添字） */
  startIndex: number;
  /** 階の移動が終わる位置（着いた階のノードの添字） */
  endIndex: number;
};

/**
 * 経路（ノード列）の中の階の移動をまとめて返す。
 * 階段を続けて上る（1F→2F→3F）ときは1つにまとめる。
 * stairsEdges は edgeKey（"小さい番号-大きい番号"）の集合。
 */
export function getRouteMoves(nodes: number[], stairsEdges: Set<string>): RouteMove[] {
  const key = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);
  const moves: RouteMove[] = [];
  let i = 0;
  while (i < nodes.length - 1) {
    const m = getEdgeMove(nodes[i], nodes[i + 1], stairsEdges.has(key(nodes[i], nodes[i + 1])));
    if (!m) {
      i++;
      continue;
    }
    let j = i + 1;
    // 同じ種類・同じ向きで続く移動はまとめる
    while (j < nodes.length - 1) {
      const n = getEdgeMove(nodes[j], nodes[j + 1], stairsEdges.has(key(nodes[j], nodes[j + 1])));
      if (!n || n.kind !== m.kind || Math.sign(n.to - n.from) !== Math.sign(m.to - m.from)) break;
      j++;
    }
    moves.push({ kind: m.kind, from: m.from, to: NODE_FLOORS[nodes[j]], startIndex: i, endIndex: j });
    i = j;
  }
  return moves;
}

/** その辺（a→b）が階の移動か（線を描かずにピクトグラムで示す） */
export function isFloorMoveEdge(a: number, b: number): boolean {
  const fa = NODE_FLOORS[a];
  const fb = NODE_FLOORS[b];
  return fa != null && fb != null && fa !== fb;
}
