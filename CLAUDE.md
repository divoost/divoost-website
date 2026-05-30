# CLAUDE.md - DIVOOST 프로젝트 개발 지침

> 이 파일은 Claude(AI 어시스턴트)가 **세션 시작 시 자동으로 읽는** 프로젝트 헌법입니다.
> 모든 코드 작성·리뷰·리팩터는 이 문서의 규칙을 따릅니다.

---

## 🎯 최우선 원칙 (절대 위반 금지)

1. **TDD 필수** — 모든 새 로직은 [`docs/tdd-guide.md`](docs/tdd-guide.md)를 따른다.
2. **API 키 절대 노출 금지** — 회사 마스터 키는 Supabase Edge Function 환경변수에만 저장.
3. **사용자 입력 절대 신뢰 금지** — XSS/SQL Injection 방지, RLS 정책 필수.
4. **에러 절대 삼키지 말 것** — `catch {}` 금지. 로그 + 전파 또는 사용자 표시.
5. **destructive 작업 사전 확인** — `git push --force`, `DROP TABLE`, `rm -rf` 등은 반드시 사용자 승인.
6. **한국어 응답 기본** — 마스터(사용자) 호칭, 명확한 한국어 설명.

---

## 🛡 AI 개발 안전 6수칙 (Claude 자체 검증)

> 코드 작성 후 "완성했습니다"라고 말하기 **전에** Claude 본인이 반드시 자체 검증할 6가지.
> 한국 개발자 커뮤니티에서 가장 자주 거론되는 AI 코딩 사고 패턴 기반.

### 1️⃣ 에러 없이 빌드·실행되는가

**문제**: AI는 "완성했습니다!"라고 자신 있게 말하지만 실제로 돌려본 적 없는 경우가 많음. 문법 오류 채로 끝낼 수 있음.

**Claude 행동 규칙**:
- 코드 작성 후 가능하면 즉시 실행/typecheck 시도 (`npm run typecheck`, `npm run test`, `npm run dev`)
- 정적 사이트면 적어도 **수동 코드 리뷰** (괄호/세미콜론/import 누락 점검)
- 실행 못 한 경우 보고할 때 **"실행 확인 안 됨"** 명시
- "완성했습니다" 대신 "코드 작성 완료. 다음 명령으로 검증 부탁드립니다: `npm run test`"

### 2️⃣ 요청한 기능이 맞는가 / 빠진 게 없는가

**문제**: "로그인 만들어줘" → 화면만 만들고 비밀번호 검증 빠뜨림.

**Claude 행동 규칙**:
- 요청을 받으면 **요구사항을 항목 리스트로 분해** (①화면 ②검증 ③에러 처리 ④성공 처리 ⑤테스트)
- 작업 완료 보고 시 **그 리스트와 대조하여 ✅/❌ 표시**
- 빠진 항목이 있으면 **명시적으로 "이건 빠뜨렸습니다"** 보고 (숨기지 않기)
- 모호한 요구사항은 `AskUserQuestion`으로 사전 확인

### 3️⃣ 요청 안 한 걸 멋대로 추가하지 않았는가

**문제**: "버튼 색만 바꿔줘" → 옆 레이아웃까지 손대거나 새 기능 끼워 넣음.

**Claude 행동 규칙**:
- **요청 범위 밖은 절대 건드리지 않음** — 발견한 버그/개선점은 보고만 하고 수정 X
- 작업 완료 시 **`git diff --stat` 또는 변경 파일 목록** 함께 보고
- 부득이하게 추가 수정이 필요하면 **사전에 마스터에게 확인** ("이 부분도 같이 손봐도 될까요?")
- 리팩터/포맷팅은 **별도 커밋**으로 분리

### 4️⃣ 기존 파일을 엉뚱하게 덮어쓰거나 지우지 않았는가

**문제**: 잘 돌아가던 파일을 통째로 새로 써서 기존 기능 사라짐.

**Claude 행동 규칙**:
- 파일 수정 전 **반드시 `Read`로 현재 내용 확인**
- 가능한 한 `Edit` 도구 사용 (`Write`는 신규 파일 또는 전면 재작성 시만)
- 큰 변경 전 **현재 상태 커밋 권장** ("작업 전 백업 커밋 먼저 하시겠어요?")
- `git mv`/`git rm` 사용 시 **반드시 사전 승인**
- 의도 불명한 파일 발견 시 **삭제/덮어쓰기 전 확인**

