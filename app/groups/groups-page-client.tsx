"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import Logo from "@/components/logo";
import Footer from "@/components/footer";
import { SiteNav } from "@/components/festival/site-nav";
import {
  KikakuSheet,
  StatusBadges,
  Thumb,
  type SheetState,
} from "@/components/festival/kikaku-sheet";
import { useNow, useQueryParam, useLive } from "@/components/festival/hooks";
import { FavoriteButton, useFavorites } from "@/components/festival/favorites";
import { getLocationById } from "@/app/locations-server";
import {
  CONDITIONS,
  GENRES,
  GENRE_COLORS,
  KIKAKU_LIST,
  getArea,
  getDays,
  getDescription,
  getDisplayName,
  getGenre,
  getOrganizer,
  getConditions,
  getPlaceLabel,
  isIndoor,
  type Condition,
} from "@/lib/kikaku";
import { normalize, searchKikaku } from "@/lib/search";
import { getFestivalDay, getJstParts, toMinutes, type FestivalDay } from "@/lib/timetable";
import { STAGE_ACTS, STAGE_VENUE_IDS, getActImage, type StageAct } from "@/lib/stage-acts";
import type { Location } from "@/app/page";

// 一覧の1行：ふつうの企画か、ステージ・フィールドの1公演
type Item = { kind: "kikaku"; loc: Location } | { kind: "act"; act: StageAct };

const DAY_NAME: Record<FestivalDay, string> = { day1: "1日目", day2: "2日目" };

/** 公演が検索語に当たるか（演目・団体名・紹介文・会場名） */
function actMatches(a: StageAct, rawTerm: string): boolean {
  const term = normalize(rawTerm);
  if (!term) return true;
  return [a.act, a.org, a.desc, a.stage.stageName, a.venue ? getPlaceLabel(a.venue) : ""].some(
    (s) => !!s && normalize(s).includes(term),
  );
}

// 実際に企画があるジャンルだけを絞り込みに出す
const GENRE_FILTERS = GENRES.filter((g) => KIKAKU_LIST.some((l) => getGenre(l) === g));

const PLACE_FILTERS = [
  "すべて",
  "屋外",
  "屋内",
  "企画本館",
  "企画別館",
  "ちびっこ館",
] as const;
type PlaceFilter = (typeof PLACE_FILTERS)[number];
const DAY_FILTERS = ["すべて", "1日目", "2日目"] as const;
type DayFilter = (typeof DAY_FILTERS)[number];

