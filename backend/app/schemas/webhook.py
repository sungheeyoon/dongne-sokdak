from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class KakaoWebhookUser(BaseModel):
    """카카오 웹훅 사용자 정보"""
    id: int
    has_signed_up: Optional[bool] = None


class KakaoWebhookData(BaseModel):
    """카카오 웹훅 데이터"""
    app_id: int
    user_id: int
    referrer_type: str


class KakaoWebhookRequest(BaseModel):
    """카카오 웹훅 요청"""
    app_id: int
    event_type: str  # "user.unlinked"
    data: KakaoWebhookData
    for_user: KakaoWebhookUser


class KakaoWebhookResponse(BaseModel):
    """카카오 웹훅 응답"""
    status: str = "success"
    message: str = "처리 완료"