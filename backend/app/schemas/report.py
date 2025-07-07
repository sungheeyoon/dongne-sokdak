from typing import Optional, Dict, List
from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from enum import Enum

class ReportCategory(str, Enum):
    NOISE = "NOISE"
    TRASH = "TRASH"
    FACILITY = "FACILITY"
    TRAFFIC = "TRAFFIC"
    OTHER = "OTHER"

class ReportStatus(str, Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"

class Location(BaseModel):
    lat: float
    lng: float

class ReportBase(BaseModel):
    title: str
    description: str
    location: Location
    address: Optional[str] = None
    category: ReportCategory = ReportCategory.OTHER

class ReportCreate(ReportBase):
    image_url: Optional[str] = None

class ReportUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    status: Optional[ReportStatus] = None
    category: Optional[ReportCategory] = None

class Report(ReportBase):
    id: UUID
    user_id: UUID
    status: ReportStatus
    image_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    vote_count: Optional[int] = 0
    comment_count: Optional[int] = 0
    user_voted: Optional[bool] = False

    class Config:
        from_attributes = True

class ReportInDB(Report):
    pass