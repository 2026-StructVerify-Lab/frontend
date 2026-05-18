"use client";

// components/layout/NewVerifyButton.tsx
//
// "새 검증 시작" 버튼 + 진행 중 job이 있으면 자동 비활성화 + tooltip.
// 대시보드/사이드바 등 여러 곳에서 재사용.

import Link from "next/link";
import { Loader2, Sparkles } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useJobWatcher } from "@/lib/jobWatcher";
import { cn } from "@/lib/utils";

interface NewVerifyButtonProps {
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
  /** 버튼 텍스트 (기본: "새 검증 시작") */
  label?: string;
  /** 시작 아이콘 표시 여부 */
  withIcon?: boolean;
  /** Tooltip이 뜨는 방향 — 주변 컨텐츠와 겹치지 않게 위치 조절용 */
  tooltipSide?: "top" | "right" | "bottom" | "left";
  className?: string;
}

export function NewVerifyButton({
  size = "sm",
  variant = "default",
  label = "새 검증 시작",
  withIcon = true,
  tooltipSide = "bottom",
  className,
}: NewVerifyButtonProps) {
  const { hasActiveJob, activeJob } = useJobWatcher();

  // 진행 중 → 비활성. disabled 버튼은 hover 이벤트를 안 받으므로
  // span으로 감싸야 Tooltip이 동작함 (Radix 공식 패턴).
  if (hasActiveJob) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className="inline-block cursor-not-allowed">
            <Button
              size={size}
              variant={variant}
              disabled
              className={cn("pointer-events-none", className)}
            >
              {withIcon && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              {label}
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent side={tooltipSide} align="center">
          <p className="font-medium">검증이 진행 중입니다</p>
          <p className="text-muted-foreground text-[11px] mt-0.5">
            현재 검증이 끝나면 새로 시작할 수 있어요
            {activeJob && ` (${activeJob.progress}%)`}
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Link href="/verify">
      <Button size={size} variant={variant} className={className}>
        {withIcon && <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
        {label}
      </Button>
    </Link>
  );
}
