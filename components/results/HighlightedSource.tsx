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

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 흔히 쓰이는 한국어 단위 변형 — schema.unit이 영문/기호일 때 본문이 한국어로
 * 표기되는 케이스를 잡기 위함.
 */
const UNIT_ALIASES: Record<string, string[]> = {
  "%": ["%", "퍼센트"],
  "%포인트": ["%포인트", "%p", "%P", "퍼센트포인트", "퍼센트 포인트", "%P"],
  "%p": ["%p", "%P", "%포인트", "퍼센트포인트"],
  "명": ["명", "인", "사람"],
  "건": ["건"],
  "원": ["원"],
  "달러": ["달러", "$"],
  "kg": ["kg", "킬로그램"],
  "km": ["km", "킬로미터"],
};

function buildUnitRegex(unit: string): string {
  if (!unit) return "";
  const aliases = UNIT_ALIASES[unit] ?? [unit];
  const escaped = aliases.map((a) => escapeRegex(a));
  // 공백 옵션 + 단위 옵션 (단위가 없어도 매칭 가능하게)
  return `(?:\\s*(?:${escaped.join("|")}))?`;
}

/**
 * 한국어 큰 수 단위 표기로 변환.
 * 예: 18921 → "1만 8921", 1234567890 → "12억 3456만 7890", 100000000 → "1억"
 * 10000 미만이거나 소수면 null (변환 불필요).
 */
function toKoreanLargeNumber(n: number): string | null {
  if (!Number.isInteger(n) || n < 10000) return null;
  const units: Array<{ value: number; label: string }> = [
    { value: 1_0000_0000_0000, label: "조" },
    { value: 1_0000_0000, label: "억" },
    { value: 1_0000, label: "만" },
  ];
  const parts: string[] = [];
  let remaining = n;
  for (const u of units) {
    if (remaining >= u.value) {
      const count = Math.floor(remaining / u.value);
      parts.push(`${count}${u.label}`);
      remaining = remaining % u.value;
    }
  }
  if (remaining > 0) parts.push(String(remaining));
  return parts.join(" ");
}

/**
 * value를 source에서 찾을 정규식 패턴 빌드.
 * 한 번에 다양한 표기 변형을 모두 커버:
 *   - 음수 부호 (`-?`)
 *   - 천 단위 콤마 옵션 (큰 수)
 *   - trailing zero 허용 (2.3 ↔ 2.30 ↔ 2.300)
 *   - 정수에 .0+ 옵션 (5 ↔ 5.0)
 *   - 한국어 큰 수 표기 (18921 ↔ "1만 8921")
 *   - 단위 한국어 변형 (% ↔ 퍼센트)
 *   - 단위 앞 공백 옵션
 */
function buildValuePattern(value: number, unit: string): string | null {
  const absV = Math.abs(value);
  if (!Number.isFinite(absV)) return null;

  const valueStr = String(absV);
  const [intPart, decPart = ""] = valueStr.split(".");

  // 정수부 — 매 3자리마다 콤마 옵션
  let intRegex = "";
  if (intPart.length <= 3) {
    intRegex = intPart;
  } else {
    const chars: string[] = [];
    for (let i = 0; i < intPart.length; i++) {
      chars.push(intPart[i]);
      const remaining = intPart.length - i - 1;
      if (remaining > 0 && remaining % 3 === 0) {
        chars.push(",?");
      }
    }
    intRegex = chars.join("");
  }

  // 소수부 — trailing zero 허용
  const decRegex = decPart
    ? `\\.${decPart}0*`
    : `(?:\\.0+)?`; // 정수인데 본문엔 ".00" 추가될 수도
  const numericForm = intRegex + decRegex;

  // 한국어 큰 수 표기 변형 (예: 18921 → "1만 8921")
  // 단위 사이 공백을 \s* 로 유연하게 처리
  const alternatives: string[] = [numericForm];
  const korean = toKoreanLargeNumber(absV);
  if (korean) {
    const flexibleKorean = korean
      .split(" ")
      .map(escapeRegex)
      .join("\\s*");
    alternatives.push(flexibleKorean);
  }
  const valuePart =
    alternatives.length > 1
      ? `(?:${alternatives.join("|")})`
      : alternatives[0];

  // 부호 — 음수 부호 옵션
  const signRegex = "-?";

  // 단위
  const unitRegex = buildUnitRegex(unit);

  return signRegex + valuePart + unitRegex;
}