### 5️⃣ API 키·비밀번호가 코드에 박혀 노출되지 않았는가

**문제**: AI가 편의로 API 키/비밀번호를 코드에 박아둠 → GitHub에 올라가면 즉시 탈취.

**Claude 행동 규칙**:
- 비밀값은 **반드시 환경변수** (`.env`, Supabase Secrets, Edge Function env)
- 클라이언트 코드에는 **publishable key만** (RLS로 보호되는 값)
- 작성 후 **긴 영숫자 문자열 자체 스캔**: `sk_`, `r8_`, `EAAB`, `xoxp-`, `ghp_` 등 패턴
- `.env`, `*.key`, `secrets.json`은 `.gitignore` 확인
- 코드에 키가 보이면 **즉시 환경변수로 분리 + 마스터에게 키 회전 권고**

### 6️⃣ 한 번에 너무 많이 바꾸지 않았는가

**문제**: 한 번에 파일 10개 뜯어고치면 문제 추적 불가능.

**Claude 행동 규칙**:
- 큰 작업은 **단계별로 분해 + 단계마다 커밋**
- **한 커밋 = 한 가지 의도** 원칙
- 사이드바 일괄 수정 같은 mass change는 **별도 PR/커밋**으로 분리
- 한 응답에서 5개 이상 파일 수정 시 **사전 계획 공유** ("총 N개 파일 손봅니다, OK?")
- 단계 완료마다 **"다음 단계로 갈까요?"** 마스터 확인

### 📊 6수칙 자체 검증 체크리스트 (작업 종료 시)

```
□ 1. 빌드/테스트 실행 시도했는가 (또는 못 했음을 명시)
□ 2. 요구사항 리스트와 대조해서 ✅/❌ 표시
□ 3. git diff로 변경 범위가 요청과 일치하는지 확인
□ 4. Read 없이 Write/Edit한 파일 없는가
□ 5. 코드에 비밀키 문자열 패턴 없는가
□ 6. 변경 파일 수가 의도와 맞는가 (과도하지 않은가)
```

---

## 📚 필수 참고 문서 (작업 전 반드시 확인)

| 문서 | 내용 | 작업 시 참조 |
|---|---|---|
| [`docs/tdd-guide.md`](docs/tdd-guide.md) | **TDD 개발 지침 (Red→Green→Refactor)** | **모든 코드 작성** |
| [`docs/billing-schema.sql`](docs/billing-schema.sql) | 결제/크레딧 DB 스키마 | 과금 관련 |
| [`docs/billing-deployment.md`](docs/billing-deployment.md) | Edge Functions 배포 가이드 | AI 백엔드 변경 |
| [`docs/supabase-admin-schema.sql`](docs/supabase-admin-schema.sql) | 관리자 DB 스키마 | 어드민 기능 |
| [`docs/ai-gateway-setup.md`](docs/ai-gateway-setup.md) | AI 게이트웨이 사용법 | AI 모델 추가 |
| [`docs/instagram-setup.md`](docs/instagram-setup.md) | Instagram 연동 가이드 | SNS 연동 |
| [`docs/storage-bucket.sql`](docs/storage-bucket.sql) | 미디어 Storage 정책 | 파일 업로드 |
| [`docs/email-schema.sql`](docs/email-schema.sql) | 이메일 시스템 스키마 | 알림/이메일 |
| [`sns-platform/js/secure-storage.js`](sns-platform/js/secure-storage.js) | 토큰 만료/스윕 유틸 | SNS 토큰 저장 |
| [`.env.example`](/.env.example) | 환경변수 템플릿 (Supabase/AI/PG/SNS) | 배포 / 신규 환경 |

---

## 🏗 프로젝트 구조

