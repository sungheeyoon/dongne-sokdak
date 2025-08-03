import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv
from typing import List

# 환경별 설정 파일 로드
env = os.getenv("ENVIRONMENT", "development")
env_file = f"config/{env}.env"

# 환경별 파일을 먼저 로드한 후, .env 파일로 오버라이드
if os.path.exists(env_file):
    load_dotenv(env_file)
    print(f"Loaded environment file: {env_file}")

if os.path.exists(".env"):
    load_dotenv(".env", override=True)
    print("Loaded .env file")

class Settings(BaseSettings):
    PROJECT_NAME: str = "동네속닥 API"
    API_V1_STR: str = "/api/v1"
    
    # 환경 설정
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    
    # Supabase 설정
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    
    # JWT 설정
    JWT_SECRET: str = os.getenv("JWT_SECRET", "your-secret-key-change-this-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # 데이터베이스 설정
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    
    # 로깅 설정
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_FILE: str = os.getenv("LOG_FILE", "")
    
    # Sentry 설정
    SENTRY_DSN: str = os.getenv("SENTRY_DSN", "")
    
    # 카카오 OAuth 설정
    KAKAO_CLIENT_ID: str = os.getenv("KAKAO_CLIENT_ID", "")
    KAKAO_CLIENT_SECRET: str = os.getenv("KAKAO_CLIENT_SECRET", "")
    
    @property
    def KAKAO_REDIRECT_URI(self) -> str:
        """환경별 카카오 리다이렉트 URI"""
        # 환경 변수에서 명시적으로 설정된 경우 우선 사용
        env_redirect_uri = os.getenv("KAKAO_REDIRECT_URI")
        if env_redirect_uri:
            return env_redirect_uri
        
        # 환경별 기본값 설정
        if self.ENVIRONMENT == "production":
            return "https://dongne-sokdak.vercel.app/auth/kakao/callback"
        elif self.ENVIRONMENT == "staging":
            return "https://dongne-sokdak-staging.vercel.app/auth/kakao/callback"
        else:
            return "http://localhost:3000/auth/kakao/callback"
    
    # CORS 설정
    @property 
    def CORS_ORIGINS(self) -> List[str]:
        """환경별 CORS 허용 도메인"""
        # 기본 로컬 개발 도메인
        origins = [
            "http://localhost:3000",
            "http://127.0.0.1:3000", 
            "http://172.24.19.106:3000"
        ]
        
        # 환경별 추가 도메인
        if self.ENVIRONMENT == "production":
            origins.extend([
                "https://dongne-sokdak.vercel.app",
                "https://dongne-sokdak-backend.onrender.com"
            ])
        elif self.ENVIRONMENT == "staging":
            origins.extend([
                "https://dongne-sokdak-staging.vercel.app"
            ])
        
        # 환경 변수에서 추가 도메인 로드
        env_origins = os.getenv("CORS_ORIGINS", "")
        if env_origins:
            origins.extend([origin.strip() for origin in env_origins.split(",") if origin.strip()])
        
        return list(set(origins))  # 중복 제거
    
    class Config:
        env_file = ".env"
        extra = "ignore"  # 추가 환경변수 무시

settings = Settings()