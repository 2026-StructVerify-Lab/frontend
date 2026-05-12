"use client";

// components/layout/AppShell.tsx — 인증된 페이지 공통 레이아웃
//
// JobWatcherProvider로 감싸서 어느 페이지에서든 진행 중 job 폴링 + 표시.

import { JobWatcherProvider } from "@/lib/jobWatcher";

import { JobsBadge } from "./JobsBadge";
import { Sidebar } from "./Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <JobWatcherProvider>
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex-1 overflow-auto">{children}</main>
        <JobsBadge />
      </div>
    </JobWatcherProvider>
  );
}