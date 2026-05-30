-- ═══════════════════════════════════════════════════════════════════
-- DIVOOST SNS 플랫폼 - Supabase Admin DB Schema
-- ═══════════════════════════════════════════════════════════════════
-- 사용법:
-- 1. Supabase Dashboard → SQL Editor 에서 이 파일을 실행
-- 2. 본인 계정에 admin role 부여 (아래 마지막 부분 참고)
-- ═══════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────
-- 1) profiles 테이블: 사용자 프로필 (auth.users 보강)
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    plan TEXT DEFAULT 'trial' CHECK (plan IN ('trial', 'pro', 'enterprise')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
    sns_connected JSONB DEFAULT '[]'::jsonb,
    total_posts INTEGER DEFAULT 0,
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 자동 프로필 생성 트리거 (회원가입 시)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ──────────────────────────────────────────────────────────────────
-- 2) activity_logs: 사용자 활동 로그
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT,
    action_type TEXT NOT NULL,
    action_detail TEXT,
    target TEXT,
    ip_address TEXT,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON public.activity_logs(action_type);

-- ──────────────────────────────────────────────────────────────────
-- 3) sns_posts: 사용자 발행 이력
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sns_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT,
    content TEXT,
    channels JSONB DEFAULT '[]'::jsonb,
    published_to JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'failed')),
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    has_media BOOLEAN DEFAULT FALSE,
    scheduled_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sns_posts_user_id ON public.sns_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_sns_posts_created_at ON public.sns_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sns_posts_status ON public.sns_posts(status);

-- ──────────────────────────────────────────────────────────────────
-- 4) reports: 신고 접수
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    target_post_id UUID REFERENCES public.sns_posts(id) ON DELETE SET NULL,
    report_type TEXT CHECK (report_type IN ('spam', 'abuse', 'copyright', 'fake', 'other')),
    reason TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'rejected', 'escalated')),
    resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────────
-- 5) notices: 관리자 공지
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT DEFAULT 'general' CHECK (type IN ('general', 'update', 'event', 'urgent')),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    target_plan TEXT DEFAULT 'all',
    sent_to_count INTEGER DEFAULT 0,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────────
-- 6) audit_logs: 관리자 작업 감사 로그 (변경 불가)
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    admin_email TEXT NOT NULL,
    action TEXT NOT NULL,
    severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warn', 'critical')),
    target TEXT,
    ip_address TEXT,
    success BOOLEAN DEFAULT TRUE,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON public.audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- ──────────────────────────────────────────────────────────────────
-- 7) api_usage: API 호출 통계
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.api_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    platform TEXT NOT NULL,
    endpoint TEXT,
    method TEXT,
    status_code INTEGER,
    latency_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_usage_user_id ON public.api_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_platform ON public.api_usage(platform);
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON public.api_usage(created_at DESC);

-- ═══════════════════════════════════════════════════════════════════
-- Row Level Security (RLS) 정책
-- ═══════════════════════════════════════════════════════════════════

-- profiles 활성화
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 본인 프로필 읽기/수정 가능
DROP POLICY IF EXISTS "users_can_view_own_profile" ON public.profiles;
CREATE POLICY "users_can_view_own_profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "users_can_update_own_profile" ON public.profiles;
CREATE POLICY "users_can_update_own_profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- 관리자는 모든 프로필 읽기 가능
DROP POLICY IF EXISTS "admins_can_view_all_profiles" ON public.profiles;
CREATE POLICY "admins_can_view_all_profiles" ON public.profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

-- 관리자는 프로필 수정 가능
DROP POLICY IF EXISTS "admins_can_update_profiles" ON public.profiles;
CREATE POLICY "admins_can_update_profiles" ON public.profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

-- activity_logs RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_can_insert_own_activity" ON public.activity_logs;
CREATE POLICY "users_can_insert_own_activity" ON public.activity_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "users_view_own_activity" ON public.activity_logs;
CREATE POLICY "users_view_own_activity" ON public.activity_logs
    FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "admins_view_all_activity" ON public.activity_logs;
CREATE POLICY "admins_view_all_activity" ON public.activity_logs
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- sns_posts RLS
ALTER TABLE public.sns_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_manage_own_posts" ON public.sns_posts;
CREATE POLICY "users_manage_own_posts" ON public.sns_posts
    FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "admins_view_all_posts" ON public.sns_posts;
CREATE POLICY "admins_view_all_posts" ON public.sns_posts
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- reports RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anyone_can_report" ON public.reports;
CREATE POLICY "anyone_can_report" ON public.reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);
DROP POLICY IF EXISTS "admins_manage_reports" ON public.reports;
CREATE POLICY "admins_manage_reports" ON public.reports
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- notices RLS
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anyone_can_read_notices" ON public.notices;
CREATE POLICY "anyone_can_read_notices" ON public.notices
    FOR SELECT USING (true);
DROP POLICY IF EXISTS "admins_create_notices" ON public.notices;
CREATE POLICY "admins_create_notices" ON public.notices
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- audit_logs RLS (관리자만 조회/생성)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins_view_audit_logs" ON public.audit_logs;
CREATE POLICY "admins_view_audit_logs" ON public.audit_logs
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );
DROP POLICY IF EXISTS "admins_create_audit_logs" ON public.audit_logs;
CREATE POLICY "admins_create_audit_logs" ON public.audit_logs
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- api_usage RLS
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_insert_own_usage" ON public.api_usage;
CREATE POLICY "users_insert_own_usage" ON public.api_usage
    FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "users_view_own_usage" ON public.api_usage;
CREATE POLICY "users_view_own_usage" ON public.api_usage
    FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "admins_view_all_usage" ON public.api_usage;
CREATE POLICY "admins_view_all_usage" ON public.api_usage
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- ═══════════════════════════════════════════════════════════════════
-- 관리자 권한 부여 (실행자가 수동으로 변경!)
-- ═══════════════════════════════════════════════════════════════════
-- 본인 이메일을 관리자로 설정:
-- UPDATE public.profiles SET role = 'super_admin' WHERE email = 'ezwebpia001@gmail.com';

-- ═══════════════════════════════════════════════════════════════════
-- 기존 사용자 프로필 생성 (이미 가입한 사람들)
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO public.profiles (id, email, full_name)
SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', email)
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;
