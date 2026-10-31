"use client";

// 屋外MAPの建物に付ける「館内MAP ›」の目印（SVG の中に置く部品）
// 企画マップと KODAnnai の「地図から検索」の両方で使う。
// 置く位置は lib/map-spots.ts の OUTDOOR_BUILDINGS の badge。

type Props = {
  x: number;
  y: number;
  /** 地図の拡大率に合わせた大きさの係数 */
  k?: number;
  dark?: boolean;
  /** カーソルが乗っているとき（建物側の hover と連動させる） */
  active?: boolean;
  /** 札の幅・高さ・文字の大きさ（地図の単位） */
  w?: number;
  h?: number;
  fontSize?: number;
};

export function BuildingBadge({
  x,
  y,
  k = 1,
  dark = false,
  active = false,
  w = 25,
  h = 7.2,
  fontSize = 3.9,
}: Props) {
  const fill = dark ? (active ? "#1e3a8a" : "#0f172a") : active ? "#dbeafe" : "#ffffff";
  const stroke = dark ? "#60a5fa" : "#2563eb";
  const text = dark ? "#bfdbfe" : "#1d4ed8";
  return (
    <g transform={`translate(${x} ${y}) scale(${k})`}>
      <rect
        x={-w / 2}
        y={-h / 2}
        width={w}
        height={h}
        rx={h / 2}
        fill={fill}
        stroke={stroke}
        strokeWidth={0.7}
        className="transition-colors"
      />
      <text
        textAnchor="middle"
        y={fontSize * 0.36}
        fontSize={fontSize}
        fontWeight="bold"
        fill={text}
        fontFamily="sans-serif"
      >
        館内MAP ›
      </text>
    </g>
  );
}
