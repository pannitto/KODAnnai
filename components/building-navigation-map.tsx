"use client";

import React, { useState } from "react";
import { getNodeDisplayInfoByLocid } from "@/app/locations-server";

interface BuildingNavigationMapProps {
  buildingName: string;
  buildingFloor: string;
  mapImageUrl: string; // 建物地図SVGのURL (例: "/B1F.svg")
  startPointMarkers: Array<{
    id: string;
    nodeId: number;
    cx: number;
    cy: number;
    label: string;
    description: string;
  }>;
  onStartPointSelected: (
    nodeId: number,
    nodeName: string,
    nodeDescription: string,
  ) => void;
  selectedNodeId?: number | null;
  onClose: () => void;
}

export function BuildingNavigationMap({
  buildingName,
  buildingFloor,
  mapImageUrl,
  startPointMarkers,
  onStartPointSelected,
  selectedNodeId,
  onClose,
}: BuildingNavigationMapProps) {
  const [hoveredNodeId, setHoveredNodeId] = useState<number | null>(null);

  const handleMarkerClick = (marker: (typeof startPointMarkers)[0]) => {
    const nodeInfo = getNodeDisplayInfoByLocid(marker.nodeId.toString());
    const nodeName = nodeInfo?.name || marker.label;
    const nodeDescription = nodeInfo?.position || marker.description;

    onStartPointSelected(
      marker.nodeId,
      nodeName || marker.label,
      nodeDescription,
    );
  };

  return (
    <div className="w-full bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {buildingName} {buildingFloor}
          </h3>
          <p className="text-sm text-gray-600">出発地点を選択してください</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 text-2xl"
        >
          ✕
        </button>
      </div>

      <div className="w-full bg-gray-50 rounded-lg overflow-hidden border border-gray-200 relative">
        {/* 建物地図背景 */}
        <div
          className="w-full bg-contain bg-no-repeat bg-center"
          style={{
            backgroundImage: `url(${mapImageUrl})`,
            aspectRatio: "1 / 1.2", // 仮の比率、実際のSVGに合わせて調整
          }}
        >
          {/* SVGオーバーレイ */}
          <svg
            viewBox="0 0 295.32 413.16"
            className="w-full h-full"
            style={{ position: "absolute", top: 0, left: 0 }}
          >
            {/* インタラクティブなマーカー */}
            {startPointMarkers.map((marker) => {
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
                  {/* ホバーリング */}
                  {isHovered && (
                    <circle
                      cx={marker.cx}
                      cy={marker.cy}
                      r="12"
                      fill="none"
                      stroke="#ff6b6b"
                      strokeWidth="2"
                      opacity="0.7"
                    />
                  )}

                  {/* 選択リング */}
                  {isSelected && (
                    <circle
                      cx={marker.cx}
                      cy={marker.cy}
                      r="10"
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="2.5"
                    />
                  )}

                  {/* クリック領域 */}
                  <circle
                    cx={marker.cx}
                    cy={marker.cy}
                    r="8"
                    fill="transparent"
                  />
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* マーカー情報パネル */}
      {startPointMarkers.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3 max-h-40 overflow-y-auto">
          {startPointMarkers.map((marker) => {
            const isSelected = selectedNodeId === marker.nodeId;
            const isHovered = hoveredNodeId === marker.nodeId;

            return (
              <button
                key={marker.id}
                onClick={() => handleMarkerClick(marker)}
                onMouseEnter={() => setHoveredNodeId(marker.nodeId)}
                onMouseLeave={() => setHoveredNodeId(null)}
                className={`p-3 rounded-lg border-2 transition-all duration-200 text-left ${
                  isSelected
                    ? "border-blue-500 bg-blue-50"
                    : isHovered
                      ? "border-gray-400 bg-gray-100"
                      : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="font-medium text-sm text-gray-900">
                  {marker.label}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {marker.description}
                </div>
                {isSelected && (
                  <div className="mt-2 text-xs font-semibold text-blue-600">
                    ✓ 選択中
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
