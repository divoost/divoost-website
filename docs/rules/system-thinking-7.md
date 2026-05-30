# 🧠 시스템 사고 7수칙 (C1~C7) — 구조 결함 방지

> 안전 6수칙은 "당장 사고", 품질 7수칙은 "코드 부패",
> **시스템 사고 7수칙은 "운영 후 6개월 뒤 터지는 문제"**.
> 큰 설계 변경, 새 모듈 작성, 아키텍처 결정 시 반드시 참고.

**언제 읽어야 하는가**:
- 새 모듈/서비스 설계 시
- DB 스키마 변경 시
- API 추가/변경 시
- 외부 의존성 추가 시
- 성능 이슈 발생 시

---

## C1. AI가 지어낸 "그럴듯한 거짓말" 잡아내기 ⚠️ 가장 중요

**문제**: AI(Claude 포함)는 모르는 걸 모른다고 안 하고, **존재하지 않는 함수·옵션·API를 그럴듯하게 만들어냄**.

- `array.findLastIndexWhere()` 같은 가짜 메서드
- 라이브러리에 없는 옵션 (`{ deepClone: true }`)
- 잘못된 함수 시그니처 (인자 순서/타입)
- API 엔드포인트 (`/api/v2/users/:id/preferences` 가 실재하지 않음)

코드는 멀쩡해 보이는데 **실행하면 `is not a function` 또는 404**.

### Claude 행동 규칙

- 처음 쓰는 메서드·옵션·API는 **불확실하면 "확인 필요" 명시**
- 가능하면 **실제 코드베이스/패키지에서 확인** (`grep`, `package.json` 조회)
- 외부 API는 **버전 명시** + 공식 문서 링크 제공
- "이거 진짜 있어?" 질문 받으면 **솔직하게 재확인** (체면 차리지 않음)
- 응답 마지막에 **"검증되지 않은 항목"** 별도 표시

### 자기 검증 패턴
```
✓ 검증됨 (실행/문서 확인): fetch(), Array.prototype.find()
⚠ 추정 (검증 필요): array.findLastIndexWhere() — 실재 여부 확인 권장
❌ 사용 금지: 존재 확실치 않음
```

### 자동 감지
```bash
grep -rn "\.someUnusualMethod(" src/
node -e "console.log(typeof [].findLastIndexWhere)"  # undefined면 가짜
```

### 행동 원칙
> "**모르는 건 솔직하게 모른다고 한다.**"
- "이거 진짜 있어?" 질문 → 즉시 재확인
- 추측 기반 코드는 **반드시 주석 표시** (`// API 시그니처 확인 필요`)

---

## C2. 보안 — 입력 검증·인증·인가·인젝션

**문제**: AI는 "동작하는 코드"에 집중하다 **보안을 자주 빠뜨림**:
- 사용자 입력 → 그대로 SQL 쿼리 → **SQL Injection**
- 로그인만 확인, "이 사람이 이 데이터 볼 권한 있나?" 빠뜨림 → **IDOR**
- 사용자 입력 → 그대로 HTML 렌더 → **XSS**
- 파일 업로드 검증 없음 → **임의 파일 업로드**
- CORS 와일드카드 (`*`) → 외부 사이트가 우리 API 호출

### A) 입력 검증 (Input Validation)
- 모든 사용자 입력은 **타입 + 형식 + 범위** 검증
- 화이트리스트 우선 (`['admin', 'user']` 중 하나만)
- DB 쿼리는 **반드시 prepared statement** (RPC, parameterized query)
- HTML 렌더링 시 **반드시 escape** (`escapeHtml()`)

### B) 인증 vs 인가 구분
- **인증 (Authentication)**: "누구냐?" — Supabase JWT 검증
- **인가 (Authorization)**: "이걸 할 수 있냐?" — 본인 데이터/role 검증
- 둘 다 매번 확인 — 인증만 하고 인가 빠뜨리는 게 IDOR

### C) RLS 정책 필수 (우리 프로젝트)
```sql
-- ✅ 본인만 본인 데이터 조회
CREATE POLICY "user_view_own" ON public.orders FOR SELECT
USING (auth.uid() = user_id);

-- ❌ RLS 없으면 인증된 누구나 다른 사람 데이터 조회 가능
```

### D) 흔한 취약점 체크
- [ ] SQL Injection: prepared statement?
- [ ] XSS: HTML escape?
- [ ] CSRF: SameSite=Strict 또는 토큰 검증?
- [ ] IDOR: 본인 데이터인지 확인?
- [ ] Open Redirect: 리디렉션 URL 화이트리스트?
- [ ] File Upload: 확장자/MIME/크기 검증?
- [ ] CORS: 와일드카드 금지, 특정 origin만

### 자동 감지
```bash
# CORS 와일드카드
grep -rn "Access-Control-Allow-Origin.*\*" --include="*.ts" --include="*.js"
# SQL string concat (위험)
grep -rn "query.*+.*\${" --include="*.ts" --include="*.js"
# 본인 검증 없는 fetch
grep -rn "supabase.from.*select" --include="*.ts" | grep -v "auth.uid()"
```

