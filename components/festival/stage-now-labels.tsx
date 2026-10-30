"use client";

// 屋外MAP上の「公演中／次の公演」ラベル（SVG の中に置く部品）
// KODAnnai の「地図から検索」と企画マップの両方で使う。
// ラベルの位置は lib/timetable.ts の VENUE_MAP_LABELS（mapX / mapY）。
// 運営ページで入力した中止・時間変更（/api/live）も反映する。

import { useLive } from "@/components/festival/hooks";
import {
  TIMETABLE,
  applyActOverrides,
  getFestivalDay,
  getJstParts,
  toMinutes,
  type StageSchedule,
} from "@/lib/timetable";

type Props = {
  now: Date | null;
  /** ラベルをタップしたとき（企画マップでは会場の詳細を開く）。省略するとタップできない */
  onSelect?: (stage: StageSchedule) => void;
  /** 地図の縮尺に合わせた大きさの係数（企画マップの拡大時に文字が大きくなりすぎないように） */
  k?: number;
};

const truncate = (str: string, n: number) => (str.length > n ? str.slice(0, n) + "…" : str);

export function StageNowLabels({ now, onSelect, k = 1 }: Props) {
  const { live } = useLive();
  if (!now) return null;
  const day = getFestivalDay(now);
  if (!day) return null;
  const minutes = getJstParts(now).minutes;

  return (
    <>
      {TIMETABLE.map((stage) => {
        if (stage.mapX == null || stage.mapY == null) return null;
        const schedule = applyActOverrides(stage.stageId, day, stage[day], live.acts).filter(
          (e) => !e.canceled,
        );
        const current = schedule.find(
          (e) => minutes >= toMinutes(e.start) && minutes < toMinutes(e.end),
        );
        const next = schedule.find((e) => toMinutes(e.start) > minutes);
        const info = current ?? next;
        if (!info) return null;

        const timeLine = current ? `▶ 公演中 ${info.start}-${info.end}` : `次: ${info.start}〜`;
        const bgColor = current ? "rgba(22,163,74,0.88)" : "rgba(202,138,4,0.88)";

        return (
          <g
            key={stage.stageId}
            transform={`translate(${stage.mapX} ${stage.mapY}) scale(${k})`}
            pointerEvents={onSelect ? undefined : "none"}
            className={onSelect ? "cursor-pointer" : undefined}
            role={onSelect ? "button" : undefined}
            aria-label={onSelect ? `${stage.stageName}：${timeLine} ${info.act}` : undefined}
            onClick={
              onSelect
                ? (e) => {
                    e.stopPropagation();
                    onSelect(stage);
                  }
                : undefined
            }
          >
            <rect x={-34} y={0} width={68} height={20} rx={2} fill={bgColor} />
            <text x={0} y={5.5} textAnchor="middle" fontSize={4.2} fill="white" fontFamily="sans-serif">
              {stage.stageName}
            </text>
            <text x={0} y={11.5} textAnchor="middle" fontSize={4.8} fill="white" fontFamily="sans-serif" fontWeight="bold">
              {timeLine}
              {info.changed ? "（変更）" : ""}
            </text>
            <text x={0} y={17.5} textAnchor="middle" fontSize={4.8} fill="white" fontFamily="sans-serif" fontWeight="bold">
              {truncate(info.act, 16)}
            </text>
          </g>
        );
      })}
    </>
  );
}
