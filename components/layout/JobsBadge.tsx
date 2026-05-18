"use client";

// components/layout/JobsBadge.tsx — 우하단 floating 진행 표시
//
// JobWatcherProvider 안의 watching 상태를 보고 진행 중 + 최근 완료된 job 표시.
// 클릭하면 해당 결과 페이지로 이동.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckCircle2, Loader2, XCircle, X } from "lucide-react";

import { useJobWatcher } from "@/lib/jobWatcher";
import { cn } from "@/lib/utils";

export function JobsBadge() {
  const { watching, unwatch } = useJobWatcher();
  const pathname = usePathname();

  // 배지 숨김 조건:
  //   1. 그 job의 결과 페이지에 있을 때 (본문에 진행/결과가 이미 보임)
  //   2. 대시보드에서 진행 중인 job (대시보드 카드에 진행 상황 큰 표시가 이미 있음)
  const isRunning = (s: string) => s === "pending" || s === "running";
  const visibleJobs = watching.filter((w) => {
    if (pathname === `/verify/jobs/${w.id}`) return false;
    if (pathname === "/dashboard" && isRunning(w.status)) return false;
    return true;
  });

  if (visibleJobs.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 w-[320px] space-y-2 z-50 pointer-events-none">
      {visibleJobs.map((w) => {
        const isRunning = w.status === "pending" || w.status === "running";
        const isDone = w.status === "completed";
        const isFail = w.status === "failed";

        return (
          <div
            key={w.id}
            className={cn(
              "bg-card border border-border rounded-md shadow-sm pointer-events-auto overflow-hidden transition-all",
              "hover:shadow-md hover:border-foreground/20"
            )}
          >
            <Link
              href={`/verify/jobs/${w.id}`}
              className="block p-3 group"
            >
              <div className="flex items-center gap-2 mb-2">
                {isDone ? (
                  <CheckCircle2 className="h-[15px] w-[15px] text-verdict-match shrink-0" />
                ) : isFail ? (
                  <XCircle className="h-[15px] w-[15px] text-verdict-mismatch shrink-0" />
                ) : (
                  <Loader2 className="h-[15px] w-[15px] animate-spin text-muted-foreground shrink-0" />
                )}
                <span className="text-[13px] font-semibold flex-1 truncate">
                  {isDone ? "검증 완료" : isFail ? "검증 실패" : "검증 진행 중"}
                </span>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    unwatch(w.id);
                  }}
                  className="p-0.5 rounded text-muted-foreground/60 hover:text-foreground hover:bg-accent transition-colors opacity-0 group-hover:opacity-100"
                  aria-label="알림 닫기"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {isRunning && (
                <>
                  <div className="h-1 bg-muted rounded-full overflow-hidden mb-1.5">
                    <div
                      className="h-full bg-foreground/70 transition-all duration-500 ease-out"
                      style={{ width: `${w.progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11.5px] text-muted-foreground truncate flex-1">
                      {w.current_step ?? "준비 중…"}
                    </p>
                    <span className="text-[11.5px] text-muted-foreground tabular-nums shrink-0">
                      {w.progress}%
                    </span>
                  </div>
                </>
              )}

              {isDone && (
                <p className="text-[11.5px] text-muted-foreground">
                  클릭해서 결과 보기 →
                </p>
              )}

              {isFail && (
                <p className="text-[11.5px] text-verdict-mismatch">
                  에러 — 클릭해서 상세 보기
                </p>
              )}
            </Link>
          </div>
        );
      })}
    </div>
  );
}
