-- Function 1: get_reports_within_radius (updated to include offset)
CREATE OR REPLACE FUNCTION public.get_reports_within_radius(
  target_lat FLOAT,
  target_lng FLOAT,
  radius_meters FLOAT,
  category_filter TEXT DEFAULT NULL,
  search_query TEXT DEFAULT NULL,
  result_offset INT DEFAULT 0,
  result_limit INT DEFAULT 50
)
RETURNS SETOF public.reports
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT *
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

-- Function 1.1: count_reports_within_radius (returns INT)
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
    AND (category_filter IS NULL OR r.category::text = category_filter)
    AND (search_query IS NULL OR r.title ILIKE '%' || search_query || '%' OR r.description ILIKE '%' || search_query || '%');
$$;

-- Function 2: get_reports_in_bounds (updated to include offset)
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
RETURNS SETOF public.reports
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT *
  FROM public.reports r
  WHERE 
    r.location && ST_MakeEnvelope(west, south, east, north, 4326)::geography
    AND (category_filter IS NULL OR r.category::text = category_filter)
    AND (search_query IS NULL OR r.title ILIKE '%' || search_query || '%' OR r.description ILIKE '%' || search_query || '%')
  ORDER BY r.created_at DESC
  OFFSET result_offset
  LIMIT result_limit;
$$;

-- Function 2.1: count_reports_in_bounds (returns INT)
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
    AND (category_filter IS NULL OR r.category::text = category_filter)
    AND (search_query IS NULL OR r.title ILIKE '%' || search_query || '%' OR r.description ILIKE '%' || search_query || '%');
$$;
