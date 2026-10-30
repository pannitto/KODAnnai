// ==========================================
// カテゴリ（ジャンル）の定義 — 名前と色はここだけで決める
// ==========================================
// app/locations-server.tsx の LOCATIONS の category と同じ名前を使う。
// 使っている場所：
//   - KODAnnai の目的地のバッジ（components/location-selector.tsx）
//   - 企画マップの色分けと凡例、団体紹介の絞り込み、企画の詳細（lib/kikaku.ts 経由）
//
// カテゴリを増やすときは LOCATIONS とここの両方に書く。
// badge の Tailwind クラスは省略せずにそのまま書くこと（Tailwind が文字列から探すため）。

export type CategoryStyle = {
  /** 地図のピン・凡例などに使う色 */
  color: string;
  /** KODAnnai の目的地バッジの Tailwind クラス */
  badge: string;
};

/** 企画のカテゴリ（＝団体紹介・マップの「ジャンル」）。この順番で絞り込みに並ぶ */
export const EVENT_CATEGORIES = [
  "クラス模擬店",
  "サークル飲食模擬店",
  "販売・配布",
  "展示",
  "参加・体験",
  "講演",
  "パフォーマンス",
  "音楽",
  "ダンス",
  "ステージ・フィールド",
  "休憩所",
  "その他",
] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  // ---- 企画 ----
  クラス模擬店: { color: "#ea580c", badge: "bg-orange-100 text-orange-900" },
  サークル飲食模擬店: { color: "#b45309", badge: "bg-amber-200 text-amber-900" },
  "販売・配布": { color: "#65a30d", badge: "bg-lime-100 text-lime-900" },
  展示: { color: "#059669", badge: "bg-emerald-100 text-emerald-900" },
  "参加・体験": { color: "#0891b2", badge: "bg-cyan-100 text-cyan-900" },
  講演: { color: "#4f46e5", badge: "bg-indigo-100 text-indigo-900" },
  パフォーマンス: { color: "#dc2626", badge: "bg-red-100 text-red-900" },
  音楽: { color: "#db2777", badge: "bg-pink-100 text-pink-900" },
  ダンス: { color: "#c026d3", badge: "bg-fuchsia-100 text-fuchsia-900" },
  "ステージ・フィールド": { color: "#7c3aed", badge: "bg-violet-100 text-violet-900" },
  休憩所: { color: "#0284c7", badge: "bg-sky-100 text-sky-900" },
  その他: { color: "#64748b", badge: "bg-neutral-100 text-neutral-900" },

  // ---- 施設（KODAnnai のバッジ用） ----
  飲料販売所: { color: "#0891b2", badge: "bg-cyan-100 text-cyan-900" },
  "今いるエリア/フロアから出発": { color: "#2563eb", badge: "bg-blue-100 text-blue-900" },
  飲食スペース: { color: "#ca8a04", badge: "bg-yellow-100 text-yellow-900" },
  ゴミステーション: { color: "#16a34a", badge: "bg-green-100 text-green-900" },
  男女トイレ: { color: "#9333ea", badge: "bg-purple-100 text-purple-900" },
  多目的トイレ: { color: "#0d9488", badge: "bg-teal-100 text-teal-900" },
  男子トイレ自動選択: { color: "#2563eb", badge: "bg-blue-200 text-blue-900" },
  女子トイレ自動選択: { color: "#db2777", badge: "bg-pink-200 text-pink-900" },
  ゴミステーション自動選択: { color: "#16a34a", badge: "bg-green-200 text-green-900" },
  "飲食スペース・休憩所自動選択": { color: "#ca8a04", badge: "bg-yellow-200 text-yellow-900" },
  多目的トイレ自動選択: { color: "#0d9488", badge: "bg-teal-200 text-teal-900" },
};

const FALLBACK: CategoryStyle = { color: "#64748b", badge: "bg-gray-100 text-gray-800" };

export function getCategoryStyle(category: string): CategoryStyle {
  return CATEGORY_STYLES[category] ?? FALLBACK;
}

/** KODAnnai の目的地にカテゴリのバッジを出すもの（企画系＋飲料販売所） */
const BADGE_CATEGORIES = new Set<string>([
  ...EVENT_CATEGORIES.filter((c) => c !== "休憩所" && c !== "その他"),
  "飲料販売所",
]);

export function showsCategoryBadge(category: string): boolean {
  return BADGE_CATEGORIES.has(category);
}
