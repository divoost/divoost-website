# 🧪 TDD, 진짜 현업에서 어디까지 쓸까? — 실전 활용도 + 16가지 핵심 정리

> **3줄 요약**
> 1. TDD는 "테스트 먼저 → 통과 코드 → 리팩터" 사이클이다. 화려하지 않다.
> 2. 16개 규칙 중 **초급 5개는 거의 모든 한국 IT 회사가** 쓴다. 안 쓰면 PR 안 받아준다.
> 3. **중급 7개를 익히면 시니어로 평가**받는다. 특히 `loading/success/error 3분기` 테스트.

---

## 🤔 들어가며: "TDD 좋다는 건 알겠는데…"

신입 개발자 때 자주 듣던 말이 있다.

> "TDD 해야지." → "근데 어떻게요?"
> "테스트 먼저 짜야지." → "뭐부터요?"
> "엣지케이스 잡아." → "그게 뭔데요?"

말은 다 좋은데, **현업에서 진짜 어디까지 적용되는지** 알려주는 글이 의외로 없다.
그래서 정리했다. 6년차 시니어 개발자 시점으로, **솔직하게**.

---

## 📌 한눈에 보는 16가지 규칙 + 실전 사용도

| # | 규칙 | 실전 사용 | 난이도 |
|---|---|---|---|
| 1 | Red → Green → Refactor 사이클 | 🔥🔥🔥🔥 60% | 🟢 초급 |
| 2 | 1 테스트 = 1 행동 검증 | 🔥🔥🔥🔥🔥 90% | 🟢 초급 |
| 3 | 엣지케이스(null/0/빈값/에러) 필수 | 🔥🔥🔥🔥 75% | 🟡 중급 |
| 4 | `vi.mock` + `beforeEach(clearAllMocks)` | 🔥🔥🔥🔥🔥 95% | 🟡 중급 |
| 5 | `act` + `waitFor` (비동기) | 🔥🔥🔥🔥🔥 95% | 🟡 중급 |
| 6 | `vi.mocked(fn)` (as Mock 캐스팅 X) | 🔥🔥🔥 50% | 🟡 중급 |
| 7 | loading / success / **error** 3분기 모두 | 🔥🔥🔥🔥 70% | 🟡 중급 |
| 8 | 매직넘버 상수화 (`as const`) | 🔥🔥🔥🔥🔥 95% | 🟢 초급 |
| 9 | 에러 절대 삼키지 않기 (`catch {}` 금지) | 🔥🔥🔥🔥🔥 90% | 🟢 초급 |
| 10 | 함수 30줄 이하 (단일 책임) | 🔥🔥🔥 50% | 🟡 중급 |
| 11 | MSW로 통합 테스트 | 🔥🔥🔥 40% | 🔴 고급 |
| 12 | Coverage 80/70 기준선 | 🔥🔥🔥🔥 70% | 🟡 중급 |
| 13 | Snapshot은 inline + 작게 | 🔥🔥🔥 50% | 🔴 고급 |
| 14 | `vi.useFakeTimers()` | 🔥🔥🔥 50% | 🔴 고급 |
| 15 | React Query: 매 테스트 새 client | 🔥🔥🔥🔥 70% | 🔴 고급 |
| 16 | 테스트 파일 co-location | 🔥🔥🔥🔥 70% | 🟢 초급 |

---

## 🟢 1부. 초급 — "안 지키면 PR 안 받아주는" 5가지

> 📅 **목표 기간**: 입사 후 1개월
> 💪 **습득 난이도**: ★☆☆☆☆

### 1. Red → Green → Refactor

```ts
// Step 1. 실패하는 테스트부터 (Red)
it('원화는 천 단위 콤마 + 원 표기', () => {
  expect(formatPrice(13000, 'KRW')).toBe('13,000원');
});

// Step 2. 통과할 최소 코드만 (Green)
export function formatPrice(value: number, _currency: 'KRW') {
  return `${value.toLocaleString('ko-KR')}원`;
}

// Step 3. 초록불 유지하며 정리 (Refactor)
// 미리 USD/VND 분기는 추가하지 않는다.
// 다음 테스트가 요구할 때 추가.
```

