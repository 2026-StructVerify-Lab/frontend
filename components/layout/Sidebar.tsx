"use client";

// components/layout/Sidebar.tsx — 좌측 네비 + 하단 사용자 프로필

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileSearch,
  Database,
  KeyRound,
  BookOpen,
  LogOut,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/useAuth";

const navItems = [
  { href: "/dashboard", label: "대시보드", icon: LayoutDashboard },
  { href: "/verify", label: "검증 시작", icon: FileSearch },
  { href: "/datasources", label: "데이터 소스", icon: Database },
  { href: "/settings/api-keys", label: "API 키", icon: KeyRound },
  { href: "/docs", label: "API 문서", icon: BookOpen },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, tenant, logout, loading } = useAuth();

  return (
    <aside className="w-60 border-r bg-muted/30 flex flex-col">
      {/* 상단 로고 */}
      <div className="p-4 border-b">
        <Link href="/dashboard" className="font-semibold text-lg">
          Structverify
        </Link>
      </div>

      {/* 네비 */}
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* 하단 사용자 프로필 */}
      <div className="border-t p-3">
        {loading ? (
          <div className="flex items-center gap-2 px-1 py-2">
            <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 min-w-0">
              <div className="h-3 w-20 bg-muted rounded animate-pulse mb-1" />
              <div className="h-2.5 w-16 bg-muted rounded animate-pulse" />
            </div>
          </div>
        ) : user ? (
          <div className="flex items-center gap-2">
            {/* 아바타 — 이메일 첫 글자 */}
            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium shrink-0">
              {user.email.charAt(0).toUpperCase()}
            </div>
            {/* 사용자 정보 */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate" title={user.email}>
                {user.email}
              </p>
              {tenant && (
                <p
                  className="text-xs text-muted-foreground truncate"
                  title={`${tenant.name} · ${tenant.plan}`}
                >
                  {tenant.name}
                </p>
              )}
            </div>
            {/* 로그아웃 */}
            <button
              onClick={logout}
              className="p-1.5 rounded-md text-muted-foreground hover:bg-background hover:text-foreground transition-colors shrink-0"
              title="로그아웃"
              aria-label="로그아웃"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-background hover:text-foreground"
          >
            로그인
          </Link>
        )}
      </div>
    </aside>
  );
}