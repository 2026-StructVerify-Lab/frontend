"use client";

// components/results/ClaimCard.tsx
//
// 한 claim의 검증 결과 카드. verdict별 색상 + 펼침 가능한 상세.

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Search,
  Compass,
  Database,
  Calculator,
  Flag,
  FileText,
  Circle,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  ClaimResult,
  Verdict,
  PlanStep,
  TraceStep,
} from "@/lib/types";

const VERDICT_META: Record<
  Verdict,
  {
    label: string;
    icon: typeof CheckCircle2;
    badgeVariant: "match" | "mismatch" | "partial" | "unverifiable";
    borderClass: string;
  }
> = {
  match: {
    label: "일치",
    icon: CheckCircle2,
    badgeVariant: "match",
    borderClass: "border-l-[hsl(142_71%_45%)]",
  },
  mismatch: {
    label: "불일치",
    icon: AlertTriangle,
    badgeVariant: "mismatch",
    borderClass: "border-l-[hsl(0_84%_60%)]",
  },
  partial: {
    label: "부분 일치",
    icon: AlertCircle,
    badgeVariant: "partial",
    borderClass: "border-l-[hsl(43_96%_56%)]",
  },
  unverifiable: {
    label: "검증 불가",
    icon: HelpCircle,
    badgeVariant: "unverifiable",
    borderClass: "border-l-[hsl(220_9%_60%)]",
  },
};

interface ClaimCardProps {
  claim: ClaimResult;
  /** 이 카드가 현재 focus 상태인지 (PDF에서 호버됐을 때 등) */
  focused?: boolean;
  /** 카드 호버 시 PDF에서 해당 하이라이트 강조 */
  onHover?: (sentId: string | null) => void;
  /** 카드 클릭 시 PDF 해당 위치로 이동 */
  onClick?: (sentId: string) => void;
}

