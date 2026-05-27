"use client";

// components/results/trace/PlanSection.tsx
//
// Planner LLM이 짠 검증 계획 — claim_type / formula / required_data /
// initial_steps를 한 섹션에 표시. ClaimCard와 LiveClaimCard 공통.

import { cn } from "@/lib/utils";
import type { ClaimResult } from "@/lib/types";

import { actionMeta } from "./ActionMeta";

interface Props {
  plan: NonNullable<ClaimResult["plan"]>;
  /** true면 더 작은 텍스트 (실시간 카드용) */
  compact?: boolean;
}

export function PlanSection({ plan, compact = false }: Props) {
  const baseText = compact ? "text-[10.5px]" : "text-xs";

  return (
    <div>
      <h4 className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">
        검증 계획 (Plan)
      </h4>
      <div className="space-y-1.5">
        {plan.claim_type && (
          <Row label="유형" value={plan.claim_type} mono baseText={baseText} />
        )}
        {plan.calculation_formula && (
          <Row
            label="수식"
            value={plan.calculation_formula}
            mono
            multiline
            baseText={baseText}
          />
        )}
        {plan.required_data && plan.required_data.length > 0 && (
          <div className={cn(baseText, "space-y-0.5 pt-1")}>
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
          <div className={cn(baseText, "pt-1 space-y-1")}>
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
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  multiline,
  baseText,
}: {
  label: string;
  value: string;
  mono?: boolean;
  multiline?: boolean;
  baseText: string;
}) {
  return (
    <div
      className={cn(
        "flex gap-3",
        baseText,
        multiline ? "flex-col items-start" : "items-baseline"
      )}
    >
      <span className="text-muted-foreground w-24 shrink-0">{label}</span>
      <span className={cn("flex-1", mono && "font-mono")}>{value}</span>
    </div>
  );
}
