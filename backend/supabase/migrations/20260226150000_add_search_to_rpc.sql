-- Function 1: get_reports_within_radius (updated to include search_query)
CREATE OR REPLACE FUNCTION public.get_reports_within_radius(
  target_lat FLOAT,
  target_lng FLOAT,
  radius_meters FLOAT,
  category_filter TEXT DEFAULT NULL,
  search_query TEXT DEFAULT NULL,
  result_limit INT DEFAULT 50
)
RETURNS SETOF public.reports
LANGUAGE sql STABLE SECURITY DEFINER -- Inlining + RLS overhead removal
SET search_path = public, extensions
AS $$
  SELECT *
  FROM public.reports r
  WHERE 
    -- 1. && 연산자로 BBox 인덱스 강제 사용 (ST_DWithin보다 가벼운 1차 필터링)
    -- ST_Expand requires geometry, so we apply it to geometry first, then cast to geography
    r.location && ST_Expand(ST_MakePoint(target_lng, target_lat), radius_meters / 111320.0)::geography
    -- 2. 정확한 거리 필터링
    AND ST_DWithin(r.location, ST_MakePoint(target_lng, target_lat)::geography, radius_meters)
    -- 3. 카테고리 필터 (Inlining 덕분에 최적화됨)
    AND (category_filter IS NULL OR r.category::text = category_filter)
    -- 4. 검색어 필터 추가
    AND (search_query IS NULL OR r.title ILIKE '%' || search_query || '%' OR r.description ILIKE '%' || search_query || '%')
  ORDER BY r.created_at DESC
  LIMIT result_limit;
$$;

-- Function 2: get_reports_in_bounds (updated to include search_query)
CREATE OR REPLACE FUNCTION public.get_reports_in_bounds(
  north FLOAT,
  south FLOAT,
  east FLOAT,
  west FLOAT,
  category_filter TEXT DEFAULT NULL,
  search_query TEXT DEFAULT NULL,
  result_limit INT DEFAULT 100
)
RETURNS SETOF public.reports
LANGUAGE sql STABLE SECURITY DEFINER -- Inlining + RLS overhead removal
SET search_path = public, extensions
AS $$
  SELECT *
  FROM public.reports r
  WHERE 
    -- && 연산자로 BBox 인덱스 강제 사용
    -- Geography 인덱스를 타게 하기 위해 ST_MakeEnvelope를 Geography로 캐스팅
    r.location && ST_MakeEnvelope(west, south, east, north, 4326)::geography
    AND (category_filter IS NULL OR r.category::text = category_filter)
    -- 검색어 필터 추가
    AND (search_query IS NULL OR r.title ILIKE '%' || search_query || '%' OR r.description ILIKE '%' || search_query || '%')
  ORDER BY r.created_at DESC
  LIMIT result_limit;
$$;
