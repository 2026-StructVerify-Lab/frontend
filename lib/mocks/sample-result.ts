// lib/mocks/sample-result.ts — 백엔드 없을 때 UI 개발용 mock 데이터
//
// 우리 라이브러리의 실제 출력과 같은 모양. claim별 verdict/evidence/explanation 포함.

import type { Job, VerificationReport } from "../types";

export const mockReport: VerificationReport = {
  domain: "population",
  anchor_year: 2024,
  verdict_distribution: {
    match: 0,
    mismatch: 2,
    partial: 0,
    unverifiable: 3,
  },
  claims: [
    {
      sent_id: "b0002_s0000",
      claim_text:
        "올해 10월 출생아 수는 총 2만 1426명으로 지난해 같은 달(1만 8878명)보다 6.7% 늘었다.",
      verdict: "mismatch",
      confidence: 0.68,
      schema: {
        indicator: "출생아 수",
        value: 6.7,
        unit: "%",
        time_period: "2024-10",
        population: null,
        value_role: "ratio",
        evidence_plan: {
          combiner: "ratio_pct",
          requirements: [
            {
              role: "endpoint_a",
              time_period: "2024-10",
              indicator: "출생아 수",
              label: "2024년 10월 출생아 수",
            },
            {
              role: "endpoint_b",
              time_period: "2023-10",
              indicator: "출생아 수",
              label: "2023년 10월 출생아 수",
            },
          ],
        },
      },
      graph_temporal: null,
      evidence: {
        stat_table_id: "DT_1BB0005",
        source_name: "다문화 유형별 출생",
        official_value: 13416,
        unit: "명",
        time_period: "2024-10",
      },
      computed_value: 10.42,
      formula: "(13416 − 12150) / 12150 × 100 = +10.420%",
      explanation:
        "기사는 출생아 수가 전년 동월 대비 6.7% 늘었다고 보도했지만, KOSIS '다문화 유형별 출생' 통계 기준 계산값은 10.42%로 차이가 있습니다.",
      pdf_locations: [
        { page: 1, bbox: { x: 100, y: 200, w: 380, h: 22 }, text: "6.7% 늘었다" },
      ],
    },
    {
      sent_id: "b0002_s0002",
      claim_text:
        "올 10월 합계출산율도 0.76명으로 지난해 같은 달보다 0.04명 증가했다.",
      verdict: "mismatch",
      confidence: 0.66,
      schema: {
        indicator: "합계출산율",
        value: 0.04,
        unit: null,
        time_period: "2024-10",
        population: null,
        value_role: "delta",
        evidence_plan: {
          combiner: "delta",
          requirements: [
            {
              role: "endpoint_a",
              time_period: "2024-10",
              indicator: "합계출산율",
              label: "2024년 10월의 합계출산율",
            },
            {
              role: "endpoint_b",
              time_period: "2023-10",
              indicator: "합계출산율",
              label: "2023년 10월의 합계출산율",
            },
          ],
        },
      },
      graph_temporal: {
        expression: "올 10월",
        resolved: "2024-10",
        basis: "anchor_year + 0 = 2024",
      },
      evidence: {
        stat_table_id: "DT_1B81A23",
        source_name: "시군구/출생아수, 합계출산율",
        official_value: 0.748,
        unit: null,
        time_period: "2024",
      },
      computed_value: 0.027,
      formula: "(0.748 − 0.721) = +0.027",
      explanation:
        "기사는 합계출산율이 0.04명 늘었다고 보도했으나, KOSIS '시군구/출생아수, 합계출산율' 자료 기준 2024년 10월(0.748)과 2023년 10월(0.721)의 차이는 +0.027로, 0.013(32.5%)의 오차가 있습니다.",
      pdf_locations: [
        { page: 1, bbox: { x: 100, y: 250, w: 320, h: 22 }, text: "0.04명 증가" },
      ],
    },
    {
      sent_id: "b0002_s0001",
      claim_text: "이는 1991년 4월(8.1%) 이후 34년 만에 가장 높은 증가율이다.",
      verdict: "unverifiable",
      confidence: 0.5,
      schema: {
        indicator: "출생아 수",
        value: 8.1,
        unit: "%",
        time_period: "1991-04",
        population: null,
        value_role: "rank",
      },
      graph_temporal: {
        expression: "1991년 4월",
        resolved: "1991-04",
        basis: "절대 시점 표현",
      },
      evidence: null,
      explanation:
        "이 주장은 시계열 순위 비교(rank)에 해당합니다. 현재 시스템은 N년 만의 최대/최고 같은 순위 검증을 직접 지원하지 않아 unverifiable로 처리합니다.",
    },
    {
      sent_id: "b0002_s0003",
      claim_text: "올 10월 혼인 건수는 1만 7921건으로 전년보다 3.9% 증가했다.",
      verdict: "unverifiable",
      confidence: 0.3,
      schema: {
        indicator: "혼인 건수",
        value: 3.9,
        unit: "건",
        time_period: "2024-10",
        population: "전국",
        value_role: "ratio",
      },
      graph_temporal: {
        expression: "올 10월",
        resolved: "2024-10",
        basis: "anchor_year + 0 = 2024",
      },
      evidence: null,
      explanation:
        "혼인 건수 관련 적절한 통계표를 찾지 못해 검증할 수 없었습니다.",
    },
    {
      sent_id: "b0000_s0000",
      claim_text:
        "# 10월 출생아 수, 34년 만에 최대 증가…혼인도 6년 만에 최고치",
      verdict: "unverifiable",
      confidence: 0.5,
      schema: {
        indicator: "출생아 수",
        value: 34,
        unit: null,
        time_period: "2024-10",
        population: "전국",
        value_role: "rank",
      },
      graph_temporal: null,
      evidence: null,
      explanation:
        "헤드라인 표현은 순위(rank) claim이며 직접 비교 대상이 아닙니다.",
    },
  ],
};

export const mockJob: Job = {
  id: "demo-job-001",
  status: "completed",
  source_type: "text",
  source_data:
    "[2025-06-25 서울경제]\n올해 10월 출생아 수는 총 2만 1426명으로 ...",
  progress: 100,
  current_step: null,
  result: mockReport,
  error: null,
  created_at: new Date(Date.now() - 60_000).toISOString(),
  completed_at: new Date().toISOString(),
};
