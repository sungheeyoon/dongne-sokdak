from typing import Dict, Any
from supabase import Client
from fastapi import HTTPException, status
from app.core.logging import get_logger

logger = get_logger(__name__)

async def get_dashboard_stats(supabase: Client) -> Dict[str, Any]:
    """관리자 대시보드 통계 정보 조회 (RPC 최적화)"""
    try:
        response = supabase.rpc("get_admin_dashboard_stats").execute()
        if not response.data:
            return {}
            
        return response.data
    except Exception as e:
        logger.error(f"Error fetching dashboard stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="대시보드 통계 정보를 가져오는 중 오류가 발생했습니다"
        )
