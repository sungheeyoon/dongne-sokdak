-- 20260220_postgis_rpc.sql
-- Description: Adds PostGIS RPC functions for fast spatial queries.

-- Function 1: get_reports_within_radius
-- Finds reports within a given radius (meters) using ST_DWithin on GEOGRAPHY.
CREATE OR REPLACE FUNCTION public.get_reports_within_radius(
  target_lat FLOAT,
  target_lng FLOAT,
  radius_meters FLOAT,
  category_filter TEXT DEFAULT NULL,
  result_limit INT DEFAULT 50
)
RETURNS SETOF public.reports AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.reports r
  WHERE 
    -- Filtering by category if provided
    (category_filter IS NULL OR r.category::text = category_filter)
    -- ST_DWithin computes accurate distance over the sphere for GEOGRAPHY
    AND ST_DWithin(
      r.location, 
      ST_SetSRID(ST_MakePoint(target_lng, target_lat), 4326)::geography, 
      radius_meters
    )
  ORDER BY 
    -- Optional: Order by distance to show nearest first (might add slight overhead)
    r.location <-> ST_SetSRID(ST_MakePoint(target_lng, target_lat), 4326)::geography
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;


-- Function 2: get_reports_in_bounds
-- Finds reports within a bounding box (North, South, East, West) using ST_MakeEnvelope and ST_Within.
-- Need to cast GEOGRAPHY back to GEOMETRY for ST_Within/ST_MakeEnvelope bounding box intersections.
CREATE OR REPLACE FUNCTION public.get_reports_in_bounds(
  north FLOAT,
  south FLOAT,
  east FLOAT,
  west FLOAT,
  category_filter TEXT DEFAULT NULL,
  result_limit INT DEFAULT 100
)
RETURNS SETOF public.reports AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.reports r
  WHERE 
    (category_filter IS NULL OR r.category::text = category_filter)
    -- ST_Within performs the Bounding Box check. Converting to geometry is fine for small areas.
    AND ST_Within(
      r.location::geometry,
      ST_MakeEnvelope(west, south, east, north, 4326)
    )
  ORDER BY 
    r.created_at DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;
