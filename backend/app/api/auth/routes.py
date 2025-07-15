from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from typing import Any
from datetime import timedelta
from app.core.security import create_access_token
from app.core.config import settings
from app.schemas.token import Token
from app.schemas.user import UserCreate, User
from app.schemas.social import KakaoAuthRequest, SocialLoginResponse
from app.schemas.webhook import KakaoWebhookRequest, KakaoWebhookResponse
from app.services.kakao_oauth import kakao_oauth_service
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

@router.get("/kakao/auth-url")
async def get_kakao_auth_url():
    """
    카카오 로그인 인증 URL 반환
    """
    return {
        "auth_url": kakao_oauth_service.get_authorization_url()
    }

@router.post("/kakao/login", response_model=SocialLoginResponse)
async def kakao_login(
    auth_request: KakaoAuthRequest,
    supabase: Client = Depends(get_supabase)
) -> Any:
    """
    카카오 OAuth 코드로 로그인 처리
    """
    try:
        # 1. 카카오 액세스 토큰 가져오기
        kakao_access_token = await kakao_oauth_service.get_access_token(auth_request.code)
        if not kakao_access_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="카카오 인증 실패"
            )
        
        # 2. 카카오 사용자 정보 가져오기
        kakao_user = await kakao_oauth_service.get_user_info(kakao_access_token)
        if not kakao_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="카카오 사용자 정보 조회 실패"
            )
        
        # 3. 기존 사용자 확인 (카카오 ID로)
        existing_user = supabase.table("profiles").select("*").eq("kakao_id", str(kakao_user.id)).execute()
        
        is_new_user = False
        user_id = None
        
        if existing_user.data and len(existing_user.data) > 0:
            # 기존 사용자
            user_id = existing_user.data[0]["id"]
        else:
            # 새 사용자 생성
            is_new_user = True
            user_id = str(uuid.uuid4())
            
            # 이메일로도 중복 확인 (카카오 계정과 기존 이메일 계정 연동)
            email_check = None
            if kakao_user.email:
                email_check = supabase.table("profiles").select("*").eq("email", kakao_user.email).execute()
            
            if email_check and email_check.data and len(email_check.data) > 0:
                # 기존 이메일 계정에 카카오 정보 연동
                user_id = email_check.data[0]["id"]
                supabase.table("profiles").update({
                    "kakao_id": str(kakao_user.id),
                    "avatar_url": kakao_user.profile_image or email_check.data[0].get("avatar_url")
                }).eq("id", user_id).execute()
                is_new_user = False
            else:
                # 완전히 새로운 사용자
                profile_data = {
                    "id": user_id,
                    "kakao_id": str(kakao_user.id),
                    "email": kakao_user.email,
                    "nickname": kakao_user.nickname or f"카카오사용자{kakao_user.id}",
                    "avatar_url": kakao_user.profile_image,
                    "social_provider": "kakao"
                }
                
                profile_response = supabase.table("profiles").insert(profile_data).execute()
                if not profile_response.data or len(profile_response.data) == 0:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="사용자 프로필 생성 실패"
                    )
        
        # 4. JWT 토큰 생성
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            subject=user_id, 
            expires_delta=access_token_expires
        )
        
        return SocialLoginResponse(
            access_token=access_token,
            token_type="bearer",
            user_id=user_id,
            is_new_user=is_new_user
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"카카오 로그인 처리 중 오류: {str(e)}"
        )


@router.post("/kakao/webhook", response_model=KakaoWebhookResponse)
async def kakao_webhook(
    webhook_data: KakaoWebhookRequest,
    supabase: Client = Depends(get_supabase)
) -> Any:
    """
    카카오 연결 끊기 웹훅 처리
    사용자가 카카오에서 앱 연결을 끊었을 때 호출됩니다.
    """
    try:
        logger.info(f"카카오 웹훅 수신: {webhook_data.event_type}, 사용자 ID: {webhook_data.data.user_id}")
        
        # 연결 끊기 이벤트 처리
        if webhook_data.event_type == "user.unlinked":
            kakao_user_id = str(webhook_data.data.user_id)
            
            # 해당 카카오 ID를 가진 사용자 찾기
            user_result = supabase.table("profiles").select("*").eq("kakao_id", kakao_user_id).execute()
            
            if user_result.data and len(user_result.data) > 0:
                user = user_result.data[0]
                user_id = user["id"]
                
                # 카카오 정보 제거 (계정은 유지, 카카오 연동만 해제)
                update_data = {
                    "kakao_id": None,
                    "social_provider": None
                }
                
                # 만약 카카오로만 가입한 사용자라면 계정을 비활성화
                if not user.get("email") or user.get("social_provider") == "kakao":
                    update_data["is_active"] = False
                    logger.info(f"카카오 전용 계정 비활성화: {user_id}")
                
                supabase.table("profiles").update(update_data).eq("id", user_id).execute()
                
                # 관리자 활동 로그에 기록 (시스템 이벤트로)
                log_data = {
                    "admin_id": None,  # 시스템 이벤트
                    "action": "KAKAO_UNLINKED",
                    "target_type": "user",
                    "target_id": user_id,
                    "details": {
                        "kakao_user_id": kakao_user_id,
                        "event_type": webhook_data.event_type,
                        "app_id": webhook_data.app_id,
                        "user_deactivated": update_data.get("is_active") == False
                    },
                    "ip_address": "system",
                    "user_agent": "kakao_webhook"
                }
                
                supabase.table("admin_activity_logs").insert(log_data).execute()
                logger.info(f"카카오 연결 해제 처리 완료: {user_id}")
            else:
                logger.warning(f"카카오 연결 해제 요청되었지만 해당 사용자를 찾을 수 없음: {kakao_user_id}")
        
        return KakaoWebhookResponse(
            status="success",
            message="웹훅 처리 완료"
        )
        
    except Exception as e:
        logger.error(f"카카오 웹훅 처리 중 오류: {str(e)}")
        # 웹훅은 실패해도 200 OK를 반환해야 함 (카카오 요구사항)
        return KakaoWebhookResponse(
            status="error",
            message=f"처리 중 오류 발생: {str(e)}"
        )