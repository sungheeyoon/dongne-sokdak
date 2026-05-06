from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Any, List, Optional, Dict
from uuid import UUID
from app.schemas.report import (
    Report, ReportCreate, ReportUpdate, ReportCategory, ReportStatus, PaginatedReportResponse
)
from app.api.deps import get_current_active_user, get_supabase
from app.services import report_service
from app.core.logging import get_logger
from supabase.client import Client
import math
from cachetools import TTLCache

logger = get_logger(__name__)
router = APIRouter()

# 15초 동안 최대 1000개의 쿼리 결과를 기억하는 핫스팟 캐시 
# user-agnostic하게 저장하기 위해 current_user_id를 키에서 제외함
nearby_cache = TTLCache(maxsize=1000, ttl=15)
bounds_cache = TTLCache(maxsize=1000, ttl=15)

# --- Routes ---

@router.post("/", response_model=Report)
async def create_report(
    report_in: ReportCreate,
    current_user_id: str = Depends(get_current_active_user),
    supabase: Client = Depends(get_supabase)
) -> Any:
    """Create a new report."""
    try:
        result = await report_service.create_report(supabase, report_in, current_user_id)
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create report")
        return result
    except Exception as e:
        logger.error(f"Error creating report: {e}")
        raise HTTPException(status_code=400, detail=f"Error creating report: {str(e)}")

@router.get("/", response_model=PaginatedReportResponse[Report])
async def get_reports(
    page: int = Query(1, ge=1),
    limit: int = 100,
    category: Optional[ReportCategory] = None,
    status: Optional[ReportStatus] = None,
    user_id: Optional[str] = None,
    search: Optional[str] = None,
    current_user_id: Optional[str] = None, # Optional: for user_voted check
    supabase: Client = Depends(get_supabase)
) -> Any:
    """List reports with filtering and search (N+1 solved via RPC)."""
    try:
        return await report_service.list_reports(
            supabase, 
            page=page, 
            limit=limit, 
            category=category.value if category else None,
            status=status.value if status else None,
            user_id=user_id,
            search=search,
            current_user_id=current_user_id
        )
    except Exception as e:
        logger.error(f"Query error in get_reports: {e}")
        raise HTTPException(status_code=400, detail=f"Query error: {str(e)}")

@router.get("/nearby", response_model=PaginatedReportResponse[Report])
async def get_nearby_reports(
    lat: float,
    lng: float,
    radius_km: float = 3.0,
    category: Optional[ReportCategory] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = 50,
    current_user_id: Optional[str] = None,
    supabase: Client = Depends(get_supabase)
) -> Any:
    """Get reports near a specific location (using PostGIS RPC for optimal O(logN) performance)."""
    try:
        # User-agnostic cache key
        cache_key = f"{lat}_{lng}_{radius_km}_{category.value if category else ''}_{search}_{page}_{limit}"
        
        if cache_key in nearby_cache:
            result = nearby_cache[cache_key].copy() # Copy to avoid mutating cached object
            # Re-calculate user_voted for current user if authenticated
            if current_user_id and result["items"]:
                report_ids = [r["id"] for r in result["items"]]
                votes_res = supabase.table("votes").select("report_id").eq("user_id", current_user_id).in_("report_id", report_ids).execute()
                voted_ids = {v["report_id"] for v in votes_res.data}
                for r in result["items"]:
                    r["user_voted"] = r["id"] in voted_ids
            return result
            
        radius_meters = radius_km * 1000
        
        # 1. Count Total
        count_params = {
            "target_lat": lat,
            "target_lng": lng,
            "radius_meters": radius_meters,
            "category_filter": category.value if category else None,
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
            "category_filter": category.value if category else None,
            "search_query": search,
            "result_offset": offset,
            "result_limit": limit,
            # We don't pass current_user_id to RPC to keep results cacheable
        }
        
        response = supabase.rpc("get_reports_within_radius", rpc_params).execute()
        nearby_reports = response.data or []
        
        # Location parsing for client and distance_km formatting
        for report in nearby_reports:
            report["location"] = report_service.parse_location(report.get("location"))
            report["distance_km"] = round(report.get("distance_meters", 0) / 1000, 2)
            # Default user_voted to False for cache
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
        
        # Merge user_voted before returning to authenticated user
        if current_user_id and nearby_reports:
            final_result = result.copy()
            final_result["items"] = [r.copy() for r in nearby_reports]
            report_ids = [r["id"] for r in final_result["items"]]
            votes_res = supabase.table("votes").select("report_id").eq("user_id", current_user_id).in_("report_id", report_ids).execute()
            voted_ids = {v["report_id"] for v in votes_res.data}
            for r in final_result["items"]:
                r["user_voted"] = r["id"] in voted_ids
            return final_result

        return result
        
    except Exception as e:
        logger.error(f"Error fetching nearby reports via RPC: {e}")
        raise HTTPException(status_code=400, detail=f"Error fetching nearby reports via RPC: {str(e)}")

