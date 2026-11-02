"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Minus, RotateCcw, ChevronDown } from "lucide-react";
import Logo from "@/components/logo";
import Footer from "@/components/footer";
import { SiteNav } from "@/components/festival/site-nav";
import {
  KikakuSheet,
  type SheetState,
} from "@/components/festival/kikaku-sheet";
import { StageNowLabels } from "@/components/festival/stage-now-labels";
import { BuildingBadge } from "@/components/festival/building-badge";
import { FavoriteMark, useFavorites } from "@/components/festival/favorites";
import { venueHasFavAct } from "@/lib/stage-acts";
import { MAP_FACILITIES } from "@/lib/map-facilities";
import {
  useNow,
  useQueryParam,
  useLive,
  useIsDark,
} from "@/components/festival/hooks";
import { clientToSvgPoint } from "@/lib/svg-point";
import { getNodePoints } from "@/lib/route-geometry";
import { getLocationById } from "@/app/locations-server";
import {
  MAPS,
  MAP_SPOTS,
  MAP_VIEWBOX,
  OUTDOOR_BUILDINGS,
  findSpotByLocationId,
  type MapId,
  type MapSpot,
} from "@/lib/map-spots";
import {
  GENRES,
  GENRE_COLORS,
  getGenre,
  isCommitteeKikaku,
  getDays,
  isOpenOn,
  getOrganizer,
  getDisplayName,
} from "@/lib/kikaku";
import {
  FESTIVAL_DAY1,
  FESTIVAL_DAY2,
  getActStatusForLocation,
  getFestivalDay,
  type ActOverride,
  type FestivalDay,
} from "@/lib/timetable";
import {
  WAIT_LEVELS,
  WAIT_LEVEL_INFO,
  getFreshWait,
  type WaitLevel,
  type WaitMap,
} from "@/lib/wait-times";

const MIN_SCALE = 1;
const MAX_SCALE = 4;

// 経路案内のノードの位置（node を書いた丸は、ここから位置を決める）
const NODE_PTS = getNodePoints();

/** node を書いた丸を、そのノードの位置（＋offset）に置く */
function placeSpot(s: MapSpot): MapSpot {
  if (s.shape !== "pin" || s.node == null) return s;
  const p = NODE_PTS[s.node]?.[s.map];
  if (!p) return s;
  return {
    ...s,
    x: p[0] + (s.offset?.[0] ?? 0),
    y: p[1] + (s.offset?.[1] ?? 0),
  };
}

// 地図に出ている企画のジャンルだけを凡例に出す
const LEGEND_GENRES = GENRES.filter((g) =>
  MAP_SPOTS.some((s) =>
    s.locationIds.some((id) => {
      const loc = getLocationById(id);
      return loc && getGenre(loc) === g;
    }),
  ),
);

/** スポット内の企画で一番混んでいる待ち時間 */
function spotWait(
  spot: MapSpot,
  waits: WaitMap,
  now: Date | null,
): WaitLevel | null {
  if (!now) return null;
  let worst: WaitLevel | null = null;
  for (const id of spot.locationIds) {
    const loc = getLocationById(id);
    if (!loc || !isCommitteeKikaku(loc)) continue;
    const w = getFreshWait(waits, id, now);
    if (
      w &&
      (!worst || WAIT_LEVELS.indexOf(w.level) > WAIT_LEVELS.indexOf(worst))
    )
      worst = w.level;
  }
  return worst;
}

function spotColor(spot: MapSpot): string {
  const genres = new Set(
    spot.locationIds.map((id) => {
      const loc = getLocationById(id);
      return loc ? getGenre(loc) : "その他";
    }),
  );
  return genres.size === 1 ? GENRE_COLORS[[...genres][0]] : "#475569";
}

function spotIsPerforming(
  spot: MapSpot,
  now: Date | null,
  acts: Record<string, ActOverride>,
): boolean {
  if (!now) return false;
  return spot.locationIds.some((id) =>
    getActStatusForLocation(id, now, acts).some((a) => a.current),
  );
}

