-- 20260721_shared_spatial_filter_core.sql
-- Description: Extracts the category/search filter predicate shared by the
-- nearby-query and bounds-query get/count RPC pairs into a single SQL helper
-- function, so the four functions can no longer drift from each other.
-- Signatures are unchanged (CREATE OR REPLACE only) — see ADR-0004.
-- Spatial predicates (&&, ST_DWithin, ST_MakeEnvelope) stay inline in each
-- function's WHERE clause so GiST index pushdown is unaffected.
-- get/count_reports_paginated are out of scope: they carry no spatial
-- predicate and filter on status/user_id in addition to category/search
-- (see CONTEXT.md — "일반 목록 페이지네이션" is not a Map Query).

CREATE OR REPLACE FUNCTION public.report_matches_filters(
  r public.reports,
  category_filter TEXT,
  search_query TEXT
)
RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE
AS $$
  SELECT
    (category_filter IS NULL OR r.category::text = category_filter)
    AND (search_query IS NULL OR r.title ILIKE '%' || search_query || '%' OR r.description ILIKE '%' || search_query || '%')
$$;

-- get_reports_within_radius
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
    AND public.report_matches_filters(r, category_filter, search_query)
  ORDER BY r.created_at DESC
  OFFSET result_offset
  LIMIT result_limit;
$$;

-- count_reports_within_radius
CREATE OR REPLACE FUNCTION public.count_reports_within_radius(
  target_lat FLOAT,
  target_lng FLOAT,
  radius_meters FLOAT,
  category_filter TEXT DEFAULT NULL,
  search_query TEXT DEFAULT NULL
)
RETURNS INT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT count(*)::int
  FROM public.reports r
  WHERE
    r.location && ST_Expand(ST_MakePoint(target_lng, target_lat), radius_meters / 111320.0)::geography
    AND ST_DWithin(r.location, ST_MakePoint(target_lng, target_lat)::geography, radius_meters)
    AND public.report_matches_filters(r, category_filter, search_query);
$$;

-- get_reports_in_bounds
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
    AND public.report_matches_filters(r, category_filter, search_query)
  ORDER BY r.created_at DESC
  OFFSET result_offset
  LIMIT result_limit;
$$;

-- count_reports_in_bounds
CREATE OR REPLACE FUNCTION public.count_reports_in_bounds(
  north FLOAT,
  south FLOAT,
  east FLOAT,
  west FLOAT,
  category_filter TEXT DEFAULT NULL,
  search_query TEXT DEFAULT NULL
)
RETURNS INT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT count(*)::int
  FROM public.reports r
  WHERE
    r.location && ST_MakeEnvelope(west, south, east, north, 4326)::geography
    AND public.report_matches_filters(r, category_filter, search_query);
$$;
