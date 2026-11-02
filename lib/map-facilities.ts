// ==========================================
// 地図のピクトグラム（トイレ・ゴミステーションなど）をタップしたときの施設情報
// ==========================================
// 企画マップ（/map）で、地図SVGに描いてあるピクトグラムの上に透明なタップ領域を置き、
// タップすると施設の名前・役割（トイレなら多目的トイレの有無）と、KODAnnai の経路案内へのボタンを出す。
//
// ■ 位置（x, y, size）
//   地図SVG（viewBox 0 0 295.32 413.16）のピクトグラムの中心と大きさ。
//   地図SVGを差し替えてピクトグラムが動いたら、ここも直す（/map?edit=1 でタップした座標が出る）。
//
// ■ 経路案内の行き先（locationId）
//   app/locations-server.tsx の施設の id（＝経路案内のノード番号）。
//   ピクトグラムの位置と、/route-editor で地図に置いたノードの位置（lib/route-geometry.ts の NODE_POINTS）を
//   照らし合わせて割り当てている。行き先にできる施設がないもの（階段・エレベーター・喫煙所など）は書かない。
//
// ■ 企画の部屋の中にあるピクトグラム（別館1Fのひとつなびラウンジのベンチなど）には置かない（企画の詳細が開く）。
//
// ■ 屋外MAPの、建物の中の施設（各館のトイレ・本館の飲食スペースなど）のピクトグラムには置かない
//   （その建物の地図でタップしてもらう）。

import type { MapId } from "@/lib/map-spots";

export type FacilityKind =
  | "トイレ"
  | "多目的トイレ"
  | "ゴミステーション"
  | "飲料販売所"
  | "休憩所"
  | "飲食スペース"
  | "喫煙所"
  | "救護室"
  | "授乳室"
  | "おむつ替え室"
  | "階段"
  | "エレベーター";

export type MapFacility = {
  id: string;
  map: MapId;
  kind: FacilityKind;
  /** ピクトグラムの中心と大きさ（地図SVGの座標） */
  x: number;
  y: number;
  size: number;
  /** 表示名 */
  name: string;
  /** 建物・階など */
  place: string;
  /** 経路案内の行き先（app/locations-server.tsx の id）。ないものは経路案内のボタンを出さない */
  locationId?: string;
  /** トイレ：多目的トイレの有無 */
  multi?: string;
  /** 施設の役割（短く） */
  note?: string;
};

/** 種類ごとの役割（note を書かなければこれを出す） */
export const FACILITY_ROLE: Record<FacilityKind, string> = {
  トイレ: "男女別のトイレです。",
  多目的トイレ: "車いすの方やお子さま連れの方も使えるトイレです。",
  ゴミステーション: "ゴミを分別して捨てられます（燃えるゴミ・燃えないゴミなど）。",
  飲料販売所: "飲み物を買えます。",
  休憩所: "座って休めます。",
  飲食スペース: "座って飲食や休憩ができます。",
  喫煙所: "喫煙できる場所です。",
  救護室: "けがや体調が悪いときに来てください。",
  授乳室: "授乳に使える部屋です。",
  おむつ替え室: "おむつ替えに使える部屋です。",
  階段: "上の階・下の階へ移動できます。",
  エレベーター: "上の階・下の階へ移動できます。車いすやベビーカーの方はこちらをお使いください。",
};

const MULTI_MAIN = "なし（企画本館1Fにあります）";
const MULTI_BEKKAN = "なし（企画別館1Fにあります）";

