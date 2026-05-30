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

## 🧪 TDD 의무 (요약)

전체 가이드: [`docs/tdd-guide.md`](docs/tdd-guide.md)

### 모든 신규 기능 = 테스트 먼저

```
1. 실패 테스트 작성 (Red)
2. 최소 코드로 통과 (Green)
3. 리팩터 (Refactor, 테스트 초록인 상태에서만)
```

### 머지 전 필수 통과

```bash
npm run typecheck && npm run lint && npm run test
```

### 테스트 작성 체크리스트

- [ ] 정상 케이스 (happy path)
- [ ] 엣지 케이스 (빈값, 0, null, 경계값)
- [ ] 에러 케이스 (네트워크 실패, 잘못된 입력)
- [ ] 비동기는 loading / success / error 3분기 모두
- [ ] `beforeEach(vi.clearAllMocks)` 격리

### 안티패턴 금지

- ❌ `catch {}` 빈 catch
- ❌ 매직넘버 (`if (status === 2)`)
- ❌ 거대 snapshot
- ❌ `(x as Mock)` 캐스팅 → `vi.mocked(x)` 사용
- ❌ 구현 디테일 검증 → 행동(behavior) 기준
- ❌ 한 테스트에 여러 행동 검증

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
