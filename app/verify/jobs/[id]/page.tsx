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
import {
  FileText,
  Printer,
  Loader2,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/AppShell";
import { ClaimGroup } from "@/components/results/ClaimGroup";
import { HighlightedSource } from "@/components/results/HighlightedSource";
import { AILogConsole } from "@/components/results/AILogConsole";
import { PlanSection } from "@/components/results/trace/PlanSection";
import { TraceSection } from "@/components/results/trace/TraceSection";
import { actionMeta } from "@/components/results/trace/ActionMeta";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { getJob } from "@/lib/api";
import { downloadJobAsTxt, printAsPdf } from "@/lib/exporters";
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
  // 클릭으로만 발동되는 펼침/스크롤 신호 (hover와 분리)
  // ts를 같이 보내서 같은 id를 다시 클릭해도 effect가 재발동되게 함
  const [scrollTarget, setScrollTarget] = useState<{
    id: string;
    ts: number;
  } | null>(null);

  // PDF 인쇄 시 모든 그룹을 펼치기 위한 카운터 — 값이 바뀔 때마다 발동
  const [expandAllCounter, setExpandAllCounter] = useState(0);

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

  // 카드 클릭 시 (원문/PDF/JobsBadge에서 → 결과 카드로)
  // scrollTarget 신호로 ClaimGroup의 자동 펼침을 트리거 + 스크롤
  function handleClaimClick(sentId: string) {
    setFocusedClaimId(sentId);
    setScrollTarget({ id: sentId, ts: Date.now() });
    // 1) 그룹의 expand effect가 발동될 시간 + 2) DOM 업데이트 시간 확보
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.getElementById(`claim-${sentId}`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
  }

  // TXT 다운로드
  function handleDownloadTxt() {
    if (!job) return;
    try {
      downloadJobAsTxt(job);
      toast.success("TXT 파일이 다운로드되었습니다");
    } catch (err) {
      toast.error("다운로드에 실패했습니다");
    }
  }

  // PDF 인쇄 — 인쇄 dialog 띄우기 전에 모든 그룹 펼침
  function handleDownloadPdf() {
    setExpandAllCounter((c) => c + 1);
    toast.info("인쇄 대화상자에서 'PDF로 저장'을 선택하세요", {
      duration: 4000,
    });
    // 펼침 effect + DOM 반영 대기 후 print 호출
    setTimeout(() => printAsPdf(), 250);
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
    // [실시간 노출] 백엔드가 status=running일 때도 workspace에서 읽은 partial
    // claims를 result.claims에 채워 보냄. 있으면 progressively 렌더.
    const liveClaims = job.result?.claims ?? [];

    return (
      <AppShell>
        <div className="container max-w-3xl py-10 space-y-6">
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

          {/* [실시간] 지금까지 만들어진 claim + plan/trace */}
          {liveClaims.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-baseline gap-2">
                <h2 className="text-[15px] font-semibold">
                  지금까지 발견된 주장
                </h2>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {liveClaims.length}개
                </span>
              </div>
              <div className="space-y-2.5">
                {liveClaims.map((c, idx) => (
                  <LiveClaimCard
                    key={c.claim_id ?? c.sent_id ?? idx}
                    claim={c}
                    index={idx + 1}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
        {/* AI 콘솔 — 로딩 화면에서도 LLM raw 입출력을 실시간으로 따라갈 수 있게 */}
        <AILogConsole jobId={jobId} liveRefresh />
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


        <div className="flex items-center justify-between gap-4">
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
            <div className="flex items-center gap-2 shrink-0" data-no-print>
              {/* verdict 분포 배지 */}
              <div className="flex items-center gap-1.5">
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
              {/* 구분선 */}
              <div className="h-5 w-px bg-border mx-1" aria-hidden />
              {/* 다운로드 버튼들 */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadTxt}
                title="검증 결과를 텍스트 파일로 저장"
              >
                <FileText className="h-3.5 w-3.5 mr-1.5" />
                TXT
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPdf}
                title="브라우저 인쇄 대화상자로 PDF 저장"
              >
                <Printer className="h-3.5 w-3.5 mr-1.5" />
                PDF
              </Button>
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
                <Card className="shadow-none">
                  <CardContent className="p-4">
                    <h3 className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">
                      원문
                    </h3>
                    <HighlightedSource
                      source={job.source_data}
                      groups={sentenceGroups}
                      focusedClaimId={focusedClaimId}
                      onHover={setFocusedClaimId}
                      onClick={handleClaimClick}
                    />
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
                  scrollTarget={scrollTarget}
                  expandAllSignal={expandAllCounter}
                  onHover={setFocusedClaimId}
                  onClick={handleClaimClick}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* AI 콘솔 — 완료된 잡의 모든 LLM 입출력 lazy fetch */}
      <AILogConsole jobId={jobId} />
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

// ── 실시간 partial claim 카드 ────────────────────────────────────
// status=pending/running 중에 백엔드 workspace에서 읽은 partial 데이터를
// progressively 렌더. verdict 아직 없을 수 있고 trace는 자라는 중.
//
// [2026-05-27] 결과 카드와 동일한 PlanSection/TraceSection 사용 — LLM의
// thought(자연어 사고)·input·output을 펼치면 전부 보임. 마지막 iter는
// autoOpenLast=true로 자동 펼침.

function LiveClaimCard({
  claim,
  index,
}: {
  claim: ClaimResult;
  index: number;
}) {
  const [open, setOpen] = useState(false);
  const hasVerdict = !!claim.verdict;
  const trace = claim.trace ?? [];
  const lastTrace = trace[trace.length - 1];
  const lastAction = lastTrace?.action;
  const meta = lastAction ? actionMeta(lastAction) : null;
  const Icon = meta?.icon ?? Loader2;
  // 마지막 LLM 사고 — 카드 헤더에서 한 줄로 미리보기
  const lastThought = (lastTrace?.thought || lastTrace?.rationale || "").trim();

  return (
    <Card
      className={cn(
        "border-l-4 shadow-none transition-all",
        hasVerdict
          ? "border-l-foreground/30"
          : "border-l-foreground/60 animate-pulse-slow"
      )}
    >
      <CardContent className="p-3 space-y-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full text-left flex items-start gap-2"
        >
          <span className="text-[10px] tabular-nums text-muted-foreground w-5 shrink-0 pt-1">
            #{index}
          </span>
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-[12.5px] leading-snug line-clamp-2 text-foreground/85">
              {claim.claim_text || "(주장 텍스트 로딩 중)"}
            </p>
            <div className="flex items-center gap-1.5 text-[10.5px] flex-wrap">
              {meta ? (
                <>
                  <Icon className={cn("h-3 w-3", meta.tone)} />
                  <span className={meta.tone}>{meta.label}</span>
                  <span className="text-muted-foreground">
                    · iter {lastTrace?.iter}
                  </span>
                </>
              ) : claim.plan ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                  <span className="text-muted-foreground">계획 수립 완료</span>
                </>
              ) : (
                <>
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                  <span className="text-muted-foreground">대기 중…</span>
                </>
              )}
              {hasVerdict && (
                <Badge variant={claim.verdict as any} className="h-4 text-[9px]">
                  {claim.verdict}
                </Badge>
              )}
            </div>
            {/* LLM 사고 한 줄 미리보기 — 펼치지 않아도 보이게 (사용자가 가장 보고 싶은 정보) */}
            {lastThought && (
              <div className="flex items-start gap-1 text-[10.5px]">
                <Sparkles className="h-3 w-3 mt-0.5 shrink-0 text-violet-500 dark:text-violet-400" />
                <p className="text-foreground/75 leading-snug line-clamp-2">
                  {lastThought}
                </p>
              </div>
            )}
          </div>
          {open ? (
            <ChevronUp className="h-3.5 w-3.5 mt-1 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 mt-1 shrink-0 text-muted-foreground" />
          )}
        </button>

        {open && (
          <div className="pl-7 space-y-3 border-t pt-2">
            {/* schema (있을 때) — 짧게 한 줄 */}
            {claim.schema && (
              <div className="text-[11px] text-muted-foreground">
                지표:{" "}
                <span className="text-foreground/85 font-medium">
                  {claim.schema.indicator}
                </span>
                {claim.schema.value !== null &&
                  claim.schema.value !== undefined && (
                    <>
                      {" "}
                      ={" "}
                      <span className="font-mono text-foreground/85">
                        {String(claim.schema.value)}
                        {claim.schema.unit ?? ""}
                      </span>
                    </>
                  )}
                {claim.schema.time_period && <> ({claim.schema.time_period})</>}
              </div>
            )}

            {/* Plan — 결과 카드와 동일 UI */}
            {claim.plan && <PlanSection plan={claim.plan} compact />}

            {/* Trace — 마지막 step 자동 펼침 (실시간 진행감) */}
            {trace.length > 0 && (
              <TraceSection
                trace={trace}
                autoOpenLast={!hasVerdict}
                compact
                title={`진행 (${trace.length}/${claim.plan?.initial_steps?.length ?? "?"} step)`}
              />
            )}

            {/* explanation (verdict 났을 때) */}
            {claim.explanation && (
              <div className="bg-muted/40 rounded p-2">
                <p className="text-[10.5px] leading-snug text-foreground/75 whitespace-pre-wrap line-clamp-4">
                  {claim.explanation}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}