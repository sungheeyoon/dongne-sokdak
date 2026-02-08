from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from typing import Any
from datetime import timedelta
from app.core.security import create_access_token
from app.core.config import settings
from app.schemas.token import Token
from app.schemas.user import UserCreate, User
from app.schemas.social import KakaoAuthRequest, GoogleAuthRequest, SocialLoginResponse
from app.services.social_auth import SocialAuthService
from app.db.supabase_client import supabase
from app.api.deps import get_supabase
from supabase.client import Client
import uuid
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/register", response_model=User)
async def register(
    user_in: UserCreate,
    supabase: Client = Depends(get_supabase)
) -> Any:
    """
    사용자 회원가입
    """
    try:
        # Determine redirect URL based on environment
        redirect_url = "http://localhost:3000/auth/callback"
        if settings.ENVIRONMENT == "production":
            redirect_url = "https://dongne-sokdak.vercel.app/auth/callback"
        elif settings.ENVIRONMENT == "staging":
            redirect_url = "https://dongne-sokdak-staging.vercel.app/auth/callback"

        # Supabase Auth로 사용자 생성
        # data 옵션을 통해 user_metadata에 nickname을 전달하면, 
        # handle_new_user 트리거가 이를 사용하여 profiles 테이블에 레코드를 생성합니다.
        auth_response = supabase.auth.sign_up({
            "email": user_in.email,
            "password": user_in.password,
            "options": {
                "data": {
                    "full_name": user_in.nickname
                },
                "email_redirect_to": redirect_url
            }
        })
        
        if auth_response.user is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="회원가입 처리 중 오류가 발생했습니다",
            )
        
        user_id = auth_response.user.id
        
        # 프로필 생성은 DB 트리거(handle_new_user)가 자동으로 처리하므로
        # 별도의 insert 로직을 수행하지 않습니다.
        
        return {
            "id": user_id,
            "email": user_in.email,
            "nickname": user_in.nickname,
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"회원가입 중 오류가 발생했습니다: {str(e)}",
        )

@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    supabase: Client = Depends(get_supabase)
) -> Any:
    """
    사용자 로그인 및 토큰 발급
    """
    try:
        auth_response = supabase.auth.sign_in_with_password({
            "email": form_data.username,
            "password": form_data.password,
        })
        
        if auth_response.user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="이메일 또는 비밀번호가 올바르지 않습니다",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        return {
            "access_token": create_access_token(
                subject=auth_response.user.id, expires_delta=access_token_expires
            ),
            "token_type": "bearer",
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"로그인 중 오류가 발생했습니다: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

@router.post("/logout")
async def logout(
    supabase: Client = Depends(get_supabase)
) -> Any:
    """
    사용자 로그아웃
    """
    try:
        supabase.auth.sign_out()
        return {"message": "로그아웃 되었습니다"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"로그아웃 중 오류가 발생했습니다: {str(e)}",
        )

@router.post("/social/kakao", response_model=SocialLoginResponse)
async def login_kakao(
    request: KakaoAuthRequest,
) -> Any:
    """
    카카오 소셜 로그인
    프론트엔드에서 전달받은 인가 코드로 로그인 처리
    """
    # 1. 인가 코드로 카카오 ID 토큰 발급
    id_token = await SocialAuthService.get_kakao_token(request.code)
    
    # 2. Supabase 로그인
    auth_result = await SocialAuthService.sign_in_with_id_token("kakao", id_token)
    
    return {
        "access_token": auth_result["access_token"],
        "token_type": "bearer",
        "user_id": auth_result["user"].id,
        "is_new_user": False # Supabase가 처리하므로 정확히 알기 어려움 (추가 로직 필요 시 구현)
    }

@router.post("/social/google", response_model=SocialLoginResponse)
async def login_google(
    request: GoogleAuthRequest,
) -> Any:
    """
    구글 소셜 로그인
    프론트엔드에서 전달받은 인가 코드로 로그인 처리
    """
    # 1. 인가 코드로 구글 ID 토큰 발급
    id_token = await SocialAuthService.get_google_token(request.code)
    
    # 2. Supabase 로그인
    auth_result = await SocialAuthService.sign_in_with_id_token("google", id_token)
    
    return {
        "access_token": auth_result["access_token"],
        "token_type": "bearer",
        "user_id": auth_result["user"].id,
        "is_new_user": False
    }

