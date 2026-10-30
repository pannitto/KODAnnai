// ==========================================
// 企画検索
// ==========================================
// components/location-selector.tsx（経路案内の検索）と同じ考え方：
// 企画名・団体名・カテゴリ・場所・keywords を、カタカナ→ひらがなに揃えて部分一致。
// 団体紹介ページ用に、紹介文・条件（受験生向けなど）、
// タイムテーブルの演目名も検索対象に足している。

import type { Location } from "@/app/page";
import { getConditions, getGenre, getPlaceLabel } from "@/lib/kikaku";
import { getKikakuRow } from "@/lib/data";
import { getStagesForLocation } from "@/lib/timetable";

export function kanaToHira(str: string): string {
  return str.replace(/[ァ-ヶ]/g, (match) =>
    String.fromCharCode(match.charCodeAt(0) - 0x60),
  );
}

export function normalize(str: string): string {
  // 全角英数を半角に、カタカナをひらがなに、小文字に
  const half = str.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - 0xfee0),
  );
  return kanaToHira(half.toLowerCase()).replace(/\s+/g, "");
}

/** 一致度（0 = ヒットなし）。経路案内の検索と同じ重み付け */
export function scoreKikaku(loc: Location, rawTerm: string): number {
  const term = normalize(rawTerm);
  if (!term) return 1;
  const has = (s: string | undefined) => !!s && normalize(s).includes(term);

  const row = getKikakuRow(loc.id);
  const actNames = getStagesForLocation(loc.id).flatMap((stage) => [
    stage.stageName,
    ...stage.day1.map((e) => e.act),
    ...stage.day2.map((e) => e.act),
  ]);

  let score = 0;
  if (has(loc.name) || has(row?.title)) score = Math.max(score, 1);
  if (has(loc.organizer) || has(row?.org)) score = Math.max(score, 0.9);
  if (loc.keywords.some(has)) score = Math.max(score, 0.8);
  if (actNames.some(has)) score = Math.max(score, 0.75);
  if (has(loc.category) || has(getGenre(loc)) || getConditions(loc).some(has))
    score = Math.max(score, 0.7);
  if (has(loc.position) || has(getPlaceLabel(loc)))
    score = Math.max(score, 0.6);
  if (has(row?.desc)) score = Math.max(score, 0.5);
  return score;
}

/** 検索語でしぼり込み、一致度の高い順（同点は元の並び順）に返す */
export function searchKikaku(list: Location[], term: string): Location[] {
  if (!normalize(term)) return list;
  return list
    .map((loc, index) => ({ loc, index, score: scoreKikaku(loc, term) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((r) => r.loc);
}
