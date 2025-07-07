from typing import Optional
from pydantic import BaseModel, EmailStr

# 공통 필드를 포함하는 기본 클래스
class UserBase(BaseModel):
    nickname: Optional[str] = None

# 등록용 모델 (상속 대신 필드 명시)
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    nickname: str

# 로그인용 모델
class UserLogin(BaseModel):
    email: EmailStr
    password: str

# 사용자 정보를 반환하는 모델
class User(BaseModel):
    id: str
    email: EmailStr
    nickname: Optional[str] = None
    
    class Config:
        from_attributes = True

# 데이터베이스에 저장되는 사용자 모델
class UserInDB(User):
    hashed_password: str