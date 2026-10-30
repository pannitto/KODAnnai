// ==========================================
// 当日の上書き情報（運営ページ /admin で入力 → /api/live → 各画面）
// ==========================================
// 企画データ（data/*.csv）を直さずに、当日の変更をすぐ反映するためのもの。
//   waits   … 委員会企画の待ち時間
//   acts    … ステージ公演の変更（中止・時間変更）
//   notice  … サイト上部のお知らせ（ステージ以外の企画の中止・変更、雨天時の案内など）

import type { WaitMap } from "@/lib/wait-times";
import type { ActOverride } from "@/lib/timetable";

export type Notice = { text: string; updatedAt: string };

export type LiveData = {
  waits: WaitMap;
  acts: Record<string, ActOverride>;
  notice: Notice | null;
};

export const EMPTY_LIVE: LiveData = { waits: {}, acts: {}, notice: null };

