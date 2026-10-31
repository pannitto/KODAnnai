"use client";

// ==========================================
// 経路の線データ作成ツール（開発・引き継ぎ用。来場者には案内しない）
// ==========================================
// 1. 地図タブを選ぶ
// 2. 右の一覧からノードを選ぶ（または地図上の点をタップ）
// 3. 地図上の正しい位置をタップ → 座標が入る（自動で次の未登録ノードへ）
// 4. 下の「書き出し」を lib/route-geometry.ts の NODE_POINTS に貼り付けてコミット
// 作業中のデータはこのブラウザに自動保存される。

import { useEffect, useMemo, useRef, useState } from "react";
import { getEdges } from "@/lib/route-finder";
import { getNodeDisplayInfoByLocid } from "@/app/locations-server";
import { clientToSvgPoint } from "@/lib/svg-point";
import { MAPS, MAP_VIEWBOX, type MapId } from "@/lib/map-spots";
import {
  NODE_POINTS,
  NAV_MAP_SRC,
  edgeKey,
  getMapIdForNode,
  getNodePoints,
  type NodePoints,
  type Point,
} from "@/lib/route-geometry";

const STORAGE_KEY = "kodannai-route-editor-draft";

const EDGES = (() => {
  const seen = new Map<string, { a: number; b: number; stairs: boolean }>();
  for (const e of getEdges()) {
    const key = edgeKey(e.from, e.to);
    if (!seen.has(key))
      seen.set(key, { a: Math.min(e.from, e.to), b: Math.max(e.from, e.to), stairs: !!e.hasStairs });
  }
  return [...seen.values()];
})();
const ALL_NODES = [...new Set(EDGES.flatMap((e) => [e.a, e.b]))].sort((x, y) => x - y);

function nodeName(n: number): string {
  const info = getNodeDisplayInfoByLocid(String(n));
  return info?.name || info?.position || "";
}

