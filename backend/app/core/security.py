from typing import Optional, Union, Dict, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from .config import settings
from supabase.client import create_client


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

# Supabase 클라이언트 생성
supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

async def get_current_user(token: str = Depends(oauth2_scheme)) -> Optional[str]:
    if not token:
        # No token provided
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="인증 토큰이 필요합니다",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        # Token received for verification

        # Supabase JWT 토큰 검증
        try:
            response = supabase_client.auth.get_user(token)
            user = getattr(response, "user", None)
            if user is None or getattr(user, "id", None) is None:
                # No Supabase user found
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="유효하지 않은 토큰입니다",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            # Supabase user verification successful
            return user.id

        except HTTPException:
            raise
        except Exception as supabase_error:
            # Supabase token verification failed

            # 자체 JWT 검증
            try:
                payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.ALGORITHM])
                user_id = payload.get("sub")
                if not isinstance(user_id, str):
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="유효하지 않은 토큰 형식입니다",
                        headers={"WWW-Authenticate": "Bearer"},
                    )
                # Self JWT verification successful
                return user_id
            except JWTError as jwt_error:
                # Self JWT verification also failed
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="유효하지 않은 토큰입니다",
                    headers={"WWW-Authenticate": "Bearer"},
                )

    except HTTPException:
        raise
    except Exception as e:
        # Authentication process failed
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="인증 처리 중 오류가 발생했습니다",
            headers={"WWW-Authenticate": "Bearer"},
        )

def create_access_token(subject: Union[str, Dict[str, Any]], expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode: Dict[str, Any] = {"exp": expire}
    if isinstance(subject, dict):
        to_encode.update(subject)
    else:
        to_encode["sub"] = subject
    
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.ALGORITHM)
    return encoded_jwt
