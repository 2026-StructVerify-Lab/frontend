// lib/api.ts — 백엔드 API 클라이언트
//
// 환경 변수 NEXT_PUBLIC_API_URL 설정되어 있으면 실 백엔드 호출.
// 안 설정되어 있으면 mock 데이터 반환 (개발 편의).
//
// 인증: localStorage에 저장된 토큰 또는 API key 자동 포함.

import type {
  Job,
  ApiKey,
  User,
  DataSource,
  SourceType,
  VerificationReport,
} from "./types";
import { mockJob, mockReport } from "./mocks/sample-result";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
const USE_MOCK = !API_URL;

// ── 토큰 관리 ───────────────────────────────────────────────────
const TOKEN_KEY = "sv.auth_token";       // JWT (UI 로그인 후)
const API_KEY_KEY = "sv.api_key";         // raw API key (개발/SDK 테스트)

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getApiKey(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(API_KEY_KEY);
}

export function setApiKey(key: string | null) {
  if (typeof window === "undefined") return;
  if (key) localStorage.setItem(API_KEY_KEY, key);
  else localStorage.removeItem(API_KEY_KEY);
}

// ── fetch 래퍼 ───────────────────────────────────────────────────
async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  // 인증: JWT 우선, 없으면 API key
  const jwt = getAuthToken();
  const apiKey = getApiKey();
  if (jwt) {
    headers.set("Authorization", `Bearer ${jwt}`);
  } else if (apiKey) {
    headers.set("Authorization", `Bearer ${apiKey}`);
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, error.detail || error.message || "API error");
  }
  return res.json();
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// ── Auth ─────────────────────────────────────────────────────────
export async function login(
  email: string,
  password: string,
): Promise<{ access_token: string; user: User }> {
  if (USE_MOCK) {
    await sleep(300);
    return {
      access_token: "mock-jwt-token",
      user: { id: "mock-user", email, role: "owner", tenant_id: "mock-tenant" },
    };
  }
  return apiFetch("/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function signup(
  email: string,
  password: string,
  tenantName: string,
): Promise<{ access_token: string; user: User }> {
  if (USE_MOCK) {
    await sleep(300);
    return {
      access_token: "mock-jwt-token",
      user: { id: "mock-user", email, role: "owner", tenant_id: "mock-tenant" },
    };
  }
  return apiFetch("/v1/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password, tenant_name: tenantName }),
  });
}

/** 현재 사용자 + 테넌트 정보. JWT 세션에서만 작동. */
export async function getMe(): Promise<{
  user: User;
  tenant: { id: string; name: string; plan: string };
}> {
  if (USE_MOCK) {
    await sleep(100);
    return {
      user: {
        id: "mock-user",
        email: "demo@example.com",
        role: "owner",
        tenant_id: "mock-tenant",
      },
      tenant: { id: "mock-tenant", name: "Demo Org", plan: "free" },
    };
  }
  return apiFetch("/v1/auth/me");
}

/** 로그아웃 — JWT는 stateless라 서버 호출 없이 토큰 삭제만. */
export function logout() {
  setAuthToken(null);
  setApiKey(null);
}

// ── Verify ───────────────────────────────────────────────────────
export interface VerifyRequest {
  source_type: SourceType;
  source_data?: string;                   // text
  file?: File;                             // pdf/docx
  url?: string;                            // url
  datasources?: string[];                  // ["kosis", "custom:..."]
  callback_url?: string;
}

export async function submitVerify(req: VerifyRequest): Promise<Job> {
  if (USE_MOCK) {
    await sleep(500);
    return { ...mockJob, status: "pending", progress: 0 };
  }

  // 파일 업로드면 multipart, 아니면 JSON
  if (req.file) {
    const formData = new FormData();
    formData.append("file", req.file);
    formData.append("source_type", req.source_type);
    if (req.datasources)
      formData.append("datasources", JSON.stringify(req.datasources));
    if (req.callback_url) formData.append("callback_url", req.callback_url);

    const headers = new Headers();
    const jwt = getAuthToken();
    const apiKey = getApiKey();
    if (jwt) headers.set("Authorization", `Bearer ${jwt}`);
    else if (apiKey) headers.set("Authorization", `Bearer ${apiKey}`);

    const res = await fetch(`${API_URL}/v1/verify`, {
      method: "POST",
      headers,
      body: formData,
    });
    if (!res.ok) throw new ApiError(res.status, res.statusText);
    return res.json();
  }

  return apiFetch("/v1/verify", {
    method: "POST",
    body: JSON.stringify({
      source_type: req.source_type,
      source_data: req.source_data,
      url: req.url,
      datasources: req.datasources,
      callback_url: req.callback_url,
    }),
  });
}