export default function MapPageClient() {
  const now = useNow();
  const { live } = useLive();
  const idParam = useQueryParam("id");
  const editParam = useQueryParam("edit");
  const editMode = editParam === "1";

  const [mapId, setMapId] = useState<MapId>("outdoor");
  const [sheet, setSheet] = useState<SheetState>(null);
  const [selectedFacility, setSelectedFacility] = useState<string | null>(null);
  const [selectedSpot, setSelectedSpot] = useState<string | null>(null);
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const [editPoint, setEditPoint] = useState<{ x: number; y: number } | null>(
    null,
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{
    startDist: number;
    startScale: number;
    lastX: number;
    lastY: number;
    moved: number;
  } | null>(null);
  const suppressClick = useRef(false);

  const map = MAPS.find((m) => m.id === mapId)!;
  const dark = useIsDark();
  const { favs } = useFavorites();
  // 表示する日（開催日はその日、それ以外の日は両日分）。日によって同じ教室の団体が変わる
  const [day, setDay] = useState<FestivalDay | null>(null);
  const today = now ? getFestivalDay(now) : null;
  const dayInitialized = useRef(false);
  useEffect(() => {
    if (!now || dayInitialized.current) return;
    dayInitialized.current = true;
    if (today) setDay(today);
  }, [now, today]);

  // その日に開いている企画だけを残したスポット
  const spots = useMemo(
    () =>
      MAP_SPOTS.filter((s) => s.map === mapId)
        .map(placeSpot)
        .map((s) => ({
          ...s,
          locationIds: s.locationIds.filter((id) => {
            const loc = getLocationById(id);
            return !loc || isOpenOn(loc, day);
          }),
        }))
        .filter((s) => s.locationIds.length > 0),
    [mapId, day],
  );

  // ?id=XX で開いたとき：その企画のある地図に切り替えて詳細を開く
  useEffect(() => {
    if (!idParam) return;
    const spot = findSpotByLocationId(idParam);
    if (spot) {
      setMapId(spot.map);
      setSelectedSpot(spot.id);
    }
    const loc = getLocationById(idParam);
    if (loc) {
      // 片方の日だけの企画なら、その日の表示に切り替える
      const d = getDays(loc);
      if (d !== "両日") {
        dayInitialized.current = true;
        setDay(d === "1日目" ? "day1" : "day2");
      }
      setSheet({ mode: "detail", id: idParam });
    }
  }, [idParam]);

  const resetView = () => setView({ scale: 1, x: 0, y: 0 });

  const clampView = (v: { scale: number; x: number; y: number }) => {
    const el = containerRef.current;
    const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale));
    if (!el) return { ...v, scale };
    const w = el.clientWidth;
    const h = el.clientHeight;
    const minX = w - w * scale;
    const minY = h - h * scale;
    return {
      scale,
      x: Math.min(0, Math.max(minX, v.x)),
      y: Math.min(0, Math.max(minY, v.y)),
    };
  };

  const zoomAt = (factor: number, cx?: number, cy?: number) => {
    const el = containerRef.current;
    if (!el) return;
    const px = cx ?? el.clientWidth / 2;
    const py = cy ?? el.clientHeight / 2;
    setView((v) => {
      const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * factor));
      const k = scale / v.scale;
      return clampView({
        scale,
        x: px - (px - v.x) * k,
        y: py - (py - v.y) * k,
      });
    });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const rect = containerRef.current!.getBoundingClientRect();
    pointers.current.set(e.pointerId, {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    const pts = [...pointers.current.values()];
    gesture.current = {
      startDist:
        pts.length >= 2
          ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
          : 0,
      startScale: view.scale,
      lastX: pts.reduce((a, p) => a + p.x, 0) / pts.length,
      lastY: pts.reduce((a, p) => a + p.y, 0) / pts.length,
      moved: 0,
    };
    suppressClick.current = false;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    const rect = containerRef.current!.getBoundingClientRect();
    pointers.current.set(e.pointerId, {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    const pts = [...pointers.current.values()];
    const cx = pts.reduce((a, p) => a + p.x, 0) / pts.length;
    const cy = pts.reduce((a, p) => a + p.y, 0) / pts.length;
    const g = gesture.current;
    const dx = cx - g.lastX;
    const dy = cy - g.lastY;
    g.moved += Math.abs(dx) + Math.abs(dy);
    if (g.moved > 8) suppressClick.current = true;

    if (pts.length >= 2 && g.startDist > 0) {
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const target = (g.startScale * dist) / g.startDist;
      setView((v) => {
        const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, target));
        const k = scale / v.scale;
        return clampView({
          scale,
          x: cx - (cx - v.x) * k + dx,
          y: cy - (cy - v.y) * k + dy,
        });
      });
    } else if (view.scale > 1) {
      setView((v) => clampView({ ...v, x: v.x + dx, y: v.y + dy }));
    }
    g.lastX = cx;
    g.lastY = cy;
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) gesture.current = null;
    else {
      const pts = [...pointers.current.values()];
      gesture.current = {
        startDist: 0,
        startScale: view.scale,
        lastX: pts[0].x,
        lastY: pts[0].y,
        moved: gesture.current?.moved ?? 0,
      };
    }
  };

  const openSpot = (spot: MapSpot) => {
    if (suppressClick.current) return;
    setSelectedSpot(spot.id);
    setSelectedFacility(null);
    if (spot.locationIds.length === 1)
      setSheet({ mode: "detail", id: spot.locationIds[0] });
    else setSheet({ mode: "list", title: spot.label, ids: spot.locationIds });
  };

  const openFacility = (id: string) => {
    if (suppressClick.current) return;
    setSelectedSpot(null);
    setSelectedFacility(id);
    setSheet({ mode: "facility", id });
  };

  const switchMap = (id: MapId) => {
    if (suppressClick.current) return;
    setMapId(id);
    setSelectedSpot(null);
    setSelectedFacility(null);
    resetView();
  };

  const onBackgroundClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!editMode || suppressClick.current || !svgRef.current) return;
    const p = clientToSvgPoint(svgRef.current, e.clientX, e.clientY);
    setEditPoint({ x: Math.round(p.x), y: Math.round(p.y) });
  };

  // 地図の縮尺に合わせてピンの大きさを保つ
  const k = 1 / Math.sqrt(view.scale);

  return (
    <div className="min-h-screen bg-background p-4 pt-5">
      <Logo />
      <SiteNav />
      <main className="mx-auto max-w-md space-y-3 pt-4">
        <div
          className="grid grid-cols-4 gap-1 rounded-xl border border-border p-1"
          role="tablist"
        >
          {MAPS.map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={mapId === m.id}
              onClick={() => switchMap(m.id)}
              className={`rounded-lg py-2 text-xs font-semibold transition-colors ${
                mapId === m.id
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* 表示する日：1日目と2日目で同じ教室を別の団体が使うため、日ごとに地図の中身が変わる */}
        <div
          className="grid grid-cols-3 gap-1 rounded-xl border border-border p-1"
          role="group"
          aria-label="表示する日"
        >
          {(
            [
              { id: "day1", label: "1日目", date: FESTIVAL_DAY1 },
              { id: "day2", label: "2日目", date: FESTIVAL_DAY2 },
              { id: null, label: "両日", date: null },
            ] as const
          ).map((d) => (
            <button
              key={d.label}
              type="button"
              aria-pressed={day === d.id}
              onClick={() => {
                setDay(d.id);
                setSelectedSpot(null);
              }}
              className={`whitespace-nowrap rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                day === d.id
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {d.label}
              {d.date && (
                <span className="ml-1 font-normal opacity-80">
                  {Number(d.date.slice(5, 7))}/{Number(d.date.slice(8, 10))}
                </span>
              )}
              {today !== null && today === d.id && (
                <span className="ml-1 rounded bg-red-500 px-1 text-[10px] text-white">
                  今日
                </span>
              )}
            </button>
          ))}
        </div>

        <div
          ref={containerRef}
          className="relative w-full select-none overflow-hidden rounded-2xl border border-border bg-white dark:bg-black"
          style={{
            // タイトルと空白を切り落とした範囲（lib/map-spots.ts の view）の縦横比
            aspectRatio: `${map.view.width} / ${map.view.height}`,
            touchAction: view.scale > 1 ? "none" : "pan-y",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          <div
            className="absolute inset-0 origin-top-left"
            style={{
              transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
              transition: gesture.current ? "none" : "transform 150ms ease-out",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={dark ? map.darkImage : map.image}
              alt={`${map.label}の地図`}
              className="pointer-events-none absolute max-w-none"
              style={{
                // 地図全体を、view の範囲が枠にぴったり入る位置・大きさで置く
                left: `${(-map.view.x / map.view.width) * 100}%`,
                top: `${(-map.view.y / map.view.height) * 100}%`,
                width: `${(MAP_VIEWBOX.width / map.view.width) * 100}%`,
                height: `${(MAP_VIEWBOX.height / map.view.height) * 100}%`,
              }}
              draggable={false}
            />
            <svg
              ref={svgRef}
              viewBox={`${map.view.x} ${map.view.y} ${map.view.width} ${map.view.height}`}
              className="absolute inset-0 h-full w-full"
              onClick={onBackgroundClick}
            >
              {/* 屋外MAP：建物をタップするとその建物の地図へ */}
              {mapId === "outdoor" &&
                OUTDOOR_BUILDINGS.map((b) => (
                  <g
                    key={b.map}
                    className="group cursor-pointer"
                    role="button"
                    aria-label={`${b.label}の館内MAPを開く`}
                    onClick={(e) => {
                      e.stopPropagation();
                      switchMap(b.map);
                    }}
                  >
                    {b.paths.map((d, i) => (
                      <path
                        key={i}
                        d={d}
                        className="fill-blue-600/[0.08] transition-colors group-hover:fill-blue-600/25 group-active:fill-blue-600/25"
                        stroke="#2563eb"
                        strokeWidth={0.6 * k}
                        strokeDasharray={`${2 * k} ${1.5 * k}`}
                      />
                    ))}
                    {/* 「タップで館内の地図へ」の目印 */}
                    <BuildingBadge
                      x={b.badge.x}
                      y={b.badge.y}
                      k={k}
                      dark={dark}
                    />
                  </g>
                ))}

              {/* ピクトグラム（トイレ・ゴミステーションなど）：タップで施設情報と経路案内（企画の丸・部屋より下に置く） */}
              {MAP_FACILITIES.filter((f) => f.map === mapId).map((f) => {
                const half = f.size / 2 + 0.6;
                return (
                  <rect
                    key={f.id}
                    role="button"
                    aria-label={`${f.name}の情報`}
                    x={f.x - half}
                    y={f.y - half}
                    width={half * 2}
                    height={half * 2}
                    rx={2}
                    className={`cursor-pointer transition-colors ${
                      selectedFacility === f.id
                        ? "fill-orange-400/25 stroke-orange-500"
                        : "fill-transparent stroke-transparent hover:fill-orange-400/20 active:fill-orange-400/30"
                    }`}
                    strokeWidth={0.8}
                    onClick={(e) => {
                      e.stopPropagation();
                      openFacility(f.id);
                    }}
                  />
                );
              })}

              {spots.map((spot) => (
                <SpotMark
                  key={spot.id}
                  spot={spot}
                  k={k}
                  selected={selectedSpot === spot.id}
                  wait={spotWait(spot, live.waits, now)}
                  performing={spotIsPerforming(spot, now, live.acts)}
                  dark={dark}
                  fav={spot.locationIds.some(
                    (id) => favs.has(id) || venueHasFavAct(id, favs),
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    openSpot(spot);
                  }}
                />
              ))}

              {/* ステージの「公演中／次の公演」ラベル（KODAnnai の「地図から検索」と共通）。タップで会場の詳細 */}
              {mapId === "outdoor" && (
                <StageNowLabels
                  now={now}
                  k={k}
                  onSelect={(stage) => {
                    if (suppressClick.current) return;
                    const id = stage.locationIds?.[0];
                    if (id) setSheet({ mode: "detail", id });
                  }}
                />
              )}

              {editMode && editPoint && (
                <g pointerEvents="none">
                  <line
                    x1={editPoint.x - 6}
                    x2={editPoint.x + 6}
                    y1={editPoint.y}
                    y2={editPoint.y}
                    stroke="red"
                    strokeWidth={0.5}
                  />
                  <line
                    x1={editPoint.x}
                    x2={editPoint.x}
                    y1={editPoint.y - 6}
                    y2={editPoint.y + 6}
                    stroke="red"
                    strokeWidth={0.5}
                  />
                </g>
              )}
            </svg>
          </div>

        </div>

        {/* 拡大・縮小（地図の上に重ねると部屋や丸が隠れるので、地図の下に置く） */}
        <div className="-mt-1 flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">2本指でも拡大・移動できます</p>
          <div className="flex gap-1">
            <MapButton label="拡大" onClick={() => zoomAt(1.5)}>
              <Plus className="h-4 w-4" />
            </MapButton>
            <MapButton label="縮小" onClick={() => zoomAt(1 / 1.5)}>
              <Minus className="h-4 w-4" />
            </MapButton>
            <MapButton label="リセット" onClick={resetView}>
              <RotateCcw className="h-4 w-4" />
            </MapButton>
          </div>
        </div>

        {editMode && (
          <p className="rounded-lg bg-red-50 p-2 font-mono text-xs text-red-700 dark:bg-red-950 dark:text-red-200">
            編集モード：地図をタップすると座標が出ます →{" "}
            {editPoint ? `x: ${editPoint.x}, y: ${editPoint.y}` : "（未選択）"}
          </p>
        )}

        {/* マップの見方：ふだんは閉じておき、地図が1画面に収まるようにする */}
        <details className="group rounded-2xl border border-border bg-card text-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 font-bold [&::-webkit-details-marker]:hidden">
            マップの見方
            <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
              <span className="group-open:hidden">タップで開く</span>
              <span className="hidden group-open:inline">閉じる</span>
              <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
            </span>
          </summary>
          <div className="space-y-3 px-4 pb-4">
          <div>
            <p className="text-muted-foreground">
              丸・団体名の入った部屋・ピンクの四角（ステージやインフォ）をタップすると、詳細が開きます。丸の数字は企画の数です。2本指で拡大・移動できます。屋外MAPで「館内MAP
              ›」の付いた建物をタップすると、その建物の地図に切り替わります。
            </p>
            <p className="mt-1 text-muted-foreground">
              トイレ・ゴミステーションなどのマーク（ピクトグラム）をタップすると、その施設の情報が出て、KODAnnai でそこまでの道案内ができます。
            </p>
          </div>
          <div>
            <h2 className="mb-1.5 font-bold">委員会企画の待ち時間</h2>
            <p className="mb-1.5 text-xs text-muted-foreground">
              丸や部屋の周辺に「15分」のように出ます。この時間以内に入れる目安です。
            </p>
            <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
              {WAIT_LEVELS.map((lv) => (
                <LegendDot
                  key={lv}
                  color={WAIT_LEVEL_INFO[lv].color}
                  label={WAIT_LEVEL_INFO[lv].label}
                />
              ))}
            </ul>
          </div>
          <div>
            <h2 className="mb-1.5 font-bold">ジャンル</h2>
            <p className="mb-1.5 text-xs text-muted-foreground">
              丸や部屋の色は、ジャンルの色です。
            </p>
            <ul className="grid grid-cols-3 gap-x-3 gap-y-1">
              {LEGEND_GENRES.map((g) => (
                <LegendDot key={g} color={GENRE_COLORS[g]} label={g} />
              ))}
              <LegendDot color="#475569" label="複数" />
            </ul>
            <p className="mt-1.5 text-xs text-muted-foreground">
              緑のふちどりは、いま公演中の企画です。
              <span className="text-pink-600 dark:text-pink-400">♥</span>
              は、いいねした企画です。
            </p>
          </div>
          </div>
        </details>
      </main>
      <Footer />
      <KikakuSheet
        state={sheet}
        onChange={(s) => {
          setSheet(s);
          if (!s) setSelectedSpot(null);
          if (s?.mode !== "facility") setSelectedFacility(null);
        }}
        now={now}
        live={live}
        page="map"
      />
    </div>
  );
}

function SpotMark({
  spot,
  k,
  selected,
  wait,
  performing,
  dark,
  fav,
  onClick,
}: {
  spot: MapSpot;
  k: number;
  dark: boolean;
  /** いいねした企画が入っている */
  fav: boolean;
  selected: boolean;
  wait: WaitLevel | null;
  performing: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  // ピン・部屋の色はジャンル。待ち時間は色を変えず、吹き出しで出す
  const color = spotColor(spot);
  const count = spot.locationIds.length;

  // 地図に描いてあるピンクの四角（ステージ・インフォなど）をそのままボタンにする。
  // ふだんは何も描かず、カーソルを合わせたとき・タップしたときだけ色を濃くする
  if (spot.shape === "area") {
    return (
      <g
        className="group cursor-pointer"
        onClick={onClick}
        aria-label={spot.label}
        role="button"
      >
        <rect
          x={spot.x}
          y={spot.y}
          width={spot.w}
          height={spot.h}
          rx={1}
          className={`transition-colors ${
            selected
              ? "fill-black/25"
              : "fill-transparent group-hover:fill-black/20 group-active:fill-black/20"
          }`}
          stroke={selected ? "#1d4ed8" : performing ? "#16a34a" : "none"}
          strokeWidth={1.4 * k}
        >
          {performing && !selected && (
            <animate
              attributeName="stroke-opacity"
              values="1;0.3;1"
              dur="2s"
              repeatCount="indefinite"
            />
          )}
        </rect>
        {fav && <FavoriteMark x={spot.x + spot.w} y={spot.y} k={k} />}
      </g>
    );
  }

  if (spot.shape === "rect") {
    // 部屋：部屋番号の上から団体名で塗りつぶす（来場者には部屋番号より団体名のほうが分かりやすい）
    const names = roomNames(spot);
    const lines =
      names.length > 2 ? [names[0], `ほか${names.length - 1}件`] : names;
    const fit = fitText(lines, spot.w - 2, spot.h - 2);
    const lineH = fit.size * 1.18;
    const top =
      spot.y + spot.h / 2 - (lineH * fit.lines.length) / 2 + fit.size * 0.86;
    return (
      <g
        className="group cursor-pointer"
        onClick={onClick}
        aria-label={`${spot.label}：${names.join("、")}`}
        role="button"
      >
        {/* 下の部屋番号を隠す */}
        <rect
          x={spot.x}
          y={spot.y}
          width={spot.w}
          height={spot.h}
          fill={dark ? "#0f172a" : "#ffffff"}
        />
        <rect
          x={spot.x}
          y={spot.y}
          width={spot.w}
          height={spot.h}
          fill={color}
          className="transition-[fill-opacity]"
          fillOpacity={selected ? 0.5 : 0.22}
          stroke={performing ? "#16a34a" : color}
          strokeWidth={(selected || performing ? 1.6 : 1) * k}
        />
        <text
          textAnchor="middle"
          fontSize={fit.size}
          fontWeight="bold"
          fill={dark ? "#f1f5f9" : "#0f172a"}
          fontFamily="sans-serif"
          pointerEvents="none"
        >
          {fit.lines.map((line, i) => (
            <tspan key={i} x={spot.x + spot.w / 2} y={top + i * lineH}>
              {line}
            </tspan>
          ))}
        </text>
        {fav && (
          <FavoriteMark x={spot.x + 3.6 * k} y={spot.y + 3.6 * k} k={k} />
        )}
        {wait && (
          <WaitBubble
            {...(spot.waitAt ?? {
              x: spot.x + spot.w - 0.8,
              y: spot.y + spot.h - 0.8,
              anchor: "end",
            })}
            k={k}
            level={wait}
          />
        )}
      </g>
    );
  }

  return (
    <g
      className="cursor-pointer"
      onClick={onClick}
      transform={`translate(${spot.x} ${spot.y}) scale(${k})`}
      aria-label={spot.label}
      role="button"
    >
      {/* タップしやすいよう透明の大きめの円 */}
      <circle r={10} fill="transparent" />
      {performing && (
        <circle r={8.5} fill="none" stroke="#16a34a" strokeWidth={1.6}>
          <animate
            attributeName="r"
            values="7;10;7"
            dur="2s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="1;0.3;1"
            dur="2s"
            repeatCount="indefinite"
          />
        </circle>
      )}
      <circle
        r={selected ? 7 : 6}
        fill={color}
        stroke="white"
        strokeWidth={1.4}
      />
      <text
        textAnchor="middle"
        dy={count >= 10 ? 1.7 : 2}
        fontSize={count >= 10 ? 5 : 6}
        fontWeight="bold"
        fill="white"
      >
        {count}
      </text>
      {fav && <FavoriteMark x={-5.6} y={-5.6} />}
      {spot.caption && (
        <text
          y={10.2}
          textAnchor="middle"
          fontSize={3.4}
          fontWeight="bold"
          fill={dark ? "#f1f5f9" : "#0f172a"}
          stroke={dark ? "#0f172a" : "white"}
          strokeWidth={0.9}
          paintOrder="stroke"
          fontFamily="sans-serif"
          pointerEvents="none"
        >
          {spot.caption}
        </text>
      )}
      {wait &&
        ("waitSide" in spot && spot.waitSide === "left" ? (
          <WaitBubble x={-8} y={2.6} k={1} level={wait} anchor="end" />
        ) : (
          <WaitBubble x={8} y={2.6} k={1} level={wait} anchor="start" />
        ))}
    </g>
  );
}

/** 部屋に出す名前：委員会の企画は企画名、それ以外は団体名（同じ団体はまとめる） */
function roomNames(spot: MapSpot): string[] {
  const out: string[] = [];
  for (const id of spot.locationIds) {
    const loc = getLocationById(id);
    if (!loc) continue;
    const org = getOrganizer(loc);
    const name =
      !org || isCommitteeKikaku(loc) ? getDisplayName(loc) : shortOrgName(org);
    if (name && !out.includes(name)) out.push(name);
  }
  return out.length ? out : [spot.label];
}

/**
 * 地図用に団体名を短くする：先頭の「一橋大学」「一橋・津田塾大学」などと、
 * 後ろの「協力 ○○」を除く（例：一橋大学・津田塾大学写真部 → 写真部）
 */
function shortOrgName(org: string): string {
  const short = org
    .replace(/^(一橋大学|一橋)([・･\s　]*(津田塾大学|津田塾))?[・･\s　]*/, "")
    .replace(/^(津田塾大学|津田塾)[・･\s　]*/, "")
    .replace(/[\s　]*協力[\s　].*$/, "")
    .trim();
  return short || org;
}

/** 文字の幅（全角＝1、半角＝0.58 文字分として見積もる） */
function textEm(str: string): number {
  let w = 0;
  for (const ch of str) w += ch.charCodeAt(0) < 0x2000 ? 0.58 : 1;
  return w;
}

/** 1行を、見た目の幅がだいたい同じになるよう n 行に分ける（英単語の途中では切らない） */
function splitLine(l: string, n: number): string[] {
  if (n <= 1) return [l];
  const tokens = l.match(/[A-Za-z0-9&.'!?-]+|[\s\S]/g) ?? [l];
  const total = textEm(l);
  const out: string[] = [];
  let cur = "";
  let acc = 0;
  let k = 1;
  for (const t of tokens) {
    cur += t;
    acc += textEm(t);
    if (k < n && acc >= (total * k) / n) {
      out.push(cur.trim());
      cur = "";
      k++;
    }
  }
  if (cur.trim()) out.push(cur.trim());
  return out.filter(Boolean);
}

/**
 * 四角（幅 w・高さ h）に収まる文字の大きさと行を決める。
 * 1〜4行に折り返したうち、いちばん大きく出せるものを選ぶ。それでも入らなければ「…」で切る。
 */
function fitText(
  lines: string[],
  w: number,
  h: number,
): { size: number; lines: string[] } {
  const MAX = 4.4;
  const MIN = 2.2;
  const sizeFor = (ls: string[]) =>
    Math.min(MAX, w / Math.max(...ls.map(textEm)), h / (ls.length * 1.18));
  let best = { size: sizeFor(lines), lines };
  for (let n = 2; n <= 4; n++) {
    const wrapped = lines.flatMap((l) =>
      textEm(l) < 5 ? [l] : splitLine(l, n),
    );
    const sz = sizeFor(wrapped);
    if (sz > best.size + 0.05) best = { size: sz, lines: wrapped };
  }
  if (best.size >= MIN) return best;
  // 最小の大きさで入るところまでで切る
  const maxLines = Math.max(1, Math.floor(h / (MIN * 1.18)));
  const maxEm = w / MIN;
  const cut = best.lines.slice(0, maxLines).map((l) => {
    if (textEm(l) <= maxEm) return l;
    let acc = 0;
    let outStr = "";
    for (const ch of l) {
      if (acc + textEm(ch) > maxEm - 1) break;
      acc += textEm(ch);
      outStr += ch;
    }
    return outStr + "…";
  });
  if (best.lines.length > maxLines)
    cut[maxLines - 1] = cut[maxLines - 1].replace(/…?$/, "…");
  return { size: MIN, lines: cut };
}

/**
 * 待ち時間の小さな札（「15分」など）。
 * x, y は札の下端の基準点。anchor="end" なら札の右下、"start" なら左下が (x, y) に来る。
 * 部屋（四角）は部屋の中の右下に、丸は丸の右に出す（ほかの教室名にかぶらないように）。
 */
function WaitBubble({
  x,
  y,
  k,
  level,
  anchor = "end",
}: {
  x: number;
  y: number;
  k: number;
  level: WaitLevel;
  anchor?: "start" | "end";
}) {
  const text = level === "closed" ? "終了" : `${level}分`;
  const w = text.length * 3.1 + 2.2;
  const h = 4.8;
  const left = anchor === "end" ? -w : 0;
  return (
    <g transform={`translate(${x} ${y}) scale(${k})`} pointerEvents="none">
      <rect
        x={left}
        y={-h}
        width={w}
        height={h}
        rx={1.2}
        fill={WAIT_LEVEL_INFO[level].color}
        stroke="white"
        strokeWidth={0.5}
      />
      <text
        x={left + w / 2}
        y={-1.25}
        textAnchor="middle"
        fontSize={3.4}
        fontWeight="bold"
        fill="white"
        fontFamily="sans-serif"
      >
        {text}
      </text>
    </g>
  );
}

function MapButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900/85 text-white shadow active:bg-slate-900"
    >
      {children}
    </button>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <span
        className="h-3 w-3 flex-shrink-0 rounded-full"
        style={{ background: color }}
      />
      <span className="text-xs">{label}</span>
    </li>
  );
}
