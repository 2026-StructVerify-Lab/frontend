"use client";

// lib/jobWatcher.tsx — 글로벌 진행 중 job 추적
//
// [사용]
//   const { watch, unwatch } = useJobWatcher();
//   watch(jobId);    // submit 후 자동 폴링 시작 → 어느 페이지에서도 진행 표시됨
//   unwatch(jobId);  // 명시적 해제 (자동: 완료/실패 시 30초 후)
//
// [동작]
//   - watching job들은 2초마다 GET /v1/jobs/{id}
//   - status가 completed/failed로 변하면 listener 호출 + 30초 후 자동 제거
//   - AppShell에서 Provider 감싸므로 어느 페이지에서든 사용 가능

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import { getJob } from "./api";
import type { Job, JobStatus } from "./types";

export interface WatchingJob {
  id: string;
  status: JobStatus;
  progress: number;
  current_step: string | null;
  startedAt: number;
}

interface JobWatcherContextValue {
  watching: WatchingJob[];
  watch: (jobId: string) => void;
  unwatch: (jobId: string) => void;
  /** 진행 중(pending/running) job이 하나라도 있는지 */
  hasActiveJob: boolean;
  /** 진행 중인 첫 번째 job (없으면 null) — 결과 페이지 링크용 */
  activeJob: WatchingJob | null;
}

const JobWatcherContext = createContext<JobWatcherContextValue | null>(null);

const POLL_INTERVAL = 2000;
const AUTO_REMOVE_AFTER_DONE = 30_000; // 완료 후 30초 후 자동 제거

export function JobWatcherProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [watching, setWatching] = useState<WatchingJob[]>([]);
  const completedRemovalTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // 폴링 — 진행 중인 job들만
  useEffect(() => {
    const active = watching.filter(
      (w) => w.status === "pending" || w.status === "running"
    );
    if (active.length === 0) return;

    let cancelled = false;
    const interval = setInterval(async () => {
      if (cancelled) return;

      for (const w of active) {
        try {
          const job: Job = await getJob(w.id);
          if (cancelled) return;

          setWatching((prev) =>
            prev.map((p) =>
              p.id === w.id
                ? {
                    ...p,
                    status: job.status,
                    progress: job.progress,
                    current_step: job.current_step,
                  }
                : p
            )
          );

          // 완료/실패 시:
          //   1. 토스트로 알림 (한 번만 — completedRemovalTimers로 중복 방지)
          //   2. 30초 후 watching에서 자동 제거
          if (
            (job.status === "completed" || job.status === "failed") &&
            !completedRemovalTimers.current.has(w.id)
          ) {
            if (job.status === "completed") {
              toast.success("검증이 완료되었습니다", {
                description: "결과를 확인해 보세요.",
                duration: 8000,
                action: {
                  label: "결과 보기",
                  onClick: () => {
                    window.location.href = `/verify/jobs/${w.id}`;
                  },
                },
              });
            } else {
              toast.error("검증에 실패했습니다", {
                description: "결과 페이지에서 자세한 내용을 확인하세요.",
                duration: 8000,
                action: {
                  label: "상세 보기",
                  onClick: () => {
                    window.location.href = `/verify/jobs/${w.id}`;
                  },
                },
              });
            }

            const timer = setTimeout(() => {
              setWatching((prev) => prev.filter((p) => p.id !== w.id));
              completedRemovalTimers.current.delete(w.id);
            }, AUTO_REMOVE_AFTER_DONE);
            completedRemovalTimers.current.set(w.id, timer);
          }
        } catch (err) {
          // 401이면 자동 로그아웃이 useAuth에서 처리됨. 여기서는 silent.
          console.warn(`Job watcher: poll failed for ${w.id}`, err);
        }
      }
    }, POLL_INTERVAL);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [watching]);

  // 컴포넌트 언마운트 시 모든 타이머 정리
  useEffect(() => {
    return () => {
      completedRemovalTimers.current.forEach((t) => clearTimeout(t));
      completedRemovalTimers.current.clear();
    };
  }, []);

  const watch = useCallback((jobId: string) => {
    setWatching((prev) => {
      if (prev.some((w) => w.id === jobId)) return prev;
      return [
        ...prev,
        {
          id: jobId,
          status: "pending",
          progress: 0,
          current_step: null,
          startedAt: Date.now(),
        },
      ];
    });
  }, []);

  const unwatch = useCallback((jobId: string) => {
    setWatching((prev) => prev.filter((w) => w.id !== jobId));
    const timer = completedRemovalTimers.current.get(jobId);
    if (timer) {
      clearTimeout(timer);
      completedRemovalTimers.current.delete(jobId);
    }
  }, []);

  const activeJob =
    watching.find((w) => w.status === "pending" || w.status === "running") ??
    null;
  const hasActiveJob = activeJob !== null;

  return (
    <JobWatcherContext.Provider
      value={{ watching, watch, unwatch, hasActiveJob, activeJob }}
    >
      {children}
    </JobWatcherContext.Provider>
  );
}

export function useJobWatcher(): JobWatcherContextValue {
  const ctx = useContext(JobWatcherContext);
  if (!ctx) {
    // Provider 없으면 no-op 반환 (서버 컴포넌트나 외부 호출 안전)
    return {
      watching: [],
      watch: () => {},
      unwatch: () => {},
      hasActiveJob: false,
      activeJob: null,
    };
  }
  return ctx;
}