---

## C3. 성능 — N+1 쿼리·리렌더·메모리 누수

**문제**: AI는 데이터 양을 고려 안 하고 짬:
- **N+1 쿼리**: 주문 100개 + 각 주문 상세 = 101번 쿼리
- **불필요한 리렌더**: 부모 state 바뀔 때마다 자식 전체 리렌더
- **메모리 누수**: `useEffect` cleanup 안 함
- **번들 크기**: 큰 lib 통째 import (tree-shaking 안 됨)

### A) N+1 쿼리 방지
```ts
// ❌ N+1
const orders = await db.orders.findAll();
for (const order of orders) {
  order.items = await db.items.findByOrderId(order.id);  // N번 더!
}

// ✅ Supabase 예시 (한 번 쿼리)
const { data } = await supabase
  .from('orders')
  .select('*, items(*)');
```

### B) React 리렌더 최소화
- `React.memo` / `useMemo` / `useCallback` 적절히 사용
- key prop 정확히 (배열 index ❌)
- Context 분리 (값/액션 분리)

### C) 메모리 누수 방지
```ts
useEffect(() => {
  const handler = () => { /* ... */ };
  window.addEventListener('resize', handler);
  return () => window.removeEventListener('resize', handler);  // ★ cleanup 필수
}, []);
```

### D) 자기 질문 체크리스트
- [ ] 데이터 10만 건이면 어떻게 되나?
- [ ] 동시 사용자 1000명이면?
- [ ] 1년 운영하면 DB 크기 얼마?
- [ ] 모바일 3G 환경에서 페이지 로딩 시간?

### 우리 프로젝트 특화
- Supabase는 `.select('*, related(*)')`로 JOIN
- AI 호출은 비싸므로 **결과 캐싱** 필수 (Storage 영구 저장)
- localStorage 크기 5MB 한도 — 큰 데이터는 IndexedDB

### 자동 감지
```bash
# 반복문 안의 await (N+1 의심)
grep -rn "for.*await\|forEach.*await" --include="*.ts" --include="*.js"
```

---

## C4. 아키텍처 — 책임 분리·결합도·추상화 수준

**문제**: 두 극단 모두 위험:
- **책임 과다**: 한 함수가 조회 + 계산 + 화면 그리기 (God function)
- **과도한 추상화**: 단순한 걸 5겹 wrapper로 싸서 읽기 어려움

둘 다 **요구사항 변경 시 지옥**.

### A) SOLID 원칙 (적당히)
- **S**ingle Responsibility: 한 함수/클래스 = 한 가지 일
- **O**pen/Closed: 확장 가능, 수정 불가능
- **L**iskov Substitution: 자식이 부모 대체 가능
- **I**nterface Segregation: 큰 인터페이스보다 작은 여러 개
- **D**ependency Inversion: 추상화에 의존

### B) 책임 분리 (Layer)
```
[표현 계층] UI 컴포넌트, 페이지
   ↓
[비즈니스 로직] 도메인 함수, 서비스
   ↓
[데이터 접근] DB 쿼리, API 호출
```

각 층은 **자기 일만** 함. 컴포넌트가 직접 DB 쿼리 ❌

### C) 결합도 vs 응집도
- **낮은 결합도**: 모듈 간 의존성 최소
- **높은 응집도**: 한 모듈 안 코드들은 강하게 관련

### D) 자기 질문
- [ ] 요구사항 한 가지 바뀌면 **한 군데만** 고치면 되나?
- [ ] 함수 이름이 "and" 또는 "or" 들어가나? (= 책임 과다)
- [ ] 인자가 5개 이상인가?
- [ ] 같은 코드가 3곳 이상 반복인가? (= 추상화 필요)
- [ ] 추상화 레이어가 정말 필요한가? (= 과도한 추상화 의심)

