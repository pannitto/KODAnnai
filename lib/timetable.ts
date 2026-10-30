import { ACT_ROWS } from "@/lib/data";

// ==========================================
// タイムテーブルデータ
// ==========================================
// 文化祭の開催日を設定してください（YYYY-MM-DD形式）
export const FESTIVAL_DAY1 = "2026-10-31"; // 1日目の日付
export const FESTIVAL_DAY2 = "2026-11-01"; // 2日目の日付

// 公演の中身は data/timetable.csv で管理する（下の TIMETABLE を参照）
// ==========================================


export interface TimetableEntry {
  start: string; // "HH:MM"
  end: string; // "HH:MM"
  act: string;
}

export interface StageSchedule {
  stageId: string;
  stageName: string;
  /**
   * この会場に対応する企画の LOCATIONS id（app/locations-server.tsx）。
   * 地図・団体ページの詳細カードで「今の公演／次の公演」を出すのに使う。
   * 同じ部屋に複数の企画がある場合は複数書く。
   */
  locationIds?: string[];
  /** GRAND_MAP SVG上のラベル中央X座標（屋外MAPにラベルを出す会場だけ書く） */
  mapX?: number;
  /** GRAND_MAP SVG上のラベル上端Y座標（屋外MAPにラベルを出す会場だけ書く） */
  mapY?: number;
  day1: TimetableEntry[];
  day2: TimetableEntry[];
}

// 屋外MAP（KODAnnai の「地図から検索」）に「公演中／次」のラベルを出す会場と、その位置
// （GRAND_MAP の座標。ラベル中央X・上端Y）
const VENUE_MAP_LABELS: Record<string, { mapX: number; mapY: number }> = {
  gym: { mapX: 60, mapY: 154 },
  koda: { mapX: 200, mapY: 210 },
  field: { mapX: 227, mapY: 366 },
};

/**
 * 会場ごとのタイムテーブル。
 * 中身は data/timetable.csv（1行1公演）→ `npm run import-data` → data/timetable.json から作る。
 * 会場の並び順＝CSV で最初に出てきた順（タイムテーブルページの列の順）。
 */
export const TIMETABLE: StageSchedule[] = (() => {
  const venues = new Map<string, StageSchedule>();
  for (const r of ACT_ROWS) {
    let v = venues.get(r.venueId);
    if (!v) {
      v = {
        stageId: r.venueId,
        stageName: r.venueName,
        locationIds: [],
        ...VENUE_MAP_LABELS[r.venueId],
        day1: [],
        day2: [],
      };
      venues.set(r.venueId, v);
    }
    for (const id of r.kikakuIds) if (!v.locationIds!.includes(id)) v.locationIds!.push(id);
    v[r.day].push({ start: r.start, end: r.end, act: r.act });
  }
  for (const v of venues.values()) {
    v.day1.sort((a, b) => a.start.localeCompare(b.start));
    v.day2.sort((a, b) => a.start.localeCompare(b.start));
  }
  return [...venues.values()];
})();

// ==========================================
// 時刻ユーティリティ（端末のタイムゾーンに関係なく日本時間で判定）
// ==========================================

export type FestivalDay = "day1" | "day2";

export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

/** 日本時間の日付(YYYY-MM-DD)と、0時からの経過分 */
export function getJstParts(now: Date): { date: string; minutes: number } {
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return {
    date: jst.toISOString().slice(0, 10),
    minutes: jst.getUTCHours() * 60 + jst.getUTCMinutes(),
  };
}

/** 今日が何日目か（開催日以外は null） */
export function getFestivalDay(now: Date): FestivalDay | null {
  const { date } = getJstParts(now);
  if (date === FESTIVAL_DAY1) return "day1";
  if (date === FESTIVAL_DAY2) return "day2";
  return null;
}

// ==========================================
// 現在 or 次の出演を返すユーティリティ
// ==========================================

export type CurrentOrNextAct =
  | { type: "current"; act: string; start: string; end: string }
  | { type: "next"; act: string; start: string }
  | null;

/** 今日の日付が何日目かを判定してスケジュールを返す */
function getTodaySchedule(stage: StageSchedule, now: Date): TimetableEntry[] {
  const day = getFestivalDay(now);
  if (day === "day1") return stage.day1;
  if (day === "day2") return stage.day2;
  return []; // 開催日以外は何も表示しない
}

export function getCurrentOrNextAct(
  stage: StageSchedule,
  now: Date,
): CurrentOrNextAct {
  const schedule = getTodaySchedule(stage, now);
  if (schedule.length === 0) return null;

  const currentMinutes = getJstParts(now).minutes;

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

/** 企画(LOCATIONS id)に紐づく会場を返す */
export function getStagesForLocation(locationId: string): StageSchedule[] {
  return TIMETABLE.filter((stage) => stage.locationIds?.includes(locationId));
}

/** 企画の「公演中」と「次の公演」を両方返す（詳細カード用）。中止の公演は飛ばし、時間変更は反映する */
export function getActStatusForLocation(
  locationId: string,
  now: Date,
  acts: Record<string, ActOverride> = {},
): {
  stage: StageSchedule;
  current: EffectiveAct | null;
  next: EffectiveAct | null;
}[] {
  const minutes = getJstParts(now).minutes;
  const day = getFestivalDay(now);
  return getStagesForLocation(locationId).map((stage) => {
    const schedule = day
      ? applyActOverrides(stage.stageId, day, stage[day], acts).filter((e) => !e.canceled)
      : [];
    const current =
      schedule.find(
        (e) => minutes >= toMinutes(e.start) && minutes < toMinutes(e.end),
      ) ?? null;
    const next = schedule.find((e) => toMinutes(e.start) > minutes) ?? null;
    return { stage, current, next };
  });
}

/** 公演のある日の会場だけを返す（タイムテーブルページ用） */
export function getStagesForDay(day: FestivalDay): StageSchedule[] {
  return TIMETABLE.filter((stage) => stage[day].length > 0);
}

// ==========================================
// 当日の変更（運営ページ /admin → /api/live）を反映した公演
// ==========================================

/** 公演の変更。キーは actKey()（会場ID｜日｜もとの開始時刻） */
export type ActOverride = {
  canceled?: boolean;
  /** 変更後の時刻（変更がなければ書かない） */
  start?: string;
  end?: string;
  note?: string;
  updatedAt: string;
};

export function actKey(venueId: string, day: FestivalDay, originalStart: string): string {
  return `${venueId}|${day}|${originalStart}`;
}

/** 上書きを反映した公演（中止・時間変更の印つき） */
export type EffectiveAct = TimetableEntry & {
  originalStart: string;
  originalEnd: string;
  canceled: boolean;
  changed: boolean;
  note?: string;
};

export function applyActOverrides(
  venueId: string,
  day: FestivalDay,
  entries: TimetableEntry[],
  acts: Record<string, ActOverride>,
): EffectiveAct[] {
  return entries
    .map((e) => {
      const o = acts[actKey(venueId, day, e.start)];
      const start = o?.start || e.start;
      const end = o?.end || e.end;
      return {
        ...e,
        start,
        end,
        originalStart: e.start,
        originalEnd: e.end,
        canceled: !!o?.canceled,
        changed: start !== e.start || end !== e.end,
        note: o?.note,
      };
    })
    .sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
}
