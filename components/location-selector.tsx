"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, MapPin } from "lucide-react";
import type { Location } from "@/app/page";
import { useSearchParams } from "next/navigation";
import {
  LOCATIONS as SERVER_LOCATIONS,
  getLocationById as getLocationByIdFromServer,
  maleBathrooms as maleBathroomsFromServer,
  femaleBathrooms as femaleBathroomsFromServer,
  garbageStations as garbageStationsFromServer,
  restAreas as restAreasFromServer,
} from "@/app/locations-server";

const LOCATIONS: Location[] = SERVER_LOCATIONS;

const MAIN_EVENT_CATEGORIES = new Set([
  "展示",
  "参加・体験",
  "パフォーマンス",
  "講演",
  "ステージ・フィールド",
  "クラス模擬店",
  "サークル模擬店",
  "販売・配布",
  "飲料販売所",
]);

export const getLocationById = getLocationByIdFromServer;
export const maleBathrooms = maleBathroomsFromServer;
export const femaleBathrooms = femaleBathroomsFromServer;
export const garbageStations = garbageStationsFromServer;
export const restAreas = restAreasFromServer;

interface LocationSelectorProps {
  label: string;
  placeholder: string;
  value: Location | null;
  departure: boolean;
  hideLabel?: boolean;
  onChange: (location: Location | null) => void;
}