export const MAP_FACILITIES: MapFacility[] = [
  // ---------- 屋外 ----------
  { id: "out-smoking", map: "outdoor", kind: "喫煙所", x: 22.3, y: 221.3, size: 10.2, name: "喫煙所", place: "北サークルロードの西のはし" },
  { id: "out-drink", map: "outdoor", kind: "飲料販売所", x: 101.2, y: 222.9, size: 10.2, name: "飲料販売所", place: "KODAステージ前", locationId: "110" },
  { id: "out-trash-north", map: "outdoor", kind: "ゴミステーション", x: 91, y: 243, size: 10.2, name: "ゴミステーション", place: "北サークルロード", locationId: "106" },
  { id: "out-rest-stage", map: "outdoor", kind: "休憩所", x: 104.9, y: 243, size: 10.2, name: "メインステージ前休憩所", place: "北サークルロード", locationId: "105" },
  { id: "out-trash-rotary", map: "outdoor", kind: "ゴミステーション", x: 175.4, y: 265, size: 10.2, name: "ゴミステーション", place: "クラス模擬店ロータリー（企画本館の前）", locationId: "39" },
  { id: "out-trash-road", map: "outdoor", kind: "ゴミステーション", x: 212, y: 302.8, size: 10.2, name: "ゴミステーション", place: "クラス模擬店ロード", locationId: "42" },
  { id: "out-rest-family", map: "outdoor", kind: "休憩所", x: 221.8, y: 328.4, size: 10.2, name: "ファミリーエリア休憩所", place: "ファミリーエリア", locationId: "43", note: "座って休めます（晴れた日だけ）。" },

  // ---------- 企画本館 ----------
  { id: "main-1f-wc", map: "main", kind: "トイレ", x: 60, y: 104.7, size: 8.6, name: "企画本館1F 男女トイレ", place: "企画本館 1F", locationId: "61", multi: "あり（すぐとなり）" },
  { id: "main-1f-multi", map: "main", kind: "多目的トイレ", x: 60.3, y: 113.6, size: 8.8, name: "企画本館1F 多目的トイレ", place: "企画本館 1F", locationId: "60", multi: "あり" },
  { id: "main-1f-wc-ev", map: "main", kind: "トイレ", x: 61.5, y: 180.7, size: 8.6, name: "企画本館1F 男女トイレ（エレベーター付近）", place: "企画本館 1F", locationId: "64", multi: "なし（同じ1Fの反対側にあります）" },
  { id: "main-2f-wc", map: "main", kind: "トイレ", x: 199.6, y: 181, size: 9, name: "企画本館2F 男女トイレ", place: "企画本館 2F", locationId: "73", multi: MULTI_MAIN },
  { id: "main-3f-wc", map: "main", kind: "トイレ", x: 60.5, y: 306.7, size: 9, name: "企画本館3F 男女トイレ", place: "企画本館 3F", locationId: "84", multi: MULTI_MAIN },
  { id: "main-4f-wc", map: "main", kind: "トイレ", x: 199.5, y: 306.7, size: 9, name: "企画本館4F 男女トイレ", place: "企画本館 4F", locationId: "94", multi: MULTI_MAIN },
  { id: "main-drink", map: "main", kind: "飲料販売所", x: 93.4, y: 131.3, size: 11.6, name: "飲料販売所", place: "企画本館 1F 飲食スペース", locationId: "58" },
  { id: "main-eat", map: "main", kind: "飲食スペース", x: 93.3, y: 143.2, size: 11.6, name: "飲食スペース", place: "企画本館 1F（吹き抜け）", locationId: "59" },
  { id: "main-trash", map: "main", kind: "ゴミステーション", x: 93.4, y: 155.6, size: 11.6, name: "ゴミステーション", place: "企画本館 1F 飲食スペース", locationId: "57" },
  { id: "main-1f-stairs-a", map: "main", kind: "階段", x: 58.5, y: 130.2, size: 9, name: "階段", place: "企画本館 1F" },
  { id: "main-1f-stairs-b", map: "main", kind: "階段", x: 62.3, y: 157.5, size: 9, name: "階段", place: "企画本館 1F" },
  { id: "main-1f-ev", map: "main", kind: "エレベーター", x: 54, y: 156.5, size: 8, name: "エレベーター", place: "企画本館 1F（1F〜4F）" },
  { id: "main-2f-stairs-a", map: "main", kind: "階段", x: 199.1, y: 131.6, size: 9, name: "階段", place: "企画本館 2F" },
  { id: "main-2f-stairs-b", map: "main", kind: "階段", x: 203.3, y: 156.8, size: 9, name: "階段", place: "企画本館 2F" },
  { id: "main-2f-ev", map: "main", kind: "エレベーター", x: 194.9, y: 155, size: 8, name: "エレベーター", place: "企画本館 2F（1F〜4F）" },
  { id: "main-3f-stairs-a", map: "main", kind: "階段", x: 59, y: 258.3, size: 9, name: "階段", place: "企画本館 3F" },
  { id: "main-3f-stairs-b", map: "main", kind: "階段", x: 65.1, y: 283.1, size: 9, name: "階段", place: "企画本館 3F" },
  { id: "main-3f-ev", map: "main", kind: "エレベーター", x: 56.8, y: 281.7, size: 8, name: "エレベーター", place: "企画本館 3F（1F〜4F）" },
  { id: "main-4f-stairs-a", map: "main", kind: "階段", x: 199.8, y: 258.3, size: 9, name: "階段", place: "企画本館 4F" },
  { id: "main-4f-stairs-b", map: "main", kind: "階段", x: 205.2, y: 283.9, size: 9, name: "階段", place: "企画本館 4F" },
  { id: "main-4f-ev", map: "main", kind: "エレベーター", x: 196.4, y: 283.2, size: 8, name: "エレベーター", place: "企画本館 4F（1F〜4F）" },

  // ---------- 企画別館 ----------
  { id: "bekkan-1f-wc", map: "bekkan", kind: "トイレ", x: 55.9, y: 136.6, size: 10.9, name: "企画別館1F 男女トイレ", place: "企画別館 1F", locationId: "99", multi: "あり（同じ1F）" },
  { id: "bekkan-1f-wc2", map: "bekkan", kind: "トイレ", x: 46.6, y: 160.5, size: 10.9, name: "企画別館1F 男女トイレ", place: "企画別館 1F", locationId: "99", multi: "あり（すぐとなり）" },
  { id: "bekkan-1f-multi", map: "bekkan", kind: "多目的トイレ", x: 60.4, y: 160.5, size: 11.1, name: "企画別館1F 多目的トイレ", place: "企画別館 1F", locationId: "98", multi: "あり" },
  { id: "bekkan-2f-wc", map: "bekkan", kind: "トイレ", x: 59.2, y: 269.6, size: 10.9, name: "企画別館2F 男女トイレ", place: "企画別館 2F", locationId: "102", multi: MULTI_BEKKAN },
  { id: "bekkan-3f-wc", map: "bekkan", kind: "トイレ", x: 204.8, y: 260.7, size: 10.9, name: "企画別館3F 男女トイレ", place: "企画別館 3F", locationId: "104", multi: MULTI_BEKKAN },
  { id: "bekkan-1f-stairs-a", map: "bekkan", kind: "階段", x: 38.5, y: 136.2, size: 11.3, name: "階段", place: "企画別館 1F" },
  { id: "bekkan-1f-stairs-b", map: "bekkan", kind: "階段", x: 87.7, y: 132.9, size: 11.3, name: "階段", place: "企画別館 1F" },
  { id: "bekkan-1f-ev", map: "bekkan", kind: "エレベーター", x: 66, y: 136.3, size: 8, name: "エレベーター", place: "企画別館 1F（1F〜3F）" },
  { id: "bekkan-2f-stairs-a", map: "bekkan", kind: "階段", x: 44.3, y: 266.2, size: 11.3, name: "階段", place: "企画別館 2F" },
  { id: "bekkan-2f-stairs-b", map: "bekkan", kind: "階段", x: 87.7, y: 265.5, size: 11.3, name: "階段", place: "企画別館 2F" },
  { id: "bekkan-2f-ev", map: "bekkan", kind: "エレベーター", x: 69, y: 270.6, size: 8, name: "エレベーター", place: "企画別館 2F（1F〜3F）" },
  { id: "bekkan-3f-stairs-a", map: "bekkan", kind: "階段", x: 193.3, y: 268.4, size: 11.3, name: "階段", place: "企画別館 3F" },
  { id: "bekkan-3f-stairs-b", map: "bekkan", kind: "階段", x: 242.9, y: 264.6, size: 11.3, name: "階段", place: "企画別館 3F" },
  { id: "bekkan-3f-ev", map: "bekkan", kind: "エレベーター", x: 214.4, y: 262.1, size: 8, name: "エレベーター", place: "企画別館 3F（1F〜3F）" },

  // ---------- ちびっこ館 ----------
  { id: "chibikko-wc", map: "chibikko", kind: "トイレ", x: 78.9, y: 110.1, size: 10.9, name: "ちびっこ館トイレ", place: "ちびっこ館 1F", locationId: "46", multi: "なし（企画本館1F・企画別館1Fにあります）" },
  { id: "chibikko-aid", map: "chibikko", kind: "救護室", x: 125.2, y: 123.7, size: 11.1, name: "救護室", place: "ちびっこ館 1F", locationId: "48" },
  { id: "chibikko-nursing", map: "chibikko", kind: "授乳室", x: 124.9, y: 161.9, size: 11.1, name: "授乳室", place: "ちびっこ館 1F", locationId: "49" },
  { id: "chibikko-diaper", map: "chibikko", kind: "おむつ替え室", x: 86.2, y: 161.3, size: 9.3, name: "おむつ替え室", place: "ちびっこ館 1F", locationId: "50" },
  { id: "chibikko-1f-stairs-a", map: "chibikko", kind: "階段", x: 93, y: 109.7, size: 11.6, name: "階段", place: "ちびっこ館 1F" },
  { id: "chibikko-1f-stairs-b", map: "chibikko", kind: "階段", x: 45.8, y: 176.7, size: 11.3, name: "階段", place: "ちびっこ館 1F" },
  { id: "chibikko-2f-stairs-a", map: "chibikko", kind: "階段", x: 240.1, y: 112.2, size: 11.3, name: "階段", place: "ちびっこ館 2F" },
  { id: "chibikko-2f-stairs-b", map: "chibikko", kind: "階段", x: 195.9, y: 175, size: 11.3, name: "階段", place: "ちびっこ館 2F" },
];

export function getFacility(id: string): MapFacility | undefined {
  return MAP_FACILITIES.find((f) => f.id === id);
}
