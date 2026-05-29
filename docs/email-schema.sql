-- ═══════════════════════════════════════════════════════════════
-- 이메일 자동 발송 시스템 - DB 스키마
-- ═══════════════════════════════════════════════════════════════
-- 사용법: Supabase SQL Editor에서 실행
-- ═══════════════════════════════════════════════════════════════

-- 1) 이메일 템플릿 테이블
CREATE TABLE IF NOT EXISTS public.email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,  -- 'welcome', 'password_reset', 'notice' 등
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT,
    variables JSONB DEFAULT '[]'::jsonb,  -- ['name', 'email'] 등
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2) 이메일 발송 큐/이력
CREATE TABLE IF NOT EXISTS public.email_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_key TEXT,
    to_email TEXT NOT NULL,
    to_name TEXT,
    subject TEXT NOT NULL,
    body_html TEXT,
    body_text TEXT,
    variables JSONB,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
    error_message TEXT,
    provider TEXT,  -- 'supabase', 'resend', 'sendgrid' 등
    provider_message_id TEXT,
    sent_at TIMESTAMPTZ,
    scheduled_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_queue_status ON public.email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_to_email ON public.email_queue(to_email);
CREATE INDEX IF NOT EXISTS idx_email_queue_created_at ON public.email_queue(created_at DESC);

-- 3) 사용자 알림 설정
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email_notice BOOLEAN DEFAULT TRUE,           -- 공지사항
    email_marketing BOOLEAN DEFAULT FALSE,        -- 마케팅
    email_security BOOLEAN DEFAULT TRUE,          -- 보안 알림
    email_post_success BOOLEAN DEFAULT TRUE,      -- 발행 성공
    email_post_failure BOOLEAN DEFAULT TRUE,      -- 발행 실패
    email_comment_received BOOLEAN DEFAULT TRUE,  -- 댓글 알림
    email_weekly_report BOOLEAN DEFAULT TRUE,     -- 주간 리포트
    push_enabled BOOLEAN DEFAULT FALSE,
    sms_enabled BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4) RLS 정책
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anyone_view_active_templates" ON public.email_templates;
CREATE POLICY "anyone_view_active_templates" ON public.email_templates
    FOR SELECT USING (is_active = TRUE);
DROP POLICY IF EXISTS "admins_manage_templates" ON public.email_templates;
CREATE POLICY "admins_manage_templates" ON public.email_templates
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_view_own_emails" ON public.email_queue;
CREATE POLICY "users_view_own_emails" ON public.email_queue
    FOR SELECT TO authenticated
    USING (
        to_email = (SELECT email FROM auth.users WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );
DROP POLICY IF EXISTS "admins_manage_email_queue" ON public.email_queue;
CREATE POLICY "admins_manage_email_queue" ON public.email_queue
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_manage_own_prefs" ON public.notification_preferences;
CREATE POLICY "users_manage_own_prefs" ON public.notification_preferences
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "admins_view_all_prefs" ON public.notification_preferences;
CREATE POLICY "admins_view_all_prefs" ON public.notification_preferences
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

-- 5) 기본 이메일 템플릿 삽입
INSERT INTO public.email_templates (key, name, subject, body_html, body_text, variables) VALUES
('welcome', '회원가입 환영',
'🎉 {{platform_name}}에 오신 것을 환영합니다!',
'<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
<h1 style="color:#3b82f6">안녕하세요, {{name}}님!</h1>
<p>{{platform_name}}에 가입해주셔서 감사합니다.</p>
<p>이제 7개 SNS 채널을 통합 관리하실 수 있습니다.</p>
<a href="{{site_url}}" style="display:inline-block;padding:12px 24px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;margin:20px 0">시작하기 →</a>
<p style="color:#94a3b8;font-size:12px;margin-top:40px">— DIVOOST SNS 콘텐츠 플랫폼 팀</p>
</div>',
'안녕하세요 {{name}}님, {{platform_name}}에 오신 것을 환영합니다!',
'["name", "platform_name", "site_url"]'::jsonb),

('notice', '공지사항',
'📢 [{{platform_name}}] {{title}}',
'<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
<h1 style="color:#3b82f6">📢 공지사항</h1>
<h2>{{title}}</h2>
<div style="line-height:1.7;color:#334155">{{body}}</div>
<p style="color:#94a3b8;font-size:12px;margin-top:40px">— DIVOOST SNS 콘텐츠 플랫폼 팀</p>
</div>',
'{{title}} - {{body}}',
'["title", "body", "platform_name"]'::jsonb),

