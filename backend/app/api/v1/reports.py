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

logger = get_logger(__name__)
router = APIRouter()

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
    except HTTPException:
        raise
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
    current_user_id: Optional[str] = None,
    supabase: Client = Depends(get_supabase)
) -> Any:
    """List reports with filtering and search."""
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
    except HTTPException:
        raise
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
    """Get reports near a specific location."""
    try:
        return await report_service.get_nearby_reports(
            supabase, lat, lng, radius_km,
            category.value if category else None,
            search, page, limit, current_user_id
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching nearby reports: {e}")
        raise HTTPException(status_code=400, detail=f"Error fetching nearby reports: {str(e)}")

@router.get("/bounds", response_model=PaginatedReportResponse[Report])
async def get_reports_in_bounds(
    north: float, south: float, east: float, west: float,
    category: Optional[ReportCategory] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = 100,
    current_user_id: Optional[str] = None,
    supabase: Client = Depends(get_supabase)
) -> Any:
    """Get reports within map bounds."""
    try:
        return await report_service.get_reports_in_bounds(
            supabase, north, south, east, west,
            category.value if category else None,
            search, page, limit, current_user_id
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching bounds reports: {e}")
        raise HTTPException(status_code=400, detail=f"Error fetching bounds reports: {str(e)}")

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
        neighborhood = res.data.get("neighborhood") if res.data else None
        
        if not neighborhood or not isinstance(neighborhood, dict) or "lat" not in neighborhood:
             raise HTTPException(status_code=400, detail="Neighborhood not set.")
            
        return await report_service.get_nearby_reports(
            supabase, neighborhood["lat"], neighborhood["lng"], radius_km,
            category.value if category else None,
            search, page, limit, current_user_id
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching neighborhood reports: {e}")
        raise HTTPException(status_code=400, detail=f"Error fetching neighborhood: {str(e)}")

@router.get("/{report_id}", response_model=Report)
async def get_report(
    report_id: UUID,
    current_user_id: Optional[str] = None,
    supabase: Client = Depends(get_supabase),
) -> Any:
    """Get detailed report by ID."""
    try:
        report = await report_service.get_report_by_id(supabase, str(report_id), current_user_id)
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        return report
    except HTTPException:
        raise
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
        update_data = report_in.model_dump(exclude_unset=True)
        if "category" in update_data:
            update_data["category"] = update_data["category"].value
        if "status" in update_data:
            update_data["status"] = update_data["status"].value
            
        return await report_service.update_report(supabase, str(report_id), update_data, current_user_id)
    except HTTPException:
        raise
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
        await report_service.delete_report(supabase, str(report_id), current_user_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error deleting report: {str(e)}")

@router.get("/benchmark/nearby-rest", response_model=List[Report])
async def get_benchmark_nearby_rest(
    lat: float,
    lng: float,
    radius_km: float = 3.0,
    category: Optional[ReportCategory] = None,
    limit: int = 50,
    supabase: Client = Depends(get_supabase)
) -> Any:
    """[V1 Benchmark] Pure REST + Python Haversine calculation."""
    try:
        return await report_service.benchmark_nearby_rest_python(
            supabase, lat, lng, radius_km,
            category.value if category else None,
            limit
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Bench error REST: {str(e)}")



