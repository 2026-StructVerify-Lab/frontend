"use client";

// components/layout/AppShell.tsx — 인증된 페이지 공통 레이아웃
//
// 글로벌 JobWatcherProvider와 JobsBadge는 root layout(app/layout.tsx)으로
// 이동했음 — 이유: 페이지 컴포넌트가 useJobWatcher()를 호출해야 하는데,
// Provider가 AppShell 안이면 페이지가 Provider의 자식이 아니라 부모가 되어버려서
// context가 안 잡힘.

import { Sidebar } from "./Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
