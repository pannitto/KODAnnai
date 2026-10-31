"use client";

// ==========================================
// 運営ページ（当日用。来場者には案内しない）
// ==========================================
// ・待ち時間（委員会企画）
// ・ステージ公演の中止・時間変更
// ・サイト上部のお知らせ（ステージ以外の企画の中止・変更、雨天時の案内など）
// パスワードは Vercel の環境変数 WAIT_ADMIN_KEY に設定した値。
// ここで入力した内容は data/*.csv を書き換えない（当日の上書きとして別に保存される）。

import { useEffect, useMemo, useState } from "react";
import { useLive, useNow } from "@/components/festival/hooks";
import { KIKAKU_LIST, getDisplayName, getPlaceLabel, isCommitteeKikaku } from "@/lib/kikaku";
import { WAIT_LEVELS, WAIT_LEVEL_INFO, formatAgo, type WaitLevel } from "@/lib/wait-times";
import {
  FESTIVAL_DAY1,
  FESTIVAL_DAY2,
  TIMETABLE,
  actKey,
  getFestivalDay,
  type FestivalDay,
} from "@/lib/timetable";

const STORAGE_KEY = "kodannai-wait-admin-key";
const COMMITTEE = KIKAKU_LIST.filter(isCommitteeKikaku);
type Tab = "wait" | "stage" | "notice";

