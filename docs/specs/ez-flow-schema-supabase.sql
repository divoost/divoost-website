-- ============================================================================
-- ez-flow — Supabase 전용 보충 스크립트 (메인 스키마 이후 실행)
-- ----------------------------------------------------------------------------
-- 버전:     v1.0
-- 선행:     docs/specs/ez-flow-schema.sql 를 **먼저** 실행할 것
-- 대상:     Supabase (auth 스키마·anon/authenticated/service_role 롤 존재 전제)
-- 목적:     벤더 중립 메인 스키마에서 분리한 Supabase 고유 설정
--             (1) 회원가입 → public.users 프로필 자동 생성 트리거
--             (2) 권한(GRANT) 명시 + anon 하드닝
--
-- 실행 위치: Supabase SQL Editor (ez-flow 프로젝트)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. 회원가입 시 프로필 자동 생성 (auth.users → public.users)
-- ----------------------------------------------------------------------------
-- 메인 스키마의 public.users 는 auth.users 미러 프로필이다.
-- Supabase Auth로 가입하면 auth.users 행만 생기므로, 트리거로 public.users 를 채운다.
-- display_name/email 은 NOT NULL → 메타데이터 없으면 이메일 로컬파트로 폴백.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer
set search_path = public, auth
as $$
begin
  insert into public.users (id, display_name, email, avatar_url)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'display_name',''),
      nullif(new.raw_user_meta_data->>'name',''),
      nullif(split_part(coalesce(new.email,''),'@',1),''),
      'user'
    ),
    coalesce(new.email,''),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;   -- 재실행/중복 방지
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ----------------------------------------------------------------------------
-- 2. 권한 (GRANT) — 명시적 부여 + anon 하드닝
-- ----------------------------------------------------------------------------
-- Supabase는 기본적으로 public 스키마의 테이블 권한을 anon/authenticated/service_role
-- 에 부여하지만, 명시적으로 고정해 의도를 분명히 한다. 실제 방어선은 RLS(메인 §10).
--
-- 보안 설계(CLAUDE.md 원칙3, 기획서 §6):
--   - anon(미인증): 테넌트 데이터 접근 불가가 원칙. RLS default-deny가 막지만,
--     방어심층(defense-in-depth)으로 테이블 권한 자체를 회수한다.
--   - authenticated(로그인): CRUD 허용하되 RLS로 행 단위 통제.
--   - service_role: Edge Function 전용(RLS 우회) — 기본 전권.

grant usage on schema public to anon, authenticated, service_role;

-- authenticated: 테이블 CRUD (RLS가 행 단위 통제)
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- service_role: 전권 (Edge Function 서버 전용)
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- anon: 테넌트 테이블 권한 회수 (미인증은 접근 불가) — 하드닝
revoke all on all tables in schema public from anon;

-- 향후 생성될 테이블에도 동일 기본권한 적용
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant all on tables to service_role;
alter default privileges in schema public
  revoke all on tables from anon;

-- 헬퍼 함수 실행 권한 (RLS 정책이 내부 호출 — security definer라 소유자 권한으로 실행)
grant execute on function public.is_ws_member(uuid)        to authenticated;
grant execute on function public.ws_role(uuid)             to authenticated;
grant execute on function public.can_access_project(uuid)  to authenticated;
grant execute on function public.is_channel_member(uuid)   to authenticated;

-- ----------------------------------------------------------------------------
-- 참고: notifications INSERT는 정책이 없어 클라이언트 차단(메인 §10.3).
--       알림 생성은 service_role(Edge Function notify-dispatch)이 수행.
-- ============================================================================
