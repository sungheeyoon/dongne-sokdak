from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid

from app.models import UserRole


class AdminDashboardStats(BaseModel):
    """관리자 대시보드 통계 스키마"""
    active_users: int
    admin_count: int
    moderator_count: int
    total_users: int
    today_users: int
    recent_logins: int
    open_reports: int
    resolved_reports: int
    today_reports: int
    today_comments: int
    today_votes: int
    today_admin_actions: int


class UserManagementResponse(BaseModel):
    """사용자 관리 응답 스키마"""
    id: uuid.UUID
    email: str
    nickname: str
    role: UserRole
    is_active: bool
    last_login_at: Optional[datetime]
    login_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class UserRoleUpdate(BaseModel):
    """사용자 역할 업데이트 스키마"""
    role: UserRole
    reason: Optional[str] = None


class BulkUserAction(BaseModel):
    """사용자 일괄 작업 스키마"""
    user_ids: List[uuid.UUID]
    action: str  # activate, deactivate, promote_to_moderator, demote_to_user
    reason: Optional[str] = None


class AdminActivityResponse(BaseModel):
    """관리자 활동 로그 응답 스키마"""
    id: uuid.UUID
    admin_id: uuid.UUID
    admin_nickname: str
    action: str
    target_type: Optional[str]
    target_id: Optional[uuid.UUID]
    details: Optional[Dict[str, Any]]
    ip_address: Optional[str]
    user_agent: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class ReportManagementResponse(BaseModel):
    """제보 관리 응답 스키마"""
    id: uuid.UUID
    title: str
    description: str
    status: str
    category: str
    user_id: uuid.UUID
    user_nickname: str
    user_email: str
    address: Optional[str]
    image_url: Optional[str]
    votes_count: int
    comments_count: int
    created_at: datetime
    updated_at: datetime
    
    # 관리자 전용 필드
    admin_comment: Optional[str] = None
    assigned_admin_id: Optional[uuid.UUID] = None
    assigned_admin_nickname: Optional[str] = None

    class Config:
        from_attributes = True


class ReportStatusUpdate(BaseModel):
    """제보 상태 변경 스키마"""
    status: str  # OPEN, IN_PROGRESS, RESOLVED
    admin_comment: Optional[str] = None
    assigned_admin_id: Optional[uuid.UUID] = None


class ReportActionRequest(BaseModel):
    """제보 처리 요청 스키마"""
    action: str  # approve, reject, delete, assign, update_status
    admin_comment: Optional[str] = None
    reason: Optional[str] = None
    new_status: Optional[str] = None
    assigned_admin_id: Optional[uuid.UUID] = None


class BulkReportAction(BaseModel):
    """제보 일괄 작업 스키마"""
    report_ids: List[uuid.UUID]
    action: str  # approve, reject, delete, change_status, assign
    admin_comment: Optional[str] = None
    reason: Optional[str] = None
    new_status: Optional[str] = None
    assigned_admin_id: Optional[uuid.UUID] = None


class ReportDetailResponse(BaseModel):
    """제보 상세 조회 응답 스키마"""
    id: uuid.UUID
    title: str
    description: str
    status: str
    category: str
    user_id: uuid.UUID
    user_nickname: str
    user_email: str
    address: Optional[str]
    image_url: Optional[str]
    location: Optional[Dict[str, float]]  # {"lat": float, "lng": float}
    created_at: datetime
    updated_at: datetime
    
    # 통계 정보
    votes_count: int
    comments_count: int
    view_count: int
    
    # 관리자 정보
    admin_comment: Optional[str] = None
    assigned_admin_id: Optional[uuid.UUID] = None
    assigned_admin_nickname: Optional[str] = None
    
    # 관련 데이터
    recent_comments: List[Dict[str, Any]] = []
    status_history: List[Dict[str, Any]] = []

    class Config:
        from_attributes = True