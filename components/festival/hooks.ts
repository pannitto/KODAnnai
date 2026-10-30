"use client";

import { useEffect, useState, useCallback } from "react";
import { EMPTY_LIVE, type LiveData } from "@/lib/live";

/**
 * 現在時刻（30秒ごとに更新）。マウント前は null（SSRとのズレ防止）。
 *
 * テスト用：URLに ?now=2026-06-13T12:30 を付けると、その時刻（日本時間）から
 * 時計が進むようになる。文化祭当日以外でもタイムテーブルの横棒などを確認できる。
 */
export function useNow(intervalMs = 30000): Date | null {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    let offset = 0;
    try {
      const override = new URLSearchParams(window.location.search).get("now");
      if (override) {
        // "2026-06-13T12:30" → 日本時間として解釈
        const m = override.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{1,2}):(\d{2})$/);
        const d = m
          ? new Date(`${m[1]}T${m[2].padStart(2, "0")}:${m[3]}:00+09:00`)
          : new Date(override);
        if (!Number.isNaN(d.getTime())) offset = d.getTime() - Date.now();
      }
    } catch {
      // 無視
    }
    const tick = () => setNow(new Date(Date.now() + offset));
    tick();
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}

// ---------- 当日の上書き情報（/api/live） ----------
// 1ページに複数の部品があっても取得は1回で済むよう、ページ内で共有する
let liveCache: LiveData = EMPTY_LIVE;
const liveListeners = new Set<(d: LiveData) => void>();
let liveTimer: ReturnType<typeof setInterval> | null = null;

function fetchLive() {
  fetch("/api/live")
    .then((r) => (r.ok ? r.json() : null))
    .then((json: LiveData | null) => {
      if (!json) return;
      liveCache = { waits: json.waits ?? {}, acts: json.acts ?? {}, notice: json.notice ?? null };
      liveListeners.forEach((fn) => fn(liveCache));
    })
    .catch(() => {
      // 取得できなくても画面は壊さない
    });
}

function onVisible() {
  if (document.visibilityState === "visible") fetchLive();
}

/** 待ち時間・ステージ公演の変更・お知らせを定期的に取得する */
export function useLive(intervalMs = 60000): { live: LiveData; refresh: () => void } {
  const [live, setLive] = useState<LiveData>(liveCache);
  useEffect(() => {
    liveListeners.add(setLive);
    if (liveListeners.size === 1) {
      fetchLive();
      liveTimer = setInterval(fetchLive, intervalMs);
      document.addEventListener("visibilitychange", onVisible);
    }
    return () => {
      liveListeners.delete(setLive);
      if (liveListeners.size === 0) {
        if (liveTimer) clearInterval(liveTimer);
        document.removeEventListener("visibilitychange", onVisible);
      }
    };
  }, [intervalMs]);
  return { live, refresh: useCallback(fetchLive, []) };
}

/** URLの ?key= を読む（useSearchParams を使わず Suspense 不要にするため） */
export function useQueryParam(key: string): string | null | undefined {
  const [value, setValue] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    setValue(new URLSearchParams(window.location.search).get(key));
  }, [key]);
  return value;
}