> ⚠️ **흔한 실수**: 미리 너무 많이 짠다. "어차피 USD도 필요할 텐데…" 하면서.
> **TDD는 미래를 예측하지 않는다.**

### 2. 테스트 이름 = "조건 → 결과"

```ts
// ❌ 무슨 테스트인지 모름
it('works', () => { ... });
it('test1', () => { ... });

// ✅ 실패하면 즉시 무엇이 문제인지 보임
it('양수끼리 더하면 합을 반환한다', () => { ... });
it('음수가 섞이면 부호를 반영한다', () => { ... });
it('빈 배열이면 0을 반환한다', () => { ... });
```

> 💡 **꿀팁**: 한국어로 쓰는 게 가독성 훨씬 좋다. CI 리포트 볼 때 차이 난다.

### 3. 매직넘버 박멸

```ts
// ❌ 6개월 뒤 나도 못 알아봄
if (status === 2) { ... }
if (role === 9) { ... }

// ✅ 의미 있는 이름 + as const
const ORDER_STATUS = { PENDING: 1, PAID: 2, CANCELLED: 9 } as const;
type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];

if (status === ORDER_STATUS.PAID) { ... }
```

### 4. `catch {}` 금지령

```ts
// ❌ 운영에서 silent fail 1순위
try {
  await save();
} catch {}

// ❌ 너무 흔한 안티패턴
try {
  await save();
} catch (e) {
  console.log(e); // ← 운영 콘솔 어디로?
}

// ✅ 명시적 처리: 로그 + 전파 OR 사용자 표시
try {
  await save();
} catch (err) {
  logger.error('주문 저장 실패', { err, orderId });
  throw err; // 또는 setError(err.message)
}
```

> 🎯 **현업 사례**: 결제 실패가 silent로 사라져 정산 누락. 회사 전체에 빨간불 켜진 적 있음.

### 5. 테스트 파일은 소스 옆에

```
✅ Co-location (권장)
src/
  components/
    PriceBadge.tsx
    PriceBadge.test.tsx   ← 옆에
```

- 리팩터 시 같이 이동
- import 경로 짧음
- "이 컴포넌트 테스트 어디 있지?" 헤맬 일 없음

---

## 🟡 2부. 중급 — "잘하면 시니어 평가받는" 7가지

> 📅 **목표 기간**: 3개월~2년차
> 💪 **습득 난이도**: ★★★☆☆

### 6. 비동기 테스트 3분기 모두

이거 하나만 잘해도 시니어 평가 받는다. **에러 분기 누락이 한국 신입 80% 공통 문제.**

```ts
import { renderHook, waitFor } from '@testing-library/react';
import { vi, beforeEach } from 'vitest';
import { fetchOrders } from './api';

vi.mock('./api', () => ({
  fetchOrders: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks(); // ★ 매 테스트 격리
});

// 1️⃣ Loading 분기
it('초기에는 loading=true', () => {
  const { result } = renderHook(() => useUserOrders('u_1'));
  expect(result.current.loading).toBe(true);
});

// 2️⃣ Success 분기
it('API 성공 시 데이터를 채운다', async () => {
  vi.mocked(fetchOrders).mockResolvedValue([{ id: 1 }]);
  const { result } = renderHook(() => useUserOrders('u_1'));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.orders).toHaveLength(1);
});

// 3️⃣ Error 분기 ★ 가장 자주 빠뜨림
it('API 실패 시 error 상태를 채운다', async () => {
  vi.mocked(fetchOrders).mockRejectedValue(new Error('500'));
  const { result } = renderHook(() => useUserOrders('u_1'));
  await waitFor(() => expect(result.current.error).toBeTruthy());
  expect(result.current.orders).toEqual([]);
});
```

### 7. `act` 정확히 쓰기

