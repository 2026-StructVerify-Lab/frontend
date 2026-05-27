"use client";

// components/results/trace/TraceStepRow.tsx
//
// 한 iter trace step을 카드 한 줄 + 펼쳤을 때 상세.
// - 헤더: iter # + action 아이콘/라벨 + summary 한 줄
// - LLM 생각 (thought): 헤더 바로 아래, ★ 별표로 prominently 노출. 항상 보임.
// - 펼치면: rationale, input(JSON), output(action별), error
//
// 백엔드 obs_dict의 `thought` 필드(reflect LLM의 자연어 사고)가 핵심.
// 없을 때는 rationale(planner가 적은 사유)로 fallback해서 항상 뭔가 보이게.

import { useState } from "react";
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { TraceStep } from "@/lib/types";

import { actionMeta } from "./ActionMeta";
import { TraceOutputBlock } from "./TraceOutputBlock";

interface Props {
  step: TraceStep;
  /** true면 처음부터 펼친 상태 (실시간 카드에서 마지막 iter 강조용) */
  defaultOpen?: boolean;
  /** true면 더 작은 텍스트 (실시간 카드용), false면 결과 카드용 */
  compact?: boolean;
}

export function TraceStepRow({ step, defaultOpen = false, compact = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const m = actionMeta(step.action);
  const Icon = m.icon;

  // LLM의 자연어 사고 — thought 우선, 없으면 rationale fallback
  const thought = (step.thought || step.rationale || "").trim();

  const hasDetails =
    !!step.input ||
    !!step.output ||
    !!step.error ||
    !!step.rationale ||
    !!step.thought ||
    !!step.summary;

  const baseText = compact ? "text-[10.5px]" : "text-[11px]";
  const iconSize = compact ? "h-3 w-3" : "h-3.5 w-3.5";

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
        <Icon className={cn(iconSize, "mt-0.5 shrink-0", m.tone)} />
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className={cn(baseText, "font-medium")}>{m.label}</span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {step.action}
            </span>
            {typeof step.confidence_so_far === "number" && (
              <span className="text-[10px] text-muted-foreground tabular-nums">
                conf {step.confidence_so_far.toFixed(2)}
              </span>
            )}
            {!step.success && (
              <Badge variant="mismatch" className="h-4 text-[9px]">
                실패
              </Badge>
            )}
            {step.proposed_verdict && (
              <Badge
                variant={step.proposed_verdict as any}
                className="h-4 text-[9px]"
              >
                제안: {step.proposed_verdict}
              </Badge>
            )}
          </div>
          {step.summary && (
            <p
              className={cn(
                baseText,
                "text-foreground/75 leading-snug line-clamp-2"
              )}
            >
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

      {/* LLM 생각 — 펼치기 토글과 무관하게 항상 노출 (사용자가 가장 보고 싶어함) */}
      {thought && (
        <div className="mt-1.5 pl-7 flex items-start gap-1.5">
          <Sparkles className="h-3 w-3 mt-0.5 shrink-0 text-violet-500 dark:text-violet-400" />
          <p
            className={cn(
              "leading-snug text-foreground/85",
              compact ? "text-[10.5px]" : "text-[11px]"
            )}
          >
            <span className="text-violet-600 dark:text-violet-400 font-medium">
              생각:
            </span>{" "}
            {thought}
          </p>
        </div>
      )}

      {open && (
        <div className="mt-2 pl-7 space-y-1.5 text-[10.5px] border-t border-border/40 pt-1.5">
          {step.rationale && step.thought && step.thought !== step.rationale && (
            <div>
              <span className="text-muted-foreground">계획 단계 사유: </span>
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