interface ValueMatch {
  start: number;
  end: number;
  claims: ClaimResult[];
}

/**
 * claim_text(문장)를 source에서 찾는 공백 유연 정규식.
 * 원문은 줄바꿈/탭이 있고 claim_text는 공백 1칸인 경우가 많아서
 * `\s+` 변환으로 처리.
 */
function buildFlexibleSentencePattern(sentence: string): RegExp {
  const PLACEHOLDER = "\x00WS\x00";
  const withMarker = sentence.replace(/\s+/g, PLACEHOLDER);
  const escaped = withMarker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = escaped.split(PLACEHOLDER).join("\\s+");
  return new RegExp(pattern);
}

/**
 * source에서 group(문장) 범위를 먼저 찾아서, 그 안에서만 각 claim의 value를 매칭.
 *
 * 이렇게 하면 같은 수치(예: "8.7%")가 source의 여러 문장에 등장해도
 * 각 그룹이 자기 문장 안에서 매칭하므로 위치가 겹치지 않음.
 */
function findValueMatches(source: string, groups: Group[]): ValueMatch[] {
  const matches: ValueMatch[] = [];

  // 1단계: 각 group의 sentence 범위 찾기 + claim별 value 매칭
  for (const group of groups) {
    if (group.claims.length === 0) continue;

    // 그룹 문장 범위
    let sentRange: { start: number; end: number } | null = null;
    if (group.sentence) {
      try {
        const re = buildFlexibleSentencePattern(group.sentence);
        const m = source.match(re);
        if (m && m.index !== undefined) {
          sentRange = { start: m.index, end: m.index + m[0].length };
        }
      } catch {
        // 정규식 실패 — sentRange 없이 fallback
      }
    }

    for (const claim of group.claims) {
      const rawValue = claim.schema?.value;
      if (rawValue === undefined || rawValue === null || rawValue === "")
        continue;
      const numV =
        typeof rawValue === "number" ? rawValue : parseFloat(String(rawValue));
      if (!Number.isFinite(numV)) continue;

      const unit = claim.schema?.unit ?? "";
      const pattern = buildValuePattern(numV, unit);
      if (!pattern) continue;

      // 그룹 sentence 범위 안에서 먼저 시도, 실패 시 전체 source fallback
      const candidates: Array<{ scope: string; offset: number }> = [];
      if (sentRange) {
        candidates.push({
          scope: source.slice(sentRange.start, sentRange.end),
          offset: sentRange.start,
        });
      }
      candidates.push({ scope: source, offset: 0 });

      let found: { start: number; end: number } | null = null;
      for (const { scope, offset } of candidates) {
        try {
          const re = new RegExp(pattern);
          const m = scope.match(re);
          if (m && m.index !== undefined && m[0].length > 0) {
            found = {
              start: m.index + offset,
              end: m.index + offset + m[0].length,
            };
            break;
          }
        } catch {
          // skip
        }
      }
      if (!found) continue;

      // 같은 위치에 이미 매칭된 게 있으면 claim만 추가
      const existing = matches.find(
        (m) => m.start === found!.start && m.end === found!.end
      );
      if (existing) {
        existing.claims.push(claim);
      } else {
        matches.push({ ...found, claims: [claim] });
      }
    }
  }

  // 시작 위치 기준 정렬 + 중첩 제거
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
  // 각 그룹의 sentence 범위 안에서만 value 매칭 → 같은 수치 중복 문제 회피
  const matches = findValueMatches(source, groups);

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
