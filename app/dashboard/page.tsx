"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listJobs } from "@/lib/api";
import type { Job, Verdict } from "@/lib/types";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

const VERDICT_ICONS: Record<Verdict, { Icon: typeof CheckCircle2; label: string; cls: string }> = {
  match: { Icon: CheckCircle2, label: "일치", cls: "text-[hsl(142_71%_45%)]" },
  mismatch: { Icon: AlertTriangle, label: "불일치", cls: "text-[hsl(0_84%_60%)]" },
  partial: { Icon: AlertCircle, label: "부분", cls: "text-[hsl(43_96%_56%)]" },
  unverifiable: { Icon: HelpCircle, label: "불가", cls: "text-[hsl(220_9%_60%)]" },
};

export default function DashboardPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchPage = useCallback(async (currentOffset: number, append: boolean) => {
    try {
      setLoading(true);
      setError(null);
      const fetched = await listJobs(PAGE_SIZE, currentOffset);
      setHasMore(fetched.length === PAGE_SIZE);
      setJobs(prev => (append ? [...prev, ...fetched] : fetched));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "목록 불러오기 실패";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPage(0, false);
  }, [fetchPage]);

  const handleRefresh = () => {
    setOffset(0);
    fetchPage(0, false);
  };

  const handleLoadMore = () => {
    const next = offset + PAGE_SIZE;
    setOffset(next);
    fetchPage(next, true);
  };

  // 통계
  const completedJobs = jobs.filter(j => j.status === "completed");
  const totalClaims = completedJobs.reduce(
    (acc, j) => acc + (j.result?.claims?.length ?? 0),
    0,
  );
  const matchCount = completedJobs.reduce(
    (acc, j) => acc + (j.result?.verdict_distribution?.match ?? 0),
    0,
  );

  return (
    <AppShell>
      <div className="container max-w-5xl py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">대시보드</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4 mr-1.5", loading && "animate-spin")} />
              새로고침
            </Button>
            <Link href="/verify">
              <Button>새 검증 시작</Button>
            </Link>
          </div>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardDescription>총 검증 job</CardDescription>
              <CardTitle className="text-3xl tabular-nums">{jobs.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>총 claim</CardDescription>
              <CardTitle className="text-3xl tabular-nums">{totalClaims}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>일치 비율</CardDescription>
              <CardTitle className="text-3xl tabular-nums">
                {totalClaims > 0 ? `${Math.round((matchCount / totalClaims) * 100)}%` : "—"}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Jobs 목록 */}
        <Card>
          <CardHeader>
            <CardTitle>검증 기록</CardTitle>
            <CardDescription>
              지금까지 진행한 모든 검증 job입니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading && jobs.length === 0 && (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                불러오는 중...
              </div>
            )}

            {error && (
              <div className="text-sm text-red-600 dark:text-red-400 py-4">
                {error}
              </div>
            )}

            {!loading && jobs.length === 0 && !error && (
              <p className="text-sm text-muted-foreground py-8 text-center">
                아직 검증 기록이 없습니다. 새 검증을 시작해보세요.
              </p>
            )}

            {jobs.length > 0 && (
              <div className="space-y-2">
                {jobs.map(job => (
                  <JobRow key={job.id} job={job} />
                ))}

                {/* 페이지네이션 */}
                <div className="pt-3 flex justify-center">
                  {hasMore ? (
                    <Button
                      variant="outline"
                      onClick={handleLoadMore}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          불러오는 중...
                        </>
                      ) : (
                        "더 보기"
                      )}
                    </Button>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      더 이상 기록이 없습니다.
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

// ── Job 한 줄 ──────────────────────────────────────────────────

function JobRow({ job }: { job: Job }) {
  const created = new Date(job.created_at);
  const dist = job.result?.verdict_distribution;
  const claimCount = job.result?.claims?.length ?? 0;
  const preview = job.source_data
    ? job.source_data.slice(0, 80)
    : job.source_uri ?? "(no source)";

  return (
    <Link
      href={`/verify/jobs/${job.id}`}
      className="block hover:bg-muted/40 rounded-lg p-3 transition-colors border border-transparent hover:border-border"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* 시간 + 상태 */}
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge status={job.status} />
            <span className="text-xs text-muted-foreground tabular-nums">
              {created.toLocaleString("ko-KR", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">
              {job.source_type}
            </span>
          </div>
          {/* 원문 미리보기 */}
          <p className="text-sm truncate">{preview}</p>
        </div>

        {/* 검증 결과 분포 (완료 시) */}
        {job.status === "completed" && dist && claimCount > 0 && (
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-muted-foreground tabular-nums">
              {claimCount} claim
            </span>
            <div className="flex gap-1.5">
              {(["match", "mismatch", "partial", "unverifiable"] as Verdict[]).map(
                v => {
                  const count = dist[v];
                  if (!count) return null;
                  const { Icon, label, cls } = VERDICT_ICONS[v];
                  return (
                    <span
                      key={v}
                      title={`${label}: ${count}`}
                      className="inline-flex items-center gap-0.5 text-xs tabular-nums"
                    >
                      <Icon className={cn("h-3.5 w-3.5", cls)} />
                      {count}
                    </span>
                  );
                },
              )}
            </div>
          </div>
        )}

        {job.status === "running" && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {job.progress}%
          </span>
        )}
      </div>
    </Link>
  );
}

function StatusBadge({ status }: { status: Job["status"] }) {
  const map = {
    completed: { label: "완료", variant: "match" as const },
    running: { label: "진행 중", variant: "partial" as const },
    pending: { label: "대기", variant: "unverifiable" as const },
    failed: { label: "실패", variant: "mismatch" as const },
  };
  const { label, variant } = map[status] ?? map.pending;
  return <Badge variant={variant}>{label}</Badge>;
}