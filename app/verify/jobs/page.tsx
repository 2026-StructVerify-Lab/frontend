"use client";

// app/verify/jobs/page.tsx — 검증 히스토리 (전체 목록)
//
// 대시보드 "최근 검증" 카드의 [전체 보기 →]가 연결되는 페이지.
// 필터(상태/소스 타입) + 검색(claim 텍스트 미리보기 기준) + 더 보기 페이지네이션.

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  FileSearch,
  Filter,
  Loader2,
  Search,
  X,
} from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { NewVerifyButton } from "@/components/layout/NewVerifyButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { listJobs } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Job, JobStatus, SourceType } from "@/lib/types";

// "running"은 UI에서 pending + running을 통합해서 의미함 (사용자 입장 단순화)
type StatusFilter = "all" | "completed" | "running" | "failed";
type SourceFilter = "all" | SourceType;

const PAGE_SIZE = 20;

export default function JobsHistoryPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 필터/검색
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [query, setQuery] = useState("");

  // 첫 로드
  useEffect(() => {
    listJobs(PAGE_SIZE, 0)
      .then((j) => {
        setJobs(j);
        setHasMore(j.length === PAGE_SIZE);
      })
      .catch((err) => setError(err.message ?? "검증 목록 불러오기 실패"))
      .finally(() => setLoading(false));
  }, []);

  // 더 보기
  async function loadMore() {
    setLoadingMore(true);
    try {
      const next = await listJobs(PAGE_SIZE, jobs.length);
      setJobs((prev) => [...prev, ...next]);
      if (next.length < PAGE_SIZE) setHasMore(false);
    } catch (err: any) {
      setError(err.message ?? "추가 로딩 실패");
    } finally {
      setLoadingMore(false);
    }
  }

  // 상태 매칭 — "running" 필터는 pending까지 포함
  const matchesStatus = (s: JobStatus): boolean => {
    if (statusFilter === "all") return true;
    if (statusFilter === "running") return s === "running" || s === "pending";
    return s === statusFilter;
  };

  // 필터 적용 (client-side)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter((j) => {
      if (!matchesStatus(j.status)) return false;
      if (sourceFilter !== "all" && j.source_type !== sourceFilter) return false;
      if (q) {
        // 검색: job id 일부 + source_data 텍스트 일부 + 첫 claim 텍스트
        const haystack = [
          j.id,
          j.source_data ?? "",
          j.source_uri ?? "",
          ...(j.result?.claims?.map((c) => c.claim_text ?? "") ?? []),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [jobs, statusFilter, sourceFilter, query]);

  const hasAnyFilter =
    statusFilter !== "all" || sourceFilter !== "all" || query.trim() !== "";

  function resetFilters() {
    setStatusFilter("all");
    setSourceFilter("all");
    setQuery("");
  }

  return (
    <AppShell>
      <div className="container max-w-5xl py-10 space-y-8">
        {/* 헤더 — 대시보드와 톤 통일 */}
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-[28px] font-bold tracking-tight">
              검증 히스토리
            </h1>
            <p className="text-sm text-muted-foreground">
              지금까지 진행한 모든 검증 결과를 확인할 수 있어요.
            </p>
          </div>
          <NewVerifyButton tooltipSide="left" />
        </div>

        {/* 필터 바 */}
        <div className="space-y-3">
          {/* 검색 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="claim 본문, ID, 원문 일부로 검색"
              className="pl-9 pr-9"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="검색어 지우기"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* 칩 필터 */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <FilterChipGroup
              label="상태"
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as StatusFilter)}
              options={[
                { value: "all", label: "전체" },
                { value: "completed", label: "완료" },
                { value: "running", label: "진행 중" },
                { value: "failed", label: "실패" },
              ]}
            />
            {/* 그룹 구분선 — 라벨과 칩의 위계를 시각적으로 명확하게 */}
            <div className="h-4 w-px bg-border" aria-hidden />
            <FilterChipGroup
              label="소스"
              value={sourceFilter}
              onChange={(v) => setSourceFilter(v as SourceFilter)}
              options={[
                { value: "all", label: "전체" },
                { value: "text", label: "텍스트" },
                { value: "pdf", label: "PDF" },
                { value: "docx", label: "DOCX" },
                { value: "url", label: "URL" },
              ]}
            />
            {hasAnyFilter && (
              <button
                onClick={resetFilters}
                className="ml-auto text-[11.5px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                초기화
              </button>
            )}
          </div>

          {/* 결과 카운트 */}
          {!loading && !error && (
            <p className="text-[11.5px] text-muted-foreground tabular-nums">
              {filtered.length}건
              {hasAnyFilter && jobs.length !== filtered.length && (
                <> · 전체 {jobs.length}건 중</>
              )}
            </p>
          )}
        </div>

        {/* 에러 */}
        {error && (
          <Card className="border-destructive/40 shadow-none">
            <CardContent className="p-4 text-sm text-destructive">
              {error}
            </CardContent>
          </Card>
        )}

        {/* 리스트 */}
        {loading ? (
          <Card className="shadow-none">
            <CardContent className="py-16 text-center text-sm text-muted-foreground">
              불러오는 중…
            </CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          jobs.length === 0 ? (
            <EmptyAllCard />
          ) : (
            <EmptyFilterCard onReset={resetFilters} />
          )
        ) : (
          <Card className="shadow-none">
            <CardContent className="p-2">
              <div className="space-y-0.5">
                {filtered.map((job) => (
                  <JobRow key={job.id} job={job} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 더 보기 (필터 안 적용된 경우만, 즉 새로 더 불러올 가치 있을 때) */}
        {!loading && hasMore && !hasAnyFilter && jobs.length > 0 && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={loadMore}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  불러오는 중…
                </>
              ) : (
                "더 보기"
              )}
            </Button>
          </div>
        )}
      </div>
    </AppShell>
  );
}

