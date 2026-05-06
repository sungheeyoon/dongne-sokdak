from fastapi import APIRouter, Depends, Request
from typing import List, Optional
import uuid
from app.db.supabase_client import supabase
from app.middleware.admin_auth import get_admin_user, get_super_admin_user
from app.services.admin_service import AdminService
from app.api.admin.schemas import UserManagementResponse, UserRoleUpdate, BulkUserAction

router = APIRouter(tags=["admin"])

@router.get("/users", response_model=List[UserManagementResponse])
async def get_users_for_management(
    skip: int = 0,
    limit: int = 50,
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    admin_user: dict = Depends(get_admin_user)
):
    """사용자 관리 목록 조회"""
    profiles = await AdminService.get_users(supabase, skip, limit, role, is_active, search)
    return [
        UserManagementResponse(
            id=user.get("id"),
            email=user.get("email", ""),
            nickname=user.get("nickname", ""),
            role=user.get("role", "user"),
            is_active=user.get("is_active", True),
            last_login_at=user.get("last_login_at"),
            login_count=user.get("login_count", 0),
            created_at=user.get("created_at")
        )
        for user in profiles
    ]

@router.put("/users/{user_id}/role")
async def update_user_role(
    user_id: uuid.UUID,
    role_update: UserRoleUpdate,
    request: Request,
    admin_user: dict = Depends(get_super_admin_user)
):
    """사용자 역할 변경 (최고관리자만 가능)"""
    result = await AdminService.update_user_role(
        supabase, str(user_id), role_update.role, role_update.reason,
        admin_user.get("id"), request.client.host if request.client else None,
        request.headers.get("user-agent")
    )
    return {
        "message": f"사용자 역할이 {result['old_role']}에서 {result['new_role']}로 변경되었습니다",
        **result
    }

@router.put("/users/{user_id}/activate")
async def activate_user(
    user_id: uuid.UUID,
    request: Request,
    admin_user: dict = Depends(get_admin_user)
):
    """사용자 계정 활성화"""
    result = await AdminService.set_user_active_status(
        supabase, str(user_id), True, admin_user.get("id"), admin_user.get("role"),
        request.client.host if request.client else None, request.headers.get("user-agent")
    )
    if "message" in result: return result
    return {
        "message": "사용자 계정이 활성화되었습니다",
        **result
    }

@router.put("/users/{user_id}/deactivate")
async def deactivate_user(
    user_id: uuid.UUID,
    request: Request,
    admin_user: dict = Depends(get_admin_user)
):
    """사용자 계정 비활성화"""
    result = await AdminService.set_user_active_status(
        supabase, str(user_id), False, admin_user.get("id"), admin_user.get("role"),
        request.client.host if request.client else None, request.headers.get("user-agent")
    )
    if "message" in result: return result
    return {
        "message": "사용자 계정이 비활성화되었습니다",
        **result
    }

@router.post("/users/bulk-action")
async def bulk_user_action(
    bulk_action: BulkUserAction,
    request: Request,
    admin_user: dict = Depends(get_admin_user)
):
    """사용자 일괄 작업"""
    if not bulk_action.user_ids:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="선택된 사용자가 없습니다")
    
    result = await AdminService.bulk_user_action(
        supabase, bulk_action.user_ids, bulk_action.action, bulk_action.reason,
        bulk_action.role, admin_user.get("id"), admin_user.get("role"),
        request.client.host if request.client else None, request.headers.get("user-agent")
    )
    return {
        "message": f"일괄 작업 완료 - 성공: {result['success_count']}, 실패: {result['error_count']}",
        "total_processed": len(bulk_action.user_ids),
        **result
    }
