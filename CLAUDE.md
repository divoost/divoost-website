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

## 🧠 시스템 사고 7수칙 (구조적 결함 방지)

> 안전 6수칙은 "당장 사고", 품질 7수칙은 "코드 부패",
> **시스템 사고 7수칙은 "운영 후 6개월 뒤 터지는 문제"**.
> AI가 가장 자주 빠뜨리는 시스템적 사고.

### 1️⃣ AI가 지어낸 "그럴듯한 거짓말" 잡아내기 ⚠️ **가장 중요** 🆕

**문제**: AI(Claude 포함)는 모르는 걸 모른다고 안 하고, **존재하지 않는 함수·옵션·API를 그럴듯하게 만들어냄**.
- `array.findLastIndexWhere()` 같은 가짜 메서드
- 라이브러리에 없는 옵션 (`{ deepClone: true }` 같은 것)
- 잘못된 함수 시그니처 (인자 순서/타입)
- API 엔드포인트 (`/api/v2/users/:id/preferences` 가 실재하지 않음)

코드는 멀쩡해 보이는데 **실행하면 `is not a function` 또는 404**.

**Claude 행동 규칙** (자기 검증 의무):
- 처음 쓰는 메서드·옵션·API는 **불확실하면 "확인 필요" 명시**
- 가능하면 **실제 코드베이스/패키지에서 확인** (`grep`, `package.json` 조회)
- 외부 API는 **버전 명시** + 공식 문서 링크 제공
- "이거 진짜 있어?" 질문 받으면 **솔직하게 재확인** (체면 차리지 않음)
- 응답 마지막에 **"검증되지 않은 항목"** 별도 표시

**자기 검증 패턴**:
```
✓ 검증됨 (실행/문서 확인): fetch(), Array.prototype.find()
⚠ 추정 (검증 필요): array.findLastIndexWhere() — 실재 여부 확인 권장
❌ 사용 금지: 존재 확실치 않음
```

**자동 감지 (마스터님 확인용)**:
```bash
# 의심스러운 메서드 호출 패턴 검색
# 예: 코드에 사용된 메서드가 실제 lib에 있는지 확인
grep -rn "\.someUnusualMethod(" src/
node -e "console.log(typeof [].findLastIndexWhere)"  # undefined면 가짜
```

**행동 원칙**: "**모르는 건 솔직하게 모른다고 한다.**"
- "이거 진짜 있어?" 마스터님이 물으시면 → 즉시 재확인
- 추측 기반 코드는 **반드시 주석으로 표시** (`// API 시그니처 확인 필요`)

**중복**: 안전수칙 #1과 보완 — **AI 특화 환각 방지**

---

### 2️⃣ 보안 — 입력 검증·인증·인가·인젝션 🟡 (강화)

**문제**: AI는 "동작하는 코드"에 집중하다 **보안을 자주 빠뜨림**:
- 사용자 입력 → 그대로 SQL 쿼리 → **SQL Injection**
- 로그인만 확인, "이 사람이 이 데이터 볼 권한 있나?" 빠뜨림 → **IDOR (Insecure Direct Object Reference)**
- 사용자 입력 → 그대로 HTML 렌더 → **XSS**
- 파일 업로드 검증 없음 → **임의 파일 업로드**
- CORS 와일드카드 (`*`) → 외부 사이트가 우리 API 호출

**Claude 행동 규칙**:

**A) 입력 검증 (Input Validation)**
- 모든 사용자 입력은 **타입 + 형식 + 범위** 검증
- 화이트리스트 우선 (`['admin', 'user']` 중 하나만)
- DB 쿼리는 **반드시 prepared statement** (RPC, parameterized query)
- HTML 렌더링 시 **반드시 escape** (`escapeHtml()`)

**B) 인증 vs 인가 구분**
- **인증 (Authentication)**: "누구냐?" — Supabase JWT 검증
- **인가 (Authorization)**: "이걸 할 수 있냐?" — 본인 데이터/role 검증
- 둘 다 매번 확인 — 인증만 하고 인가 빠뜨리는 게 IDOR

**C) RLS 정책 필수 (우리 프로젝트)**
```sql
-- ✅ 본인만 본인 데이터 조회
CREATE POLICY "user_view_own" ON public.orders FOR SELECT
USING (auth.uid() = user_id);

-- ❌ RLS 없으면 인증된 누구나 다른 사람 데이터 조회 가능
```

