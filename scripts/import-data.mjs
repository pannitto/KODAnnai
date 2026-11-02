#!/usr/bin/env node
// ==========================================
// 企画データの取り込み（CSV → JSON）
// ==========================================
// 使い方:  npm run import-data
//
//   data/kikaku.csv     … 1行1企画（Googleフォームの回答スプレッドシートをCSVで書き出したもの）
//   data/timetable.csv  … 1行1公演（団体名・紹介文・画像・SNS の列は任意。ステージ・フィールドの公演の紹介に使う）
//   data/images/        … フォームで集めた画像（「画像」列にファイル名を書いたものだけ使う）
//
// チェックに通ると data/kikaku.json と data/timetable.json を作り直す（サイトはこのJSONを読む）。
// エラーがあると何も書き換えずに終了する。警告は書き換えるが確認してほしいもの。
//
// スプレッドシートに余分な列（タイムスタンプ・メールアドレスなど）があっても無視する。
// 列の名前（1行目）は下の COLUMNS と同じにすること。

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "data");

// ---------- CSV ----------
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  text = text.replace(/^﻿/, ""); // Excel の BOM
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...body] = rows.filter((r) => r.some((v) => v.trim() !== ""));
  return body.map((r, i) => ({
    line: i + 2,
    get: (name) => (r[header.indexOf(name)] ?? "").trim(),
    has: (name) => header.includes(name),
    header,
  }));
}

const list = (v) =>
  v
    .split(/[;；、\n]/)
    .map((s) => s.trim())
    .filter(Boolean);

// ---------- 決まりごと ----------
// ジャンルは lib/categories.ts の EVENT_CATEGORIES と同じもの（ここで読み取る）
const categoriesSrc = fs.readFileSync(path.join(ROOT, "lib/categories.ts"), "utf8");
const GENRES = [
  ...categoriesSrc
    .match(/EVENT_CATEGORIES = \[([\s\S]*?)\]/)[1]
    .matchAll(/"([^"]+)"/g),
].map((m) => m[1]);
const DAYS = ["両日", "1日目", "2日目"];
const CONDITIONS = ["受験生向け", "ちびっこ向け", "雨でも楽しめる"];
const TIME = /^([01]?\d|2[0-3]):[0-5]\d$/;

const errors = [];
const warnings = [];
const err = (file, line, msg) => errors.push(`${file} ${line}行目: ${msg}`);
const warn = (file, line, msg) => warnings.push(`${file} ${line}行目: ${msg}`);

// ---------- 企画 ----------
const KIKAKU_COLUMNS = [
  // 委員会が書く列
  "ID",
  "ノード番号",
  "場所区分",
  "場所",
  "検索キーワード",
  // 団体が書く列（フォームの設問名と同じにする）
  "企画名",
  "団体名",
  "ジャンル",
  "開催日",
  "時間",
  "紹介文",
  "滞在の目安",
  "条件",
  "SNS",
  "画像",
];

const kikakuRows = parseCsv(fs.readFileSync(path.join(DATA, "kikaku.csv"), "utf8"));
if (kikakuRows.length) {
  const missing = KIKAKU_COLUMNS.filter((c) => !kikakuRows[0].has(c));
  if (missing.length) errors.push(`kikaku.csv: 列が足りません → ${missing.join("、")}`);
}

const ids = new Set();
const imagesDir = path.join(DATA, "images");
const publicImages = path.join(ROOT, "public", "kikaku");
const imageCopies = [];

