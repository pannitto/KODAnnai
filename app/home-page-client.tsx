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
      <div className="w-full px-4 mt-6 mb-2 flex justify-center">
        <a
          href="https://kodairafes.com"
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full max-w-lg"
        >
          <img
            src="/KODAIRA祭公式サイトはこちら.svg"
            alt="KODAIRA祭公式サイトはこちらから"
            className="w-full h-auto"
          />
        </a>
      </div>
      <Footer />
    </div>
  );
}
