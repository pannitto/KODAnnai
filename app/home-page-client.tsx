"use client";

/**
 * KODAnnai ホーム画面クライアントコンポーネント
 *
 * このコンポーネントは、文化祭来場者向けのナビゲーションアプリのメイン画面を担当します。
 * 場所の選択、雨天モード/バリアフリーモードの設定、ルート検索の開始を行います。
 *
 * 主な機能:
 * - 出発地点と目的地の選択
 * - 雨天モード: 屋外経路を避けて屋内優先のルートを案内
 * - バリアフリーモード: 階段を避けてバリアフリーなルートを案内
 * - URLパラメータからの状態復元
 * - 最寄り施設の自動選択（トイレ、ゴミステーション、休憩所、多目的トイレ）
 */

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LocationSelector } from "@/components/location-selector";
import { NavigationView } from "@/components/navigation-view";
import { OutdoorNavigationMap } from "@/components/outdoor-navigation-map";
import { Switch } from "@/components/ui/switch";
import { CloudRain, Accessibility, Info, MapPin } from "lucide-react";
import {
  getLocationById,
  getNodeDisplayInfoByLocid,
  maleBathrooms,
  femaleBathrooms,
  garbageStations,
  restAreas,
  multipurposeBathrooms,
} from "@/app/locations-server";
import Logo from "@/components/logo";
import Footer from "@/components/footer";

export type Location = {
  id: string;
  locid: string;
  name: string;
  category: string;
  organizer: string;
  position: string;
  keywords: string[];
};

function buildVirtualCurrentLocation(locid: string): Location | null {
  const nodeInfo = getNodeDisplayInfoByLocid(locid);

  if (!nodeInfo) {
    return null;
  }

  const rawAreaName = nodeInfo.position || nodeInfo.name || `ノード ${locid}`;
  const areaName =
    rawAreaName === "クラス模擬店ロータリー"
      ? `${rawAreaName}（${locid}）`
      : rawAreaName;

  return {
    id: locid,
    locid,
    name: `出発地点：${areaName}`,
    category: "現在地から出発",
    organizer: "",
    position: areaName,
    keywords: ["しゅっぱつ", "現在地", areaName],
  };
}

