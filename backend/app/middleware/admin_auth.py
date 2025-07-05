from fastapi import HTTPException, status, Depends
from app.core.security import get_current_user
from app.db.supabase_client import supabase
from typing import Optional, Dict, Any
import uuid


async def get_admin_user(
    current_user_id: str = Depends(get_current_user)
) -> Dict[str, Any]:
    """관리자 권한이 있는 사용자만 접근 허용"""
    
    print(f"🔍 Admin auth check - user_id: {current_user_id}")
    
    # 현재 사용자 정보 가져오기
    if not current_user_id:
        print("❌ No user_id provided")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="인증이 필요합니다"
        )
    
    try:
        # Supabase로 사용자 프로필 조회
        response = supabase.table("profiles").select("*").eq("id", current_user_id).single().execute()
        
        if not response.data:
            print(f"❌ Profile not found for user_id: {current_user_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="사용자를 찾을 수 없습니다"
            )
        
        profile = response.data
        role = profile.get("role", "user")
        is_active = profile.get("is_active", True)
        
        print(f"✅ Profile found - role: {role}, is_active: {is_active}")
        
        # 관리자 권한 확인
        is_admin = role in ["admin", "moderator"] and is_active
        if not is_admin:
            print(f"❌ Not admin - role: {role}, is_admin: {is_admin}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="관리자 권한이 필요합니다"
            )
        
        print(f"✅ Admin access granted for user: {current_user_id}")
        return profile
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        print(f"❌ Database error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="데이터베이스 오류가 발생했습니다"
        )


async def get_super_admin_user(
    current_user_id: str = Depends(get_current_user)
) -> Dict[str, Any]:
    """최고관리자 권한이 있는 사용자만 접근 허용"""
    
    # 현재 사용자 정보 가져오기
    if not current_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="인증이 필요합니다"
        )
    
    try:
        # Supabase로 사용자 프로필 조회
        response = supabase.table("profiles").select("*").eq("id", current_user_id).single().execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="사용자를 찾을 수 없습니다"
            )
        
        profile = response.data
        role = profile.get("role", "user")
        is_active = profile.get("is_active", True)
        
        # 최고관리자 권한 확인
        is_super_admin = role == "admin" and is_active
        if not is_super_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="최고관리자 권한이 필요합니다"
            )
        
        return profile
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="데이터베이스 오류가 발생했습니다"
        )


def check_admin_permission(user_role: str, required_role: str) -> bool:
    """관리자 권한 레벨 확인"""
    role_hierarchy = {
        "user": 0,
        "moderator": 1,
        "admin": 2
    }
    
    return role_hierarchy.get(user_role, 0) >= role_hierarchy.get(required_role, 0)


async def log_admin_activity(
    admin_id: str,
    action: str,
    target_type: Optional[str] = None,
    target_id: Optional[str] = None,
    details: Optional[dict] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
) -> None:
    """관리자 활동 로그 기록"""
    try:
        log_data = {
            "admin_id": admin_id,
            "action": action,
            "target_type": target_type,
            "target_id": target_id,
            "details": details,
            "ip_address": ip_address,
            "user_agent": user_agent
        }
        
        supabase.table("admin_activity_logs").insert(log_data).execute()
        print(f"✅ Admin activity logged: {action}")
        
    except Exception as e:
        print(f"❌ Failed to log admin activity: {e}")