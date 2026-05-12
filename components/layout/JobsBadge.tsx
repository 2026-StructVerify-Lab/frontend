"use client";

// components/layout/JobsBadge.tsx — 우하단 floating 진행 표시
//
// JobWatcherProvider 안의 watching 상태를 보고 진행 중 + 최근 완료된 job 표시.
// 클릭하면 해당 결과 페이지로 이동.

import Link from "next/link";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import { useJobWatcher } from "@/lib/jobWatcher";

export function JobsBadge() {
  const { watching, unwatch } = useJobWatcher();
  if (watching.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 w-80 space-y-2 z-50 pointer-events-none">
      {watching.map((w) => (
        <div
          key={w.id}
          className="bg-card border rounded-lg shadow-lg p-3 pointer-events-auto"
        >
          <Link
            href={`/verify/jobs/${w.id}`}
            className="block hover:bg-muted/30 -m-3 p-3 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              {w.status === "completed" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : w.status === "failed" ? (
                <XCircle className="h-4 w-4 text-red-500" />
              ) : (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              )}
              <span className="text-sm font-medium flex-1">
                {w.status === "completed"
                  ? "검증 완료"
                  : w.status === "failed"
                  ? "검증 실패"
                  : "검증 중"}
              </span>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  unwatch(w.id);
                }}
                className="text-muted-foreground hover:text-foreground text-xs"
                aria-label="알림 닫기"
              >
                ×
              </button>
            </div>

            {(w.status === "pending" || w.status === "running") && (
              <>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-1.5">
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${w.progress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground truncate flex-1">
                    {w.current_step ?? "준비 중…"}
                  </p>
                  <span className="text-xs text-muted-foreground tabular-nums shrink-0 ml-2">
                    {w.progress}%
                  </span>
                </div>
              </>
            )}

            {w.status === "completed" && (
              <p className="text-xs text-muted-foreground">
                결과 보기 →
              </p>
            )}

            {w.status === "failed" && (
              <p className="text-xs text-red-500">에러 — 클릭해서 상세 보기</p>
            )}
          </Link>
        </div>
      ))}
    </div>
  );
}