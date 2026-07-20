from typing import Dict, Any
from supabase import Client
from fastapi import HTTPException, status
from app.core.logging import get_logger
from app.db.supabase_client import supabase as default_supabase

logger = get_logger(__name__)


class AdminDashboardService:
    """admin 대시보드 통계 조회. 주입 관용구는 ADR-0002."""

    def __init__(self, supabase: Client) -> None:
        self._supabase = supabase

    async def get_dashboard_stats(self) -> Dict[str, Any]:
        """관리자 대시보드 통계 정보 조회 (RPC 최적화)"""
        try:
            response = self._supabase.rpc("get_admin_dashboard_stats").execute()
            if not response.data:
                return {}

            return response.data
        except Exception as e:
            logger.error(f"Error fetching dashboard stats: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="대시보드 통계 정보를 가져오는 중 오류가 발생했습니다"
            )


admin_dashboard_service = AdminDashboardService(default_supabase)