export default function HomePageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isQr = searchParams.get("qr");

  // ナビゲーション状態管理
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null); // 出発地点
  const [destination, setDestination] = useState<Location | null>(null); // 目的地
  const [showNavigation, setShowNavigation] = useState(false); // ナビゲーション画面表示フラグ
  const [rainyMode, setRainyMode] = useState(false); // 雨天モード有効/無効
  const [barrierFreeMode, setBarrierFreeMode] = useState(false); // バリアフリーモード有効/無効
  const [selectedOutdoorNodeId, setSelectedOutdoorNodeId] = useState<
    number | null
  >(null); // 選択された屋外ノード
  const [departureTab, setDepartureTab] = useState<
    "search" | "current-location"
  >("search"); // 出発地選択タブ
  const [showCurrentLocationMap, setShowCurrentLocationMap] = useState(false); // 現在地マップ画面表示

  // UI状態管理
  const [loading, setLoading] = useState(true); // 読み込み中フラグ
  const [error, setError] = useState<string | null>(null); // エラーメッセージ
  const [trueDestination, setTrueDestination] = useState<Location | null>(null); // 実際の目的地（自動選択用）
  const [showBalloon, setShowBalloon] = useState(false); // QRコード用バルーン表示
  const [showRainyInfo, setShowRainyInfo] = useState(false); // 雨天モード説明ツールチップ表示
  const [showBFInfo, setShowBFInfo] = useState(false); // バリアフリーモード説明ツールチップ表示

  // URL更新制御用フラグ（無限ループ防止）
  const isUpdatingURL = useRef(false);

  const depId = searchParams.get("dep");
  const destId = searchParams.get("dest");
  const rainy = searchParams.get("rainy") === "true";
  const barrierFree = searchParams.get("barrierFree") === "true";
  const nav = searchParams.get("nav") === "true";
  const parsedDepId = depId?.startsWith("current-") ? depId.slice(8) : depId;

  /**
   * QRアクセス時の案内バルーン表示制御
   * `qr` パラメータがある場合のみ 5 秒間バルーンを表示する
   */
  useEffect(() => {
    if (isQr) {
      setShowBalloon(true);
    }

    const timer = setTimeout(() => {
      setShowBalloon(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  /**
   * URLパラメータから画面状態を復元する初期化処理
   * - dep/dest の妥当性を確認
   * - rainy/barrierFree/nav の状態を復元
   * - 不正な組み合わせはトップへリダイレクト
   */
  useEffect(() => {
    if (isUpdatingURL.current) {
      isUpdatingURL.current = false;
      return;
    }

    // console.warn(destId);

    // If nav=true but missing either dep or dest, redirect to home
    if (nav && (!depId || !destId)) {
      router.replace("/");
      return;
    }

    if (searchParams.has("rainy")) {
      setRainyMode(rainy);
    }

    if (searchParams.has("barrierFree")) {
      setBarrierFreeMode(barrierFree);
    }

    // Load locations from URL if available
    if (depId || destId) {
      let validDep = null;
      let validDest = null;

      if (parsedDepId) {
        const dep = !depId?.startsWith("current-")
          ? getLocationById(parsedDepId)
          : null;
        if (dep) {
          validDep = dep;
          setCurrentLocation(dep);
          setDepartureTab("search");
        } else {
          const virtualDep = buildVirtualCurrentLocation(parsedDepId);
          if (virtualDep) {
            validDep = virtualDep;
            setCurrentLocation(virtualDep);
            setSelectedOutdoorNodeId(Number(parsedDepId));
            setDepartureTab("current-location");
          }
        }
      }
      if (destId) {
        const dest = getLocationById(destId);
        if (dest) {
          validDest = dest;
          setDestination(dest);
        }
      }

      if (
        (depId && !validDep) ||
        (destId && !validDest) ||
        (depId && destId && depId === destId) ||
        ["m", "f", "g", "r", "u"].includes(parsedDepId ?? "")
      ) {
        router.replace("/");
        router.refresh();
        return;
      }

      // Show navigation if both locations are set and nav=true
      if (nav && validDep && validDest) {
        setShowNavigation(true);
      }
    }
  }, [searchParams, router]);

  /**
   * URLパラメータを更新する関数
   * 現在のナビゲーション状態をURLに反映し、ブラウザの戻る/進む機能をサポート
   */
  const updateURL = (
    newCurrentLocation?: Location | null,
    newDestination?: Location | null,
    newRainyMode?: boolean,
    navigate?: boolean,
    newBarrierFreeMode?: boolean,
  ) => {
    isUpdatingURL.current = true;

    const params = new URLSearchParams();

    const currentLoc =
      newCurrentLocation !== undefined ? newCurrentLocation : currentLocation;
    const destLoc = newDestination !== undefined ? newDestination : destination;
    const rainy = newRainyMode !== undefined ? newRainyMode : rainyMode;
    const barrierFree =
      newBarrierFreeMode !== undefined ? newBarrierFreeMode : barrierFreeMode;

    if (currentLoc) {
      params.set(
        "dep",
        currentLoc.category === "現在地から出発"
          ? `current-${currentLoc.locid}`
          : currentLoc.id,
      );
    }
    if (destLoc) params.set("dest", destLoc.id);
    if (rainy) params.set("rainy", "true");
    if (barrierFree) params.set("barrierFree", "true");
    if (navigate) params.set("nav", "true");

    const url = params.toString() ? `/?${params.toString()}` : "/";
    router.replace(url);
  };

  const handleCurrentLocationChange = (location: Location | null) => {
    // 出発地点の更新とURL同期
    setDepartureTab("search");
    setSelectedOutdoorNodeId(null);
    setCurrentLocation(location);
    updateURL(location, undefined, undefined, false);
  };

  const handleDestinationChange = (location: Location | null) => {
    // 目的地の更新とURL同期
    setDestination(location);
    updateURL(undefined, location, undefined, false);
  };

  /**
   * 屋外ナビゲーションマップから出発地点を選択
   * ノードIDから対応する位置情報を持つ仮想出発地点を作成
   */
  const handleOutdoorStartPointSelected = (
    nodeId: number,
    _nodeName: string,
    nodeDescription: string,
  ) => {
    setSelectedOutdoorNodeId(nodeId);

    const virtualLocation: Location = {
      id: nodeId.toString(),
      locid: nodeId.toString(),
      name: `出発地点：${nodeDescription}`,
      category: "現在地から出発",
      organizer: "",
      position: nodeDescription,
      keywords: ["屋外", "現在地", nodeDescription],
    };

    setDepartureTab("current-location");
    setCurrentLocation(virtualLocation);
    setShowCurrentLocationMap(false);
    updateURL(virtualLocation, undefined, undefined, false);
  };

  /**
   * 雨天モードの切り替えハンドラー
   * 雨天モードをオンにすると屋外経路を避けたルート案内になる
   * オフにするとバリアフリーモードも自動的にオフになる
   */
  const handleRainyModeChange = (enabled: boolean) => {
    setRainyMode(enabled);
    if (!enabled) {
      setBarrierFreeMode(false); // 雨天モードがオフになったらバリアフリーモードもオフ
    }
    updateURL(undefined, undefined, enabled, showNavigation, false);
  };

  /**
   * バリアフリーモードの切り替えハンドラー
   * バリアフリーモードをオンにすると階段を避けたルート案内になる
   * 雨天モードが有効な場合のみ利用可能
   */
  const handleBarrierFreeModeChange = (enabled: boolean) => {
    setBarrierFreeMode(enabled);
    updateURL(undefined, undefined, undefined, showNavigation, enabled);
  };

  /**
   * ナビゲーション開始ハンドラー
   * 出発地点と目的地が設定されている場合にナビゲーション画面を表示
   */
  const handleNavigate = () => {
    if (currentLocation && destination) {
      setShowNavigation(true);
      updateURL(undefined, undefined, undefined, true);
    }
  };

  /**
   * 戻るボタンハンドラー
   * ナビゲーション画面からホーム画面に戻る
   */
  const handleBack = () => {
    setShowNavigation(false);
    updateURL(undefined, undefined, undefined, false);
  };

  /**
   * 実際に案内する目的地（`trueDestination`）を決定する処理
   * - 通常の目的地: そのまま使用
   * - 特殊目的地（m/f/g/r/u）: 候補群の中から経路コスト最小の地点を選択
   */
  useEffect(() => {
    /**
     * 現在地と目的地の状態から、最終的な案内先を計算する
     */
    const fetchTrueDestination = async () => {
      if (!currentLocation || !destination) {
        setTrueDestination(null);
        return;
      }

      let actualDestination = destination;

      if (["m", "f", "g", "r", "u"].includes(destination.locid)) {
        /**
         * 指定候補までのルートコストを取得する補助関数
         * APIの `cost` を使って最短候補を比較する
         */
        const getCost = async (target: Location) => {
          try {
            setLoading(true);
            setError(null);

            const params = new URLSearchParams({
              departure: currentLocation.locid,
              destination: target.locid,
              rainy: rainyMode.toString(),
            });

            const response = await fetch(`/api/route?${params}`);

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || "Failed to fetch route");
            }
            const data = await response.json();
            return data.cost;
          } catch (err) {
            console.error("Route fetch error:", err);
            setError(
              err instanceof Error ? err.message : "Failed to load route",
            );
          } finally {
            setLoading(false);
          }
        };

        const candidates =
          destination.locid === "m"
            ? maleBathrooms
            : destination.locid === "f"
              ? femaleBathrooms
              : destination.locid === "g"
                ? garbageStations
                : destination.locid === "r"
                  ? restAreas
                  : multipurposeBathrooms;

        if (candidates.length === 0) {
          setError(
            destination.locid === "g"
              ? "ゴミステーションが未登録です"
              : destination.locid === "r"
                ? "飲食スペース・休憩所が未登録です"
                : destination.locid === "u"
                  ? "多目的トイレが未登録です"
                  : "候補地点が未登録です",
          );
          setTrueDestination(destination);
          return;
        }

        let best = { closest: candidates[0], minCost: Infinity };

        // 候補トイレを総当たりして最小コストの地点を選ぶ
        for (const candidate of candidates) {
          const cost = await getCost(candidate);
          if (cost !== undefined && cost < best.minCost) {
            best = { closest: candidate, minCost: cost };
          }
        }
        actualDestination = best.closest;
      }
      setTrueDestination(actualDestination);
    };
    fetchTrueDestination();
  }, [
    showNavigation,
    currentLocation,
    destination,
    rainyMode,
    trueDestination,
  ]);

  // ナビゲーション画面表示時はNavigationViewコンポーネントを表示
  if (showNavigation && currentLocation && trueDestination) {
    updateURL(currentLocation, trueDestination, rainyMode, true);
    return (
      <NavigationView
        from={currentLocation}
        to={trueDestination}
        onBack={handleBack}
        rainyMode={rainyMode}
        barrierFreeMode={barrierFreeMode}
      />
    );
  }

  if (showCurrentLocationMap) {
    return (
      <div className="min-h-screen bg-background p-4 pt-5">
        <Logo />
        <div className="mx-auto max-w-md space-y-4 pt-1">
          <button
            type="button"
            onClick={() => setShowCurrentLocationMap(false)}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            ← どこから に戻る
          </button>

          <OutdoorNavigationMap
            onStartPointSelected={handleOutdoorStartPointSelected}
            selectedNodeId={selectedOutdoorNodeId}
          />
        </div>
        <Footer />
      </div>
    );
  }

  // ホーム画面のUIレンダリング
  return (
    <div className="min-h-screen bg-background p-4 pt-5">
      <Logo />
      <div className="mx-auto max-w-md space-y-8 pt-1">
        {/* <Kagayaki width={80} height={80} /> */}
        <div className="relative space-y-4">
          <div className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">
              どこから
            </p>

            <div className="grid grid-cols-2 gap-2 rounded-lg bg-transparent border border-border p-1 dark:bg-transparent dark:border-gray-700">
              <button
                type="button"
                onClick={() => {
                  setDepartureTab("search");
                  setSelectedOutdoorNodeId(null);
                  if (currentLocation?.category === "現在地から出発") {
                    setCurrentLocation(null);
                  }
                }}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  departureTab === "search"
                    ? "bg-background text-foreground shadow-sm dark:bg-gray-900 dark:text-white"
                    : "text-muted-foreground hover:text-foreground dark:text-gray-400 dark:hover:text-gray-100"
                }`}
              >
                出発地点を検索
              </button>
              <button
                type="button"
                onClick={() => {
                  setDepartureTab("current-location");
                  setShowCurrentLocationMap(true);
                }}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  departureTab === "current-location"
                    ? "bg-background text-foreground shadow-sm dark:bg-gray-900 dark:text-white"
                    : "text-muted-foreground hover:text-foreground dark:text-gray-400 dark:hover:text-gray-100"
                }`}
              >
                地図から検索
              </button>
            </div>

            {departureTab === "search" ? (
              <LocationSelector
                label=""
                placeholder="出発地点を選択"
                value={
                  currentLocation?.category === "現在地から出発"
                    ? null
                    : currentLocation
                }
                departure={true}
                hideLabel={true}
                onChange={handleCurrentLocationChange}
              />
            ) : (
              <button
                type="button"
                onClick={() => setShowCurrentLocationMap(true)}
                className="w-full rounded-lg border-2 border-border bg-input px-4 py-3 text-left transition-colors hover:bg-accent/40"
              >
                {currentLocation?.category === "現在地から出発" ? (
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-base leading-tight text-foreground">
                        {currentLocation.position}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        タップして地図ページを開き直す
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-base leading-tight text-foreground">
                        出発地点を選択
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        タップして地図ページを開く
                      </div>
                    </div>
                  </div>
                )}
              </button>
            )}
          </div>
        </div>
        <LocationSelector
          label="どこまで"
          placeholder="目的地を選択"
          value={destination}
          departure={false}
          onChange={handleDestinationChange}
        />

        <button
          onClick={handleNavigate}
          disabled={
            !currentLocation ||
            !destination ||
            currentLocation.locid === destination.locid
          }
          className="relative btn-living-galaxy w-full text-primary-foreground font-bold italic text-8xl px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors overflow-visible"
        >
          <span className="fog fog1" />
          <span className="fog fog2" />
          <span className="fog fog3" />
          {/* <span className="fog fog4" />
          <span className="fog fog5" /> */}
          <span className="-my-4 -ml-4 text-white dark:text-black block">
            GO!
          </span>
        </button>

        {/* 雨天モード・バリアフリーモード（ブロック全体を中央寄せ、行内は左揃え） */}
        <div className="flex justify-center pt-1">
          <div className="flex flex-col gap-1">
            {/* 雨天モード */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <Switch
                  checked={rainyMode}
                  onCheckedChange={handleRainyModeChange}
                  className="data-[state=unchecked]:bg-neutral-400 dark:data-[state=unchecked]:bg-neutral-600"
                />
                <CloudRain className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                <span className="text-base font-medium text-blue-600 dark:text-blue-400">
                  雨天モード
                </span>
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowRainyInfo((v: boolean) => !v);
                    setShowBFInfo(false);
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="雨天モードの説明"
                >
                  <Info className="h-4 w-4" />
                </button>
                {showRainyInfo && (
                  <div className="absolute bottom-full right-0 mb-2 w-56 bg-popover border border-border rounded-lg px-3 py-2 text-sm shadow-lg z-50">
                    なるべく屋内経路を通るように案内します
                    <div className="absolute bottom-0 right-3 w-2 h-2 bg-popover border-r border-b border-border rotate-45 translate-y-1" />
                  </div>
                )}
              </div>
            </div>

            {/* バリアフリーモード（雨天モードと独立） */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <Switch
                  checked={barrierFreeMode}
                  onCheckedChange={handleBarrierFreeModeChange}
                  className="data-[state=unchecked]:bg-neutral-400 dark:data-[state=unchecked]:bg-neutral-600"
                />
                <Accessibility className="h-5 w-5 text-green-500 dark:text-green-400" />
                <span className="text-base font-medium text-green-600 dark:text-green-400">
                  バリアフリーモード
                </span>
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowBFInfo((v: boolean) => !v);
                    setShowRainyInfo(false);
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="バリアフリーモードの説明"
                >
                  <Info className="h-4 w-4" />
                </button>
                {showBFInfo && (
                  <div className="absolute bottom-full right-0 mb-2 w-56 bg-popover border border-border rounded-lg px-3 py-2 text-sm shadow-lg z-50">
                    階段を避けてバリアフリーな経路を案内します
                    <div className="absolute bottom-0 right-3 w-2 h-2 bg-popover border-r border-b border-border rotate-45 translate-y-1" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* 公式サイトバナー */}
      <div className="w-full px-4 mt-6 mb-0 flex justify-center">
        <a
          href="https://kodairafes.com"
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full max-w-lg"
          aria-label="KODAIRA祭公式サイトはこちらから"
        >
          {/* ライトモード用 */}
          <svg xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 0 1200 200" className="w-full h-auto dark:hidden" style={{ aspectRatio: '1416.97 / 215.64' }}>
            <defs>
              <style>{`
                .cls-1 { letter-spacing: .25em; }
                .cls-2 { stroke: url(#_名称未設定グラデーション_122); }
                .cls-2, .cls-3 { stroke-width: 6px; }
                .cls-2, .cls-3, .cls-4, .cls-5 { fill: none; stroke-miterlimit: 10; }
                .cls-6 { fill: #7aaad8; opacity: .5; }
                .cls-3 { stroke: url(#_名称未設定グラデーション_82); }
                .cls-4 { stroke: url(#_名称未設定グラデーション_138); }
                .cls-4, .cls-5 { stroke-width: 3px; }
                .cls-5 { stroke: url(#_名称未設定グラデーション_111); }
                .cls-7 { fill: #7ae6d8; }
                .cls-7, .cls-8 { opacity: .7; }
                .cls-8 { fill: #fc81bf; }
                .cls-9 { letter-spacing: -.02em; }
                .cls-10 { font-family: TsukuMinPr6N-L-90ms-RKSJ-H, 'FOT-TsukuMin Pr6N'; font-size: 54px; fill: #000; }
              `}</style>
              <linearGradient id="_名称未設定グラデーション_82" x1="-131.75" y1="41.64" x2="358.25" y2="41.64" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#fff"/><stop offset=".18" stopColor="#fbfefd"/><stop offset=".35" stopColor="#effcfa"/><stop offset=".52" stopColor="#dbf8f4"/><stop offset=".69" stopColor="#c0f3ec"/><stop offset=".86" stopColor="#9dece2"/><stop offset="1" stopColor="#7ae6d8"/>
              </linearGradient>
              <linearGradient id="_名称未設定グラデーション_111" x1="-97.31" y1="46.32" x2="434.97" y2="46.32" gradientUnits="userSpaceOnUse">
                <stop offset=".14" stopColor="#fff"/><stop offset="1" stopColor="#fc81bf"/>
              </linearGradient>
              <linearGradient id="_名称未設定グラデーション_122" x1="544.74" y1="178.11" x2="1221.74" y2="178.11" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#7ae6d8"/><stop offset="1" stopColor="#fff"/>
              </linearGradient>
              <linearGradient id="_名称未設定グラデーション_138" x1="608.22" y1="181.55" x2="1285.22" y2="181.55" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#fc81bf"/><stop offset=".81" stopColor="#fff"/>
              </linearGradient>
            </defs>
            <text className="cls-10" transform="translate(279.89 106.02)"><tspan x="0" y="0">KO</tspan><tspan className="cls-9" x="77.38" y="0">D</tspan><tspan x="116.42" y="0">AIR</tspan><tspan className="cls-1" x="210.33" y="0">A</tspan><tspan x="262.22" y="0">祭公式サイトは</tspan><tspan x="185.11" y="52">こちらから</tspan></text>
            <g>
              <line className="cls-3" x1="-131.75" y1="41.64" x2="358.25" y2="41.64"/>
              <line className="cls-5" x1="-97.31" y1="46.32" x2="434.97" y2="46.32"/>
            </g>
            <g>
              <line className="cls-2" x1="544.74" y1="178.11" x2="1221.74" y2="178.11"/>
              <line className="cls-4" x1="608.22" y1="181.55" x2="1285.22" y2="181.55"/>
            </g>
            <polyline className="cls-6" points="44.15 45.57 34 198.15 288.35 121.68"/>
            <polyline className="cls-6" points="1159.18 3.02 1169.33 155.61 914.98 79.13"/>
            <polyline className="cls-8" points="0 110.01 162.06 117.92 68.87 -.92"/>
            <polyline className="cls-8" points="1138.53 87.22 976.47 79.32 1069.66 198.15"/>
            <polyline className="cls-7" points="1173.94 135.38 1049.12 129.29 1122.9 179.83"/>
          </svg>
          {/* ダークモード用 */}
          <svg xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 0 1416.97 215.64" className="w-full h-auto hidden dark:block">
            <defs>
              <style>{`
                .dk-cls-1 { letter-spacing: .25em; }
                .dk-cls-2 { letter-spacing: -.05em; }
                .dk-cls-3 { letter-spacing: -.02em; }
                .dk-cls-4 { fill: #7aaad8; opacity: .5; }
                .dk-cls-5 { letter-spacing: 0em; }
                .dk-cls-6 { fill: #fff; font-family: NotoSerifJP-Light, 'Noto Serif JP'; font-size: 54px; font-variation-settings: 'wght' 300; font-weight: 300; }
                .dk-cls-7 { stroke: url(#_dk_164); }
                .dk-cls-7, .dk-cls-8, .dk-cls-9, .dk-cls-10 { fill: none; stroke-miterlimit: 10; }
                .dk-cls-7, .dk-cls-9 { stroke-width: 6px; }
                .dk-cls-11 { letter-spacing: -.03em; }
                .dk-cls-12 { fill: #7ae6d8; }
                .dk-cls-12, .dk-cls-13 { opacity: .7; }
                .dk-cls-8 { stroke: url(#_dk_169); }
                .dk-cls-8, .dk-cls-10 { stroke-width: 3px; }
                .dk-cls-13 { fill: #fc81bf; }
                .dk-cls-9 { stroke: url(#_dk_196); }
                .dk-cls-10 { stroke: url(#_dk_182); }
                .dk-cls-14 { letter-spacing: 0em; }
              `}</style>
              <linearGradient id="_dk_196" x1="0" y1="42.55" x2="490" y2="42.55" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#000"/><stop offset=".24" stopColor="#1a322f"/><stop offset=".78" stopColor="#5db0a5"/><stop offset="1" stopColor="#7ae6d8"/>
              </linearGradient>
              <linearGradient id="_dk_182" x1="34.44" y1="47.24" x2="566.72" y2="47.24" gradientUnits="userSpaceOnUse">
                <stop offset=".06" stopColor="#000"/><stop offset=".32" stopColor="#532a3f"/><stop offset=".56" stopColor="#9b4f75"/><stop offset=".77" stopColor="#cf6a9d"/><stop offset=".92" stopColor="#ef7ab5"/><stop offset="1" stopColor="#fc81bf"/>
              </linearGradient>
              <linearGradient id="_dk_164" x1="676.49" y1="179.03" x2="1353.49" y2="179.03" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#7ae6d8"/><stop offset=".09" stopColor="#76ded1"/><stop offset=".23" stopColor="#6bcabd"/><stop offset=".4" stopColor="#59a89e"/><stop offset=".59" stopColor="#407972"/><stop offset=".8" stopColor="#213e3a"/><stop offset="1" stopColor="#000"/>
              </linearGradient>
              <linearGradient id="_dk_169" x1="739.97" y1="182.47" x2="1416.97" y2="182.47" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#fc81bf"/><stop offset=".12" stopColor="#f87fbc"/><stop offset=".23" stopColor="#ec79b3"/><stop offset=".35" stopColor="#d86fa4"/><stop offset=".46" stopColor="#bd608f"/><stop offset=".57" stopColor="#9a4e74"/><stop offset=".68" stopColor="#6e3853"/><stop offset=".8" stopColor="#3b1e2d"/><stop offset=".9" stopColor="#010001"/><stop offset=".91" stopColor="#000"/>
              </linearGradient>
            </defs>
            <text className="dk-cls-6" transform="translate(409.26 106.94)"><tspan className="dk-cls-11" x="0" y="0">K</tspan><tspan className="dk-cls-3" x="37.69" y="0">O</tspan><tspan className="dk-cls-2" x="77.81" y="0">D</tspan><tspan className="dk-cls-5" x="116.64" y="0">A</tspan><tspan x="154.66" y="0">I</tspan><tspan className="dk-cls-14" x="176.25" y="0">R</tspan><tspan className="dk-cls-1" x="215.03" y="0">A</tspan><tspan x="266.97" y="0">祭公式サイトは</tspan><tspan x="187.49" y="52">こちらから</tspan></text>
            <g>
              <line className="dk-cls-9" y1="42.55" x2="490" y2="42.55"/>
              <line className="dk-cls-10" x1="34.44" y1="47.24" x2="566.72" y2="47.24"/>
            </g>
            <line className="dk-cls-7" x1="676.49" y1="179.03" x2="1353.49" y2="179.03"/>
            <line className="dk-cls-8" x1="739.97" y1="182.47" x2="1416.97" y2="182.47"/>
            <polyline className="dk-cls-4" points="175.9 46.49 165.75 199.07 420.1 122.6"/>
            <polyline className="dk-cls-4" points="1290.93 3.94 1301.08 156.53 1046.73 80.05"/>
            <polyline className="dk-cls-13" points="131.75 110.93 293.81 118.84 200.62 0"/>
            <polyline className="dk-cls-13" points="1270.28 88.14 1108.22 80.24 1201.41 199.07"/>
            <polyline className="dk-cls-12" points="1305.69 136.3 1180.87 130.21 1254.65 180.75"/>
          </svg>
        </a>
      </div>
      <Footer />
    </div>
  );
}
