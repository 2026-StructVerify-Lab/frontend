// lib/exporters.ts
//
// 검증 결과 다운로드 — 두 가지 형식:
//   - TXT: 클라이언트에서 텍스트 빌드 후 Blob 다운로드
//   - PDF: 브라우저 print() — 사용자가 "PDF로 저장" 선택 (한글 호환 ↑, 라이브러리 의존성 ↓)

import type { ClaimResult, Job, Verdict, VerificationReport } from "./types";

const VERDICT_LABEL: Record<Verdict, string> = {
  match: "일치",
  mismatch: "불일치",
  partial: "부분 일치",
  unverifiable: "검증 불가",
};

/** 같은 문장 claim들을 한 그룹으로 묶기 (결과 페이지와 동일 로직) */
function groupBySentence(claims: ClaimResult[]) {
  const map = new Map<string, ClaimResult[]>();
  for (const c of claims) {
    const key = (c.claim_text ?? "").trim().replace(/\s+/g, " ");
    const arr = map.get(key) ?? [];
    arr.push(c);
    map.set(key, arr);
  }
  return Array.from(map.entries()).map(([sentence, items]) => ({
    sentence,
    claims: items,
  }));
}

/** 검증 결과를 사람이 읽기 좋은 텍스트로 직렬화 */
export function buildTxtReport(job: Job): string {
  const report: VerificationReport | null = job.result;
  const lines: string[] = [];
  const sep = "─".repeat(60);

  // 헤더
  lines.push("Structverify 검증 결과");
  lines.push(sep);
  lines.push(`Job ID         : ${job.id}`);
  lines.push(`생성 시각      : ${new Date(job.created_at).toLocaleString("ko-KR")}`);
  if (job.completed_at) {
    lines.push(`완료 시각      : ${new Date(job.completed_at).toLocaleString("ko-KR")}`);
  }
  lines.push(`소스 타입      : ${job.source_type}`);
  if (report?.domain) lines.push(`도메인         : ${report.domain}`);
  if (report?.anchor_year) lines.push(`Anchor Year    : ${report.anchor_year}`);

  if (report?.verdict_distribution) {
    const dist = Object.entries(report.verdict_distribution)
      .filter(([, c]) => c > 0)
      .map(([v, c]) => `${VERDICT_LABEL[v as Verdict] ?? v} ${c}`)
      .join(" · ");
    lines.push(`Verdict 분포   : ${dist}`);
  }
  lines.push(`총 Claims      : ${report?.claims.length ?? 0}`);
  lines.push("");

  // 원문 (text 소스인 경우)
  if (job.source_type === "text" && job.source_data) {
    lines.push("【 원문 】");
    lines.push(sep);
    lines.push(job.source_data);
    lines.push("");
  } else if (job.source_uri) {
    lines.push(`【 원본 위치 】 ${job.source_uri}`);
    lines.push("");
  }

  // 검증 결과 (그룹화)
  if (!report || report.claims.length === 0) {
    lines.push("(검증된 주장이 없습니다)");
    return lines.join("\n");
  }

  const groups = groupBySentence(report.claims);
  lines.push("【 검증 결과 】");
  lines.push(sep);
  lines.push("");

  groups.forEach((group, gi) => {
    lines.push(`▌ 문장 ${gi + 1}`);
    lines.push(`  "${group.sentence}"`);
    lines.push("");

    group.claims.forEach((c, ci) => {
      const verdictLabel = VERDICT_LABEL[(c.verdict ?? "unverifiable") as Verdict];
      const conf = typeof c.confidence === "number" ? c.confidence.toFixed(2) : "—";
      const prefix = group.claims.length > 1 ? `  [Claim ${ci + 1}/${group.claims.length}] ` : "  ";
      lines.push(`${prefix}${verdictLabel} (conf ${conf})`);

      // 핵심 정보
      if (c.schema?.indicator) lines.push(`    지표        : ${c.schema.indicator}`);
      if (c.schema?.value !== undefined && c.schema?.value !== null) {
        lines.push(`    기사 값     : ${c.schema.value}${c.schema.unit ?? ""}`);
      }
      if (c.computed_value !== null && c.computed_value !== undefined) {
        lines.push(`    공식 통계   : ${c.computed_value.toFixed(3)}${c.schema?.unit ?? ""}`);
      }
      if (c.schema?.time_period) lines.push(`    시점        : ${c.schema.time_period}`);
      if (c.schema?.population) lines.push(`    대상        : ${c.schema.population}`);
      if (c.formula) lines.push(`    수식        : ${c.formula}`);
      if (c.evidence) {
        lines.push(`    통계 출처   : ${c.evidence.source_name} [${c.evidence.stat_table_id}]`);
        if (c.evidence.official_value !== null && c.evidence.official_value !== undefined) {
          lines.push(`    출처 값     : ${c.evidence.official_value}${c.evidence.unit ?? ""}`);
        }
      }
      if (c.explanation) {
        lines.push(`    AI 설명     :`);
        c.explanation.split("\n").forEach((row) => lines.push(`      ${row}`));
      }
      lines.push("");
    });

    lines.push(sep);
    lines.push("");
  });

  lines.push(`— Structverify (https://structverify.com) —`);
  return lines.join("\n");
}

/** 브라우저에서 텍스트를 파일로 다운로드 */
export function downloadTextFile(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // revoke은 다음 tick에 (Safari 대응)
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/** TXT 다운로드 trigger — Job 통째로 받아서 처리 */
export function downloadJobAsTxt(job: Job) {
  const txt = buildTxtReport(job);
  const stamp = new Date().toISOString().slice(0, 10);
  const idShort = job.id.slice(0, 8);
  downloadTextFile(txt, `structverify-${idShort}-${stamp}.txt`);
}

/** PDF — 브라우저 print dialog 띄움 (사용자가 "PDF로 저장" 선택) */
export function printAsPdf() {
  window.print();
}
