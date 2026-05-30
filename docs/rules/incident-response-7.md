# 🚨 장애 대응 (Incident Response) 7수칙 (F1~F7)

> 주니어는 "복구"만, 시니어는 "**학습**까지".

**언제 읽어야 하는가**:
- 운영 환경 진입 직전 (사전 대비)
- 알림 수신 시 (즉시 참조)
- Postmortem 작성 시
- Runbook 작성 시
- Chaos 실험 시

---

## F1. Incident Severity 등급 (P0~P4)

| 등급 | 정의 | 대응 시간 |
|---|---|---|
| **P0** Critical | 전체 서비스 다운, 데이터 손실 | 5분 내 |
| **P1** High | 주요 기능 장애, 일부 사용자 영향 | 30분 내 |
| **P2** Medium | 부분 기능 장애, 우회 가능 | 4시간 내 |
| **P3** Low | 사소한 버그, 사용자 영향 적음 | 다음 영업일 |
| **P4** Trivial | UI 오타, 코스메틱 | 백로그 |

### 우리 SNS Platform 예시
- **P0**: 발행 100% 실패, 결제 차단
- **P1**: 특정 SNS 채널 발행 불가
- **P2**: 분석 리포트 지연
- **P3**: UI 깨짐 (모바일 일부)
- **P4**: 오타, 색상 미세 차이

### Severity 판단 기준
- 영향 사용자 수: 100% (P0) / 10%+ (P1) / 1%+ (P2) / 미미 (P3-4)
- 매출 영향: 모든 결제 차단 (P0) / 일부 결제 실패 (P1) / 없음 (P2-4)
- 데이터 안전: 손실 위험 (P0) / 일시 차단 (P1) / 안전 (P2-4)

---

## F2. 5분 룰 (Time-Critical Response)

| 시점 | 작업 |
|---|---|
| 0~5분 | 알림 수신 → 인지 |
| 5~30분 | **임시 완화** (mitigation) — 근본 해결 아님 |
| 30분~4시간 | 근본 원인 분석 (RCA - Root Cause Analysis) |
| 24시간 내 | Postmortem 초안 |
| 1주일 내 | Action Items 시작 |

**완화 우선, 분석 나중** (사용자 우선)

### 완화 vs 해결
- **완화 (Mitigation)**: 사용자 영향 줄이기 (롤백, 우회, 트래픽 차단)
- **해결 (Resolution)**: 근본 원인 제거 (코드 수정, 인프라 보강)

### 좋은 완화 사례
- 의심 배포 즉시 롤백 (Git revert + 재배포)
- 문제 기능 일시 비활성화 (feature flag)
- 외부 의존성 장애 시 폴백 모드 (캐시 데이터 사용)

---

## F3. Blameless Postmortem

- 사람 탓 ❌ → 시스템 탓 ✅
- "왜 ${사람}이 실수했나?" ❌
- "왜 ${사람}이 실수할 수 있는 시스템이었나?" ✅
- 솔직한 보고 환경 → 다음 사고 예방
- 비난 문화 = 사고 숨김 = 더 큰 사고

### 표현 가이드
| ❌ Blameful | ✅ Blameless |
|---|---|
| "${사람}이 실수했다" | "시스템이 실수를 허용했다" |
| "왜 확인 안 했나?" | "왜 자동 검증이 없었나?" |
| "교육 부족" | "프로세스 부족" |
| "주의 부족" | "안전망 부재" |

### 핵심 원칙
> **사람은 가용 정보 안에서 최선을 다했다고 가정.**
> 다른 결과를 원하면 시스템을 바꾸자.

---

## F4. 5 Whys (근본 원인까지)

표면 원인에서 멈추지 말 것. 5번 "왜?"를 반복.

### 예시
```
문제: 결제 100% 실패
Why 1: PG 응답 타임아웃
Why 2: PG 서버 다운
Why 3: 우리가 하나의 PG만 사용
Why 4: 이중화 ADR 결정 미흡
Why 5: 단일 장애점 (SPOF) 감사 부재
→ 진짜 해결: SPOF 정기 감사 프로세스
```

### 잘못된 5 Whys
```
문제: 결제 100% 실패
Why 1: PG 다운
→ 근본 원인: PG 다운
→ 해결: PG 복구 기다림 (❌ 학습 없음)
```

### 5 Whys가 어려운 경우
- Fishbone 다이어그램 (원인 카테고리화)
- Causal Loop Diagram (순환 인과 관계)
- 외부 컨설팅 (관점 다양화)

---

## F5. Postmortem 문서 양식

