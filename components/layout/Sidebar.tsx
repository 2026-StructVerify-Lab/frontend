"use client";

// components/layout/Sidebar.tsx — 좌측 네비 + 하단 사용자 프로필

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  FileSearch,
  History,
  Database,
  KeyRound,
  BookOpen,
  LogOut,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/useAuth";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

// exact: true면 pathname === href일 때만 active (하위 path 무시).
// "검증 시작"이 검증 히스토리/결과 페이지에서 같이 active되는 걸 방지.
const navItems = [
  { href: "/dashboard", label: "대시보드", icon: LayoutDashboard },
  { href: "/verify", label: "검증 시작", icon: FileSearch, exact: true },
  { href: "/verify/jobs", label: "검증 히스토리", icon: History },
  { href: "/datasources", label: "데이터 소스", icon: Database },
  { href: "/settings/api-keys", label: "API 키", icon: KeyRound },
  { href: "/docs", label: "API 문서", icon: BookOpen },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, tenant, logout, loading } = useAuth();
  const [logoutOpen, setLogoutOpen] = useState(false);

  return (
    <aside className="w-60 border-r border-border bg-secondary flex flex-col">
      {/* 상단 로고 — 노션처럼 살짝 작고 차분하게 */}
      <div className="px-4 h-14 flex items-center">
        <Link
          href="/dashboard"
          className="font-semibold text-[15px] tracking-tight text-foreground"
        >
          Structverify
        </Link>
      </div>

      {/* 네비 — 노션 스타일: 작은 글자, 좁은 패딩, 호버는 한 톤만 어두워짐 */}
      <nav className="flex-1 px-2 pb-2 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13.5px] font-medium transition-colors",
                active
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
              )}
            >
              <Icon className="h-[15px] w-[15px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* 테마 토글 — 네비와 프로필 사이 */}
      <div className="px-2 pb-1">
        <ThemeToggle />
      </div>

      {/* 하단 사용자 프로필 — 노션처럼 살짝 분리만 (구분선 약하게) */}
      <div className="p-2 border-t border-border/60">
        {loading ? (
          <div className="flex items-center gap-2 px-2 py-1.5">
            <div className="h-7 w-7 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 min-w-0">
              <div className="h-3 w-20 bg-muted rounded animate-pulse mb-1" />
              <div className="h-2.5 w-16 bg-muted rounded animate-pulse" />
            </div>
          </div>
        ) : user ? (
          <div className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent/70 transition-colors">
            {/* 아바타 — 노션 톤 다크그레이 */}
            <div className="h-7 w-7 rounded-md bg-foreground text-background flex items-center justify-center text-[12px] font-semibold shrink-0">
              {user.email.charAt(0).toUpperCase()}
            </div>
            {/* 사용자 정보 */}
            <div className="flex-1 min-w-0">
              <p
                className="text-[12.5px] font-medium text-foreground truncate"
                title={user.email}
              >
                {user.email}
              </p>
              {tenant && (
                <p
                  className="text-[11.5px] text-muted-foreground truncate"
                  title={`${tenant.name} · ${tenant.plan}`}
                >
                  {tenant.name}
                </p>
              )}
            </div>
            {/* 로그아웃 — 평소엔 숨기고 hover시 노출. 클릭하면 확인 다이얼로그 */}
            <button
              onClick={() => setLogoutOpen(true)}
              className="p-1 rounded text-muted-foreground hover:bg-background hover:text-foreground transition-all opacity-0 group-hover:opacity-100 shrink-0"
              title="로그아웃"
              aria-label="로그아웃"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[13.5px] text-muted-foreground hover:bg-accent/70 hover:text-foreground"
          >
            로그인
          </Link>
        )}
      </div>

      {/* 로그아웃 확인 다이얼로그 */}
      <ConfirmDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        title="로그아웃 하시겠습니까?"
        description="다시 로그인하셔야 검증 결과와 API 키에 접근할 수 있습니다."
        confirmText="로그아웃"
        cancelText="취소"
        destructive
        onConfirm={logout}
      />
    </aside>
  );
}