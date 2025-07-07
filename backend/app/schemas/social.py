from pydantic import BaseModel
from typing import Optional

class KakaoAuthRequest(BaseModel):
    code: str
    
class KakaoUserInfo(BaseModel):
    id: int
    nickname: Optional[str] = None
    email: Optional[str] = None
    profile_image: Optional[str] = None
    
class SocialLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    is_new_user: bool = False