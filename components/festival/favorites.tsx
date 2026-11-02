"use client";

// 「いいね」した企画（このブラウザだけに保存。ログインなし）
// - 企画の詳細・団体紹介のカードのハートで付け外しする
//   （ステージ・フィールドは公演ごと。id は act:会場ID:演目 → lib/stage-acts.ts）
// - 企画マップでは丸や部屋にハートの印が付く（公演をいいねすると、その会場に付く）
// - タイムテーブルでは、いいねした企画・公演の会場が左（先頭）に来て、いいねした公演に♥が付く

import { useCallback, useEffect, useMemo, useState } from "react";
import { Heart } from "lucide-react";

const STORAGE_KEY = "kodaira-favorites";

let cache: string[] | null = null;
const listeners = new Set<() => void>();

function read(): string[] {
  if (cache) return cache;
  try {
    const v = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    cache = Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(list: string[]) {
  cache = list;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // 保存できない環境（プライベートモードなど）でも、開いている間は使える
  }
  listeners.forEach((l) => l());
}

/** いいねした企画の id。マウント前は空（サーバーで描いた HTML とずれないように） */
export function useFavorites() {
  const [list, setList] = useState<string[]>([]);
  useEffect(() => {
    const update = () => setList([...read()]);
    update();
    listeners.add(update);
    // 別のタブで変えたときも反映
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      cache = null;
      update();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(update);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  const favs = useMemo(() => new Set(list), [list]);
  const toggle = useCallback((id: string) => {
    const cur = read();
    write(cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
  }, []);
  return { favs, isFav: (id: string) => favs.has(id), toggle };
}

/** ハートのボタン（押すといいね／取り消し） */
export function FavoriteButton({
  id,
  className = "",
  size = "md",
}: {
  id: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const { isFav, toggle } = useFavorites();
  const on = isFav(id);
  const box = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const icon = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? "いいねを取り消す" : "いいねする"}
      title={on ? "いいねを取り消す" : "いいねする"}
      onClick={(e) => {
        e.stopPropagation();
        toggle(id);
      }}
      className={`flex flex-shrink-0 items-center justify-center rounded-full border transition-colors ${box} ${
        on
          ? "border-pink-500 bg-pink-500 text-white"
          : "border-border bg-card text-muted-foreground hover:text-pink-500"
      } ${className}`}
    >
      <Heart className={icon} fill={on ? "currentColor" : "none"} />
    </button>
  );
}

/** 地図（SVG）に付けるハートの印 */
export function FavoriteMark({ x, y, k = 1 }: { x: number; y: number; k?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${k})`} pointerEvents="none">
      <circle r={3.4} fill="#ec4899" stroke="white" strokeWidth={0.7} />
      <text textAnchor="middle" y={1.6} fontSize={4.4} fill="white" fontFamily="sans-serif">
        ♥
      </text>
    </g>
  );
}
