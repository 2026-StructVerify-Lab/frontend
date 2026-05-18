# Structverify — Frontend

Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui + react-pdf
**Notion 톤 디자인 시스템** · 다크모드 · 글로벌 job watcher · 토스트 알림

## 현재 상태 (Phase 5.2 — 디자인/UX 리뉴얼)

### Phase 5.1 (기본 골격)
- 페이지 — 랜딩 / 로그인 / 회원가입 / 대시보드 / 검증 입력 / **결과** / API 키 / 데이터 소스 / API 문서
- shadcn 컴포넌트 — Button, Card, Input, Label, Textarea, Badge, Tabs, Separator
- API 클라이언트 (`lib/api.ts`) + 타입 정의 (`lib/types.ts`)

### Phase 5.2 (이번 작업) — 노션 톤 + 사용성 강화

#### 1. 디자인 시스템 (노션 톤)
- **컬러 토큰** 전면 교체 (`globals.css` + `tailwind.config.ts`)
  - primary = 다크그레이 `#37352F` (쨍한 파랑 → 차분한 검정 톤)
  - 사이드바/은은한 영역 = 베이지 `#F7F7F5`
  - 보더 = 따뜻한 베이지 `#E9E9E7`
  - radius `0.5rem → 0.375rem` (살짝 각짐)
