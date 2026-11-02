// ==========================================
// ステージ・フィールドの公演（団体紹介に1公演ずつ並べる用）
// ==========================================
// 団体紹介では、ステージ・フィールドの「会場」（KODAステージ・体育館ステージ・フィールド）の代わりに、
// そこで行う公演を1つずつカードにする。
// - 同じ会場で同じ演目（例：歌うま王を両日）なら1枚にまとめる
// - 会場が違えば別のカード（例：Cepha は KODAステージとフィールドで2枚）
// 公演の中身は data/timetable.csv。ちびっこショーのような「企画の中の公演」は対象外（企画のカードのまま）。

import type { Location } from "@/app/page";
import { getLocationById } from "@/app/locations-server";
import { KIKAKU_LIST, getGenre, getImageUrl, getOrganizer } from "@/lib/kikaku";
import { TIMETABLE, type FestivalDay, type StageSchedule, type TimetableEntry } from "@/lib/timetable";

const STAGE_GENRE = "ステージ・フィールド";

export type StageActShow = { day: FestivalDay; start: string; end: string };

export type StageAct = {
  /** いいね・React の key に使う id（act:会場ID:演目） */
  id: string;
  stage: StageSchedule;
  venue: Location | null;
  act: string;
  org?: string;
  desc?: string;
  image?: string;
  /** 公演の回（日・開始・終了。CSV のままの時刻） */
  shows: StageActShow[];
};

/** 公演のいいねの id */
export function actFavId(venueId: string, act: string): string {
  return `act:${venueId}:${act}`;
}

function venueOf(stage: StageSchedule): Location | null {
  return (stage.locationIds ?? []).map(getLocationById).find((l): l is Location => !!l) ?? null;
}

/** ステージ・フィールドの会場か（会場の企画のジャンルが「ステージ・フィールド」） */
export function isStageVenue(stage: StageSchedule): boolean {
  const v = venueOf(stage);
  return !!v && getGenre(v) === STAGE_GENRE;
}

/** ステージ・フィールドの会場の企画 id（団体紹介では公演のカードに置きかえる） */
export const STAGE_VENUE_IDS = new Set(
  TIMETABLE.filter(isStageVenue).flatMap((s) => s.locationIds ?? []),
);

export const STAGE_ACTS: StageAct[] = (() => {
  const list: StageAct[] = [];
  for (const stage of TIMETABLE.filter(isStageVenue)) {
    const venue = venueOf(stage);
    const byAct = new Map<string, StageAct>();
    for (const day of ["day1", "day2"] as const) {
      for (const e of stage[day]) {
        let a = byAct.get(e.act);
        if (!a) {
          a = {
            id: actFavId(stage.stageId, e.act),
            stage,
            venue,
            act: e.act,
            org: e.org,
            desc: e.desc,
            image: e.image,
            shows: [],
          };
          byAct.set(e.act, a);
          list.push(a);
        }
        a.org ||= e.org;
        a.desc ||= e.desc;
        a.image ||= e.image;
        a.shows.push({ day, start: e.start, end: e.end });
      }
    }
  }
  return list;
})();

/** 会場の企画 id → その会場の公演 */
export function getActsForVenue(locationId: string): StageAct[] {
  return STAGE_ACTS.filter((a) => (a.stage.locationIds ?? []).includes(locationId));
}

/** その会場で、いいねした公演があるか（地図の♥・タイムテーブルの並び順に使う） */
export function venueHasFavAct(locationId: string, favs: Set<string>): boolean {
  return getActsForVenue(locationId).some((a) => favs.has(a.id));
}

/**
 * 公演の団体が教室などで別の企画も出しているとき、その企画を返す。
 * timetable.csv の「団体名」が kikaku.csv の「団体名」と同じ（空白は無視）で、1件だけ見つかったときに限る
 * （委員会のように企画が何件もある団体は、どれか決められないので使わない）。
 */
export function findOrgKikaku(org: string | undefined): Location | null {
  if (!org) return null;
  const norm = (s: string) => s.replace(/[\s　]/g, "");
  const key = norm(org);
  const hits = KIKAKU_LIST.filter(
    (l) => norm(getOrganizer(l) || "") === key && getGenre(l) !== STAGE_GENRE,
  );
  return hits.length === 1 ? hits[0] : null;
}

/** 公演の画像：公演の画像 → 同じ団体の教室企画のアイコン → 会場の写真 */
export function getActImage(
  entry: Pick<TimetableEntry, "image" | "org">,
  venue: Location | null,
): string | null {
  const org = findOrgKikaku(entry.org);
  return entry.image || (org && getImageUrl(org)) || (venue && getImageUrl(venue)) || null;
}
