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
import { searchKikaku } from "@/lib/search";
import { getFestivalDay } from "@/lib/timetable";

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

  const results = useMemo(() => {
    const filtered = KIKAKU_LIST.filter((loc) => {
      if (genre !== "すべて" && getGenre(loc) !== genre) return false;
      if (conds.some((c) => !getConditions(loc).includes(c))) return false;
      if (day !== "すべて" && getDays(loc) !== "両日" && getDays(loc) !== day) return false;
      if (place === "屋外" && isIndoor(loc)) return false;
      if (place === "屋内" && !isIndoor(loc)) return false;
      if (
        (place === "企画本館" || place === "企画別館" || place === "ちびっこ館") &&
        getArea(loc) !== place
      )
        return false;
      return true;
    });
    return searchKikaku(filtered, query);
  }, [query, genre, conds, day, place]);

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
          {results.map((loc) => {
            const g = getGenre(loc);
            const desc = getDescription(loc);
            const organizer = getOrganizer(loc);
            const days = getDays(loc);
            return (
              <li key={loc.id}>
                <button
                  type="button"
                  onClick={() => setSheet({ mode: "detail", id: loc.id })}
                  className="flex w-full gap-3 rounded-xl border border-border bg-card p-3 text-left shadow-sm transition-colors hover:bg-background"
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
                    {desc && <span className="mt-1 line-clamp-2 block text-xs">{desc}</span>}
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