```
divoost-website/
├── sns-platform/              # SNS 자동화 메인 플랫폼
│   ├── index.html             # 종합 현황 대시보드
│   ├── auth.html              # 로그인/회원가입
│   ├── manifest.json          # PWA 매니페스트
│   ├── sw.js                  # Service Worker
│   ├── css/sns.css            # 공통 스타일
│   ├── js/
│   │   ├── auth-guard.js      # 인증 가드 (모든 페이지)
│   │   ├── ai-gateway.js      # AI 백엔드 프록시 클라이언트
│   │   ├── email-service.js   # 이메일 발송
│   │   └── supabase-admin.js  # 관리자 SDK
│   ├── pages/                 # 사용자 페이지
│   │   ├── create.html        # 콘텐츠 작성
│   │   ├── ai-writer.html     # AI 작성기
│   │   ├── publish.html       # 발행
│   │   ├── settings.html      # 설정
│   │   ├── billing.html       # 요금제/크레딧 ★
│   │   └── ...
│   └── admin/                 # 관리자 콘솔 (11페이지)
├── supabase/
│   └── functions/             # Edge Functions (백엔드)
│       ├── _shared/           # 공유 유틸 (cors, ai-models, providers)
│       ├── ai-generate-image/ # AI 이미지 프록시
│       └── ai-generate-video/ # AI 영상 프록시
├── docs/                      # 문서 (스키마, 가이드)
├── dashboard/                 # Sourcing-tracker 대시보드
├── chrome-extension/          # 크롬 확장 (Coupang/Alibaba 스크래핑)
└── CLAUDE.md                  # ← 이 파일
```

---

## 🛠 기술 스택

### 프론트엔드
- **순수 HTML/CSS/JS** (빌드 도구 없음, GitHub Pages 호스팅)
- ES5 호환 작성 (`var`, function 선언) — 일부 모던 코드는 page-local
- 향후 마이그레이션: React + TypeScript + Vite (TDD 가이드 적용 가능 상태로)

### 백엔드
- **Supabase**
  - Auth (JWT)
  - PostgreSQL + RLS
  - Edge Functions (Deno + TypeScript)
  - Storage (`sns-media` 버킷)
- **외부 API**: Replicate / Fal.ai / OpenAI / Facebook Graph API / Resend.com

### 호스팅
- GitHub Pages (정적 사이트)
- Supabase (Auth/DB/Functions/Storage)

---

## 📐 코딩 규칙

### 전체 공통

- **TypeScript/Deno 코드**: TDD 가이드 100% 적용
- **ES5 HTML/JS 코드**: 향후 마이그레이션 전까지 기존 스타일 유지
  - `var` 사용 (구버전 브라우저 호환)
  - 함수 선언문
  - Promise는 OK, async/await는 모던 브라우저 한정 사용
- **모바일 우선**: 모든 신규 UI는 반응형 + 터치 최적화 (44px 이상 버튼)
- **PWA 호환**: viewport, theme-color, apple-* 메타 태그 필수

### 보안 체크리스트 (모든 PR)

- [ ] 사용자 입력은 `escapeHtml()`로 이스케이프
- [ ] SQL은 RPC 또는 prepared statement (직접 string 조립 금지)
- [ ] API 키는 환경변수 (코드/HTML 노출 금지)
- [ ] RLS 정책으로 본인 데이터만 접근
- [ ] CORS는 필요한 origin만 허용
- [ ] localStorage 민감 정보 저장 시 만료 시간 명시

### 한국어 작성 규칙

- 함수/변수명은 **영어**
- 주석/문서/UI 텍스트는 **한국어 (마스터에게 보고하는 어투)**
- 에러 메시지는 한국어 + 가능하면 해결책 포함

---

## 🧪 TDD 의무 — 20개 항목 (3단계)

전체 가이드: [`docs/tdd-guide.md`](docs/tdd-guide.md) · 블로그 버전: [`docs/blog-tdd-guide-post.md`](docs/blog-tdd-guide-post.md)

### 🔑 기본 사이클 (절대 변경 불가)

```
1. 실패 테스트 작성 (Red)
2. 최소 코드로 통과 (Green)
3. 리팩터 (Refactor, 테스트 초록인 상태에서만)
```

### 머지 전 필수 통과

```bash
npm run typecheck && npm run lint && npm run test
```

---

### 🟢 1단계 — 반드시 익히기 (모든 코드에 적용)

