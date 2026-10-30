// ==========================================
// 企画・公演データ（data/*.json）の読み込み
// ==========================================
// data/kikaku.json と data/timetable.json は `npm run import-data` で
// data/kikaku.csv・data/timetable.csv（Googleフォームの回答スプレッドシート）から作る。
// JSON を直接書き換えず、CSV を直して取り込み直すこと。

import kikakuJson from "@/data/kikaku.json";
import timetableJson from "@/data/timetable.json";

export type Days = "両日" | "1日目" | "2日目";

/** 1行1企画（列の意味は scripts/import-data.mjs の KIKAKU_COLUMNS） */
export type KikakuRow = {
  /** 企画ID（委員会が決める。LOCATIONS の id として経路案内・地図でも使う） */
  id: string;
  /** 経路案内のノード番号（LOCATIONS の locid） */
  node: string;
  /** 場所区分（LOCATIONS の position。例: 1302、クラス模擬店ロータリー） */
  area: string;
  /** 表示用の場所（空なら場所区分から作る） */
  place: string;
  /** 検索キーワード */
  keywords: string[];
  title: string;
  org: string;
  /** ジャンル（lib/categories.ts の EVENT_CATEGORIES） */
  category: string;
  days: Days;
  hours: string;
  desc: string;
  /** 滞在の目安（例: 約20分、出入り自由） */
  stay: string;
  /** 受験生向け・雨でも楽しめる */
  conditions: string[];
  sns: string;
  /** 画像のURL（/kikaku/ID.jpg または https://…） */
  image: string;
};

/** 1行1公演 */
export type ActRow = {
  venueId: string;
  venueName: string;
  /** この会場の企画（詳細カードの「公演中／次の公演」に出す） */
  kikakuIds: string[];
  day: "day1" | "day2";
  start: string;
  end: string;
  act: string;
};

export const KIKAKU_ROWS = kikakuJson as KikakuRow[];
export const ACT_ROWS = timetableJson as ActRow[];

const byId = new Map(KIKAKU_ROWS.map((r) => [r.id, r]));
export function getKikakuRow(id: string): KikakuRow | undefined {
  return byId.get(id);
}
