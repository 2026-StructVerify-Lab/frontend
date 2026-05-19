"use client";

// components/results/HighlightedSource.tsx
//
// 원문(source_data) 위에 검증된 "수치"만 verdict 색으로 하이라이트.
// 문장 전체가 아니라 schema.value(+unit)만 잡아서 본문 가독성을 살림.
//
// - 호버: Tooltip으로 verdict 분포 + "클릭해서 결과 보기" 안내
// - 클릭: 해당 결과 카드로 스크롤
// - 같은 수치를 가리키는 claim 여러 개면 → 우선순위 색 + 작은 색점 인디케이터

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

const DOT_BG: Record<Verdict, string> = {
  match: "bg-verdict-match",
  mismatch: "bg-verdict-mismatch",
  partial: "bg-verdict-partial",
  unverifiable: "bg-verdict-unverifiable",
};

// 색 우선순위 — "가장 주목해야 할 결과" 우선
//   mismatch(빨강, 위험) > unverifiable(회색, 주의) > partial(노랑) > match(초록, 안심)
const PRIORITY: Record<Verdict, number> = {
  mismatch: 4,
  unverifiable: 3,
  partial: 2,
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

function verdictsInGroup(claims: ClaimResult[]): Verdict[] {
  const set = new Set<Verdict>();
  for (const c of claims) {
    set.add((c.verdict ?? "unverifiable") as Verdict);
  }
  return Array.from(set).sort(
    (a, b) => (PRIORITY[b] ?? 0) - (PRIORITY[a] ?? 0)
  );
}

// ── 매칭 알고리즘 ────────────────────────────────────────

function addCommas(s: string): string {
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * 한 claim의 schema.value를 source에서 찾기 위한 후보 문자열들 생성.
 * 우선순위 순서대로 시도:
 *   1. "6.7%" — value + unit (가장 정확)
 *   2. "20,171" / "20171" — 큰 수는 콤마 변형도 시도
 *   3. "6.7"   — value만 (unit이 없는 경우 / 본문이 unit 다음에 적어둔 경우)
 */
function buildSearchCandidates(claim: ClaimResult): string[] {
  const v = claim.schema?.value;
  if (v === undefined || v === null) return [];
  const unit = claim.schema?.unit ?? "";
  const vs = String(v);
  const candidates: string[] = [];

  // 정수 + 천 단위 이상이면 콤마 변형도 시도
  const isLargeInt = /^\d{4,}$/.test(vs);
  const commaed = isLargeInt ? addCommas(vs) : null;

  if (unit) {
    candidates.push(vs + unit);
    if (commaed) candidates.push(commaed + unit);
    candidates.push(vs + " " + unit); // 공백 포함 변형
  }
  if (commaed) candidates.push(commaed);
  candidates.push(vs);
  return candidates;
}

interface ValueMatch {
  start: number;
  end: number;
  /** 이 위치를 가리키는 claim들 (중복 가능 — 같은 수치를 여러 검증이 사용) */
  claims: ClaimResult[];
}

/** source에서 모든 claim의 value 위치 찾기 */
function findValueMatches(source: string, claims: ClaimResult[]): ValueMatch[] {
  const matches: ValueMatch[] = [];

  for (const claim of claims) {
    const candidates = buildSearchCandidates(claim);
    let found: { start: number; end: number } | null = null;

    for (const cand of candidates) {
      const idx = source.indexOf(cand);
      if (idx !== -1) {
        found = { start: idx, end: idx + cand.length };
        break;
      }
    }
    if (!found) continue;

    // 같은 위치에 이미 매칭된 match가 있으면 claim만 추가, 없으면 새로
    const existing = matches.find(
      (m) => m.start === found!.start && m.end === found!.end
    );
    if (existing) {
      existing.claims.push(claim);
    } else {
      matches.push({ ...found, claims: [claim] });
    }
  }

  // 시작 위치 기준 정렬 + 중첩 제거 (먼저 시작한 것 우선)
  matches.sort((a, b) => a.start - b.start);
  const nonOverlap: ValueMatch[] = [];
  let cursor = 0;
  for (const m of matches) {
    if (m.start >= cursor) {
      nonOverlap.push(m);
      cursor = m.end;
    }
  }
  return nonOverlap;
}

// ── 컴포넌트 ────────────────────────────────────────

interface Group {
  sentence: string;
  claims: ClaimResult[];
}

interface HighlightedSourceProps {
  source: string;
  groups: Group[];
  focusedClaimId: string | null;
  onHover: (sentId: string | null) => void;
  onClick: (sentId: string) => void;
}

export function HighlightedSource({
  source,
  groups,
  focusedClaimId,
  onHover,
  onClick,
}: HighlightedSourceProps) {
  // 모든 claim flatten
  const allClaims = groups.flatMap((g) => g.claims);
  const matches = findValueMatches(source, allClaims);

  // 원문을 텍스트 / 하이라이트 조각으로 잘라서 렌더
  const parts: React.ReactNode[] = [];
  let pos = 0;
  for (const m of matches) {
    if (m.start > pos) {
      parts.push(
        <Fragment key={`t-${pos}`}>{source.slice(pos, m.start)}</Fragment>
      );
    }
    parts.push(
      <HighlightedValue
        key={`v-${m.start}`}
        text={source.slice(m.start, m.end)}
        claims={m.claims}
        focused={m.claims.some((c) => c.sent_id === focusedClaimId)}
        onHover={onHover}
        onClick={onClick}
      />
    );
    pos = m.end;
  }
  if (pos < source.length) {
    parts.push(<Fragment key="t-end">{source.slice(pos)}</Fragment>);
  }

  return (
    <p className="text-sm whitespace-pre-wrap leading-relaxed">{parts}</p>
  );
}

// ── 하이라이트된 수치 ──────────────────────────────────────

function HighlightedValue({
  text,
  claims,
  focused,
  onHover,
  onClick,
}: {
  text: string;
  claims: ClaimResult[];
  focused: boolean;
  onHover: (sentId: string | null) => void;
  onClick: (sentId: string) => void;
}) {
  const verdict = dominantVerdict(claims);
  const distinctVerdicts = verdictsInGroup(claims);
  const isMixed = distinctVerdicts.length > 1;
  const firstSentId = claims[0]?.sent_id;

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
          {/* 혼합 verdict — 어떤 결과들이 섞였는지 점으로 표시 */}
          {isMixed && (
            <span
              className="inline-flex items-center gap-[2px] ml-1 align-middle whitespace-nowrap"
              aria-label="여러 verdict 혼합"
            >
              {distinctVerdicts.map((v) => (
                <span
                  key={v}
                  className={cn(
                    "h-[6px] w-[6px] rounded-full ring-1 ring-background",
                    DOT_BG[v]
                  )}
                />
              ))}
            </span>
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" align="start" className="max-w-[280px]">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            {distinctVerdicts.map((v) => (
              <span
                key={v}
                className="inline-flex items-center gap-1 text-[11.5px]"
              >
                <span
                  className={cn("h-1.5 w-1.5 rounded-full", DOT_BG[v])}
                />
                <span className="font-medium">{VERDICT_LABEL[v]}</span>
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
