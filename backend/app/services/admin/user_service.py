from typing import List, Optional, Dict, Any
from datetime import datetime
from supabase import Client
from fastapi import HTTPException, status
from app.middleware.admin_auth import log_admin_activity
from app.core.logging import get_logger

logger = get_logger(__name__)

async def get_users(
    supabase: Client,
    skip: int = 0,
    limit: int = 50,
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = None
) -> List[Dict[str, Any]]:
    """사용자 관리 목록 조회"""
    try:
        response = supabase.table("profiles").select("*").execute()
        profiles = response.data or []
        
        if role:
            profiles = [p for p in profiles if p.get("role") == role]
        if is_active is not None:
            profiles = [p for p in profiles if p.get("is_active") == is_active]
        if search:
            profiles = [p for p in profiles if 
                       search.lower() in p.get("nickname", "").lower() or 
                       search.lower() in p.get("email", "").lower()]
        
        profiles = profiles[skip:skip+limit]
        return profiles
    except Exception as e:
        logger.error(f"❌ Error fetching users: {e}")
        return []

async def update_user_role(
    supabase: Client,
    user_id: str,
    role: str,
    reason: Optional[str],
    admin_id: str,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
) -> Dict[str, Any]:
    """사용자 역할 변경"""
    try:
        target_response = supabase.table("profiles").select("*").eq("id", user_id).single().execute()
        if not target_response.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="사용자를 찾을 수 없습니다")
        
        target_user = target_response.data
        old_role = target_user.get("role", "user")
        
        if user_id == admin_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="자신의 역할은 변경할 수 없습니다")
        
        update_response = supabase.table("profiles").update({
            "role": role,
            "updated_at": datetime.now().isoformat()
        }).eq("id", user_id).execute()
        
        if not update_response.data:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="역할 변경에 실패했습니다")
        
        await log_admin_activity(
            admin_id=admin_id,
            action="ROLE_CHANGE",
            target_type="user",
            target_id=user_id,
            details={
                "old_role": old_role,
                "new_role": role,
                "reason": reason,
                "target_email": target_user.get("email"),
                "target_nickname": target_user.get("nickname")
            },
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        return {
            "user_id": user_id,
            "old_role": old_role,
            "new_role": role
        }
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="역할 변경 중 오류가 발생했습니다")

async def set_user_active_status(
    supabase: Client,
    user_id: str,
    is_active: bool,
    admin_id: str,
    admin_role: str,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
) -> Dict[str, Any]:
    """사용자 계정 활성화/비활성화"""
    try:
        target_response = supabase.table("profiles").select("*").eq("id", user_id).single().execute()
        if not target_response.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="사용자를 찾을 수 없습니다")
        
        target_user = target_response.data
        if target_user.get("is_active", True) == is_active:
            return {"user_id": user_id, "is_active": is_active, "message": f"이미 {'활성화' if is_active else '비활성화'}된 계정입니다"}
        
        if user_id == admin_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="자신의 계정 상태는 변경할 수 없습니다")
        
        if not is_active: # Deactivating
            target_role = target_user.get("role", "user")
            if target_role in ["admin", "moderator"] and admin_role != "admin":
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="관리자 계정은 최고관리자만 비활성화할 수 있습니다")
        
        update_response = supabase.table("profiles").update({
            "is_active": is_active,
            "updated_at": datetime.now().isoformat()
        }).eq("id", user_id).execute()
        
        if not update_response.data:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="계정 상태 변경에 실패했습니다")
        
        action = "ACTIVATE_USER" if is_active else "DEACTIVATE_USER"
        await log_admin_activity(
            admin_id=admin_id,
            action=action,
            target_type="user",
            target_id=user_id,
            details={
                "target_email": target_user.get("email"),
                "target_nickname": target_user.get("nickname"),
                "previous_status": "inactive" if is_active else "active"
            },
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        return {"user_id": user_id, "is_active": is_active}
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="계정 상태 변경 중 오류가 발생했습니다")

async def bulk_user_action(
    supabase: Client,
    user_ids: List[str],
    action: str,
    reason: Optional[str],
    role: Optional[str],
    admin_id: str,
    admin_role: str,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
) -> Dict[str, Any]:
    """사용자 일괄 작업"""
    results = []
    success_count = 0
    error_count = 0
    
    for user_id in user_ids:
        try:
            if user_id == admin_id:
                results.append({"user_id": user_id, "status": "skipped", "message": "자신의 계정은 변경할 수 없습니다"})
                continue
            
            target_response = supabase.table("profiles").select("*").eq("id", user_id).single().execute()
            if not target_response.data:
                results.append({"user_id": user_id, "status": "error", "message": "사용자를 찾을 수 없습니다"})
                error_count += 1
                continue
            
            target_user = target_response.data
            
            if action == "activate":
                if target_user.get("is_active", True):
                    results.append({"user_id": user_id, "status": "skipped", "message": "이미 활성화된 계정입니다"})
                    continue
                supabase.table("profiles").update({"is_active": True, "updated_at": datetime.now().isoformat()}).eq("id", user_id).execute()
                action_detail = "BULK_ACTIVATE"
                message = "계정이 활성화되었습니다"
            elif action == "deactivate":
                if not target_user.get("is_active", True):
                    results.append({"user_id": user_id, "status": "skipped", "message": "이미 비활성화된 계정입니다"})
                    continue
                target_role = target_user.get("role", "user")
                if target_role in ["admin", "moderator"] and admin_role != "admin":
                    results.append({"user_id": user_id, "status": "error", "message": "관리자 계정은 최고관리자만 비활성화할 수 있습니다"})
                    error_count += 1
                    continue
                supabase.table("profiles").update({"is_active": False, "updated_at": datetime.now().isoformat()}).eq("id", user_id).execute()
                action_detail = "BULK_DEACTIVATE"
                message = "계정이 비활성화되었습니다"
            elif action == "change_role":
                if admin_role != "admin":
                    results.append({"user_id": user_id, "status": "error", "message": "역할 변경은 최고관리자만 가능합니다"})
                    error_count += 1
                    continue
                if not role:
                    results.append({"user_id": user_id, "status": "error", "message": "변경할 역할이 지정되지 않았습니다"})
                    error_count += 1
                    continue
                old_role = target_user.get("role", "user")
                if old_role == role:
                    results.append({"user_id": user_id, "status": "skipped", "message": f"이미 {role} 역할입니다"})
                    continue
                supabase.table("profiles").update({"role": role, "updated_at": datetime.now().isoformat()}).eq("id", user_id).execute()
                action_detail = "BULK_ROLE_CHANGE"
                message = f"역할이 {old_role}에서 {role}로 변경되었습니다"
            else:
                results.append({"user_id": user_id, "status": "error", "message": f"지원하지 않는 액션입니다: {action}"})
                error_count += 1
                continue
            
            results.append({"user_id": user_id, "status": "success", "message": message})
            success_count += 1
            await log_admin_activity(
                admin_id=admin_id, action=action_detail, target_type="user", target_id=user_id,
                details={"target_email": target_user.get("email"), "target_nickname": target_user.get("nickname"), "bulk_action": action, "reason": reason},
                ip_address=ip_address, user_agent=user_agent
            )
        except Exception as e:
            results.append({"user_id": user_id, "status": "error", "message": str(e)})
            error_count += 1
    
    return {"success_count": success_count, "error_count": error_count, "results": results}
