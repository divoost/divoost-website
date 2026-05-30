-- =====================================================
-- DIVOOST SNS Platform - Billing & Credits Schema
-- =====================================================
-- 하이브리드 요금제: 월 구독(기본 크레딧 포함) + 추가 충전(PAYG)
-- AI 사용량 추적 + 마진 관리 + 결제 내역
-- =====================================================

-- ==============================
-- 1) 요금제 정의 (plans)
-- ==============================
CREATE TABLE IF NOT EXISTS public.plans (
    id TEXT PRIMARY KEY,                          -- 'free', 'starter', 'pro', 'business', 'enterprise'
    name TEXT NOT NULL,                           -- 표시명
    name_en TEXT,
    description TEXT,
    price_krw NUMERIC(12,2) NOT NULL DEFAULT 0,   -- 월 요금 (원)
    price_usd NUMERIC(8,2) NOT NULL DEFAULT 0,    -- 월 요금 (USD)
    monthly_credits_usd NUMERIC(8,2) NOT NULL DEFAULT 0,  -- 매월 지급되는 크레딧 (USD 단위, AI 사용비용 기준)
    features JSONB DEFAULT '[]'::jsonb,           -- ['AI 이미지', 'SNS 7개', ...]
    max_accounts_per_channel INT DEFAULT 1,       -- 채널당 최대 계정 수
    max_scheduled_posts INT DEFAULT 10,           -- 예약 발행 한도
    can_use_premium_models BOOLEAN DEFAULT false, -- Flux Pro, Runway 등 사용 가능 여부
    rollover_credits BOOLEAN DEFAULT false,       -- 미사용분 이월 가능?
    is_active BOOLEAN DEFAULT true,
    display_order INT DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 기본 요금제 시드
INSERT INTO public.plans (id, name, name_en, description, price_krw, price_usd, monthly_credits_usd, features, max_accounts_per_channel, max_scheduled_posts, can_use_premium_models, display_order)
VALUES
    ('free',       '무료',     'Free',       '체험용 무료 플랜',           0,        0,    0.50,  '["체험용 크레딧 $0.5","기본 AI 모델","SNS 채널 1개"]'::jsonb, 1,  5,   false, 10),
    ('starter',    '스타터',   'Starter',    '1인 크리에이터용',         19900,   15.00,  5.00,  '["크레딧 $5/월","Flux Schnell, SDXL","SNS 5개"]'::jsonb,       2,  30,  false, 20),
    ('pro',        '프로',     'Pro',        '소규모 마케터용',          59000,   45.00, 20.00,  '["크레딧 $20/월","Flux Pro, Pika, Kling","SNS 전 채널"]'::jsonb,5,  150, true,  30),
    ('business',   '비즈니스', 'Business',   '에이전시/소상공인',       199000,  150.00, 80.00,  '["크레딧 $80/월","Runway, DALL-E 3","계정 무제한","우선 지원"]'::jsonb,20, 999, true,  40),
    ('enterprise', '엔터프라이즈','Enterprise','협의 (연 계약)',                 0,    0,    0,     '["전용 크레딧","화이트라벨","SLA 보장","API 액세스"]'::jsonb,99, 9999,true,  50)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    price_krw = EXCLUDED.price_krw,
    price_usd = EXCLUDED.price_usd,
    monthly_credits_usd = EXCLUDED.monthly_credits_usd,
    features = EXCLUDED.features;

-- ==============================
-- 2) 사용자 구독 상태 (subscriptions)
-- ==============================
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id TEXT NOT NULL REFERENCES public.plans(id),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled', 'past_due', 'trial')),
    billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly', 'one_time')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    current_period_start TIMESTAMPTZ DEFAULT NOW(),
    current_period_end TIMESTAMPTZ,               -- 다음 결제 예정일
    cancelled_at TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT false,   -- 기간 만료 시 자동 해지
    payment_provider TEXT,                         -- 'toss', 'stripe', 'paypal', 'manual'
    provider_subscription_id TEXT,                -- 토스/Stripe 구독 ID
    provider_customer_id TEXT,
    billing_key TEXT,                              -- 토스 자동결제용 빌링키 (암호화 권장)
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

