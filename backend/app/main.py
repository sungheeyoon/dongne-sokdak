import sys
import os

# Python path 설정 (Render 배포용)
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api import router as api_router
from app.core.config import settings
from app.core.logging import setup_logging, log_api_request, log_api_response, get_logger
from app.core.sentry import init_sentry
from postgrest.types import CountMethod
from app.utils.blocking_db import execute
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

# 처리되지 않은 예외를 일반 응답으로 바꾼다.
#
# 미들웨어 순서가 이 파일에서 유일하게 까다로운 부분이다. Starlette은 나중에
# 추가한 미들웨어를 바깥에 두므로, **CORS보다 먼저 추가해야** 이 미들웨어가 가장
# 안쪽에 놓이고 여기서 만든 500 응답이 CORSMiddleware를 거쳐 나가면서 헤더를 얻는다.
#
# @app.exception_handler(Exception)으로는 안 된다 — FastAPI는 그 핸들러를 CORS보다
# 바깥인 ServerErrorMiddleware에 붙이기 때문에 응답에 Access-Control-Allow-Origin이
# 붙지 않는다. 그러면 브라우저는 본문을 읽지 못하고 fetch를 "Failed to fetch"로
# 실패시키고, 프론트엔드는 서버가 꺼졌다고 오진한다 — 실제로는 서버가 살아서 500을
# 돌려준 상황이다.
@app.middleware("http")
async def unhandled_exception_middleware(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception:
        # 원인은 서버 로그에만 남기고, 응답 본문에는 내부 상세를 싣지 않는다.
        logger.exception(f"처리되지 않은 예외: {request.method} {request.url.path}")
        return JSONResponse(
            status_code=500,
            content={"detail": "서버에서 요청을 처리하지 못했습니다"},
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

@app.get("/health/live")
async def health_live():
    # Liveness probe: 프로세스 생존만 확인. DB 호출 없음 → Supabase 장애여도 200.
    return {"status": "alive", "api_version": "0.1.0"}


@app.get("/health/ready")
async def health_ready():
    return await health_check()


@app.get("/health")
async def health_check():
    try:
        from app.db.supabase_client import supabase

        try:
            response = await execute(
                supabase.table("profiles")
                .select("*", count=CountMethod.exact)
                .limit(1)
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