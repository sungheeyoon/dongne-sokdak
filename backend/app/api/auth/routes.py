from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from typing import Any
from datetime import timedelta
from app.core.security import create_access_token
from app.core.config import settings
from app.schemas.token import Token
from app.schemas.user import UserCreate, User
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
        # Supabase Auth로 사용자 생성
        auth_response = supabase.auth.sign_up({
            "email": user_in.email,
            "password": user_in.password,
        })
        
        if auth_response.user is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="회원가입 처리 중 오류가 발생했습니다",
            )
        
        user_id = auth_response.user.id
        
        # 사용자 프로필 정보 저장
        profile_data = {
            "id": user_id,
            "nickname": user_in.nickname,
            "avatar_url": None,
        }
        
        profile_response = supabase.table("profiles").insert(profile_data).execute()
        
        if not profile_response.data or len(profile_response.data) == 0:
            # 프로필 생성 실패 시 생성된 사용자 계정도 삭제 (롤백)
            supabase.auth.admin.delete_user(user_id)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="사용자 프로필 생성 중 오류가 발생했습니다",
            )
        
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