-- ==============================
-- 3) 크레딧 잔액 (credit_balances)
-- ==============================
-- 사용자당 1행, 잔액 캐싱 (transactions 합산으로 검증 가능)
CREATE TABLE IF NOT EXISTS public.credit_balances (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    -- 모든 크레딧 단위는 USD-cent (1/100 달러) - 정수 원장
    subscription_credits_cents BIGINT NOT NULL DEFAULT 0,  -- 구독으로 받은 크레딧 (만료 가능)
    paid_credits_cents BIGINT NOT NULL DEFAULT 0,          -- 직접 충전한 크레딧 (이월)
    total_used_cents BIGINT NOT NULL DEFAULT 0,            -- 누적 사용 금액
    total_purchased_cents BIGINT NOT NULL DEFAULT 0,       -- 누적 구매 금액
    last_subscription_grant_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 잔액 조회 함수: 구독 + 충전 합산
CREATE OR REPLACE FUNCTION public.get_user_balance_cents(uid UUID)
RETURNS BIGINT
LANGUAGE SQL STABLE
AS $$
    SELECT COALESCE(subscription_credits_cents + paid_credits_cents, 0)
    FROM public.credit_balances WHERE user_id = uid;
$$;

-- ==============================
-- 4) 크레딧 트랜잭션 원장 (credit_transactions)
-- ==============================
-- 모든 충전/차감의 불변 로그 (감사 가능)
CREATE TABLE IF NOT EXISTS public.credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN (
        'subscription_grant',  -- 구독 자동 지급
        'topup',               -- 추가 충전
        'usage_image',         -- AI 이미지 생성 차감
        'usage_video',         -- AI 영상 생성 차감
        'usage_text',          -- GPT 텍스트 차감
        'refund',              -- 환불
        'admin_adjust',        -- 관리자 수동 조정
        'bonus'                -- 이벤트 보너스
    )),
    amount_cents BIGINT NOT NULL,                  -- +충전, -차감
    source TEXT,                                    -- 'subscription', 'topup', 'replicate:flux-1.1-pro', etc.
    related_id UUID,                                -- payments.id, ai_usage_logs.id 등
    description TEXT,
    balance_after_cents BIGINT,                     -- 트랜잭션 직후 잔액 (검증용)
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_tx_user ON public.credit_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_tx_type ON public.credit_transactions(type);

-- ==============================
-- 5) AI 사용 로그 (ai_usage_logs)
-- ==============================
-- 모든 AI 호출의 상세 기록 (원가/판매가/마진 추적)
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('image', 'video', 'text', 'audio')),
    provider TEXT NOT NULL,                        -- 'replicate', 'fal', 'openai', 'anthropic'
    model TEXT NOT NULL,                           -- 'flux-1.1-pro', 'pika-2.0', 'gpt-4o', etc.
    prompt TEXT,
    cost_cents BIGINT NOT NULL DEFAULT 0,          -- 회사가 프로바이더에 지불한 비용 (원가)
    charged_cents BIGINT NOT NULL DEFAULT 0,       -- 고객에게 차감한 크레딧 (판매가)
    margin_cents BIGINT GENERATED ALWAYS AS (charged_cents - cost_cents) STORED,  -- 마진
    duration_seconds NUMERIC(8,2),                 -- 영상 길이 또는 처리 시간
    output_url TEXT,                                -- 결과물 URL
    status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('pending', 'success', 'failed', 'refunded')),
    error_message TEXT,
    provider_request_id TEXT,                      -- Replicate prediction ID 등
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON public.ai_usage_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_provider ON public.ai_usage_logs(provider, model);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created ON public.ai_usage_logs(created_at DESC);

-- ==============================
-- 6) 결제 내역 (payments)
-- ==============================
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('subscription', 'topup', 'one_time')),
    amount_krw NUMERIC(12,2) DEFAULT 0,
    amount_usd NUMERIC(10,2) DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'KRW' CHECK (currency IN ('KRW', 'USD')),
    credits_granted_cents BIGINT DEFAULT 0,        -- 이 결제로 받은 크레딧
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'cancelled', 'refunded', 'partially_refunded')),
    provider TEXT NOT NULL CHECK (provider IN ('toss', 'kakaopay', 'naverpay', 'stripe', 'paypal', 'manual', 'free')),
    provider_payment_id TEXT,                       -- 토스 paymentKey, Stripe payment_intent 등
    provider_order_id TEXT,                         -- 토스 orderId
    receipt_url TEXT,
    failure_reason TEXT,
    refunded_at TIMESTAMPTZ,
    refund_amount NUMERIC(12,2) DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_user ON public.payments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_provider_id ON public.payments(provider_payment_id);

-- ==============================
-- 7) profiles 테이블 확장 (구독 빠른 조회용 캐시)
-- ==============================
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS current_plan_id TEXT REFERENCES public.plans(id) DEFAULT 'free',
    ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS subscription_renew_at TIMESTAMPTZ;

