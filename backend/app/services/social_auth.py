import httpx
from typing import Optional, Dict, Any
from app.core.config import settings
from app.db.supabase_client import supabase
from fastapi import HTTPException, status
import logging

logger = logging.getLogger(__name__)

class SocialAuthService:
    @staticmethod
    async def get_kakao_token(code: str) -> str:
        """
        카카오 인가 코드로 ID 토큰 발급
        """
        url = "https://kauth.kakao.com/oauth/token"
        headers = {
            "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
        }
        data = {
            "grant_type": "authorization_code",
            "client_id": settings.KAKAO_CLIENT_ID,
            "redirect_uri": settings.KAKAO_REDIRECT_URI,
            "code": code,
            "client_secret": settings.KAKAO_CLIENT_SECRET # Optional if configured
        }

        # Debug logging for troubleshooting
        safe_data = data.copy()
        if "client_secret" in safe_data:
            safe_data["client_secret"] = "***"
        logger.info(f"Exchange Kakao Token Request: {safe_data}")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, data=data)
            
        if response.status_code != 200:
            logger.error(f"Kakao token exchange failed: {response.text}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="카카오 로그인 처리에 실패했습니다."
            )
            
        token_data = response.json()
        
        # OIDC가 활성화되어 있어야 id_token이 반환됨
        if "id_token" not in token_data:
            logger.error("No id_token in Kakao response. Ensure OIDC is enabled in Kakao Developers.")
            # fallback: access_token을 사용하거나 에러 처리
            # 여기서는 id_token 필수라고 가정 (Supabase 연동 위해)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="카카오 ID 토큰을 발급받을 수 없습니다."
            )
            
        return token_data["id_token"]

    @staticmethod
    async def get_google_token(code: str) -> str:
        """
        구글 인가 코드로 ID 토큰 발급
        """
        url = "https://oauth2.googleapis.com/token"
        data = {
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, data=data)
            
        if response.status_code != 200:
            logger.error(f"Google token exchange failed: {response.text}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="구글 로그인 처리에 실패했습니다."
            )
            
        token_data = response.json()
        return token_data["id_token"]

    @staticmethod
    async def sign_in_with_id_token(provider: str, id_token: str) -> Dict[str, Any]:
        """
        Supabase에 ID 토큰으로 로그인
        """
        try:
            # Supabase auth.signInWithIdToken 사용
            # 주의: Supabase 프로젝트에서 해당 Provider가 활성화되어 있어야 함
            # 그리고 Client ID가 Supabase 설정과 일치해야 함
            auth_response = supabase.auth.sign_in_with_id_token({
                "provider": provider,  # 'kakao' or 'google'
                "token": id_token,
                # nonce가 필요한 경우 추가
            })
            
            if auth_response.user is None or auth_response.session is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Supabase 인증에 실패했습니다."
                )
                
            return {
                "access_token": auth_response.session.access_token,
                "refresh_token": auth_response.session.refresh_token,
                "user": auth_response.user,
                "token_type": "bearer"
            }
            
        except Exception as e:
            logger.error(f"Supabase sign in error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"로그인 처리 중 오류가 발생했습니다: {str(e)}"
            )
