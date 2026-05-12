// lib/types.ts — 백엔드 API와 1:1 매칭되는 타입 정의
// (백엔드 Pydantic 모델 변경 시 여기도 같이 업데이트)

export type Verdict = "match" | "mismatch" | "partial" | "unverifiable";
export type ValueRole =
  | "measurement"
  | "threshold"
  | "delta"
  | "rank"
  | "ratio"
  | "none";
export type Combiner = "direct" | "delta" | "ratio_pct";
export type JobStatus = "pending" | "running" | "completed" | "failed";
export type SourceType = "text" | "pdf" | "docx" | "url";

export interface EvidenceRequirement {
  role: string;             // "primary" / "endpoint_a" / "endpoint_b"
  time_period: string;
  indicator: string | null;
  label: string | null;
}

export interface EvidencePlan {
  combiner: Combiner;
  requirements: EvidenceRequirement[];
}

export interface ClaimSchema {
  indicator: string;
  value: number | null;
  unit: string | null;
  time_period: string | null;
  population: string | null;
  value_role: ValueRole;
  evidence_plan?: EvidencePlan | null;
  source_reference?: string | null;
}

export interface Evidence {
  stat_table_id: string;
  source_name: string;
  official_value: number | null;
  unit: string | null;
  time_period: string | null;
  // PDF 하이라이트에 필요한 정보 (백엔드가 PDF 좌표 같이 주면)
  pdf_bbox?: { page: number; x: number; y: number; w: number; h: number };
}

export interface GraphTemporal {
  expression: string;
  resolved: string;
  basis: string;
  via_coref?: string;
}

export interface ClaimResult {
  sent_id: string;
  claim_text: string;
  verdict: Verdict;
  confidence: number;
  schema: ClaimSchema | null;
  graph_temporal: GraphTemporal | null;
  evidence: Evidence | null;
  computed_value?: number | null;
  formula?: string | null;
  explanation: string | null;
  // PDF에서 이 claim의 텍스트 위치 (있으면 하이라이트)
  pdf_locations?: Array<{
    page: number;
    bbox: { x: number; y: number; w: number; h: number };
    text: string;
  }>;
}

export interface VerificationReport {
  domain: string | null;
  anchor_year: number | null;
  claims: ClaimResult[];
  verdict_distribution?: Record<Verdict, number>;   // 백엔드가 계산해서 채움
}

export interface Job {
  id: string;
  status: JobStatus;
  source_type: SourceType;
  source_uri?: string;          // pdf/docx 업로드 URI
  source_data?: string;          // text 입력 원문
  progress: number;
  current_step: string | null;
  result: VerificationReport | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
}

// 인증
export interface User {
  id: string;
  email: string;
  role: "owner" | "admin" | "member";
  tenant_id: string;
}

export interface ApiKey {
  id: string;
  prefix: string;                // "sv_live_a1b2"
  name: string;
  scopes: string[] | null;
  rate_limit_per_min: number;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

// 데이터소스
export interface DataSource {
  id: string;
  name: string;
  type: "kosis" | "csv" | "db";
  status: "indexing" | "ready" | "error";
  row_count?: number | null;
  created_at: string;
}