export function ClaimCard({ claim, focused, onHover, onClick }: ClaimCardProps) {
  const [expanded, setExpanded] = useState(false);
  // 백엔드가 unknown verdict 보내거나 null이면 unverifiable로 fallback
  const verdictKey: Verdict =
    claim.verdict && VERDICT_META[claim.verdict as Verdict]
      ? (claim.verdict as Verdict)
      : "unverifiable";
  const meta = VERDICT_META[verdictKey];
  const Icon = meta.icon;

  return (
    <Card
      id={`claim-${claim.sent_id}`}
      className={cn(
        "border-l-4 transition-shadow",
        meta.borderClass,
        focused && "ring-2 ring-primary shadow-md"
      )}
      onMouseEnter={() => onHover?.(claim.sent_id)}
      onMouseLeave={() => onHover?.(null)}
      onClick={() => onClick?.(claim.sent_id)}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header — claim_text는 그룹 헤더에 이미 있으니 verdict 라벨만 */}
        <div className="flex items-center gap-2">
          <Icon className="h-[18px] w-[18px] shrink-0" />
          <Badge variant={meta.badgeVariant}>{meta.label}</Badge>
          {typeof claim.confidence === "number" && (
            <span className="text-xs text-muted-foreground tabular-nums">
              conf {claim.confidence.toFixed(2)}
            </span>
          )}
        </div>

        {/* 검증 결과 — verdict별 분기 */}
        {hasComparison(claim) ? (
          <ComparisonBox claim={claim} />
        ) : (
          <AttemptBox claim={claim} />
        )}

        {/* 펼치기 토글 */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between text-muted-foreground hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
        >
          <span>{expanded ? "근거 접기" : "근거 자세히"}</span>
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>

        {/* 펼친 상세 */}
        {expanded && (
          <div className="space-y-3 pt-1 text-sm">
            {/* Schema */}
            {claim.schema && (
              <DetailSection title="스키마">
                <DetailRow label="indicator" value={claim.schema.indicator} />
                <DetailRow label="value" value={String(claim.schema.value)} />
                <DetailRow label="unit" value={claim.schema.unit ?? "—"} />
                <DetailRow
                  label="time_period"
                  value={claim.schema.time_period ?? "—"}
                />
                <DetailRow
                  label="population"
                  value={claim.schema.population ?? "—"}
                />
                <DetailRow
                  label="value_role"
                  value={claim.schema.value_role}
                  mono
                />
              </DetailSection>
            )}

            {/* Graph temporal */}
            {claim.graph_temporal && (
              <DetailSection title="시점 해소">
                <DetailRow
                  label="표현"
                  value={`"${claim.graph_temporal.expression}"`}
                />
                <DetailRow
                  label="resolved"
                  value={claim.graph_temporal.resolved}
                  mono
                />
                <DetailRow
                  label="basis"
                  value={claim.graph_temporal.basis}
                  multiline
                />
              </DetailSection>
            )}

            {/* Evidence */}
            {claim.evidence && (
              <DetailSection title="공식 통계 출처">
                <DetailRow
                  label="stat_id"
                  value={claim.evidence.stat_table_id}
                  mono
                />
                <DetailRow
                  label="stat_name"
                  value={claim.evidence.source_name}
                />
                <DetailRow
                  label="value"
                  value={`${claim.evidence.official_value ?? "—"} ${
                    claim.evidence.unit ?? ""
                  }`}
                />
                <DetailRow
                  label="time"
                  value={claim.evidence.time_period ?? "—"}
                />
                {/* KOSIS deep link (있을 때) */}
                <a
                  href={`https://kosis.kr/statHtml/statHtml.do?orgId=&tblId=${claim.evidence.stat_table_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline pt-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  KOSIS에서 보기 <ExternalLink className="h-3 w-3" />
                </a>
              </DetailSection>
            )}

            {/* Evidence Plan */}
            {claim.schema?.evidence_plan && (
              <DetailSection title="검증 plan">
                <DetailRow
                  label="combiner"
                  value={claim.schema.evidence_plan.combiner}
                  mono
                />
                <div className="space-y-1 mt-1">
                  {claim.schema.evidence_plan.requirements.map((req, i) => (
                    <div key={i} className="text-xs text-muted-foreground">
                      <span className="font-mono">[{req.role}]</span>{" "}
                      time={req.time_period} · indicator={req.indicator ?? "—"}
                      {req.label && <> · {req.label}</>}
                    </div>
                  ))}
                </div>
              </DetailSection>
            )}

            {/* [A-1] Agent loop의 검증 계획 (Planner LLM 결과) */}
            {claim.plan && <PlanSection plan={claim.plan} />}

            {/* [A-1] Agent loop의 실행 trace (iter별 action timeline) */}
            {claim.trace && claim.trace.length > 0 && (
              <TraceSection trace={claim.trace} />
            )}

            {/* Explanation — 다른 섹션과 텍스트 톤 통일(xs) + 은은한 배경으로 LLM 자연어임을 시각적으로 분리 */}
            {claim.explanation && (
              <DetailSection title="AI 설명">
                <div className="bg-muted/40 rounded-md p-3">
                  <p className="text-xs leading-relaxed text-foreground/80 whitespace-pre-wrap">
                    {claim.explanation}
                  </p>
                </div>
              </DetailSection>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── 메인 박스 ──────────────────────────────────────────
// verdict별로 어떤 정보를 보여줄지 결정. evidence + computed_value가 있으면
// 비교표(기사 vs 공식), 없으면 "검증 시도" 박스(무엇을 검증하려 했는지).

function hasComparison(claim: ClaimResult): boolean {
  const numericMatch =
    typeof claim.computed_value === "number" && !Number.isNaN(claim.computed_value);
  return (
    (claim.verdict === "match" ||
      claim.verdict === "mismatch" ||
      claim.verdict === "partial") &&
    !!claim.evidence &&
    (numericMatch || claim.schema?.value !== undefined)
  );
}

/** match/mismatch/partial — 검증 시도 (지표 + 기사 주장 vs 공식 통계 비교) */
function ComparisonBox({ claim }: { claim: ClaimResult }) {
  const unit = claim.schema?.unit ?? "";
  return (
    <div className="bg-muted/40 rounded-md p-3 text-sm space-y-1.5">
      <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">
        검증 시도
      </div>

      {claim.schema?.indicator && (
        <AttemptRow label="지표" value={claim.schema.indicator} />
      )}

      <div className="flex justify-between gap-3">
        <span className="text-muted-foreground">기사 주장</span>
        <span className="font-medium tabular-nums text-right">
          {claim.schema?.value}
          {unit}
        </span>
      </div>
      {claim.computed_value !== null && claim.computed_value !== undefined && (
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">공식 통계</span>
          <span className="font-medium tabular-nums text-right">
            {claim.computed_value.toFixed(3)}
            {unit}
          </span>
        </div>
      )}
      {claim.formula && (
        <div className="text-xs text-muted-foreground pt-1.5 border-t border-border/60">
          {claim.formula}
        </div>
      )}
    </div>
  );
}

/** unverifiable / partial(비교 없음) / evidence 없음 — "검증 시도" 핵심 요약
 *
 *  표시 항목은 의도적으로 최소화 (지표 + 기사 값만).
 *  시점·대상·explanation·evidence 같은 디테일은 하단 "근거 자세히" 토글에서 확인.
 */
function AttemptBox({ claim }: { claim: ClaimResult }) {
  const schema = claim.schema;
  const hasIndicator = !!schema?.indicator;
  const hasValue = schema?.value !== undefined && schema?.value !== null;

  // 둘 다 없으면 박스 자체 생략 (펼치기 토글로 안내됨)
  if (!hasIndicator && !hasValue) return null;

  return (
    <div className="bg-muted/40 rounded-md p-3 text-sm space-y-1.5">
      <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">
        검증 시도
      </div>

      {hasIndicator && (
        <AttemptRow label="지표" value={schema!.indicator} />
      )}
      {hasValue && (
        <AttemptRow
          label="기사 값"
          value={`${schema!.value}${schema!.unit ?? ""}`}
          mono
        />
      )}
    </div>
  );
}

function AttemptRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span
        className={cn("font-medium text-right truncate", mono && "tabular-nums")}
        title={value}
      >
        {value}
      </span>
    </div>
  );
}

// ── 펼친 상세 영역 헬퍼 ─────────────────────────────────

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">
        {title}
      </h4>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono,
  multiline,
}: {
  label: string;
  value: string;
  mono?: boolean;
  multiline?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex gap-3 text-xs",
        multiline ? "flex-col items-start" : "items-baseline"
      )}
    >
      <span className="text-muted-foreground w-24 shrink-0">{label}</span>
      <span className={cn("flex-1", mono && "font-mono")}>{value}</span>
    </div>
  );
}

// ── [A-1] Plan / Trace 컴포넌트 ──────────────────────────────────
// 백엔드가 agent_workspace에서 읽어 응답에 합쳐 보내는 plan + trace를
// 펼친 상세 영역에 timeline 형식으로 표시.

// action별 아이콘/색상 매핑. agent_loop가 호출하는 6가지 도구.
const ACTION_META: Record<
  string,
  { icon: typeof Circle; label: string; tone: string }
> = {
  explore_catalog: {
    icon: Compass,
    label: "카탈로그 탐색",
    tone: "text-purple-600 dark:text-purple-400",
  },
  catalog_search: {
    icon: Search,
    label: "표 검색",
    tone: "text-blue-600 dark:text-blue-400",
  },
  fetch_evidence: {
    icon: Database,
    label: "데이터 조회",
    tone: "text-emerald-600 dark:text-emerald-400",
  },
  calculate: {
    icon: Calculator,
    label: "계산",
    tone: "text-amber-600 dark:text-amber-400",
  },
  read_original: {
    icon: FileText,
    label: "원문 읽기",
    tone: "text-slate-600 dark:text-slate-400",
  },
  finish: {
    icon: Flag,
    label: "검증 종료",
    tone: "text-rose-600 dark:text-rose-400",
  },
};

function actionMeta(action: string) {
  return (
    ACTION_META[action] ?? {
      icon: Circle,
      label: action,
      tone: "text-muted-foreground",
    }
  );
}

/** Plan 섹션 — Planner LLM이 짠 검증 계획 (claim_type / formula / 초기 step) */
function PlanSection({ plan }: { plan: NonNullable<ClaimResult["plan"]> }) {
  return (
    <DetailSection title="검증 계획 (Plan)">
      <div className="space-y-1.5">
        {plan.claim_type && (
          <DetailRow label="유형" value={plan.claim_type} mono />
        )}
        {plan.calculation_formula && (
          <DetailRow
            label="수식"
            value={plan.calculation_formula}
            mono
            multiline
          />
        )}
        {plan.required_data && plan.required_data.length > 0 && (
          <div className="text-xs space-y-0.5 pt-1">
            <span className="text-muted-foreground">필요한 데이터</span>
            {plan.required_data.map((d, i) => (
              <div
                key={i}
                className="ml-2 text-foreground/80 font-mono text-[11px]"
              >
                · {d.indicator ?? "—"}
                {d.time && <> ({d.time})</>}
                {d.population && <> · {d.population}</>}
                {d.unit_hint && <> [{d.unit_hint}]</>}
              </div>
            ))}
          </div>
        )}
        {plan.initial_steps && plan.initial_steps.length > 0 && (
          <div className="text-xs pt-1 space-y-1">
            <span className="text-muted-foreground">초기 step</span>
            <ol className="ml-2 space-y-0.5">
              {plan.initial_steps.map((s, i) => {
                const m = actionMeta(s.action);
                const Icon = m.icon;
                return (
                  <li
                    key={i}
                    className="flex items-start gap-1.5 text-[11px]"
                  >
                    <Icon className={cn("h-3 w-3 mt-0.5 shrink-0", m.tone)} />
                    <span>
                      <span className="font-mono">{s.action}</span>
                      {s.rationale && (
                        <span className="text-muted-foreground">
                          {" "}
                          — {s.rationale}
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </div>
    </DetailSection>
  );
}

/** Trace 섹션 — Agent loop의 iter별 action 타임라인.
 *  각 step은 펼치면 input/output 상세까지. */
function TraceSection({ trace }: { trace: TraceStep[] }) {
  return (
    <DetailSection title={`검증 과정 (${trace.length} step)`}>
      <ol className="space-y-1.5">
        {trace.map((step) => (
          <TraceStepRow key={step.iter} step={step} />
        ))}
      </ol>
    </DetailSection>
  );
}

function TraceStepRow({ step }: { step: TraceStep }) {
  const [open, setOpen] = useState(false);
  const m = actionMeta(step.action);
  const Icon = m.icon;
  const hasDetails =
    !!step.rationale ||
    !!step.input ||
    !!step.output ||
    !!step.error;

  return (
    <li
      className={cn(
        "rounded-md border border-border/60 bg-muted/30 px-2.5 py-1.5",
        !step.success && "border-rose-300/60 dark:border-rose-700/40"
      )}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (hasDetails) setOpen((v) => !v);
        }}
        className={cn(
          "w-full flex items-start gap-2 text-left",
          hasDetails && "cursor-pointer"
        )}
        disabled={!hasDetails}
      >
        <span className="text-[10px] tabular-nums text-muted-foreground w-5 shrink-0 pt-0.5">
          #{step.iter}
        </span>
        <Icon className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", m.tone)} />
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex items-baseline gap-2">
            <span className="text-[11px] font-medium">{m.label}</span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {step.action}
            </span>
            {!step.success && (
              <Badge variant="mismatch" className="h-4 text-[9px]">
                실패
              </Badge>
            )}
          </div>
          {step.summary && (
            <p className="text-[11px] text-foreground/75 leading-snug line-clamp-2">
              {step.summary}
            </p>
          )}
        </div>
        {hasDetails && (
          <>
            {open ? (
              <ChevronUp className="h-3 w-3 mt-1 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-3 w-3 mt-1 shrink-0 text-muted-foreground" />
            )}
          </>
        )}
      </button>

      {open && (
        <div className="mt-2 pl-7 space-y-1.5 text-[10.5px] border-t border-border/40 pt-1.5">
          {step.rationale && (
            <div>
              <span className="text-muted-foreground">이유: </span>
              <span className="text-foreground/80">{step.rationale}</span>
            </div>
          )}
          {step.input && Object.keys(step.input).length > 0 && (
            <div>
              <span className="text-muted-foreground">입력</span>
              <pre className="mt-0.5 bg-background/60 rounded px-1.5 py-1 text-[10px] font-mono overflow-x-auto whitespace-pre-wrap break-words">
                {JSON.stringify(step.input, null, 2)}
              </pre>
            </div>
          )}
          {step.output && Object.keys(step.output).length > 0 && (
            <div>
              <span className="text-muted-foreground">결과</span>
              <TraceOutputBlock output={step.output} />
            </div>
          )}
          {step.error && (
            <div className="text-rose-600 dark:text-rose-400">
              에러: <span className="font-mono">{step.error}</span>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

/** Trace step의 output을 action별로 보기 좋게 표시 */
function TraceOutputBlock({
  output,
}: {
  output: NonNullable<TraceStep["output"]>;
}) {
  return (
    <div className="mt-0.5 space-y-1 text-foreground/80">
      {output.candidates_top3 && output.candidates_top3.length > 0 && (
        <ul className="space-y-0.5 ml-1">
          {output.candidates_top3.map((c, i) => (
            <li key={i} className="font-mono text-[10px]">
              · [{c.id}] {c.name}
            </li>
          ))}
        </ul>
      )}
      {output.categories_top3 && output.categories_top3.length > 0 && (
        <ul className="space-y-0.5 ml-1">
          {output.categories_top3.map((c, i) => (
            <li key={i} className="text-[10px]">
              · {c.category_label}{" "}
              <span className="text-muted-foreground">
                ({c.table_count}개 표)
              </span>
            </li>
          ))}
        </ul>
      )}
      {output.evidence && (
        <div className="ml-1 text-[10px]">
          <span className="font-mono">[{output.evidence.stat_table_id}]</span>{" "}
          value={String(output.evidence.value)} {output.evidence.unit ?? ""}{" "}
          (시점 {output.evidence.time_period ?? "—"})
        </div>
      )}
      {output.result !== undefined && output.result !== null && (
        <div className="ml-1 text-[10px]">
          result = <span className="font-mono">{String(output.result)}</span>
        </div>
      )}
      {output.verdict && (
        <div className="ml-1 text-[10px]">
          verdict = <span className="font-mono">{output.verdict}</span>
          {typeof output.confidence === "number" && (
            <span className="text-muted-foreground">
              {" "}
              (conf {output.confidence.toFixed(2)})
            </span>
          )}
        </div>
      )}
    </div>
  );
}