from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Any, List, Optional, Dict
from uuid import UUID
from app.schemas.report import (
    Report, ReportCreate, ReportUpdate, ReportCategory, ReportStatus
)
from app.api.deps import get_current_active_user, get_supabase
from app.utils.wkb_parser import convert_wkb_to_location
from supabase.client import Client
import math

router = APIRouter()

# --- Helper Functions ---

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
    Add computed fields (vote_count, comment_count, user_voted, location) to a report dict.
    """
    # Parse Location
    report["location"] = parse_location(report.get("location"))
    
    # Get Counts (Ideally these should be aggregated via SQL view or RPC for performance)
    # For now, we query tables directly as requested in the plan
    votes_res = supabase.table("votes").select("id", count="exact").eq("report_id", report["id"]).execute()
    comments_res = supabase.table("comments").select("id", count="exact").eq("report_id", report["id"]).execute()
    
    report["vote_count"] = votes_res.count if votes_res.count is not None else len(votes_res.data)
    report["comment_count"] = comments_res.count if comments_res.count is not None else len(comments_res.data)
    
    # Check if user voted
    report["user_voted"] = False
    if current_user_id:
        user_vote = supabase.table("votes").select("id").eq("report_id", report["id"]).eq("user_id", current_user_id).execute()
        report["user_voted"] = len(user_vote.data) > 0
        
    return report

# --- Routes ---

@router.post("/", response_model=Report)
async def create_report(
    report_in: ReportCreate,
    current_user_id: str = Depends(get_current_active_user),
    supabase: Client = Depends(get_supabase)
) -> Any:
    """Create a new report."""
    try:
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
            raise HTTPException(status_code=400, detail="Failed to create report")
            
        # Return the created report with parsed location
        created_report = response.data[0]
        created_report["location"] = {
            "lat": report_in.location.lat, 
            "lng": report_in.location.lng
        }
        
        return created_report
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error creating report: {str(e)}")

@router.get("/", response_model=List[Report])
async def get_reports(
    skip: int = 0,
    limit: int = 100,
    category: Optional[ReportCategory] = None,
    status: Optional[ReportStatus] = None,
    user_id: Optional[str] = None,
    search: Optional[str] = None,
    current_user_id: Optional[str] = None, # Optional: for user_voted check
    supabase: Client = Depends(get_supabase)
) -> Any:
    """List reports with filtering and search."""
    try:
        query = supabase.table("reports").select("*").order("created_at", desc=True)
        
        if category:
            query = query.eq("category", category.value)
        if status:
            query = query.eq("status", status.value)
        if user_id:
            query = query.eq("user_id", user_id)
        if search:
            query = query.ilike("title", f"%{search}%")
            
        if limit:
            query = query.limit(limit)
            
        response = query.execute()
        reports = response.data
        
        # Enrich data
        result = [enrich_report_data(r, supabase, current_user_id) for r in reports]
        return result
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Query error: {str(e)}")

@router.get("/nearby", response_model=List[Report])
async def get_nearby_reports(
    lat: float,
    lng: float,
    radius_km: float = 3.0,
    category: Optional[ReportCategory] = None,
    limit: int = 50,
    supabase: Client = Depends(get_supabase)
) -> Any:
    """Get reports near a specific location (using PostGIS RPC for optimal O(logN) performance)."""
    try:
        radius_meters = radius_km * 1000
        
        rpc_params = {
            "target_lat": lat,
            "target_lng": lng,
            "radius_meters": radius_meters,
            "category_filter": category.value if category else None,
            "result_limit": limit
        }
        
        # FastAPI -> Supabase RPC -> PostGIS
        response = supabase.rpc("get_reports_within_radius", rpc_params).execute()
        nearby_reports = response.data
        
        # Enrich and format location for client
        for report in nearby_reports:
            parsed_loc = parse_location(report.get("location"))
            report["location"] = parsed_loc
            
            # Since Haversine iteration on all records is gone, we just calculate
            # distance for the final returned subset (O(limit) instead of O(N))
            dist = calculate_distance(lat, lng, parsed_loc["lat"], parsed_loc["lng"])
            report["distance"] = dist
            report["distance_km"] = round(dist / 1000, 2)
            
            # Initialize counts to 0 for list view performance
            report["vote_count"] = 0
            report["comment_count"] = 0
            report["user_voted"] = False
                
        return nearby_reports
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error fetching nearby reports via RPC: {str(e)}")

@router.get("/bounds", response_model=List[Report])
async def get_reports_in_bounds(
    north: float, south: float, east: float, west: float,
    category: Optional[ReportCategory] = None,
    limit: int = 100,
    supabase: Client = Depends(get_supabase)
) -> Any:
    """Get reports within map bounds (using PostGIS RPC for optimal O(logN) performance)."""
    try:
        rpc_params = {
            "north": north,
            "south": south,
            "east": east,
            "west": west,
            "category_filter": category.value if category else None,
            "result_limit": limit
        }
        
        # FastAPI -> Supabase RPC -> PostGIS
        response = supabase.rpc("get_reports_in_bounds", rpc_params).execute()
        bounded_reports = response.data
        
        for report in bounded_reports:
            loc = parse_location(report.get("location"))
            report["location"] = loc
            
            report["vote_count"] = 0
            report["comment_count"] = 0
            report["user_voted"] = False
                
        return bounded_reports
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error fetching bounds reports via RPC: {str(e)}")

@router.get("/my-neighborhood", response_model=List[Report])
async def get_my_neighborhood_reports(
    radius_km: float = 3.0,
    category: Optional[ReportCategory] = None,
    limit: int = 50,
    current_user_id: str = Depends(get_current_active_user),
    supabase: Client = Depends(get_supabase)
) -> Any:
    """Get reports for the user's registered neighborhood."""
    try:
        res = supabase.table("profiles").select("neighborhood").eq("id", current_user_id).single().execute()
        
        # Check if neighborhood exists properly
        neighborhood = res.data.get("neighborhood") if res.data else None
        
        if not neighborhood or not isinstance(neighborhood, dict) or "lat" not in neighborhood:
             raise HTTPException(
                status_code=400, 
                detail="Neighborhood not set. Please set your neighborhood first."
            )
            
        return await get_nearby_reports(
            lat=neighborhood["lat"], 
            lng=neighborhood["lng"], 
            radius_km=radius_km, 
            category=category, 
            limit=limit, 
            supabase=supabase
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error fetching neighborhood: {str(e)}")

@router.get("/{report_id}", response_model=Report)
async def get_report(
    report_id: UUID,
    current_user_id: Optional[str] = None, # Allow anon logic if needed, but usually deps handles it
    supabase: Client = Depends(get_supabase),
) -> Any:
    """Get detailed report by ID."""
    try:
        res = supabase.table("reports").select("*").eq("id", str(report_id)).execute()
        
        if not res.data:
            raise HTTPException(status_code=404, detail="Report not found")
            
        # Use helper to fill data
        # Note: Need actual user_id for 'user_voted' check. 
        # If endpoint doesn't enforce auth, user_voted will be False.
        # Ideally, we should inject current_user using Depends(get_current_user_optional) pattern.
        # For now, assuming caller might pass it or we skip accurate user_voted if anon.
        
        return enrich_report_data(res.data[0], supabase, current_user_id)
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error fetching report: {str(e)}")

@router.put("/{report_id}", response_model=Report)
async def update_report(
    report_id: UUID,
    report_in: ReportUpdate,
    current_user_id: str = Depends(get_current_active_user),
    supabase: Client = Depends(get_supabase)
) -> Any:
    """Update a report."""
    try:
        # Check ownership
        existing = supabase.table("reports").select("user_id").eq("id", str(report_id)).single().execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Report not found")
            
        if existing.data["user_id"] != current_user_id:
            raise HTTPException(status_code=403, detail="Not authorized to update this report")
            
        # Prepare Update Data
        update_data = report_in.model_dump(exclude_unset=True) # Pydantic v2
        
        # Handle Enum conversion
        if "category" in update_data:
            update_data["category"] = update_data["category"].value
        if "status" in update_data:
            update_data["status"] = update_data["status"].value
            
        # Execute Update
        res = supabase.table("reports").update(update_data).eq("id", str(report_id)).execute()
        
        if not res.data:
            raise HTTPException(status_code=400, detail="Update failed")
            
        return enrich_report_data(res.data[0], supabase, current_user_id)
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error updating report: {str(e)}")

@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_report(
    report_id: UUID,
    current_user_id: str = Depends(get_current_active_user),
    supabase: Client = Depends(get_supabase)
):
    """Delete a report."""
    try:
        existing = supabase.table("reports").select("user_id").eq("id", str(report_id)).single().execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Report not found")
            
        if existing.data["user_id"] != current_user_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this report")
            
        supabase.table("reports").delete().eq("id", str(report_id)).execute()
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error deleting report: {str(e)}")