```ts
// ✅ 동기 상태 변경
act(() => result.current.toggle());

// ✅ 비동기 액션은 await act
await act(async () => {
  await result.current.refetch();
});
```

> ⚠️ React 18 StrictMode에서 `Warning: not wrapped in act` 경고 보면
> 십중팔구 비동기 effect를 안 기다린 거다. `await waitFor(...)` 추가.

### 8. `vi.mocked()` 사용 (타입 안전)

```ts
// ❌ 타입 캐스팅, 컴파일러가 검증 못 함
(fetchOrders as Mock).mockResolvedValue([{ id: 1 }]);

// ✅ 타입 추론 그대로 + 안전
vi.mocked(fetchOrders).mockResolvedValue([{ id: 1 }]);
```

### 9. 엣지케이스 체크리스트

함수 하나에 다음 6가지 의심:

- [ ] 빈 배열 / 빈 문자열 / 0
- [ ] null / undefined
- [ ] 경계값 (min, max, off-by-one)
- [ ] 음수 / 잘못된 형식
- [ ] 비동기 실패 (네트워크, 타임아웃)
- [ ] 동시성 (중복 호출, race condition)

```ts
// 정상 케이스만 있는 테스트는 50% 짜리
it('빈 배열은 0을 반환한다', () => {
  expect(sumArray([])).toBe(0);
});

it('null이 섞이면 무시한다', () => {
  expect(sumArray([1, null, 2])).toBe(3);
});

it('Number.MAX_SAFE_INTEGER 근처에서도 정확하다', () => {
  expect(sumArray([Number.MAX_SAFE_INTEGER, 1])).toBe(Number.MAX_SAFE_INTEGER + 1);
});
```

### 10. 함수는 30줄 이하

> "30줄 룰" — 외우면 자동으로 단일 책임이 된다.

30줄 넘으면 의심:
- 변수명에서 단계가 보이나? (`step1Result`, `formatted`, …)
- if/else가 3중첩 이상인가?
- 함수 이름이 "and" 또는 "or"가 들어가나? (`fetchAndValidate`)

→ 셋 중 하나 yes면 분리.

### 11. Coverage는 80/70 기준선

```ts
// vitest.config.ts
coverage: {
  thresholds: {
    lines: 80,
    functions: 80,
    branches: 70,
    statements: 80,
  },
}
```

> 🎯 **100%는 함정**. 무의미한 테스트만 늘어난다.
> branches 70%만 넘으면 핵심 분기는 잡힌다.

### 12. `beforeEach(vi.clearAllMocks)` 강제

테스트 간 격리는 **선택이 아니라 필수**. 안 하면 flaky test 1순위.

```ts
beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers(); // 타이머 사용했다면
});
```

---

## 🔴 3부. 고급 — "주니어 가르치는" 4가지

> 📅 **목표 기간**: 시니어 / 테크 리드
> 💪 **습득 난이도**: ★★★★★

### 13. MSW (Mock Service Worker)

단위 테스트는 `vi.mock`, **통합 테스트는 MSW**.

```ts
// test/msw-server.ts
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

export const server = setupServer(
  http.get('/api/orders/:userId', () => HttpResponse.json([{ id: 1 }])),
);

// vitest.setup.ts
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

**장점**: 실제 fetch 코드 경로를 그대로 테스트. mock 누수 없음.

### 14. 타이머 mock

```ts
it('debounce는 300ms 후 한 번만 호출된다', () => {
  vi.useFakeTimers();
  const fn = vi.fn();
  const debounced = debounce(fn, 300);

  debounced();
  debounced();
  debounced();

  vi.advanceTimersByTime(300);
  expect(fn).toHaveBeenCalledTimes(1);

  vi.useRealTimers();
});
```

### 15. Inline snapshot만

```ts
// ❌ 거대 DOM snapshot — PR 리뷰 무의미
expect(container).toMatchSnapshot();

