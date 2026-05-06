from fastapi import APIRouter, Depends
from app.db.supabase_client import supabase
from app.middleware.admin_auth import get_admin_user
from app.services.admin_service import AdminService
from app.api.admin.schemas import AdminDashboardStats

router = APIRouter(tags=["admin"])

@router.get("/dashboard/stats", response_model=AdminDashboardStats)
async def get_admin_dashboard_stats(
    admin_user: dict = Depends(get_admin_user)
):
    """관리자 대시보드 통계 정보 조회"""
    stats = await AdminService.get_dashboard_stats(supabase)
    return AdminDashboardStats(**stats)
