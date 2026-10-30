// ==========================================
// 待ち時間（委員会企画）— 画面とAPIで共通の定義
// ==========================================

export const WAIT_LEVELS = ["5", "15", "30", "60", "closed"] as const;
export type WaitLevel = (typeof WAIT_LEVELS)[number];

export type WaitEntry = {
  level: WaitLevel;
  /** ISO 8601 */
  updatedAt: string;
};

export type WaitMap = Record<string, WaitEntry>;

export const WAIT_LEVEL_INFO: Record<
  WaitLevel,
  { short: string; label: string; color: string }
> = {
  "5": { short: "〜5分", label: "5分以内に入場可能", color: "#15803d" },
  "15": { short: "〜15分", label: "15分以内に入場可能", color: "#ca8a04" },
  "30": { short: "〜30分", label: "30分以内に入場可能", color: "#ea580c" },
  "60": { short: "〜60分", label: "1時間以内に入場可能", color: "#dc2626" },
  closed: { short: "受付終了", label: "現在入場できません", color: "#7e22ce" },
};

/** これより古い情報は「更新なし」として扱う（分） */
export const WAIT_STALE_MINUTES = 90;

export function isWaitLevel(v: unknown): v is WaitLevel {
  return typeof v === "string" && (WAIT_LEVELS as readonly string[]).includes(v);
}

/** 古すぎない待ち時間だけを返す */
export function getFreshWait(
  waits: WaitMap,
  id: string,
  now: Date,
): WaitEntry | null {
  const entry = waits[id];
  if (!entry) return null;
  const ageMin = (now.getTime() - new Date(entry.updatedAt).getTime()) / 60000;
  if (ageMin > WAIT_STALE_MINUTES) return null;
  return entry;
}

export function formatAgo(iso: string, now: Date): string {
  const min = Math.max(
    0,
    Math.round((now.getTime() - new Date(iso).getTime()) / 60000),
  );
  if (min < 1) return "たった今更新";
  if (min < 60) return `${min}分前に更新`;
  return `${Math.floor(min / 60)}時間前に更新`;
}
