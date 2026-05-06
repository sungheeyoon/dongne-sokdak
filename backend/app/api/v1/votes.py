from fastapi import APIRouter, Depends, HTTPException, status
from typing import Any, Dict
from uuid import UUID
from app.schemas.vote import Vote, VoteCreate
from app.api.deps import get_current_active_user, get_supabase
from app.services import vote_service
from supabase.client import Client

router = APIRouter()

@router.post("/", response_model=Vote)
async def create_vote(
    vote_in: VoteCreate,
    current_user_id: str = Depends(get_current_active_user),
    supabase: Client = Depends(get_supabase)
) -> Any:
    """특정 제보에 공감(투표) 추가"""
    return await vote_service.create_vote(supabase, vote_in, current_user_id)

@router.delete("/report/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vote(
    report_id: UUID,
    current_user_id: str = Depends(get_current_active_user),
    supabase: Client = Depends(get_supabase)
):
    """특정 제보에 대한 공감(투표) 취소"""
    await vote_service.delete_vote(supabase, str(report_id), current_user_id)
    return

@router.get("/count/{report_id}", response_model=Dict[str, int])
async def get_vote_count(
    report_id: UUID,
    supabase: Client = Depends(get_supabase)
) -> Any:
    """특정 제보의 공감 수 조회"""
    count = await vote_service.get_vote_count(supabase, str(report_id))
    return {"count": count}

@router.get("/check/{report_id}", response_model=Dict[str, bool])
async def check_vote(
    report_id: UUID,
    current_user_id: str = Depends(get_current_active_user),
    supabase: Client = Depends(get_supabase)
) -> Any:
    """사용자가 특정 제보에 공감했는지 확인"""
    voted = await vote_service.check_vote(supabase, str(report_id), current_user_id)
    return {"voted": voted}
