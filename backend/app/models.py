import enum


class UserRole(str, enum.Enum):
    """사용자 역할 enum"""
    USER = "user"
    MODERATOR = "moderator"
    ADMIN = "admin"
