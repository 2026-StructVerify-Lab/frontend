"use client";

// components/results/HighlightedSource.tsx
//
// 원문(source_data) 위에 검증된 문장을 verdict 색으로 하이라이트.
// - 호버: Tooltip으로 verdict 분포 + "클릭해서 결과 보기" 안내
// - 클릭: 해당 그룹의 결과 카드로 스크롤

import { Fragment } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ClaimResult, Verdict } from "@/lib/types";

const VERDICT_LABEL: Record<Verdict, string> = {
  match: "일치",
  mismatch: "불일치",
  partial: "부분 일치",
  unverifiable: "검증 불가",
};

// 그룹 대표 verdict 우선순위 — 사용자가 가장 주목해야 할 것 우선
//   mismatch(빨강) > partial(노랑) > unverifiable(회색) > match(초록)
const PRIORITY: Record<Verdict, number> = {
  mismatch: 4,
  partial: 3,
  unverifiable: 2,
  match: 1,
};

function dominantVerdict(claims: ClaimResult[]): Verdict {
  let best: Verdict = "unverifiable";
  let bestScore = -1;
  for (const c of claims) {
    const v = (c.verdict ?? "unverifiable") as Verdict;
    const score = PRIORITY[v] ?? 0;
    if (score > bestScore) {
      bestScore = score;
      best = v;
    }
  }
  return best;
}

interface Group {
  sentence: string;
  claims: ClaimResult[];
}

interface HighlightedSourceProps {
  /** 원문 전체 */
  source: string;
  /** 그룹화된 claim들 */
  groups: Group[];
  /** 현재 focus된 claim id — 매칭되는 그룹은 강조 */
  focusedClaimId: string | null;
  /** 호버 시 부모에 알림 (PDFViewer 동기화 등) */
  onHover: (sentId: string | null) => void;
  /** 클릭 시 결과 카드로 스크롤 */
  onClick: (sentId: string) => void;
}

export function HighlightedSource({
  source,
  groups,
  focusedClaimId,
  onHover,
  onClick,
}: HighlightedSourceProps) {
  // 원문에서 각 그룹 문장의 위치 찾기
  const matches: Array<{
    start: number;
    end: number;
    group: Group;
  }> = [];

  for (const group of groups) {
    if (!group.sentence) continue;
    // 정확 일치 우선 시도
    let idx = source.indexOf(group.sentence);
    if (idx === -1) {
      // 공백 차이 등으로 안 맞을 수 있으니, 첫 20자로 fuzzy 시도
      const head = group.sentence.slice(0, 20);
      idx = source.indexOf(head);
    }
    if (idx !== -1) {
      matches.push({
        start: idx,
        end: idx + group.sentence.length,
        group,
      });
    }
  }

  // 시작 위치 기준 정렬 + 중첩 제거 (먼저 잡힌 게 우선)
  matches.sort((a, b) => a.start - b.start);
  const nonOverlap: typeof matches = [];
  let cursor = 0;
  for (const m of matches) {
    if (m.start >= cursor) {
      nonOverlap.push(m);
      cursor = m.end;
    }
  }

  // 원문을 텍스트 / 하이라이트 조각으로 나눠 렌더
  const parts: React.ReactNode[] = [];
  let pos = 0;
  for (let i = 0; i < nonOverlap.length; i++) {
    const m = nonOverlap[i];
    if (m.start > pos) {
      parts.push(
        <Fragment key={`t-${pos}`}>{source.slice(pos, m.start)}</Fragment>
      );
    }
    parts.push(
      <HighlightedSentence
        key={`h-${m.start}`}
        text={source.slice(m.start, m.end)}
        group={m.group}
        focused={m.group.claims.some((c) => c.sent_id === focusedClaimId)}
        onHover={onHover}
        onClick={onClick}
      />
    );
    pos = m.end;
  }
  if (pos < source.length) {
    parts.push(<Fragment key={`t-end`}>{source.slice(pos)}</Fragment>);
  }

  return (
    <p className="text-sm whitespace-pre-wrap leading-relaxed">{parts}</p>
  );
}

// ── 하이라이트된 한 문장 ───────────────────────────────────

function HighlightedSentence({
  text,
  group,
  focused,
  onHover,
  onClick,
}: {
  text: string;
  group: Group;
  focused: boolean;
  onHover: (sentId: string | null) => void;
  onClick: (sentId: string) => void;
}) {
  const verdict = dominantVerdict(group.claims);
  const firstSentId = group.claims[0]?.sent_id;
  const dist = group.claims.reduce((acc, c) => {
    const v = (c.verdict ?? "unverifiable") as Verdict;
    acc[v] = (acc[v] ?? 0) + 1;
    return acc;
  }, {} as Partial<Record<Verdict, number>>);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn("claim-highlight", verdict, focused && "focused")}
          onMouseEnter={() => firstSentId && onHover(firstSentId)}
          onMouseLeave={() => onHover(null)}
          onClick={(e) => {
            e.stopPropagation();
            if (firstSentId) onClick(firstSentId);
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && firstSentId) {
              e.preventDefault();
              onClick(firstSentId);
            }
          }}
        >
          {text}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" align="start" className="max-w-[280px]">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            {(Object.entries(dist) as [Verdict, number][]).map(([v, count]) => (
              <span
                key={v}
                className="inline-flex items-center gap-1 text-[11.5px]"
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    v === "match" && "bg-verdict-match",
                    v === "mismatch" && "bg-verdict-mismatch",
                    v === "partial" && "bg-verdict-partial",
                    v === "unverifiable" && "bg-verdict-unverifiable"
                  )}
                />
                <span className="font-medium">{VERDICT_LABEL[v]}</span>
                <span className="text-muted-foreground tabular-nums">
                  {count}
                </span>
              </span>
            ))}
          </div>
          <p className="text-[10.5px] text-muted-foreground">
            클릭해서 결과 자세히 보기 →
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
