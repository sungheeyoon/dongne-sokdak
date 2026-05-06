-- 20260508_get_admin_dashboard_stats.sql
-- Description: Adds a function to get admin dashboard statistics in a single call.

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS JSON
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT json_build_object(
    'total_users', (SELECT count(*) FROM public.profiles),
    'active_users', (SELECT count(*) FROM public.profiles WHERE is_active = true),
    'admin_count', (SELECT count(*) FROM public.profiles WHERE role = 'admin'),
    'moderator_count', (SELECT count(*) FROM public.profiles WHERE role = 'moderator'),
    'today_users', (SELECT count(*) FROM public.profiles WHERE created_at >= CURRENT_DATE),
    'recent_logins', (SELECT count(*) FROM public.profiles WHERE last_login_at >= CURRENT_DATE - INTERVAL '7 days'),
    'open_reports', (SELECT count(*) FROM public.reports WHERE status = 'OPEN'),
    'resolved_reports', (SELECT count(*) FROM public.reports WHERE status = 'RESOLVED'),
    'today_reports', (SELECT count(*) FROM public.reports WHERE created_at >= CURRENT_DATE),
    'today_comments', (SELECT count(*) FROM public.comments WHERE created_at >= CURRENT_DATE),
    'today_votes', (SELECT count(*) FROM public.votes WHERE created_at >= CURRENT_DATE),
    'today_admin_actions', (SELECT count(*) FROM public.admin_activity_logs WHERE created_at >= CURRENT_DATE)
  );
$$;
