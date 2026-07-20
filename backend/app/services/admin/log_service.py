from typing import List, Optional, Dict, Any
from supabase import Client
from app.core.logging import get_logger
from app.db.supabase_client import supabase as default_supabase

logger = get_logger(__name__)


class AdminLogService:
    """admin 활동 로그 조회. 주입 관용구는 ADR-0002."""

    def __init__(self, supabase: Client) -> None:
        self._supabase = supabase

    async def get_admin_activity_logs(
        self,
        skip: int = 0,
        limit: int = 50,
        action: Optional[str] = None,
        admin_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """관리자 활동 로그 조회"""
        try:
            query = self._supabase.table("admin_activity_logs").select("*, admin:admin_id(nickname)")
            if action: query = query.eq("action", action)
            if admin_id: query = query.eq("admin_id", admin_id)
            response = query.order("created_at", desc=True).range(skip, skip + limit - 1).execute()
            return response.data or []
        except Exception as e:
            logger.error(f"Error fetching admin activity logs: {e}")
            return []


admin_log_service = AdminLogService(default_supabase)
