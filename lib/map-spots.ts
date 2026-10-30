// ==========================================
// 企画マップ（/map）のスポット定義
// ==========================================
// 座標はすべて地図SVGの viewBox（0 0 295.32 413.16）の単位。
// 位置を調べたいときは /map?edit=1 を開いて地図をタップすると座標が出ます。
//
// shape:
//   "pin"  … x, y に丸を置く（屋外のエリアなど）
//   "rect" … x, y, w, h の四角で部屋を塗る（教室など。部屋全体がタップできる）
//   "area" … 地図にもともと描いてある「KODAステージ」などのピンクの四角をそのままボタンにする
//            （サイト側では何も描き足さず、カーソルを合わせたとき・タップしたときだけ色が濃くなる）
// locationIds: このスポットに入る企画（LOCATIONS の id）。
//   1つならタップで詳細、複数ならタップで一覧が出ます。

export type MapId = "outdoor" | "main" | "bekkan" | "chibikko";

export const MAPS: {
  id: MapId;
  label: string;
  image: string;
}[] = [
  // 屋外は GRAND_MAP_fornavigate.svg から「オレンジの丸」と「操作説明」を除いたもの。
  // 画像を差し替えたら ?v= の日付も変える（ブラウザが古い画像を使い続けないように）
  // GRAND_MAP.svg は文字がフォント指定のままで、端末によって文字の大きさが変わるため使わない。
  { id: "outdoor", label: "屋外", image: "/GRAND_MAP_kikaku.svg?v=20261031-1" },
  { id: "main", label: "企画本館", image: "/Main_building_MAP.svg" },
  { id: "bekkan", label: "企画別館", image: "/Bekkan_MAP.svg" },
  { id: "chibikko", label: "ちびっこ館", image: "/Chibikko_MAP.svg" },
];

export const MAP_VIEWBOX = { width: 295.32, height: 413.16 };

export type MapSpot = {
  id: string;
  map: MapId;
  label: string;
  locationIds: string[];
} & (
  | { shape: "pin"; x: number; y: number }
  | { shape: "rect" | "area"; x: number; y: number; w: number; h: number }
);

