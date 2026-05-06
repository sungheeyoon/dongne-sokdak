from fastapi import HTTPException, status
from typing import Any, List, Optional, Dict
from supabase.client import Client
from app.schemas.report import ReportCreate, ReportStatus
from app.utils.wkb_parser import convert_wkb_to_location
from app.core.logging import get_logger
import math
from cachetools import TTLCache

logger = get_logger(__name__)

# Cache for 15 seconds, up to 1000 items
nearby_cache = TTLCache(maxsize=1000, ttl=15)
bounds_cache = TTLCache(maxsize=1000, ttl=15)

def _apply_user_voted(items: List[Dict[str, Any]], supabase: Client, current_user_id: str) -> List[Dict[str, Any]]:
    """Helper to batch-apply user_voted status to a list of reports."""
    if not items:
        return items
        
    report_ids = [r["id"] for r in items]
    votes_res = supabase.table("votes") \
        .select("report_id") \
        .eq("user_id", current_user_id) \
        .in_("report_id", report_ids) \
        .execute()
    
    voted_ids = {v["report_id"] for v in votes_res.data}
    
    for r in items:
        r["user_voted"] = r["id"] in voted_ids
        
    return items

def calculate_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """
    Calculate distance between two points using Haversine formula.
    Returns distance in meters.
    """
    R = 6371000  # Earth radius in meters
    
    lat1_rad, lng1_rad = math.radians(lat1), math.radians(lng1)
    lat2_rad, lng2_rad = math.radians(lat2), math.radians(lng2)
    
    dlat = lat2_rad - lat1_rad
    dlng = lng2_rad - lng1_rad
    
    a = (math.sin(dlat / 2) ** 2 + 
         math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlng / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c

def parse_location(location_data: Any) -> Dict[str, float]:
    """
    Parse location data from Supabase (WKB string, dict, or POINT string) into {"lat": ..., "lng": ...}.
    Returns default Seoul coordinates if parsing fails.
    """
    default_loc = {"lat": 37.5665, "lng": 126.9780}
    
    if not location_data:
        return default_loc

    try:
        if isinstance(location_data, dict) and "lat" in location_data:
            return location_data
        
        loc_str = str(location_data)
        
        # Case 1: WKB Hex String
        if len(loc_str) > 20 and all(c in '0123456789ABCDEFabcdef' for c in loc_str):
            return convert_wkb_to_location(loc_str)
            
        # Case 2: PostGIS "POINT(lng lat)" String
        if "POINT(" in loc_str:
            coords = loc_str.replace("POINT(", "").replace(")", "").split()
            if len(coords) == 2:
                # Note: PostGIS is usually (lng, lat)
                return {"lng": float(coords[0]), "lat": float(coords[1])}
                
    except Exception as e:
        logger.error(f"Location parsing failed: {e}")
        
    return default_loc

def enrich_report_data(report: Dict[str, Any], supabase: Client) -> Dict[str, Any]:
    """
    Add computed fields (location) to a report dict.
    Note: vote_count and comment_count are now expected to be in the report dict from RPC.
    """
    # Parse Location
    report["location"] = parse_location(report.get("location"))
    
    # vote_count and comment_count should already be there if from RPC. 
    # If not (e.g. from table.select()), default to 0.
    if "vote_count" not in report:
        report["vote_count"] = 0
    if "comment_count" not in report:
        report["comment_count"] = 0
    
    # user_voted will be handled by the caller (batch lookup) or default to False
    if "user_voted" not in report:
        report["user_voted"] = False
        
    return report

async def list_reports(
    supabase: Client,
    page: int = 1,
    limit: int = 100,
    category: Optional[str] = None,
    status: Optional[str] = None,
    user_id: Optional[str] = None,
    search: Optional[str] = None,
    current_user_id: Optional[str] = None
) -> Dict[str, Any]:
    """List reports using RPC for efficiency (N+1 fix)."""
    # 1. Count Total
    count_params = {
        "category_filter": category,
        "status_filter": status,
        "user_id_filter": user_id,
        "search_query": search
    }
    count_res = supabase.rpc("count_reports_paginated", count_params).execute()
    total_count = count_res.data or 0
    
    # 2. Fetch Page
    rpc_params = {
        "category_filter": category,
        "status_filter": status,
        "user_id_filter": user_id,
        "search_query": search,
        "result_page": page,
        "result_limit": limit
    }
    response = supabase.rpc("get_reports_paginated", rpc_params).execute()
    reports = response.data or []
    
    # 3. Batch lookup user_voted if authenticated
    user_voted_ids = set()
    if current_user_id and reports:
        report_ids = [r["id"] for r in reports]
        votes_res = supabase.table("votes") \
            .select("report_id") \
            .eq("user_id", current_user_id) \
            .in_("report_id", report_ids) \
            .execute()
        user_voted_ids = {v["report_id"] for v in votes_res.data}
        
    # 4. Enrich and Merge
    items = []
    for r in reports:
        r["user_voted"] = r["id"] in user_voted_ids
        items.append(enrich_report_data(r, supabase))
        
    total_pages = math.ceil(total_count / limit) if limit > 0 else 1
    
    return {
        "items": items,
        "totalCount": total_count,
        "totalPages": total_pages,
        "page": page,
        "limit": limit
    }

async def create_report(
    supabase: Client,
    report_in: ReportCreate,
    current_user_id: str
) -> Dict[str, Any]:
    """Create a new report in the database."""
    location_point = f"POINT({report_in.location.lng} {report_in.location.lat})"
    
    report_data = {
        "user_id": current_user_id,
        "title": report_in.title,
        "description": report_in.description,
        "location": location_point,
        "address": report_in.address,
        "category": report_in.category.value,
        "image_url": report_in.image_url,
        "status": ReportStatus.OPEN.value
    }
    
    response = supabase.table("reports").insert(report_data).execute()
    
    if not response.data:
        return None
        
    created_report = response.data[0]
    # Return with parsed location for consistency
    created_report["location"] = {
        "lat": report_in.location.lat, 
        "lng": report_in.location.lng
    }
    
    return created_report

async def get_nearby_reports(
    supabase: Client,
    lat: float,
    lng: float,
    radius_km: float = 3.0,
    category: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
    current_user_id: Optional[str] = None
) -> Dict[str, Any]:
    """Get reports near a specific location with caching."""
    cache_key = f"{lat}_{lng}_{radius_km}_{category or ''}_{search}_{page}_{limit}"
    
    if cache_key in nearby_cache:
        result = nearby_cache[cache_key].copy()
        if current_user_id and result["items"]:
            result["items"] = [r.copy() for r in result["items"]]
            _apply_user_voted(result["items"], supabase, current_user_id)
        return result
        
    radius_meters = radius_km * 1000
    
    # 1. Count Total
    count_params = {
        "target_lat": lat,
        "target_lng": lng,
        "radius_meters": radius_meters,
        "category_filter": category,
        "search_query": search
    }
    try:
        count_res = supabase.rpc("count_reports_within_radius", count_params).execute()
        total_count = count_res.data if count_res.data is not None else 0
    except Exception as e:
        logger.error(f"Count RPC error: {e}")
        total_count = 0

    # 2. Fetch Page
    offset = (page - 1) * limit
    rpc_params = {
        "target_lat": lat,
        "target_lng": lng,
        "radius_meters": radius_meters,
        "category_filter": category,
        "search_query": search,
        "result_offset": offset,
        "result_limit": limit
    }
    
    response = supabase.rpc("get_reports_within_radius", rpc_params).execute()
    nearby_reports = response.data or []
    
    for report in nearby_reports:
        report["location"] = parse_location(report.get("location"))
        report["distance_km"] = round(report.get("distance_meters", 0) / 1000, 2)
        report["user_voted"] = False
    
    total_pages = math.ceil(total_count / limit) if limit > 0 else 1
    result = {
        "items": nearby_reports,
        "totalCount": total_count,
        "totalPages": total_pages,
        "page": page,
        "limit": limit
    }
    
    nearby_cache[cache_key] = result
    
    if current_user_id and nearby_reports:
        final_result = result.copy()
        final_result["items"] = [r.copy() for r in nearby_reports]
        _apply_user_voted(final_result["items"], supabase, current_user_id)
        return final_result

    return result

async def get_reports_in_bounds(
    supabase: Client,
    north: float,
    south: float,
    east: float,
    west: float,
    category: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 100,
    current_user_id: Optional[str] = None
) -> Dict[str, Any]:
    """Get reports within map bounds with caching."""
    cache_key = f"{north}_{south}_{east}_{west}_{category or ''}_{search}_{page}_{limit}"
    
    if cache_key in bounds_cache:
        result = bounds_cache[cache_key].copy()
        if current_user_id and result["items"]:
            result["items"] = [r.copy() for r in result["items"]]
            _apply_user_voted(result["items"], supabase, current_user_id)
        return result
            
    # 1. Count Total
    count_params = {
        "north": north, "south": south, "east": east, "west": west,
        "category_filter": category,
        "search_query": search
    }
    try:
        count_res = supabase.rpc("count_reports_in_bounds", count_params).execute()
        total_count = count_res.data if count_res.data is not None else 0
    except Exception as e:
        logger.error(f"Count RPC error: {e}")
        total_count = 0
            
    # 2. Fetch Page
    offset = (page - 1) * limit
    rpc_params = {
        "north": north, "south": south, "east": east, "west": west,
        "category_filter": category,
        "search_query": search,
        "result_offset": offset,
        "result_limit": limit,
    }
    
    response = supabase.rpc("get_reports_in_bounds", rpc_params).execute()
    bounded_reports = response.data or []
    
    for report in bounded_reports:
        report["location"] = parse_location(report.get("location"))
        report["user_voted"] = False
                
    total_pages = math.ceil(total_count / limit) if limit > 0 else 1
    result = {
        "items": bounded_reports,
        "totalCount": total_count,
        "totalPages": total_pages,
        "page": page,
        "limit": limit
    }
    
    bounds_cache[cache_key] = result

    if current_user_id and bounded_reports:
        final_result = result.copy()
        final_result["items"] = [r.copy() for r in bounded_reports]
        _apply_user_voted(final_result["items"], supabase, current_user_id)
        return final_result

    return result

async def get_report_by_id(supabase: Client, report_id: str, current_user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Get a single report by ID."""
    res = supabase.table("reports").select("*").eq("id", report_id).execute()
    if not res.data:
        return None
        
    report = res.data[0]
    
    # Enrich with counts and user_voted (simulated for single report if not from RPC)
    # Usually better to use a view or RPC even for single report, but this is a refactoring of existing logic.
    report = enrich_report_data(report, supabase)
    
    if current_user_id:
        votes_res = supabase.table("votes").select("id").eq("report_id", report_id).eq("user_id", current_user_id).execute()
        report["user_voted"] = len(votes_res.data) > 0
        
    return report

async def update_report(
    supabase: Client,
    report_id: str,
    update_data: Dict[str, Any],
    current_user_id: str
) -> Optional[Dict[str, Any]]:
    """Update a report's data."""
    # Ownership check
    existing = supabase.table("reports").select("user_id").eq("id", report_id).single().execute()
    if not existing.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
        
    if existing.data["user_id"] != current_user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to update this report")
        
    res = supabase.table("reports").update(update_data).eq("id", report_id).execute()
    if not res.data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Update failed")
        
    return enrich_report_data(res.data[0], supabase)

async def delete_report(
    supabase: Client,
    report_id: str,
    current_user_id: str
) -> None:
    """Delete a report."""
    existing = supabase.table("reports").select("user_id").eq("id", report_id).single().execute()
    if not existing.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
        
    if existing.data["user_id"] != current_user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this report")
        
    supabase.table("reports").delete().eq("id", report_id).execute()

async def benchmark_nearby_rest_python(
    supabase: Client,
    lat: float,
    lng: float,
    radius_km: float = 3.0,
    category: Optional[str] = None,
    limit: int = 50
) -> List[Dict[str, Any]]:
    """[V1 Benchmark] Pure REST + Python Haversine calculation."""
    query = supabase.table("reports").select("*")
    if category:
        query = query.eq("category", category)
        
    res = query.limit(2000).execute()
    all_reports = res.data
    
    radius_meters = radius_km * 1000
    nearby_reports = []
    
    for report in all_reports:
        parsed_loc = parse_location(report.get("location"))
        report["location"] = parsed_loc
        
        dist = calculate_distance(lat, lng, parsed_loc["lat"], parsed_loc["lng"])
        if dist <= radius_meters:
            report["distance"] = dist
            report["distance_km"] = round(dist / 1000, 2)
            report["vote_count"] = 0
            report["comment_count"] = 0
            report["user_voted"] = False
            nearby_reports.append(report)
            
    nearby_reports.sort(key=lambda x: x.get("distance", float('inf')))
    return nearby_reports[:limit]