export function LocationSelector({
  label,
  placeholder,
  value,
  departure,
  hideLabel = false,
  onChange,
}: LocationSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredLocations, setFilteredLocations] = useState(LOCATIONS);
  const [highlight, setHighlight] = useState(false);
  const [inputHighlight, setInputHighlight] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [showInputBalloon, setShowInputBalloon] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const searchParams = useSearchParams();

  const isQr = searchParams.get("qr");
  const dep = searchParams.get("dep");
  const dest = searchParams.get("dest");

  function kanaToHira(str: string) {
    return str.replace(/[\u30a1-\u30f6]/g, function (match) {
      var chr = match.charCodeAt(0) - 0x60;
      return String.fromCharCode(chr);
    });
  }

  useEffect(() => {
    // Trigger both effects on mount
    if (isQr) {
      setHighlight(true);
    }

    const timer = setTimeout(() => {
      setHighlight(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const term = kanaToHira(searchTerm.toLowerCase());
    const hasSearchTerm = term.trim().length > 0;
    const specialLocids = ["m", "f", "g", "r", "u"];

    const filtered = LOCATIONS.filter((location) => {
      const isSpecial = specialLocids.includes(location.locid);
      const isDeparturePreset =
        location.category === "今いるエリア/フロアから出発";
      const isMatch =
        kanaToHira(location.name.toLowerCase()).includes(term) ||
        kanaToHira(location.category.toLowerCase()).includes(term) ||
        kanaToHira(location.organizer.toLowerCase()).includes(term) ||
        kanaToHira(location.position.toLowerCase()).includes(term) ||
        location.keywords.some((keyword) =>
          kanaToHira(keyword.toLowerCase()).includes(term),
        );

      // 出発地: 特殊IDは選択不可（出発地点プリセットは候補に含める）
      if (departure) return isMatch && !isSpecial;

      // 目的地: 未入力時のみ特殊IDを常に候補表示（かつ先頭固定）
      // 出発地点プリセットは目的地には出さない
      if (isDeparturePreset) return false;
      return hasSearchTerm ? isMatch : isSpecial || isMatch;
    })
      .map((location, index) => {
        let score = 0;

        if (location.name.toLowerCase().includes(term))
          score = Math.max(score, 1);
        if (location.organizer.toLowerCase().includes(term))
          score = Math.max(score, 0.9);
        if (
          location.keywords.some((keyword) =>
            keyword.toLowerCase().includes(term),
          )
        )
          score = Math.max(score, 0.8);
        if (location.category.toLowerCase().includes(term))
          score = Math.max(score, 0.7);
        if (location.position.toLowerCase().includes(term))
          score = Math.max(score, 0.6);

        if (
          // location.name.includes("トイレ") ||
          location.name.includes("階段前")
        ) {
          score -= 0.5; // deprioritize bathrooms and staircases
        }

        return { location, score, originalIndex: index };
      })
      .sort((a, b) => {
        if (departure) {
          const aIsPreset =
            a.location.category === "今いるエリア/フロアから出発";
          const bIsPreset =
            b.location.category === "今いるエリア/フロアから出発";
          if (aIsPreset !== bIsPreset) {
            return aIsPreset ? 1 : -1;
          }
        }

        if (!departure && !hasSearchTerm) {
          const aIsSpecial = specialLocids.includes(a.location.locid);
          const bIsSpecial = specialLocids.includes(b.location.locid);
          if (aIsSpecial !== bIsSpecial) {
            return aIsSpecial ? -1 : 1;
          }
        }

        if (b.score === a.score) {
          return a.originalIndex - b.originalIndex; // keep original order for ties
        }
        return b.score - a.score; // sort descending by score
      })
      .map((item) => item.location);

    setFilteredLocations(filtered);
  }, [searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputClick = () => {
    setIsOpen(!isOpen);
    setSearchTerm("");

    // Only trigger the blue border the first time it's opened
    if (!hasOpened) {
      setInputHighlight(true);
      setHasOpened(true);
      setShowInputBalloon(true);
      setTimeout(() => {
        setInputHighlight(false);
        setShowInputBalloon(false);
      }, 5000);
    }
  };

  const handleLocationSelect = (location: Location) => {
    onChange(location);
    setIsOpen(false);
    setSearchTerm("");
  };

  const getCategoryColor = (category: string) => {
    // 現在の app/locations-server.tsx のカテゴリ構成に合わせた配色
    // 方針: 目的の種類が直感で分かる色に統一
    const colors = {
      // メイン企画系
      展示: "bg-emerald-100 text-emerald-900",
      参加・体験: "bg-yellow-100 text-yellow-900",
      パフォーマンス: "bg-red-100 text-red-900",
      講演: "bg-indigo-100 text-indigo-900",
      ステージ・フィールド: "bg-violet-100 text-violet-900",
      クラス模擬店: "bg-orange-100 text-orange-900",
      サークル模擬店: "bg-orange-200 text-orange-900",
      販売・配布: "bg-lime-100 text-lime-900",
      飲料販売所: "bg-cyan-100 text-cyan-900",

      // 施設系
      その他: "bg-neutral-100 text-neutral-900",
      "今いるエリア/フロアから出発": "bg-blue-100 text-blue-900",
      休憩所: "bg-sky-100 text-sky-900",
      飲食スペース: "bg-yellow-100 text-yellow-900",
      ゴミステーション: "bg-green-100 text-green-900",

      // トイレ系
      男女トイレ: "bg-purple-100 text-purple-900",
      多目的トイレ: "bg-teal-100 text-teal-900",

      // 自動選択系（少し濃くして識別）
      男子トイレ自動選択: "bg-blue-200 text-blue-900",
      女子トイレ自動選択: "bg-pink-200 text-pink-900",
      ゴミステーション自動選択: "bg-green-200 text-green-900",
      飲食スペース・休憩所自動選択: "bg-yellow-200 text-yellow-900",
      多目的トイレ自動選択: "bg-teal-200 text-teal-900",
    };
    return (
      colors[category as keyof typeof colors] || "bg-gray-100 text-gray-800"
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {!hideLabel && (
        <label className="block text-sm font-medium text-muted-foreground mb-2">
          {label}
        </label>
      )}

      <div
        className={`w-full bg-input transition-all duration-300 rounded-lg ${
          highlight && ((departure && dep) || (!departure && dest))
            ? "border-2 border-blue-500"
            : "border border-2 border-border"
        } rounded-lg px-4 py-3 cursor-pointer flex items-center justify-between`}
        onClick={handleInputClick}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <MapPin className="h-5 w-5 text-muted-foreground shrink-0" />
          {value ? (
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="flex-1 min-w-0 font-medium text-base leading-tight overflow-hidden"
                  style={{
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {value.name}
                </div>
                {!departure && MAIN_EVENT_CATEGORIES.has(value.category) && (
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(value.category)}`}
                  >
                    {value.category}
                  </span>
                )}
              </div>
              <div className="text-sm text-muted-foreground truncate">
                {value.position +
                  (value.organizer ? `, ${value.organizer}` : "")}
              </div>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </div>
        <ChevronDown
          className={`h-5 w-5 text-muted-foreground transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />

        {highlight &&
          (departure && dep ? (
            <div className="absolute -bottom-12 right-0 mt-0 z-10 bg-blue-500 text-white rounded-lg py-2 px-3 shadow-lg animate-fade-in-out">
              出発地点が自動入力されました
              <div className="absolute top-0 left-4 w-2 h-2 bg-blue-500 rotate-45 -translate-y-1" />
            </div>
          ) : (
            !departure &&
            dest && (
              <div className="absolute -bottom-12 right-0 mt-0 z-10 bg-blue-500 text-white rounded-lg py-2 px-3 shadow-lg animate-fade-in-out">
                目的地が自動入力されました
                <div className="absolute top-0 left-4 w-2 h-2 bg-blue-500 rotate-45 -translate-y-1" />
              </div>
            )
          ))}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-2 border-border rounded-lg shadow-lg z-50">
          <div className="relative w-full">
            {showInputBalloon && (
              <div className="absolute w-48 -top-16 left-1/2 -translate-x-1/2 z-50 bg-blue-500 text-white rounded-lg py-2 px-3 shadow-lg animate-fade-in-out pointer-events-none">
                {departure
                  ? "キーワードで出発地点を検索できます"
                  : "キーワードで目的地を検索できます"}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-3 h-3 bg-blue-500 rotate-45" />
              </div>
            )}

            <input
              ref={inputRef}
              name={departure ? "ここに入力して検索" : "ここに入力して検索"}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder=""
              autoFocus
              className={`w-full bg-input rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-300 ${
                inputHighlight
                  ? "border-4 border-blue-500"
                  : "border border-border"
              }`}
            />

            {!searchTerm && (
              <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none select-none text-transparent sparkle-placeholder">
                {departure ? "ここに入力して検索…" : "ここに入力して検索…"}
              </span>
            )}

            <style jsx>{`
              .sparkle-placeholder {
                background: linear-gradient(
                  90deg,
                  #5481caff,
                  #cb3881ff,
                  #bc6a2fff,
                  #5481caff
                ); /* looped start/end color for seamless animation */
                background-size: 300% auto;
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                animation: sparkleFlow 7.5s linear infinite;
              }

              @keyframes sparkleFlow {
                0% {
                  background-position: 0% 0%;
                }
                100% {
                  background-position: 300% 0%;
                }
              }
            `}</style>
          </div>

          <div className="max-h-[38vh] overflow-y-auto top-full">
            {filteredLocations.length > 0 ? (
              filteredLocations.map((location) => (
                <div
                  key={location.id}
                  className="px-3 py-2 hover:bg-accent hover:text-accent-foreground cursor-pointer border-b border-border last:border-b-0"
                  onClick={() => handleLocationSelect(location)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-[15px]">
                        {location.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {[location.position, location.organizer]
                          .filter(Boolean)
                          .join("・")}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(
                        location.category,
                      )}`}
                    >
                      {location.category}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center">
                場所が見つかりません…
                <br />
                <span className="text-sm text-muted-foreground">
                  ひらがなではヒットしない場合があります
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
