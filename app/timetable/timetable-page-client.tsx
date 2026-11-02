"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Logo from "@/components/logo";
import Footer from "@/components/footer";
import { SiteNav } from "@/components/festival/site-nav";
import { KikakuSheet, isStageVenue, type SheetState } from "@/components/festival/kikaku-sheet";
import { useNow, useLive } from "@/components/festival/hooks";
import { useFavorites } from "@/components/festival/favorites";
import { actFavId } from "@/lib/stage-acts";

/**
 * 会場の企画が、そのまま1つの公演になっている会場（兼松講堂の謎解きステージなど）。
 * 企画をいいねしても会場の列ではなく、公演のブロックに♥を付ける。
 */
const ACT_LIKE_VENUES = new Set(["kanematsu"]);
import {
  FESTIVAL_DAY1,
  FESTIVAL_DAY2,
  getFestivalDay,
  getJstParts,
  getStagesForDay,
  minutesToTime,
  toMinutes,
  type FestivalDay,
  type StageSchedule,
  applyActOverrides,
  type EffectiveAct,
} from "@/lib/timetable";

const PX_PER_MIN = 1.6; // 1時間 = 96px
const COL_W = 116;
const TIME_W = 44;
const HEADER_H = 44;

const DAYS: { id: FestivalDay; label: string; date: string }[] = [
  { id: "day1", label: "1日目", date: FESTIVAL_DAY1 },
  { id: "day2", label: "2日目", date: FESTIVAL_DAY2 },
];

function formatDate(iso: string) {
  const [, m, d] = iso.split("-").map(Number);
  const w = "日月火水木金土"[new Date(`${iso}T12:00:00+09:00`).getUTCDay()];
  return `${m}/${d}(${w})`;
}