> "이거 안 지키면 PR 안 받음" 레벨. 입사 1개월 안에 본능화.

| # | 규칙 | 적용 |
|---|---|---|
| 1 | **Red→Green→Refactor 사이클** 이해 | 모든 신규 기능 |
| 2 | **테스트 이름 "조건→결과"** 작성 (`'양수끼리 더하면 합을 반환'`) | 모든 `it()` |
| 3 | **매직넘버 상수화** (`const STATUS_PAID = 2` + `as const`) | 모든 숫자/문자 리터럴 |
| 4 | **`catch {}` 금지** — 최소 `logger.error()` 후 `throw` 또는 사용자 표시 | 모든 try/catch |
| 5 | **테스트 파일을 소스 옆에** (`PriceBadge.tsx` + `PriceBadge.test.tsx`) | 모든 신규 파일 |

```ts
// 1단계 예시 - 모두 종합
const ORDER_STATUS = { PAID: 2 } as const;       // ← 규칙 3

it('PAID 상태면 영수증 URL을 반환한다', () => {    // ← 규칙 2
  expect(getReceipt(ORDER_STATUS.PAID)).toMatch(/receipt/);
});

try {
  await save();
} catch (err) {
  logger.error('주문 저장 실패', { err, orderId });  // ← 규칙 4
  throw err;
}
```

---

### 🟡 2단계 — 실무 핵심 (3개월 안에 의식적으로 적용)

> 이거 잘하면 시니어 평가받음. 7가지.

| # | 규칙 | 적용 |
|---|---|---|
| 6 | **`vi.mock` + `beforeEach(clearAllMocks)`** — 테스트 간 격리 | 외부 의존성 있는 모든 테스트 |
| 7 | **동기는 `act()`, 비동기는 `await act(async () => ...)`** | React 상태 변경 모든 곳 |
| 8 | **`waitFor`로 비동기 결과 대기** | 비동기 결과 검증 |
| 9 | **loading / success / **error** 3분기 모두 테스트** ★ 가장 자주 빠뜨림 | 모든 비동기 hook/함수 |
| 10 | **엣지케이스 체크리스트** (null/0/빈배열/경계값) 적용 | 모든 함수 |
| 11 | **Coverage 80/70 목표** — 100% 금지 | CI 임계값 |
| 12 | **함수 30줄 가이드** — 길면 분리 검토 | 모든 함수 |

```ts
// 2단계 예시 - 3분기 + 격리 + 비동기 act
import { vi, beforeEach } from 'vitest';
import { fetchOrders } from './api';

vi.mock('./api', () => ({ fetchOrders: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();                                  // ← 규칙 6
});

it('loading → success로 상태가 바뀐다', async () => {     // ← 규칙 9
  vi.mocked(fetchOrders).mockResolvedValue([{ id: 1 }]);
  const { result } = renderHook(() => useOrders());
  expect(result.current.loading).toBe(true);
  await waitFor(() =>                                  // ← 규칙 8
    expect(result.current.loading).toBe(false)
  );
});

it('API 실패 시 error 분기로 들어간다', async () => {     // ← 규칙 9 (★ 자주 빠뜨림)
  vi.mocked(fetchOrders).mockRejectedValue(new Error('500'));
  const { result } = renderHook(() => useOrders());
  await waitFor(() => expect(result.current.error).toBeTruthy());
});

it('비동기 refetch는 await act로 감싼다', async () => {   // ← 규칙 7
  const { result } = renderHook(() => useOrders());
  await act(async () => {
    await result.current.refetch();
  });
});
```

---

### 🔴 3단계 — 고급 / 컨벤션 주도 (시니어 권장)

> 주니어 가르치는 레벨. 8가지.

