"use client";

import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Navigation,
  Clock,
  MessageCircleWarning,
  MapPin,
  X,
  ChevronLeft,
  ChevronRight,
  Info,
  Umbrella,
  Lightbulb,
  TriangleAlert,
  Accessibility,
  Map as MapIcon,
  Camera,
} from "lucide-react";
import type { Location } from "@/app/page";
import Footer from "@/components/footer";
import Image from "next/image";
import { track } from "@vercel/analytics";
import { RouteMapView } from "@/components/route-map-view";
import { edgeKey } from "@/lib/route-geometry";
import {
  MOVE_LABEL,
  MOVE_PICTOGRAM,
  getRouteMoves,
  moveText,
  type RouteMove,
} from "@/lib/floor-moves";

const VIEW_STORAGE_KEY = "kodannai-nav-view";
/** 地図で案内するときの地図の高さ（下の説明とボタンが画面に収まるように） */
const MAP_GUIDE_HEIGHT = "min(620px, max(300px, calc(100svh - 400px)))";

interface RouteStep {
  id: string;
  title: string;
  subtitle?: string;
  // description: string
  image: string;
  // connector?: string
  notice?: {
    text: string;
    color: "red" | "yellow" | "blue" | "green" | "gray";
  };
}

interface NavigationViewProps {
  from: Location;
  to: Location;
  onBack: () => void;
  rainyMode?: boolean;
  barrierFreeMode?: boolean;
}

