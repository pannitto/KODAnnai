// ==========================================
// タイムテーブルデータ
// ==========================================
// 文化祭の開催日を設定してください（YYYY-MM-DD形式）
export const FESTIVAL_DAY1 = "2026-05-02"; // 1日目の日付（テスト中：今日）
export const FESTIVAL_DAY2 = "2026-05-03"; // 2日目の日付

// 形式: { start: "HH:MM", end: "HH:MM", act: "出演者名" }
// ==========================================

export interface TimetableEntry {
  start: string; // "HH:MM"
  end: string; // "HH:MM"
  act: string;
}

export interface StageSchedule {
  stageId: string;
  stageName: string;
  /** GRAND_MAP SVG上のラベル中央X座標 */
  mapX: number;
  /** GRAND_MAP SVG上のラベル上端Y座標 */
  mapY: number;
  day1: TimetableEntry[];
  day2: TimetableEntry[];
}

export const TIMETABLE: StageSchedule[] = [
  {
    stageId: "gym",
    stageName: "体育館ステージ",
    mapX: 60,
    mapY: 154,
    day1: [
      // ↓ここに体育館ステージ1日目のタイムテーブルを入れてください
      // { start: "10:00", end: "10:30", act: "〇〇バンド" },
      { start: "10:00", end: "11:50", act: "大学対抗クイズバトル" },
      { start: "12:10", end: "13:40", act: "格付けチェック" },
      { start: "13:55", end: "14:15", act: "HITters ヲタ芸ステージ" },
      { start: "14:40", end: "16:00", act: "FSCステージライブ" },
    ],
    day2: [
      // ↓ここに体育館ステージ2日目のタイムテーブルを入れてください
      // { start: "10:00", end: "10:30", act: "〇〇バンド" },
      { start: "10:40", end: "11:30", act: "爆笑HIT-Uパレード" },
      { start: "11:40", end: "13:10", act: "クイズイントロドン" },
      { start: "13:25", end: "14:00", act: "ハルモニアライブ" },
      { start: "14:35", end: "15:30", act: "一橋軽音ステージ企画" },
      { start: "17:00", end: "19:00", act: "後夜祭" },
    ],
  },
  {
    stageId: "koda",
    stageName: "KODAステージ",
    mapX: 200,
    mapY: 210,
    day1: [
      // ↓ここにKODAステージ1日目のタイムテーブルを入れてください
      { start: "10:00", end: "11:20", act: "Opening Festival!" },
      { start: "11:40", end: "13:20", act: "一橋の歌うま王決定戦!!" },
      { start: "14:10", end: "15:50", act: "Spica Dance Stage" },
      { start: "16:30", end: "18:20", act: "中夜祭" },
    ],
    day2: [
      // ↓ここにKODAステージ2日目のタイムテーブルを入れてください
      { start: "10:10", end: "11:10", act: "CHIERISH PIRTY" },
      { start: "11:40", end: "13:20", act: "一橋の歌うま王決定戦!!" },
      { start: "13:35", end: "13:55", act: "Cepha Dance Stage" },
      { start: "14:13", end: "14:53", act: "アコースティックライブ" },
      { start: "15:05", end: "15:30", act: "TFCストリートライブ" },
    ],
  },
  {
    stageId: "field",
    stageName: "フィールド",
    mapX: 227,
    mapY: 366,
    day1: [
      // ↓ここにフィールド1日目のタイムテーブルを入れてください
      { start: "11:15", end: "11:35", act: "アンサンブルステージ" },
      { start: "11:50", end: "12:00", act: "書道パフォーマンス" },
      { start: "12:30", end: "13:00", act: "ジャグリングパフォーマンス" },
      { start: "13:15", end: "13:35", act: "Cepha Dance Stage" },
    ],
    day2: [
      // ↓ここにフィールド2日目のタイムテーブルを入れてください
      { start: "10:50", end: "11:20", act: "Papalinaフラステージ" },
      { start: "12:10", end: "12:40", act: "ジャグリングパフォーマンス" },
      { start: "13:00", end: "13:15", act: "少林寺拳法ステージ演武" },
    ],
  },
];

// ==========================================
// 現在 or 次の出演を返すユーティリティ
// ==========================================

export type CurrentOrNextAct =
  | { type: "current"; act: string; start: string; end: string }
  | { type: "next"; act: string; start: string }
  | null;

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** 今日の日付が何日目かを判定してスケジュールを返す */
function getTodaySchedule(stage: StageSchedule, now: Date): TimetableEntry[] {
  const today = now.toISOString().slice(0, 10);
  if (today === FESTIVAL_DAY1) return stage.day1;
  if (today === FESTIVAL_DAY2) return stage.day2;
  return []; // 開催日以外は何も表示しない
}

export function getCurrentOrNextAct(
  stage: StageSchedule,
  now: Date,
): CurrentOrNextAct {
  const schedule = getTodaySchedule(stage, now);
  if (schedule.length === 0) return null;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // 現在進行中のものを探す
  for (const entry of schedule) {
    const s = toMinutes(entry.start);
    const e = toMinutes(entry.end);
    if (currentMinutes >= s && currentMinutes < e) {
      return {
        type: "current",
        act: entry.act,
        start: entry.start,
        end: entry.end,
      };
    }
  }

  // 次のものを探す（開始時刻順にソート）
  const sorted = [...schedule].sort(
    (a, b) => toMinutes(a.start) - toMinutes(b.start),
  );
  for (const entry of sorted) {
    if (toMinutes(entry.start) > currentMinutes) {
      return { type: "next", act: entry.act, start: entry.start };
    }
  }

  return null;
}