@router.get("/bounds", response_model=PaginatedReportResponse[Report])
def get_reports_in_bounds(
    north: float, south: float, east: float, west: float,
    category: Optional[ReportCategory] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = 100,
    current_user_id: Optional[str] = None,
    supabase: Client = Depends(get_supabase)
) -> Any:
    """Get reports within map bounds (using PostGIS RPC for optimal O(logN) performance)."""
    try:
        cache_key = f"{north}_{south}_{east}_{west}_{category.value if category else ''}_{search}_{page}_{limit}"
        if cache_key in bounds_cache:
            result = bounds_cache[cache_key].copy()
            if current_user_id and result["items"]:
                report_ids = [r["id"] for r in result["items"]]
                votes_res = supabase.table("votes").select("report_id").eq("user_id", current_user_id).in_("report_id", report_ids).execute()
                voted_ids = {v["report_id"] for v in votes_res.data}
                for r in result["items"]:
                    r["user_voted"] = r["id"] in voted_ids
            return result
            
        # 1. Count Total
        count_params = {
            "north": north, "south": south, "east": east, "west": west,
            "category_filter": category.value if category else None,
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
            "category_filter": category.value if category else None,
            "search_query": search,
            "result_offset": offset,
            "result_limit": limit,
        }
        
        response = supabase.rpc("get_reports_in_bounds", rpc_params).execute()
        bounded_reports = response.data or []
        
        for report in bounded_reports:
            report["location"] = report_service.parse_location(report.get("location"))
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
            report_ids = [r["id"] for r in final_result["items"]]
            votes_res = supabase.table("votes").select("report_id").eq("user_id", current_user_id).in_("report_id", report_ids).execute()
            voted_ids = {v["report_id"] for v in votes_res.data}
            for r in final_result["items"]:
                r["user_voted"] = r["id"] in voted_ids
            return final_result

        return result
        
    except Exception as e:
        logger.error(f"Error fetching bounds reports via RPC: {e}")
        raise HTTPException(status_code=400, detail=f"Error fetching bounds reports via RPC: {str(e)}")

@router.get("/my-neighborhood", response_model=PaginatedReportResponse[Report])
async def get_my_neighborhood_reports(
    radius_km: float = 3.0,
    category: Optional[ReportCategory] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
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
            search=search,
            page=page,
            limit=limit, 
            current_user_id=current_user_id,
            supabase=supabase
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching neighborhood reports: {e}")
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
            
        return report_service.enrich_report_data(res.data[0], supabase, current_user_id)
        
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
            
        return report_service.enrich_report_data(res.data[0], supabase, current_user_id)
        
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

# --- Benchmark Endpoints ---

@router.get("/benchmark/nearby-rest", response_model=List[Report])
def get_benchmark_nearby_rest(
    lat: float,
    lng: float,
    radius_km: float = 3.0,
    category: Optional[ReportCategory] = None,
    limit: int = 50,
    supabase: Client = Depends(get_supabase)
) -> Any:
    """[V1 Benchmark] Pure REST + Python Haversine calculation (No PostGIS RPC)."""
    try:
        # Fetching a large set of rows to simulate pre-RPC memory bottleneck
        # Note: We limit to 2000 to prevent outright crashing the server, 
        # but it is enough to show severe performance degradation.
        query = supabase.table("reports").select("*")
        if category:
            query = query.eq("category", category.value)
            
        res = query.limit(2000).execute()
        all_reports = res.data
        
        radius_meters = radius_km * 1000
        nearby_reports = []
        
        for report in all_reports:
            parsed_loc = report_service.parse_location(report.get("location"))
            report["location"] = parsed_loc
            
            dist = report_service.calculate_distance(lat, lng, parsed_loc["lat"], parsed_loc["lng"])
            if dist <= radius_meters:
                report["distance"] = dist
                report["distance_km"] = round(dist / 1000, 2)
                report["vote_count"] = 0
                report["comment_count"] = 0
                report["user_voted"] = False
                nearby_reports.append(report)
                
        # Sort by distance in python
        nearby_reports.sort(key=lambda x: x.get("distance", float('inf')))
        return nearby_reports[:limit]
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Bench error REST: {str(e)}")


