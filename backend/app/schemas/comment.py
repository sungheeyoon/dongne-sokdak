from typing import Optional, List
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

class CommentBase(BaseModel):
    content: str

class CommentCreate(CommentBase):
    report_id: UUID
    parent_comment_id: Optional[UUID] = None  # 대댓글용

class CommentUpdate(BaseModel):
    content: Optional[str] = None

class Comment(CommentBase):
    id: UUID
    report_id: UUID
    user_id: UUID
    parent_comment_id: Optional[UUID] = None  # 대댓글용
    user_nickname: Optional[str] = None
    user_avatar_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    replies: Optional[List['Comment']] = []  # 답글 목록

    class Config:
        from_attributes = True

# Pydantic의 순환 참조 해결
Comment.model_rebuild()