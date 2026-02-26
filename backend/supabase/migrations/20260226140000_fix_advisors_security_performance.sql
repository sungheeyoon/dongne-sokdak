-- 1. 함수 보안 설정 (정상 작동)
ALTER FUNCTION public.update_updated_at_column() SET search_path = pg_catalog, public;
ALTER FUNCTION public.handle_new_user() SET search_path = pg_catalog, public;

-- 2. 이 부분은 에러가 나면 건너뛰어도 됩니다. (시스템 테이블이라 보안상 막혀있을 수 있음)
-- ALTER TABLE public.spatial_ref_sys DISABLE ROW LEVEL SECURITY; 

-- 3. 관리자 로그 RLS 설정 (정상 작동)
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role only" ON public.admin_activity_logs;
CREATE POLICY "Service role only" ON public.admin_activity_logs 
FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4. 사용하지 않는 인덱스 삭제
DROP INDEX IF EXISTS public.admin_logs_created_at_idx;

-- 5. RLS 성능 최적화 적용 (InitPlan 방식)

-- [profiles]
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((select auth.uid()) = id);

-- [reports]
DROP POLICY IF EXISTS "Authenticated users can create reports" ON public.reports;
CREATE POLICY "Authenticated users can create reports" ON public.reports FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own reports" ON public.reports;
CREATE POLICY "Users can update own reports" ON public.reports FOR UPDATE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own reports" ON public.reports;
CREATE POLICY "Users can delete own reports" ON public.reports FOR DELETE USING ((select auth.uid()) = user_id);

-- [comments]
DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.comments;
CREATE POLICY "Authenticated users can create comments" ON public.comments FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own comments" ON public.comments;
CREATE POLICY "Users can update own comments" ON public.comments FOR UPDATE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own comments" ON public.comments;
CREATE POLICY "Users can delete own comments" ON public.comments FOR DELETE USING ((select auth.uid()) = user_id);

-- [votes]
DROP POLICY IF EXISTS "Authenticated users can vote" ON public.votes;
CREATE POLICY "Authenticated users can vote" ON public.votes FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can remove own vote" ON public.votes;
CREATE POLICY "Users can remove own vote" ON public.votes FOR DELETE USING ((select auth.uid()) = user_id);