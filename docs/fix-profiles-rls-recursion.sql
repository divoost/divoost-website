-- ============================================================
-- profiles RLS 무한재귀(500) 수정
-- ------------------------------------------------------------
-- 문제: admins_can_view_all_profiles 정책이 profiles 안에서 다시 profiles를
--       조회해 무한재귀 → 본인 프로필 조회조차 500(infinite recursion detected).
-- 해결: SECURITY DEFINER 함수 is_admin()으로 역할 확인(RLS 우회) → 재귀 제거.
-- 실행: Supabase SQL Editor에 전체 붙여넣고 Run. 재실행해도 안전(멱등).
-- ============================================================

-- 역할 확인 함수: 함수 소유자 권한으로 실행되어 profiles RLS를 타지 않음(재귀 차단)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;

-- 재귀 정책을 함수 기반으로 교체
DROP POLICY IF EXISTS "admins_can_view_all_profiles" ON public.profiles;
CREATE POLICY "admins_can_view_all_profiles" ON public.profiles
    FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "admins_can_update_profiles" ON public.profiles;
CREATE POLICY "admins_can_update_profiles" ON public.profiles
    FOR UPDATE USING (public.is_admin());

-- 확인용: 본인 프로필 조회가 되는지 (에러 없이 1행 또는 0행)
-- SELECT id, role FROM public.profiles WHERE id = auth.uid();
