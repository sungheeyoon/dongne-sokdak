from pydantic import BaseModel, ConfigDict
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

    model_config = ConfigDict(from_attributes=True)