**D) 흔한 취약점 체크**
- [ ] SQL Injection: prepared statement 사용?
- [ ] XSS: HTML escape?
- [ ] CSRF: SameSite=Strict 또는 토큰 검증?
- [ ] IDOR: 본인 데이터인지 확인?
- [ ] Open Redirect: 리디렉션 URL 화이트리스트?
- [ ] File Upload: 확장자/MIME/크기 검증?
- [ ] CORS: 와일드카드 금지, 특정 origin만

**자동 감지**:
```bash
# CORS 와일드카드
grep -rn "Access-Control-Allow-Origin.*\*" --include="*.ts" --include="*.js"
# SQL string concat (위험)
grep -rn "query.*+.*\${" --include="*.ts" --include="*.js"
# 본인 검증 없는 fetch (의심)
grep -rn "supabase.from.*select" --include="*.ts" | grep -v "auth.uid()"
```

**중복**: 최우선 원칙 #3 + 코딩규칙 보안 체크리스트 — **인가/IDOR 추가 강화**

---

### 3️⃣ 성능 — N+1 쿼리·불필요한 리렌더·메모리 누수 🆕

**문제**: AI는 데이터 양을 고려 안 하고 짬:
- **N+1 쿼리**: 주문 100개 + 각 주문 상세 = 101번 쿼리 (데이터 적을 때 안 보임)
- **불필요한 리렌더**: 부모 state 바뀔 때마다 자식 전체 리렌더
- **메모리 누수**: `useEffect` cleanup 안 함, 이벤트 리스너 안 떼냄
- **번들 크기**: 큰 lib 통째 import (tree-shaking 안 됨)

**Claude 행동 규칙**:

**A) N+1 쿼리 방지**
```ts
// ❌ N+1
const orders = await db.orders.findAll();
for (const order of orders) {
  order.items = await db.items.findByOrderId(order.id);  // N번 더!
}

// ✅ 한 번에 JOIN 또는 IN 쿼리
const orders = await db.orders.findAll({
  include: ['items'],  // ORM 사용 시
});

// ✅ Supabase 예시
const { data } = await supabase
  .from('orders')
  .select('*, items(*)');  // ← 한 번 쿼리
```

**B) React 리렌더 최소화**
- `React.memo` / `useMemo` / `useCallback` 적절히 사용
- key prop 정확히 (배열 index ❌)
- Context 분리 (값/액션 분리)

**C) 메모리 누수 방지**
```ts
useEffect(() => {
  const handler = () => { /* ... */ };
  window.addEventListener('resize', handler);
  return () => window.removeEventListener('resize', handler);  // ★ cleanup 필수
}, []);
```

**D) 자기 질문 체크리스트**
- [ ] 데이터 10만 건이면 어떻게 되나?
- [ ] 동시 사용자 1000명이면?
- [ ] 1년 운영하면 DB 크기 얼마?
- [ ] 모바일 3G 환경에서 페이지 로딩 시간?

**우리 프로젝트 특화**:
- Supabase는 `.select('*, related(*)')`로 JOIN
- AI 호출은 비싸므로 **결과 캐싱** 필수 (Storage 영구 저장)
- localStorage 크기 5MB 한도 — 큰 데이터는 IndexedDB

**자동 감지**:
```bash
# 반복문 안의 await (N+1 의심)
grep -rn "for.*await\|forEach.*await" --include="*.ts" --include="*.js"
# cleanup 없는 useEffect
grep -B2 -A10 "useEffect" src/ | grep -L "return"
```

---

### 4️⃣ 아키텍처 — 책임 분리·결합도·추상화 수준 🟡 (강화)

**문제**: 두 극단 모두 위험:
- **책임 과다**: 한 함수가 조회 + 계산 + 화면 그리기 (God function)
- **과도한 추상화**: 단순한 걸 5겹 wrapper로 싸서 읽기 어려움

둘 다 **요구사항 변경 시 지옥**.

**Claude 행동 규칙**:

**A) SOLID 원칙 (적당히)**
- **S**ingle Responsibility: 한 함수/클래스 = 한 가지 일
- **O**pen/Closed: 확장 가능, 수정 불가능
- **L**iskov Substitution: 자식이 부모 대체 가능
- **I**nterface Segregation: 큰 인터페이스보다 작은 여러 개
- **D**ependency Inversion: 추상화에 의존

**B) 책임 분리 (Layer)**
```
[표현 계층] UI 컴포넌트, 페이지
   ↓
[비즈니스 로직] 도메인 함수, 서비스
   ↓
[데이터 접근] DB 쿼리, API 호출
```

