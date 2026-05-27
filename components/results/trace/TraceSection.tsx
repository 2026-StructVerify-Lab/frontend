"use client";

// components/results/trace/TraceSection.tsx
//
// Agent loop의 iter별 timeline. n번째 step만 자동 펼침 옵션.

import type { TraceStep } from "@/lib/types";
import { TraceStepRow } from "./TraceStepRow";

interface Props {
  trace: TraceStep[];
  /** 마지막 step을 자동 펼침 (실시간 카드에서 진행 중인 step 강조) */
  autoOpenLast?: boolean;
  compact?: boolean;
  title?: string;
}

export function TraceSection({
  trace,
  autoOpenLast = false,
  compact = false,
  title,
}: Props) {
  const heading = title ?? `검증 과정 (${trace.length} step)`;
  const lastIdx = trace.length - 1;

  return (
    <div>
      <h4 className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">
        {heading}
      </h4>
      <ol className="space-y-1.5">
        {trace.map((step, idx) => (
          <TraceStepRow
            key={step.iter ?? idx}
            step={step}
            defaultOpen={autoOpenLast && idx === lastIdx}
            compact={compact}
          />
        ))}
      </ol>
    </div>
  );
}
