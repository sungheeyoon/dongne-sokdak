from sqlalchemy import Column, String, Text, Enum, ForeignKey, UniqueConstraint, Index, DateTime, Boolean, Integer, Enum as SQLEnum, JSON
from sqlalchemy.dialects.postgresql import UUID, INET
from geoalchemy2 import Geography
from sqlalchemy.sql import func
from app.db.database import Base
import enum
import uuid

class ReportStatus(str, enum.Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"

class ReportCategory(str, enum.Enum):
    NOISE = "NOISE"
    TRASH = "TRASH"
    FACILITY = "FACILITY"
    TRAFFIC = "TRAFFIC"
    OTHER = "OTHER"

class UserRole(str, enum.Enum):
    """사용자 역할 enum"""
    USER = "user"
    MODERATOR = "moderator"
    ADMIN = "admin"

class Profile(Base):
    __tablename__ = "profiles"

    id = Column(UUID(as_uuid=True), primary_key=True)
    nickname = Column(String, nullable=False)
    avatar_url = Column(String)
    location = Column(Geography(geometry_type='POINT', srid=4326))
    
    # RBAC 관련 필드
    role = Column(SQLEnum(UserRole), default=UserRole.USER, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    login_count = Column(Integer, default=0, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    @property
    def is_admin(self) -> bool:
        """관리자 권한 확인"""
        return self.role in [UserRole.ADMIN, UserRole.MODERATOR] and self.is_active
    
    @property
    def is_moderator(self) -> bool:
        """중간관리자 권한 확인"""
        return self.role == UserRole.MODERATOR and self.is_active
    
    @property
    def is_super_admin(self) -> bool:
        """최고관리자 권한 확인"""
        return self.role == UserRole.ADMIN and self.is_active

class Report(Base):
    __tablename__ = "reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("auth.users.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    image_url = Column(String)
    location = Column(Geography(geometry_type='POINT', srid=4326), nullable=False)
    address = Column(String)
    category = Column(Enum(ReportCategory), nullable=False, default=ReportCategory.OTHER)
    status = Column(Enum(ReportStatus), nullable=False, default=ReportStatus.OPEN)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index('reports_location_idx', location, postgresql_using='gist'),
        Index('reports_user_id_idx', user_id),
        Index('reports_status_idx', status),
        Index('reports_category_idx', category),
    )

class Comment(Base):
    __tablename__ = "comments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_id = Column(UUID(as_uuid=True), ForeignKey("reports.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("auth.users.id"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index('comments_report_id_idx', report_id),
        Index('comments_user_id_idx', user_id),
    )

class Vote(Base):
    __tablename__ = "votes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_id = Column(UUID(as_uuid=True), ForeignKey("reports.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("auth.users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint('report_id', 'user_id', name='votes_report_user_unique'),
        Index('votes_report_id_idx', report_id),
        Index('votes_user_id_idx', user_id),
    )

class AdminActivityLog(Base):
    """관리자 활동 로그 모델"""
    __tablename__ = "admin_activity_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    admin_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False)
    
    # 활동 정보
    action = Column(String, nullable=False)  # 수행한 작업
    target_type = Column(String, nullable=True)  # 대상 타입 (user, report, comment 등)
    target_id = Column(UUID(as_uuid=True), nullable=True)  # 대상 ID
    details = Column(JSON, nullable=True)  # 상세 정보
    
    # 요청 정보
    ip_address = Column(INET, nullable=True)  # IP 주소
    user_agent = Column(Text, nullable=True)  # 사용자 에이전트
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    __table_args__ = (
        Index('admin_activity_logs_admin_id_idx', admin_id),
        Index('admin_activity_logs_action_idx', action),
        Index('admin_activity_logs_target_idx', target_type, target_id),
        Index('admin_activity_logs_created_at_idx', created_at),
    )