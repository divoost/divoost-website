# 개발 지침 (TDD 실전판)

## 스택 전제

- TypeScript / React / Vitest / @testing-library/react
- 테스트 실행
  - **1회 실행 (CI)**: `npm run test` → 내부 `vitest run`
  - **Watch (개발 중)**: `npm run test:watch` → 내부 `vitest`
- 커밋 전 통과: `npm run typecheck && npm run lint && npm run test`

```json
// package.json (참고)
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --max-warnings 0"
  }
}
```

---

## 1. TDD 작업 흐름 (한 사이클씩)

기능 요청이 오면 **곧장 구현 코드부터 쓰지 말고** 아래 순서로 진행한다.

### Step 1 — 실패 테스트 먼저 (Red)

```ts
// formatPrice.test.ts
import { describe, it, expect } from 'vitest';
import { formatPrice } from './formatPrice';

describe('formatPrice', () => {
  it('원화는 천 단위 콤마 + 원 표기', () => {
    expect(formatPrice(13000, 'KRW')).toBe('13,000원');
  });
});
```

→ 이 시점엔 `formatPrice`가 없어서 **실패하는 게 정상**. 실패를 확인하고 넘어간다.

### Step 2 — 통과할 최소 코드만 (Green)

```ts
// formatPrice.ts
type Currency = 'KRW';

export function formatPrice(value: number, _currency: Currency) {
  // _currency: 아직 분기가 없으므로 underscore prefix로 의도적 미사용 표시
  // USD/VND 케이스가 추가되면 그때 분기를 늘린다 (다음 사이클)
  return `${value.toLocaleString('ko-KR')}원`;
}
```

→ 미리 USD·VND 분기 같은 걸 추가하지 않는다. 테스트가 요구할 때 추가.
→ `tsconfig.json`의 `noUnusedParameters: true`를 우회하려면 `_` prefix 사용.

### Step 3 — 리팩터링 (Refactor)

테스트가 초록불인 상태에서만 구조를 손본다. 통과 깨지면 즉시 롤백.

---

## 2. 테스트 작성 규칙 (Good vs Bad)

❌ 한 테스트에 여러 검증 + 모호한 이름

```ts
it('works', () => {
  expect(sum(1, 2)).toBe(3);
  expect(sum(-1, 1)).toBe(0);
  expect(sum(0, 0)).toBe(0);
});
```

✅ 케이스별 분리 + 조건이 읽히는 이름

```ts
it('양수끼리 더하면 합을 반환한다', () => {
  expect(sum(1, 2)).toBe(3);
});
it('음수가 섞이면 부호를 반영한다', () => {
  expect(sum(-1, 1)).toBe(0);
});
it('0과 0을 더하면 0이다 (항등)', () => {
  expect(sum(0, 0)).toBe(0);
});
```

규칙

- 테스트 1개 = **하나의 행동(behavior) 검증** (한 행동을 표현하려 expect가 2~3개여도 OK)
- 이름: "어떤 조건 → 어떤 결과"
- mock 호출 순서·내부 state 같은 **구현 디테일에 매달리지 않는다** (행동 기준)
- 정상 케이스(happy path)는 반드시 작성하고, **엣지케이스(빈값·0·null·경계값·에러)를 절대 빠뜨리지 않는다**
- 엣지케이스 식별 체크리스트
  - [ ] 빈 배열 / 빈 문자열 / 0
  - [ ] null / undefined 입력
  - [ ] 경계값 (min/max, off-by-one)
  - [ ] 부정 입력 (음수, 잘못된 형식)
  - [ ] 비동기 실패 (네트워크 에러, 타임아웃)
  - [ ] 동시성 (중복 호출, race condition)

---

## 3. Hook / 비동기 테스트 (실전 패턴)

```ts
// useUserOrders.test.ts
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useUserOrders } from './useUserOrders';
import { fetchOrders } from './api';

// 외부 API는 격리
vi.mock('./api', () => ({
  fetchOrders: vi.fn(),
}));

// 매 테스트 전 mock 초기화 (필수)
beforeEach(() => {
  vi.clearAllMocks();
});

it('로딩 → 성공 순으로 상태가 바뀐다', async () => {
  // vi.mocked()를 쓰면 타입 캐스팅 없이 안전 (권장)
  vi.mocked(fetchOrders).mockResolvedValue([{ id: 1 }]);

  const { result } = renderHook(() => useUserOrders('u_1'));

  expect(result.current.loading).toBe(true);                        // 초기
  await waitFor(() => expect(result.current.loading).toBe(false));  // 완료까지 대기
  expect(result.current.orders).toHaveLength(1);                    // 결과
  expect(result.current.error).toBeNull();
});

it('API 실패 시 error 상태를 채운다', async () => {
  vi.mocked(fetchOrders).mockRejectedValue(new Error('500'));

  const { result } = renderHook(() => useUserOrders('u_1'));

  await waitFor(() => expect(result.current.error).toBeTruthy());
  expect(result.current.orders).toEqual([]);
  expect(result.current.loading).toBe(false);
});

it('동기 상태 변경은 act로 감싼다', () => {
  const { result } = renderHook(() => useToggle());
  act(() => result.current.toggle());
  expect(result.current.on).toBe(true);
});

it('비동기 액션은 await act로 감싼다', async () => {
  vi.mocked(fetchOrders).mockResolvedValue([{ id: 2 }]);
  const { result } = renderHook(() => useUserOrders('u_1'));

  await waitFor(() => expect(result.current.loading).toBe(false));

  await act(async () => {
    await result.current.refetch();
  });

  expect(fetchOrders).toHaveBeenCalledTimes(2);
});
```