export default function GroupsPageClient() {
  const now = useNow();
  const { live } = useLive();
  const idParam = useQueryParam("id");
  const qParam = useQueryParam("q");

  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState<string>("すべて");
  const [conds, setConds] = useState<Condition[]>([]);
  const [day, setDay] = useState<DayFilter>("すべて");
  const [place, setPlace] = useState<PlaceFilter>("すべて");
  const [sheet, setSheet] = useState<SheetState>(null);
  const [favOnly, setFavOnly] = useState(false);
  const { favs } = useFavorites();

  useEffect(() => {
    if (qParam) setQuery(qParam);
  }, [qParam]);
  // 開催日に開いたときは、その日の企画だけを最初に出す
  const dayInitialized = useRef(false);
  useEffect(() => {
    if (!now || dayInitialized.current) return;
    dayInitialized.current = true;
    const t = getFestivalDay(now);
    if (t) setDay(t === "day1" ? "1日目" : "2日目");
  }, [now]);
  useEffect(() => {
    if (idParam && getLocationById(idParam)) setSheet({ mode: "detail", id: idParam });
  }, [idParam]);

  const results = useMemo<Item[]>(() => {
    const filtered = KIKAKU_LIST.filter((loc) => {
      if (favOnly && !favs.has(loc.id)) return false;
      if (genre !== "すべて" && getGenre(loc) !== genre) return false;
      if (conds.some((c) => !getConditions(loc).includes(c))) return false;
      if (day !== "すべて" && getDays(loc) !== "両日" && getDays(loc) !== day) return false;
      if (!matchPlace(loc)) return false;
      return true;
    });
    // ステージ・フィールドは会場ではなく公演を1つずつ出す
    const acts = STAGE_ACTS.filter((a) => {
      if (favOnly && !favs.has(a.id)) return false;
      if (genre !== "すべて" && genre !== "ステージ・フィールド") return false;
      if (conds.length > 0) return false;
      if (day !== "すべて" && !a.shows.some((sh) => DAY_NAME[sh.day] === day)) return false;
      if (a.venue && !matchPlace(a.venue)) return false;
      return actMatches(a, query);
    });
    const actItems = (venueId?: string): Item[] =>
      acts
        .filter((a) => !venueId || (a.stage.locationIds ?? []).includes(venueId))
        .map((act) => ({ kind: "act", act }));

    if (!query.trim()) {
      // 検索していないときは、会場があった位置にその会場の公演を並べる
      return filtered.flatMap<Item>((loc) =>
        STAGE_VENUE_IDS.has(loc.id) ? actItems(loc.id) : [{ kind: "kikaku", loc }],
      );
    }
    const kikaku = searchKikaku(
      filtered.filter((loc) => !STAGE_VENUE_IDS.has(loc.id)),
      query,
    ).map<Item>((loc) => ({ kind: "kikaku", loc }));
    return [...kikaku, ...actItems()];

    function matchPlace(loc: Location) {
      if (place === "屋外" && isIndoor(loc)) return false;
      if (place === "屋内" && !isIndoor(loc)) return false;
      if (
        (place === "企画本館" || place === "企画別館" || place === "ちびっこ館") &&
        getArea(loc) !== place
      )
        return false;
      return true;
    }
  }, [query, genre, conds, day, place, favOnly, favs]);

  /** 公演のカードを押したとき：日にちで絞っていればその日、開催日ならその日、それ以外は最初の回 */
  const openAct = (a: StageAct) => {
    const today = now ? getFestivalDay(now) : null;
    const want: FestivalDay | null =
      day === "1日目" ? "day1" : day === "2日目" ? "day2" : today;
    const shows = a.shows.filter((sh) => !want || sh.day === want);
    const list = shows.length ? shows : a.shows;
    // 開催日なら、まだ終わっていない回を優先
    const nowMin = now && today ? getJstParts(now).minutes : null;
    const show =
      (nowMin !== null && list.find((sh) => sh.day === today && toMinutes(sh.end) > nowMin)) ||
      list[0];
    setSheet({ mode: "act", venueId: a.stage.stageId, day: show.day, start: show.start });
  };

  return (
    <div className="min-h-screen bg-background p-4 pt-5">
      <Logo />
      <SiteNav />
      <main className="mx-auto max-w-md space-y-4 pt-4">
        <h1 className="text-lg font-bold">団体紹介</h1>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            inputMode="search"
            enterKeyHint="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="企画名・団体名・教室などで検索"
            aria-label="企画を検索"
            className="w-full rounded-xl border border-border bg-background py-3 pl-9 pr-9 text-base outline-none focus:border-accent focus:ring-2 focus:ring-ring"
          />
          {query && (
            <button
              type="button"
              aria-label="検索語を消す"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <FilterRow label="ジャンル">
          {["すべて", ...GENRE_FILTERS].map((g) => (
            <Chip
              key={g}
              active={genre === g}
              color={g === "すべて" ? undefined : GENRE_COLORS[g as keyof typeof GENRE_COLORS]}
              onClick={() => setGenre(g)}
            >
              {g}
            </Chip>
          ))}
        </FilterRow>
        <FilterRow label="条件（複数選べます）">
          <Chip active={favOnly} color="#ec4899" onClick={() => setFavOnly((v) => !v)}>
            ♥ いいねした企画（{favs.size}）
          </Chip>
          {CONDITIONS.map((c) => (
            <Chip
              key={c}
              active={conds.includes(c)}
              onClick={() =>
                setConds((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]))
              }
            >
              {c}
            </Chip>
          ))}
        </FilterRow>
        <FilterRow label="日にち">
          {DAY_FILTERS.map((d) => (
            <Chip key={d} active={day === d} onClick={() => setDay(d)}>
              {d}
            </Chip>
          ))}
        </FilterRow>
        <FilterRow label="場所">
          {PLACE_FILTERS.map((p) => (
            <Chip key={p} active={place === p} onClick={() => setPlace(p)}>
              {p}
            </Chip>
          ))}
        </FilterRow>

        <p className="text-sm text-muted-foreground" aria-live="polite">
          {results.length}件の企画
        </p>

        <ul className="space-y-2">
          {results.map((item) => {
            if (item.kind === "act") return <ActCard key={item.act.id} a={item.act} onOpen={openAct} />;
            const loc = item.loc;
            const g = getGenre(loc);
            const desc = getDescription(loc);
            const organizer = getOrganizer(loc);
            const days = getDays(loc);
            return (
              <li key={loc.id} className="relative">
                <button
                  type="button"
                  onClick={() => setSheet({ mode: "detail", id: loc.id })}
                  className="flex w-full gap-3 rounded-xl border border-border bg-card p-3 pb-10 text-left shadow-sm transition-colors hover:bg-background"
                >
                  <Thumb loc={loc} size={72} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className="font-semibold leading-snug">{getDisplayName(loc)}</span>
                      <StatusBadges loc={loc} now={now} live={live} compact />
                    </span>
                    {organizer && (
                      <span className="mt-0.5 block text-xs text-muted-foreground">{organizer}</span>
                    )}
                    {desc && <span className="mt-1 line-clamp-2 text-xs">{desc}</span>}
                    <span className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px]">
                      <span className="font-bold" style={{ color: GENRE_COLORS[g] }}>
                        {g}
                      </span>
                      {getConditions(loc).map((c) => (
                        <span key={c} className="text-muted-foreground">#{c}</span>
                      ))}
                      <span className="text-muted-foreground">{getPlaceLabel(loc)}</span>
                      {days !== "両日" && <span className="font-semibold">{days}のみ</span>}
                    </span>
                  </span>
                </button>
                <FavoriteButton id={loc.id} size="sm" className="absolute bottom-2 right-2" />
              </li>
            );
          })}
        </ul>

        {results.length === 0 && (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            条件に合う企画が見つかりませんでした。
            <br />
            キーワードやしぼり込みを変えてみてください。
          </p>
        )}
      </main>
      <Footer />
      <KikakuSheet state={sheet} onChange={setSheet} now={now} live={live} page="groups" />
    </div>
  );
}