// ── 부속 컴포넌트들 ──────────────────────────────────────────

interface ChipOption {
  value: string;
  label: string;
}

function FilterChipGroup({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: ChipOption[];
}) {
  return (
    <div className="inline-flex items-center gap-1.5">
      {/* 라벨 — 칩과 구분되도록 더 진하게 + 자간 좁게 + 콜론 */}
      <span className="text-[11px] font-semibold text-foreground/80 tracking-tight shrink-0">
        {label}
      </span>
      <div className="inline-flex items-center gap-0.5">
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "text-[11.5px] px-2 py-1 rounded-md transition-colors",
              value === o.value
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function JobRow({ job }: { job: Job }) {
  const date = new Date(job.created_at);
  const dateStr = date.toLocaleString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const claimCount = job.result?.claims?.length ?? 0;
  const dist = job.result?.verdict_distribution;

  // 본문 미리보기 (텍스트면 본문, URL이면 URL, 파일이면 source_uri 마지막 부분)
  let preview = "";
  if (job.source_type === "text" && job.source_data) {
    preview = job.source_data.slice(0, 80);
  } else if (job.source_type === "url" && job.source_uri) {
    preview = job.source_uri;
  } else if (job.source_uri) {
    preview = job.source_uri.split("/").pop() ?? "";
  }

  return (
    <Link
      href={`/verify/jobs/${job.id}`}
      className="flex items-center gap-3 p-3 rounded-md hover:bg-accent/60 transition-colors group"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className="text-[10.5px] px-1.5 py-0">
            {job.source_type}
          </Badge>
          {(job.status === "running" || job.status === "pending") && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              진행 중
            </span>
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
          <span className="text-[11px] text-muted-foreground/60 tabular-nums ml-auto">
            {dateStr}
          </span>
        </div>
        {preview && (
          <p className="text-[12.5px] text-muted-foreground truncate">
            {preview}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
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
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
      </div>
    </Link>
  );
}

function EmptyAllCard() {
  return (
    <Card className="shadow-none">
      <CardContent className="py-16 flex flex-col items-center text-center">
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

function EmptyFilterCard({ onReset }: { onReset: () => void }) {
  return (
    <Card className="shadow-none">
      <CardContent className="py-16 flex flex-col items-center text-center">
        <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center mb-3">
          <Search className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">
          조건에 맞는 검증이 없어요
        </p>
        <p className="text-xs text-muted-foreground mt-1 mb-4">
          필터나 검색어를 다시 한번 확인해보세요.
        </p>
        <Button size="sm" variant="outline" onClick={onReset}>
          필터 초기화
        </Button>
      </CardContent>
    </Card>
  );
}
