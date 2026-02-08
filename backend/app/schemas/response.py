from typing import Generic, TypeVar, Optional, Any
from pydantic import BaseModel, Field

T = TypeVar("T")

class BaseResponse(BaseModel, Generic[T]):
    success: bool = Field(default=True, description="요청 성공 여부")
    code: str = Field(default="SUCCESS", description="응답 코드")
    message: str = Field(default="요청이 성공적으로 처리되었습니다.", description="응답 메시지")
    data: Optional[T] = Field(default=None, description="응답 데이터")

class ErrorResponse(BaseModel):
    success: bool = Field(default=False, description="요청 성공 여부")
    code: str = Field(..., description="에러 코드")
    message: str = Field(..., description="에러 메시지")
    details: Optional[Any] = Field(default=None, description="에러 상세 정보")
