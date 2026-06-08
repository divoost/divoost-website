-- ============================================================
-- HubOnTrade 상담/사전신청 폼 저장 테이블 + RLS
-- Supabase SQL Editor에서 실행하세요.
-- ⚠️ 보안 핵심: 익명(anon) INSERT만 허용, SELECT는 차단해야
--    개인정보(이름·이메일·전화) 유출을 막습니다.
-- ============================================================

create table if not exists public.inquiries (
  id          uuid primary key default gen_random_uuid(),
  company     text,
  name        text,
  email       text,
  phone       text,
  service     text,
  countries   text,
  message     text,
  source      text,
  created_at  timestamptz not null default now()
);

-- RLS 활성화
alter table public.inquiries enable row level security;

-- 익명 사용자는 INSERT만 가능 (폼 제출)
drop policy if exists "anon insert inquiries" on public.inquiries;
create policy "anon insert inquiries"
  on public.inquiries
  for insert
  to anon
  with check (true);

-- ⚠️ SELECT/UPDATE/DELETE 정책은 만들지 않습니다.
--    → anon 키로는 조회 불가 (개인정보 보호).
--    관리자는 Supabase 대시보드 또는 service_role 키로만 조회하세요.

-- (선택) 스팸 완화: 분당 과다 INSERT 방지는 Supabase 설정/엣지펑션에서 별도 적용 권장.
