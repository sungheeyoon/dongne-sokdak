-- 20260724_optimize_bounds_filter_inlining.sql
-- Keep the optional category/search predicates inside the active bounds RPC.
-- A live EXPLAIN showed that calling the shared row-level filter function for
-- every spatial candidate prevented PostgreSQL from simplifying NULL filters.

CREATE OR REPLACE FUNCTION public.get_reports_in_bounds_page(
  north FLOAT,
  south FLOAT,
  east FLOAT,
  west FLOAT,
  category_filter TEXT DEFAULT NULL,
  search_query TEXT DEFAULT NULL,
  result_offset INT DEFAULT 0,
  result_limit INT DEFAULT 100
)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, extensions
AS $$
  WITH page_reports AS (
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
      (SELECT count(*) FROM public.votes v WHERE v.report_id = r.id) AS vote_count,
      (SELECT count(*) FROM public.comments c WHERE c.report_id = r.id) AS comment_count
    FROM public.reports r
    WHERE
      r.location && ST_MakeEnvelope(west, south, east, north, 4326)::geography
      AND (category_filter IS NULL OR r.category::text = category_filter)
      AND (
        search_query IS NULL
        OR r.title ILIKE '%' || search_query || '%'
        OR r.description ILIKE '%' || search_query || '%'
      )
    ORDER BY r.created_at DESC
    OFFSET GREATEST(result_offset, 0)
    LIMIT GREATEST(result_limit, 0)
  )
  SELECT jsonb_build_object(
    'items',
    COALESCE(
      (
        SELECT jsonb_agg(to_jsonb(page_report) ORDER BY page_report.created_at DESC)
        FROM page_reports page_report
      ),
      '[]'::jsonb
    ),
    'total_count',
    (
      SELECT count(*)
      FROM public.reports r
      WHERE
        r.location && ST_MakeEnvelope(west, south, east, north, 4326)::geography
        AND (category_filter IS NULL OR r.category::text = category_filter)
        AND (
          search_query IS NULL
          OR r.title ILIKE '%' || search_query || '%'
          OR r.description ILIKE '%' || search_query || '%'
        )
    )
  );
$$;

COMMENT ON FUNCTION public.get_reports_in_bounds_page(
  FLOAT, FLOAT, FLOAT, FLOAT, TEXT, TEXT, INT, INT
) IS 'Returns a bounds-filtered report page and total count with inline optional filters.';