### 적정 함수 길이
- 컴포넌트: 100~200줄
- 함수: 30줄 (TDD #12)
- 클래스: 200줄 미만

---

## C5. 동시성·경쟁 상태·트랜잭션 경계

**문제**: 운영에서 가장 무서운 버그.
- **재고 1개에 두 명 동시 주문 → 둘 다 성공** (Race Condition)
- **결제 됐는데 주문 저장 실패 → 돈만 빠짐** (Transaction 누락)
- **더블 클릭 → 중복 결제**
- **여러 탭 동시 수정 → 마지막 글만 살아남음** (Last Write Wins)

### A) 원자적 트랜잭션 (DB 수준)
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
```

### B) Optimistic Locking
```sql
UPDATE posts
   SET content = $1, version = version + 1
 WHERE id = $2 AND version = $3;  -- ← 버전 일치할 때만
-- 0행 영향이면 충돌 → 사용자에게 재시도 요청
```

### C) Idempotency (멱등성)
```ts
// ✅ 멱등 키 (idempotency key)
function pay(amount, idempotencyKey) {
  return api.post('/pay', { amount }, {
    headers: { 'Idempotency-Key': idempotencyKey }
  });
}
```

### D) 자기 질문 체크리스트
- [ ] 두 사용자가 **정확히 동시에** 같은 자원 건드리면?
- [ ] 결제처럼 **여러 단계 중 중간에 실패**하면 앞 단계 롤백되나?
- [ ] 같은 요청이 **두 번 도착**하면 한 번만 처리되나?
- [ ] 같은 사용자가 **여러 탭에서 동시 수정**하면?

### 우리 프로젝트 적용
- 크레딧 차감: `deduct_credits()` RPC ✅
- 결제: idempotency_key + payments 테이블 unique constraint
- 발행: 동일 콘텐츠 중복 발행 방지 (postId hash)

---

## C6. 하위 호환성·마이그레이션 파급

**문제**: AI는 **눈앞의 파일만** 보고 시스템 전체 파급은 못 봄.
- DB 컬럼명 변경 → **그걸 쓰던 다른 화면 다 깨짐**
- API 응답 형식 변경 → **모바일 앱 강제 업데이트 필요**
- 함수 시그니처 변경 → **호출하던 30곳 다 수정 필요**

### A) 변경 전 영향 분석
- DB 컬럼 변경 → `grep -rn "column_name"` 으로 모든 참조 검색
- API 응답 변경 → 호출하는 모든 클라이언트 확인
- 함수 시그니처 변경 → `grep -rn "functionName("`
- **영향 받는 파일 리스트를 마스터에게 사전 보고**

### B) 하위 호환 유지 패턴
```ts
// ✅ 점진적 마이그레이션
interface User {
  name: string;       // @deprecated - fullName 사용
  fullName: string;   // 신규
}
// → 모든 클라이언트 업데이트 후 → name 제거
```

### C) DB 마이그레이션 안전 패턴 (5단계)
1. **컬럼 추가** (NULL 허용): 안전
2. **컬럼 백필** (기존 데이터 채우기)
3. **신규 코드 배포** (둘 다 읽기)
4. **NOT NULL 제약** 추가
5. 옛 컬럼 제거 (다음 릴리즈)

### D) API 버전 관리
```
/api/v1/users   ← 기존 (유지)
/api/v2/users   ← 신규 (변경된 응답)
```
모바일 앱이 v1을 1년간 쓴다면 1년간 둘 다 유지.

### E) 자기 질문 체크리스트
- [ ] 영향 주는 다른 파일은? (`grep` 결과)
- [ ] 기존 운영 데이터는 안 깨지나?
- [ ] 모바일 앱/타사 통합이 있으면 강제 업데이트 필요?
- [ ] 점진적 마이그레이션 가능?
- [ ] 롤백 가능?

### 우리 프로젝트 특화
- DB 스키마 변경 → `docs/billing-schema.sql`에 마이그레이션 명령 추가
- API 응답 변경 → 모든 페이지의 fetch 호출 확인
- localStorage 구조 변경 → 마이그레이션 함수 (`migrateOldSettings` 패턴 ✅)

---

## C7. 의존성 보안 취약점·라이선스

**문제**: 새 라이브러리에 **알려진 보안 구멍** 또는 **상업적 사용 불가 라이선스** (GPL).

### A) 신규 의존성 추가 전 4가지 확인
1. **보안 취약점**: `npm audit` 결과
2. **라이선스**: MIT/Apache 2.0/BSD 안전, GPL/AGPL 위험
3. **마지막 업데이트**: 1년 이상 안 됨 → 의심
4. **다운로드 수**: 주당 1000회 미만 → 의심

### B) 안전한 라이선스 (상업 OK)
- ✅ MIT / Apache 2.0 / BSD (2/3-Clause) / ISC
- ⚠ MPL 2.0 (제한 있음)

### C) 위험한 라이선스 (상업 제한)
- ❌ GPL v2/v3 (코드 공개 의무)
- ❌ AGPL (서버 코드도 공개 의무)
- ⚠ LGPL (정적 링크 시 제한)
- ⚠ Creative Commons NC (비상업)

### D) 검증 명령
```bash
# 보안 취약점 점검
npm audit
npm audit fix

# 라이선스 확인
npx license-checker --summary
npx license-checker --onlyAllow "MIT;Apache-2.0;BSD-2-Clause;BSD-3-Clause;ISC"
```

### E) 정기 점검
- 매월 `npm audit` 자동 실행 (GitHub Actions)
- Dependabot으로 보안 패치 자동 PR
- 주요 의존성은 마이너 버전까지 lock

---

## 📊 C 그룹 체크리스트

```
□ C1. AI 환각 — 메서드/API 실재 검증
□ C2. 보안 — 입력검증/인증/인가/인젝션
□ C3. 성능 — N+1/리렌더/누수
□ C4. 아키텍처 — 책임 분리/SOLID
□ C5. 동시성 — 트랜잭션/멱등성
□ C6. 하위 호환 — 영향 파급
□ C7. 의존성 — 취약점/라이선스
```
