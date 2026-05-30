# 결제 시스템 + Edge Functions 배포 가이드

DIVOOST SNS Platform의 백엔드 AI 프록시 + 크레딧/결제 시스템 운영 가이드입니다.

## 📋 개요

```
┌──────────────────────────────────────────────────────────────┐
│ 고객 브라우저 (GitHub Pages)                                  │
│  - ai-gateway.js → fetch('/functions/v1/ai-generate-image')  │
│  - JWT 토큰만 전송 (회사 API 키 노출 안 됨)                    │
└────────────────────────────┬─────────────────────────────────┘
                             │
                             ↓
┌──────────────────────────────────────────────────────────────┐
│ Supabase Edge Functions (백엔드 프록시)                       │
│  - JWT 검증 → 사용자 식별                                     │
│  - 회사 마스터 API 키로 Replicate/Fal/OpenAI 호출            │
│  - 크레딧 차감 + 사용 로그 기록                              │
└────────────────────────────┬─────────────────────────────────┘
                             │
                             ↓
┌──────────────────────────────────────────────────────────────┐
│ Supabase PostgreSQL                                          │
│  - plans, subscriptions, credit_balances                     │
│  - credit_transactions, ai_usage_logs, payments              │
└──────────────────────────────────────────────────────────────┘
```

## 1️⃣ DB 스키마 적용

Supabase Dashboard → SQL Editor에서 `docs/billing-schema.sql` 실행.

생성되는 테이블:
- `plans` - 요금제 (Free/Starter/Pro/Business/Enterprise 자동 시드)
- `subscriptions` - 사용자별 구독 상태
- `credit_balances` - 잔액 캐시 (per user 1행)
- `credit_transactions` - 충전/차감 원장
- `ai_usage_logs` - AI 호출별 원가/판매가/마진
- `payments` - 결제 내역

RPC 함수:
- `deduct_credits()` - 원자적 크레딧 차감 (구독→충전 순)
- `grant_credits()` - 충전 또는 구독 지급

자동 트리거: 신규 가입 시 무료 플랜 + $0.5 체험 크레딧 자동 지급.

## 2️⃣ Edge Functions 배포

### Supabase CLI 설치
```bash
npm install -g supabase
supabase login
```

### 프로젝트 링크
```bash
cd /path/to/divoost-website
supabase link --project-ref unruyezigyybnuvgdgdt
```

### 환경 변수 설정
Supabase Dashboard → Project Settings → Edge Functions → Secrets:

| Key | Value |
|---|---|
| `REPLICATE_API_KEY` | r8_xxx... (회사 마스터 키) |
| `FAL_API_KEY` | (선택) Fal.ai 키 |
| `OPENAI_API_KEY` | sk-... (DALL-E 3용) |

`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`는 자동 주입됩니다.

### 배포
```bash
supabase functions deploy ai-generate-image
supabase functions deploy ai-generate-video
```

배포 후 endpoint:
- `https://unruyezigyybnuvgdgdt.supabase.co/functions/v1/ai-generate-image`
- `https://unruyezigyybnuvgdgdt.supabase.co/functions/v1/ai-generate-video`

## 3️⃣ 가격 정책 (백엔드)

`supabase/functions/_shared/ai-models.ts`에서 정의:
- `MARGIN = 1.7` (원가의 70% 마진)
- 모델별 `costPerUnitCents` (원가, 회사 지불) vs `chargedPerUnitCents` (판매가, 고객 차감)

### 예시
| 모델 | 원가 | 판매가 | 마진 |
|---|---|---|---|
| Flux Schnell | 1¢ | 2¢ | 1¢ (100%) |
| Flux Pro | 4¢ | 7¢ | 3¢ (75%) |
| Pika 2.0 5초 | 30¢ | 55¢ | 25¢ (83%) |
| Runway Gen-3 5초 | 50¢ | 85¢ | 35¢ (70%) |

마진을 변경하려면 `MARGIN` 상수 수정 후 재배포.

## 4️⃣ 요금제 변경

`docs/billing-schema.sql`의 INSERT INTO plans 부분을 수정하거나, SQL Editor에서:

```sql
UPDATE public.plans
   SET price_krw = 29000,
       monthly_credits_usd = 8.0,
       features = '["크레딧 $8/월","Flux Pro","SNS 7개"]'::jsonb
 WHERE id = 'starter';
```

플랜 추가:
```sql
INSERT INTO public.plans (id, name, price_krw, monthly_credits_usd, features, display_order)
VALUES ('mega', '메가플랜', 999000, 500.0, '["무제한","화이트라벨"]', 60);
```