('post_success', '발행 성공 알림',
'✅ {{channel}} 게시물 발행 완료',
'<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
<h1 style="color:#10b981">✅ 발행 완료!</h1>
<p>{{name}}님의 게시물이 {{channel}}에 성공적으로 발행되었습니다.</p>
<div style="background:#f0fdf4;padding:14px;border-radius:8px;border-left:4px solid #10b981;margin:20px 0">
<strong>제목:</strong> {{post_title}}<br>
<strong>채널:</strong> {{channel}}<br>
<strong>시간:</strong> {{post_time}}
</div>
<a href="{{post_url}}" style="display:inline-block;padding:10px 20px;background:#10b981;color:#fff;text-decoration:none;border-radius:6px">게시물 보기 →</a>
</div>',
'{{name}}님의 게시물이 {{channel}}에 발행되었습니다.',
'["name", "channel", "post_title", "post_time", "post_url"]'::jsonb),

('post_failure', '발행 실패 알림',
'❌ {{channel}} 게시물 발행 실패',
'<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
<h1 style="color:#dc2626">❌ 발행 실패</h1>
<p>{{name}}님의 게시물 발행에 실패했습니다.</p>
<div style="background:#fef2f2;padding:14px;border-radius:8px;border-left:4px solid #dc2626;margin:20px 0">
<strong>제목:</strong> {{post_title}}<br>
<strong>채널:</strong> {{channel}}<br>
<strong>실패 사유:</strong> {{error_message}}
</div>
<p>설정에서 SNS 연결 상태를 확인해주세요.</p>
</div>',
'발행 실패: {{error_message}}',
'["name", "channel", "post_title", "error_message"]'::jsonb),

('weekly_report', '주간 리포트',
'📊 {{name}}님의 주간 활동 리포트',
'<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
<h1 style="color:#3b82f6">📊 이번 주 활동 리포트</h1>
<p>{{name}}님, 이번 주 활동 요약입니다.</p>
<table style="width:100%;border-collapse:collapse;margin:20px 0">
<tr><td style="padding:10px;border-bottom:1px solid #e2e8f0">📤 총 발행 수</td><td style="padding:10px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:bold">{{total_posts}}건</td></tr>
<tr><td style="padding:10px;border-bottom:1px solid #e2e8f0">❤️ 받은 좋아요</td><td style="padding:10px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:bold">{{total_likes}}개</td></tr>
<tr><td style="padding:10px;border-bottom:1px solid #e2e8f0">💬 받은 댓글</td><td style="padding:10px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:bold">{{total_comments}}개</td></tr>
<tr><td style="padding:10px">👁 조회수</td><td style="padding:10px;text-align:right;font-weight:bold">{{total_views}}회</td></tr>
</table>
<a href="{{site_url}}/pages/analytics.html" style="display:inline-block;padding:10px 20px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:6px">상세 분석 보기 →</a>
</div>',
'주간 리포트: 발행 {{total_posts}}건',
'["name", "total_posts", "total_likes", "total_comments", "total_views", "site_url"]'::jsonb),

('security_alert', '보안 알림',
'🔐 [보안 알림] {{event_type}}',
'<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
<h1 style="color:#dc2626">🔐 보안 알림</h1>
<p>{{name}}님의 계정에서 다음 활동이 감지되었습니다.</p>
<div style="background:#fef2f2;padding:14px;border-radius:8px;border-left:4px solid #dc2626;margin:20px 0">
<strong>이벤트:</strong> {{event_type}}<br>
<strong>시간:</strong> {{event_time}}<br>
<strong>IP 주소:</strong> {{ip_address}}<br>
<strong>위치:</strong> {{location}}
</div>
<p>본인이 한 활동이 아니라면 즉시 비밀번호를 변경해주세요.</p>
<a href="{{site_url}}/pages/settings.html" style="display:inline-block;padding:10px 20px;background:#dc2626;color:#fff;text-decoration:none;border-radius:6px">계정 보안 확인 →</a>
</div>',
'{{event_type}} - {{event_time}}',
'["name", "event_type", "event_time", "ip_address", "location", "site_url"]'::jsonb)

ON CONFLICT (key) DO NOTHING;

-- 6) 트리거: 신규 가입 시 notification_preferences 자동 생성
CREATE OR REPLACE FUNCTION public.handle_new_user_notification_prefs()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notification_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_user_created_notification_prefs ON auth.users;
CREATE TRIGGER on_user_created_notification_prefs
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_notification_prefs();

-- 기존 사용자들에게도 알림 설정 생성
INSERT INTO public.notification_preferences (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- 확인
SELECT 'email_templates' AS table_name, COUNT(*) AS count FROM public.email_templates
UNION ALL
SELECT 'notification_preferences', COUNT(*) FROM public.notification_preferences
UNION ALL
SELECT 'email_queue', COUNT(*) FROM public.email_queue;
