-- 20260508_update_spatial_rpcs_with_counts.sql
-- Description: Updates get_reports_within_radius and get_reports_in_bounds to include vote and comment counts.

-- Drop existing functions first because we are changing the return type (adding columns)
DROP FUNCTION IF EXISTS public.get_reports_within_radius(FLOAT, FLOAT, FLOAT, TEXT, TEXT, INT, INT);
DROP FUNCTION IF EXISTS public.get_reports_in_bounds(FLOAT, FLOAT, FLOAT, FLOAT, TEXT, TEXT, INT, INT);

-- Function 1: get_reports_within_radius (updated to include counts)
CREATE OR REPLACE FUNCTION public.get_reports_within_radius(
  target_lat FLOAT,
  target_lng FLOAT,
  radius_meters FLOAT,
  category_filter TEXT DEFAULT NULL,
  search_query TEXT DEFAULT NULL,
  result_offset INT DEFAULT 0,
  result_limit INT DEFAULT 50
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
  distance_meters FLOAT,
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
    ST_Distance(r.location, ST_MakePoint(target_lng, target_lat)::geography) as distance_meters,
    (SELECT count(*) FROM public.votes v WHERE v.report_id = r.id) as vote_count,
    (SELECT count(*) FROM public.comments c WHERE c.report_id = r.id) as comment_count
  FROM public.reports r
  WHERE 
    r.location && ST_Expand(ST_MakePoint(target_lng, target_lat), radius_meters / 111320.0)::geography
    AND ST_DWithin(r.location, ST_MakePoint(target_lng, target_lat)::geography, radius_meters)
    AND (category_filter IS NULL OR r.category::text = category_filter)
    AND (search_query IS NULL OR r.title ILIKE '%' || search_query || '%' OR r.description ILIKE '%' || search_query || '%')
  ORDER BY r.created_at DESC
  OFFSET result_offset
  LIMIT result_limit;
$$;

-- Function 2: get_reports_in_bounds (updated to include counts)
CREATE OR REPLACE FUNCTION public.get_reports_in_bounds(
  north FLOAT,
  south FLOAT,
  east FLOAT,
  west FLOAT,
  category_filter TEXT DEFAULT NULL,
  search_query TEXT DEFAULT NULL,
  result_offset INT DEFAULT 0,
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
    r.location && ST_MakeEnvelope(west, south, east, north, 4326)::geography
    AND (category_filter IS NULL OR r.category::text = category_filter)
    AND (search_query IS NULL OR r.title ILIKE '%' || search_query || '%' OR r.description ILIKE '%' || search_query || '%')
  ORDER BY r.created_at DESC
  OFFSET result_offset
  LIMIT result_limit;
$$;