export default function RouteEditorClient() {
  const [mapId, setMapId] = useState<MapId>("outdoor");
  const [draft, setDraft] = useState<Record<number, NodePoints>>({});
  const [selected, setSelected] = useState<number | null>(null);
  const [autoNext, setAutoNext] = useState(true);
  const [showAllNodes, setShowAllNodes] = useState(false);
  const [width, setWidth] = useState(720);
  const [copied, setCopied] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setDraft(JSON.parse(saved));
    } catch {
      // 無視
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // 無視
    }
  }, [draft]);

  const base = useMemo(() => getNodePoints(), []);
  const points = useMemo(() => {
    const all: Record<number, NodePoints> = {};
    for (const n of ALL_NODES) all[n] = { ...(base[n] ?? {}), ...(draft[n] ?? {}) };
    return all;
  }, [base, draft]);

  const nodesForMap = ALL_NODES.filter(
    (n) => showAllNodes || getMapIdForNode(n) === mapId || points[n]?.[mapId],
  );
  const unplaced = nodesForMap.filter((n) => !points[n]?.[mapId]);
  const placedCount = nodesForMap.length - unplaced.length;

  const place = (e: React.MouseEvent<SVGSVGElement>) => {
    if (selected == null || !svgRef.current) return;
    const p = clientToSvgPoint(svgRef.current, e.clientX, e.clientY);
    const value: Point = [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10];
    setDraft((d) => ({ ...d, [selected]: { ...(d[selected] ?? {}), [mapId]: value } }));
    if (autoNext) {
      const next = unplaced.find((n) => n !== selected && n > selected) ?? unplaced.find((n) => n !== selected);
      setSelected(next ?? null);
    }
  };

  const removePoint = () => {
    if (selected == null) return;
    setDraft((d) => {
      const cur = { ...(d[selected] ?? {}) };
      delete cur[mapId];
      return { ...d, [selected]: cur };
    });
  };

  const exportText = useMemo(() => {
    const merged: Record<number, NodePoints> = {};
    for (const [k, v] of Object.entries(NODE_POINTS)) merged[Number(k)] = { ...v };
    for (const [k, v] of Object.entries(draft))
      if (Object.keys(v).length) merged[Number(k)] = { ...(merged[Number(k)] ?? {}), ...v };
    const lines = Object.keys(merged)
      .map(Number)
      .sort((a, b) => a - b)
      .map((n) => {
        const inner = Object.entries(merged[n])
          .map(([m, p]) => `${m}: [${(p as Point)[0]}, ${(p as Point)[1]}]`)
          .join(", ");
        const name = nodeName(n);
        return `  ${n}: { ${inner} },${name ? ` // ${name}` : ""}`;
      });
    return `export const NODE_POINTS: Record<number, NodePoints> = {\n${lines.join("\n")}\n};`;
  }, [draft]);

  const visibleEdges = EDGES.filter((e) => points[e.a]?.[mapId] && points[e.b]?.[mapId]);
  const selectedEdges = selected == null ? [] : EDGES.filter((e) => e.a === selected || e.b === selected);

  return (
    <main className="min-h-screen bg-background p-4 text-sm">
      <h1 className="mb-1 text-lg font-bold">経路の線データ作成</h1>
      <p className="mb-3 text-muted-foreground">
        ノードを選んで地図をタップすると座標が入ります。灰色の線＝両端の座標がそろった辺、点線＝階段。作業内容はこのブラウザに自動保存されます。
      </p>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {MAPS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMapId(m.id)}
            className={`rounded-lg border px-3 py-1.5 font-semibold ${mapId === m.id ? "bg-foreground text-background" : "border-border"}`}
          >
            {m.label}
          </button>
        ))}
        <label className="ml-2 flex items-center gap-1">
          <input type="checkbox" checked={autoNext} onChange={(e) => setAutoNext(e.target.checked)} />
          置いたら次の未登録ノードへ
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={showAllNodes} onChange={(e) => setShowAllNodes(e.target.checked)} />
          全ノードを一覧に出す（出入口など別の地図にも置くとき）
        </label>
        <label className="flex items-center gap-1">
          地図の幅
          <input type="range" min={360} max={1400} value={width} onChange={(e) => setWidth(Number(e.target.value))} />
        </label>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="relative flex-none overflow-auto rounded-xl border border-border bg-white" style={{ width, maxWidth: "100%" }}>
          <div className="relative" style={{ aspectRatio: `${MAP_VIEWBOX.width} / ${MAP_VIEWBOX.height}` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={NAV_MAP_SRC[mapId]} alt="" className="absolute inset-0 h-full w-full" draggable={false} />
            <svg
              ref={svgRef}
              viewBox={`0 0 ${MAP_VIEWBOX.width} ${MAP_VIEWBOX.height}`}
              className={`absolute inset-0 h-full w-full ${selected != null ? "cursor-crosshair" : ""}`}
              onClick={place}
            >
              {visibleEdges.map((e) => {
                const pa = points[e.a]![mapId]!;
                const pb = points[e.b]![mapId]!;
                const hot = selected != null && (e.a === selected || e.b === selected);
                return (
                  <line
                    key={`${e.a}-${e.b}`}
                    x1={pa[0]} y1={pa[1]} x2={pb[0]} y2={pb[1]}
                    stroke={hot ? "#2563eb" : "#475569"}
                    strokeWidth={hot ? 1.4 : 0.7}
                    strokeDasharray={e.stairs ? "1.5 1.5" : undefined}
                    opacity={0.8}
                  />
                );
              })}
              {ALL_NODES.filter((n) => points[n]?.[mapId]).map((n) => {
                const p = points[n]![mapId]!;
                const isSel = n === selected;
                const manual = !!draft[n]?.[mapId] || !!NODE_POINTS[n]?.[mapId];
                return (
                  <g
                    key={n}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelected(n);
                    }}
                    className="cursor-pointer"
                  >
                    <circle cx={p[0]} cy={p[1]} r={isSel ? 3 : 2} fill={isSel ? "#dc2626" : manual ? "#2563eb" : "#f59e0b"} stroke="white" strokeWidth={0.5} />
                    <text x={p[0] + 2.5} y={p[1] - 1.5} fontSize={3} fontWeight="bold" fill="#111" stroke="white" strokeWidth={0.6} paintOrder="stroke">
                      {n}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        <aside className="min-w-0 flex-1 space-y-3">
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="font-bold">
              選択中：{selected ?? "なし"} {selected != null && <span className="font-normal text-muted-foreground">{nodeName(selected)}</span>}
            </p>
            {selected != null && (
              <>
                <p className="mt-1 text-xs text-muted-foreground">
                  つながっているノード：
                  {selectedEdges.map((e) => {
                    const other = e.a === selected ? e.b : e.a;
                    return (
                      <button key={other} type="button" onClick={() => setSelected(other)} className="mr-1 underline">
                        {other}
                        {!points[other]?.[mapId] && "（未）"}
                      </button>
                    );
                  })}
                </p>
                <button type="button" onClick={removePoint} className="mt-2 rounded-lg border border-border px-2 py-1 text-xs">
                  この地図の座標を消す
                </button>
              </>
            )}
            <p className="mt-2 text-xs">
              <span className="text-amber-500">●</span> 自動の初期値　<span className="text-blue-600">●</span> 手で置いた点
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-3">
            <p className="mb-1 font-bold">
              この地図のノード（{placedCount}/{nodesForMap.length} 登録済み）
            </p>
            <div className="flex max-h-64 flex-wrap gap-1 overflow-y-auto">
              {nodesForMap.map((n) => (
                <button
                  key={n}
                  type="button"
                  title={nodeName(n)}
                  onClick={() => setSelected(n)}
                  className={`rounded border px-1.5 py-0.5 text-xs ${n === selected ? "border-red-600 bg-red-600 text-white" : points[n]?.[mapId] ? "border-border" : "border-amber-500 font-bold text-amber-600"}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-3">
            <div className="mb-1 flex items-center justify-between">
              <p className="font-bold">書き出し（lib/route-geometry.ts の NODE_POINTS を置き換え）</p>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(exportText).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  });
                }}
                className="rounded-lg bg-foreground px-2 py-1 text-xs text-background"
              >
                {copied ? "コピーしました" : "コピー"}
              </button>
            </div>
            <textarea readOnly value={exportText} className="h-48 w-full rounded border border-border bg-background p-2 font-mono text-[11px]" />
            <button
              type="button"
              onClick={() => {
                if (confirm("このブラウザの作業データを消しますか？（コードに貼った分は消えません）")) setDraft({});
              }}
              className="mt-1 text-xs text-red-600 underline"
            >
              作業データを消す
            </button>
          </div>
        </aside>
      </div>
    </main>
  );
}
