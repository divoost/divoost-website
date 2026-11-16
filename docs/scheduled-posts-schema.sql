-- ============================================================
-- 예약 발행 (Scheduled Publishing) 스키마
-- ------------------------------------------------------------
-- 목적: 브라우저가 꺼져 있어도 예약 시각에 서버(크론)가 자동 발행.
-- 보안(마스터 승인 A안): SNS 액세스 토큰을 서버 DB에 저장하되
--   - RLS: 본인 데이터만 접근
--   - 토큰은 Edge Function이 AES-GCM으로 암호화한 "암호문"만 저장
--     (암호화 키 TOKEN_ENC_KEY는 Edge Function 환경변수에만 존재, DB엔 없음)
--   - 복호화는 service_role + 환경 키를 가진 Edge Function에서만 가능
-- 실행: Supabase SQL Editor에 이 파일 전체 붙여넣고 실행.
-- ============================================================

-- 공통 updated_at 트리거 함수 (없으면 생성)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 1) 소셜 계정 (서버 저장 토큰)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.social_accounts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel       TEXT NOT NULL CHECK (channel IN ('facebook','instagram','tiktok')),
  account_label TEXT,                              -- 사용자 표시용 이름
  account_ref   TEXT,                              -- FB page_id / IG business_account_id / TikTok open_id
  access_token_enc TEXT NOT NULL,                  -- AES-GCM 암호문(base64 "iv.cipher"); 평문 저장 금지
  token_expires_at TIMESTAMPTZ,                    -- 토큰 만료 (FB 장기토큰 ~60일)
  metadata      JSONB DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, channel, account_ref)
);

CREATE INDEX IF NOT EXISTS idx_social_accounts_user ON public.social_accounts(user_id, channel);

DROP TRIGGER IF EXISTS trg_social_accounts_updated ON public.social_accounts;
CREATE TRIGGER trg_social_accounts_updated
  BEFORE UPDATE ON public.social_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 2) 예약 게시물
-- ============================================================
CREATE TABLE IF NOT EXISTS public.scheduled_posts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channels      TEXT[] NOT NULL DEFAULT '{}',      -- ['facebook','instagram']
  content       TEXT NOT NULL DEFAULT '',
  media         JSONB DEFAULT '[]'::jsonb,         -- [{type:'image'|'video', url:'<공개 Storage URL>'}]
  scheduled_at  TIMESTAMPTZ NOT NULL,              -- 발행 예약 시각(UTC 저장)
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','processing','published','failed','canceled')),
  attempts      INT NOT NULL DEFAULT 0,
  max_attempts  INT NOT NULL DEFAULT 3,
  last_error    TEXT,
  result        JSONB DEFAULT '{}'::jsonb,         -- 채널별 발행 결과(post id/url)
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 크론이 "지금 발행할 것"을 빨리 찾도록: 대기 + 시각 인덱스
CREATE INDEX IF NOT EXISTS idx_scheduled_due
  ON public.scheduled_posts(scheduled_at)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_scheduled_user
  ON public.scheduled_posts(user_id, scheduled_at DESC);

DROP TRIGGER IF EXISTS trg_scheduled_posts_updated ON public.scheduled_posts;
CREATE TRIGGER trg_scheduled_posts_updated
  BEFORE UPDATE ON public.scheduled_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 3) RLS (본인 데이터만)
-- ============================================================
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;

-- social_accounts: 본인만 조회/삽입/수정/삭제.
-- (토큰은 암호문이라 설령 조회돼도 키 없이는 무의미. 쓰기는 Edge Function 경유 권장)
DROP POLICY IF EXISTS "sa_select_own" ON public.social_accounts;
CREATE POLICY "sa_select_own" ON public.social_accounts
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "sa_insert_own" ON public.social_accounts;
CREATE POLICY "sa_insert_own" ON public.social_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "sa_update_own" ON public.social_accounts;
CREATE POLICY "sa_update_own" ON public.social_accounts
  FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "sa_delete_own" ON public.social_accounts;
CREATE POLICY "sa_delete_own" ON public.social_accounts
  FOR DELETE USING (auth.uid() = user_id);

-- scheduled_posts: 본인만 CRUD
DROP POLICY IF EXISTS "sp_select_own" ON public.scheduled_posts;
CREATE POLICY "sp_select_own" ON public.scheduled_posts
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "sp_insert_own" ON public.scheduled_posts;
CREATE POLICY "sp_insert_own" ON public.scheduled_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "sp_update_own" ON public.scheduled_posts;
CREATE POLICY "sp_update_own" ON public.scheduled_posts
  FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "sp_delete_own" ON public.scheduled_posts;
CREATE POLICY "sp_delete_own" ON public.scheduled_posts
  FOR DELETE USING (auth.uid() = user_id);

-- service_role(Edge Function)은 RLS 우회라 별도 정책 불필요.
-- 클라이언트에 토큰 컬럼을 숨기고 싶으면 아래 안전 뷰로 목록 조회:
CREATE OR REPLACE VIEW public.social_accounts_safe AS
  SELECT id, user_id, channel, account_label, account_ref,
         token_expires_at, metadata, created_at, updated_at
  FROM public.social_accounts;

-- ============================================================
-- 4) pg_cron 등록 (선택: Supabase Dashboard > Database > Extensions 에서 pg_cron 활성화 후)
-- ------------------------------------------------------------
-- 1분마다 publish-scheduled Edge Function 호출. <PROJECT_REF>와 <CRON_SECRET>는 실제값으로 교체.
-- (CRON_SECRET은 Edge Function 환경변수와 동일해야 함 — 무단 호출 방지)
--
-- SELECT cron.schedule(
--   'publish-scheduled-every-min',
--   '* * * * *',
--   $$
--   SELECT net.http_post(
--     url := 'https://<PROJECT_REF>.supabase.co/functions/v1/publish-scheduled',
--     headers := jsonb_build_object('Content-Type','application/json','x-cron-secret','<CRON_SECRET>'),
--     body := '{}'::jsonb
--   );
--   $$
-- );
-- ============================================================
