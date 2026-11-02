"use client";

// 地図のピクトグラム（トイレ・ゴミステーションなど）をタップしたときの施設情報（lib/map-facilities.ts）

import Link from "next/link";
import { Accessibility, MapPin, Navigation, Info } from "lucide-react";
import { getLocationById } from "@/app/locations-server";
import { getNavigateUrl } from "@/lib/kikaku";
import { FACILITY_ROLE, getFacility } from "@/lib/map-facilities";

export function FacilityDetail({ id }: { id: string }) {
  const f = getFacility(id);
  if (!f) return <p className="py-6 text-center text-sm">施設が見つかりませんでした</p>;
  const loc = f.locationId ? getLocationById(f.locationId) : undefined;
  const isToilet = f.kind === "トイレ" || f.kind === "多目的トイレ";

  return (
    <div className="pt-2">
      <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
        {f.kind}
      </span>
      <h2 className="mt-2 pr-8 text-xl font-bold leading-snug">{f.name}</h2>

      <dl className="mt-4 space-y-2 text-sm">
        <Row icon={<MapPin className="h-4 w-4" />} label="場所">
          {f.place}
        </Row>
        {isToilet && f.multi && (
          <Row icon={<Accessibility className="h-4 w-4" />} label="多目的トイレ">
            {f.multi}
          </Row>
        )}
        <Row icon={<Info className="h-4 w-4" />} label="どんな所">
          {f.note ?? FACILITY_ROLE[f.kind]}
        </Row>
      </dl>

      <div className="mt-5">
        {loc ? (
          <Link
            href={getNavigateUrl(loc)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-base font-bold text-white shadow-sm active:bg-orange-600"
          >
            <Navigation className="h-5 w-5" />
            KODAnnaiでここへ行く
          </Link>
        ) : (
          f.kind !== "階段" &&
          f.kind !== "エレベーター" && (
            <p className="rounded-xl bg-card px-3 py-2 text-xs text-muted-foreground">
              この場所は、KODAnnai の経路案内の行き先には入っていません。
            </p>
          )
        )}
      </div>
    </div>
  );
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="flex w-28 flex-shrink-0 items-center gap-1.5 text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="min-w-0 flex-1">{children}</dd>
    </div>
  );
}
