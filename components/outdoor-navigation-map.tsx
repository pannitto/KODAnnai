"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useTheme } from "next-themes";
import {
  OUTDOOR_START_POINT_MARKERS,
  BEKKAN_START_POINT_MARKERS,
  MAIN_BUILDING_START_POINT_MARKERS,
  CHIBIKKO_START_POINT_MARKERS,
} from "@/app/locations-server";
import { getNodeDisplayInfoByLocid } from "@/app/locations-server";
import { StageNowLabels } from "@/components/festival/stage-now-labels";
import { BuildingBadge } from "@/components/festival/building-badge";
import { OUTDOOR_BUILDINGS } from "@/lib/map-spots";

// 屋外MAPの建物の「館内MAP ›」の位置（企画マップと共通）
const BADGE = Object.fromEntries(
  OUTDOOR_BUILDINGS.map((b) => [b.map, b.badge]),
);
// この画面は拡大しないので、企画マップより少し大きめの札にする
const BADGE_SIZE = { w: 36, h: 9.6, fontSize: 4.1 };
// 建物の枠：ふだんは薄い点線、カーソルを合わせると濃くする（タップで館内の地図へ行けることを示す）
const buildingFill = (hovered: boolean) =>
  hovered ? "rgba(37,99,235,0.18)" : "rgba(37,99,235,0.06)";
const buildingStroke = (hovered: boolean) => ({
  stroke: "#2563eb",
  strokeWidth: hovered ? 1 : 0.6,
  strokeDasharray: hovered ? undefined : "2 1.5",
  strokeOpacity: hovered ? 1 : 0.7,
});

interface OutdoorNavigationMapProps {
  onStartPointSelected: (
    nodeId: number,
    nodeName: string,
    nodeDescription: string,
  ) => void;
  selectedNodeId?: number | null;
}

interface PendingMarker {
  nodeId: number;
  nodeName: string;
  nodeDescription: string;
}

