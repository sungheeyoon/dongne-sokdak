from typing import Any, List, Optional, Dict
from supabase.client import Client
from app.schemas.report import ReportCreate, ReportStatus
from app.utils.wkb_parser import convert_wkb_to_location
import math

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
        print(f"Location parsing failed: {e}")
        
    return default_loc

def enrich_report_data(report: Dict[str, Any], supabase: Client, current_user_id: Optional[str] = None) -> Dict[str, Any]:
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
        items.append(enrich_report_data(r, supabase, current_user_id))
        
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