/** ステージ・フィールドの1公演のカード（企画のカードと同じ形） */
function ActCard({ a, onOpen }: { a: StageAct; onOpen: (a: StageAct) => void }) {
  const [failed, setFailed] = useState(false);
  const src = failed ? null : getActImage(a, a.venue);
  const color = GENRE_COLORS["ステージ・フィールド"];
  const days = new Set(a.shows.map((sh) => sh.day));
  return (
    <li className="relative">
      <button
        type="button"
        onClick={() => onOpen(a)}
        className="flex w-full gap-3 rounded-xl border border-border bg-card p-3 pb-10 text-left shadow-sm transition-colors hover:bg-background"
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            loading="lazy"
            width={72}
            height={72}
            className="flex-shrink-0 rounded-lg bg-background object-cover"
            style={{ width: 72, height: 72, boxShadow: `inset 0 0 0 2px ${color}` }}
            onError={() => setFailed(true)}
          />
        ) : (
          <span
            className="flex flex-shrink-0 items-center justify-center rounded-lg p-1 text-center text-[9px] font-bold leading-tight text-white"
            style={{ width: 72, height: 72, background: color }}
          >
            ステージ・フィールド
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block font-semibold leading-snug">{a.act}</span>
          {a.org && <span className="mt-0.5 block text-xs text-muted-foreground">{a.org}</span>}
          {a.desc && <span className="mt-1 line-clamp-2 text-xs">{a.desc}</span>}
          <span className="mt-1 block text-xs font-semibold">
            {a.shows.map((sh) => `${days.size > 1 ? `${DAY_NAME[sh.day]} ` : ""}${sh.start}〜${sh.end}`).join("／")}
          </span>
          <span className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px]">
            <span className="font-bold" style={{ color }}>
              ステージ・フィールド
            </span>
            <span className="text-muted-foreground">{a.stage.stageName}</span>
            {days.size === 1 && <span className="font-semibold">{DAY_NAME[[...days][0]]}のみ</span>}
          </span>
        </span>
      </button>
      <FavoriteButton id={a.id} size="sm" className="absolute bottom-2 right-2" />
    </li>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({
  active,
  color,
  onClick,
  children,
}: {
  active: boolean;
  color?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const c = color ?? "var(--foreground)";
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className="rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors"
      style={
        active
          ? { background: c, borderColor: c, color: color ? "white" : "var(--background)" }
          : { borderColor: color ?? "var(--border)", color: c }
      }
    >
      {children}
    </button>
  );
}