### 핵심

- 내부 state 말고 **리턴값·사이드이펙트**를 본다.
- 상태 변경 트리거는 반드시 `act()`. 비동기는 `await act(async () => ...)`.
- 비동기는 `waitFor`로 기다리고, **loading / success / error 3분기 전부** 작성.
- error 분기 누락이 가장 흔한 버그 — 빠뜨리지 않는다.
- `vi.mocked(fn)`이 `(fn as Mock)`보다 안전 (타입 추론).
- `beforeEach(() => vi.clearAllMocks())`로 **테스트 간 격리** 보장.

### 타이머 / 시간 의존 코드

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

  vi.useRealTimers(); // 항상 복원
});
```

### 외부 API 통합 테스트는 MSW 권장

단위 테스트는 `vi.mock`, **통합 테스트는 MSW (Mock Service Worker)**:

```ts
// test/msw-server.ts
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

export const server = setupServer(
  http.get('/api/orders/:userId', () => HttpResponse.json([{ id: 1 }])),
);

// vitest.setup.ts
import { server } from './test/msw-server';
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

장점: 실제 fetch 코드 경로를 그대로 테스트하므로 **mock 누수가 없다**.

---

## 4. 코딩 주의점 (구현 단계)

❌ 매직넘버·삼킨 에러

```ts
if (status === 2) { /* ... */ }
try { await save(); } catch {}   // 조용히 사라짐
```

✅ 의미 부여 + 명시적 처리

```ts
const ORDER_STATUS = { PAID: 2, PENDING: 1, CANCELLED: 9 } as const;
type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];

if (status === ORDER_STATUS.PAID) { /* ... */ }

try {
  await save();
} catch (err) {
  logger.error('주문 저장 실패', { err, orderId });
  throw err;   // 삼키지 말고 전파
}
```

규칙

- 함수는 단일 책임으로 작게. 30줄 넘으면 분리 검토.
- 매직넘버·하드코딩 → 상수화 + `as const` + 타입 추출.
- 에러는 **절대 조용히 삼키지 않는다** (로그 + 전파/처리).
- 변경 시 깨진 테스트부터 확인하고, 새 기능엔 항상 테스트 동반.
- 에러 처리 패턴 3가지 중 하나를 택한다
  1. **재시도 가능한 경우**: catch → retry 로직
  2. **상위로 전파**: catch → log → throw
  3. **사용자에게 표시**: catch → setError → render

---

## 5. 테스트 파일 위치 & 구조

### Co-location 권장 (소스 옆)

```
src/
├── components/
│   ├── PriceBadge.tsx
│   └── PriceBadge.test.tsx     ← 옆에 두기
├── hooks/
│   ├── useUserOrders.ts
│   └── useUserOrders.test.ts
└── utils/
    ├── formatPrice.ts
    └── formatPrice.test.ts
```

- **장점**: import 경로 짧음, 리팩터 시 함께 이동, 발견성 ↑
- **단점**: 파일 수가 두 배로 보임 (IDE 필터로 해결)

### `__tests__/` 디렉토리 방식

```
src/utils/
├── formatPrice.ts
└── __tests__/
    └── formatPrice.test.ts
```

- 큰 모놀리스나 레거시 코드베이스에 적합

**팀 컨벤션을 정하고 일관 적용한다.** 둘을 섞지 않는다.

### Snapshot 사용 규칙

```ts
// ❌ 무분별한 전체 snapshot
expect(component).toMatchSnapshot();

// ✅ 한정된 inline snapshot
expect(formatPrice(1000, 'KRW')).toMatchInlineSnapshot(`"1,000원"`);
```

- snapshot은 **변경 비용이 낮을 때만** 사용 (작은 텍스트, 작은 JSON)
- 거대한 DOM snapshot은 금지 — 변경 의도를 가려 PR 리뷰 무의미해짐
- 사용 시 반드시 inline snapshot (diff가 코드에 보임)

---

