// ==========================================
// 企画（団体）情報
// ==========================================
// 地図(/map)・団体紹介(/groups)・タイムテーブル(/timetable)・KODAnnai で共通に使う。
// 中身は data/kikaku.csv（Googleフォームの回答＋委員会記入列）→ `npm run import-data` → data/kikaku.json。
// このファイルは、そのデータを画面で使う形に取り出す関数だけを置く。

import { LOCATIONS } from "@/app/locations-server";
import type { Location } from "@/app/page";
import { getKikakuRow, type Days } from "@/lib/data";
import { EVENT_CATEGORIES, getCategoryStyle, type EventCategory } from "@/lib/categories";

// ==========================================
// 企画の一覧
// ==========================================

/** data/kikaku.csv に載っている企画か（施設ではないか） */
export function isKikaku(loc: Location): boolean {
  return !!getKikakuRow(loc.id);
}

/** 地図・団体紹介に出す企画の一覧（data/kikaku.csv の行の順） */
export const KIKAKU_LIST: Location[] = LOCATIONS.filter(isKikaku);

/** 実行委員会の企画か（待ち時間を出す対象） */
export function isCommitteeKikaku(loc: Location): boolean {
  return loc.organizer.includes("KODAIRA祭実行委員会");
}

// ==========================================
// ジャンル・エリア（フィルタ用）
// ==========================================

// ジャンル＝ data/kikaku.csv の「ジャンル」列（KODAnnai の category と同じ）。名前と色は lib/categories.ts。

export const GENRES = EVENT_CATEGORIES;
export type Genre = EventCategory;

export function getGenre(loc: Location): Genre {
  return (EVENT_CATEGORIES as readonly string[]).includes(loc.category)
    ? (loc.category as Genre)
    : "その他";
}

export const GENRE_COLORS: Record<Genre, string> = Object.fromEntries(
  EVENT_CATEGORIES.map((c) => [c, getCategoryStyle(c).color]),
) as Record<Genre, string>;

export const AREAS = ["屋外", "企画本館", "企画別館", "ちびっこ館", "その他"] as const;
export type Area = (typeof AREAS)[number];

const OUTDOOR_AREAS = [
  "正門通り",
  "正門前",
  "クラス模擬店ロータリー",
  "クラス模擬店ロード",
  "北サークルロード",
  "南サークルロード",
  "ファミリーエリア",
  "体育館ステージ",
  "体育館",
  "体育館と繋ぐ道",
];

export function getArea(loc: Location): Area {
  const p = loc.position;
  if (/^1\d{3}$/.test(p) || p.startsWith("企画本館")) return "企画本館";
  if (/^2\d{3}$/.test(p) || p.startsWith("企画別館")) return "企画別館";
  if (p.startsWith("ちびっこ館")) return "ちびっこ館";
  if (OUTDOOR_AREAS.includes(p)) return "屋外";
  return "その他";
}

/** 屋内か屋外か（「屋内/屋外」フィルタ用） */
export function isIndoor(loc: Location): boolean {
  const area = getArea(loc);
  if (area === "屋外") return loc.position.startsWith("体育館");
  if (area === "その他") return /講堂|館|教室/.test(loc.position);
  return true;
}

// ==========================================
// 表示用
// ==========================================

/** 企画名（KODAnnai 用の「(1日目のみ)」は付けない） */
export function getDisplayName(loc: Location): string {
  return getKikakuRow(loc.id)?.title || loc.name;
}

/** 団体名 */
export function getOrganizer(loc: Location): string {
  return getKikakuRow(loc.id)?.org || loc.organizer;
}

export function getDescription(loc: Location): string | null {
  return getKikakuRow(loc.id)?.desc || null;
}

export function getImageUrl(loc: Location): string | null {
  return getKikakuRow(loc.id)?.image || null;
}

/** 開催日（両日 / 1日目 / 2日目） */
export function getDays(loc: Location): Days {
  return getKikakuRow(loc.id)?.days ?? "両日";
}

/** その日に開いている企画か（day が null なら両日とも表示） */
export function isOpenOn(loc: Location, day: "day1" | "day2" | null): boolean {
  if (!day) return true;
  const d = getDays(loc);
  return d === "両日" || d === (day === "day1" ? "1日目" : "2日目");
}

export function getHours(loc: Location): string | null {
  return getKikakuRow(loc.id)?.hours || null;
}

export function getSnsUrl(loc: Location): string | null {
  return getKikakuRow(loc.id)?.sns || null;
}

/** 絞り込み用の条件（ジャンルとは別軸） */
export const CONDITIONS = ["受験生向け", "ちびっこ向け", "雨でも楽しめる"] as const;
export type Condition = (typeof CONDITIONS)[number];

export function getConditions(loc: Location): Condition[] {
  const c = getKikakuRow(loc.id)?.conditions ?? [];
  return CONDITIONS.filter((x) => c.includes(x));
}

/** 表示用の場所（「場所」列があればそれ。なければ場所区分に建物名を付ける） */
export function getPlaceLabel(loc: Location): string {
  const place = getKikakuRow(loc.id)?.place;
  if (place) return place;
  const p = loc.position;
  if (/^1\d{3}$/.test(p)) return `企画本館 ${p}`;
  if (/^2\d{3}$/.test(p)) return `企画別館 ${p}`;
  return p;
}

/** 滞在の目安 */
export function getStayLabel(id: string): string | null {
  return getKikakuRow(id)?.stay || null;
}

/** KODAnnai（経路案内）でこの企画を目的地にするURL */
export function getNavigateUrl(loc: Location): string {
  return `/?dest=${encodeURIComponent(loc.id)}`;
}
