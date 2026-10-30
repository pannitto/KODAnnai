"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Navigation, Map, Users, CalendarClock, Megaphone } from "lucide-react";
import { useLive } from "@/components/festival/hooks";

const ITEMS = [
  { href: "/", label: "KODAnnai", icon: Navigation },
  { href: "/map", label: "マップ", icon: Map },
  { href: "/groups", label: "団体紹介", icon: Users },
  { href: "/timetable", label: "タイムテーブル", icon: CalendarClock },
];

/** ページ上部の切り替えタブ（KODAnnai／マップ／団体紹介／タイムテーブル）と、運営からのお知らせ */
export function SiteNav() {
  const pathname = usePathname();
  const { live } = useLive();
  return (
    <>
    <nav
      aria-label="ページ切り替え"
      className="mx-auto mt-3 grid max-w-md grid-cols-4 gap-1 rounded-xl border border-border bg-card p-1 shadow-sm"
    >
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex flex-col items-center gap-0.5 whitespace-nowrap rounded-lg px-0.5 py-1.5 text-[10.5px] font-medium leading-tight transition-colors ${
              active
                ? "bg-background text-foreground shadow-sm dark:bg-gray-800"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
    {live.notice && (
      <div
        role="status"
        className="mx-auto mt-2 flex max-w-md gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100"
      >
        <Megaphone className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
        <p className="whitespace-pre-wrap">
          <span className="sr-only">お知らせ：</span>
          {live.notice.text}
        </p>
      </div>
    )}
    </>
  );
}
