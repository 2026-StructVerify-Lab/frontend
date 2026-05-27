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

// ── Agent loop의 Plan + Trace (백엔드 A-1) ────────────────────────
// 각 claim의 검증 계획(Planner LLM 결과)과 실행 trace(매 iter의 action·결과).
// agent_workspace의 plan.json / observations/iter_NN_*.json 을 백엔드가 합쳐 보냄.

export interface PlanRequiredData {
  indicator: string | null;
  time: string | null;
  population: string | null;
  unit_hint: string | null;
}

export interface PlanStep {
  action: string;            // catalog_search / explore_catalog / fetch_evidence / calculate / finish / read_original
  input: Record<string, unknown> | null;
  rationale: string | null;
}

export interface ClaimPlan {
  claim_type: string | null;          // absolute / growth_rate / comparison / difference / ranking
  calculation_formula: string | null;
  required_data: PlanRequiredData[];
  initial_steps: PlanStep[];
}

export interface TraceCandidate {
  id: string;
  name: string;
}

export interface TraceCategory {
  category_label: string;
  table_count: number;
}

export interface TraceEvidence {
  stat_table_id: string | null;
  value: number | string | null;
  unit: string | null;
  time_period: string | null;
}

export interface TraceOutput {
  candidates_top3?: TraceCandidate[];     // catalog_search 결과
  categories_top3?: TraceCategory[];      // explore_catalog 결과
  evidence?: TraceEvidence;               // fetch_evidence 결과
  result?: number | string | null;        // calculate 결과
  verdict?: string;                       // finish 결과
  confidence?: number;
}

export interface TraceStep {
  iter: number;
  action: string;
  rationale: string | null;
  input: Record<string, unknown> | null;
  summary: string | null;
  success: boolean;
  error: string | null;
  output: TraceOutput | null;
  // [2026-05-27] LLM이 이 action을 고른 이유 (자연어 사고)
  thought?: string | null;
  confidence_so_far?: number | null;
  proposed_verdict?: string | null;
}

// [2026-05-27] AI 콘솔 탭용 — /v1/jobs/{id}/llm-trace 응답
export interface LLMTraceEntry {
  claim_id: string;
  name: string;                 // "planner" / "reflect_call_03" 등
  ts: string | null;
  prompt: string | null;
  response: string | null;
  prompt_chars: number | null;
  response_chars: number | null;
}

export interface LLMTraceResponse {
  entries: LLMTraceEntry[];
  count: number;
}

export interface ClaimResult {
  // 백엔드 식별자 — 실시간 partial 응답에서 들어옴, completed 결과에도 포함
  claim_id?: string;
  sent_id: string;
  claim_text: string;
  verdict: Verdict;
  confidence: number;
  schema: ClaimSchema | null;
  graph_temporal: GraphTemporal | null;
  evidence: Evidence | null;
  // derived claim(차이/증가율)이 함께 참조한 보조 데이터 — 예: prev 시점 KOSIS 값.
  // base claim은 보통 빈 배열. 백엔드 VerificationResult.supporting_evidence와 1:1.
  supporting_evidence?: Evidence[];
  computed_value?: number | null;
  formula?: string | null;
  explanation: string | null;
  // Agent loop의 plan/trace — 검증 과정을 UI에 풍부하게 노출 (A-1)
  plan?: ClaimPlan | null;
  trace?: TraceStep[];
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