export function OutdoorNavigationMap({
  onStartPointSelected,
  selectedNodeId,
}: OutdoorNavigationMapProps) {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<number | null>(null);
  const [isMainBuildingHovered, setIsMainBuildingHovered] = useState(false);
  const [isBekkanHovered, setIsBekkanHovered] = useState(false);
  const [isChibikkoHovered, setIsChibikkoHovered] = useState(false);
  const [showMainBuildingMap, setShowMainBuildingMap] = useState(false);
  const [showBekkanMap, setShowBekkanMap] = useState(false);
  const [showChibikkoMap, setShowChibikkoMap] = useState(false);
  const [pendingMarker, setPendingMarker] = useState<PendingMarker | null>(
    null,
  );
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);
  // 屋外MAPは企画マップと同じ画像。オレンジの丸はこの画面で上から描く
  // （画像を差し替えたら ?v= の日付も変える）
  const mapImageUrl =
    resolvedTheme === "dark"
      ? "/GRAND_MAP_kikaku_dark.svg?v=20261102-1"
      : "/GRAND_MAP_kikaku.svg?v=20261102-1";

  const handleMarkerClick = (
    marker: (typeof OUTDOOR_START_POINT_MARKERS)[0],
  ) => {
    const nodeInfo = getNodeDisplayInfoByLocid(marker.nodeId.toString());
    const nodeName = nodeInfo?.name || marker.label;
    const baseDescription = nodeInfo?.position || marker.description;
    const nodeDescription = baseDescription;

    setPendingMarker({
      nodeId: marker.nodeId,
      nodeName: nodeName || marker.label,
      nodeDescription,
    });
  };

  const handleConfirm = () => {
    if (pendingMarker) {
      onStartPointSelected(
        pendingMarker.nodeId,
        pendingMarker.nodeName,
        pendingMarker.nodeDescription,
      );
    }
    setPendingMarker(null);
  };

  const handleCancel = () => {
    setPendingMarker(null);
  };

  const handleMainBuildingTap = () => {
    setPendingMarker(null);
    setShowMainBuildingMap(true);
  };

  const handleBekkanTap = () => {
    setPendingMarker(null);
    setShowBekkanMap(true);
  };

  const handleChibikkoTap = () => {
    setPendingMarker(null);
    setShowChibikkoMap(true);
  };

  if (showMainBuildingMap) {
    return (
      <div className="w-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            地図から現在地を選択してください
          </h3>
          <button
            type="button"
            onClick={() => setShowMainBuildingMap(false)}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            ← 屋外MAPへ戻る
          </button>
        </div>

        {/* 確認ダイアログ */}
        {pendingMarker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl mx-6 p-6 w-full max-w-xs">
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-1">
                出発地点の確認
              </p>
              <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 text-center mb-2">
                {pendingMarker.nodeName}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-300 text-center mb-6">
                ここを出発地点にしますか？
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleConfirm}
                  className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-semibold text-base active:bg-orange-600"
                >
                  はい
                </button>
                <button
                  onClick={handleCancel}
                  className="flex-1 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-semibold text-base active:bg-gray-100 dark:active:bg-gray-700"
                >
                  いいえ
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="w-full bg-gray-50 dark:bg-black rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 relative">
          {/* SVG背景画像 */}
          <div ref={svgContainerRef} className="relative">
            <Image
              src={
                resolvedTheme === "dark"
                  ? "/Main_building_MAP_fornavigate_dark.svg?v=20260429-1"
                  : "/Main_building_MAP_fornavigate.svg?v=20260425-1"
              }
              alt="企画本館マップ"
              width={295}
              height={413}
              className="w-full h-auto block"
            />

            {/* インタラクティブなマーカーオーバーレイ */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 295.32 413.16"
              xmlns="http://www.w3.org/2000/svg"
            >
              {MAIN_BUILDING_START_POINT_MARKERS.map((marker) => {
                const isSelected = selectedNodeId === marker.nodeId;
                const isHovered = hoveredNodeId === marker.nodeId;

                return (
                  <g
                    key={marker.id}
                    onClick={() => handleMarkerClick(marker)}
                    onMouseEnter={() => setHoveredNodeId(marker.nodeId)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    className="cursor-pointer pointer-events-auto"
                  >
                    {/* 外側のハイライトリング（ホバー時に表示） */}
                    {isHovered && (
                      <circle
                        cx={marker.cx}
                        cy={marker.cy}
                        r="12"
                        fill="none"
                        stroke="#ff6b6b"
                        strokeWidth="2"
                        opacity="0.8"
                      />
                    )}

                    {/* 選択中のリング */}
                    {isSelected && (
                      <circle
                        cx={marker.cx}
                        cy={marker.cy}
                        r="10"
                        fill="none"
                        stroke="#4ade80"
                        strokeWidth="3"
                        opacity="0.9"
                      />
                    )}

                    {/* インタラクティブエリア（透明な大きな円） */}
                    <circle
                      cx={marker.cx}
                      cy={marker.cy}
                      r="15"
                      fill="transparent"
                      style={{
                        cursor: "pointer",
                      }}
                    />
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>
    );
  }

  if (showBekkanMap) {
    return (
      <div className="w-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            地図から現在地を選択してください
          </h3>
          <button
            type="button"
            onClick={() => setShowBekkanMap(false)}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            ← 屋外MAPへ戻る
          </button>
        </div>

        {/* 確認ダイアログ */}
        {pendingMarker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl mx-6 p-6 w-full max-w-xs">
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-1">
                出発地点の確認
              </p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100 text-center mb-6">
                {pendingMarker.nodeDescription}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 text-center mb-6">
                ここを出発地点にしますか？
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleConfirm}
                  className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-semibold text-base active:bg-orange-600"
                >
                  はい
                </button>
                <button
                  onClick={handleCancel}
                  className="flex-1 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-semibold text-base active:bg-gray-100 dark:active:bg-gray-700"
                >
                  いいえ
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="w-full bg-gray-50 dark:bg-black rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 relative">
          {/* SVG背景画像 */}
          <div ref={svgContainerRef} className="relative">
            <Image
              src={
                resolvedTheme === "dark"
                  ? "/Bekkan_MAP_fornavigate_dark.svg?v=20260428-1"
                  : "/Bekkan_MAP_fornavigate.svg?v=20260424-2"
              }
              alt="企画別館マップ"
              width={295}
              height={413}
              className="w-full h-auto block"
            />

            {/* インタラクティブなマーカーオーバーレイ */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 295.32 413.16"
              xmlns="http://www.w3.org/2000/svg"
            >
              {BEKKAN_START_POINT_MARKERS.map((marker) => {
                const isSelected = selectedNodeId === marker.nodeId;
                const isHovered = hoveredNodeId === marker.nodeId;

                return (
                  <g
                    key={marker.id}
                    onClick={() => handleMarkerClick(marker)}
                    onMouseEnter={() => setHoveredNodeId(marker.nodeId)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    className="cursor-pointer pointer-events-auto"
                  >
                    {/* 外側のハイライトリング（ホバー時に表示） */}
                    {isHovered && (
                      <circle
                        cx={marker.cx}
                        cy={marker.cy}
                        r="12"
                        fill="none"
                        stroke="#ff6b6b"
                        strokeWidth="2"
                        opacity="0.8"
                      />
                    )}

                    {/* 選択中のリング */}
                    {isSelected && (
                      <circle
                        cx={marker.cx}
                        cy={marker.cy}
                        r="10"
                        fill="none"
                        stroke="#4ade80"
                        strokeWidth="3"
                        opacity="0.9"
                      />
                    )}

                    {/* インタラクティブエリア（透明な大きな円） */}
                    <circle
                      cx={marker.cx}
                      cy={marker.cy}
                      r="15"
                      fill="transparent"
                      style={{
                        cursor: "pointer",
                      }}
                    />
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>
    );
  }

  if (showChibikkoMap) {
    return (
      <div className="w-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            地図から現在地を選択してください
          </h3>
          <button
            type="button"
            onClick={() => setShowChibikkoMap(false)}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            ← 屋外MAPへ戻る
          </button>
        </div>

        {/* 確認ダイアログ */}
        {pendingMarker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl mx-6 p-6 w-full max-w-xs">
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-1">
                出発地点の確認
              </p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100 text-center mb-6">
                {pendingMarker.nodeDescription}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 text-center mb-6">
                ここを出発地点にしますか？
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleConfirm}
                  className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-semibold text-base active:bg-orange-600"
                >
                  はい
                </button>
                <button
                  onClick={handleCancel}
                  className="flex-1 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-semibold text-base active:bg-gray-100 dark:active:bg-gray-700"
                >
                  いいえ
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="w-full bg-gray-50 dark:bg-black rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 relative">
          <div ref={svgContainerRef} className="relative">
            <Image
              src={
                resolvedTheme === "dark"
                  ? "/Chibikko_MAP_fornavigate_dark.svg?v=20260428-1"
                  : "/Chibikko_MAP_fornavigate.svg?v=20260425-1"
              }
              alt="企画ちびっこ館マップ"
              width={295}
              height={413}
              className="w-full h-auto block"
            />

            {/* インタラクティブなマーカーオーバーレイ */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 295.32 413.16"
              xmlns="http://www.w3.org/2000/svg"
            >
              {CHIBIKKO_START_POINT_MARKERS.map((marker) => {
                const isSelected = selectedNodeId === marker.nodeId;
                const isHovered = hoveredNodeId === marker.nodeId;

                return (
                  <g
                    key={marker.id}
                    onClick={() => handleMarkerClick(marker)}
                    onMouseEnter={() => setHoveredNodeId(marker.nodeId)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    className="cursor-pointer pointer-events-auto"
                  >
                    {isHovered && (
                      <circle
                        cx={marker.cx}
                        cy={marker.cy}
                        r="12"
                        fill="none"
                        stroke="#ff6b6b"
                        strokeWidth="2"
                        opacity="0.8"
                      />
                    )}
                    {isSelected && (
                      <circle
                        cx={marker.cx}
                        cy={marker.cy}
                        r="10"
                        fill="none"
                        stroke="#4ade80"
                        strokeWidth="3"
                        opacity="0.9"
                      />
                    )}
                    <circle
                      cx={marker.cx}
                      cy={marker.cy}
                      r="15"
                      fill="transparent"
                      style={{ cursor: "pointer" }}
                    />
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          地図から現在地を選択してください
        </h3>
      </div>

      {/* 確認ダイアログ */}
      {pendingMarker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl mx-6 p-6 w-full max-w-xs">
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-1">
              出発地点の確認
            </p>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100 text-center mb-6">
              {pendingMarker.nodeDescription}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300 text-center mb-6">
              ここを出発地点にしますか？
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleConfirm}
                className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-semibold text-base active:bg-orange-600"
              >
                はい
              </button>
              <button
                onClick={handleCancel}
                className="flex-1 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-semibold text-base active:bg-gray-100 dark:active:bg-gray-700"
              >
                いいえ
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full bg-gray-50 dark:bg-black rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 relative">
        {/* SVG背景画像 */}
        <div
          ref={svgContainerRef}
          className="w-full bg-contain bg-no-repeat bg-center"
          style={{
            backgroundImage: `url(${mapImageUrl})`,
            aspectRatio: "295.32 / 413.16",
          }}
        >
          {/* SVGオーバーレイ - マーカーと相互作用 */}
          <svg
            viewBox="0 0 295.32 413.16"
            className="w-full h-full"
            style={{ position: "absolute", top: 0, left: 0 }}
          >
            {/* 企画本館エリア（本館+飲食スペース） */}
            <g
              onClick={handleMainBuildingTap}
              onMouseEnter={() => setIsMainBuildingHovered(true)}
              onMouseLeave={() => setIsMainBuildingHovered(false)}
              className="cursor-pointer"
            >
              <path
                d="M242.25,239.53v61c-18.98.1-42.34.37-61.32.47,0-8.18,0-13.98,0-22.16-2.01-.07-5.44.07-7.45,0,0-4.65,0-10.29,0-14.94,2.01-.06,5.44.06,7.45,0,0-8.14,0-15.68,0-23.82,18.98,0,42.34-.55,61.32-.55Z"
                fill={buildingFill(isMainBuildingHovered)}
                {...buildingStroke(isMainBuildingHovered)}
              />
              <path
                d="M206.32,284.47c7.5,0,15,0,22.51,0v-7.43h-2.7c0-4.46.02-8.92.03-13.38h2.67v-7.15c-7.41,0-14.83,0-22.24.01-.09,9.31-.17,18.63-.26,27.94Z"
                fill={
                  isMainBuildingHovered ? "rgba(22,163,74,0.20)" : "transparent"
                }
                stroke={isMainBuildingHovered ? "#16a34a" : "transparent"}
                strokeWidth="1"
              />
              <BuildingBadge
                {...BADGE.main}
                {...BADGE_SIZE}
                dark={dark}
                active={isMainBuildingHovered}
              />
            </g>

            {/* 企画別館エリア */}
            <g
              onClick={handleBekkanTap}
              onMouseEnter={() => setIsBekkanHovered(true)}
              onMouseLeave={() => setIsBekkanHovered(false)}
              className="cursor-pointer"
            >
              <polygon
                points="123.85 216.76 153.21 216.76 153.21 188.76 162.24 188.76 162.24 167.01 112.13 167.01 112.13 188.26 123.85 188.26 123.85 216.76"
                fill={buildingFill(isBekkanHovered)}
                {...buildingStroke(isBekkanHovered)}
              />
              <BuildingBadge
                {...BADGE.bekkan}
                {...BADGE_SIZE}
                dark={dark}
                active={isBekkanHovered}
              />
            </g>

            {/* ちびっこ館エリア */}
            <g
              onClick={handleChibikkoTap}
              onMouseEnter={() => setIsChibikkoHovered(true)}
              onMouseLeave={() => setIsChibikkoHovered(false)}
              className="cursor-pointer"
            >
              <path
                d="M223.26,341.22c.67,2.41,1.35,4.82,2.02,7.23,2.14-.42,4.28-.85,6.42-1.27,3.9,3.03,7.8,6.06,11.7,9.09,11.27-.13,22.54-.25,33.81-.38.03-16.47.07-32.93.10-49.4-5.86,0-11.72,0-17.58,0v9.31c-7.53-.23-15.06-.47-22.59-.70.56,2.2,1.43,6.89-.32,12.24-3.16,9.64-12.18,13.34-13.56,13.88Z"
                fill={buildingFill(isChibikkoHovered)}
                {...buildingStroke(isChibikkoHovered)}
              />
              <BuildingBadge
                {...BADGE.chibikko}
                {...BADGE_SIZE}
                dark={dark}
                active={isChibikkoHovered}
              />
            </g>

            {/* インタラクティブなマーカーオーバーレイ */}
            {OUTDOOR_START_POINT_MARKERS.map((marker) => {
              const isSelected = selectedNodeId === marker.nodeId;
              const isHovered = hoveredNodeId === marker.nodeId;

              return (
                <g
                  key={marker.id}
                  onClick={() => handleMarkerClick(marker)}
                  onMouseEnter={() => setHoveredNodeId(marker.nodeId)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  className="cursor-pointer"
                >
                  {/* 外側のハイライトリング（ホバー時に表示） */}
                  {isHovered && (
                    <circle
                      cx={marker.cx}
                      cy={marker.cy}
                      r="12"
                      fill="none"
                      stroke="#ff6b6b"
                      strokeWidth="2"
                      opacity="0.7"
                      className="transition-all duration-200"
                    />
                  )}

                  {/* 選択状態のリング */}
                  {isSelected && (
                    <circle
                      cx={marker.cx}
                      cy={marker.cy}
                      r="10"
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="2.5"
                      className="transition-all duration-200"
                    />
                  )}

                  {/* オレンジの丸（以前は地図画像に描いてあったものを、ここで描く） */}
                  <circle
                    cx={marker.cx}
                    cy={marker.cy}
                    r="5"
                    fill="#f39800"
                    pointerEvents="none"
                  />

                  {/* 透明なクリック領域 */}
                  <circle
                    cx={marker.cx}
                    cy={marker.cy}
                    r="8"
                    fill="transparent"
                    className="hover:fill-blue-200 hover:fill-opacity-20 transition-all duration-200"
                  />
                </g>
              );
            })}

            {/* 雨天時注意書き（企画別館の上スペース） */}
            {(() => {
              const textColor =
                resolvedTheme === "dark" ? "#e0e0e0" : "#333333";
              const bgColor =
                resolvedTheme === "dark"
                  ? "rgba(40,40,40,0.85)"
                  : "rgba(255,255,255,0.85)";
              const lines = [
                "🌧️ 雨天時の注意",
                "KODAステージ企画→体育館ステージで開催",
                "体育館ステージ→本館1101教室で開催",
                "フィールド→中止",
                "となる場合があります。",
              ];
              const x = 152;
              const y = 108;
              const w = 50;
              const lineH = 5.5;
              const pad = 2;
              const totalH = lines.length * lineH + pad * 2;
              return (
                <g pointerEvents="none">
                  {lines.map((line, i) => (
                    <text
                      key={i}
                      x={x + w / 2}
                      y={y + pad + lineH * i + lineH * 0.75}
                      textAnchor="middle"
                      fontSize={i === 0 ? 5.5 : 4.8}
                      fontWeight={i === 0 ? "bold" : "normal"}
                      fill={textColor}
                      fontFamily="sans-serif"
                    >
                      {line}
                    </text>
                  ))}
                </g>
              );
            })()}

            {/* ステージの「公演中／次の公演」ラベル（企画マップと共通の部品） */}
            <StageNowLabels now={currentTime} />
          </svg>
        </div>
      </div>
    </div>
  );
}
