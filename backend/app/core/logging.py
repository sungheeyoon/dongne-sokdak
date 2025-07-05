import logging
import json
import sys
from datetime import datetime
from typing import Any, Dict
from pathlib import Path

class JSONFormatter(logging.Formatter):
    """JSON 형식의 로그 포매터"""
    
    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        
        # 추가 정보가 있으면 포함
        if hasattr(record, 'extra'):
            log_entry.update(record.extra)
            
        # 예외 정보가 있으면 포함
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)
            
        return json.dumps(log_entry, ensure_ascii=False)

def setup_logging(log_level: str = "INFO", log_file: str = None) -> None:
    """로깅 시스템 설정"""
    
    # 로그 레벨 설정
    level = getattr(logging, log_level.upper(), logging.INFO)
    
    # 루트 로거 설정
    root_logger = logging.getLogger()
    root_logger.setLevel(level)
    
    # 기존 핸들러 제거
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # 콘솔 핸들러 (JSON 형식)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(JSONFormatter())
    root_logger.addHandler(console_handler)
    
    # 파일 핸들러 (옵션)
    if log_file:
        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        
        file_handler = logging.FileHandler(log_file, encoding='utf-8')
        file_handler.setFormatter(JSONFormatter())
        root_logger.addHandler(file_handler)
    
    # 특정 라이브러리 로그 레벨 조정
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)

def get_logger(name: str) -> logging.Logger:
    """로거 인스턴스 반환"""
    return logging.getLogger(name)

def log_api_request(request_id: str, method: str, path: str, user_id: str = None):
    """API 요청 로깅"""
    logger = get_logger("api.request")
    logger.info(
        "API 요청",
        extra={
            "request_id": request_id,
            "method": method,
            "path": path,
            "user_id": user_id,
            "event_type": "api_request"
        }
    )

def log_api_response(request_id: str, status_code: int, response_time: float):
    """API 응답 로깅"""
    logger = get_logger("api.response")
    logger.info(
        "API 응답",
        extra={
            "request_id": request_id,
            "status_code": status_code,
            "response_time": response_time,
            "event_type": "api_response"
        }
    )

def log_error(error: Exception, context: Dict[str, Any] = None):
    """에러 로깅"""
    logger = get_logger("error")
    logger.error(
        f"에러 발생: {str(error)}",
        extra={
            "error_type": type(error).__name__,
            "context": context or {},
            "event_type": "error"
        },
        exc_info=True
    )

def log_user_action(user_id: str, action: str, resource: str = None, details: Dict[str, Any] = None):
    """사용자 액션 로깅"""
    logger = get_logger("user.action")
    logger.info(
        f"사용자 액션: {action}",
        extra={
            "user_id": user_id,
            "action": action,
            "resource": resource,
            "details": details or {},
            "event_type": "user_action"
        }
    )

def log_security_event(event_type: str, user_id: str = None, ip_address: str = None, details: Dict[str, Any] = None):
    """보안 이벤트 로깅"""
    logger = get_logger("security")
    logger.warning(
        f"보안 이벤트: {event_type}",
        extra={
            "user_id": user_id,
            "ip_address": ip_address,
            "security_event_type": event_type,
            "details": details or {},
            "event_type": "security"
        }
    )