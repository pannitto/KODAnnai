// ==========================================
// 当日の上書き情報API（待ち時間・ステージ公演の変更・お知らせ）
// ==========================================
// GET  /api/live  → LiveData（lib/live.ts）
// POST /api/live  → 運営ページ /admin から更新
//      header: x-admin-key: <WAIT_ADMIN_KEY>
//      body  : { type: "wait",   id: "75", level: "15" | null }
//              { type: "act",    key: "gym|day1|10:00", canceled?: true, start?: "10:15", end?: "11:45", note?: "..." } （clear: true で元に戻す）
//              { type: "notice", text: "..." }  （空文字で消す）
//
// 保存先：Upstash Redis（Vercel の Storage → Upstash を Connect すると
//   UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
//   または KV_REST_API_URL / KV_REST_API_TOKEN が自動で入る）
// どちらも無い場合はサーバーのメモリに保存（ローカル確認用。本番では消えることがある）
//
// 運営ページのパスワード：環境変数 WAIT_ADMIN_KEY

import { NextResponse } from "next/server";
import { LOCATIONS } from "@/app/locations-server";
import { isWaitLevel } from "@/lib/wait-times";
import type { LiveData } from "@/lib/live";

export const dynamic = "force-dynamic";

const KEYS = { waits: "kodannai:wait", acts: "kodannai:acts", notice: "kodannai:notice" } as const;
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "";
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "";
const useRedis = !!(REDIS_URL && REDIS_TOKEN);

// Redis がないとき用のメモリ保存
const mem = globalThis as unknown as { __kodannaiLive?: Record<string, Record<string, string>> };
const memStore = () => (mem.__kodannaiLive ??= { [KEYS.waits]: {}, [KEYS.acts]: {}, [KEYS.notice]: {} });

async function redis(command: (string | number)[]): Promise<unknown> {
  const res = await fetch(REDIS_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`redis ${res.status}`);
  const json = (await res.json()) as { result?: unknown; error?: string };
  if (json.error) throw new Error(json.error);
  return json.result;
}

async function hgetall(key: string): Promise<Record<string, unknown>> {
  let flat: Record<string, string>;
  if (useRedis) {
    const arr = ((await redis(["HGETALL", key])) as string[] | null) ?? [];
    flat = {};
    for (let i = 0; i < arr.length; i += 2) flat[arr[i]] = arr[i + 1];
  } else flat = memStore()[key];
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(flat)) {
    try {
      out[k] = JSON.parse(v);
    } catch {
      // 壊れた値は無視
    }
  }
  return out;
}

async function hset(key: string, field: string, value: unknown | null) {
  if (useRedis) {
    if (value === null) await redis(["HDEL", key, field]);
    else await redis(["HSET", key, field, JSON.stringify(value)]);
    return;
  }
  const store = memStore()[key];
  if (value === null) delete store[field];
  else store[field] = JSON.stringify(value);
}

async function readAll(): Promise<LiveData> {
  const [waits, acts, notice] = await Promise.all([
    hgetall(KEYS.waits),
    hgetall(KEYS.acts),
    hgetall(KEYS.notice),
  ]);
  return {
    waits: waits as LiveData["waits"],
    acts: acts as LiveData["acts"],
    notice: (notice.current as LiveData["notice"]) ?? null,
  };
}

export async function GET() {
  try {
    return NextResponse.json(await readAll(), {
      headers: {
        // 来場者が多くても Redis への問い合わせが増えすぎないよう、CDNで15秒キャッシュ
        "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30",
      },
    });
  } catch (e) {
    console.error("[live] read failed", e);
    return NextResponse.json({ waits: {}, acts: {}, notice: null } satisfies LiveData);
  }
}

const TIME = /^([01]?\d|2[0-3]):[0-5]\d$/;
const pad = (t: string) => t.padStart(5, "0");

export async function POST(req: Request) {
  const adminKey = process.env.WAIT_ADMIN_KEY;
  if (!adminKey)
    return NextResponse.json({ error: "WAIT_ADMIN_KEY が設定されていません" }, { status: 503 });
  if (req.headers.get("x-admin-key") !== adminKey)
    return NextResponse.json({ error: "パスワードが違います" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "不正なリクエスト" }, { status: 400 });
  }
  const now = new Date().toISOString();

  try {
    if (body.type === "wait") {
      const id = String(body.id ?? "");
      if (!LOCATIONS.some((l) => l.id === id))
        return NextResponse.json({ error: "企画が見つかりません" }, { status: 400 });
      if (body.level !== null && !isWaitLevel(body.level))
        return NextResponse.json({ error: "待ち時間の値が不正です" }, { status: 400 });
      await hset(KEYS.waits, id, body.level === null ? null : { level: body.level, updatedAt: now });
      console.log(`[live] wait id=${id} level=${body.level}`);
    } else if (body.type === "act") {
      const key = String(body.key ?? "");
      if (!/^[^|]+\|day[12]\|\d\d:\d\d$/.test(key))
        return NextResponse.json({ error: "公演の指定が不正です" }, { status: 400 });
      if (body.clear) await hset(KEYS.acts, key, null);
      else {
        const start = typeof body.start === "string" && body.start ? body.start : undefined;
        const end = typeof body.end === "string" && body.end ? body.end : undefined;
        if ((start && !TIME.test(start)) || (end && !TIME.test(end)))
          return NextResponse.json({ error: "時刻は 13:05 の形で入力してください" }, { status: 400 });
        await hset(KEYS.acts, key, {
          canceled: !!body.canceled,
          start: start && pad(start),
          end: end && pad(end),
          note: typeof body.note === "string" && body.note.trim() ? body.note.trim().slice(0, 100) : undefined,
          updatedAt: now,
        });
      }
      console.log(`[live] act key=${key} ${JSON.stringify(body)}`);
    } else if (body.type === "notice") {
      const text = typeof body.text === "string" ? body.text.trim().slice(0, 300) : "";
      await hset(KEYS.notice, "current", text ? { text, updatedAt: now } : null);
      console.log(`[live] notice "${text}"`);
    } else {
      return NextResponse.json({ error: "type が不正です" }, { status: 400 });
    }
    return NextResponse.json({ ok: true, ...(await readAll()) });
  } catch (e) {
    console.error("[live] write failed", e);
    return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
  }
}