## 6. Coverage 기준선

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.config.ts',
        '**/*.test.ts',
        '**/types.ts',
      ],
    },
  },
});
```

- **80/70/80/80**을 시작점으로 (절대값보다 추세가 중요)
- coverage 100%를 강요하지 않는다 — 무의미한 테스트를 양산함
- branches가 70% 이상이면 핵심 분기는 검증됨

---

## 7. React 18+ 추가 주의사항

### StrictMode 환경에서 act 경고

```
Warning: An update to MyComponent inside a test was not wrapped in act(...)
```

대부분 비동기 effect가 미반영된 채 테스트가 종료된 경우. 해결:

```ts
await waitFor(() => {
  expect(result.current.someAsyncState).toBeDefined();
});
```

### React Query / SWR 테스트

```ts
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const { result } = renderHook(() => useUserOrders('u_1'), { wrapper });
```

- 테스트마다 **새 QueryClient** (캐시 누수 방지)
- `retry: false` (실패 즉시 노출)

---

## 8. 작업 완료 기준 (Definition of Done)

머지 전 아래가 전부 충족돼야 한다.

- [ ] 새/변경 로직에 테스트 존재 (정상 + 엣지 + 에러)
- [ ] `npm run typecheck` 통과
- [ ] `npm run lint --max-warnings 0` 통과
- [ ] `npm run test` 통과 (1회 실행 기준)
- [ ] Coverage 기준선 (lines 80% / branches 70%) 유지 또는 상승
- [ ] 테스트 없는 신규 코드 없음
- [ ] `console.log`·임시 mock·주석 처리된 코드 제거
- [ ] 함수/변수 이름이 의도를 설명함
- [ ] 비동기 코드는 `loading / success / error` 3분기 모두 테스트됨
- [ ] `vi.clearAllMocks()` 등으로 테스트 간 격리 보장
- [ ] Snapshot 사용 시 inline 형태이고 의도가 명확함

---

## 9. 안티패턴 모음 (실수 빈도순)

| 안티패턴 | 증상 | 처방 |
|---|---|---|
| **error 분기 누락** | 운영에서 silent fail | `mockRejectedValue` 테스트 필수 |
| **mock 누수** | 다음 테스트가 영향받음 | `beforeEach(vi.clearAllMocks)` |
| **구현 디테일 검증** | 리팩터 시 줄줄이 깨짐 | 내부 state 대신 외부 행동 검증 |
| **거대 snapshot** | PR 리뷰 무의미 | inline snapshot만 사용 |
| **`expect(x).toBe(true)`** | 무엇이 실패했는지 모름 | `toEqual(...)` 또는 의미 있는 matcher |
| **`await` 누락** | 비결정성, 가끔 실패 | `waitFor` + `await act` |
| **`as Mock` 캐스팅** | 타입 불일치 숨김 | `vi.mocked(fn)` 사용 |
| **테스트가 prod 코드보다 김** | 추상화 부족 신호 | 헬퍼/Builder 패턴 도입 |
| **DB·네트워크 실제 호출** | flaky test | MSW 또는 vi.mock으로 격리 |

---

## 10. PR 리뷰 체크포인트

리뷰어가 5분 안에 확인할 것:

1. **테스트 이름**이 한국어로 행동을 설명하는가?
2. **에러 케이스**가 테스트에 있는가?
3. `vi.mock` 호출이 **모듈 최상단**에 있는가? (hoisting)
4. `beforeEach`/`afterEach`로 **격리** 되어 있는가?
5. 새 매직넘버가 **상수화** 되어 있는가?
6. `try/catch`로 **에러를 삼키지** 않는가?
7. Snapshot이 거대하지 않은가?
8. Coverage가 떨어지지 않았는가?

---

## 부록 A: 자주 쓰는 import 모음

```ts
// 테스트 파일 표준 import
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { renderHook, render, screen, act, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
```

## 부록 B: 추천 ESLint 규칙

```js
// .eslintrc
{
  "extends": [
    "plugin:vitest/recommended",
    "plugin:testing-library/react"
  ],
  "rules": {
    "vitest/expect-expect": "error",
    "vitest/no-disabled-tests": "warn",
    "vitest/no-focused-tests": "error",
    "vitest/consistent-test-it": ["error", { "fn": "it" }],
    "testing-library/no-debugging-utils": "warn",
    "testing-library/no-node-access": "error"
  }
}
```

## 부록 C: 트러블슈팅 빠른 색인

| 증상 | 원인 후보 | 해결 |
|---|---|---|
| "not wrapped in act" 경고 | 비동기 effect 미대기 | `await waitFor(...)` 추가 |
| `vi.mock`이 적용 안 됨 | 함수 안에 작성 | 모듈 최상단으로 이동 |
| 테스트가 가끔 실패 | mock 누수 / 타이머 미정리 | `beforeEach` 정리 |
| `Mock` 타입 에러 | import 빠짐 | `import { type Mock } from 'vitest'` |
| Snapshot 거대 | DOM 통째 snapshot | inline + 좁은 범위로 분해 |
| Coverage 안 잡힘 | 파일이 import 안 됨 | dynamic import / barrel file 확인 |
