import httpx
from typing import Optional, Dict, Any
from app.core.config import settings
from app.schemas.social import KakaoUserInfo

class KakaoOAuthService:
    """카카오 OAuth 서비스"""
    
    def __init__(self):
        self.client_id = settings.KAKAO_CLIENT_ID
        self.client_secret = settings.KAKAO_CLIENT_SECRET
        self.redirect_uri = settings.KAKAO_REDIRECT_URI
        
    async def get_access_token(self, auth_code: str) -> Optional[str]:
        """카카오 인증 코드로 액세스 토큰 가져오기"""
        url = "https://kauth.kakao.com/oauth/token"
        
        data = {
            "grant_type": "authorization_code",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "redirect_uri": self.redirect_uri,
            "code": auth_code,
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, data=data)
                response.raise_for_status()
                
                token_data = response.json()
                return token_data.get("access_token")
            except httpx.HTTPError as e:
                print(f"카카오 토큰 요청 실패: {e}")
                return None
    
    async def get_user_info(self, access_token: str) -> Optional[KakaoUserInfo]:
        """카카오 액세스 토큰으로 사용자 정보 가져오기"""
        url = "https://kapi.kakao.com/v2/user/me"
        
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, headers=headers)
                response.raise_for_status()
                
                user_data = response.json()
                
                # 카카오 사용자 정보 파싱
                kakao_account = user_data.get("kakao_account", {})
                profile = kakao_account.get("profile", {})
                
                return KakaoUserInfo(
                    id=user_data.get("id"),
                    nickname=profile.get("nickname"),
                    email=kakao_account.get("email"),
                    profile_image=profile.get("profile_image_url")
                )
            except httpx.HTTPError as e:
                print(f"카카오 사용자 정보 요청 실패: {e}")
                return None
    
    def get_authorization_url(self) -> str:
        """카카오 로그인 인증 URL 생성"""
        return (
            f"https://kauth.kakao.com/oauth/authorize"
            f"?client_id={self.client_id}"
            f"&redirect_uri={self.redirect_uri}"
            f"&response_type=code"
        )

# 싱글톤 인스턴스
kakao_oauth_service = KakaoOAuthService()