| # | 규칙 | 적용 |
|---|---|---|
| 13 | **`vi.mocked()` vs `as Mock`** — 타입 안전성 우위 (vi.mocked 사용) | 모든 mock 검증 |
| 14 | **MSW (Mock Service Worker)** — 통합 테스트 핵심 | API 통합 테스트 |
| 15 | **타이머 mock** (`vi.useFakeTimers` + `advanceTimersByTime`) | debounce/throttle/setTimeout 코드 |
| 16 | **React Query wrapper** — 매 테스트 새 client | React Query 사용 컴포넌트 |
| 17 | **Inline snapshot** 적절 사용 (한정된 텍스트만, 거대 DOM 금지) | 출력 형식 검증 |
| 18 | **StrictMode + act 경고** 해석 — 비동기 effect 미반영 신호 | React 18 환경 |
| 19 | **ESLint testing rules** (`vitest/no-focused-tests` 등) | CI lint 단계 |
| 20 | **PR 리뷰 체크포인트 8가지** 자동 검토 | 모든 PR 리뷰 |

```ts
// 3단계 예시 - vi.mocked + 타이머
vi.mocked(fetchOrders).mockResolvedValue([{ id: 1 }]);  // ← 규칙 13

it('debounce는 300ms 후 한 번만 호출', () => {
  vi.useFakeTimers();                                    // ← 규칙 15
  const fn = vi.fn();
  const debounced = debounce(fn, 300);
  debounced(); debounced(); debounced();
  vi.advanceTimersByTime(300);
  expect(fn).toHaveBeenCalledTimes(1);
  vi.useRealTimers();
});

// React Query wrapper - 캐시 누수 방지                   // ← 규칙 16
function wrapper({ children }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
```

---

### 🚨 안티패턴 절대 금지

| ❌ 금지 | ✅ 대신 |
|---|---|
| `catch {}` 빈 catch (규칙 4 위반) | `logger.error()` + `throw` |
| `if (status === 2)` 매직넘버 (규칙 3 위반) | `if (status === ORDER_STATUS.PAID)` |
| 거대 snapshot (규칙 17 위반) | `toMatchInlineSnapshot()` 좁은 범위 |
| `(x as Mock)` 캐스팅 (규칙 13 위반) | `vi.mocked(x)` |
| 구현 디테일 검증 | 행동(behavior) 기준 검증 |
| 한 테스트에 여러 행동 검증 (규칙 2 위반) | 케이스별 분리 |
| `vi.clearAllMocks()` 누락 (규칙 6 위반) | `beforeEach`에 강제 |
| error 분기 테스트 누락 (규칙 9 위반) | `mockRejectedValue` 필수 |

---

### ✅ PR 리뷰 체크포인트 8가지 (규칙 20)

리뷰어가 5분 안에 확인:

- [ ] 테스트 이름이 한국어로 "조건→결과"를 설명하는가? (규칙 2)
- [ ] 에러 케이스가 테스트에 있는가? (규칙 9)
- [ ] `vi.mock` 호출이 **모듈 최상단**에 있는가? (hoisting)
- [ ] `beforeEach`/`afterEach`로 **격리** 되어 있는가? (규칙 6)
- [ ] 새 매직넘버가 **상수화** 되어 있는가? (규칙 3)
- [ ] `try/catch`로 **에러를 삼키지** 않는가? (규칙 4)
- [ ] Snapshot이 거대하지 않은가? (규칙 17)
- [ ] Coverage가 떨어지지 않았는가? (규칙 11)

---

## 🚀 작업 흐름

### 새 기능 요청 받을 때

1. **요구사항 명확화** — 모호하면 AskUserQuestion으로 확인
2. **관련 문서 확인** — `docs/` 에서 관련 가이드 우선 읽기
3. **TDD 사이클 시작** — 테스트 먼저
4. **점진적 구현** — 한 사이클씩, 머지 가능한 단위로
5. **커밋 메시지** — 한국어, 왜 변경했는지 명시
6. **브랜치 작업** → main 머지 → push

### 브랜치 전략

- **작업 브랜치**: `claude/sweet-ptolemy-3T5j3` (기본)
- **main**: 사용자가 머지 요청 시에만
- **never force push** to main

### 커밋 메시지 형식

```
[영역] 한 줄 요약 (한국어)

상세 설명:
- 무엇이 바뀌었는지
- 왜 바뀌었는지
- 관련 이슈 / 사용자 요청

테스트:
- 추가/수정된 테스트 항목
```

