from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
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
    """사용자 관리 목록 조회 (DB 필터링 최적화)"""
    try:
        query = supabase.table("profiles").select("*")
        
        if role:
            query = query.eq("role", role)
        if is_active is not None:
            query = query.eq("is_active", is_active)
        if search:
            # PostgreSQL ILIKE for search
            query = query.or_(f"nickname.ilike.%{search}%,email.ilike.%{search}%")
        
        response = query.order("created_at", desc=True).range(skip, skip + limit - 1).execute()
        return response.data or []
    except Exception as e:
        logger.error(f"Error fetching users: {e}")
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
            "updated_at": datetime.now(timezone.utc).isoformat()
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
            "updated_at": datetime.now(timezone.utc).isoformat()
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
    """사용자 일괄 작업 (Batch Update 최적화)"""
    if not user_ids:
        return {"success_count": 0, "error_count": 0, "results": []}

    results = []
    success_count = 0
    error_count = 0
    
    # Filter out admin_id and fetch target users to check permissions
    try:
        valid_user_ids = [uid for uid in user_ids if uid != admin_id]
        if len(valid_user_ids) < len(user_ids):
            for uid in set(user_ids) - set(valid_user_ids):
                results.append({"user_id": uid, "status": "skipped", "message": "자신의 계정은 변경할 수 없습니다"})
        
        if not valid_user_ids:
            return {"success_count": 0, "error_count": 0, "results": results}

        targets_res = supabase.table("profiles").select("*").in_("id", valid_user_ids).execute()
        targets = {t["id"]: t for t in targets_res.data}
        
        ids_to_update = []
        update_payload = {"updated_at": datetime.now(timezone.utc).isoformat()}
        
        if action == "activate":
            ids_to_update = [uid for uid, t in targets.items() if not t.get("is_active", True)]
            update_payload["is_active"] = True
            action_detail = "BULK_ACTIVATE"
        elif action == "deactivate":
            for uid, t in targets.items():
                if t.get("is_active", True):
                    if t.get("role") in ["admin", "moderator"] and admin_role != "admin":
                        results.append({"user_id": uid, "status": "error", "message": "관리자 계정은 최고관리자만 비활성화할 수 있습니다"})
                        error_count += 1
                    else:
                        ids_to_update.append(uid)
            update_payload["is_active"] = False
            action_detail = "BULK_DEACTIVATE"
        elif action == "change_role":
            if admin_role != "admin":
                return {"success_count": 0, "error_count": len(user_ids), "results": [{"user_id": uid, "status": "error", "message": "역할 변경은 최고관리자만 가능합니다"} for uid in user_ids]}
            if not role:
                return {"success_count": 0, "error_count": len(user_ids), "results": [{"user_id": uid, "status": "error", "message": "변경할 역할이 지정되지 않았습니다"} for uid in user_ids]}
            
            ids_to_update = [uid for uid, t in targets.items() if t.get("role") != role]
            update_payload["role"] = role
            action_detail = "BULK_ROLE_CHANGE"
        else:
            return {"success_count": 0, "error_count": len(user_ids), "results": [{"user_id": uid, "status": "error", "message": f"지원하지 않는 액션입니다: {action}"} for uid in user_ids]}

        if ids_to_update:
            supabase.table("profiles").update(update_payload).in_("id", ids_to_update).execute()
            
            for uid in ids_to_update:
                success_count += 1
                results.append({"user_id": uid, "status": "success", "message": "작업이 완료되었습니다"})
                await log_admin_activity(
                    admin_id=admin_id, action=action_detail, target_type="user", target_id=uid,
                    details={"bulk_action": action, "reason": reason, "new_value": update_payload.get("is_active") or update_payload.get("role")},
                    ip_address=ip_address, user_agent=user_agent
                )
        
        # Add skipped status for those already in target state
        processed_ids = set(ids_to_update) | {r["user_id"] for r in results if r["status"] == "error"} | {admin_id}
        for uid in set(user_ids) - processed_ids:
            results.append({"user_id": uid, "status": "skipped", "message": "이미 목표 상태입니다"})

    except Exception as e:
        logger.error(f"Error in bulk_user_action: {e}")
        return {"success_count": success_count, "error_count": error_count + (len(user_ids) - success_count), "results": results}
    
    return {"success_count": success_count, "error_count": error_count, "results": results}