각 층은 **자기 일만** 함. 컴포넌트가 직접 DB 쿼리 ❌

**C) 결합도 vs 응집도**
- **낮은 결합도**: 모듈 간 의존성 최소
- **높은 응집도**: 한 모듈 안 코드들은 강하게 관련

**D) 자기 질문**
- [ ] 요구사항 한 가지 바뀌면 **한 군데만** 고치면 되나?
- [ ] 함수 이름이 "**and**" 또는 "**or**" 들어가나? (= 책임 과다)
- [ ] 인자가 5개 이상인가? (= 책임 과다 또는 객체 분리 필요)
- [ ] 같은 코드가 3곳 이상 반복인가? (= 추상화 필요)
- [ ] 추상화 레이어가 정말 필요한가? (= 과도한 추상화 의심)

**적정 함수 길이**:
- 컴포넌트: 100~200줄
- 함수: 30줄 (TDD #12)
- 클래스: 200줄 미만

**중복**: TDD #12와 통합 — **SOLID + Layer 추가**

---

### 5️⃣ 동시성·경쟁 상태·트랜잭션 경계 🆕

**문제**: 운영에서 가장 무서운 버그.
- **재고 1개에 두 명 동시 주문 → 둘 다 성공** (Race Condition)
- **결제는 됐는데 주문 저장 실패 → 돈만 빠짐** (Transaction 누락)
- **동일 사용자 더블 클릭 → 중복 결제**
- **여러 탭에서 동시 수정 → 마지막 글만 살아남음** (Last Write Wins)

**Claude 행동 규칙**:

**A) 원자적 트랜잭션 (DB 수준)**
```sql
-- ✅ 우리 프로젝트 사례: 크레딧 차감 RPC
CREATE FUNCTION deduct_credits(...) RETURNS JSONB
LANGUAGE plpgsql AS $$
BEGIN
  -- SELECT ... FOR UPDATE (잠금)
  -- 잔액 확인 + 차감
  -- 트랜잭션 로그
  -- 전체가 한 번에 성공 or 전체 롤백
END;
$$;

-- ❌ 클라이언트에서 SELECT → 차감 → UPDATE
-- → 두 사용자 동시 호출 시 race condition
```

**B) Optimistic Locking (낙관적 잠금)**
```sql
UPDATE posts
   SET content = $1, version = version + 1
 WHERE id = $2 AND version = $3;  -- ← 버전 일치할 때만
-- 0행 영향이면 충돌 → 사용자에게 재시도 요청
```

**C) Idempotency (멱등성)**
```ts
// ❌ 결제 더블 클릭 → 두 번 결제
function pay(amount) {
  return api.post('/pay', { amount });
}

// ✅ 멱등 키 (idempotency key)
function pay(amount, idempotencyKey) {
  return api.post('/pay', { amount }, {
    headers: { 'Idempotency-Key': idempotencyKey }
  });
}
```

**D) 자기 질문 체크리스트**
- [ ] 두 사용자가 **정확히 동시에** 같은 자원 건드리면?
- [ ] 결제처럼 **여러 단계 중 중간에 실패**하면 앞 단계 롤백되나?
- [ ] 같은 요청이 **두 번 도착**하면 한 번만 처리되나? (멱등성)
- [ ] 같은 사용자가 **여러 탭에서 동시 수정**하면?
- [ ] **백엔드와 클라이언트 시계가 다르면** 영향 있나?

**우리 프로젝트 적용**:
- 크레딧 차감: `deduct_credits()` RPC (이미 적용 ✅)
- 결제: idempotency_key + payments 테이블 unique constraint
- 발행: 동일 콘텐츠 중복 발행 방지 (postId hash)

---

### 6️⃣ 하위 호환성·마이그레이션 파급 🆕

**문제**: AI는 **눈앞의 파일만** 보고 시스템 전체 파급은 못 봄.
- DB 컬럼명 변경 → **그걸 쓰던 다른 화면 다 깨짐**
- API 응답 형식 변경 → **모바일 앱 강제 업데이트 필요**
- 함수 시그니처 변경 → **호출하던 30곳 다 수정 필요**

**Claude 행동 규칙**:

**A) 변경 전 영향 분석**
- DB 컬럼 변경 → `grep -rn "column_name"` 으로 모든 참조 검색
- API 응답 변경 → 호출하는 모든 클라이언트 확인
- 함수 시그니처 변경 → `grep -rn "functionName("` 으로 호출처 검색
- **영향 받는 파일 리스트를 마스터에게 사전 보고**

