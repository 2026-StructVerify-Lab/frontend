"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  FileSearch,
  KeyRound,
  BarChart3,
  Loader2,
  ArrowRight,
} from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { NewVerifyButton } from "@/components/layout/NewVerifyButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listJobs, listApiKeys } from "@/lib/api";
import { useJobWatcher } from "@/lib/jobWatcher";
import type { Job, ApiKey } from "@/lib/types";

export default function DashboardPage() {
  const { activeJob, hasActiveJob } = useJobWatcher();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listJobs(20), listApiKeys()])
      .then(([j, k]) => {
        setJobs(j);
        setKeys(k);
      })
      .catch((err) => {
        console.error("Dashboard load failed:", err);
        setError(err.message ?? "데이터 불러오기 실패");
      })
      .finally(() => setLoading(false));
  }, []);

  // active job이 완료되면 자동으로 jobs 리스트 갱신 (한 번만)
  useEffect(() => {
    if (!hasActiveJob) {
      listJobs(20).then(setJobs).catch(() => {});
    }
  }, [hasActiveJob]);

  // 이번 달 기준 통계
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthJobs = jobs.filter(
    (j) => new Date(j.created_at) >= monthStart
  );
  const completedThisMonth = thisMonthJobs.filter(
    (j) => j.status === "completed"
  ).length;
  const activeKeys = keys.filter((k) => !k.revoked_at).length;

  return (
    <AppShell>
      <div className="container max-w-5xl py-10 space-y-8">
        {/* 헤더 */}
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-[28px] font-bold tracking-tight">대시보드</h1>
            <p className="text-sm text-muted-foreground">
              이번 달 사용량과 최근 검증 결과를 한눈에 확인하세요.
            </p>
          </div>
          <NewVerifyButton tooltipSide="left" />
        </div>

        {error && (
          <Card className="border-destructive/40 shadow-none">
            <CardContent className="p-4 text-sm text-destructive">
              {error}
            </CardContent>
          </Card>
        )}

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <StatCard
            label="이번 달 검증"
            value={loading ? "—" : String(completedThisMonth)}
            icon={<FileSearch className="h-4 w-4" />}
          />
          <StatCard
            label="총 API 호출"
            value={loading ? "—" : String(jobs.length)}
            icon={<BarChart3 className="h-4 w-4" />}
          />
          <StatCard
            label="활성 API 키"
            value={loading ? "—" : String(activeKeys)}
            icon={<KeyRound className="h-4 w-4" />}
          />
        </div>

        {/* 최근 검증 영역 */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-foreground/90">
              최근 검증
            </h2>
            {jobs.length > 0 && (
              <Link
                href="/verify/jobs"
                className="text-[12px] text-muted-foreground hover:text-foreground transition-colors"
              >
                전체 보기 →
              </Link>
            )}
          </div>

          {hasActiveJob && activeJob ? (
            <RunningJobCard
              jobId={activeJob.id}
              progress={activeJob.progress}
              currentStep={activeJob.current_step}
            />
          ) : loading ? (
            <Card className="shadow-none">
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                불러오는 중…
              </CardContent>
            </Card>
          ) : jobs.length === 0 ? (
            <EmptyStateCard />
          ) : (
            <Card className="shadow-none">
              <CardContent className="p-2">
                <div className="space-y-1">
                  {jobs.slice(0, 5).map((job) => (
                    <RecentJobItem key={job.id} job={job} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </AppShell>
  );
}

/** 빈 상태 — 첫 검증 유도 */
function EmptyStateCard() {
  return (
    <Card className="shadow-none">
      <CardContent className="py-12 flex flex-col items-center text-center">
        <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center mb-3">
          <FileSearch className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">
          아직 검증 기록이 없어요
        </p>
        <p className="text-xs text-muted-foreground mt-1 mb-4">
          기사 본문이나 PDF를 올려 첫 검증을 시작해보세요.
        </p>
        <NewVerifyButton
          size="sm"
          variant="outline"
          label="검증 시작하기"
          withIcon={false}
          tooltipSide="bottom"
        />
      </CardContent>
    </Card>
  );
}

/** 진행 중 카드 */
function RunningJobCard({
  jobId,
  progress,
  currentStep,
}: {
  jobId: string;
  progress: number;
  currentStep: string | null;
}) {
  return (
    <Card className="shadow-none">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Loader2 className="h-[15px] w-[15px] animate-spin text-muted-foreground" />
          <span className="text-[13.5px] font-semibold">검증 진행 중</span>
          <span className="ml-auto text-[12px] text-muted-foreground tabular-nums">
            {progress}%
          </span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-foreground/70 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground truncate flex-1">
            {currentStep ?? "준비 중…"}
          </p>
          <Link href={`/verify/jobs/${jobId}`}>
            <Button size="sm" variant="outline">
              진행 상황 보기
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

/** 최근 검증 한 줄 — 노션 톤 row item */
function RecentJobItem({ job }: { job: Job }) {
  const date = new Date(job.created_at);
  const dateStr = date.toLocaleString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const claimCount = job.result?.claims?.length ?? 0;
  const dist = job.result?.verdict_distribution;

  return (
    <Link
      href={`/verify/jobs/${job.id}`}
      className="flex items-center justify-between gap-3 p-2.5 rounded-md hover:bg-accent/60 transition-colors"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <Badge variant="outline" className="text-[10.5px] px-1.5 py-0">
            {job.source_type}
          </Badge>
          {(job.status === "running" || job.status === "pending") && (
            <span className="text-[11px] text-muted-foreground">진행 중</span>
          )}
          {job.status === "failed" && (
            <Badge variant="destructive" className="text-[10.5px] px-1.5 py-0">
              실패
            </Badge>
          )}
          {job.status === "completed" && (
            <span className="text-[11.5px] text-muted-foreground">
              claims {claimCount}
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground tabular-nums">
          {dateStr}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        {dist &&
          Object.entries(dist).map(
            ([v, count]) =>
              count > 0 && (
                <Badge
                  key={v}
                  variant={v as any}
                  className="text-[10.5px] px-1.5 py-0"
                >
                  {count}
                </Badge>
              )
          )}
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
    </Link>
  );
}

/** 노션 톤 통계 카드 */
function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="shadow-none hover:bg-accent/40 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between text-muted-foreground">
          <CardDescription className="text-xs font-medium tracking-tight">
            {label}
          </CardDescription>
          {icon}
        </div>
        <CardTitle className="text-[26px] font-semibold tabular-nums tracking-tight pt-1">
          {value}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}
