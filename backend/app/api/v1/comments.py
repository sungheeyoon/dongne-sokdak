from fastapi import APIRouter, Depends, HTTPException, status
from typing import Any, List
from uuid import UUID
from app.schemas.comment import Comment, CommentCreate, CommentUpdate
from app.api.deps import get_current_active_user, get_supabase
from app.services import comment_service
from supabase.client import Client

router = APIRouter()

@router.post("/", response_model=Comment)
async def create_comment(
    comment_in: CommentCreate,
    current_user_id: str = Depends(get_current_active_user),
    supabase: Client = Depends(get_supabase)
) -> Any:
    """새 댓글 생성 (일반 댓글 또는 대댓글)"""
    return await comment_service.create_comment(supabase, comment_in, current_user_id)

@router.get("/report/{report_id}", response_model=List[Comment])
async def get_comments_by_report(
    report_id: UUID,
    skip: int = 0,
    limit: int = 100,
    supabase: Client = Depends(get_supabase)
) -> Any:
    """특정 제보에 달린 댓글 목록 조회 (계층 구조로 반환)"""
    return await comment_service.get_comments_by_report(supabase, str(report_id), skip, limit)

@router.put("/{comment_id}", response_model=Comment)
async def update_comment(
    comment_id: UUID,
    comment_in: CommentUpdate,
    current_user_id: str = Depends(get_current_active_user),
    supabase: Client = Depends(get_supabase)
) -> Any:
    """댓글 수정"""
    return await comment_service.update_comment(supabase, str(comment_id), comment_in, current_user_id)

@router.delete("/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    comment_id: UUID,
    current_user_id: str = Depends(get_current_active_user),
    supabase: Client = Depends(get_supabase)
):
    """댓글 삭제"""
    await comment_service.delete_comment(supabase, str(comment_id), current_user_id)
    return