export function NavigationView({
  from,
  to,
  onBack,
  rainyMode = false,
  barrierFreeMode = false,
}: NavigationViewProps) {
  const getAssemblyImageSrc = (image: string) =>
    `/assembly/${image.replace(/\.png$/i, ".webp")}`;


  const [isScrolled, setIsScrolled] = useState(false);
  const [zoomModalOpen, setZoomModalOpen] = useState(false);
  const [currentZoomIndex, setCurrentZoomIndex] = useState(0);
  const [routeSteps, setRouteSteps] = useState<RouteStep[]>([]);
  // 経路のノード列と階段の辺（地図に経路の線を描くのに使う）
  const [routeNodes, setRouteNodes] = useState<number[]>([]);
  const [stairsEdges, setStairsEdges] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [highlight, setHighlight] = useState(false);

  // 案内のしかた：地図（経路の線）か写真か。最後に選んだほうを覚えておく
  const [view, setView] = useState<"map" | "photo">("map");
  const [navTransitioning, setNavTransitioning] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_STORAGE_KEY);
      if (saved === "map" || saved === "photo") setView(saved);
    } catch {
      // 使えない環境では既定（地図）のまま
    }
  }, []);
  const changeView = (v: "map" | "photo") => {
    setView(v);
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, v);
    } catch {
      // 無視
    }
  };

  useEffect(() => {
    // Trigger both effects on mount
    setHighlight(true);

    const timer = setTimeout(() => {
      setHighlight(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const fetchRoute = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          departure: from.locid,
          destination: to.locid,
          rainy: rainyMode.toString(),
          barrierFree: barrierFreeMode.toString(),
        });

        const response = await fetch(`/api/route?${params}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error ||
              "Failed to fetch route and errorData.error is falsy",
          );
        }
        // throw new Error("Failed to fetch route and errorData.error is falsy");

        const data = await response.json();
        setRouteSteps(data.route);
        setRouteNodes(Array.isArray(data.nodes) ? data.nodes : []);
        setStairsEdges(
          new Set(
            (data.edges ?? [])
              .filter((e: { hasStairs?: boolean }) => e.hasStairs)
              .map((e: { from: number; to: number }) => edgeKey(e.from, e.to)),
          ),
        );
        track("route_searched", {
          from: from.name,
          to: to.name,
          rainy: rainyMode,
          barrierFree: barrierFreeMode,
          steps: data.route?.length ?? 0,
        });
      } catch (err) {
        console.error("Route fetch error:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to fetch route and errorData.error is falsy",
        );
        const callLogError = async () => {
          await fetch(
            `/api/logerror?error=${encodeURIComponent(
              err instanceof Error
                ? err.message
                : "Attempted to log error but err is not instance of Error",
            )}&from=${from.locid}&to=${to.locid}%rainy=${rainyMode}%barrierFree=${barrierFreeMode}`,
          );
        };
        callLogError();

        // Fallback to dummy data if API fails
        setRouteSteps([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRoute();
  }, [from.locid, to.locid, rainyMode, barrierFreeMode]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (
      !zoomModalOpen &&
      currentZoomIndex != null &&
      stepRefs.current[currentZoomIndex]
    ) {
      stepRefs.current[currentZoomIndex].scrollIntoView({
        behavior: "auto",
        block: "center",
      });
    }
  }, [currentZoomIndex, zoomModalOpen, view]);

  const openZoomModal = (index: number) => {
    setCurrentZoomIndex(index);
    setZoomModalOpen(true);
  };

  const closeZoomModal = () => {
    setZoomModalOpen(false);
  };

  const goToPrevious = () => {
    if (navTransitioning) return;
    setNavTransitioning(true);
    setCurrentZoomIndex((prev) => Math.max(0, prev - 1));
    setTimeout(() => setNavTransitioning(false), 150);
  };

  const goToNext = () => {
    if (navTransitioning) return;
    setNavTransitioning(true);
    setCurrentZoomIndex((prev) => Math.min(routeSteps.length - 1, prev + 1));
    setTimeout(() => setNavTransitioning(false), 150);
  };

  const getNoticeColor = (color: string) => {
    const colors = {
      red: "bg-red-100 text-red-800 border-red-200",
      yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
      blue: "bg-blue-100 text-blue-800 border-blue-200",
      green: "bg-green-100 text-green-800 border-green-200",
      gray: "bg-gray-100 text-gray-800 border-gray-200",
    };
    return colors[color as keyof typeof colors] || colors.gray;
  };

  const currentStep = routeSteps[currentZoomIndex];
  // 階段・エレベーターでの階の移動（ステップの番号＝経路のノードの番号）
  const floorMoves = getRouteMoves(routeNodes, stairsEdges);
  const moveStartingAt = (index: number) => floorMoves.find((m) => m.startIndex === index);
  const moveDuring = (index: number) =>
    floorMoves.find((m) => index >= m.startIndex && index < m.endIndex);
  const departureColor = "#7aaad8";
  const arrivalColor = "#7aaad8";

  let colorTipMessageFrom = "";
  let colorTipMessageTo = "";
  let colorTipMessage = "";

  if (from.position.includes("オレンジ")) {
    colorTipMessageFrom = "オレンジ館は床がオレンジ色";
  } else if (from.position.includes("レッド")) {
    colorTipMessageFrom = "レッド館は床が赤色";
  } else if (from.position.includes("ブルー")) {
    colorTipMessageFrom = "ブルー館は床が青色";
  }

  if (to.position.includes("オレンジ")) {
    colorTipMessageTo = "オレンジ館は床がオレンジ色";
  } else if (to.position.includes("レッド")) {
    colorTipMessageTo = "レッド館は床が赤色";
  } else if (to.position.includes("ブルー")) {
    colorTipMessageTo = "ブルー館は床が青色";
  }

  if (colorTipMessageFrom === "" && colorTipMessageTo === "") {
    colorTipMessage = "";
  } else if (colorTipMessageFrom === colorTipMessageTo) {
    colorTipMessage = `${colorTipMessageFrom}です`;
  } else if (colorTipMessageFrom === "") {
    colorTipMessage = `${colorTipMessageTo}です`;
  } else if (colorTipMessageTo === "") {
    colorTipMessage = `${colorTipMessageFrom}です`;
  } else {
    colorTipMessage = `${colorTipMessageFrom}、${colorTipMessageTo}です`;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">探索中…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <p className="text-red-600 dark:text-red-400 mb-6 text-xl font-bold">
            エラーが発生しました
          </p>
          <p className="mb-6 text-sm">
            経路探索に失敗しました。
            <br />
            これはユーザー様の操作に起因するものではなく、本システムの問題です。ご迷惑をおかけし申し訳ございません。
          </p>
          <p className="mb-6 text-sm">この不具合はサーバーに報告されました。</p>
          <p className="mb-6 text-sm font-mono text-muted-foreground">
            {error}
            <br />
            {`[${from.locid}-${to.locid}, ${rainyMode}, ${barrierFreeMode}]`}
          </p>
          <button
            onClick={onBack}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <div
        className={`sticky top-0 z-50 border-b border-border transition-all duration-300 ${
          isScrolled ? "py-3" : "py-6"
        } ${rainyMode ? "bg-blue-100 dark:bg-blue-950" : "bg-background"}`}
      >
        <div className="px-4 flex items-center gap-4">
          <button
            onClick={onBack}
            className="px-3 py-5 hover:bg-accent hover:text-accent-foreground rounded-lg transition-colors"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>

          <div
            className={`flex-1 transition-all duration-300 ${
              isScrolled ? "text-lg" : "text-2xl"
            }`}
          >
            <div className="font-bold text-balance">
              {from.name}
              <span
                className={`font-medium text-muted-foreground ${
                  isScrolled ? "text-xs" : "text-sm"
                }`}
              >
                {" "}
                から
              </span>
            </div>
            <div className="font-bold text-balance">{to.name}</div>
            {rainyMode && (
              <div className="flex items-center mt-1 gap-2 text-blue-700 dark:text-blue-300">
                <span
                  className={`font-semibold ${
                    isScrolled ? "text-xs" : "text-sm"
                  }`}
                >
                  {" "}
                  {to.locid === "169" ? (
                    <div className="flex items-center gap-2">
                      グラウンドへのルートに雨天モードは無効です
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Umbrella className="h-4 w-4" />
                      雨天モード
                    </div>
                  )}
                </span>
              </div>
            )}
            {barrierFreeMode && (
              <div className="flex items-center mt-1 gap-2 text-green-700 dark:text-green-300">
                <span
                  className={`font-semibold ${
                    isScrolled ? "text-xs" : "text-sm"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Accessibility className="h-4 w-4" />
                    バリアフリーモード
                  </div>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-4">
        {view === "photo" && (
        <>
        {/* Route Summary */}
        <div
          className={`px-4 transition-all duration-300 ${
            isScrolled ? "py-4" : "pt-8 pb-8"
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span className="text-sm">
                {from.position} → {to.position}
              </span>
            </div>
            {colorTipMessage && (
              <div className="flex items-center gap-2 mb-4 text-blue-700 dark:text-blue-300">
                <Lightbulb className="h-4 w-4" />
                <span className="text-sm font-semibold">{colorTipMessage}</span>
              </div>
            )}

            <div className="flex items-center gap-2 text-muted-foreground">
              <MessageCircleWarning className="h-4 w-4" />
              <span className="text-sm">
                景観は実際と異なります
                <br />
                動線は現状優先をお願いします
              </span>
            </div>
            {/* <div className="flex items-center gap-2 mb-4 text-blue-700 dark:text-blue-300">
              <Info className="h-4 w-4" />
              <span className="text-sm font-semibold">
                画像をタップすると拡大表示します
              </span>
            </div> */}
            {to.locid === "169" && (
              <div className="flex items-center gap-2 p-2 border border-2 rounded-md border-red-600 dark:border-red-400 text-red-600 dark:text-red-400">
                <TriangleAlert className="h-4 w-4" />
                <span className="font-semibold text-balance">
                  災害時は係員の指示を優先してください
                </span>
              </div>
            )}
            {/* <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-sm">5 min</span>
            </div> */}
          </div>
        </div>
        </>
        )}

        {/* 案内のしかたの切り替え（地図／写真） */}
        <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl border border-border bg-background p-1" role="tablist">
          {(
            [
              { id: "map", label: "地図で案内", Icon: MapIcon },
              { id: "photo", label: "写真で案内", Icon: Camera },
            ] as const
          ).map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={view === id}
              onClick={() => changeView(id)}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-bold transition-colors ${
                view === id ? "bg-blue-600 text-white shadow" : "text-muted-foreground hover:bg-accent"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {view === "map" && routeNodes.length > 0 && (() => {
          const lastIndex = routeSteps.length - 1;
          const idx = Math.min(currentZoomIndex, lastIndex);
          const step = routeSteps[idx];
          const isFirst = idx === 0;
          const isLast = idx === lastIndex;
          const nodeId = routeNodes[idx] ?? parseInt(step?.id ?? "0");
          const move = moveDuring(idx);
          const title = isLast ? `到着：${to.name}` : step?.title;
          return (
            <div className="space-y-3 pb-6">
              <div className="flex justify-center rounded-2xl border border-border bg-card p-1" style={{ height: MAP_GUIDE_HEIGHT }}>
                <RouteMapView
                  nodes={routeNodes}
                  stairsEdges={stairsEdges}
                  currentNodeId={nodeId}
                  maxHeight={MAP_GUIDE_HEIGHT}
                />
              </div>

              {/* いまのステップ */}
              <div className="flex items-center gap-3 rounded-xl border-2 border-blue-500/60 bg-card p-3">
                {!isFirst && !isLast && step && (
                  <button
                    type="button"
                    onClick={() => openZoomModal(idx)}
                    className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 border-primary"
                    aria-label="この場所の写真を見る"
                  >
                    <Image
                      src={getAssemblyImageSrc(step.image)}
                      alt={step.title}
                      width={135}
                      height={240}
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute inset-x-0 bottom-0 bg-black/60 text-center text-[10px] font-bold text-white">写真</span>
                  </button>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-muted-foreground">
                    {isFirst ? "スタート" : isLast ? "ゴール" : `${idx + 1} / ${lastIndex}`}
                  </div>
                  <div className="text-lg font-bold leading-snug">{title}</div>
                  {isFirst && step?.subtitle && (
                    <div className="text-sm text-muted-foreground">{step.subtitle}</div>
                  )}
                </div>
              </div>

              {move && <FloorMoveBanner move={move} />}
              {!isLast && step?.notice && (
                <span
                  className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${getNoticeColor(step.notice.color)}`}
                >
                  {step.notice.text}
                </span>
              )}

              {/* 進む・戻る */}
              <div className="relative h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  className="absolute left-0 top-0 h-2 rounded-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${(idx / Math.max(1, lastIndex)) * 100}%` }}
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={goToPrevious}
                  disabled={isFirst || navTransitioning}
                  className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-accent py-3 font-bold text-secondary-foreground disabled:opacity-40"
                >
                  <ChevronLeft className="h-5 w-5" />
                  前へ
                </button>
                <button
                  type="button"
                  onClick={goToNext}
                  disabled={isLast || navTransitioning}
                  className="flex flex-[2] items-center justify-center gap-1 rounded-xl bg-blue-600 py-3 font-bold text-white disabled:opacity-40"
                >
                  {idx === lastIndex - 1 ? "到着" : "次へ"}
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          );
        })()}

        {view === "photo" && (
        <>
        {/* Route Steps */}
        <div className="space-y-0">
          {routeSteps.map(
            (step, index) =>
              index < routeSteps.length - 1 && (
                // Combined component with overlay snippet added
                <div
                  key={step.id}
                  ref={(el) => {
                    stepRefs.current[index] = el;
                  }}
                  className="relative" // make parent relative for absolute overlay
                >
                  {/* Step Card */}
                  <button
                    onClick={() => openZoomModal(index)}
                    className={` ${
                      index === 0
                        ? `transition-all duration-300 text-white ${
                            highlight ? "border-blue-500" : ""
                          }`
                        : "border-border/70"
                    } flex gap-4 mb-2 px-4 h-24 items-center w-full text-left border-2 rounded-lg hover:border-primary/80 transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                      index === 0 ? "bg-card" : "bg-card"
                    }`}
                    style={
                      index === 0
                        ? { backgroundColor: departureColor }
                        : undefined
                    }
                  >
                    {/* Step Image */}
                    {index !== 0 && (
                      <div className="flex-shrink-0 w-20 h-20 bg-card border-2 border-primary rounded-lg flex items-center justify-center overflow-hidden hover:border-primary/80 transition-colors">
                        <Image
                          src={getAssemblyImageSrc(step.image)}
                          alt={step.title}
                          width={270}
                          height={480}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Step Content */}
                    <div
                      className={`flex-1 ${index === 0 ? "text-center" : ""}`}
                    >
                      {index !== 0 ? (
                        <h3 className="font-semibold text-lg mb-1">
                          {step.title}
                        </h3>
                      ) : (
                        <div className="text-center">
                          <div className="text-lg font-bold">{step.title}</div>
                          {step.subtitle && (
                            <div className="text-sm font-semibold opacity-90 mt-1">
                              {step.subtitle}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </button>

                  {/* Overlay bubble */}
                  {index === 0 && (
                    <div className="absolute -bottom-2 right-0 mt-0 z-10 bg-blue-500 text-white rounded-lg py-2 px-3 shadow-lg animate-fade-in-out">
                      タップすると拡大表示します
                      <div className="absolute top-0 left-4 w-2 h-2 bg-blue-500 rotate-45 -translate-y-1" />
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-4 my-2 pl-4">
                    <div className="flex-shrink-0 w-full flex justify-center">
                      <div className="w-0.5 h-8 bg-neutral-300 dark:bg-neutral-700" />
                    </div>

                    <div className="flex-1 flex items-center gap-3">
                      {step.notice && (
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium border ${getNoticeColor(
                            step.notice.color,
                          )}`}
                        >
                          {step.notice.text}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 階段・エレベーターで階が変わるところ */}
                  {moveStartingAt(index) && (
                    <div className="mb-3 -mt-1">
                      <FloorMoveBanner move={moveStartingAt(index)!} />
                    </div>
                  )}
                </div>
              ),
          )}
        </div>

        {/* Arrival Message */}
        <div
          className="p-4 text-accent-foreground rounded-lg text-center"
          style={{ backgroundColor: arrivalColor }}
        >
          <div className="text-lg font-bold">到着</div>
          <div className="text-sm font-semibold opacity-90 mt-1">{to.name}</div>
        </div>
        </>
        )}
      </div>

      {zoomModalOpen && currentStep && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg w-[95vw] max-w-[95vw] h-[92vh] max-h-[92vh] overflow-hidden flex flex-col relative">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
              <h2 className="text-2xl font-bold">
                {currentStep.title || to.name}
              </h2>
              <button
                onClick={closeZoomModal}
                className="p-2 hover:bg-accent hover:text-accent-foreground rounded-lg transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-auto flex flex-col items-center justify-center p-2 relative">
              {currentZoomIndex !== 0 ? (
                <>
                  {/* Large Image */}
                  <div className="flex items-center justify-center w-full h-full">
                    <Image
                      src={getAssemblyImageSrc(currentStep.image)}
                      width={540}
                      height={960}
                      alt={currentStep.title}
                      className="max-w-full max-h-full object-contain rounded-md"
                    />
                  </div>

                  {/* Description and Notice */}
                  <div className="w-full mt-4 space-y-4">
                    {moveDuring(currentZoomIndex) && (
                      <FloorMoveBanner move={moveDuring(currentZoomIndex)!} className="mr-16" />
                    )}
                    {currentZoomIndex < routeSteps.length - 1 && (
                      <div className="flex items-center gap-3">
                        {currentStep.notice && (
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium border ${getNoticeColor(
                              currentStep.notice.color,
                            )}`}
                          >
                            {currentStep.notice.text}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center w-full h-full">
                  このステップに画像はありません
                </div>
              )}

              {/* 地図で見る（同じステップのまま、地図の案内に切り替える） */}
              <button
                onClick={() => {
                  changeView("map");
                  closeZoomModal();
                }}
                aria-label="地図で見る"
                className="absolute bottom-9 right-6 flex h-12 items-center gap-1 rounded-full bg-blue-600 px-4 text-sm font-bold text-white shadow-lg hover:scale-105 transition-transform"
              >
                <MapIcon className="h-5 w-5" />
                地図
              </button>
            </div>

            {/* Modal Footer with Navigation */}
            {
              <div className="flex flex-col p-4 border-t border-border flex-shrink-0">
                {/* Progress Bar */}
                <div className="relative w-full h-4 mb-3">
                  {/* Bar background */}
                  <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 bg-gray-200 dark:bg-gray-700 rounded-full h-2" />
                  {/* Filled bar */}
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 bg-blue-500 h-2 rounded-full transition-all duration-500 ease-in-out"
                    style={{
                      width: `${((currentZoomIndex + 1) / (routeSteps.length - 1)) * 100}%`,
                    }}
                  />
                </div>

                {/* Nav buttons + step counter */}
                <div className="flex items-center justify-between">
                  {currentZoomIndex > 0 ? (
                    <button
                      onClick={goToPrevious}
                      disabled={navTransitioning}
                      className="flex items-center gap-2 px-4 py-2 bg-accent text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors disabled:opacity-50"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      前へ
                    </button>
                  ) : (
                    <div className="w-[88px]" />
                  )}

                  <span className="text-sm text-muted-foreground">
                    {currentZoomIndex + 1} / {routeSteps.length - 1}
                  </span>

                  {currentZoomIndex < routeSteps.length - 2 ? (
                    <button
                      onClick={goToNext}
                      disabled={navTransitioning}
                      className="flex items-center gap-2 px-4 py-2 bg-accent text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors disabled:opacity-50"
                    >
                      次へ
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <div className="w-[88px]" />
                  )}
                </div>
              </div>
            }
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

/** 階段・エレベーターで階を移動するところの目立つ表示（ピクトグラム＋「階段で3Fへ上がる」） */
function FloorMoveBanner({ move, className = "" }: { move: RouteMove; className?: string }) {
  const floors = Math.abs(move.to - move.from);
  return (
    <div className={`flex items-center gap-3 rounded-xl border-2 border-blue-500 bg-blue-50 px-3 py-2 dark:bg-blue-950 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={MOVE_PICTOGRAM[move.kind]}
        alt={MOVE_LABEL[move.kind]}
        className="h-11 w-11 flex-shrink-0 rounded-md bg-white p-0.5"
      />
      <div className="min-w-0">
        <div className="text-base font-bold text-blue-800 dark:text-blue-200">{moveText(move)}</div>
        <div className="text-xs text-blue-700/80 dark:text-blue-300/80">
          {move.from}F → {move.to}F{floors > 1 && move.kind === "stairs" ? `（${floors}階分そのまま）` : ""}
        </div>
      </div>
    </div>
  );
}