export async function getJob(jobId: string): Promise<Job> {
  if (USE_MOCK) {
    await sleep(200);
    // mock에서는 즉시 완료된 상태 반환
    return { ...mockJob, id: jobId, status: "completed", result: mockReport };
  }
  return apiFetch(`/v1/jobs/${jobId}`);
}

export async function listJobs(limit = 20, offset = 0): Promise<Job[]> {
  if (USE_MOCK) {
    await sleep(200);
    return [mockJob];
  }
  return apiFetch(`/v1/jobs?limit=${limit}&offset=${offset}`);
}

/**
 * 진행 중인 job을 중단. (백엔드 endpoint: POST /v1/jobs/{id}/cancel)
 * 백엔드 미구현 시엔 mock으로 failed 상태 반환.
 */
export async function cancelJob(jobId: string): Promise<Job> {
  if (USE_MOCK) {
    await sleep(200);
    return {
      ...mockJob,
      id: jobId,
      status: "failed",
      error: "사용자가 검증을 중단했습니다.",
      completed_at: new Date().toISOString(),
    };
  }
  return apiFetch(`/v1/jobs/${jobId}/cancel`, { method: "POST" });
}

/**
 * Job 완료까지 polling. UI에서 사용:
 *
 *   const job = await pollJob(jobId, (j) => setJob(j));
 */
export async function pollJob(
  jobId: string,
  onUpdate?: (job: Job) => void,
  intervalMs = 2000,
  maxAttempts = 60,
): Promise<Job> {
  for (let i = 0; i < maxAttempts; i++) {
    const job = await getJob(jobId);
    onUpdate?.(job);
    if (job.status === "completed" || job.status === "failed") return job;
    await sleep(intervalMs);
  }
  throw new Error("Job polling timeout");
}

// ── API Keys ─────────────────────────────────────────────────────
export async function listApiKeys(): Promise<ApiKey[]> {
  if (USE_MOCK) {
    await sleep(200);
    return [
      {
        id: "key-1",
        prefix: "sv_live_a1b2",
        name: "Production",
        scopes: ["verify:write"],
        rate_limit_per_min: 60,
        last_used_at: new Date().toISOString(),
        revoked_at: null,
        created_at: new Date(Date.now() - 7 * 86400_000).toISOString(),
      },
    ];
  }
  return apiFetch("/v1/api-keys");
}

export async function createApiKey(
  name: string,
  scopes: string[] = ["verify:write"],
): Promise<{ key: string; api_key: ApiKey }> {
  if (USE_MOCK) {
    await sleep(300);
    const raw = `sv_live_${Math.random().toString(36).slice(2, 10)}_${Math.random()
      .toString(36)
      .slice(2)}`;
    return {
      key: raw,
      api_key: {
        id: "new-key",
        prefix: raw.slice(0, 12),
        name,
        scopes,
        rate_limit_per_min: 60,
        last_used_at: null,
        revoked_at: null,
        created_at: new Date().toISOString(),
      },
    };
  }
  return apiFetch("/v1/api-keys", {
    method: "POST",
    body: JSON.stringify({ name, scopes }),
  });
}

export async function revokeApiKey(keyId: string): Promise<void> {
  if (USE_MOCK) {
    await sleep(200);
    return;
  }
  await apiFetch(`/v1/api-keys/${keyId}`, { method: "DELETE" });
}

// ── DataSources ───────────────────────────────────────────────────
export async function listDataSources(): Promise<DataSource[]> {
  if (USE_MOCK) {
    await sleep(200);
    return [
      {
        id: "kosis",
        name: "KOSIS (공공)",
        type: "kosis",
        status: "ready",
        created_at: new Date(0).toISOString(),
      },
    ];
  }
  return apiFetch("/v1/datasources");
}

// ── 유틸 ──────────────────────────────────────────────────────────
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}