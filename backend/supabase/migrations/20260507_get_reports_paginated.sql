-- 20260507_get_reports_paginated.sql
-- Description: Adds a paginated report list function with vote and comment counts.
-- This solves the N+1 problem for the reports list.

CREATE OR REPLACE FUNCTION public.get_reports_paginated(
  category_filter TEXT DEFAULT NULL,
  status_filter TEXT DEFAULT NULL,
  user_id_filter UUID DEFAULT NULL,
  search_query TEXT DEFAULT NULL,
  result_page INT DEFAULT 1,
  result_limit INT DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  title TEXT,
  description TEXT,
  image_url TEXT,
  location GEOGRAPHY,
  address TEXT,
  category report_category,
  status report_status,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  vote_count BIGINT,
  comment_count BIGINT
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT 
    r.id,
    r.user_id,
    r.title,
    r.description,
    r.image_url,
    r.location,
    r.address,
    r.category,
    r.status,
    r.created_at,
    r.updated_at,
    (SELECT count(*) FROM public.votes v WHERE v.report_id = r.id) as vote_count,
    (SELECT count(*) FROM public.comments c WHERE c.report_id = r.id) as comment_count
  FROM public.reports r
  WHERE 
    (category_filter IS NULL OR r.category::text = category_filter)
    AND (status_filter IS NULL OR r.status::text = status_filter)
    AND (user_id_filter IS NULL OR r.user_id = user_id_filter)
    AND (search_query IS NULL OR r.title ILIKE '%' || search_query || '%' OR r.description ILIKE '%' || search_query || '%')
  ORDER BY r.created_at DESC
  OFFSET (result_page - 1) * result_limit
  LIMIT result_limit;
$$;

-- Function to count total reports with filters
CREATE OR REPLACE FUNCTION public.count_reports_paginated(
  category_filter TEXT DEFAULT NULL,
  status_filter TEXT DEFAULT NULL,
  user_id_filter UUID DEFAULT NULL,
  search_query TEXT DEFAULT NULL
)
RETURNS INT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT count(*)::int
  FROM public.reports r
  WHERE 
    (category_filter IS NULL OR r.category::text = category_filter)
    AND (status_filter IS NULL OR r.status::text = status_filter)
    AND (user_id_filter IS NULL OR r.user_id = user_id_filter)
    AND (search_query IS NULL OR r.title ILIKE '%' || search_query || '%' OR r.description ILIKE '%' || search_query || '%');
$$;
