"use client";

// ナビ画面の「地図」：地図画像の上に経路を線で重ねる
// 座標データは lib/route-geometry.ts（/route-editor で作成）

import { useMemo } from "react";
import { useTheme } from "next-themes";
import {
  NAV_MAP_SRC,
  buildRouteSegments,
  getMapIdForNode,
  getNodePoints,
  type Point,
} from "@/lib/route-geometry";
import { MAP_VIEWBOX } from "@/lib/map-spots";

type Props = {
  /** 経路のノード列（/api/route の nodes） */
  nodes: number[];
  /** 階段の辺 "a-b"（点線で描く） */
  stairsEdges?: Set<string>;
  /** いま見ているステップのノード */
  currentNodeId: number;
};

const toD = (pts: Point[]) => pts.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ");

export function RouteMapView({ nodes, stairsEdges, currentNodeId }: Props) {
  const { resolvedTheme } = useTheme();
  const mapId = getMapIdForNode(currentNodeId);
  const points = useMemo(() => getNodePoints(), []);
  const segments = useMemo(
    () => buildRouteSegments(nodes, mapId, stairsEdges, points),
    [nodes, mapId, stairsEdges, points],
  );

  // 現在地＝経路の中でこのノードが最初に出てくる位置
  const currentIndex = Math.max(0, nodes.indexOf(currentNodeId));
  const here = points[currentNodeId]?.[mapId];
  const goal = points[nodes[nodes.length - 1]]?.[mapId];
  const start = points[nodes[0]]?.[mapId];

  let src = NAV_MAP_SRC[mapId];
  if (resolvedTheme === "dark") src = src.replace(".svg", "_dark.svg");

  return (
    <div
      className="relative mx-auto max-h-full w-full"
      style={{
        aspectRatio: `${MAP_VIEWBOX.width} / ${MAP_VIEWBOX.height}`,
        maxWidth: `calc((92vh - 160px) * ${MAP_VIEWBOX.width / MAP_VIEWBOX.height})`,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="地図" className="absolute inset-0 h-full w-full" draggable={false} />
      {segments.length > 0 && (
        <svg
          viewBox={`0 0 ${MAP_VIEWBOX.width} ${MAP_VIEWBOX.height}`}
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-label="経路"
        >
          <defs>
            <marker id="route-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="3.2" markerHeight="3.2" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="#2563eb" />
            </marker>
          </defs>
          {/* 通過済み（灰色） */}
          {segments
            .filter((s) => s.index < currentIndex)
            .map((s) => (
              <path
                key={`d${s.index}`}
                d={toD(s.points)}
                fill="none"
                stroke="#94a3b8"
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={s.jump ? "2 3" : undefined}
              />
            ))}
          {/* これから進む（青・白フチ） */}
          {segments
            .filter((s) => s.index >= currentIndex)
            .map((s) => (
              <g key={`r${s.index}`}>
                <path d={toD(s.points)} fill="none" stroke="white" strokeWidth={4.6} strokeLinecap="round" strokeLinejoin="round" opacity={s.jump ? 0 : 0.9} />
                <path
                  d={toD(s.points)}
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth={2.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={s.jump ? "2 3" : undefined}
                  markerEnd={s.index === currentIndex ? "url(#route-arrow)" : undefined}
                />
                {/* 進む向きに流れる点 */}
                {!s.jump && (
                  <path d={toD(s.points)} fill="none" stroke="white" strokeWidth={1} strokeLinecap="round" strokeDasharray="0.1 5">
                    <animate attributeName="stroke-dashoffset" from="0" to="-5.1" dur="0.8s" repeatCount="indefinite" />
                  </path>
                )}
              </g>
            ))}
          {start && <circle cx={start[0]} cy={start[1]} r={3.2} fill="white" stroke="#16a34a" strokeWidth={1.8} />}
          {goal && (
            <g transform={`translate(${goal[0]} ${goal[1]})`}>
              <circle r={4.2} fill="#dc2626" stroke="white" strokeWidth={1.4} />
              <text textAnchor="middle" dy={1.6} fontSize={4.4} fontWeight="bold" fill="white">着</text>
            </g>
          )}
          {here && (
            <g transform={`translate(${here[0]} ${here[1]})`}>
              <circle r={7} fill="#f97316" opacity={0.25}>
                <animate attributeName="r" values="4;8;4" dur="1.6s" repeatCount="indefinite" />
              </circle>
              <circle r={3.6} fill="#f97316" stroke="white" strokeWidth={1.4} />
            </g>
          )}
        </svg>
      )}
    </div>
  );
}
