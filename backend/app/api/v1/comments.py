from fastapi import APIRouter, Depends, HTTPException, status
from typing import Any, List
from uuid import UUID
from app.schemas.comment import Comment, CommentCreate, CommentUpdate
from app.api.deps import get_current_active_user, get_supabase
from supabase.client import Client

router = APIRouter()

@router.post("/", response_model=Comment)
async def create_comment(
    comment_in: CommentCreate,
    current_user_id: str = Depends(get_current_active_user),
    supabase: Client = Depends(get_supabase)
) -> Any:
    """
    새 댓글 생성 (일반 댓글 또는 대댓글)
    """
    try:
        print(f"📝 댓글 생성 요청 데이터: {comment_in}")
        print(f"👤 현재 사용자 ID: {current_user_id}")
        
        # 제보가 존재하는지 확인
        report_response = supabase.table("reports").select("id").eq("id", str(comment_in.report_id)).execute()
        print(f"📊 제보 확인 결과: {len(report_response.data)}개")
        
        if len(report_response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="댓글을 작성할 제보를 찾을 수 없습니다",
            )
        
        # 대댓글인 경우 부모 댓글 확인
        if comment_in.parent_comment_id:
            parent_response = supabase.table("comments").select("id, parent_comment_id").eq("id", str(comment_in.parent_comment_id)).execute()
            
            if len(parent_response.data) == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="답글을 달 댓글을 찾을 수 없습니다",
                )
            
            parent_comment = parent_response.data[0]
            
            # 대대댓글 방지 (depth 1 제한)
            if parent_comment.get("parent_comment_id"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="답글에는 답글을 달 수 없습니다",
                )
        
        # 댓글 데이터 준비
        comment_data = {
            "report_id": str(comment_in.report_id),
            "user_id": current_user_id,
            "content": comment_in.content,
            "parent_comment_id": str(comment_in.parent_comment_id) if comment_in.parent_comment_id else None
        }
        
        print(f"💾 저장할 댓글 데이터: {comment_data}")
        
        # 댓글 생성
        response = supabase.table("comments").insert(comment_data).execute()
        print(f"✅ 댓글 생성 응답: {response.data}")
        
        if len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="댓글 생성 중 오류가 발생했습니다",
            )
        
        comment = response.data[0]
        
        # 사용자 정보 추가
        profile_response = supabase.table("profiles").select("nickname, avatar_url").eq("id", current_user_id).execute()
        
        if len(profile_response.data) > 0:
            profile = profile_response.data[0]
            comment["user_nickname"] = profile.get("nickname") or "사용자"
            comment["user_avatar_url"] = profile.get("avatar_url")
        else:
            comment["user_nickname"] = "사용자"
            comment["user_avatar_url"] = None
        
        comment["replies"] = []  # 새 댓글은 답글이 없음
        
        return comment
        
    except Exception as e:
        print(f"❌ 댓글 생성 오류: {str(e)}")
        print(f"❌ 오류 타입: {type(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"댓글 생성 중 오류가 발생했습니다: {str(e)}",
        )

