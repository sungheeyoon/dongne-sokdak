from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
import uuid
from app.db.supabase_client import supabase
from app.core.security import get_current_user
from app.middleware.admin_auth import get_admin_user
from app.services.admin_service import AdminService
from app.api.admin.schemas import AdminActivityResponse

router = APIRouter(tags=["admin"])

@router.get("/activity-logs", response_model=List[AdminActivityResponse])
async def get_admin_activity_logs(
    skip: int = 0,
    limit: int = 50,
    action: Optional[str] = None,
    admin_id: Optional[uuid.UUID] = None,
    admin_user: dict = Depends(get_admin_user)
):
    """관리자 활동 로그 조회"""
    data = await AdminService.get_admin_activity_logs(
        supabase, skip, limit, action, str(admin_id) if admin_id else None
    )
    
    activity_logs = []
    for log in data:
        activity_logs.append(AdminActivityResponse(
            id=log.get("id"),
            admin_id=log.get("admin_id"),
            admin_nickname=log.get("admin", {}).get("nickname", "알 수 없음") if log.get("admin") else "알 수 없음",
            action=log.get("action"),
            target_type=log.get("target_type"),
            target_id=log.get("target_id"),
            details=log.get("details", {}),
            ip_address=log.get("ip_address"),
            user_agent=log.get("user_agent"),
            created_at=log.get("created_at")
        ))
    return activity_logs

@router.get("/my-info")
async def get_admin_info(
    current_user_id: str = Depends(get_current_user)
):
    """현재 사용자 정보 조회 (관리자 여부 확인용)"""
    response = supabase.table("profiles").select("*").eq("id", current_user_id).single().execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="사용자를 찾을 수 없습니다"
        )
    
    user = response.data
    return {
        "id": user.get("id"),
        "email": user.get("email"),
        "nickname": user.get("nickname"),
        "role": user.get("role", "user"),
        "is_active": user.get("is_active"),
        "last_login_at": user.get("last_login_at"),
        "login_count": user.get("login_count"),
        "created_at": user.get("created_at")
    }
