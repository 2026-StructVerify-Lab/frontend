import type { Metadata } from "next";
import { Toaster } from "sonner";

import { JobsBadge } from "@/components/layout/JobsBadge";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { JobWatcherProvider } from "@/lib/jobWatcher";
import "./globals.css";

export const metadata: Metadata = {
  title: "Structverify",
  description: "한국 뉴스 수치 자동 검증 플랫폼",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // suppressHydrationWarning — next-themes가 <html class>를 클라이언트에서 토글하므로 필요
    <html lang="ko" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <TooltipProvider delayDuration={150}>
            {/* 검증 job 글로벌 watcher — 어느 페이지에서든 진행 상황 추적 */}
            <JobWatcherProvider>
              {children}
              {/* 우하단 진행 표시 (job 있을 때만 노출) */}
              <JobsBadge />
              {/* 토스트 — 우상단으로 분리해서 진행 표시와 안 겹치게 */}
              <Toaster
                position="top-right"
                toastOptions={{
                  className:
                    "!bg-card !text-card-foreground !border !border-border !shadow-sm",
                }}
                closeButton
                richColors={false}
              />
            </JobWatcherProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