export default function TimetablePageClient() {
  const now = useNow();
  const { live } = useLive();
  const [day, setDay] = useState<FestivalDay>("day1");
  const [sheet, setSheet] = useState<SheetState>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const didAutoScroll = useRef(false);

  const today = now ? getFestivalDay(now) : null;
  const nowMin = now ? getJstParts(now).minutes : null;

  // 開催日ならその日を最初に表示
  useEffect(() => {
    if (today) setDay(today);
  }, [today]);

  // いいねした企画の会場を左（先頭）に。それ以外の順番はそのまま
  // - ステージ・フィールド・兼松講堂：会場の列（見出し）は、会場そのものをいいねしたときだけ。
  //   公演をいいねしたときは、その公演のブロックに♥が付くだけ（会場はいいねしたことにしない）
  // - それ以外（ちびっこ館など、企画の中の公演）：企画をいいねすると会場の列がいいねになる
  const { favs } = useFavorites();
  const isFavStage = (s: StageSchedule) =>
    !ACT_LIKE_VENUES.has(s.stageId) && (s.locationIds ?? []).some((id) => favs.has(id));
  /** 公演のブロックの♥：ステージ・フィールドは公演ごと、兼松講堂は企画（＝その公演）のいいね */
  const isFavAct = (s: StageSchedule, act: string) =>
    isStageVenue(s)
      ? favs.has(actFavId(s.stageId, act))
      : ACT_LIKE_VENUES.has(s.stageId) && (s.locationIds ?? []).some((id) => favs.has(id));
  const stages = useMemo(() => {
    const list = getStagesForDay(day);
    return [...list.filter(isFavStage), ...list.filter((s) => !isFavStage(s))];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, favs]);
  // 運営ページで入力した中止・時間変更を反映した公演（会場ごと）
  const actsByStage = useMemo(
    () => new Map(stages.map((s) => [s.stageId, applyActOverrides(s.stageId, day, s[day], live.acts)])),
    [stages, day, live.acts],
  );

  const { startMin, endMin } = useMemo(() => {
    const entries = stages.flatMap((s) => actsByStage.get(s.stageId) ?? []);
    if (entries.length === 0) return { startMin: 10 * 60, endMin: 17 * 60 };
    const s = Math.min(...entries.map((e) => toMinutes(e.start)));
    const e = Math.max(...entries.map((e) => toMinutes(e.end)));
    return { startMin: Math.floor(s / 60) * 60, endMin: Math.ceil(e / 60) * 60 };
  }, [stages, actsByStage]);

  const hours = [];
  for (let m = startMin; m <= endMin; m += 30) hours.push(m);
  const bodyH = (endMin - startMin) * PX_PER_MIN;

  const showNowLine =
    today === day && nowMin !== null && nowMin >= startMin && nowMin <= endMin;
  const nowTop = nowMin !== null ? (nowMin - startMin) * PX_PER_MIN : 0;

  // 開いたとき・日付切り替え時に「今」が見える位置までスクロール
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !now) return;
    if (showNowLine) {
      el.scrollTo({ top: Math.max(0, nowTop - 80), behavior: didAutoScroll.current ? "smooth" : "auto" });
    } else {
      el.scrollTo({ top: 0 });
    }
    didAutoScroll.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, !!now]);

  const currentActs = useMemo(() => {
    if (today !== day || nowMin === null) return [];
    return stages.flatMap((s) =>
      (actsByStage.get(s.stageId) ?? [])
        .filter((e) => !e.canceled && nowMin >= toMinutes(e.start) && nowMin < toMinutes(e.end))
        .map((e) => ({ stage: s, entry: e })),
    );
  }, [stages, actsByStage, day, today, nowMin]);

  const openStage = (stage: StageSchedule) => {
    const id = stage.locationIds?.[0];
    if (id) setSheet({ mode: "detail", id });
  };

  return (
    <div className="min-h-screen bg-background p-4 pt-5">
      <Logo />
      <SiteNav />
      <main className="mx-auto max-w-3xl space-y-3 pt-4">
        <div className="mx-auto max-w-md space-y-3 md:max-w-none">
          <h1 className="text-lg font-bold">タイムテーブル</h1>
          <div className="grid grid-cols-2 gap-1 rounded-xl border border-border p-1" role="tablist">
            {DAYS.map((d) => (
              <button
                key={d.id}
                type="button"
                role="tab"
                aria-selected={day === d.id}
                onClick={() => setDay(d.id)}
                className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
                  day === d.id ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {d.label}
                <span className="ml-1 text-xs font-normal opacity-80">{formatDate(d.date)}</span>
                {today === d.id && <span className="ml-1 text-[10px]">（今日）</span>}
              </button>
            ))}
          </div>

          {today === day && nowMin !== null && (
            <div className="rounded-xl border border-border bg-card p-3 text-sm">
              <p className="font-bold">
                <span className="mr-1 text-red-500">●</span>現在 {minutesToTime(nowMin)}
              </p>
              {currentActs.length > 0 ? (
                <ul className="mt-1 space-y-0.5">
                  {currentActs.map(({ stage, entry }) => (
                    <li key={stage.stageId + entry.start} className="truncate">
                      <span className="mr-1.5 text-xs font-bold text-green-600">▶ 公演中</span>
                      <span className="text-muted-foreground">{stage.stageName}：</span>
                      {entry.act}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-0.5 text-muted-foreground">いま公演中のものはありません</p>
              )}
            </div>
          )}
        </div>

        {stages.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            この日のタイムテーブルはまだありません
          </p>
        ) : (
          <div
            ref={scrollRef}
            className="relative overflow-auto rounded-xl border border-border bg-background"
            style={{ maxHeight: "calc(100dvh - 120px)" }}
          >
            <div
              className="relative"
              style={{ width: TIME_W + COL_W * stages.length }}
            >
              {/* 会場名（上に固定） */}
              <div className="sticky top-0 z-20 flex" style={{ height: HEADER_H }}>
                <div
                  className="sticky left-0 z-30 border-b border-r border-border bg-card"
                  style={{ width: TIME_W, flex: "none" }}
                />
                {stages.map((s) => (
                  <button
                    key={s.stageId}
                    type="button"
                    onClick={() => openStage(s)}
                    className={`flex items-center justify-center border-b border-r border-border px-1 text-center text-xs font-bold leading-tight text-white ${
                      isFavStage(s) ? "bg-pink-600" : "bg-slate-800"
                    }`}
                    style={{ width: COL_W, flex: "none" }}
                  >
                    {isFavStage(s) && <span className="mr-0.5">♥</span>}
                    {s.stageName}
                  </button>
                ))}
              </div>

              <div className="flex" style={{ height: bodyH + 12 }}>
                {/* 時刻（左に固定） */}
                <div
                  className="sticky left-0 z-10 border-r border-border bg-card"
                  style={{ width: TIME_W, flex: "none", position: "sticky" }}
                >
                  <div className="relative h-full">
                    {hours.map((m) => (
                      <span
                        key={m}
                        className={`absolute right-1 -translate-y-1/2 text-[10px] ${m % 60 === 0 ? "font-bold" : "text-muted-foreground"}`}
                        style={{ top: Math.max(6, (m - startMin) * PX_PER_MIN) }}
                      >
                        {minutesToTime(m)}
                      </span>
                    ))}
                    {showNowLine && (
                      <span
                        className="absolute left-0 right-0 z-10 -translate-y-1/2 rounded-r-full bg-red-500 py-0.5 pl-1 text-[10px] font-bold text-white"
                        style={{ top: nowTop }}
                      >
                        {minutesToTime(nowMin!)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="relative" style={{ width: COL_W * stages.length, flex: "none" }}>
                  {/* 罫線 */}
                  {hours.map((m) => (
                    <div
                      key={m}
                      className={`absolute left-0 right-0 border-t ${m % 60 === 0 ? "border-border" : "border-dashed border-border/60"}`}
                      style={{ top: (m - startMin) * PX_PER_MIN }}
                    />
                  ))}
                  {stages.map((s, col) => (
                    <div
                      key={s.stageId}
                      className="absolute bottom-0 top-0 border-r border-border/60"
                      style={{ left: (col + 1) * COL_W - 1 }}
                    />
                  ))}

                  {/* 公演ブロック */}
                  {stages.map((s, col) =>
                    (actsByStage.get(s.stageId) ?? []).map((e) => (
                      <ActBlock
                        key={s.stageId + e.originalStart}
                        entry={e}
                        fav={isFavAct(s, e.act)}
                        left={col * COL_W}
                        top={(toMinutes(e.start) - startMin) * PX_PER_MIN}
                        height={(toMinutes(e.end) - toMinutes(e.start)) * PX_PER_MIN}
                        state={
                          e.canceled
                            ? "canceled"
                            : today !== day || nowMin === null
                            ? "future"
                            : nowMin >= toMinutes(e.end)
                              ? "past"
                              : nowMin >= toMinutes(e.start)
                                ? "current"
                                : "future"
                        }
                        onClick={() =>
                          // ステージ・フィールドの公演はその公演の紹介、企画の中の公演（ちびっこショーなど）は企画の詳細
                          isStageVenue(s)
                            ? setSheet({ mode: "act", venueId: s.stageId, day, start: e.originalStart })
                            : openStage(s)
                        }
                      />
                    )),
                  )}

                  {/* 現在時刻の横棒 */}
                  {showNowLine && (
                    <div
                      className="pointer-events-none absolute left-0 right-0 z-[5] h-0.5 -translate-y-1/2 bg-red-500 shadow-[0_0_0_1px_rgba(255,255,255,0.6)]"
                      style={{ top: nowTop }}
                      aria-label={`現在 ${minutesToTime(nowMin!)}`}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        <p className="mx-auto max-w-md text-xs text-muted-foreground md:max-w-none">
          公演をタップすると、その公演の紹介とKODAnnaiの経路案内が開きます。雨天時は会場が変更になる場合があります。
        </p>
      </main>
      <Footer />
      <KikakuSheet state={sheet} onChange={setSheet} now={now} live={live} page="timetable" />
    </div>
  );
}

function ActBlock({
  entry,
  fav,
  left,
  top,
  height,
  state,
  onClick,
}: {
  entry: EffectiveAct;
  fav: boolean;
  left: number;
  top: number;
  height: number;
  state: "past" | "current" | "future" | "canceled";
  onClick: () => void;
}) {
  const styles =
    state === "canceled"
      ? "border-red-400 bg-red-50/70 dark:border-red-800 dark:bg-red-950/50"
      : state === "current"
      ? "border-green-600 bg-green-50 ring-2 ring-green-500 dark:bg-green-950"
      : state === "past"
        ? "border-slate-300 bg-slate-100 opacity-50 dark:border-slate-700 dark:bg-slate-900"
        : "border-indigo-300 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`absolute flex flex-col items-start justify-start overflow-hidden rounded-md border-l-4 px-1.5 py-1 text-left ${styles}`}
      style={{ left: left + 3, top: top + 1, width: COL_W - 6, height: Math.max(height - 2, 18) }}
    >
      <span
        className={`block text-[10px] font-bold ${
          state === "canceled"
            ? "text-red-600"
            : state === "current"
              ? "text-green-700 dark:text-green-300"
              : "text-indigo-600 dark:text-indigo-300"
        }`}
      >
        {state === "canceled" ? "中止 " : state === "current" ? "▶ 公演中 " : ""}
        {entry.changed && state !== "canceled" && <span className="mr-0.5 rounded bg-amber-500 px-0.5 text-white">変更</span>}
        {entry.start}〜{entry.end}
      </span>
      <span className={`block text-xs font-semibold leading-tight ${state === "canceled" ? "line-through opacity-60" : ""}`}>
        {fav && <span className="mr-0.5 text-pink-500">♥</span>}
        {entry.act}
      </span>
      {entry.note && <span className="mt-0.5 block text-[10px] leading-tight text-muted-foreground">{entry.note}</span>}
    </button>
  );
}