예시:
```
Instagram 연동 보강: 댓글 관리 + 인사이트

- engagement.html: Instagram 댓글 실제 조회/답글/삭제
- analytics.html: Instagram Insights 실시간 조회
- publish.html: Stories 발행 지원

테스트:
- 댓글 답글 성공/실패 분기
- 인사이트 API 응답 파싱
- Stories STORIES media_type 검증
```

---

## 💼 비즈니스 컨텍스트

### 제품: DIVOOST SNS Platform
- 7개 SNS 채널 통합 자동 포스팅 (FB/IG/TT/네이버블로그/카페/샤오홍수/도우인)
- 멀티 계정 지원
- AI 콘텐츠 생성 (이미지/영상/텍스트)
- 댓글 관리 + 인사이트 분석
- 예약 발행

### 수익 모델 (하이브리드)
- 구독제 (Free / Starter / Pro / Business / Enterprise)
- 크레딧 충전 (추가 사용량)
- AI 마진: 회사가 마스터 API 키로 제공, 원가 × 1.7 판매

### 타깃 고객
- 1인 크리에이터, 소상공인 마케터, 광고 에이전시
- 국내(메인) + 해외 한인/아시아권

### 결제 (계획)
- 국내: 토스페이먼츠 + 카카오페이 + 네이버페이
- 해외: PayPal + Stripe

---

## 🚧 진행 중 작업 / 미완 항목

### Phase 1 완료 ✅
- DB 스키마 (plans, subscriptions, credits, ai_usage_logs, payments)
- Edge Functions (ai-generate-image, ai-generate-video)
- 고객 billing.html UI
- 백엔드 프록시 (회사 API 키 사용)

### Phase 2 진행 예정
- [ ] 토스페이먼츠 실제 결제 연동
- [ ] Stripe 자동 구독 연동
- [ ] 정기결제 빌링키
- [ ] 관리자 매출/마진 대시보드
- [ ] GPT-4 텍스트 생성 백엔드
- [ ] 잔액 부족 알림 이메일

### 마스터 직접 처리 필요
- [ ] `docs/billing-schema.sql` Supabase SQL Editor 실행
- [ ] Supabase Edge Functions 환경변수 설정 (REPLICATE_API_KEY 등)
- [ ] Edge Functions 배포 (`supabase functions deploy`)
- [ ] Facebook 앱 라이브 모드 전환 / 권한 추가
- [ ] Instagram Business Account 페이지 연결

---

## 🔑 환경 정보

### Supabase
- URL: `https://unruyezigyybnuvgdgdt.supabase.co`
- Publishable Key: `sb_publishable_CTq6ypxtybUPWUcYptiQ0A_mOa0b2hs`
- Storage 버킷: `sns-media` (public)

### Facebook App
- App Name: `sns-연동`
- App ID: `1774380433543061`

### 관리자 계정
- 슈퍼 관리자 이메일: `goodbae@naver.com`
- role: `super_admin`

### 배포 URL
- 사용자 사이트: `https://divoost.github.io/divoost-website/sns-platform/`
- 관리자 콘솔: `/sns-platform/admin/`
- 결제 페이지: `/sns-platform/pages/billing.html`

---

## 📞 응답 가이드라인

### 사용자(마스터) 응대

- **호칭**: "마스터님"
- **언어**: 한국어 기본 (전문 용어는 영어 병기 가능)
- **톤**: 정중하되 간결, 액션 위주
- **이모지**: 의도 명확화에 도움 되면 사용 (남용 금지)

### 응답 구조

1. **핵심 답** 먼저 (TL;DR)
2. **상세 설명** (필요 시)
3. **다음 액션** 명시 (마스터가 뭘 해야 하는지)
4. **막힐 수 있는 지점** 미리 안내

### 막혔을 때

- 스크린샷 요청
- 좁은 단계로 분해
- 우회 방법 함께 제시 (Plan B)

---

## ✏️ 이 문서 수정

이 CLAUDE.md를 수정할 때:
1. 변경 이유를 commit 메시지에 명시
2. 영향 범위 큰 변경은 마스터에게 사전 확인
3. 새 docs/ 파일 추가 시 위 "필수 참고 문서" 표 업데이트

---

**마지막 업데이트**: 2026-05-30
**적용 범위**: 이 리포지토리의 모든 코드 작업
