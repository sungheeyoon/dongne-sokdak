from fastapi import Depends
from app.core.security import get_current_user
from app.db.supabase_client import supabase

async def get_current_active_user(current_user_id: str = Depends(get_current_user)) -> str:
    # 추가적인 사용자 검증이 필요한 경우 여기서 처리
    return current_user_id

async def get_supabase():
    return supabase