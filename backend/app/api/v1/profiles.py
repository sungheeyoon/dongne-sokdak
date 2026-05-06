from fastapi import APIRouter, Depends, HTTPException, status
from typing import Any, Optional
from uuid import UUID
from app.schemas.profile import Profile, ProfileUpdate, ProfileStats, AvatarUpdate, NeighborhoodUpdate
from app.api.deps import get_current_active_user, get_supabase
from app.services import profile_service
from supabase.client import Client

router = APIRouter()

@router.get("/me", response_model=Profile)
async def get_my_profile(
    current_user_id: str = Depends(get_current_active_user),
    supabase: Client = Depends(get_supabase)
) -> Any:
    """내 프로필 조회 (통계 포함)"""
    return await profile_service.get_my_profile(supabase, current_user_id)

@router.put("/me", response_model=Profile)
async def update_my_profile(
    profile_in: ProfileUpdate,
    current_user_id: str = Depends(get_current_active_user),
    supabase: Client = Depends(get_supabase)
) -> Any:
    """내 프로필 수정"""
    result = await profile_service.update_profile(supabase, current_user_id, profile_in)
    if "error" in result:
        raise HTTPException(status_code=result["status_code"], detail=result["error"])
    return result

@router.get("/{user_id}", response_model=Profile)
async def get_user_profile(
    user_id: UUID,
    supabase: Client = Depends(get_supabase)
) -> Any:
    """다른 사용자 프로필 조회 (공개 정보만)"""
    result = await profile_service.get_user_profile(supabase, str(user_id))
    if result is None:
        raise HTTPException(status_code=404, detail="프로필을 찾을 수 없습니다")
    return result

@router.put("/avatar", response_model=dict)
async def update_avatar(
    avatar_data: AvatarUpdate,
    current_user_id: str = Depends(get_current_active_user),
    supabase: Client = Depends(get_supabase)
) -> Any:
    """아바타 이미지 업데이트"""
    result = await profile_service.update_avatar(supabase, current_user_id, avatar_data.avatar_url)
    if "error" in result:
        raise HTTPException(status_code=result["status_code"], detail=result["error"])
    return {"message": "아바타가 성공적으로 업데이트되었습니다", "avatar_url": avatar_data.avatar_url}

@router.put("/neighborhood", response_model=dict)
async def update_my_neighborhood(
    neighborhood_data: NeighborhoodUpdate,
    current_user_id: str = Depends(get_current_active_user),
    supabase: Client = Depends(get_supabase)
) -> Any:
    """내 동네 설정 업데이트"""
    result = await profile_service.update_neighborhood(supabase, current_user_id, neighborhood_data)
    if "error" in result:
        raise HTTPException(status_code=result["status_code"], detail=result["error"])
    return {
        "message": "내 동네가 성공적으로 설정되었습니다", 
        "neighborhood": result
    }

@router.delete("/neighborhood", response_model=dict)
async def delete_my_neighborhood(
    current_user_id: str = Depends(get_current_active_user),
    supabase: Client = Depends(get_supabase)
) -> Any:
    """내 동네 설정 삭제"""
    success = await profile_service.delete_neighborhood(supabase, current_user_id)
    if not success:
        raise HTTPException(status_code=400, detail="내 동네 삭제 중 오류가 발생했습니다")
    return {"message": "내 동네 설정이 삭제되었습니다"}
