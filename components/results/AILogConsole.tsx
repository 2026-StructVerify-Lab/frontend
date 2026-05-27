"use client";

// components/results/AILogConsole.tsx
//
// 개발자/파워유저용 콘솔. 잡의 모든 LLM raw prompt/response를 시간순으로.
// 카드 한 줄 = 한 LLM 호출 (planner / reflect_call_NN / replan).
// 펼치면 prompt와 response 전문(JSON or 자연어) — 사이즈 cap 적용된 raw.
//
// /v1/jobs/{id}/llm-trace는 heavy 응답이라 콘솔이 열릴 때만 fetch + 폴링.
// 잡 진행 중이면 5초마다 refresh, 완료되면 1회만.

import { useEffect, useRef, useState } from "react";
import {
  Terminal,
  X,
  Copy,
  ChevronDown,
  ChevronUp,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getJobLLMTrace, ApiError } from "@/lib/api";
import type { LLMTraceEntry } from "@/lib/types";

interface Props {
  jobId: string;
  /** 잡이 진행 중이면 polling, 완료면 1회만 — page에서 status로 결정해서 넘김 */
  liveRefresh?: boolean;
  /** 우측 드로어로 띄울지 (true) 또는 하단 패널 (false) */
  drawer?: boolean;
}

export function AILogConsole({
  jobId,
  liveRefresh = false,
  drawer = true,
}: Props) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<LLMTraceEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 백엔드에 /llm-trace 라우트가 아직 없으면 (구버전) — 별도 친절한 메시지
  const [endpointMissing, setEndpointMissing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 열렸을 때만 fetch — 닫혀있으면 네트워크 비용 0
  useEffect(() => {
    if (!open) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const res = await getJobLLMTrace(jobId);
        if (cancelled) return;
        setEntries(res.entries);
        setError(null);
        setEndpointMissing(false);
      } catch (e: any) {
        if (cancelled) return;
        // 404 = 라우트 자체가 없음 (백엔드 구버전) → 폴링 중단 + 친절 메시지
        // 다른 에러는 보여주되 폴링은 유지 (일시적 네트워크 등)
        if (e instanceof ApiError && e.status === 404) {
          setEndpointMissing(true);
          setError(null);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        } else {
          setError(e?.message ?? "로드 실패");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    if (liveRefresh) {
      intervalRef.current = setInterval(load, 5000);
    }
    return () => {
      cancelled = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [open, jobId, liveRefresh]);

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 shadow-md z-30"
        title="LLM 입출력 원본 보기"
      >
        <Terminal className="h-3.5 w-3.5 mr-1.5" />
        AI 콘솔
        {entries.length > 0 && (
          <span className="ml-1.5 text-[10px] tabular-nums text-muted-foreground">
            {entries.length}
          </span>
        )}
      </Button>
    );
  }

  const drawerClass = drawer
    ? "fixed right-0 top-0 bottom-0 w-[480px] max-w-[90vw] border-l shadow-xl"
    : "fixed bottom-0 left-0 right-0 h-[60vh] border-t shadow-xl";

  return (
    <div
      className={cn(
        "z-40 bg-background flex flex-col",
        drawerClass
      )}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4" />
          <span className="text-sm font-semibold">AI 콘솔</span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {entries.length}건
          </span>
          {loading && (
            <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
          )}
          {liveRefresh && (
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
              ● live
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOpen(false)}
          className="h-7 w-7 p-0"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-2 space-y-2">
        {endpointMissing && (
          <div className="text-[11px] text-muted-foreground p-3 rounded border border-dashed bg-muted/30 leading-relaxed">
            <div className="font-semibold text-foreground/80 mb-1">
              백엔드 업데이트 대기 중
            </div>
            AI 콘솔 기능은 백엔드의 <code className="font-mono text-[10px]">/v1/jobs/{"{id}"}/llm-trace</code>{" "}
            엔드포인트와 LLM 호출 로깅이 필요합니다. 백엔드 PR(loop.py /
            runtime_agent.py / jobs.py / workspace_reader.py)이 머지·배포되면
            자동으로 활성화됩니다.
          </div>
        )}
        {error && !endpointMissing && (
          <div className="text-xs text-destructive p-2">{error}</div>
        )}
        {!loading && !endpointMissing && entries.length === 0 && !error && (
          <div className="text-xs text-muted-foreground p-4 text-center">
            아직 LLM 호출 기록이 없습니다.
            <br />
            검증이 진행되면서 자동으로 누적됩니다.
          </div>
        )}
        {entries.map((entry, idx) => (
          <LogEntryCard key={`${entry.claim_id}-${entry.name}-${idx}`} entry={entry} />
        ))}
      </div>
    </div>
  );
}

function LogEntryCard({ entry }: { entry: LLMTraceEntry }) {
  const [open, setOpen] = useState(false);

  const isPlanner = entry.name.startsWith("planner");
  const isReflect = entry.name.startsWith("reflect");
  const tone = isPlanner
    ? "text-violet-600 dark:text-violet-400"
    : isReflect
    ? "text-blue-600 dark:text-blue-400"
    : "text-muted-foreground";

  function copy(text: string) {
    navigator.clipboard.writeText(text).then(
      () => toast.success("복사됨"),
      () => toast.error("복사 실패")
    );
  }

  return (
    <div className="rounded border bg-muted/20">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-2.5 py-1.5 flex items-start gap-2 text-left hover:bg-muted/30"
      >
        <Sparkles className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", tone)} />
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-[11px] font-mono font-medium">
              {entry.name}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono truncate">
              claim {entry.claim_id?.slice(0, 8) ?? "—"}
            </span>
            {entry.ts && (
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {new Date(entry.ts).toLocaleTimeString()}
              </span>
            )}
          </div>
          <div className="text-[10px] text-muted-foreground tabular-nums">
            prompt {entry.prompt_chars ?? "—"}자 · response{" "}
            {entry.response_chars ?? "—"}자
          </div>
        </div>
        {open ? (
          <ChevronUp className="h-3 w-3 mt-1 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3 w-3 mt-1 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="px-2.5 pb-2 space-y-2 border-t pt-2">
          {entry.prompt && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  PROMPT
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1 text-[10px]"
                  onClick={(e) => {
                    e.stopPropagation();
                    copy(entry.prompt || "");
                  }}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  복사
                </Button>
              </div>
              <pre className="bg-background/80 rounded px-2 py-1.5 text-[10px] font-mono overflow-x-auto whitespace-pre-wrap break-words max-h-64 overflow-y-auto">
                {entry.prompt}
              </pre>
            </div>
          )}
          {entry.response && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  RESPONSE
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1 text-[10px]"
                  onClick={(e) => {
                    e.stopPropagation();
                    copy(entry.response || "");
                  }}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  복사
                </Button>
              </div>
              <pre className="bg-background/80 rounded px-2 py-1.5 text-[10px] font-mono overflow-x-auto whitespace-pre-wrap break-words max-h-64 overflow-y-auto">
                {entry.response}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
