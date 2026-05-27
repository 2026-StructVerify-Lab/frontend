"use client";

// components/results/trace/TraceOutputBlock.tsx
//
// Trace step의 output dict을 action별로 보기 좋게.
// ClaimCard에서 분리 — LiveClaimCard에서도 그대로 사용.

import type { TraceStep } from "@/lib/types";

interface Props {
  output: NonNullable<TraceStep["output"]>;
}

export function TraceOutputBlock({ output }: Props) {
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
