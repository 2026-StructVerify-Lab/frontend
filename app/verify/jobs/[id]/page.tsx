"use client";

// app/verify/jobs/[id]/page.tsx — 검증 결과 페이지
//
// 핵심 레이아웃:
//   - source_type === "pdf"   → 좌: PDFViewer, 우: ClaimList
//   - source_type !== "pdf"   → 우만 (텍스트 입력은 PDF 없음)
//
// 양방향 focus:
//   PDF 하이라이트 클릭 → 우측 카드로 스크롤
//   카드 호버 → PDF 하이라이트 강조
//
// 폴링: status가 pending/running이면 2초마다 GET.

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";

import { AppShell } from "@/components/layout/AppShell";
import { ClaimGroup } from "@/components/results/ClaimGroup";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getJob } from "@/lib/api";
import type { ClaimResult, Job } from "@/lib/types";

// PDFViewer는 SSR 비활성 (react-pdf가 브라우저 전용)
const PDFViewer = dynamic(
  () => import("@/components/results/PDFViewer").then((m) => m.PDFViewer),
  { ssr: false }
);

export default function JobResultPage() {
  const params = useParams<{ id: string }>();
  const jobId = params.id;

  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [focusedClaimId, setFocusedClaimId] = useState<string | null>(null);

  // 초기 로딩 + polling
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;

    async function tick() {
      try {
        const j = await getJob(jobId);
        if (stopped) return;
        setJob(j);
        if (j.status === "pending" || j.status === "running") {
          timer = setTimeout(tick, 2000);
        }
      } catch (err: any) {
        if (!stopped) setError(err.message ?? "결과 불러오기 실패");
      }
    }
    tick();

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [jobId]);

  // 카드 클릭 시 해당 위치로 스크롤 (PDF에서)
  function handleClaimClick(sentId: string) {
    setFocusedClaimId(sentId);
    const el = document.getElementById(`claim-${sentId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // 같은 문장(claim_text)을 가진 claim들을 한 그룹으로 묶기.
  // ⚠️ Hook은 early return보다 반드시 위에 있어야 함 (호출 순서 일관성).
  //    job이 아직 null일 때도 claims를 안전하게 가져오도록 옵셔널 체이닝.
  const sentenceGroups = useMemo(() => {
    const claims = job?.result?.claims ?? [];
    const normalize = (s: string) => s.trim().replace(/\s+/g, " ");
    const map = new Map<string, ClaimResult[]>();
    for (const c of claims) {
      const key = normalize(c.claim_text ?? "");
      const arr = map.get(key) ?? [];
      arr.push(c);
      map.set(key, arr);
    }
    return Array.from(map.entries()).map(([sentence, items]) => ({
      sentence,
      claims: items,
    }));
  }, [job?.result?.claims]);

  if (error) {
    return (
      <AppShell>
        <div className="container py-8">
          <Card>
            <CardContent className="p-8 text-center text-destructive">
              {error}
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  if (!job) {
    return (
      <AppShell>
        <div className="container py-8">
          <p className="text-muted-foreground">불러오는 중…</p>
        </div>
      </AppShell>
    );
  }

  // 아직 처리 중
  if (job.status === "pending" || job.status === "running") {
    return (
      <AppShell>
        <div className="container max-w-2xl py-10 space-y-6">
          <div className="space-y-1">
            <h1 className="text-[28px] font-bold tracking-tight">검증 중</h1>
            <p className="text-sm text-muted-foreground">
              다른 페이지로 이동해도 진행 상황은 우측 하단에 계속 표시됩니다.
            </p>
          </div>
          <Card className="shadow-none">
            <CardContent className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-[13.5px] font-medium">
                  {job.current_step ?? "준비 중…"}
                </span>
                <span className="text-[13px] text-muted-foreground tabular-nums">
                  {job.progress}%
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-foreground/70 transition-all duration-500 ease-out"
                  style={{ width: `${job.progress}%` }}
                />
              </div>

              {/* 단계 체크리스트 */}
              <ProgressSteps currentProgress={job.progress} />
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  if (job.status === "failed") {
    return (
      <AppShell>
        <div className="container max-w-2xl py-8">
          <Card>
            <CardContent className="p-6 space-y-3">
              <h1 className="text-2xl font-semibold text-destructive">
                검증 실패
              </h1>
              <p className="text-sm">{job.error ?? "알 수 없는 오류"}</p>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  // status === "completed"
  const report = job.result;
  if (!report) {
    return (
      <AppShell>
        <div className="container py-8">결과가 비어있습니다.</div>
      </AppShell>
    );
  }

  const isPdf = job.source_type === "pdf" && job.source_uri;
  const claims = report.claims;

  return (
    <AppShell>
      <div className="flex flex-col h-full">
        {/* 헤더 */}
        <div className="px-6 py-4 border-b bg-background">


        <div className="flex items-center justify-between">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold truncate">
                검증 결과 · {jobId.slice(0, 8)}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {report.domain && <>도메인 {report.domain} · </>}
                {report.anchor_year && <>anchor {report.anchor_year} · </>}
                claims {claims.length}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {report.verdict_distribution &&
                Object.entries(report.verdict_distribution).map(
                  ([verdict, count]) =>
                    count > 0 && (
                      <Badge key={verdict} variant={verdict as any}>
                        {verdict} {count}
                      </Badge>
                    )
                )}
            </div>
          </div>
        </div>

        {/* 본문 — PDF 있으면 2열, 없으면 1열 */}
        <div className="flex-1 flex overflow-hidden">
          {isPdf && (
            <div className="w-1/2 border-r p-4 overflow-hidden">
              <PDFViewer
                fileUrl={job.source_uri!}
                claims={claims}
                focusedClaimId={focusedClaimId}
                onClaimClick={handleClaimClick}
              />
            </div>
          )}
          <div className={isPdf ? "w-1/2 overflow-auto" : "flex-1 overflow-auto"}>
            <div className="max-w-3xl mx-auto p-6 space-y-4">
              {!isPdf && job.source_data && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                      원문
                    </h3>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {job.source_data}
                    </p>
                  </CardContent>
                </Card>
              )}
              <Separator />
              {/* 안내 — 그룹 사용법 힌트 */}
              <p className="text-[11.5px] text-muted-foreground -mb-2 px-1">
                {sentenceGroups.some((g) => g.claims.length > 1)
                  ? "하나의 문장에서 여러 검증 결과가 나올 수 있어요. "
                  : ""}
                각 그룹의 헤더를 클릭하면 접고 펼칠 수 있습니다.
              </p>
              {sentenceGroups.map((group, idx) => (
                <ClaimGroup
                  key={`${idx}-${group.claims[0]?.sent_id}`}
                  sentence={group.sentence}
                  claims={group.claims}
                  focusedClaimId={focusedClaimId}
                  onHover={setFocusedClaimId}
                  onClick={handleClaimClick}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ── 단계별 진행 체크리스트 ────────────────────────────────────────
// 백엔드 STEP_PROGRESS 매핑 (sv_platform/pipeline_runner.py)과 정렬.

const STEPS: Array<{ threshold: number; label: string }> = [
  { threshold: 15, label: "도메인 분류" },
  { threshold: 25, label: "검증 가능 주장 탐지" },
  { threshold: 30, label: "시간 그래프 구축" },
  { threshold: 40, label: "스키마 유도" },
  { threshold: 50, label: "Claim 그래프 빌드" },
  { threshold: 65, label: "공식 통계 조회" },
  { threshold: 80, label: "수치 검증" },
  { threshold: 90, label: "근거 설명 생성" },
  { threshold: 100, label: "완료" },
];

function ProgressSteps({ currentProgress }: { currentProgress: number }) {
  return (
    <div className="pt-2 space-y-1.5 border-t">
      {STEPS.map((step) => {
        const done = currentProgress >= step.threshold;
        const active =
          !done && currentProgress >= step.threshold - 15;
        return (
          <div
            key={step.label}
            className="flex items-center gap-2 text-sm"
          >
            <span
              className={
                done
                  ? "text-verdict-match"
                  : active
                  ? "text-foreground"
                  : "text-muted-foreground/40"
              }
              aria-hidden
            >
              {done ? "✓" : active ? "○" : "·"}
            </span>
            <span
              className={
                done
                  ? "text-foreground"
                  : active
                  ? "text-foreground font-medium"
                  : "text-muted-foreground/60"
              }
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}