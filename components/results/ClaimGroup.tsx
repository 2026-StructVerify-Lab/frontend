"use client";

// components/results/ClaimGroup.tsx
//
// 같은 문장(claim_text)에서 나온 여러 검증 결과를 한 묶음으로 표시 + 접기/펼치기.
// 헤더 클릭 시 토글. PDF에서 해당 그룹의 claim이 focus되면 자동 펼침.

import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";

import { ClaimCard } from "./ClaimCard";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ClaimResult, Verdict } from "@/lib/types";

const VERDICT_LABEL: Record<Verdict, string> = {
  match: "일치",
  mismatch: "불일치",
  partial: "부분 일치",
  unverifiable: "검증 불가",
};

const VERDICT_DOT: Record<Verdict, string> = {
  match: "bg-verdict-match",
  mismatch: "bg-verdict-mismatch",
  partial: "bg-verdict-partial",
  unverifiable: "bg-verdict-unverifiable",
};

interface ClaimGroupProps {
  /** 원문 문장 */
  sentence: string;
  /** 이 문장에서 추출된 claim들 */
  claims: ClaimResult[];
  focusedClaimId: string | null;
  onHover: (id: string | null) => void;
  onClick: (id: string) => void;
}

export function ClaimGroup({
  sentence,
  claims,
  focusedClaimId,
  onHover,
  onClick,
}: ClaimGroupProps) {
  const [expanded, setExpanded] = useState(true);

  // focus된 claim이 이 그룹에 있으면 자동 펼침 (접혀 있어도 카드 보이게)
  useEffect(() => {
    if (
      focusedClaimId &&
      claims.some((c) => c.sent_id === focusedClaimId)
    ) {
      setExpanded(true);
    }
  }, [focusedClaimId, claims]);

  // verdict 분포
  const dist = claims.reduce((acc, c) => {
    const v = (c.verdict ?? "unverifiable") as Verdict;
    acc[v] = (acc[v] ?? 0) + 1;
    return acc;
  }, {} as Partial<Record<Verdict, number>>);

  const isMulti = claims.length > 1;
  const groupFocused = claims.some((c) => c.sent_id === focusedClaimId);

  return (
    <Card
      className={cn(
        "shadow-none overflow-hidden transition-colors",
        groupFocused && "border-foreground/25"
      )}
    >
      {/* 헤더 — 클릭하면 토글 */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className={cn(
          "w-full px-4 py-3 flex items-start gap-2.5 text-left transition-colors",
          "bg-secondary/50 hover:bg-secondary",
          expanded && "border-b border-border"
        )}
      >
        {/* Chevron — 노션 토글 톤 */}
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 mt-1 text-muted-foreground shrink-0 transition-transform duration-150",
            expanded && "rotate-90"
          )}
          aria-hidden
        />

        {/* 원문 */}
        <p className="text-[13.5px] leading-relaxed flex-1 min-w-0 text-foreground">
          {sentence || (
            <span className="text-muted-foreground italic">(원문 없음)</span>
          )}
        </p>

        {/* verdict 분포 + 카운트 — 접힌 상태에서도 한눈에 */}
        <div className="flex items-center gap-2 shrink-0 pt-0.5">
          <div className="flex items-center gap-1.5">
            {(Object.entries(dist) as [Verdict, number][]).map(([v, count]) => (
              <span
                key={v}
                className="inline-flex items-center gap-1"
                title={`${VERDICT_LABEL[v]} ${count}건`}
              >
                <span
                  className={cn("h-2 w-2 rounded-full", VERDICT_DOT[v])}
                  aria-hidden
                />
                {isMulti && (
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {count}
                  </span>
                )}
              </span>
            ))}
          </div>
          {isMulti && (
            <span className="text-[11px] text-muted-foreground border-l border-border pl-2">
              {claims.length}개
            </span>
          )}
        </div>
      </button>

      {/* 본문 — expanded일 때만 렌더 */}
      {expanded && (
        <CardContent className="p-3 space-y-2 bg-background animate-in fade-in-0 slide-in-from-top-1 duration-150">
          {claims.map((claim, idx) => (
            <div key={claim.sent_id} className="relative">
              {isMulti && (
                <span className="absolute -left-1 top-3 -translate-x-full text-[10.5px] text-muted-foreground tabular-nums pr-2 select-none hidden md:block">
                  {idx + 1}/{claims.length}
                </span>
              )}
              <ClaimCard
                claim={claim}
                focused={focusedClaimId === claim.sent_id}
                onHover={onHover}
                onClick={onClick}
              />
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}
