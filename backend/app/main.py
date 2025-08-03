import sys
import os

# Python path 설정 (Render 배포용)
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.api import router as api_router
from app.core.config import settings
from app.core.logging import setup_logging, log_api_request, log_api_response, get_logger
from app.core.sentry import init_sentry
from postgrest.types import CountMethod
import time
import uuid

# Sentry 초기화 (로깅보다 먼저)
init_sentry()

# 로깅 시스템 초기화
setup_logging(
    log_level=settings.LOG_LEVEL,
    log_file=settings.LOG_FILE if settings.LOG_FILE else None
)

logger = get_logger(__name__)

app = FastAPI(
    title="동네속닥 API",
    description="우리 동네 이슈 제보 커뮤니티 플랫폼 API",
    version="0.1.0",
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# 로깅 미들웨어 추가
@app.middleware("http")
async def logging_middleware(request: Request, call_next):
    request_id = str(uuid.uuid4())
    start_time = time.time()
    
    # 요청 로깅
    log_api_request(
        request_id=request_id,
        method=request.method,
        path=request.url.path,
        user_id=getattr(request.state, 'user_id', None)
    )
    
    response = await call_next(request)
    
    # 응답 로깅
    response_time = time.time() - start_time
    log_api_response(
        request_id=request_id,
        status_code=response.status_code,
        response_time=response_time
    )
    
    return response

# API 라우터 연결
app.include_router(api_router)

@app.get("/")
async def root():
    logger.info("루트 엔드포인트 호출")
    return {"message": "동네속닥 API에 오신 것을 환영합니다!"}

@app.get("/health")
async def health_check():
    try:
        from app.db.supabase_client import supabase

        try:
            response = (
                supabase.table("profiles")
                .select("*", count=CountMethod.exact)
                .limit(1)
                .execute()
            )
            db_status = "connected"
            db_count = response.count

        except Exception as db_error:
            db_status = f"error: {str(db_error)}"
            db_count = None

        return {
            "status": "healthy",
            "database": {
                "status": db_status,
                "profile_count": db_count
            },
            "api_version": "0.1.0",
            "environment": settings.ENVIRONMENT
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "api_version": "0.1.0"
        }
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)