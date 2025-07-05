from fastapi import APIRouter, Depends, HTTPException, status
from typing import Any, Optional
from uuid import UUID
from app.schemas.profile import Profile, ProfileUpdate, ProfileStats, AvatarUpdate, NeighborhoodUpdate
from app.api.deps import get_current_active_user, get_supabase
from supabase.client import Client
from datetime import datetime

router = APIRouter()

@router.get("/me", response_model=Profile)
async def get_my_profile(
    current_user_id: str = Depends(get_current_active_user),
    supabase: Client = Depends(get_supabase)
) -> Any:
    """
    내 프로필 조회 (통계 포함)
    """
    try:
        # 프로필 기본 정보 조회
        profile_response = supabase.table("profiles").select("*").eq("id", current_user_id).execute()
        
        if len(profile_response.data) == 0:
            # 프로필이 없으면 기본 프로필 생성
            user_response = supabase.auth.admin.get_user_by_id(current_user_id)
            if not user_response.user:
                raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
            
            user = user_response.user
            default_profile = {
                "id": current_user_id,
                "nickname": user.email.split("@")[0] if user.email else "사용자",
                "avatar_url": None
            }
            
            create_response = supabase.table("profiles").insert(default_profile).execute()
            profile = create_response.data[0]
        else:
            profile = profile_response.data[0]
        
        # 통계 정보 계산
        reports_response = supabase.table("reports").select("id").eq("user_id", current_user_id).execute()
        report_count = len(reports_response.data)
        
        comments_response = supabase.table("comments").select("id").eq("user_id", current_user_id).execute()
        comment_count = len(comments_response.data)
        
        votes_response = supabase.table("votes").select("id").eq("user_id", current_user_id).execute()
        vote_count = len(votes_response.data)
        
        joined_at = profile.get("created_at", datetime.now().isoformat())
        
        # 프로필에 user_id 필드 추가 (프론트엔드와 호환성을 위해)
        profile["user_id"] = profile["id"]
        
        # 통계 추가
        profile["stats"] = {
            "report_count": report_count,
            "comment_count": comment_count,
            "vote_count": vote_count,
            "joined_at": joined_at
        }
        
        return profile
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"프로필 조회 중 오류가 발생했습니다: {str(e)}",
        )

@router.put("/me", response_model=Profile)
async def update_my_profile(
    profile_in: ProfileUpdate,
    current_user_id: str = Depends(get_current_active_user),
    supabase: Client = Depends(get_supabase)
) -> Any:
    """
    내 프로필 수정
    """
    try:
        # 프로필 존재 확인
        profile_response = supabase.table("profiles").select("*").eq("id", current_user_id).execute()
        
        if len(profile_response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="프로필을 찾을 수 없습니다",
            )
        
        # 업데이트할 데이터 준비
        update_data = {}
        if profile_in.nickname is not None:
            # 닉네임 중복 확인
            existing_nickname = supabase.table("profiles").select("id").neq("id", current_user_id).eq("nickname", profile_in.nickname).execute()
            if len(existing_nickname.data) > 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="이미 사용 중인 닉네임입니다",
                )
            update_data["nickname"] = profile_in.nickname
        
        if profile_in.location is not None:
            update_data["location"] = f"POINT({profile_in.location['lng']} {profile_in.location['lat']})"
        
        # 수정 시간 업데이트
        update_data["updated_at"] = datetime.now().isoformat()
        
        # 프로필 업데이트
        response = supabase.table("profiles").update(update_data).eq("id", current_user_id).execute()
        
        if len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="프로필 수정 중 오류가 발생했습니다",
            )
        
        # user_id 필드 추가
        response.data[0]["user_id"] = response.data[0]["id"]
        
        return response.data[0]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"프로필 수정 중 오류가 발생했습니다: {str(e)}",
        )

