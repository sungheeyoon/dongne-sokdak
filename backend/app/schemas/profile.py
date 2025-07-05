from typing import Optional, Dict, Any
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

class NeighborhoodInfo(BaseModel):
    place_name: str  # 동네 이름 (예: "부평역", "강남구청")
    address: str     # 주소 (예: "인천광역시 부평구 부평동")
    lat: float       # 위도
    lng: float       # 경도

class ProfileBase(BaseModel):
    nickname: str
    location: Optional[Dict[str, float]] = None  # {"lat": float, "lng": float} - 기존 호환성 유지
    neighborhood: Optional[NeighborhoodInfo] = None  # 내 동네 설정

class ProfileCreate(ProfileBase):
    id: UUID

class ProfileUpdate(BaseModel):
    nickname: Optional[str] = None
    location: Optional[Dict[str, float]] = None
    neighborhood: Optional[NeighborhoodInfo] = None  # 내 동네 설정/수정

class NeighborhoodUpdate(BaseModel):
    neighborhood: NeighborhoodInfo

class AvatarUpdate(BaseModel):
    avatar_url: str

class ProfileStats(BaseModel):
    report_count: int
    comment_count: int
    vote_count: int
    joined_at: str

class Profile(ProfileBase):
    id: UUID
    user_id: UUID  # 프론트엔드 호환성을 위해 추가
    avatar_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    stats: Optional[ProfileStats] = None

    class Config:
        from_attributes = True