**B) 하위 호환 유지 패턴**
```ts
// ❌ 갑작스런 변경
interface User { name: string; }
// → interface User { fullName: string; }  // 모든 클라이언트 깨짐

// ✅ 점진적 마이그레이션
interface User {
  name: string;       // @deprecated - fullName 사용
  fullName: string;   // 신규
}
// → 모든 클라이언트 업데이트 후 → name 제거
```

**C) DB 마이그레이션 안전 패턴**
1. **컬럼 추가** (NULL 허용): 안전
2. **컬럼 백필** (기존 데이터 채우기)
3. **신규 코드 배포** (둘 다 읽기)
4. **NOT NULL 제약** 추가
5. (필요 시) 옛 컬럼 제거 (다음 릴리즈)

**D) API 버전 관리**
```
/api/v1/users   ← 기존 (유지)
/api/v2/users   ← 신규 (변경된 응답)
```
모바일 앱이 v1을 1년간 쓴다면 1년간 둘 다 유지.

**E) 자기 질문 체크리스트**
- [ ] 이 변경이 영향 주는 다른 파일은? (`grep` 결과)
- [ ] 기존 운영 데이터는 안 깨지나?
- [ ] 모바일 앱/타사 통합이 있으면 강제 업데이트 필요한가?
- [ ] 점진적 마이그레이션 가능한가?
- [ ] 롤백 가능한가? (DB 변경은 특히 위험)

**우리 프로젝트 특화**:
- DB 스키마 변경 시 → `docs/billing-schema.sql`에 마이그레이션 명령 추가
- API 응답 변경 시 → 모든 페이지의 fetch 호출 확인
- localStorage 구조 변경 시 → 마이그레이션 함수 (이미 `migrateOldSettings` 패턴 사용 ✅)

---

### 7️⃣ 의존성 보안 취약점·라이선스 🟡 (강화)

**문제**: 새 라이브러리에 **알려진 보안 구멍** 또는 **상업적 사용 불가 라이선스** (GPL).
- `npm audit` 안 돌리면 취약점 모름
- GPL 라이선스 라이브러리 → 우리 제품도 GPL 강제됨 (오픈소스화 의무)

**Claude 행동 규칙**:

**A) 신규 의존성 추가 전 4가지 확인**
1. **보안 취약점**: `npm audit` 결과
2. **라이선스**: MIT/Apache 2.0/BSD 안전, GPL/AGPL 위험
3. **마지막 업데이트**: 1년 이상 안 됨 → 의심
4. **다운로드 수**: 주당 1000회 미만 → 의심

**B) 안전한 라이선스 (상업 OK)**
- ✅ MIT
- ✅ Apache 2.0
- ✅ BSD (2-Clause, 3-Clause)
- ✅ ISC
- ⚠ MPL 2.0 (제한 있음)

**C) 위험한 라이선스 (상업 제한)**
- ❌ GPL v2/v3 (코드 공개 의무)
- ❌ AGPL (서버 코드도 공개 의무)
- ⚠ LGPL (정적 링크 시 제한)
- ⚠ Creative Commons NC (비상업)

**D) 검증 명령**
```bash
# 보안 취약점 점검
npm audit
npm audit fix  # 자동 수정 (호환되는 경우)

# 라이선스 확인
npx license-checker --summary
npx license-checker --onlyAllow "MIT;Apache-2.0;BSD-2-Clause;BSD-3-Clause;ISC"

# 의존성 트리 확인
npm ls <package-name>
```

**E) 정기 점검**
- 매월 `npm audit` 자동 실행 (GitHub Actions)
- Dependabot으로 보안 패치 자동 PR
- 주요 의존성은 마이너 버전까지 lock

**중복**: 품질 #7과 통합 — **취약점/라이선스 추가**

---

### 📊 시스템 사고 7수칙 체크리스트

```
□ 1. AI 환각 — 처음 쓰는 메서드/API 실재 확인
□ 2. 보안 — 입력 검증 + 인증 + 인가 + 인젝션 방지
□ 3. 성능 — N+1 쿼리, 리렌더, 메모리 누수
□ 4. 아키텍처 — 책임 분리 (한 곳 수정으로 충분?)
□ 5. 동시성 — race condition, 트랜잭션, 멱등성
□ 6. 하위 호환 — 영향 받는 다른 곳 분석
□ 7. 의존성 — npm audit + 라이선스 확인
```

## 📊 관찰성 (Observability) 7수칙 (D1~D7) — 운영 가시성

