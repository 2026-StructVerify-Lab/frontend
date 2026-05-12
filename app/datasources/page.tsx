"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listJobs, listApiKeys } from "@/lib/api";
import type { Job, ApiKey } from "@/lib/types";

export default function DashboardPage() {
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
      <div className="container max-w-5xl py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">대시보드</h1>
          <Link href="/verify">
            <Button>새 검증 시작</Button>
          </Link>
        </div>

        {error && (
          <Card>
            <CardContent className="p-4 text-sm text-destructive">
              {error}
            </CardContent>
          </Card>
        )}

        {/* 통계 카드 3개 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardDescription>이번 달 검증</CardDescription>
              <CardTitle className="text-3xl">
                {loading ? "—" : completedThisMonth}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>총 API 호출</CardDescription>
              <CardTitle className="text-3xl">
                {loading ? "—" : jobs.length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>활성 API 키</CardDescription>
              <CardTitle className="text-3xl">
                {loading ? "—" : activeKeys}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* 최근 검증 */}
        <Card>
          <CardHeader>
            <CardTitle>최근 검증</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">불러오는 중…</p>
            ) : jobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                아직 검증 기록이 없습니다.{" "}
                <Link
                  href="/verify"
                  className="text-primary hover:underline"
                >
                  지금 시작하기
                </Link>
              </p>
            ) : (
              <div className="space-y-2">
                {jobs.slice(0, 5).map((job) => (
                  <RecentJobItem key={job.id} job={job} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

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
      className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 transition-colors"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className="text-xs">
            {job.source_type}
          </Badge>
          {(job.status === "running" || job.status === "pending") && (
            <Badge variant="outline" className="text-xs">
              {job.status}
            </Badge>
          )}
          {job.status === "failed" && (
            <Badge variant="destructive" className="text-xs">
              실패
            </Badge>
          )}
          {job.status === "completed" && (
            <span className="text-xs text-muted-foreground">
              claims {claimCount}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{dateStr}</p>
      </div>
      <div className="flex items-center gap-2">
        {dist &&
          Object.entries(dist).map(
            ([v, count]) =>
              count > 0 && (
                <Badge key={v} variant={v as any} className="text-xs">
                  {count}
                </Badge>
              )
          )}
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </Link>
  );
}