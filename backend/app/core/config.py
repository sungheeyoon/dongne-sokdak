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
    KAKAO_REDIRECT_URI: str = os.getenv("KAKAO_REDIRECT_URI", "http://localhost:3000/auth/kakao/callback")
    
    # CORS 설정 (기본값)
    _CORS_ORIGINS_STR: str = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000,http://172.24.19.106:3000")
    
    @property
    def CORS_ORIGINS(self) -> List[str]:
        return [origin.strip() for origin in self._CORS_ORIGINS_STR.split(",") if origin.strip()]
    
    # 환경별 추가 허용 도메인
    @property
    def allowed_origins(self) -> List[str]:
        origins = self.CORS_ORIGINS
        
        # 운영 환경에서는 실제 도메인 추가
        if self.ENVIRONMENT == "production":
            production_origins = os.getenv("CORS_ORIGINS", "").split(",")
            origins.extend([origin.strip() for origin in production_origins if origin.strip()])
        elif self.ENVIRONMENT == "staging":
            staging_origins = os.getenv("CORS_ORIGINS", "").split(",")
            origins.extend([origin.strip() for origin in staging_origins if origin.strip()])
        
        return origins
    
    class Config:
        env_file = ".env"

settings = Settings()