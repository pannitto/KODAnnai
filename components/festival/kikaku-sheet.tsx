"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  X,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  Navigation,
  Hourglass,
  Map as MapIcon,
  CalendarClock,
  CalendarDays,
  ExternalLink,
} from "lucide-react";
import type { Location } from "@/app/page";
import { getLocationById } from "@/app/locations-server";
import {
  GENRE_COLORS,
  getDays,
  getDescription,
  getDisplayName,
  getGenre,
  getHours,
  getImageUrl,
  getNavigateUrl,
  getOrganizer,
  getPlaceLabel,
  getSnsUrl,
  getConditions,
  getStayLabel,
  isCommitteeKikaku,
} from "@/lib/kikaku";
import {
  actFavId,
  findOrgKikaku,
  getActImage,
  isStageVenue,
} from "@/lib/stage-acts";
import {
  FESTIVAL_DAY1,
  FESTIVAL_DAY2,
  findAct,
  getActStatusForLocation,
  getFestivalDay,
  getJstParts,
  toMinutes,
  type FestivalDay,
  type StageSchedule,
} from "@/lib/timetable";
import { WAIT_LEVEL_INFO, formatAgo, getFreshWait } from "@/lib/wait-times";
import { findSpotByLocationId } from "@/lib/map-spots";
import type { LiveData } from "@/lib/live";
import { FavoriteButton, useFavorites } from "@/components/festival/favorites";
import { FacilityDetail } from "@/components/festival/facility-detail";

export type SheetState =
  | null
  | { mode: "list"; title: string; ids: string[] }
  | {
      mode: "detail";
      id: string;
      /** 一覧から開いたときの戻り先 */
      back?: { title: string; ids: string[] };
    }
  | {
      /** ステージ・フィールドの1公演の紹介 */
      mode: "act";
      venueId: string;
      day: FestivalDay;
      /** もとの開始時刻（data/timetable.csv の開始） */
      start: string;
    }
  | {
      /** 地図のピクトグラム（トイレなど）の施設情報（lib/map-facilities.ts の id） */
      mode: "facility";
      id: string;
    };

/** ステージ・フィールドの会場か（ちびっこ館のショーなど、企画の中の公演は含めない） */
export { isStageVenue };

type Props = {
  state: SheetState;
  onChange: (s: SheetState) => void;
  now: Date | null;
  live: LiveData;
  /** 今いるページ（同じページへのリンクは出さない） */
  page: "map" | "groups" | "timetable";
};

/** 画面下からせり上がる企画詳細（地図・団体紹介・TTで共通） */
export function KikakuSheet({ state, onChange, now, live, page }: Props) {
  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onChange(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, onChange]);

  if (!state) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label="閉じる"
        className="absolute inset-0 bg-black/40"
        onClick={() => onChange(null)}
      />
      <div className="relative max-h-[82dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-border bg-background px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2 shadow-2xl animate-in slide-in-from-bottom duration-200">
        <div className="sticky top-0 z-10 -mx-4 flex items-center justify-between bg-background px-2 pb-1 pt-1">
          {state.mode === "detail" && state.back ? (
            <button
              type="button"
              onClick={() => onChange({ mode: "list", ...state.back! })}
              className="flex items-center gap-0.5 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
              {state.back.title}
            </button>
          ) : (
            <span className="mx-auto h-1.5 w-10 rounded-full bg-border" />
          )}
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="閉じる"
            className="absolute right-2 top-1 rounded-full p-2 text-muted-foreground hover:bg-card hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {state.mode === "list" ? (
          <SpotList
            title={state.title}
            ids={state.ids}
            now={now}
            live={live}
            onPick={(id) =>
              onChange({
                mode: "detail",
                id,
                back: { title: state.title, ids: state.ids },
              })
            }
          />
        ) : state.mode === "facility" ? (
          <FacilityDetail id={state.id} />
        ) : state.mode === "act" ? (
          <ActDetail
            venueId={state.venueId}
            day={state.day}
            start={state.start}
            now={now}
            live={live}
            page={page}
            onOpenVenue={(id) => onChange({ mode: "detail", id })}
          />
        ) : (
          <Detail
            id={state.id}
            now={now}
            live={live}
            page={page}
            onOpenAct={(venueId, day, start) =>
              onChange({ mode: "act", venueId, day, start })
            }
          />
        )}
      </div>
    </div>
  );
}

