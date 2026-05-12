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
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { ClaimResult, Verdict } from "@/lib/types";

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
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <Icon className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={meta.badgeVariant}>{meta.label}</Badge>
                {typeof claim.confidence === "number" && (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    conf {claim.confidence.toFixed(2)}
                  </span>
                )}
              </div>
              <p className="text-sm leading-relaxed">
                {(claim.claim_text ?? "").length > 200
                  ? (claim.claim_text ?? "").slice(0, 200) + "…"
                  : claim.claim_text ?? "(원문 없음)"}
              </p>
            </div>
          </div>
        </div>

        {/* 검증 결과 핵심 (mismatch/match에서만) */}
        {(claim.verdict === "mismatch" || claim.verdict === "match") &&
          claim.evidence && (
            <div className="bg-muted/40 rounded-md p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">기사 주장</span>
                <span className="font-medium tabular-nums">
                  {claim.schema?.value}
                  {claim.schema?.unit ?? ""}
                </span>
              </div>
              {claim.computed_value !== null &&
                claim.computed_value !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">공식 통계</span>
                    <span className="font-medium tabular-nums">
                      {claim.computed_value.toFixed(3)}
                      {claim.schema?.unit ?? ""}
                    </span>
                  </div>
                )}
              {claim.formula && (
                <div className="text-xs text-muted-foreground pt-1 border-t">
                  {claim.formula}
                </div>
              )}
            </div>
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

            {/* Explanation */}
            {claim.explanation && (
              <DetailSection title="AI 설명">
                <p className="text-sm leading-relaxed">{claim.explanation}</p>
              </DetailSection>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

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