// ✅ 좁은 범위, 변경 의도가 코드에 보임
expect(formatPrice(1000, 'KRW')).toMatchInlineSnapshot(`"1,000원"`);
```

### 16. React Query wrapper

```ts
function wrapper({ children }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const { result } = renderHook(() => useOrders(), { wrapper });
```

매 테스트 **새 client** (캐시 누수 방지), `retry: false` (실패 즉시 노출).

---

## 🚨 현업에서 가장 자주 깨지는 규칙 TOP 5

| 순위 | 안 지키는 규칙 | 결과 |
|---|---|---|
| 🥇 | **error 분기 테스트 누락** | 운영 silent fail |
| 🥈 | **mock 누수** | 가끔 실패하는 flaky test |
| 🥉 | **act 경고 무시** | "어 이상하지만 통과하니까…" |
| 4 | **구현 디테일 검증** | 리팩터 시 줄줄이 깨짐 |
| 5 | **Coverage 100% 강요** | 무의미한 테스트 양산 |

특히 1번. **에러 케이스를 안 짜는 건 거의 모든 신입의 공통 문제**다.
나도 그랬다. "API 잘 되니까 됐겠지"라는 안일함이 결국 운영 사고로 돌아온다.

---

## 💼 한국 회사 현실 체크

### ✅ 거의 모든 회사가 쓰는 것 (90%+)
- Jest/Vitest 같은 테스트 프레임워크
- `beforeEach` 격리
- 매직넘버 상수화
- 에러 처리 (try/catch + throw)

### 🔶 좋은 회사가 쓰는 것 (50~70%)
- TDD 사이클 엄격 적용
- 3분기 (loading/success/error) 테스트
- act/waitFor 정확한 사용
- Coverage 임계값

### 🔷 최고 수준 회사가 쓰는 것 (~30%)
- MSW 통합 테스트
- Mutation Testing
- Visual Regression Testing
- Inline snapshot 가이드

> 💡 **체감상**: 토스/카카오/라인/네이버급 수준이 위의 "최고 수준"이다.
> 일반 IT 중견은 "좋은 회사" 수준이 목표.

---

## 🎯 결론: 16개 다 외우지 마라

> **"1단계 5개부터 매일 쓰면 자연스럽게 늘어난다."**

| 단계 | 목표 | 기간 |
|---|---|---|
| 🟢 **초급** | 5개를 본능적으로 — "안 쓰면 불편한" 상태 | 1개월 |
| 🟡 **중급** | 12개를 의식적으로 — PR에서 자체 검토 | 3~6개월 |
| 🔴 **고급** | 16개 + 팀 가이드 작성 — 컨벤션 주도 | 1~2년 |

---

## ✨ 마무리: TDD가 진짜로 좋아지는 순간

처음엔 다들 "테스트 짜는 시간이 아깝다"고 한다.
나도 그랬다.

그런데 **6개월 뒤에 깨닫는다**.

- 리팩터하기 무섭지 않다 → 테스트가 안전망
- "이 함수 뭐였더라?" → 테스트 보면 됨
- 코드 리뷰 시간 단축 → 리뷰어가 테스트만 봐도 의도 파악
- 새벽 3시 호출 사라짐 → 운영 silent fail 격감

**TDD는 미래의 나를 위한 보험**이다.

지금 시작해도 늦지 않다. **오늘부터 1단계 5개만**.

---

### 📚 참고 자료
- Kent Beck, *Test-Driven Development: By Example*
- Kent C. Dodds, [Testing JavaScript](https://testingjavascript.com)
- Vitest 공식 문서: https://vitest.dev
- Testing Library 공식: https://testing-library.com
- MSW: https://mswjs.io

---

### 💬 댓글 환영

여러분 회사에서는 어디까지 적용하고 계신가요? 1~16 중 몇 개나?
"우리는 5개도 안 쓰는데…" 😢 / "16개 다 적용 중!" 🚀 솔직하게 공유해주세요.

---

**Tags**: `#TDD` `#테스트` `#Vitest` `#React` `#TypeScript` `#개발문화` `#FrontEnd` `#신입개발자` `#코드리뷰` `#JavaScript`
