"use client";

// components/layout/ThemeToggle.tsx
//
// 라이트 ↔ 다크 토글. 시스템 모드 따라가는 옵션도 있지만,
// 노션 스타일 단순함을 위해 light <-> dark 두 가지만 토글.

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  /** 사이드바 collapsed 형태 등에서 라벨 숨길 때 */
  iconOnly?: boolean;
  className?: string;
}

export function ThemeToggle({ iconOnly = false, className }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // hydration mismatch 방지 — mount 전에는 placeholder만
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 text-[13.5px] text-muted-foreground hover:bg-accent/70 hover:text-foreground transition-colors w-full",
        className
      )}
      aria-label={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
      title={isDark ? "라이트 모드" : "다크 모드"}
    >
      {/* 아이콘 — 부드러운 회전 트랜지션 */}
      <span className="relative h-[15px] w-[15px] shrink-0">
        <Sun
          className={cn(
            "absolute inset-0 h-[15px] w-[15px] transition-all",
            isDark ? "scale-0 rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100"
          )}
        />
        <Moon
          className={cn(
            "absolute inset-0 h-[15px] w-[15px] transition-all",
            isDark ? "scale-100 rotate-0 opacity-100" : "scale-0 -rotate-90 opacity-0"
          )}
        />
      </span>
      {!iconOnly && (
        <span className="font-medium">{isDark ? "다크 모드" : "라이트 모드"}</span>
      )}
    </button>
  );
}