> 주니어는 "동작하면 끝", 시니어는 "**운영에서 무슨 일이 일어나는지 안다**".

### D1. 구조화된 로그 (Structured Logging)
- `console.log('error happened')` ❌ → 검색·필터링 불가
- ✅ JSON 형태 + 컨텍스트: `logger.error({ event: 'payment_failed', userId, amount, err })`
- 로그 레벨: `debug / info / warn / error / fatal`
- **민감 정보 마스킹** (카드번호, 토큰, 이메일 일부)
- 우리 프로젝트: Edge Functions에서 `console.error(JSON.stringify({...}))`

### D2. 메트릭 3종 (Latency / Error Rate / Traffic — RED Method)
- **R**ate: 초당 요청 수
- **E**rrors: 실패율 (%)
- **D**uration: p50 / p95 / p99 응답 시간
- 평균만 보지 말 것 (long tail 숨김) → **p99 필수**
- 우리 프로젝트 대상: AI 호출, 결제, 발행 API

### D3. 분산 추적 (Distributed Tracing)
- `request_id` 또는 `trace_id` 생성 → 모든 다운스트림 호출에 전파
- 클라이언트 → Edge Function → Supabase → 외부 API 흐름 추적
- 예시:
  ```ts
  const traceId = crypto.randomUUID();
  fetch(url, { headers: { 'X-Trace-Id': traceId } });
  // 로그에 traceId 항상 포함
  ```
- 사고 시 "이 요청이 어디서 막혔지?" 즉답 가능

### D4. 알림 설계 (Alert as Code)
- 알림 조건: **사용자 영향 있을 때만** (CPU 80%는 무의미)
- ❌ "에러 1건 발생" → false alarm 폭주
- ✅ "5분간 에러율 1% 초과" 또는 "p99 > 5초가 10분 지속"
- 알림 피로 (alert fatigue) 방지 — 매일 울리면 무시함
- **Runbook 링크** 포함 (D5 참고)

### D5. SLI / SLO (Service Level Indicator / Objective)
- **SLI**: 측정 가능한 지표 (가용성, 응답 시간, 정확도)
- **SLO**: 목표값 (예: 99.9% 가용성)
- **Error Budget** = 100% − SLO (99.9% SLO → 월 43분 다운 허용)
- 우리 SNS Platform SLO 후보:
  - 발행 성공률: 99% (월 7시간 실패 허용)
  - AI 생성 p95: 30초 이내
  - 결제 가용성: 99.95%

### D6. 대시보드 설계 원칙
- 한 화면 = 한 질문 (혼합 X)
- 위에서 아래로: **사용자 영향 → 시스템 건강 → 인프라 세부**
- 색상: 빨강(에러)/노랑(경고)/녹색(정상) 일관
- 시간 범위: 1h / 24h / 7d / 30d 토글
- 우리 프로젝트: 관리자 콘솔에 매출/AI사용량/에러율 대시보드

### D7. 디버그 정보 수집 (Diagnostics)
- 사용자가 "안 돼요" 신고 시 5분 안에 진단 가능해야 함
- 필수 컨텍스트:
  - `user_id` + `request_id`
  - 브라우저/OS
  - 발생 시각 (ms 단위)
  - 입력 파라미터 (민감 정보 마스킹)
  - 스택 트레이스 또는 API 응답
- "재현 안 돼요" 답변 금지 — 로그가 부족한 것

---

## 🎯 의사결정 / ADR 7수칙 (E1~E7) — 왜 이렇게 했는가

> 주니어는 "어떻게 짤까?", 시니어는 "**왜 이걸 선택하는가**".

### E1. ADR (Architecture Decision Records) 작성
- 중요한 기술 선택은 **반드시 문서화**
- 파일: `docs/adr/ADR-NNN-제목.md`
- 템플릿:
  ```
  # ADR-001: 결제 PG로 토스 + Stripe 이중 채택

  ## 상태
  승인됨 (2026-05-30)

  ## 컨텍스트
  국내 + 해외 고객 동시 서비스 필요

  ## 결정
  국내: 토스페이먼츠 / 해외: Stripe

  ## 대안
  - 토스만: 해외 카드 결제 약함
  - Stripe만: 한국 카드/카카오페이 제한
  - 자체 결제: PCI-DSS 부담

  ## 결과 (파급)
  - 운영 복잡도 ↑ (PG 2개 관리)
  - 회계 리포팅 분리 필요
  - 환율 처리 (KRW vs USD)
  ```

