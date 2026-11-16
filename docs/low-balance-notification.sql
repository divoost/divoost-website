-- ============================================================
-- 잔액 부족 알림 설정 컬럼 추가
-- ------------------------------------------------------------
-- AI 생성 Edge Function이 차감 후 잔액이 임계값 미만이면 이메일 알림.
-- 사용자가 끌 수 있도록 notification_preferences에 email_low_balance 추가.
-- 실행: Supabase SQL Editor (email-schema.sql 이후).
-- ============================================================

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS email_low_balance BOOLEAN DEFAULT TRUE;  -- 크레딧 잔액 부족 알림

COMMENT ON COLUMN public.notification_preferences.email_low_balance IS '크레딧 잔액 부족 시 이메일 알림(기본 ON)';