@router.get("/report/{report_id}", response_model=List[Comment])
async def get_comments_by_report(
    report_id: UUID,
    skip: int = 0,
    limit: int = 100,
    supabase: Client = Depends(get_supabase)
) -> Any:
    """
    특정 제보에 달린 댓글 목록 조회 (계층 구조로 반환)
    """
    try:
        # 제보가 존재하는지 확인
        report_response = supabase.table("reports").select("id").eq("id", str(report_id)).execute()
        
        if len(report_response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="제보를 찾을 수 없습니다",
            )
        
        # 모든 댓글 가져오기 (부모 댓글과 대댓글 모두)
        response = supabase.table("comments").select("*").eq("report_id", str(report_id)).order("created_at", desc=False).execute()
        
        all_comments = response.data
        
        # 사용자 정보 추가
        for comment in all_comments:
            profile_response = supabase.table("profiles").select("nickname, avatar_url").eq("id", comment["user_id"]).execute()
            
            if len(profile_response.data) > 0:
                profile = profile_response.data[0]
                comment["user_nickname"] = profile.get("nickname") or "알 수 없음"
                comment["user_avatar_url"] = profile.get("avatar_url")
            else:
                comment["user_nickname"] = "알 수 없음"
                comment["user_avatar_url"] = None
            
            comment["replies"] = []
        
        # 부모 댓글과 대댓글 분리
        parent_comments = []
        reply_comments = []
        
        for comment in all_comments:
            if comment.get("parent_comment_id"):
                reply_comments.append(comment)
            else:
                parent_comments.append(comment)
        
        # 대댓글을 부모 댓글에 연결
        for reply in reply_comments:
            parent_id = reply["parent_comment_id"]
            for parent in parent_comments:
                if parent["id"] == parent_id:
                    parent["replies"].append(reply)
                    break
        
        # 페이지네이션 적용 (부모 댓글만)
        paginated_comments = parent_comments[skip:skip + limit]
        
        return paginated_comments
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"댓글 목록 조회 중 오류가 발생했습니다: {str(e)}",
        )

@router.put("/{comment_id}", response_model=Comment)
async def update_comment(
    comment_id: UUID,
    comment_in: CommentUpdate,
    current_user_id: str = Depends(get_current_active_user),
    supabase: Client = Depends(get_supabase)
) -> Any:
    """
    댓글 수정
    """
    try:
        # 댓글이 존재하는지 확인
        comment_response = supabase.table("comments").select("*").eq("id", str(comment_id)).execute()
        
        if len(comment_response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="댓글을 찾을 수 없습니다",
            )
        
        comment = comment_response.data[0]
        
        # 댓글 작성자만 수정 가능하도록 확인
        if comment["user_id"] != current_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="이 댓글을 수정할 권한이 없습니다",
            )
        
        # 업데이트할 데이터 준비
        update_data = {}
        if comment_in.content is not None:
            update_data["content"] = comment_in.content
            # 수정 시간 명시적 업데이트
            from datetime import datetime, timezone
            update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        print(f"💾 업데이트할 데이터: {update_data}")
        
        # 업데이트 실행
        response = supabase.table("comments").update(update_data).eq("id", str(comment_id)).execute()
        
        print(f"✅ 댓글 업데이트 응답: {response.data}")
        
        if len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="댓글 수정 중 오류가 발생했습니다",
            )
        
        updated_comment = response.data[0]
        
        # 사용자 정보 추가
        profile_response = supabase.table("profiles").select("nickname, avatar_url").eq("id", updated_comment["user_id"]).execute()
        
        if len(profile_response.data) > 0:
            profile = profile_response.data[0]
            updated_comment["user_nickname"] = profile.get("nickname")
            updated_comment["user_avatar_url"] = profile.get("avatar_url")
        else:
            updated_comment["user_nickname"] = "알 수 없음"
            updated_comment["user_avatar_url"] = None
        
        return updated_comment
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"댓글 수정 중 오류가 발생했습니다: {str(e)}",
        )

@router.delete("/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    comment_id: UUID,
    current_user_id: str = Depends(get_current_active_user),
    supabase: Client = Depends(get_supabase)
):
    """
    댓글 삭제
    """
    try:
        # 댓글이 존재하는지 확인
        comment_response = supabase.table("comments").select("*").eq("id", str(comment_id)).execute()
        
        if len(comment_response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="댓글을 찾을 수 없습니다",
            )
        
        comment = comment_response.data[0]
        
        # 댓글 작성자만 삭제 가능하도록 확인
        if comment["user_id"] != current_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="이 댓글을 삭제할 권한이 없습니다",
            )
        
        # 삭제 실행
        response = supabase.table("comments").delete().eq("id", str(comment_id)).execute()
        
        if len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="댓글 삭제 중 오류가 발생했습니다",
            )
        
        return
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"댓글 삭제 중 오류가 발생했습니다: {str(e)}",
        )