### E2. 트레이드오프 명시 (Pros / Cons / Risks)
- 모든 선택에는 **공짜가 없음**
- 장점만 적지 말 것 — **단점/위험도 명시**
- 예시:
  ```
  ✅ 장점: 빠른 개발 (1주)
  ❌ 단점: 종속성 ↑ (벤더 락인)
  ⚠️ 위험: 가격 인상 시 대안 없음
  ```

### E3. 가역적 vs 비가역적 결정 구분 (Type 1 vs Type 2)
- **Type 1 (비가역)**: 신중히 결정 (DB 스키마, 인증 시스템, 결제 PG)
- **Type 2 (가역)**: 빠르게 결정 후 학습 (UI 색상, 카피, 작은 기능)
- 70% 확신이면 Type 2는 진행 (Jeff Bezos)
- **Type 1을 Type 2처럼 처리하면 사고**

### E4. "선택하지 않은 옵션" 기록
- ADR에 거절된 대안을 **이유와 함께** 기록
- 6개월 뒤 "왜 X 안 썼지?" → ADR에 답 있음
- 새 팀원 온보딩에 가장 가치 있는 자료

### E5. 가정 검증 (Assumption Testing)
- "사용자가 이렇게 쓸 것이다" 가정은 **반드시 검증**
- 방법:
  - 1주일 A/B 테스트
  - 사용자 인터뷰 5명
  - 분석 데이터 확인
- 가정만으로 큰 결정 ❌

### E6. "지금 결정 vs 나중 결정" 판단 (Last Responsible Moment)
- **지금 결정해야 할 것**: 후행 작업 막는 것
- **나중 결정**: 정보 더 모이면 좋은 것
- 너무 빠른 결정 = 정보 부족 / 너무 늦은 결정 = 진행 정체
- "이 결정을 지금 안 하면 진행 막히나?" 자문

### E7. RFC (Request for Comments) 프로세스
- 큰 변경은 **사전 RFC 작성** → 팀 리뷰 후 결정
- 1인 결정 → 사후 비난 vs RFC 후 합의 → 책임 공유
- 우리 프로젝트: 마스터-Claude 협업이지만, **마스터에게 사전 옵션 제시 + 트레이드오프 명시** 의무

---

## 🚨 장애 대응 (Incident Response) 7수칙 (F1~F7)

> 주니어는 "복구"만, 시니어는 "**학습**까지".

### F1. Incident Severity 등급 (P0~P4)
- **P0 (Critical)**: 전체 서비스 다운, 데이터 손실 — 5분 내 대응
- **P1 (High)**: 주요 기능 장애, 일부 사용자 영향 — 30분 내 대응
- **P2 (Medium)**: 부분 기능 장애, 우회 가능 — 4시간 내 대응
- **P3 (Low)**: 사소한 버그, 사용자 영향 적음 — 다음 영업일
- **P4 (Trivial)**: UI 오타, 코스메틱 — 백로그
- 우리 SNS Platform 예시:
  - P0: 발행 100% 실패, 결제 차단
  - P1: 특정 SNS 채널 발행 불가
  - P2: 분석 리포트 지연
  - P3: UI 깨짐 (모바일 일부)

### F2. 5분 룰 (Time-Critical Response)
- **0~5분**: 알림 수신 → 인지
- **5~30분**: 임시 완화 (mitigation) — **근본 해결 아님**
- **30분~4시간**: 근본 원인 분석 (RCA - Root Cause Analysis)
- **24시간 내**: Postmortem 초안
- **1주일 내**: Action Items 시작
- 완화 우선, 분석 나중 (사용자 우선)

### F3. Blameless Postmortem
- 사람 탓 ❌ → 시스템 탓 ✅
- "왜 ${사람}이 실수했나?" ❌ → "왜 ${사람}이 실수할 수 있는 시스템이었나?" ✅
- 솔직한 보고 환경 → 다음 사고 예방
- 비난 문화 = 사고 숨김 = 더 큰 사고

### F4. 5 Whys (근본 원인까지)
- 표면 원인에서 멈추지 말 것
- 예시:
  ```
  문제: 결제 100% 실패
  Why 1: PG 응답 타임아웃
  Why 2: PG 서버 다운
  Why 3: 우리가 하나의 PG만 사용
  Why 4: 이중화 ADR 결정 미흡
  Why 5: 단일 장애점 (SPOF) 감사 부재
  → 진짜 해결: SPOF 정기 감사 프로세스
  ```