@router.get("/{user_id}", response_model=Profile)
async def get_user_profile(
    user_id: UUID,
    supabase: Client = Depends(get_supabase)
) -> Any:
    """
    다른 사용자 프로필 조회 (공개 정보만)
    """
    try:
        # 프로필 정보 조회
        profile_response = supabase.table("profiles").select("*").eq("id", str(user_id)).execute()
        
        if len(profile_response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="프로필을 찾을 수 없습니다",
            )
        
        profile = profile_response.data[0]
        
        # 공개 통계만 제공
        reports_response = supabase.table("reports").select("id").eq("user_id", str(user_id)).execute()
        report_count = len(reports_response.data)
        
        comments_response = supabase.table("comments").select("id").eq("user_id", str(user_id)).execute()
        comment_count = len(comments_response.data)
        
        joined_at = profile.get("created_at", datetime.now().isoformat())
        
        # user_id 필드 추가
        profile["user_id"] = profile["id"]
        
        # 통계 추가 (공감 수는 비공개)
        profile["stats"] = {
            "report_count": report_count,
            "comment_count": comment_count,
            "vote_count": 0,  # 다른 사용자의 공감 수는 비공개
            "joined_at": joined_at
        }
        
        return profile
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"프로필 조회 중 오류가 발생했습니다: {str(e)}",
        )

@router.put("/avatar", response_model=dict)
async def update_avatar(
    avatar_data: AvatarUpdate,
    current_user_id: str = Depends(get_current_active_user),
    supabase: Client = Depends(get_supabase)
) -> Any:
    """
    아바타 이미지 업데이트
    """
    try:
        # 프로필 업데이트
        update_data = {
            "avatar_url": avatar_data.avatar_url,
            "updated_at": datetime.now().isoformat()
        }
        
        response = supabase.table("profiles").update(update_data).eq("id", current_user_id).execute()
        
        if len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="아바타 업데이트 중 오류가 발생했습니다",
            )
        
        return {"message": "아바타가 성공적으로 업데이트되었습니다", "avatar_url": avatar_data.avatar_url}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"아바타 업데이트 중 오류가 발생했습니다: {str(e)}",
        )

@router.put("/neighborhood", response_model=dict)
async def update_my_neighborhood(
    neighborhood_data: NeighborhoodUpdate,
    current_user_id: str = Depends(get_current_active_user),
    supabase: Client = Depends(get_supabase)
) -> Any:
    """
    내 동네 설정 업데이트
    """
    try:
        # 내 동네 정보를 JSON으로 저장
        neighborhood_json = {
            "place_name": neighborhood_data.neighborhood.place_name,
            "address": neighborhood_data.neighborhood.address,
            "lat": neighborhood_data.neighborhood.lat,
            "lng": neighborhood_data.neighborhood.lng
        }
        
        # 프로필 업데이트
        update_data = {
            "neighborhood": neighborhood_json,
            "updated_at": datetime.now().isoformat()
        }
        
        response = supabase.table("profiles").update(update_data).eq("id", current_user_id).execute()
        
        if len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="내 동네 설정 중 오류가 발생했습니다",
            )
        
        return {
            "message": "내 동네가 성공적으로 설정되었습니다", 
            "neighborhood": neighborhood_json
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"내 동네 설정 중 오류가 발생했습니다: {str(e)}",
        )

@router.delete("/neighborhood", response_model=dict)
async def delete_my_neighborhood(
    current_user_id: str = Depends(get_current_active_user),
    supabase: Client = Depends(get_supabase)
) -> Any:
    """
    내 동네 설정 삭제
    """
    try:
        # 내 동네 정보 삭제
        update_data = {
            "neighborhood": None,
            "updated_at": datetime.now().isoformat()
        }
        
        response = supabase.table("profiles").update(update_data).eq("id", current_user_id).execute()
        
        if len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="내 동네 삭제 중 오류가 발생했습니다",
            )
        
        return {"message": "내 동네 설정이 삭제되었습니다"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"내 동네 삭제 중 오류가 발생했습니다: {str(e)}",
        )