- 파일: `docs/postmortems/YYYY-MM-DD-제목.md`
- 사고 24시간 내 초안

### 필수 항목
```markdown
# Postmortem: 2026-05-30 결제 100% 실패

## 요약 (TL;DR)
1-2줄. 무슨 일이 있었고 어떻게 해결했나.

## 영향 (Impact)
- 영향 사용자: 1,234명
- 다운 시간: 47분
- 매출 손실: ₩5,300,000
- 데이터 손실: 없음

## 타임라인 (분 단위)
- 14:23 - 알림 수신
- 14:25 - on-call 인지
- 14:31 - 임시 완화 (PG 우회 시작)
- 15:10 - 정상화

## 근본 원인 (Root Cause)
5 Whys 결과:
- 표면: PG 응답 없음
- 1차: PG 서버 다운
- 2차: 단일 PG 의존
- 3차: SPOF 감사 부재

## 잘된 점 (What went well)
- 알림 5분 내 도착
- on-call 즉시 대응
- 완화책 빠른 적용

## 개선점 (What didn't go well)
- 근본 원인 파악 30분 소요
- 사용자 공지 늦음 (40분)

## 운 좋았던 점 (Where got lucky)
- 점심시간이라 사용자 적음 (다음엔 운 없을 수 있음)

## Action Items
| # | 항목 | 담당 | 기한 |
|---|---|---|---|
| 1 | PG 이중화 (Stripe 추가) | 마스터 | 7일 |
| 2 | 자동 페일오버 | Claude | 14일 |
| 3 | 사용자 공지 자동화 | 마스터 | 3일 |
```

---

## F6. Runbook 작성 (반복 장애 대응)

- 같은 장애 두 번 → Runbook 작성 의무
- 새벽 3시 호출 받은 신입이 따라 할 수 있게
- 위치: `docs/runbooks/장애유형.md`

### 예시 Runbook
```markdown
# AI 호출 실패 Runbook

## 증상
- 사용자 신고: "이미지 생성 실패"
- 알림: ai_generation_error > 5%

## 1단계: 임시 완화 (5분)
1. Replicate 상태 확인: https://status.replicate.com
2. Edge Function 환경변수 확인:
   `supabase secrets list | grep REPLICATE`
3. 잔액 확인: https://replicate.com/account/billing

## 2단계: 원인 분석 (15분)
1. 최근 에러 로그 추출:
   `supabase functions logs ai-generate-image --tail`
2. 에러 유형 분류:
   - 401: API 키 만료
   - 402: 잔액 부족
   - 429: Rate limit
   - 500: 서버 오류

## 3단계: 복구
| 원인 | 조치 |
|---|---|
| 401 | 새 키 발급 + Secrets 업데이트 |
| 402 | 결제 등록 + 충전 |
| 429 | 대기 또는 모델 변경 |
| 500 | Replicate에 신고 |

## 4단계: 사용자 공지
- billing.html 상단 배너
- 이메일 발송 (영향 사용자만)

## 5단계: Postmortem 작성
[Postmortem 템플릿] 참조
```

---

## F7. Chaos Engineering (의도적 장애)

운영 시작 후: 의도적으로 장애 주입해서 시스템 회복력 검증.

### 시작 단계 (Beginner)
- 월 1회 Replicate API 키 잠깐 무효화 → 환불 로직 작동 확인
- Edge Function 콜드 스타트 일부러 발생
- DB 연결 일시 차단 → 클라이언트 에러 처리 확인

### 중급 단계
- Netflix Chaos Monkey 스타일 (랜덤 컴포넌트 종료)
- Latency 주입 (의도적 느린 응답)
- 네트워크 분할 시뮬레이션

### 원칙
- **운영 환경**에서 (스테이징은 의미 없음)
- **저트래픽 시간대**부터
- **롤백 즉시 가능**한 범위
- 모든 실험은 **사전 공지**

### 우리 프로젝트 Chaos 계획
- Phase 1: 개발 시 의도적 에러 주입 (테스트 단계)
- Phase 2: 운영 후 월 1회 작은 실험
- Phase 3: 자동 실험 (Chaos Monkey 도입 검토)

위험 회피보다 위험 발견이 안전.

---

## 📊 F 그룹 체크리스트

```
□ F1. Severity 등급 (P0~P4) 정의
□ F2. 5분 룰 (인지→완화→분석→Postmortem)
□ F3. Blameless Postmortem (사람 X, 시스템 O)
□ F4. 5 Whys (근본 원인까지)
□ F5. Postmortem 문서 양식
□ F6. Runbook (반복 장애 대응)
□ F7. Chaos Engineering (의도적 실험)
```
