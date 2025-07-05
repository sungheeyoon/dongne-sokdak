from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

class VoteBase(BaseModel):
    report_id: UUID

class VoteCreate(VoteBase):
    pass

class Vote(VoteBase):
    id: UUID
    user_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True