const kikaku = kikakuRows.map((r) => {
  const F = "kikaku.csv";
  const id = r.get("ID");
  const title = r.get("企画名");
  if (!id) err(F, r.line, "ID が空です（委員会が決めて記入）");
  else if (ids.has(id)) err(F, r.line, `ID「${id}」が重複しています`);
  ids.add(id);
  if (!title) err(F, r.line, "企画名が空です");

  const node = r.get("ノード番号");
  if (!node) warn(F, r.line, `「${title}」のノード番号が空です（KODAnnaiで経路案内できません）`);
  else if (!/^\d+$/.test(node)) err(F, r.line, `ノード番号「${node}」は数字で書いてください`);

  const area = r.get("場所区分");
  if (!area) err(F, r.line, `「${title}」の場所区分が空です（例: 1302、クラス模擬店ロータリー）`);

  const category = r.get("ジャンル") || "その他";
  if (!GENRES.includes(category))
    err(F, r.line, `ジャンル「${category}」は使えません（使えるもの: ${GENRES.join("、")}）`);

  const days = r.get("開催日") || "両日";
  if (!DAYS.includes(days)) err(F, r.line, `開催日「${days}」は 両日／1日目／2日目 のどれかにしてください`);

  const conditions = list(r.get("条件"));
  for (const c of conditions)
    if (!CONDITIONS.includes(c)) err(F, r.line, `条件「${c}」は使えません（${CONDITIONS.join("、")}）`);

  const desc = r.get("紹介文");
  if (desc.length > 100) warn(F, r.line, `「${title}」の紹介文が${desc.length}字あります（カードでは途中で切れます）`);

  // 画像: URL ならそのまま、ファイル名なら data/images から public/kikaku/ID.拡張子 にコピー
  let image = r.get("画像");
  if (image && !/^https?:\/\//.test(image)) {
    const src = path.join(imagesDir, image);
    if (!fs.existsSync(src)) {
      warn(F, r.line, `画像「${image}」が data/images にありません（画像なしで続けます）`);
      image = "";
    } else {
      const dest = `${id}${path.extname(image).toLowerCase()}`;
      imageCopies.push([src, path.join(publicImages, dest)]);
      image = `/kikaku/${dest}`;
    }
  }

  const sns = r.get("SNS");
  if (sns && !/^https?:\/\//.test(sns)) warn(F, r.line, `SNS「${sns}」がURLではありません`);

  return {
    id,
    node,
    area,
    place: r.get("場所"),
    keywords: list(r.get("検索キーワード")),
    title,
    org: r.get("団体名"),
    category,
    days,
    hours: r.get("時間").replace(/<br\s*\/?>/g, "\n"),
    desc: desc.replace(/<br\s*\/?>/g, "\n"),
    stay: r.get("滞在の目安"),
    conditions,
    sns,
    image,
  };
});

// ---------- 公演 ----------
const ttRows = parseCsv(fs.readFileSync(path.join(DATA, "timetable.csv"), "utf8"));
const timetable = ttRows.map((r) => {
  const F = "timetable.csv";
  const venueId = r.get("会場ID");
  const day = r.get("日");
  const start = r.get("開始");
  const end = r.get("終了");
  const kikakuIds = list(r.get("企画ID"));
  if (!venueId) err(F, r.line, "会場ID が空です");
  if (!["1日目", "2日目"].includes(day)) err(F, r.line, `日「${day}」は 1日目／2日目 にしてください`);
  if (!TIME.test(start) || !TIME.test(end)) err(F, r.line, `時刻は 13:05 の形で書いてください（${start}〜${end}）`);
  else if (start.padStart(5, "0") >= end.padStart(5, "0"))
    err(F, r.line, `終了（${end}）が開始（${start}）より前です`);
  for (const k of kikakuIds) if (!ids.has(k)) err(F, r.line, `企画ID「${k}」が kikaku.csv にありません`);
  if (!r.get("演目")) warn(F, r.line, "演目が空です");

  // 公演の紹介（任意）。画像はファイル名なら data/images から public/kikaku/act-会場-日-時刻.拡張子 にコピー
  let actImage = r.get("画像");
  if (actImage && !/^https?:\/\//.test(actImage)) {
    const src = path.join(imagesDir, actImage);
    if (!fs.existsSync(src)) {
      warn(F, r.line, `画像「${actImage}」が data/images にありません（画像なしで続けます）`);
      actImage = "";
    } else {
      const dest = `act-${venueId}-${day === "2日目" ? "day2" : "day1"}-${start.replace(":", "")}${path.extname(actImage).toLowerCase()}`;
      imageCopies.push([src, path.join(publicImages, dest)]);
      actImage = `/kikaku/${dest}`;
    }
  }
  const actSns = r.get("SNS");
  if (actSns && !/^https?:\/\//.test(actSns)) warn(F, r.line, `SNS「${actSns}」がURLではありません`);

  return {
    venueId,
    venueName: r.get("会場名") || venueId,
    kikakuIds,
    day: day === "2日目" ? "day2" : "day1",
    start: start.padStart(5, "0"),
    end: end.padStart(5, "0"),
    act: r.get("演目"),
    org: r.get("団体名"),
    desc: r.get("紹介文").replace(/<br\s*\/?>/g, "\n"),
    image: actImage,
    sns: actSns,
  };
});

// 同じ会場・同じ日で時間が重なっている公演
const byVenueDay = new Map();
for (const t of timetable) {
  const key = `${t.venueId}|${t.day}`;
  byVenueDay.set(key, [...(byVenueDay.get(key) ?? []), t]);
}
for (const acts of byVenueDay.values()) {
  acts.sort((a, b) => a.start.localeCompare(b.start));
  for (let i = 1; i < acts.length; i++)
    if (acts[i].start < acts[i - 1].end)
      warnings.push(
        `timetable.csv: ${acts[i].venueName}（${acts[i].day === "day1" ? "1日目" : "2日目"}）の「${acts[i - 1].act}」と「${acts[i].act}」の時間が重なっています`,
      );
}

// ---------- 結果 ----------
for (const w of warnings) console.warn("⚠️  " + w);
if (errors.length) {
  for (const e of errors) console.error("❌ " + e);
  console.error(`\nエラーが${errors.length}件あります。JSON は書き換えていません。`);
  process.exit(1);
}

fs.mkdirSync(publicImages, { recursive: true });
for (const [src, dest] of imageCopies) fs.copyFileSync(src, dest);
fs.writeFileSync(path.join(DATA, "kikaku.json"), JSON.stringify(kikaku, null, 2) + "\n");
fs.writeFileSync(path.join(DATA, "timetable.json"), JSON.stringify(timetable, null, 2) + "\n");
console.log(
  `✅ 企画 ${kikaku.length}件、公演 ${timetable.length}件を取り込みました（警告 ${warnings.length}件、画像コピー ${imageCopies.length}件）`,
);