function SpotList({
  title,
  ids,
  now,
  live,
  onPick,
}: {
  title: string;
  ids: string[];
  now: Date | null;
  live: LiveData;
  onPick: (id: string) => void;
}) {
  const locs = ids.map(getLocationById).filter((l): l is Location => !!l);
  const { isFav } = useFavorites();
  return (
    <div className="pt-2">
      <h2 className="pr-8 text-lg font-bold">{title}</h2>
      <p className="mb-3 text-xs text-muted-foreground">
        {locs.length}件の企画
      </p>
      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
        {locs.map((loc) => (
          <li key={loc.id}>
            <button
              type="button"
              onClick={() => onPick(loc.id)}
              className="flex w-full items-center gap-3 bg-card px-3 py-3 text-left hover:bg-background"
            >
              <Thumb loc={loc} size={44} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {isFav(loc.id) && (
                    <span
                      className="mr-1 text-pink-500"
                      aria-label="いいね済み"
                    >
                      ♥
                    </span>
                  )}
                  {getDisplayName(loc)}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {getOrganizer(loc) || getPlaceLabel(loc)}
                </span>
              </span>
              <StatusBadges loc={loc} now={now} live={live} compact />
              <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 待ち時間・公演中などの小さなバッジ（一覧・カード用） */
export function StatusBadges({
  loc,
  now,
  live,
  compact = false,
}: {
  loc: Location;
  now: Date | null;
  live: LiveData;
  compact?: boolean;
}) {
  if (!now) return null;
  const wait = isCommitteeKikaku(loc)
    ? getFreshWait(live.waits, loc.id, now)
    : null;
  const acts = getActStatusForLocation(loc.id, now, live.acts);
  const current = acts.find((a) => a.current)?.current;
  const nowMin = getJstParts(now).minutes;
  // 30分以内に始まる公演
  const soon = acts
    .map((a) => a.next)
    .find((n) => n && toMinutes(n.start) - nowMin <= 30);

  return (
    <span
      className={`flex flex-shrink-0 flex-wrap items-center gap-1 ${compact ? "justify-end" : ""}`}
    >
      {wait && (
        <span
          className="rounded-full px-2 py-0.5 text-[11px] font-bold text-white"
          style={{ background: WAIT_LEVEL_INFO[wait.level].color }}
        >
          {wait.level === "closed"
            ? "受付終了"
            : `待ち${WAIT_LEVEL_INFO[wait.level].short}`}
        </span>
      )}
      {current ? (
        <span className="rounded-full bg-green-600 px-2 py-0.5 text-[11px] font-bold text-white">
          ▶ 公演中
        </span>
      ) : soon ? (
        <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-white">
          {soon.start}〜
        </span>
      ) : null}
    </span>
  );
}

function Detail({
  id,
  now,
  live,
  page,
  onOpenAct,
}: {
  id: string;
  now: Date | null;
  live: LiveData;
  page: Props["page"];
  /** ステージの公演をタップしたとき（その公演の紹介を開く） */
  onOpenAct: (venueId: string, day: FestivalDay, start: string) => void;
}) {
  const loc = getLocationById(id);
  if (!loc)
    return (
      <p className="py-6 text-center text-sm">企画が見つかりませんでした</p>
    );

  const genre = getGenre(loc);
  const description = getDescription(loc);
  const image = getImageUrl(loc);
  const hours = getHours(loc);
  const days = getDays(loc);
  const sns = getSnsUrl(loc);
  const conditions = getConditions(loc);
  const organizer = getOrganizer(loc);
  const stay = getStayLabel(loc.id);
  const committee = isCommitteeKikaku(loc);
  const wait = committee && now ? getFreshWait(live.waits, loc.id, now) : null;
  const acts = now ? getActStatusForLocation(loc.id, now, live.acts) : [];
  const day = now ? getFestivalDay(now) : null;
  const isFestivalDay = day !== null;
  const hasSpot = !!findSpotByLocationId(loc.id);

  return (
    <div className="pt-2">
      {image && <DetailImage key={image} src={image} />}
      <div className="mb-2 flex flex-wrap gap-1.5 pr-8">
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-bold text-white"
          style={{ background: GENRE_COLORS[genre] }}
        >
          {genre}
        </span>
        {conditions.map((c) => (
          <span
            key={c}
            className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground"
          >
            {c}
          </span>
        ))}
        {committee && (
          <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
            委員会企画
          </span>
        )}
      </div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-bold leading-snug">
            {getDisplayName(loc)}
          </h2>
          {organizer && (
            <p className="mt-0.5 text-sm text-muted-foreground">{organizer}</p>
          )}
        </div>
        <FavoriteButton id={loc.id} />
      </div>

      <dl className="mt-4 space-y-2 text-sm">
        <Row icon={<MapPin className="h-4 w-4" />} label="場所">
          {getPlaceLabel(loc)}
        </Row>
        <Row icon={<CalendarDays className="h-4 w-4" />} label="開催日">
          {days}
        </Row>
        {hours && (
          <Row icon={<Clock className="h-4 w-4" />} label="時間">
            <span className="whitespace-pre-line">{hours}</span>
          </Row>
        )}
        {/* ステージ・フィールドは公演ごとに長さが違うので、所要時間は公演の紹介のほうに出す */}
        {stay && genre !== "ステージ・フィールド" && (
          <Row icon={<Hourglass className="h-4 w-4" />} label="所要時間目安">
            {stay}
          </Row>
        )}
      </dl>

      {committee && (
        <div className="mt-4 rounded-xl border border-border bg-card p-3">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Hourglass className="h-3.5 w-3.5" />
            現在の待ち時間
          </p>
          {wait ? (
            <div className="flex items-baseline justify-between gap-2">
              <span
                className="text-lg font-bold"
                style={{ color: WAIT_LEVEL_INFO[wait.level].color }}
              >
                {WAIT_LEVEL_INFO[wait.level].label}
              </span>
              <span className="text-xs text-muted-foreground">
                {now && formatAgo(wait.updatedAt, now)}
              </span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">情報なし</p>
          )}
        </div>
      )}

      {acts.length > 0 && (
        <div className="mt-4 space-y-2">
          {acts.map(({ stage, current, next }) => (
            <div
              key={stage.stageId}
              className="rounded-xl border border-border bg-card p-3"
            >
              {acts.length > 1 && (
                <p className="mb-1 text-xs font-semibold text-muted-foreground">
                  {stage.stageName}
                </p>
              )}
              {current && (
                <ActLine
                  label={`▶ 公演中 ${current.start}〜${current.end}`}
                  tone="text-green-600"
                  changed={current.changed}
                  act={current.act}
                  onClick={
                    isStageVenue(stage) && day
                      ? () =>
                          onOpenAct(stage.stageId, day, current.originalStart)
                      : undefined
                  }
                  className="mb-2"
                />
              )}
              {next ? (
                <ActLine
                  label={`次の公演 ${next.start}〜${next.end}`}
                  tone="text-amber-600"
                  changed={next.changed}
                  act={next.act}
                  onClick={
                    isStageVenue(stage) && day
                      ? () => onOpenAct(stage.stageId, day, next.originalStart)
                      : undefined
                  }
                />
              ) : (
                !current && (
                  <p className="text-sm text-muted-foreground">
                    {isFestivalDay
                      ? "本日の公演は終了しました"
                      : "公演時間はタイムテーブルをご覧ください"}
                  </p>
                )
              )}
            </div>
          ))}
        </div>
      )}

      {description && (
        <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">
          {description}
        </p>
      )}

      <div className="mt-5 space-y-2">
        <Link
          href={getNavigateUrl(loc)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-base font-bold text-white shadow-sm active:bg-orange-600"
        >
          <Navigation className="h-5 w-5" />
          KODAnnaiでここへ行く
        </Link>
        <div className="flex gap-2">
          {page !== "map" && hasSpot && (
            <Link
              href={`/map?id=${encodeURIComponent(loc.id)}`}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border py-2.5 text-sm font-medium"
            >
              <MapIcon className="h-4 w-4" />
              地図で見る
            </Link>
          )}
          {sns && (
            <a
              href={sns}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border py-2.5 text-sm font-medium"
            >
              <ExternalLink className="h-4 w-4" />
              SNS・Web
            </a>
          )}
          {page !== "timetable" && acts.length > 0 && (
            <Link
              href="/timetable"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border py-2.5 text-sm font-medium"
            >
              <CalendarClock className="h-4 w-4" />
              タイムテーブル
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <dt className="w-20 flex-shrink-0 text-muted-foreground">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}

/** 企画の画像（なければジャンルの色の四角） */
export function Thumb({ loc, size }: { loc: Location; size: number }) {
  const [failed, setFailed] = useState(false);
  const src = failed ? null : getImageUrl(loc);
  const color = GENRE_COLORS[getGenre(loc)];
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      loading="lazy"
      width={size}
      height={size}
      className="flex-shrink-0 rounded-lg bg-background object-cover"
      style={{
        width: size,
        height: size,
        boxShadow: `inset 0 0 0 2px ${color}`,
      }}
      onError={() => setFailed(true)}
    />
  ) : (
    <span
      className="flex flex-shrink-0 items-center justify-center rounded-lg p-1 text-center text-[9px] font-bold leading-tight text-white"
      style={{ width: size, height: size, background: color }}
    >
      {getGenre(loc)}
    </span>
  );
}

/**
 * 詳細の画像。写真の縦横比がまちまちでも枠（16:9）をそろえる。
 * 写真は切らずに全体を収め、余白には同じ写真をぼかして敷く。読み込めないときは枠ごと消す。
 */
function DetailImage({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <div className="relative mb-3 aspect-video w-full overflow-hidden rounded-xl bg-card">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-xl"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        loading="lazy"
        className="relative h-full w-full object-contain"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

/** 詳細の「公演中／次の公演」の1行。ステージの公演はタップでその公演の紹介へ */
function ActLine({
  label,
  tone,
  changed,
  act,
  onClick,
  className = "",
}: {
  label: string;
  tone: string;
  changed: boolean;
  act: string;
  onClick?: () => void;
  className?: string;
}) {
  const body = (
    <>
      <p className={`text-xs font-bold ${tone}`}>
        {label}
        {changed && (
          <span className="ml-1 rounded bg-amber-500 px-1 text-white">
            時間変更
          </span>
        )}
      </p>
      <p className="font-semibold">{act}</p>
    </>
  );
  if (!onClick) return <div className={className}>{body}</div>;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-2 rounded-lg text-left hover:bg-background ${className}`}
    >
      <span className="min-w-0">{body}</span>
      <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
    </button>
  );
}

const DAY_LABEL: Record<FestivalDay, string> = {
  day1: `1日目（${Number(FESTIVAL_DAY1.slice(5, 7))}/${Number(FESTIVAL_DAY1.slice(8))}）`,
  day2: `2日目（${Number(FESTIVAL_DAY2.slice(5, 7))}/${Number(FESTIVAL_DAY2.slice(8))}）`,
};

/**
 * ステージ・フィールドの1公演の紹介（団体紹介の詳細と同じ形）。
 * 所要時間は公演の時間（開始〜終了）から出す。中止・時間変更（/admin）も反映する。
 */
function ActDetail({
  venueId,
  day,
  start,
  now,
  live,
  page,
  onOpenVenue,
}: {
  venueId: string;
  day: FestivalDay;
  start: string;
  now: Date | null;
  live: LiveData;
  page: Props["page"];
  onOpenVenue: (kikakuId: string) => void;
}) {
  const found = findAct(venueId, day, start, live.acts);
  if (!found)
    return (
      <p className="py-6 text-center text-sm">公演が見つかりませんでした</p>
    );
  const { stage, entry } = found;
  const venue = (stage.locationIds ?? [])
    .map(getLocationById)
    .find((l): l is Location => !!l);
  const genre = venue ? getGenre(venue) : null;
  const minutes = toMinutes(entry.end) - toMinutes(entry.start);
  const nowMin = now ? getJstParts(now).minutes : null;
  const today = now ? getFestivalDay(now) : null;
  const status = entry.canceled
    ? "canceled"
    : today === day && nowMin !== null
      ? nowMin >= toMinutes(entry.end)
        ? "past"
        : nowMin >= toMinutes(entry.start)
          ? "current"
          : "future"
      : "future";
  const hasSpot = venue ? !!findSpotByLocationId(venue.id) : false;
  // 画像：公演の画像 → 同じ団体の教室企画のアイコン → 会場の写真
  const orgKikaku = findOrgKikaku(entry.org);
  const image = getActImage(entry, venue ?? null);

  return (
    <div className="pt-2">
      {image && <DetailImage key={image} src={image} />}
      <div className="mb-2 flex flex-wrap gap-1.5 pr-8">
        {genre && (
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-bold text-white"
            style={{ background: GENRE_COLORS[genre] }}
          >
            {genre}
          </span>
        )}
        <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
          {stage.stageName}
        </span>
      </div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-bold leading-snug">{entry.act}</h2>
          {entry.org && (
            <p className="mt-0.5 text-sm text-muted-foreground">{entry.org}</p>
          )}
        </div>
        <FavoriteButton id={actFavId(stage.stageId, entry.act)} />
      </div>

      {status === "canceled" ? (
        <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700 dark:bg-red-950 dark:text-red-200">
          この公演は中止になりました{entry.note ? `（${entry.note}）` : ""}
        </p>
      ) : status === "current" ? (
        <p className="mt-3 rounded-xl bg-green-50 px-3 py-2 text-sm font-bold text-green-700 dark:bg-green-950 dark:text-green-200">
          ▶ いま公演中です
        </p>
      ) : entry.changed || entry.note ? (
        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-200">
          {entry.changed
            ? `時間が変更になりました（もとは ${entry.originalStart}〜${entry.originalEnd}）`
            : ""}
          {entry.note ? `${entry.changed ? " " : ""}${entry.note}` : ""}
        </p>
      ) : null}

      <dl className="mt-4 space-y-2 text-sm">
        <Row icon={<MapPin className="h-4 w-4" />} label="場所">
          {stage.stageName}
          {venue && getPlaceLabel(venue) !== stage.stageName
            ? `（${getPlaceLabel(venue)}）`
            : ""}
        </Row>
        <Row icon={<CalendarDays className="h-4 w-4" />} label="日にち">
          {DAY_LABEL[day]}
        </Row>
        <Row icon={<Clock className="h-4 w-4" />} label="時間">
          <span
            className={status === "canceled" ? "line-through opacity-60" : ""}
          >
            {entry.start}〜{entry.end}
          </span>
        </Row>
        <Row icon={<Hourglass className="h-4 w-4" />} label="所要時間">
          約{minutes}分
        </Row>
      </dl>

      {entry.desc && (
        <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">
          {entry.desc}
        </p>
      )}

      <div className="mt-5 space-y-2">
        {venue && (
          <Link
            href={getNavigateUrl(venue)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-base font-bold text-white shadow-sm active:bg-orange-600"
          >
            <Navigation className="h-5 w-5" />
            KODAnnaiでここへ行く
          </Link>
        )}
        <div className="flex gap-2">
          {venue && (
            <button
              type="button"
              onClick={() => onOpenVenue(venue.id)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border py-2.5 text-sm font-medium"
            >
              <MapPin className="h-4 w-4" />
              会場の詳細
            </button>
          )}
          {page !== "map" && venue && hasSpot && (
            <Link
              href={`/map?id=${encodeURIComponent(venue.id)}`}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border py-2.5 text-sm font-medium"
            >
              <MapIcon className="h-4 w-4" />
              地図で見る
            </Link>
          )}
          {entry.sns && (
            <a
              href={entry.sns}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border py-2.5 text-sm font-medium"
            >
              <ExternalLink className="h-4 w-4" />
              SNS・Web
            </a>
          )}
        </div>
        {orgKikaku && (
          <button
            type="button"
            onClick={() => onOpenVenue(orgKikaku.id)}
            className="flex w-full items-center justify-between gap-2 rounded-xl border border-border px-3 py-2.5 text-left text-sm"
          >
            <span className="min-w-0">
              <span className="block text-xs text-muted-foreground">
                この団体の企画
              </span>
              <span className="block truncate font-medium">
                {getDisplayName(orgKikaku)}（{getPlaceLabel(orgKikaku)}）
              </span>
            </span>
            <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  );
}
