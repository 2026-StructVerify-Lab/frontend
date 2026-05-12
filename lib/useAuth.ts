"use client";

// lib/useAuth.ts — 사용자 정보 조회 + 보호된 페이지 가드
//
// [사용 — 인증 필수 페이지]
//
//   const { user, tenant, loading } = useAuth();
//   if (loading) return <Loading />;
//   // 토큰 없으면 자동으로 /login으로 redirect됨
//
// [사용 — 인증 선택 페이지 (랜딩 등)]
//
//   const { user, tenant } = useAuth({ required: false });

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getAuthToken, getMe, logout as apiLogout } from "./api";
import type { User } from "./types";

interface Tenant {
  id: string;
  name: string;
  plan: string;
}

interface UseAuthResult {
  user: User | null;
  tenant: Tenant | null;
  loading: boolean;
  logout: () => void;
}

interface UseAuthOptions {
  /** true면 토큰 없을 때 /login으로 redirect. default true. */
  required?: boolean;
}

export function useAuth(options: UseAuthOptions = {}): UseAuthResult {
  const { required = true } = options;
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAuthToken();

    // 토큰 없음 — 보호된 페이지면 로그인으로
    if (!token) {
      setLoading(false);
      if (required) {
        router.replace("/login");
      }
      return;
    }

    // 토큰 있음 — 서버에서 user/tenant 정보 가져오기
    let cancelled = false;
    getMe()
      .then((data) => {
        if (cancelled) return;
        setUser(data.user);
        setTenant(data.tenant);
      })
      .catch((err) => {
        if (cancelled) return;
        // 401이면 토큰 만료 — 로그아웃 처리
        if (err.status === 401) {
          apiLogout();
          if (required) router.replace("/login");
        } else {
          console.error("useAuth: getMe failed", err);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [required, router]);

  function logout() {
    apiLogout();
    setUser(null);
    setTenant(null);
    router.replace("/login");
  }

  return { user, tenant, loading, logout };
}