export default function AdminClient() {
  const now = useNow(15000);
  const { live, refresh } = useLive(20000);
  const [key, setKey] = useState("");
  const [tab, setTab] = useState<Tab>("wait");
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    try {
      setKey(localStorage.getItem(STORAGE_KEY) ?? "");
    } catch {
      // 無視
    }
  }, []);

  const saveKey = (v: string) => {
    setKey(v);
    try {
      localStorage.setItem(STORAGE_KEY, v);
    } catch {
      // 無視
    }
  };

  /** /api/live に送る。成功したら表示を更新 */
  const post = async (savingId: string, body: object, okText: string) => {
    setSaving(savingId);
    setMessage(null);
    try {
      const res = await fetch("/api/live", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": key },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? `エラー (${res.status})`);
      setMessage({ ok: true, text: okText });
      refresh();
      return true;
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "保存に失敗しました" });
      return false;
    } finally {
      setSaving(null);
    }
  };

  return (
    <main className="mx-auto min-h-screen max-w-md space-y-4 bg-background p-4">
      <h1 className="text-lg font-bold">運営ページ（当日用）</h1>
      <p className="text-xs text-muted-foreground">
        入力した内容は、来場者向けのページに最大1分ほどで反映されます。
      </p>

      <label className="block text-sm">
        <span className="mb-1 block font-semibold">パスワード</span>
        <input
          type="password"
          value={key}
          onChange={(e) => saveKey(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2"
          autoComplete="off"
        />
      </label>

      <div className="grid grid-cols-3 gap-1 rounded-xl border border-border p-1" role="tablist">
        {(
          [
            ["wait", "待ち時間"],
            ["stage", "ステージ公演"],
            ["notice", "お知らせ"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => {
              setTab(id);
              setMessage(null);
            }}
            className={`rounded-lg py-2 text-sm font-semibold ${tab === id ? "bg-foreground text-background" : "text-muted-foreground"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {message && (
        <p
          role="status"
          className={`rounded-lg p-2 text-sm ${message.ok ? "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200" : "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200"}`}
        >
          {message.text}
        </p>
      )}

      {tab === "wait" && (
        <WaitTab
          now={now}
          waits={live.waits}
          saving={saving}
          onSet={(id, name, level) =>
            post(id, { type: "wait", id, level }, `「${name}」を${level ? WAIT_LEVEL_INFO[level].label : "情報なし"}にしました`)
          }
        />
      )}
      {tab === "stage" && (
        <StageTab now={now} acts={live.acts} saving={saving} post={post} />
      )}
      {tab === "notice" && (
        <NoticeTab
          now={now}
          current={live.notice?.text ?? ""}
          updatedAt={live.notice?.updatedAt}
          saving={saving === "notice"}
          onSave={(text) => post("notice", { type: "notice", text }, text ? "お知らせを出しました" : "お知らせを消しました")}
        />
      )}
    </main>
  );
}

// ---------------- 待ち時間 ----------------
function WaitTab({
  now,
  waits,
  saving,
  onSet,
}: {
  now: Date | null;
  waits: Record<string, { level: WaitLevel; updatedAt: string }>;
  saving: string | null;
  onSet: (id: string, name: string, level: WaitLevel | null) => void;
}) {
  const [filter, setFilter] = useState("");
  const list = COMMITTEE.filter(
    (l) => !filter || getDisplayName(l).includes(filter) || l.position.includes(filter),
  );
  return (
    <section className="space-y-3">
      <p className="text-xs text-muted-foreground">90分以上更新がないと「情報なし」の表示に戻ります。</p>
      <input
        type="search"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="企画名・教室で絞り込み"
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
      />
      <ul className="space-y-3">
        {list.map((loc) => {
          const cur = waits[loc.id];
          const name = getDisplayName(loc);
          return (
            <li key={loc.id} className="rounded-xl border border-border bg-card p-3">
              <p className="font-semibold">{name}</p>
              <p className="text-xs text-muted-foreground">
                {getPlaceLabel(loc)} ／ 現在：
                {cur ? (
                  <>
                    <b style={{ color: WAIT_LEVEL_INFO[cur.level].color }}>{WAIT_LEVEL_INFO[cur.level].short}</b>
                    {now && `（${formatAgo(cur.updatedAt, now)}）`}
                  </>
                ) : (
                  "情報なし"
                )}
              </p>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {WAIT_LEVELS.map((lv) => (
                  <button
                    key={lv}
                    type="button"
                    disabled={saving === loc.id}
                    onClick={() => onSet(loc.id, name, lv)}
                    className="rounded-lg py-2 text-xs font-bold text-white disabled:opacity-50"
                    style={{
                      background: WAIT_LEVEL_INFO[lv].color,
                      outline: cur?.level === lv ? "3px solid var(--foreground)" : undefined,
                      outlineOffset: 1,
                    }}
                  >
                    {WAIT_LEVEL_INFO[lv].short}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={saving === loc.id}
                  onClick={() => onSet(loc.id, name, null)}
                  className="rounded-lg border border-border py-2 text-xs font-bold disabled:opacity-50"
                >
                  消す
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ---------------- ステージ公演 ----------------
function StageTab({
  now,
  acts,
  saving,
  post,
}: {
  now: Date | null;
  acts: Record<string, { canceled?: boolean; start?: string; end?: string; note?: string; updatedAt: string }>;
  saving: string | null;
  post: (savingId: string, body: object, okText: string) => Promise<boolean>;
}) {
  const today = now ? getFestivalDay(now) : null;
  const [day, setDay] = useState<FestivalDay>("day1");
  useEffect(() => {
    if (today) setDay(today);
  }, [today]);
  const stages = useMemo(() => TIMETABLE.filter((s) => s[day].length > 0), [day]);

  return (
    <section className="space-y-3">
      <p className="text-xs text-muted-foreground">
        中止・時間変更をした公演は、タイムテーブルと企画の詳細に印つきで表示されます。もとの予定は data/timetable.csv のまま残ります。
      </p>
      <div className="grid grid-cols-2 gap-1 rounded-xl border border-border p-1">
        {(
          [
            ["day1", `1日目 ${FESTIVAL_DAY1.slice(5)}`],
            ["day2", `2日目 ${FESTIVAL_DAY2.slice(5)}`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setDay(id)}
            className={`rounded-lg py-1.5 text-sm font-semibold ${day === id ? "bg-foreground text-background" : "text-muted-foreground"}`}
          >
            {label}
            {today === id && "（今日）"}
          </button>
        ))}
      </div>
      {stages.map((s) => (
        <div key={s.stageId} className="space-y-2">
          <h2 className="font-bold">{s.stageName}</h2>
          {s[day].map((e) => {
            const k = actKey(s.stageId, day, e.start);
            return (
              <ActEditor
                key={k}
                actName={e.act}
                start={e.start}
                end={e.end}
                override={acts[k]}
                saving={saving === k}
                onSave={(o) =>
                  post(k, { type: "act", key: k, ...o }, `「${e.act}」の変更を保存しました`)
                }
                onClear={() => post(k, { type: "act", key: k, clear: true }, `「${e.act}」をもとの予定に戻しました`)}
              />
            );
          })}
        </div>
      ))}
    </section>
  );
}

function ActEditor({
  actName,
  start,
  end,
  override,
  saving,
  onSave,
  onClear,
}: {
  actName: string;
  start: string;
  end: string;
  override?: { canceled?: boolean; start?: string; end?: string; note?: string };
  saving: boolean;
  onSave: (o: { canceled: boolean; start?: string; end?: string; note?: string }) => void;
  onClear: () => void;
}) {
  const [newStart, setNewStart] = useState(override?.start ?? "");
  const [newEnd, setNewEnd] = useState(override?.end ?? "");
  const [note, setNote] = useState(override?.note ?? "");
  useEffect(() => {
    setNewStart(override?.start ?? "");
    setNewEnd(override?.end ?? "");
    setNote(override?.note ?? "");
  }, [override?.start, override?.end, override?.note]);

  const status = override?.canceled
    ? "中止"
    : override?.start || override?.end
      ? `時間変更 → ${override.start ?? start}〜${override.end ?? end}`
      : "予定どおり";

  return (
    <div className="rounded-xl border border-border bg-card p-3 text-sm">
      <p className="font-semibold">
        {start}〜{end}　{actName}
      </p>
      <p className={`text-xs ${override ? "font-bold text-red-600" : "text-muted-foreground"}`}>現在：{status}</p>
      <div className="mt-2 flex items-center gap-1 text-xs">
        <span>新しい時間</span>
        <input type="time" value={newStart} onChange={(e) => setNewStart(e.target.value)} className="rounded border border-border bg-background px-1 py-1" />
        〜
        <input type="time" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} className="rounded border border-border bg-background px-1 py-1" />
      </div>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="ひとこと（例：機材トラブルのため15分遅れます）"
        className="mt-2 w-full rounded border border-border bg-background px-2 py-1 text-xs"
      />
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        <button
          type="button"
          disabled={saving || (!newStart && !newEnd)}
          onClick={() => onSave({ canceled: false, start: newStart, end: newEnd, note })}
          className="rounded-lg bg-amber-500 py-2 text-xs font-bold text-white disabled:opacity-40"
        >
          時間を変更
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => {
            if (confirm(`「${actName}」を中止にしますか？`)) onSave({ canceled: true, note });
          }}
          className="rounded-lg bg-red-600 py-2 text-xs font-bold text-white disabled:opacity-40"
        >
          中止にする
        </button>
        <button
          type="button"
          disabled={saving || !override}
          onClick={onClear}
          className="rounded-lg border border-border py-2 text-xs font-bold disabled:opacity-40"
        >
          もとに戻す
        </button>
      </div>
    </div>
  );
}

// ---------------- お知らせ ----------------
function NoticeTab({
  now,
  current,
  updatedAt,
  saving,
  onSave,
}: {
  now: Date | null;
  current: string;
  updatedAt?: string;
  saving: boolean;
  onSave: (text: string) => void;
}) {
  const [text, setText] = useState(current);
  useEffect(() => setText(current), [current]);
  return (
    <section className="space-y-3">
      <p className="text-xs text-muted-foreground">
        すべてのページの上部に表示されます。ステージ以外の企画の中止・変更や、雨天時の案内に使ってください。
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        maxLength={300}
        placeholder="例：雨天のため、フィールドの公演は中止になりました。"
        className="w-full rounded-lg border border-border bg-background p-2 text-sm"
      />
      {current && updatedAt && now && (
        <p className="text-xs text-muted-foreground">表示中（{formatAgo(updatedAt, now)}）</p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={saving || !text.trim()}
          onClick={() => onSave(text)}
          className="rounded-lg bg-foreground py-2 text-sm font-bold text-background disabled:opacity-40"
        >
          お知らせを出す
        </button>
        <button
          type="button"
          disabled={saving || !current}
          onClick={() => {
            setText("");
            onSave("");
          }}
          className="rounded-lg border border-border py-2 text-sm font-bold disabled:opacity-40"
        >
          消す
        </button>
      </div>
    </section>
  );
}
