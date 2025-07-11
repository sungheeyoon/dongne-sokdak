import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from sentry_sdk.integrations.logging import LoggingIntegration
import os
from app.core.config import settings

def init_sentry():
    """Sentry 초기화"""
    sentry_dsn = os.getenv("SENTRY_DSN")
    
    if not sentry_dsn:
        # SENTRY_DSN not configured, error tracking disabled
        return
    
    # 환경별 설정
    environment = settings.ENVIRONMENT
    sample_rate = 1.0 if environment == "development" else 0.1
    
    sentry_sdk.init(
        dsn=sentry_dsn,
        environment=environment,
        integrations=[
            FastApiIntegration(auto_enabling_integrations=True),
            SqlalchemyIntegration(),
            LoggingIntegration(
                level=None,  # 모든 로그 레벨 캡처
                event_level=None  # 에러 이벤트로 전송하지 않음
            ),
        ],
        # 에러 샘플링 비율
        traces_sample_rate=sample_rate,
        # 성능 모니터링 활성화
        enable_tracing=True,
        # 개인정보 필터링
        before_send=filter_sensitive_data,
        # 태그 설정
        default_integrations=True,
    )
    
    # 기본 태그 설정
    sentry_sdk.set_tag("service", "dongne-sokdak-api")
    sentry_sdk.set_tag("version", "0.1.0")

def filter_sensitive_data(event, hint):
    """민감한 데이터 필터링"""
    
    # JWT 토큰 필터링
    if 'request' in event:
        headers = event['request'].get('headers', {})
        if 'Authorization' in headers:
            headers['Authorization'] = '[Filtered]'
    
    # 비밀번호 필터링
    if 'extra' in event:
        extra = event['extra']
        for key in list(extra.keys()):
            if any(sensitive in key.lower() for sensitive in ['password', 'secret', 'token', 'key']):
                extra[key] = '[Filtered]'
    
    return event

def capture_user_context(user_id: str, email: str = None):
    """사용자 컨텍스트 설정"""
    sentry_sdk.set_user({
        "id": user_id,
        "email": email
    })

def capture_custom_error(error_type: str, message: str, extra_data: dict = None):
    """커스텀 에러 캡처"""
    with sentry_sdk.push_scope() as scope:
        scope.set_tag("error_type", error_type)
        if extra_data:
            for key, value in extra_data.items():
                scope.set_extra(key, value)
        sentry_sdk.capture_message(message, level="error")

def capture_performance_event(operation: str, duration: float, context: dict = None):
    """성능 이벤트 캡처"""
    with sentry_sdk.push_scope() as scope:
        scope.set_tag("operation", operation)
        scope.set_extra("duration", duration)
        if context:
            for key, value in context.items():
                scope.set_extra(key, value)
        
        if duration > 1.0:  # 1초 이상 걸린 작업만 기록
            sentry_sdk.capture_message(
                f"Slow operation: {operation} took {duration:.2f}s",
                level="warning"
            )