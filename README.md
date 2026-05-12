# Structverify — Frontend

Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui + react-pdf

## 현재 상태 (Phase 5.1 — 프론트 골격)

만들어진 것:
- 페이지 골격 — 랜딩 / 로그인 / 회원가입 / 대시보드 / 검증 입력 / **결과** / API 키 / 데이터소스 / 문서
- shadcn 컴포넌트 — Button, Card, Input, Label, Textarea, Badge, Tabs, Separator
- 핵심 컴포넌트 — **PDFViewer** (react-pdf + 하이라이트 overlay), **ClaimCard** (verdict별 색상 + 펼침 상세)
- API 클라이언트 — `lib/api.ts` (백엔드 없으면 mock 데이터로 fallback)
- 타입 정의 — `lib/types.ts` (백엔드 Pydantic 모델과 1:1)

아직 미구현:
- 백엔드 연결 (지금은 mock — `NEXT_PUBLIC_API_URL` 비어있으면 mock 사용)
- PDF 하이라이트의 정확한 좌표 매핑 (백엔드가 bbox 같이 줘야)
- 데이터소스 추가 UI (현재 placeholder)
- 사용량 차트, 빌링 페이지

## 디렉토리 구조

```
frontend/
├── app/                           App Router
│   ├── layout.tsx                  루트 레이아웃
│   ├── page.tsx                    랜딩
│   ├── globals.css                 Tailwind + shadcn 토큰
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   ├── dashboard/page.tsx
│   ├── verify/
│   │   ├── page.tsx                새 검증 (text/pdf/docx/url)
│   │   └── jobs/[id]/page.tsx      ★ 결과 페이지 (PDF + claims)
│   ├── settings/api-keys/page.tsx
│   ├── datasources/page.tsx
│   └── docs/page.tsx
├── components/
│   ├── ui/                         shadcn primitives
│   ├── layout/
│   │   ├── AppShell.tsx
│   │   └── Sidebar.tsx
│   └── results/
│       ├── PDFViewer.tsx           ★ react-pdf + 하이라이트
│       └── ClaimCard.tsx           ★ verdict 카드
├── lib/
│   ├── api.ts                      fetch wrapper (mock fallback)
│   ├── types.ts                    백엔드와 1:1 타입
│   ├── utils.ts                    cn() helper
│   └── mocks/sample-result.ts      개발용 mock 데이터
└── public/
```

## 실행

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

http://localhost:3000

### Mock 데이터로 둘러보기

`.env.local`에서 `NEXT_PUBLIC_API_URL=` 비워두면 backend 없이도 모든 페이지 동작:

- `/login` → 아무 이메일/비밀번호 입력하면 통과
- `/dashboard` → 정적 카드
- `/verify` → 텍스트/PDF/DOCX/URL 입력 → 제출하면 `/verify/jobs/{id}` 이동
- `/verify/jobs/demo-job-001` → mock 결과 카드 5개 (mismatch 2건 포함) 표시

### 실 백엔드 연결

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
```

이러면 모든 호출이 backend로. backend 인증 필요.

## 핵심 컴포넌트 사용법

### PDFViewer

```tsx
<PDFViewer
  fileUrl="/uploads/xxx.pdf"
  claims={report.claims}
  focusedClaimId={focusedId}
  onClaimClick={(sentId) => setFocusedId(sentId)}
/>
```

claim에 `pdf_locations` 필드가 있으면 자동으로 하이라이트:
```ts
pdf_locations: [{ page: 1, bbox: { x, y, w, h }, text: "..." }]
```

백엔드가 PDF → 텍스트 추출 시 char offset → bbox 매핑도 같이 반환해야 정확.
일단 없어도 PDF는 단순 viewer로 렌더링.

### ClaimCard

```tsx
<ClaimCard
  claim={claim}
  focused={focusedId === claim.sent_id}
  onHover={setFocusedId}
  onClick={handleScroll}
/>
```

verdict별 색상은 `tailwind.config.ts`의 `verdict.match/mismatch/...` 토큰 사용.
같은 색을 PDF 하이라이트에도 적용 (CSS class `.pdf-highlight.mismatch` 등).

## 백엔드와의 계약 (`lib/types.ts`)

타입 정의가 백엔드 응답과 일치해야 함. 백엔드 Pydantic 모델 변경 시 여기도 같이 업데이트:

```ts
ClaimResult {
  sent_id, claim_text, verdict, confidence,
  schema, graph_temporal, evidence,
  computed_value, formula, explanation,
  pdf_locations?  // PDF 검증 시
}
```

## 다음 작업 (Phase 5.2)

- 백엔드 endpoint 연결 (지금 mock인 부분들)
- PDF hover → 카드 자동 스크롤 폴리시
- 결과 다운로드 (JSON / CSV)
- 검증 히스토리 페이지
- 데이터소스 추가 UI (CSV 업로드 + DB DSN)