- **Pretendard Variable** 폰트 import (CDN) · 자간 `-0.01em`
- **verdict 색** 채도 ↓ (노션 팔레트: match #0F7B6C, mismatch #E03E3E, partial #DFAB01, unverifiable #787774)
- **다크모드** 변수도 노션 톤으로 (`bg-background`, `card`, `border` 등 자동 대응)

#### 2. 다크모드
- `next-themes` 도입
- `ThemeProvider` (root layout) + `ThemeToggle` (사이드바 하단)
- ☀️ ↔ 🌙 회전 트랜지션, 시스템 모드 자동 감지

#### 3. 글로벌 토스트 (sonner)
- `Toaster`는 root layout에 (우상단 · 노션 톤 카드 스타일)
- **검증 완료/실패 자동 토스트** — `jobWatcher`의 polling에서 발사, 8초 노출 + "결과 보기" 액션
- API 키 발급/취소/복사 액션 후 토스트

#### 4. JobWatcher (글로벌 진행 상황 추적)
- `JobWatcherProvider`를 **root layout으로 끌어올림** (페이지 컴포넌트에서 `useJobWatcher()` 정상 동작)
- `JobsBadge` 우하단 floating — 단, 다음 두 경우는 숨김:
  - 그 job의 결과 페이지(`/verify/jobs/[id]`)에 있을 때
  - 대시보드(`/dashboard`)에서 진행 중일 때 (본문에 큰 카드 있음)
- `hasActiveJob` / `activeJob` 헬퍼 — 어디서든 한 줄로 진행 중 체크
- 노션 톤 카드 (얇은 그림자, hover 시 X 버튼 노출, verdict 토큰)

#### 5. 진행 중일 때 새 검증 차단
- 신규 컴포넌트 — `Tooltip` (shadcn 패턴), `NewVerifyButton`
- 진행 중이면 대시보드 / 빈 상태 / `/verify` 페이지의 시작 버튼이 **disabled + tooltip** ("검증이 진행 중입니다 · 현재 검증이 끝나야 새로 시작할 수 있어요")
- `/verify` 페이지 폼 전체 `<fieldset disabled>` 처리 + 상단 안내 배너 + "진행 상황 보기" 버튼

#### 6. 대시보드 리뉴얼
- 헤더 톤 — `28px bold` + 부제 + 우측 CTA
- 통계 카드 — 아이콘 배치, 호버 시 배경 옅음, `shadow-none`
- **실제 데이터 fetching** — `listJobs` + `listApiKeys`로 통계/리스트 계산
- 빈 상태 / 진행 중 카드 / 최근 검증 5건 — **상태별 conditional** 렌더
- "전체 보기 →" 링크 → `/verify/jobs`

#### 7. 데이터 소스 페이지 (`/datasources`)
- 옛 대시보드 코드를 통째로 진짜 데이터 소스 관리 페이지로 교체
- KOSIS 활성 카드 + 준비 중 카드 (CSV 업로드, 사내 DB) — `Lock` 아이콘 + dashed 보더

#### 8. 검증 히스토리 (`/verify/jobs`) — 신규 페이지
- 대시보드 "전체 보기 →"에서 진입
- **검색** — claim 본문 / job ID / 원문 / URL 텍스트 매칭 (client-side filter)
- **칩 필터** — 상태(전체/완료/진행 중/실패) · 소스(전체/text/pdf/docx/url)
  - 그룹별 라벨 + 수직 구분선으로 시각적 위계
- **더 보기** 페이지네이션 (20개씩 추가 로드)
- 빈 상태 / 필터 결과 빈 상태 분리 안내

#### 9. 결과 페이지 (`/verify/jobs/[id]`) — 대대적 리뉴얼
- **같은 문장 claim 그룹화** — `ClaimGroup` 컴포넌트
  - claim_text 정규화(`trim + 공백 정리`) 후 Map으로 그룹
  - 그룹 헤더 = 원문 + verdict 분포 (● 점) + "n개" 카운트
  - **접기/펼치기 토글** (노션 토글 블록 스타일, chevron 회전)
- **검증 시도 박스 통일**
  - 모든 verdict에 대해 라벨 = "검증 시도"
  - match/mismatch/partial → 지표 + 기사 주장 + 공식 통계 + formula
  - unverifiable → 지표 + 기사 값 (디테일은 토글로)
- **claim_text 본문 제거** — 그룹 헤더에 이미 있으므로 카드는 핵심 정보만
- **AI 설명 톤 다운** — text-xs + 옅은 배경(`bg-muted/40`) + `whitespace-pre-wrap`
- **원문 ↔ 결과 양방향 인터랙션**
  - 원문에서 검증된 문장에 **verdict 색 하이라이트** (`.claim-highlight` CSS)
  - 우선순위 색: mismatch > partial > unverifiable > match
  - **호버 시 Tooltip** — verdict 분포 미리보기 + "클릭해서 결과 자세히 보기 →"
  - **클릭 시 스크롤** — 그룹 자동 펼침 후 부드러운 스크롤
  - **hover와 click 분리** — hover만으로는 그룹 펼쳐지지 않음 (`scrollTarget` 신호로만)

## 디렉토리 구조

```
frontend/
├── app/                                App Router
│   ├── layout.tsx                       ThemeProvider · TooltipProvider · JobWatcherProvider · Toaster · JobsBadge
│   ├── globals.css                      노션 토큰 + Pretendard import + .claim-highlight / .pdf-highlight
│   ├── page.tsx                         랜딩
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   ├── dashboard/page.tsx               ★ 실데이터 + 진행 중 카드 + 빈 상태
│   ├── verify/
│   │   ├── page.tsx                     ★ 진행 중 잠금 (fieldset disabled + 안내 배너)
│   │   ├── jobs/page.tsx                ★ 검증 히스토리 (검색·필터·페이지네이션)
│   │   └── jobs/[id]/page.tsx           ★ 결과 페이지 (PDF + 원문 하이라이트 + 그룹화)
│   ├── settings/api-keys/page.tsx       ★ 토스트 알림
│   ├── datasources/page.tsx             ★ 진짜 데이터 소스 관리 페이지
│   └── docs/page.tsx
├── components/
│   ├── ui/                              shadcn primitives
│   │   ├── button.tsx · card.tsx · input.tsx · label.tsx · textarea.tsx
│   │   ├── badge.tsx · tabs.tsx · separator.tsx
│   │   └── tooltip.tsx                  ★ 신규 (Radix Tooltip 래퍼)
│   ├── layout/
│   │   ├── AppShell.tsx                 Sidebar + main (Provider는 root로 이동)
│   │   ├── Sidebar.tsx                  ★ 노션 톤 + 다크모드 토글
│   │   ├── ThemeProvider.tsx            ★ next-themes 래퍼
│   │   ├── ThemeToggle.tsx              ★ ☀️/🌙 회전 토글
│   │   ├── NewVerifyButton.tsx          ★ 진행 중 자동 disabled + tooltip
│   │   └── JobsBadge.tsx                ★ 우하단 floating (페이지 컨텍스트 인식)
│   └── results/
│       ├── PDFViewer.tsx                react-pdf + 하이라이트
│       ├── ClaimCard.tsx                ★ ComparisonBox · AttemptBox 분기
│       ├── ClaimGroup.tsx               ★ 신규 (문장 단위 그룹화 + 접기/펼치기)
│       └── HighlightedSource.tsx        ★ 신규 (원문 하이라이트 + Tooltip)
└── lib/
    ├── api.ts                           fetch wrapper (mock fallback)
    ├── types.ts
    ├── utils.ts
    ├── useAuth.ts
    ├── jobWatcher.tsx                   ★ hasActiveJob · activeJob 헬퍼 + 완료 토스트
    └── mocks/sample-result.ts
```

★ = Phase 5.2에서 신규/대폭 수정

## 실행

```bash
cd frontend
npm install
cp .env.local.example .env.local         # 없으면 .env.local 생성
npm run dev
```

http://localhost:3000

### Mock 데이터로 둘러보기

`.env.local`에서 `NEXT_PUBLIC_API_URL=` 비워두면 backend 없이도 모든 페이지 동작:

```bash
# .env.local
NEXT_PUBLIC_API_URL=
```

- `/login` → 아무 이메일/비밀번호 입력하면 통과
- `/dashboard` → mock 통계
- `/verify` → 텍스트/PDF/DOCX/URL 입력 → 제출하면 `/verify/jobs/{id}` 이동
- `/verify/jobs/demo-job-001` → mock 결과 카드 5개 (mismatch 2건 포함)

### 실 백엔드 연결

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
```

백엔드 실행은 `backend/README.md` 참고. PostgreSQL + LLM API 키 (`NCP_API_KEY`) 필요.

## 디자인 시스템

### 색상 토큰 (노션 톤)

| 토큰 | 라이트 | 다크 |
|------|--------|------|
| `--background` | `#FFFFFF` | `#1A1917` |
| `--foreground` | `#37352F` | `#EAE9E5` |
| `--secondary` | `#F7F7F5` (사이드바) | `#26241F` |
| `--border` | `#E9E9E7` | `#34322D` |
| `--primary` | `#37352F` (다크그레이) | `#EAE9E5` |
| `verdict.match` | `hsl(168 78% 30%)` | (다크모드 채도 ↑) |
| `verdict.mismatch` | `hsl(0 72% 50%)` | |
| `verdict.partial` | `hsl(40 75% 42%)` | |
| `verdict.unverifiable` | `hsl(40 4% 46%)` | |

### 폰트
- `Pretendard Variable` (CDN import in `globals.css`)
- letter-spacing `-0.01em` (본문) / `-0.02em` (제목)
- font-feature-settings `"ss03", "tnum"` (모던한 글리프 + 숫자 정렬)

## 핵심 컴포넌트 사용법

### `<NewVerifyButton>` — 진행 중 자동 비활성화

```tsx
<NewVerifyButton tooltipSide="left" />
// 진행 중인 job이 있으면:
//   - 버튼 disabled + spinner
//   - 호버 시 tooltip ("검증이 진행 중입니다 · n%")
// 평소엔:
//   - Link href="/verify"
```

### `<ClaimGroup>` — 같은 문장 묶음 (접기/펼치기)

```tsx
<ClaimGroup
  sentence="올 4월 합계출산율도 0.76명으로..."
  claims={[claim1, claim2]}
  focusedClaimId={focusedClaimId}
  scrollTarget={scrollTarget}        // click 시에만 펼침 신호
  onHover={setFocusedClaimId}
  onClick={handleClaimClick}
/>
```

- 헤더 클릭 → 토글
- `scrollTarget`이 매칭되면 자동 펼침 (hover로는 펼치지 않음)

### `<HighlightedSource>` — 원문 하이라이트 + Tooltip

```tsx
<HighlightedSource
  source={job.source_data!}
  groups={sentenceGroups}
  focusedClaimId={focusedClaimId}
  onHover={setFocusedClaimId}
  onClick={handleClaimClick}
/>
```

- 각 그룹 문장을 verdict 색으로 하이라이트
- 우선순위: mismatch > partial > unverifiable > match
- 호버 시 Tooltip — verdict 분포 + "클릭해서 결과 자세히 보기 →"
- 클릭 시 결과 카드로 스크롤 + 그룹 자동 펼침

### `useJobWatcher()` — 글로벌 진행 상황

```tsx
const { hasActiveJob, activeJob, watch, unwatch } = useJobWatcher();

// 검증 제출 후
watch(jobId);  // 자동 폴링 + 우하단 표시 + 완료 시 토스트

// 진행 중 체크
if (hasActiveJob) { /* 비활성화 등 */ }
```

## 백엔드와의 계약 (`lib/types.ts`)

```ts
ClaimResult {
  sent_id, claim_text, verdict, confidence,
  schema, graph_temporal, evidence,
  computed_value, formula, explanation,
  pdf_locations?  // PDF 검증 시
}

VerificationReport {
  domain, anchor_year, claims, verdict_distribution
}

Job {
  id, status, source_type, source_uri?, source_data?,
  progress, current_step, result, error,
  created_at, completed_at
}
```

## 다음 작업 (Phase 5.3 후보)

- 결과 다운로드 (JSON / CSV)
- 검증 결과 공유 링크 (read-only)
- Cmd+K 명령 팔레트 (페이지 빠른 이동)
- 데이터 소스 추가 UI (CSV 업로드 + DB DSN)
- 사용량 차트 (대시보드 통계 카드에 sparkline)
- 빌링 페이지
- 백엔드 endpoint 연결 (현재 mock인 부분들 정리)
- PDF hover → 카드 자동 스크롤 폴리시 다듬기
- 반응형 (모바일 사이드바 드로어)

## 의존성 (Phase 5.2에서 추가)

```json
{
  "next-themes": "^0.3",   // 다크모드
  "sonner": "^1.5",        // 토스트
  "@radix-ui/react-tooltip": "^1.1"  // 이미 있었음, Tooltip 컴포넌트로 활용
}
```

## 알아두면 좋은 트랩

- **`tailwind.config.ts` 변경은 hot reload가 잘 안 됨** → dev 서버 재시작 필요
- **CSS 변수(`--popover` 등)가 있다고 `bg-popover` 클래스가 동작하는 건 아님** — `tailwind.config.ts`의 `colors`에도 정의 필요
- **`useMemo` 등 Hooks은 early return보다 반드시 위에 위치** — 호출 순서 일관성
- **Context Provider 위치** — 페이지 컴포넌트가 `useJobWatcher()`를 호출하려면 Provider가 페이지보다 **상위**에 있어야 함 (AppShell 안이 아닌 root layout에)
- **disabled 버튼은 hover 이벤트를 안 받음** — Tooltip 띄우려면 `<span tabIndex={0}>`으로 감싸기 (Radix 권장)