export const MAP_SPOTS: MapSpot[] = [
  // ---------------- 屋外 ----------------
  { id: "seimon", map: "outdoor", shape: "pin", x: 146, y: 372, label: "正門通り", locationIds: ["5", "6", "7", "122", "123"] },
  // 地図に描いてあるピンクの四角（インフォ・パンフレット・ステージ類）を、そのままタップ範囲にする
  { id: "info", map: "outdoor", shape: "area", x: 116, y: 336, w: 13, h: 25, label: "インフォメーションセンター", locationIds: ["2"] },
  { id: "pamphlet", map: "outdoor", shape: "area", x: 116, y: 374, w: 13, h: 31, label: "パンフレット配布テント", locationIds: ["1"] },
  { id: "rotary", map: "outdoor", shape: "pin", x: 136, y: 299, label: "クラス模擬店ロータリー", locationIds: ["8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31", "32"] },
  { id: "road", map: "outdoor", shape: "pin", x: 184, y: 297, label: "クラス模擬店ロード", locationIds: ["33", "34", "35", "36", "37", "38"] },
  { id: "koda-stage", map: "outdoor", shape: "area", x: 124, y: 217, w: 29, h: 16, label: "KODAステージ", locationIds: ["40"] },
  { id: "kita-circle", map: "outdoor", shape: "pin", x: 79, y: 243, label: "北サークルロード", locationIds: ["107", "108"] },
  { id: "minami-circle", map: "outdoor", shape: "pin", x: 175, y: 235, label: "南サークルロード", locationIds: ["111", "112", "113", "114", "115", "116", "117"] },
  { id: "family", map: "outdoor", shape: "pin", x: 229, y: 305, label: "ファミリーエリア", locationIds: ["44", "45"] },
  { id: "field", map: "outdoor", shape: "area", x: 198.7, y: 333, w: 28, h: 12.3, label: "フィールド", locationIds: ["41"] },
  { id: "gym-stage", map: "outdoor", shape: "area", x: 43.5, y: 114.5, w: 15, h: 29, label: "体育館ステージ", locationIds: ["121"] },

  // ---------------- 企画本館 ----------------
  // 1F
  { id: "lobby", map: "main", shape: "rect", x: 22, y: 98, w: 24, h: 36, label: "企画本館ロビー", locationIds: ["62"] },
  { id: "1101", map: "main", shape: "rect", x: 22, y: 153, w: 24, h: 37, label: "1101", locationIds: ["63"] },
  // 2F
  { id: "1201", map: "main", shape: "rect", x: 161, y: 98, w: 23, h: 46, label: "1201", locationIds: ["65"] },
  { id: "1202", map: "main", shape: "rect", x: 161, y: 145, w: 23, h: 45, label: "1202", locationIds: ["66"] },
  { id: "1203", map: "main", shape: "rect", x: 205, y: 170, w: 19, h: 20, label: "1203", locationIds: ["67"] },
  { id: "1204", map: "main", shape: "rect", x: 224, y: 170, w: 19, h: 20, label: "1204", locationIds: ["68", "168"] },
  { id: "1207", map: "main", shape: "rect", x: 251, y: 148, w: 26, h: 15, label: "1207", locationIds: ["69"] },
  { id: "1208", map: "main", shape: "rect", x: 251, y: 133, w: 26, h: 15, label: "1208", locationIds: ["70"] },
  { id: "1209", map: "main", shape: "rect", x: 251, y: 118, w: 26, h: 15, label: "1209", locationIds: ["71", "95"] },
  { id: "1210", map: "main", shape: "rect", x: 207, y: 98, w: 21, h: 21, label: "1210", locationIds: ["72"] },
  // 3F
  { id: "1301", map: "main", shape: "rect", x: 22, y: 224, w: 24, h: 32, label: "1301", locationIds: ["74", "96"] },
  { id: "1302", map: "main", shape: "rect", x: 22, y: 256, w: 24, h: 14, label: "1302", locationIds: ["75"] },
  { id: "1303", map: "main", shape: "rect", x: 22, y: 270, w: 24, h: 15, label: "1303", locationIds: ["76"] },
  { id: "1304", map: "main", shape: "rect", x: 22, y: 285, w: 24, h: 31, label: "1304", locationIds: ["77"] },
  { id: "1305", map: "main", shape: "rect", x: 66, y: 296, w: 19, h: 20, label: "1305", locationIds: ["78"] },
  { id: "1306", map: "main", shape: "rect", x: 85, y: 296, w: 19, h: 20, label: "1306", locationIds: ["79"] },
  { id: "1310", map: "main", shape: "rect", x: 112, y: 279, w: 26, h: 8, label: "1310", locationIds: ["80"] },
  { id: "1311", map: "main", shape: "rect", x: 112, y: 270, w: 26, h: 9, label: "1311", locationIds: ["81"] },
  { id: "1317", map: "main", shape: "rect", x: 85, y: 225, w: 19, h: 20, label: "1317", locationIds: ["82"] },
  { id: "1318", map: "main", shape: "rect", x: 66, y: 225, w: 19, h: 20, label: "1318", locationIds: ["83"] },
  // 4F
  { id: "1401", map: "main", shape: "rect", x: 161, y: 224, w: 23, h: 27, label: "1401", locationIds: ["85"] },
  { id: "4f-rouka", map: "main", shape: "pin", x: 189, y: 250, label: "企画本館4F廊下", locationIds: ["86"] },
  { id: "1403", map: "main", shape: "rect", x: 161, y: 268, w: 23, h: 16, label: "1403", locationIds: ["87"] },
  { id: "1404", map: "main", shape: "rect", x: 161, y: 284, w: 23, h: 15, label: "1404", locationIds: ["88", "89"] },
  { id: "1405", map: "main", shape: "rect", x: 161, y: 299, w: 23, h: 17, label: "1405", locationIds: ["90", "91", "92"] },
  { id: "1406", map: "main", shape: "rect", x: 205, y: 296, w: 27, h: 20, label: "1406", locationIds: ["93"] },

  // ---------------- 企画別館 ----------------
  { id: "bekkan-lounge", map: "bekkan", shape: "rect", x: 86, y: 149, w: 23, h: 24, label: "企画別館 ラウンジ", locationIds: ["97"] },
  { id: "2203", map: "bekkan", shape: "rect", x: 19, y: 221, w: 43, h: 24, label: "2203", locationIds: ["100"] },
  { id: "2205", map: "bekkan", shape: "rect", x: 93, y: 260, w: 37, h: 19, label: "2205", locationIds: ["101"] },
  { id: "2301", map: "bekkan", shape: "rect", x: 194, y: 288, w: 68, h: 37, label: "2301", locationIds: ["103"] },

  // ---------------- ちびっこ館 ----------------
  { id: "chibikko-2f", map: "chibikko", shape: "pin", x: 225, y: 140, label: "ちびっこ館2F", locationIds: ["51", "52", "53", "54"] },
];

/** 屋外MAP上の建物（タップでその建物のMAPへ切り替え） */
export const OUTDOOR_BUILDINGS: {
  map: MapId;
  label: string;
  paths: string[];
  /** 「館内MAP」の目印を置く位置（タップで館内の地図に切り替わることを示す） */
  badge: { x: number; y: number };
}[] = [
  {
    map: "main",
    label: "企画本館",
    badge: { x: 229, y: 246 },
    paths: [
      "M242.25,239.53v61c-18.98.1-42.34.37-61.32.47,0-8.18,0-13.98,0-22.16-2.01-.07-5.44.07-7.45,0,0-4.65,0-10.29,0-14.94,2.01-.06,5.44.06,7.45,0,0-8.14,0-15.68,0-23.82,18.98,0,42.34-.55,61.32-.55Z",
    ],
  },
  {
    map: "bekkan",
    label: "企画別館",
    badge: { x: 149, y: 173 },
    paths: [
      "M123.85,216.76H153.21V188.76H162.24V167.01H112.13V188.26H123.85Z",
    ],
  },
  {
    map: "chibikko",
    label: "ちびっこ館",
    badge: { x: 264, y: 314 },
    paths: [
      "M223.26,341.22c.67,2.41,1.35,4.82,2.02,7.23,2.14-.42,4.28-.85,6.42-1.27,3.9,3.03,7.8,6.06,11.7,9.09,11.27-.13,22.54-.25,33.81-.38.03-16.47.07-32.93.10-49.4-5.86,0-11.72,0-17.58,0v9.31c-7.53-.23-15.06-.47-22.59-.70.56,2.2,1.43,6.89-.32,12.24-3.16,9.64-12.18,13.34-13.56,13.88Z",
    ],
  },
];

export function findSpotByLocationId(locationId: string): MapSpot | undefined {
  return MAP_SPOTS.find((s) => s.locationIds.includes(locationId));
}