### F5. Postmortem 문서 양식
- 파일: `docs/postmortems/YYYY-MM-DD-제목.md`
- 필수 항목:
  - **요약 (TL;DR)**: 1-2줄
  - **영향 (Impact)**: 사용자 수, 시간, 매출 손실
  - **타임라인 (Timeline)**: 분 단위
  - **근본 원인 (Root Cause)**: 5 Whys 결과
  - **잘된 점 (What went well)**
  - **개선점 (What didn't)**
  - **운 좋았던 점 (Where got lucky)** — 다음엔 운 없을 수도
  - **Action Items**: 담당자 + 마감일

### F6. Runbook 작성 (반복 장애 대응)
- 같은 장애 두 번 → Runbook 작성 의무
- 새벽 3시 호출 받은 신입이 따라 할 수 있게
- 위치: `docs/runbooks/장애유형.md`
- 예시:
  ```
  # AI 호출 실패 Runbook

  ## 증상
  - 사용자: "이미지 생성 실패"
  - 알림: ai_generation_error > 5%

  ## 1단계: 임시 완화 (5분)
  1. Replicate 상태: https://status.replicate.com
  2. Edge Function 환경변수 확인: REPLICATE_API_KEY
  3. 잔액 확인: replicate.com/account/billing

  ## 2단계: 원인 분석
  ...
  ```

### F7. Chaos Engineering (의도적 장애)
- 운영 시작 후: 의도적으로 장애 주입해서 시스템 회복력 검증
- 예시: Netflix Chaos Monkey (랜덤 서버 종료)
- 우리 프로젝트 (작게 시작):
  - 월 1회 Replicate API 키 잠깐 무효화 → 환불 로직 작동 확인
  - Edge Function 콜드 스타트 일부러 발생
- 위험 회피보다 위험 발견이 안전

---

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

## 🏚 레거시 / 기술부채 (Legacy & Tech Debt) 7수칙 (H1~H7)

> 주니어는 "**다 갈아엎자**", 시니어는 "**점진적 개선**".

### H1. 기술부채 시각화 (Make Debt Visible)
- 머릿속에만 있으면 우선순위 못 매김
- 도구:
  - `TODO(#123): ...` (이슈 번호 연결)
  - 부채 대시보드 (코드 복잡도, 테스트 커버리지, 의존성 outdated)
  - `docs/tech-debt.md` 백로그
- 측정 가능한 메트릭화:
  - 함수당 평균 줄 수
  - 순환 복잡도 (Cyclomatic Complexity)
  - 중복 코드 %

### H2. ROI 평가 (Refactor vs Stay)
- 리팩터는 **공짜가 아님** — 비용 vs 효과
- 매트릭스:
  ```
                자주 수정      가끔 수정
  복잡          🔥 즉시 리팩터  ⏳ 나중에
  단순          ✅ 두면 됨      💀 무시 OK
  ```
- "어차피 안 건드릴 코드"는 못생겨도 OK

### H3. Strangler Fig 패턴 (점진 교체)
- 큰 시스템 통째 재작성 ❌ (대부분 실패)
- ✅ 새 시스템 만들고, 옛 시스템과 병행 → 점진 이전 → 옛 시스템 제거
- 우리 사례:
  - ES5 HTML/JS → 점진적으로 React + TS 마이그레이션
  - 새 기능부터 React로, 기존은 그대로
  - 완전 이전 후 기존 제거

### H4. Branch by Abstraction (안전한 리팩터)
1. 기존 구현 위에 **추상화 계층** 추가
2. 새 구현 만들기 (기존과 병행)
3. 호출자를 추상화 통해 전환
4. 기존 구현 제거
- 중간 상태 항상 동작 → 안전한 리팩터

### H5. 보이스카웃 룰 (Boy Scout Rule)
- "온 것보다 깨끗하게 떠나라"
- 한 번에 다 고치지 말고, **만질 때마다 조금씩**
- 매번 함수 하나 정리 → 1년 누적 = 큰 개선
- 단, **관련 없는 리팩터 금지** (안전수칙 #3)

### H6. 리팩터 vs 재작성 판단
- **리팩터** 선택 조건:
  - 동작은 OK, 구조만 문제
  - 테스트 있음 (안전망)
  - 점진 가능
- **재작성** 선택 조건:
  - 동작 자체가 잘못됨
  - 테스트 없음 + 너무 복잡
  - 점진 불가능
- 재작성은 항상 **예상의 3배** 걸림 (예측 후 곱하기 3)

### H7. 부채 vs 의도된 단축 구분 (Tech Debt vs Quick Win)
- **부채**: 나중에 갚아야 할 빚 (이자 발생) — 의식적 선택
- **의도된 단축**: MVP, 검증용, 곧 버릴 것 — 갚지 않음
- 코드에 주석으로 구분:
  ```ts
  // 부채: 6/30까지 리팩터 (이슈 #234)
  function ugly() { ... }

  // 의도된 단축: MVP용, 사용자 검증 후 결정
  function temp() { ... }
  ```

---

## 🎯 통합 최종 체크리스트 (안전 6 + 품질 7 + 시스템 7 + 관찰성 7 + ADR 7 + 장애 7 + AI페어 7 + 레거시 7 = 55수칙)

```
🛡 안전 6수칙 (즉시 사고 방지) — 모든 작업
□ A1. 빌드/테스트 실행 확인
□ A2. 요구사항 항목 대조
□ A3. 범위 외 변경 없음
□ A4. Read 후 Edit
□ A5. 비밀키 패턴 0건
□ A6. 변경 파일 수 적정

🔍 품질 7수칙 (코드 부패 방지) — 모든 PR
□ B1. 테스트 실제 통과
□ B2. 엣지케이스 + 에러 분기
□ B3. 기존 컨벤션 준수
□ B4. catch 비어있지 않음
□ B5. any 남발 없음
□ B6. console.log/임시코드 정리
□ B7. 신규 라이브러리 사전 보고

🧠 시스템 사고 7수칙 (구조 결함 방지) — 설계 시
□ C1. AI 환각 검증
□ C2. 보안 (입력/인증/인가/인젝션)
□ C3. 성능 (N+1/리렌더/누수)
□ C4. 아키텍처 (책임 분리/SOLID)
□ C5. 동시성 (트랜잭션/멱등성)
□ C6. 하위 호환 (영향 파급)
□ C7. 의존성 (취약점/라이선스)

📊 관찰성 7수칙 — 운영 진입 시
□ D1. 구조화된 로그
□ D2. 메트릭 (RED Method)
□ D3. 분산 추적 (trace_id)
□ D4. 알림 설계 (사용자 영향)
□ D5. SLI/SLO/Error Budget
□ D6. 대시보드 (한 화면 한 질문)
□ D7. 디버그 정보 수집

🎯 의사결정 7수칙 — 큰 결정 시
□ E1. ADR 작성 (Architecture Decision Records)
□ E2. 트레이드오프 명시
□ E3. 가역적/비가역적 구분
□ E4. 선택 안 한 옵션 기록
□ E5. 가정 검증
□ E6. 결정 타이밍 (Last Responsible Moment)
□ E7. RFC 프로세스

🚨 장애 대응 7수칙 — 사고 발생 시
□ F1. Severity 등급 (P0~P4)
□ F2. 5분 룰 (완화→분석→Postmortem)
□ F3. Blameless Postmortem
□ F4. 5 Whys (근본 원인)
□ F5. Postmortem 문서 양식
□ F6. Runbook 작성
□ F7. Chaos Engineering

🤖 AI 페어 7수칙 — 모든 협업
□ G1. 명확한 프롬프트
□ G2. 단계 분해
□ G3. 검증 의무 (Verify)
□ G4. AI 한계 인식
□ G5. 메타 인지 (확신도)
□ G6. 피드백 루프
□ G7. 책임은 개발자

🏚 레거시 7수칙 — 부채 마주 시
□ H1. 기술부채 시각화
□ H2. ROI 평가 (리팩터 vs Stay)
□ H3. Strangler Fig (점진 교체)
□ H4. Branch by Abstraction
□ H5. 보이스카웃 룰
□ H6. 리팩터 vs 재작성 판단
□ H7. 부채 vs 의도된 단축 구분
```

**총 55수칙** — 시니어 차별화 영역까지 커버.

### 📚 적용 우선순위 (지금 → 6개월 후)

| 시기 | 수칙 그룹 | 우선도 |
|---|---|---|
| **즉시** | A (안전 6) + B (품질 7) + G (AI 페어 7) | ⭐⭐⭐⭐⭐ |
| **개발 중** | C (시스템 7) + E (ADR 7) | ⭐⭐⭐⭐ |
| **운영 진입 직전** | D (관찰성 7) + F (장애 대응 7) | ⭐⭐⭐⭐⭐ |
| **리팩터 시작 시** | H (레거시 7) | ⭐⭐⭐ |
| **TDD 적용 시** | TDD 20개 (별도) | ⭐⭐⭐⭐ |

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