-- ==============================
-- 8) 자동 트리거: 신규 가입 시 무료 플랜 + 잔액 초기화
-- ==============================
CREATE OR REPLACE FUNCTION public.handle_new_user_billing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    -- 크레딧 잔액 row 생성
    INSERT INTO public.credit_balances (user_id) VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;

    -- 무료 플랜 구독 자동 생성
    INSERT INTO public.subscriptions (user_id, plan_id, status, current_period_start, current_period_end, payment_provider)
    VALUES (NEW.id, 'free', 'active', NOW(), NOW() + INTERVAL '1 year', 'free')
    ON CONFLICT DO NOTHING;

    -- 체험용 크레딧 50센트 ($0.5) 지급
    UPDATE public.credit_balances
       SET subscription_credits_cents = 50,
           last_subscription_grant_at = NOW()
     WHERE user_id = NEW.id;

    INSERT INTO public.credit_transactions (user_id, type, amount_cents, source, description, balance_after_cents)
    VALUES (NEW.id, 'subscription_grant', 50, 'free', '신규 가입 체험 크레딧 $0.5', 50);

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_billing ON auth.users;
CREATE TRIGGER on_auth_user_created_billing
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_billing();

-- ==============================
-- 9) RPC: 크레딧 차감 (원자적 트랜잭션)
-- ==============================
-- 결과: TRUE = 성공, FALSE = 잔액 부족
CREATE OR REPLACE FUNCTION public.deduct_credits(
    p_user_id UUID,
    p_amount_cents BIGINT,
    p_type TEXT,
    p_source TEXT,
    p_description TEXT,
    p_related_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sub BIGINT;
    v_paid BIGINT;
    v_total BIGINT;
    v_deduct_sub BIGINT;
    v_deduct_paid BIGINT;
    v_after BIGINT;
BEGIN
    IF p_amount_cents <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'amount must be positive');
    END IF;

    -- 잠금 + 잔액 조회
    SELECT subscription_credits_cents, paid_credits_cents
      INTO v_sub, v_paid
      FROM public.credit_balances
     WHERE user_id = p_user_id
     FOR UPDATE;

    IF NOT FOUND THEN
        INSERT INTO public.credit_balances (user_id) VALUES (p_user_id);
        v_sub := 0; v_paid := 0;
    END IF;

    v_total := COALESCE(v_sub, 0) + COALESCE(v_paid, 0);

    IF v_total < p_amount_cents THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'insufficient_credits',
            'balance_cents', v_total,
            'required_cents', p_amount_cents
        );
    END IF;

    -- 구독 크레딧 먼저 소진 (만료 가능하므로)
    v_deduct_sub  := LEAST(v_sub, p_amount_cents);
    v_deduct_paid := p_amount_cents - v_deduct_sub;
    v_after := v_total - p_amount_cents;

    UPDATE public.credit_balances
       SET subscription_credits_cents = subscription_credits_cents - v_deduct_sub,
           paid_credits_cents         = paid_credits_cents - v_deduct_paid,
           total_used_cents           = total_used_cents + p_amount_cents,
           updated_at = NOW()
     WHERE user_id = p_user_id;

    INSERT INTO public.credit_transactions
        (user_id, type, amount_cents, source, related_id, description, balance_after_cents)
    VALUES
        (p_user_id, p_type, -p_amount_cents, p_source, p_related_id, p_description, v_after);

    RETURN jsonb_build_object(
        'success', true,
        'deducted_cents', p_amount_cents,
        'balance_after_cents', v_after
    );
END;
$$;

-- ==============================
-- 10) RPC: 크레딧 충전 (결제 성공 후 호출)
-- ==============================
CREATE OR REPLACE FUNCTION public.grant_credits(
    p_user_id UUID,
    p_amount_cents BIGINT,
    p_type TEXT,
    p_source TEXT,
    p_description TEXT,
    p_is_subscription BOOLEAN DEFAULT false,
    p_related_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_after BIGINT;
BEGIN
    INSERT INTO public.credit_balances (user_id) VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;

    IF p_is_subscription THEN
        UPDATE public.credit_balances
           SET subscription_credits_cents = p_amount_cents,  -- 구독은 매월 리셋
               total_purchased_cents = total_purchased_cents + p_amount_cents,
               last_subscription_grant_at = NOW(),
               updated_at = NOW()
         WHERE user_id = p_user_id
         RETURNING subscription_credits_cents + paid_credits_cents INTO v_after;
    ELSE
        UPDATE public.credit_balances
           SET paid_credits_cents = paid_credits_cents + p_amount_cents,
               total_purchased_cents = total_purchased_cents + p_amount_cents,
               updated_at = NOW()
         WHERE user_id = p_user_id
         RETURNING subscription_credits_cents + paid_credits_cents INTO v_after;
    END IF;

    INSERT INTO public.credit_transactions
        (user_id, type, amount_cents, source, related_id, description, balance_after_cents)
    VALUES
        (p_user_id, p_type, p_amount_cents, p_source, p_related_id, p_description, v_after);

    RETURN jsonb_build_object('success', true, 'balance_after_cents', v_after);
END;
$$;

-- ==============================
-- 11) RLS 정책
-- ==============================
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- plans: 누구나 조회 가능 (가격표)
DROP POLICY IF EXISTS "anyone_can_view_plans" ON public.plans;
CREATE POLICY "anyone_can_view_plans" ON public.plans FOR SELECT USING (true);

