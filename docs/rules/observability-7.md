# 📊 관찰성 (Observability) 7수칙 (D1~D7)

> 주니어는 "동작하면 끝", 시니어는 "**운영에서 무슨 일이 일어나는지 안다**".

**언제 읽어야 하는가**:
- 운영 환경 진입 직전
- Edge Functions 작성 시
- 모니터링/알림 설계 시
- 사용자 신고 대응 시
- SLO 정의 시

---

## D1. 구조화된 로그 (Structured Logging)

- `console.log('error happened')` ❌ → 검색·필터링 불가
- ✅ JSON 형태 + 컨텍스트: `logger.error({ event: 'payment_failed', userId, amount, err })`
- 로그 레벨: `debug / info / warn / error / fatal`
- **민감 정보 마스킹** (카드번호, 토큰, 이메일 일부)
- 우리 프로젝트: Edge Functions에서 `console.error(JSON.stringify({...}))`

### 예시
```ts
// ❌ Bad
console.log('user logged in', userId);

// ✅ Good
console.log(JSON.stringify({
  event: 'user.login',
  userId,
  timestamp: Date.now(),
  ip: request.headers.get('x-forwarded-for'),
  userAgent: request.headers.get('user-agent'),
}));
```

---

## D2. 메트릭 3종 (RED Method)

- **R**ate: 초당 요청 수
- **E**rrors: 실패율 (%)
- **D**uration: p50 / p95 / p99 응답 시간
- 평균만 보지 말 것 (long tail 숨김) → **p99 필수**
- 우리 프로젝트 대상: AI 호출, 결제, 발행 API

### 측정해야 할 것
| 서비스 | Rate | Errors | Duration |
|---|---|---|---|
| AI 이미지 생성 | RPM | 실패율 | p95 |
| 결제 처리 | TPM | 실패율 | p99 |
| Instagram 발행 | RPM | 실패율 | p95 |

---

## D3. 분산 추적 (Distributed Tracing)

- `request_id` 또는 `trace_id` 생성 → 모든 다운스트림 호출에 전파
- 클라이언트 → Edge Function → Supabase → 외부 API 흐름 추적

### 예시
```ts
const traceId = crypto.randomUUID();
fetch(url, { headers: { 'X-Trace-Id': traceId } });
// 로그에 traceId 항상 포함
console.log(JSON.stringify({ event: '...', traceId, ... }));
```

사고 시 "이 요청이 어디서 막혔지?" 즉답 가능.

---

## D4. 알림 설계 (Alert as Code)

- 알림 조건: **사용자 영향 있을 때만** (CPU 80%는 무의미)
- ❌ "에러 1건 발생" → false alarm 폭주
- ✅ "5분간 에러율 1% 초과" 또는 "p99 > 5초가 10분 지속"
- 알림 피로 (alert fatigue) 방지 — 매일 울리면 무시함
- **Runbook 링크** 포함 (F6 참고)

### 좋은 알림 조건 예시
```
- AI 생성 실패율 > 5% (5분간) → Slack #incidents
- 결제 실패율 > 1% (10분간) → Slack #incidents + 호출
- p99 응답시간 > 10초 (15분간) → Slack #performance
```

---

## D5. SLI / SLO (Service Level Indicator / Objective)

- **SLI**: 측정 가능한 지표 (가용성, 응답 시간, 정확도)
- **SLO**: 목표값 (예: 99.9% 가용성)
- **Error Budget** = 100% − SLO (99.9% SLO → 월 43분 다운 허용)

### 우리 SNS Platform SLO 후보
| 서비스 | SLI | SLO | Error Budget |
|---|---|---|---|
| 발행 | 성공률 | 99% | 월 7.2시간 실패 허용 |
| AI 생성 | p95 | 30초 이내 | - |
| 결제 | 가용성 | 99.95% | 월 21.6분 다운 허용 |
| 인증 | p95 | 1초 이내 | - |

### Error Budget 운영
- 예산 초과 → 신규 기능 일시 중단, 안정화 집중
- 예산 여유 → 새 실험 가능

---

## D6. 대시보드 설계 원칙

- 한 화면 = 한 질문 (혼합 X)
- 위에서 아래로: **사용자 영향 → 시스템 건강 → 인프라 세부**
- 색상: 빨강(에러)/노랑(경고)/녹색(정상) 일관
- 시간 범위: 1h / 24h / 7d / 30d 토글
- 우리 프로젝트: 관리자 콘솔에 매출/AI사용량/에러율 대시보드

### 대시보드 구성 예시
```
[최상단] 오늘 매출 / 활성 사용자 / 에러율 (사용자 영향)
   ↓
[중단] 서비스별 상태 (AI/결제/발행/SNS)
   ↓
[하단] 인프라 (CPU/메모리/DB)
```

---

## D7. 디버그 정보 수집 (Diagnostics)

- 사용자가 "안 돼요" 신고 시 5분 안에 진단 가능해야 함
- "재현 안 돼요" 답변 금지 — 로그가 부족한 것

### 필수 컨텍스트
- `user_id` + `request_id`
- 브라우저/OS
- 발생 시각 (ms 단위)
- 입력 파라미터 (민감 정보 마스킹)
- 스택 트레이스 또는 API 응답

### 사용자 신고 처리 흐름
```
1. user_id로 최근 30분 로그 검색
2. trace_id 추출 → 전체 요청 흐름 파악
3. 어느 단계에서 실패했는지 식별
4. 원인 + 해결 → 사용자 회신 (1시간 내)
```

---

## 📊 D 그룹 체크리스트

```
□ D1. 구조화된 로그 (JSON + 컨텍스트)
□ D2. 메트릭 (Rate/Errors/Duration p99)
□ D3. 분산 추적 (trace_id 전파)
□ D4. 알림 (사용자 영향 기준)
□ D5. SLI/SLO/Error Budget 정의
□ D6. 대시보드 (한 화면 한 질문)
□ D7. 디버그 정보 (5분 진단)
```
