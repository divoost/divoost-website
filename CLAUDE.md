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
7. **보안 최우선 (Security-First Communication)** ⚠️ — 마스터에게 옵션을 제안하거나 추천할 때, **보안 관련 위험·트레이드오프를 먼저 자세히 공지**한 후 추천. 빠른 해결책보다 안전한 해결책 우선 제시. (자세한 규칙: [§ 보안 우선 커뮤니케이션 규칙](#-보안-우선-커뮤니케이션-규칙-i1i7) 참고)

---

## 🔐 보안 우선 커뮤니케이션 규칙 (I1~I7)

> 2026-06-01 추가 (마스터 지시).
> Claude가 마스터에게 **어떤 옵션이든 추천할 때 보안 정보를 먼저 자세히 공지**해야 한다.
> 빠른 해결책을 우선 추천했다가 마스터가 보안 우려를 제기하는 사고 패턴을 방지.

### I1. 보안 위험을 먼저, 추천은 나중
- ❌ "Cloudflare를 Flexible로 바꾸세요 (5분이면 작동)" 같은 추천 먼저
- ✅ **"이 방법은 다음 보안 위험이 있습니다: [상세 설명]. 다만 우리 상황에서는 [영향 분석]. 더 안전한 대안: [대안]. 그래도 빠른 해결이 필요하면 위 방법."**
- 위험을 숨기지 말고, 마스터가 안 물어봐도 사전 공지

### I2. 옵션 비교 시 보안 컬럼 필수
- 모든 옵션 비교표에 **"보안 위험"** 또는 **"보안 등급"** 컬럼 필수
- 단순 "빠름/느림/비용"만 비교하지 말 것
- 예시:
  | 옵션 | 작동 시간 | **보안 (구간 전체 HTTPS)** | CDN 보호 |
  |---|---|---|---|
  | A | 5분 | ⚠️ 부분 (Cloudflare↔Origin 평문) | ✅ |
  | B | 24시간 | ✅ 완전 | ❌ 일시 중단 |

### I3. 외부 서비스/도구 도입 시 보안 사전 점검
- 새 서비스(Cloudflare·Supabase·Stripe·외부 API 등) 추천 시 **다음 5가지 사전 점검 후 보고**:
  1. 데이터 전송 경로 (어디서 어디로, 어떤 암호화?)
  2. 인증 방식 (OAuth / API key / token)
  3. 사용자 데이터가 그 서비스에 저장되는지 여부
  4. 그 서비스가 보안 사고가 있었는지 (CVE, 침해 사례)
  5. 우리 데이터에 그 서비스가 어떤 권한을 갖는지

### I4. "임시 조치" 추천 시 종료 조건 명시
- "일단 X로 작동시킨 후 나중에 Y로 바꿔라"는 추천 시:
  - **종료 조건 명확**: "GitHub Pages 인증서 발급 완료 후 (보통 24시간)"
  - **종료 후 작업 명시**: "Cloudflare → Full 모드로 변경 + Enforce HTTPS 체크"
  - **자동 알림 가능 여부**: Cloudflare에서 이메일 알림 옴
- 종료 조건 없으면 "임시"가 영구로 굳어버림 → 보안 사고 위험

### I5. 사용자 입력·외부 데이터 다룰 때 보안 영향 먼저
- 폼·DB·외부 API 작업 시 다음을 **먼저 공지**:
  - 어떤 정보가 어디로 전송되는지
  - 평문/암호화 여부
  - 로그/저장 위치
  - 만료/삭제 정책

### I6. 보안 관련 결정을 마스터에게 위임할 때 명확한 옵션
- "어느 쪽으로 진행할까요?" 같은 모호한 질문 금지
- **각 옵션의 보안 위험 점수**를 명시 (낮음/중간/높음)
- 마스터가 보안 트레이드오프를 알고 결정하도록

### I7. 보안 사고 패턴 사전 경고
- "이 방식은 과거 X 같은 사고가 있었습니다" 같은 사례 공유
- 예: GitHub Personal Access Token 노출, AWS S3 public bucket, Cloudflare misconfig 등
- 사고 사례 기반 경고는 추상적 경고보다 효과적

### 📊 I1~I7 적용 체크리스트 (옵션 제안 전 자체 검증)

```
□ I1. 빠른 해결책 먼저 추천하지 않았는가? (보안 정보 먼저?)
□ I2. 옵션 비교표에 보안 컬럼이 있는가?
□ I3. 외부 서비스 추천 시 5가지 점검을 했는가?
□ I4. 임시 조치 추천 시 종료 조건을 명시했는가?
□ I5. 사용자 입력·데이터 흐름을 먼저 공지했는가?
□ I6. 보안 위험 점수 (낮음/중간/높음) 명시했는가?
□ I7. 관련 보안 사고 패턴을 사전 경고했는가?
```

### ⚠️ 위반 예시 (실제 발생)

**상황**: GitHub Pages + 까페24 도메인 + Cloudflare SSL 에러

❌ **위반 응답** (Claude가 먼저 했던 추천):
```
"Cloudflare SSL/TLS 모드를 Flexible로 변경하세요. 5분이면 작동합니다."
```
→ 마스터가 "보안 문제 있는 것 아니야?" 우려 제기

✅ **올바른 응답** (이후 수정):
```
"먼저 보안 정보부터:

⚠️ Flexible 모드의 보안 위험
- 사용자 ↔ Cloudflare는 HTTPS (안전)
- Cloudflare ↔ Origin은 HTTP (평문)
- 우리 사이트 영향: [정적 사이트라 미미하지만 위험 존재]

더 안전한 대안: DNS only 모드 (24시간 대기)
- 완전한 HTTPS 보장
- Cloudflare CDN 24시간 일시 중단 단점

두 옵션 비교표:
| | Flexible | DNS only |
|---|---|---|
| 보안 | ⚠️ 부분 | ✅ 완전 |
| 시간 | 5분 | 24시간 |

권장: DNS only (보안 최강). 급하면 Flexible + 24시간 후 Full 복귀."
```

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

## 🔍 코드 품질 7수칙 (PR 머지 전 자체 검토)

> 안전 6수칙이 "사고 방지"라면, 7수칙은 "**코드베이스 부패 방지**".
> AI가 자주 빠뜨리는 품질 결함을 머지 전에 잡는다.

### 1️⃣ 테스트가 함께 왔고 실제로 통과하는가

**문제**: AI는 "테스트도 작성했습니다"라고 말하지만 실제로:
- 깨져 있거나
- `expect(true).toBe(true)` 같은 빈 껍데기거나
- 정작 검증하려는 동작을 안 다루거나

**Claude 행동 규칙**:
- 신규/변경 함수마다 **반드시 테스트 동반** (TDD 사이클)
- 테스트 작성 후 **실제로 실행** (`npm run test`)
- 실행 못 한 경우 **"실행 미확인"** 명시
- 테스트 내용 자체 검증: `expect`가 **실제 동작을 검증**하는가?
  - ❌ `expect(true).toBe(true)` — 무의미
  - ❌ `expect(fn()).toBeDefined()` — 너무 약함
  - ✅ `expect(formatPrice(13000, 'KRW')).toBe('13,000원')` — 명확한 검증

**자동 감지**:
```bash
# 빈 껍데기 테스트 패턴 찾기
grep -rn "expect(true).toBe(true)\|expect.*toBeDefined()" --include="*.test.*"
grep -rn "it.todo\|it.skip\|xit\|xdescribe" --include="*.test.*"
```

**중복**: 안전수칙 #1 + TDD 20개 항목 #1~#5와 연관 — **테스트 실행 검증 강화**

---

### 2️⃣ 엣지케이스·에러 분기를 처리했는가 ⭐

**문제**: AI는 happy path만 짠다. 실무 버그의 **80%가 엣지케이스/에러 분기**에서 발생.

**Claude 행동 규칙**:
- 모든 함수 작성 시 **다음 7가지 의심**:
  - [ ] 빈 배열 / 빈 문자열 / 빈 객체
  - [ ] `null` / `undefined`
  - [ ] `0` / 음수 / `NaN` / `Infinity`
  - [ ] 경계값 (min/max, off-by-one, 배열 첫/마지막)
  - [ ] 비동기 실패 (네트워크, 타임아웃, abort)
  - [ ] 동시성 (중복 호출, race condition)
  - [ ] 권한 거부 / 인증 만료
- 비동기는 **loading / success / error 3분기 모두** 작성 (TDD #9)
- "이건 절대 안 일어나" 가정 금지 — 사용자는 결국 한다

**실전 예시**:
```ts
// ❌ Happy path만
function average(nums: number[]) {
  return nums.reduce((a, b) => a + b) / nums.length;
}

// ✅ 엣지 처리
function average(nums: number[]) {
  if (!Array.isArray(nums) || nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

// ✅ 테스트
it('빈 배열은 0', () => expect(average([])).toBe(0));
it('null이면 0 (방어)', () => expect(average(null as any)).toBe(0));
it('단일 원소는 그 자체', () => expect(average([5])).toBe(5));
```

**중복**: TDD 20개 #9, #10과 통합 — **이거 빠뜨리면 PR 자동 거절**

---

### 3️⃣ 기존 컨벤션·폴더 구조·네이밍을 따랐는가 🆕

**문제**: AI는 자기 스타일로 짠다 → 코드베이스가 누더기.
- 프로젝트가 `camelCase`인데 혼자 `snake_case`
- 컴포넌트 폴더 구조 임의로 만듦
- 한국어 메시지인데 영어 섞어 씀

**Claude 행동 규칙**:
- 신규 파일 생성 전 **반드시 인접 파일 1~2개 읽기** (`Read`)
- 다음 사항 자동 일치:
  - 변수/함수: 기존 케이스 (camel/snake/Pascal)
  - 파일명: 기존 패턴 (`PriceBadge.tsx` vs `price-badge.tsx`)
  - import 순서/그룹화
  - 들여쓰기 (탭 vs 스페이스, 2/4칸)
  - 따옴표 ('single' vs "double")
  - 세미콜론 유무
  - 한국어/영어 혼합 비율 (주석, UI 텍스트)
- 우리 프로젝트 컨벤션 (현재):
  - HTML/JS: **ES5 호환** (`var`, function 선언, prototype)
  - 함수/변수: **camelCase**
  - 파일명: **kebab-case** (`secure-storage.js`)
  - DB 컬럼: **snake_case** (`user_id`, `created_at`)
  - UI 텍스트: **한국어** (마스터 호칭)
  - 들여쓰기: **4-space**
  - 따옴표: **single quote** 우선

**자동 감지**:
```bash
# 우리 프로젝트에 var/function 컨벤션인지 확인
grep -c "^const\|^let" sns-platform/js/*.js  # 0이어야 정상
# 들여쓰기 일관성
awk '/^\t/' sns-platform/**/*.html  # 탭 있으면 비정상
```

**행동 원칙**: "**짧은 컨벤션 위반 > 새 스타일 도입**"

---

### 4️⃣ 에러를 조용히 삼키지 않았는가 🔴

> 안전수칙 #4와 완전 중복 — 여기서 **더 강화**

**Claude 행동 규칙**:
- `catch {}` / `catch (e) {}` **절대 금지**
- 최소한 다음 중 하나:
  - `console.error('명확한 컨텍스트', { err, params })` + `throw`
  - `logger.error(...)` + `throw`
  - `setError(err.message)` + UI 알림
  - 의도적 무시면 **명시적 주석** (`// 의도적 무시: 폴링 중 일시 실패`)

**자동 감지**:
```bash
# 빈 catch 찾기
grep -rn "catch\s*{\s*}\|catch\s*([^)]*)\s*{\s*}" --include="*.ts" --include="*.js" --include="*.html"
# catch 안에 throw나 로그가 있는지
grep -B1 -A5 "} catch" src/ | grep -v "throw\|error\|logger\|setError"
```

**중복**: 안전수칙 #4 — **두 번 강조해도 부족함**

---

### 5️⃣ `any` 남발·타입 회피가 없는가 🆕 (TypeScript 전용)

**문제**: 타입스크립트 쓰는 이유는 미리 실수 잡으려는 건데, AI가 귀찮으면 `any`로 도망감 → TS 의미 상실.

**Claude 행동 규칙**:
- `any` 사용 시 **반드시 주석으로 정당화**:
  ```ts
  // any 사용 사유: 외부 라이브러리 타입 정의 없음 (TODO: 자체 타입 작성)
  declare const externalLib: any;
  ```
- 다음 패턴 우선 사용:
  - 알 수 없으면 **`unknown`** (런타임 검증 강제)
  - 함수 매개변수 → **generic** 또는 **union**
  - 라이브러리 타입 → `@types/...` 패키지 찾기
  - JSON 응답 → **interface/type 정의**
- 타입 단언(`as`) 최소화 — 가능하면 type guard 사용

**실전 예시**:
```ts
// ❌ any 도망
function parse(data: any): any {
  return data.items[0].name;
}

// ✅ unknown + 검증
function parse(data: unknown): string {
  if (
    typeof data === 'object' && data !== null &&
    'items' in data && Array.isArray((data as any).items) &&
    (data as any).items[0]?.name
  ) {
    return (data as any).items[0].name;
  }
  throw new Error('Invalid data shape');
}

// ✅ 더 좋은 방법: 타입 정의
interface ApiResponse {
  items: Array<{ name: string }>;
}
function parse(data: ApiResponse): string {
  return data.items[0]?.name ?? '';
}
```

**자동 감지**:
```bash
# any 사용 카운트
grep -rn ": any\|<any>\|as any" --include="*.ts" --include="*.tsx" | wc -l
# ESLint 룰
"@typescript-eslint/no-explicit-any": "error"
```

**예외 허용**: 외부 SDK 임시 사용, 마이그레이션 중간 단계 — **반드시 TODO 주석**

---

### 6️⃣ console.log·임시 코드·주석 처리한 코드가 남지 않았는가 🆕

**문제**: 디버깅용 `console.log`, "혹시 몰라서" 주석 처리한 옛 코드가 머지됨.
- 코드베이스 지저분
- 운영 환경에서 로그 누출 (비밀 정보 포함 가능)
- 옛 코드 = 죽은 코드 = 혼란

**Claude 행동 규칙**:
- 머지 전 다음 자동 정리:
  - [ ] `console.log` / `console.debug` 제거 (의도된 것만 `console.error` / `console.warn`로 유지)
  - [ ] 주석 처리된 코드 블록 제거 (`// const x = ...` 같은 것)
  - [ ] `TODO` 주석은 GitHub Issue 번호와 연결 (`// TODO(#123): ...`)
  - [ ] `FIXME` / `HACK` 주석은 코드 리뷰에서 명확히 짚기
  - [ ] 사용 안 하는 import 제거
  - [ ] 사용 안 하는 변수 제거 (또는 `_` prefix)

**자동 감지**:
```bash
# 의심 패턴 스캔
grep -rn "console.log\|console.debug\|debugger" --include="*.ts" --include="*.js" src/
grep -rn "^// const\|^// let\|^// function" --include="*.ts" --include="*.js"
grep -rn "TODO[^(]\|FIXME\|XXX\|HACK" --include="*.ts" --include="*.js"  # 이슈 번호 없는 것
```

**예외**: 의도된 로그
- 사용자 알림용 `console.error` (개발자도구 표시) ✅
- 정보성 `console.warn` (deprecated 경고 등) ✅
- **디버깅 잔재** `console.log('here')` ❌

---

### 7️⃣ 굳이 새 라이브러리를 안 깔고 기존 걸로 해결했는가 🆕

**문제**: AI는 간단한 기능에도 라이브러리 추가하는 경향.
- 의존성 ↑ = 보안 위험 ↑ + 용량 ↑ + 관리 부담 ↑
- `node_modules` 비대화 → CI 느려짐
- 작은 유틸리티(`lodash.debounce` 등)는 기본 기능으로 충분

**Claude 행동 규칙**:
- 새 라이브러리 추가 전 **반드시 자문**:
  - [ ] 기존 라이브러리로 가능한가? (`package.json` 확인)
  - [ ] 표준 JS/브라우저 API로 가능한가?
  - [ ] 10~20줄 자체 구현으로 충분한가?
- 추가가 정말 필요하면:
  - 번들 크기 확인 (`bundlephobia.com`)
  - 마지막 업데이트 / 다운로드 수
  - 라이선스 (MIT/Apache 권장)
  - 보안 취약점 (`npm audit`)
  - **마스터에게 사전 보고**: "이런 이유로 X 패키지 추가가 필요합니다, 추가해도 될까요?"

**자체 구현 가능한 흔한 경우**:

| 기능 | 라이브러리 사용 | 표준 대안 |
|---|---|---|
| 날짜 포맷 | `moment` / `dayjs` | `Date.prototype.toLocaleDateString()` |
| 디바운스 | `lodash.debounce` | 자체 구현 (10줄) |
| HTTP | `axios` | `fetch()` (표준) |
| UUID | `uuid` | `crypto.randomUUID()` (브라우저 표준) |
| 깊은 복사 | `lodash.cloneDeep` | `structuredClone()` (표준) |
| 클래스명 조합 | `classnames` | 템플릿 리터럴 |
| 폼 검증 | `formik` + `yup` | 간단하면 자체 검증 |

**자동 감지**:
```bash
# package.json 변경 확인
git diff HEAD~1 package.json | grep "^\+ "
# 새 의존성 추가 시 사이즈 체크
npm install <pkg> --dry-run
```

**예외 허용**:
- 명확히 복잡한 도메인 (date-fns, react-query, zod 등)
- 보안에 관련 (인증, 암호화)
- 표준이 너무 빈약 (e.g., timezone 처리)

---

### 📊 7수칙 자체 검증 체크리스트 (PR 머지 전)

```
□ 1. 테스트가 실제로 통과했는가 (npm run test 실행 확인)
□ 2. 엣지케이스 7가지 (빈값/null/0/경계/비동기/동시성/권한) 검토했는가
□ 3. 기존 컨벤션 (case/들여쓰기/따옴표/한영) 따랐는가
□ 4. catch {}, console.log() 빈 catch 없는가
□ 5. any 사용 시 정당화 주석 있는가 (또는 unknown/generic 사용)
□ 6. console.log, 주석 처리 코드, 사용 안 하는 import 제거했는가
□ 7. 새 라이브러리 추가 시 마스터 사전 보고했는가
```

### 🚨 통합 검증 체크리스트 (안전 6 + 품질 7 = 13가지)

```
[안전 6수칙 - 사고 방지]
□ A1. 빌드/테스트 실행 확인
□ A2. 요구사항 항목 대조 ✅/❌
□ A3. 범위 외 변경 없음 (git diff 확인)
□ A4. Read 후 Edit (기존 파일 보존)
□ A5. 비밀키 패턴 0건 (sk_/r8_/EAAB 스캔)
□ A6. 변경 파일 수가 의도와 일치

[품질 7수칙 - 부패 방지]
□ B1. 테스트 실제 통과 + 의미있는 검증
□ B2. 엣지케이스 + 에러 분기 처리
□ B3. 기존 컨벤션 준수
□ B4. catch 비어있지 않음 (안전수칙 #4 강화)
□ B5. any 남발 없음 (TS 전용)
□ B6. console.log/임시코드 정리
□ B7. 신규 라이브러리 사전 보고
```

---

## 🧠 시스템 사고 7수칙 (C1~C7) — 구조 결함 방지

> 운영 후 6개월 뒤 터지는 문제 방지.
> 큰 설계 변경, 새 모듈 작성, 아키텍처 결정 시 → 📖 [`docs/rules/system-thinking-7.md`](docs/rules/system-thinking-7.md) 읽기

| # | 제목 | 핵심 |
|---|---|---|
| C1 | AI 환각 ⚠️ | 존재하지 않는 API 만들지 않기 (가장 중요) |
| C2 | 보안 | 입력검증/인증/인가/인젝션 방지 |
| C3 | 성능 | N+1/리렌더/메모리 누수 |
| C4 | 아키텍처 | SOLID/Layer/적정 함수 길이 |
| C5 | 동시성 | 트랜잭션/Optimistic Lock/Idempotency |
| C6 | 하위 호환 | 변경 전 영향 분석, 점진적 마이그레이션 |
| C7 | 의존성 | npm audit + 라이선스 (MIT OK, GPL ❌) |


## 📊 관찰성 7수칙 (D1~D7) — 운영 가시성

> 운영 환경 진입 직전, Edge Functions 작성 시, 모니터링 설계 시 → 📖 [`docs/rules/observability-7.md`](docs/rules/observability-7.md) 읽기

| # | 제목 | 핵심 |
|---|---|---|
| D1 | 구조화된 로그 | JSON + 컨텍스트, 민감 정보 마스킹 |
| D2 | RED Method | Rate / Errors / Duration p99 |
| D3 | 분산 추적 | trace_id 전파 |
| D4 | 알림 설계 | 사용자 영향 기준 (false alarm 방지) |
| D5 | SLI / SLO | Error Budget 운영 |
| D6 | 대시보드 | 한 화면 = 한 질문 |
| D7 | 디버그 정보 | 5분 진단 가능하게 |


## 🎯 의사결정 / ADR 7수칙 (E1~E7) — 왜 이렇게 했는가

> 기술 스택 선택, 아키텍처 큰 변경, 외부 서비스 도입 시 → 📖 [`docs/rules/adr-decision-7.md`](docs/rules/adr-decision-7.md) 읽기

| # | 제목 | 핵심 |
|---|---|---|
| E1 | ADR 작성 | `docs/adr/ADR-NNN-제목.md` |
| E2 | 트레이드오프 명시 | 장점/단점/위험 모두 |
| E3 | Type 1 vs Type 2 | 가역적 결정은 빠르게 |
| E4 | 거절된 옵션 기록 | 왜 안 썼는지 |
| E5 | 가정 검증 | A/B/인터뷰/데이터 |
| E6 | Last Responsible Moment | 너무 빠르지도 늦지도 |
| E7 | RFC 프로세스 | 옵션 + 트레이드오프 명시 |


## 🚨 장애 대응 7수칙 (F1~F7) — 사고 발생 시

> 알림 수신 시, Postmortem/Runbook 작성 시 → 📖 [`docs/rules/incident-response-7.md`](docs/rules/incident-response-7.md) 읽기

| # | 제목 | 핵심 |
|---|---|---|
| F1 | Severity 등급 | P0(전체 다운)~P4(코스메틱) |
| F2 | 5분 룰 | 인지→완화→분석→Postmortem |
| F3 | Blameless Postmortem | 사람 X, 시스템 O |
| F4 | 5 Whys | 근본 원인까지 |
| F5 | Postmortem 문서 | docs/postmortems/ |
| F6 | Runbook | 같은 장애 2번 → 작성 |
| F7 | Chaos Engineering | 의도적 장애 실험 |


## 🤖 AI 페어 프로그래밍 (Claude 협업) 7수칙 (G1~G7)

> 주니어는 AI를 **답기계**로, 시니어는 **페어 동료**로.

### G1. 명확한 프롬프트 (Specificity)
- ❌ "로그인 만들어줘" → 추측 폭주
- ✅ "Supabase Auth + 이메일/패스워드 로그인. 성공 시 /dashboard 리다이렉트. 실패 시 한국어 에러 메시지. data-require-auth 패턴 따를 것."
- 입력/출력/제약을 **사전에 명시**

### G2. 단계 분해 (Task Decomposition)
- "전체 결제 시스템 만들어줘" ❌ → 한 번에 너무 큼
- ✅ "1단계: DB 스키마 → 2단계: Edge Function → 3단계: UI → 4단계: 통합 테스트"
- 각 단계마다 검증 → 다음 단계
- 안전수칙 6번 (한 번에 너무 많이 X)과 일치

### G3. 검증 의무 (Verify, Don't Trust)
- AI 답은 **항상 의심**
- 환각(시스템 #1) 가능성 — 메서드/API 실재 확인
- 코드 받으면:
  1. **읽어본다** (이해 안 되면 질문)
  2. **실행한다** (typecheck/test/dev)
  3. **엣지 테스트한다** (빈값, null, 잘못된 입력)

### G4. AI 한계 인식 (Knowing the Limits)
- AI는 모르는 것:
  - 우리 프로젝트의 **숨은 의도** (왜 이렇게 짰는지)
  - **최신 라이브러리** (knowledge cutoff)
  - **운영 데이터** (실제 사용자 행동)
  - **팀 컨벤션** (말 안 하면 추측)
- AI에게 알려줘야 할 것:
  - CLAUDE.md 같은 헌법 (이미 적용 ✅)
  - 인접 코드 (자동 Read)
  - 변경 의도 (why)

### G5. 메타 인지 — AI에게 확신도 물어보기
- "이 메서드 진짜 있어?" → AI가 슬그머니 정정하기도
- "이 코드 어디서 깨질 수 있어?" → 약점 노출 유도
- "다른 옵션은 뭐가 있어?" → 트레이드오프 확보
- "확신도 1~10 중 얼마야?" → 위험 평가

### G6. 피드백 루프 (Iterative Improvement)
- 첫 답이 별로면 **버리고 다시** (다듬기보다 재시도가 낫기도)
- 패턴 발견 → **CLAUDE.md에 추가** (재발 방지)
- 우리는 이미 잘하고 있음 (안전/품질/시스템/관찰성 등 누적)

### G7. AI 코드 책임은 **개발자에게** (Accountability)
- "AI가 짠 거라 몰랐어요" ❌
- 머지하는 순간 = 본인 코드
- AI는 도구 → 도구 사고는 사용자 책임
- 우리 프로젝트: Claude 코드도 **마스터 승인 후 머지**

---

## 🏚 레거시 / 기술부채 7수칙 (H1~H7) — 점진 개선

> 리팩터 시작 시, 마이그레이션 계획 시 → 📖 [`docs/rules/legacy-refactor-7.md`](docs/rules/legacy-refactor-7.md) 읽기

| # | 제목 | 핵심 |
|---|---|---|
| H1 | 기술부채 시각화 | TODO + 메트릭 + 백로그 |
| H2 | ROI 평가 | (자주 수정 × 복잡) 매트릭스 |
| H3 | Strangler Fig | 점진 교체 (재작성 ❌) |
| H4 | Branch by Abstraction | 추상화 후 교체 |
| H5 | 보이스카웃 룰 | 만질 때마다 조금씩 |
| H6 | 리팩터 vs 재작성 | 재작성은 ×3 시간 예산 |
| H7 | 부채 vs 단축 | 주석으로 명시 |


## 🎯 통합 최종 체크리스트 (55수칙 = 항상 + 상황별)

### 항상 적용 (이 CLAUDE.md에서 직접 검증)

```
🛡 A. 안전 6수칙 (모든 작업)
□ A1. 빌드/테스트 실행 확인
□ A2. 요구사항 항목 대조
□ A3. 범위 외 변경 없음
□ A4. Read 후 Edit
□ A5. 비밀키 패턴 0건
□ A6. 변경 파일 수 적정

🔍 B. 품질 7수칙 (모든 PR)
□ B1. 테스트 실제 통과
□ B2. 엣지케이스 + 에러 분기
□ B3. 기존 컨벤션 준수
□ B4. catch 비어있지 않음
□ B5. any 남발 없음
□ B6. console.log/임시코드 정리
□ B7. 신규 라이브러리 사전 보고

🤖 G. AI 페어 7수칙 (Claude 본인 의무)
□ G1. 명확한 프롬프트
□ G2. 단계 분해
□ G3. 검증 의무 (Verify, Don't Trust)
□ G4. AI 한계 인식
□ G5. 메타 인지 (확신도)
□ G6. 피드백 루프
□ G7. 책임은 개발자
```

### 상황별 적용 (각 docs/rules/*.md 참조)

| 그룹 | 적용 시점 | 참조 문서 |
|---|---|---|
| 🧠 C. 시스템 7수칙 | 큰 설계 변경 시 | [`system-thinking-7.md`](docs/rules/system-thinking-7.md) |
| 📊 D. 관찰성 7수칙 | 운영 진입 시 | [`observability-7.md`](docs/rules/observability-7.md) |
| 🎯 E. ADR 7수칙 | 큰 결정 시 | [`adr-decision-7.md`](docs/rules/adr-decision-7.md) |
| 🚨 F. 장애대응 7수칙 | 사고 발생 시 | [`incident-response-7.md`](docs/rules/incident-response-7.md) |
| 🏚 H. 레거시 7수칙 | 리팩터 시 | [`legacy-refactor-7.md`](docs/rules/legacy-refactor-7.md) |

### 적용 우선순위 (지금 → 6개월 후)

| 시기 | 수칙 그룹 | 우선도 |
|---|---|---|
| **즉시** | A (안전 6) + B (품질 7) + G (AI 페어 7) | ⭐⭐⭐⭐⭐ |
| **개발 중** | C (시스템 7) + E (ADR 7) | ⭐⭐⭐⭐ |
| **운영 진입 직전** | D (관찰성 7) + F (장애 대응 7) | ⭐⭐⭐⭐⭐ |
| **리팩터 시작 시** | H (레거시 7) | ⭐⭐⭐ |
| **TDD 적용 시** | TDD 20개 (별도) | ⭐⭐⭐⭐ |


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

### 📖 상황별 깊이 학습 문서 (`docs/rules/`)

CLAUDE.md에는 요약만, 깊이는 다음 5개 파일에:

| 문서 | 그룹 | 언제 읽어야 하나 |
|---|---|---|
| [`docs/rules/system-thinking-7.md`](docs/rules/system-thinking-7.md) | C 시스템 사고 | 큰 설계, 새 모듈, 아키텍처 결정 시 |
| [`docs/rules/observability-7.md`](docs/rules/observability-7.md) | D 관찰성 | 운영 환경 진입 직전, 모니터링 설계 시 |
| [`docs/rules/adr-decision-7.md`](docs/rules/adr-decision-7.md) | E ADR | 기술 스택 선택, 큰 결정 시 |
| [`docs/rules/incident-response-7.md`](docs/rules/incident-response-7.md) | F 장애 대응 | 알림 수신, Postmortem 작성 시 |
| [`docs/rules/legacy-refactor-7.md`](docs/rules/legacy-refactor-7.md) | H 레거시 | 리팩터 시작, 마이그레이션 시 |

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