## 5️⃣ 결제 시스템 연동 (TODO)

현재는 `billing.html`에서 결제 요청만 `payments` 테이블에 `status='pending'`으로 기록.

### 단계별 추후 구현

#### 토스페이먼츠 (정기결제 + 일회 충전)
1. https://docs.tosspayments.com 가입, Test Client/Secret Key 발급
2. Edge Function `payments-toss-confirm` 추가:
   - 클라이언트 결제 위젯 → 토스 결제창 → confirm API
   - 성공 시 RPC `grant_credits()` 호출
3. 정기결제: 토스 빌링키 발급 + cron으로 매월 결제

#### Stripe (해외)
1. https://stripe.com 가입
2. Edge Function `stripe-webhook`:
   - `checkout.session.completed` 처리
   - `customer.subscription.updated` 처리

#### PayPal (해외)
1. https://developer.paypal.com 가입
2. Smart Buttons + webhook
3. PAYMENT.CAPTURE.COMPLETED 처리

### 임시 운영 (수동)
- 고객이 billing.html에서 결제 요청
- 관리자가 실제 입금 확인 (계좌 이체 등)
- Supabase SQL Editor에서:
```sql
SELECT public.grant_credits(
    '<user_id>'::uuid,
    8500,  -- 85달러 = 8500센트
    'topup',
    'manual_bank_transfer',
    '수동 입금 확인 - 2026.5.30',
    false  -- 구독이 아닌 충전
);
UPDATE payments SET status = 'succeeded' WHERE id = '<payment_id>';
```

## 6️⃣ 운영 대시보드 (관리자)

`admin_revenue_summary` 뷰: 일별 매출
`admin_ai_margin_summary` 뷰: 모델별 마진 분석

```sql
-- 오늘 매출
SELECT SUM(revenue_krw) FROM admin_revenue_summary
WHERE day = CURRENT_DATE;

-- 이번 달 마진 (모델별 TOP 10)
SELECT model, provider, total_revenue_cents, total_cost_cents, total_margin_cents
FROM admin_ai_margin_summary
WHERE day >= DATE_TRUNC('month', CURRENT_DATE)
ORDER BY total_margin_cents DESC LIMIT 10;
```

향후 admin 페이지에 시각화 예정.

## 7️⃣ 비용 추산 (예시)

### 고객 100명, Pro 플랜 평균
- 월 구독료: 100 × 59,000원 = **5,900,000원/월 매출**
- AI 사용량 (평균 $15/명): 100 × $15 = $1,500 = ~210만원 (원가)
- 마진 ~70%: **약 250만원/월 순익**

### 200명 (반은 Free, 반은 Pro)
- 매출: 100 × 59,000 = 5,900,000원
- 원가: AI 사용 + Supabase + 도메인 = ~250만원
- 순익: ~340만원

## 8️⃣ 보안 체크리스트

- ✅ 회사 API 키는 Edge Function Secret으로만 저장 (코드에 노출 X)
- ✅ JWT 검증 후에만 차감 가능
- ✅ `deduct_credits` RPC는 SECURITY DEFINER로 RLS 우회
- ✅ 모든 차감/충전이 `credit_transactions`에 기록 (감사 가능)
- ✅ Premium 모델은 플랜 검증
- ⏳ Rate limiting (분당 호출 제한) - 추후 추가
- ⏳ 부정 사용 탐지 (동일 IP 다계정) - 추후 추가

## 9️⃣ 환불 / 분쟁

```sql
-- 부분 환불 + 크레딧 회수
BEGIN;
UPDATE payments SET status = 'partially_refunded', refunded_at = NOW(), refund_amount = 5000
 WHERE id = '<payment_id>';
SELECT grant_credits(...) -- 회수 negative 처리는 admin_adjust로
END;
```

## 🔟 마이그레이션 체크리스트

신규 시스템 적용 전:
- [ ] DB 백업
- [ ] `billing-schema.sql` SQL Editor 실행
- [ ] Storage 버킷 `sns-media` 이미 설정됨 (변경 없음)
- [ ] 회사 Replicate 계정 결제 등록 + Service Plan
- [ ] Edge Functions 환경변수 설정
- [ ] `supabase functions deploy` 양쪽
- [ ] `billing.html`에서 무료 가입자 잔액 표시 테스트
- [ ] 이미지 1장 생성 → 크레딧 차감 확인 → 환불 동작 확인
- [ ] 관리자 콘솔에 매출 뷰 연동