-- subscriptions: 본인 것만 조회
DROP POLICY IF EXISTS "user_view_own_subscription" ON public.subscriptions;
CREATE POLICY "user_view_own_subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);

-- credit_balances: 본인 것만 조회
DROP POLICY IF EXISTS "user_view_own_balance" ON public.credit_balances;
CREATE POLICY "user_view_own_balance" ON public.credit_balances FOR SELECT USING (auth.uid() = user_id);

-- credit_transactions: 본인 것만 조회
DROP POLICY IF EXISTS "user_view_own_transactions" ON public.credit_transactions;
CREATE POLICY "user_view_own_transactions" ON public.credit_transactions FOR SELECT USING (auth.uid() = user_id);

-- ai_usage_logs: 본인 것만 조회
DROP POLICY IF EXISTS "user_view_own_usage" ON public.ai_usage_logs;
CREATE POLICY "user_view_own_usage" ON public.ai_usage_logs FOR SELECT USING (auth.uid() = user_id);

-- payments: 본인 것만 조회
DROP POLICY IF EXISTS "user_view_own_payments" ON public.payments;
CREATE POLICY "user_view_own_payments" ON public.payments FOR SELECT USING (auth.uid() = user_id);

-- 관리자(super_admin/admin)는 전체 조회
DROP POLICY IF EXISTS "admin_view_all_subscriptions" ON public.subscriptions;
CREATE POLICY "admin_view_all_subscriptions" ON public.subscriptions FOR SELECT
USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('super_admin','admin')));

DROP POLICY IF EXISTS "admin_view_all_usage" ON public.ai_usage_logs;
CREATE POLICY "admin_view_all_usage" ON public.ai_usage_logs FOR SELECT
USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('super_admin','admin')));

DROP POLICY IF EXISTS "admin_view_all_payments" ON public.payments FOR SELECT
USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('super_admin','admin')));

DROP POLICY IF EXISTS "admin_view_all_balances" ON public.credit_balances;
CREATE POLICY "admin_view_all_balances" ON public.credit_balances FOR SELECT
USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('super_admin','admin')));

-- ==============================
-- 12) 관리자 대시보드용 뷰
-- ==============================
CREATE OR REPLACE VIEW public.admin_revenue_summary AS
SELECT
    DATE_TRUNC('day', created_at) AS day,
    COUNT(*) FILTER (WHERE status = 'succeeded') AS payment_count,
    SUM(amount_krw) FILTER (WHERE status = 'succeeded') AS revenue_krw,
    SUM(amount_usd) FILTER (WHERE status = 'succeeded') AS revenue_usd,
    COUNT(DISTINCT user_id) FILTER (WHERE status = 'succeeded') AS paying_users
FROM public.payments
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY day DESC;

CREATE OR REPLACE VIEW public.admin_ai_margin_summary AS
SELECT
    DATE_TRUNC('day', created_at) AS day,
    provider,
    model,
    type,
    COUNT(*) AS request_count,
    SUM(cost_cents) AS total_cost_cents,        -- 원가
    SUM(charged_cents) AS total_revenue_cents,  -- 매출
    SUM(margin_cents) AS total_margin_cents,    -- 마진
    ROUND(AVG(margin_cents)::numeric, 0) AS avg_margin_cents
FROM public.ai_usage_logs
WHERE status = 'success'
GROUP BY DATE_TRUNC('day', created_at), provider, model, type
ORDER BY day DESC;

-- ==============================
-- 완료!
-- ==============================
-- 다음 작업:
--   1) Supabase Dashboard > SQL Editor 에서 이 파일 실행
--   2) Edge Functions 배포 (functions/ai-generate-image 등)
--   3) Storage 버킷 sns-media 이미 설정됨 (변경 없음)
