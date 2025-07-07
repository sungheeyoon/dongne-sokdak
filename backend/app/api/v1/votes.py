from fastapi import APIRouter, Depends, HTTPException, status
from typing import Any, Dict
from uuid import UUID
from app.schemas.vote import Vote, VoteCreate
from app.api.deps import get_current_active_user, get_supabase
from supabase.client import Client

router = APIRouter()

@router.post("/", response_model=Vote)
async def create_vote(
    vote_in: VoteCreate,
    current_user_id: str = Depends(get_current_active_user),
    supabase: Client = Depends(get_supabase)
) -> Any:
    """
    특정 제보에 공감(투표) 추가
    """
    try:
        # 제보가 존재하는지 확인
        report_response = supabase.table("reports").select("id").eq("id", str(vote_in.report_id)).execute()
        
        if len(report_response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="공감할 제보를 찾을 수 없습니다",
            )
        
        # 이미 공감했는지 확인
        vote_response = supabase.table("votes").select("id").eq("report_id", str(vote_in.report_id)).eq("user_id", current_user_id).execute()
        
        print(f"🔍 공감 확인 - Report: {vote_in.report_id}, User: {current_user_id}, 기존 공감: {len(vote_response.data)}개")
        
        if len(vote_response.data) > 0:
            print(f"❌ 중복 공감 시도 차단")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="이미 이 제보에 공감했습니다",
            )
        
        # 공감 데이터 준비
        vote_data = {
            "report_id": str(vote_in.report_id),
            "user_id": current_user_id
        }
        
        # 공감 생성
        response = supabase.table("votes").insert(vote_data).execute()
        
        if len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="공감 처리 중 오류가 발생했습니다",
            )
        
        return response.data[0]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"공감 처리 중 오류가 발생했습니다: {str(e)}",
        )

@router.delete("/report/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vote(
    report_id: UUID,
    current_user_id: str = Depends(get_current_active_user),
    supabase: Client = Depends(get_supabase)
):
    """
    특정 제보에 대한 공감(투표) 취소
    """
    try:
        # 제보가 존재하는지 확인
        report_response = supabase.table("reports").select("id").eq("id", str(report_id)).execute()
        
        if len(report_response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="제보를 찾을 수 없습니다",
            )
        
        # 공감 정보 가져오기
        vote_response = supabase.table("votes").select("id").eq("report_id", str(report_id)).eq("user_id", current_user_id).execute()
        
        if len(vote_response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="공감 정보를 찾을 수 없습니다",
            )
        
        vote_id = vote_response.data[0]["id"]
        
        # 공감 삭제
        response = supabase.table("votes").delete().eq("id", vote_id).execute()
        
        if len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="공감 취소 중 오류가 발생했습니다",
            )
        
        return
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"공감 취소 중 오류가 발생했습니다: {str(e)}",
        )

@router.get("/count/{report_id}", response_model=Dict[str, int])
async def get_vote_count(
    report_id: UUID,
    supabase: Client = Depends(get_supabase)
) -> Any:
    """
    특정 제보의 공감 수 조회
    """
    try:
        # 제보가 존재하는지 확인
        report_response = supabase.table("reports").select("id").eq("id", str(report_id)).execute()
        
        if len(report_response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="제보를 찾을 수 없습니다",
            )
        
        # 투표 수 계산
        votes_response = supabase.table("votes").select("id").eq("report_id", str(report_id)).execute()
        vote_count = len(votes_response.data)
        
        return {"count": vote_count}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"공감 수 조회 중 오류가 발생했습니다: {str(e)}",
        )

@router.get("/check/{report_id}", response_model=Dict[str, bool])
async def check_vote(
    report_id: UUID,
    current_user_id: str = Depends(get_current_active_user),
    supabase: Client = Depends(get_supabase)
) -> Any:
    """
    사용자가 특정 제보에 공감했는지 확인
    """
    try:
        # 제보가 존재하는지 확인
        report_response = supabase.table("reports").select("id").eq("id", str(report_id)).execute()
        
        if len(report_response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="제보를 찾을 수 없습니다",
            )
        
        # 공감 정보 가져오기
        vote_response = supabase.table("votes").select("id").eq("report_id", str(report_id)).eq("user_id", current_user_id).execute()
        
        voted = len(vote_response.data) > 0
        
        return {"voted": voted}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"공감 확인 중 오류가 발생했습니다: {str(e)}",
        )