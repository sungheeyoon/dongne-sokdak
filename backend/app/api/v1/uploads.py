from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from typing import Any, Dict
from app.api.deps import get_current_active_user, get_supabase
from supabase.client import Client
import uuid
import datetime
from PIL import Image
from io import BytesIO

router = APIRouter()

@router.post("/image", response_model=Dict[str, str])
async def upload_image(
    file: UploadFile = File(...),
    current_user_id: str = Depends(get_current_active_user),
    supabase: Client = Depends(get_supabase)
) -> Any:
    """
    이미지 파일 업로드 API
    - 제보나 프로필에 사용할 이미지를 Supabase Storage에 업로드
    - 업로드된 이미지의 URL을 반환
    """
    try:
        # 파일 유형 검증
        allowed_content_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
        if file.content_type not in allowed_content_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="지원되지 않는 이미지 형식입니다. JPEG, PNG, GIF, WebP 형식만 지원합니다.",
            )
            
        # 파일 크기 검증 (10MB 제한)
        max_size = 10 * 1024 * 1024  # 10MB
        contents = await file.read()
        file_size = len(contents)
            
        if file_size > max_size:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="파일 크기가 너무 큽니다. 최대 10MB까지만 업로드 가능합니다.",
            )
            
        # 이미지 유효성 검증 (실제 이미지 파일인지 확인)
        try:
            Image.open(BytesIO(contents))
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="유효하지 않은 이미지 파일입니다.",
            )
            
        # 파일명 생성 (고유한 파일명으로 저장)
        # filename이 None인 경우 빈 문자열로 처리
        filename = file.filename or ""
        file_ext = filename.split(".")[-1].lower() if "." in filename else ""
        
        if file_ext == "":
            # content_type에 따른 확장자 매핑
            ext_mapping = {
                "image/jpeg": "jpg",
                "image/png": "png",
                "image/gif": "gif",
                "image/webp": "webp",
            }
            file_ext = ext_mapping.get(file.content_type, "bin")
            
        # UTC 기준 시간 사용
        timestamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d%H%M%S")
        # 사용자 ID는 길이 제한 (필요 시)
        user_id_str = str(current_user_id)[:8]
        unique_filename = f"{user_id_str}_{timestamp}_{uuid.uuid4().hex}.{file_ext}"
            
        # Supabase Storage에 업로드
        bucket_name = "images"
        storage_path = f"uploads/{unique_filename}"
            
        # 파일 업로드
        try:
            response = supabase.storage.from_(bucket_name).upload(
                storage_path,
                contents
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Supabase 스토리지 업로드 실패: {str(e)}",
            )
            
        # 업로드된 파일의 공개 URL 생성
        file_url = supabase.storage.from_(bucket_name).get_public_url(storage_path)
            
        return {"image_url": file_url}
        
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"이미지 업로드 중 오류가 발생했습니다: {str(e)}",
        )
    finally:
        # 파일 포인터를 처음으로 리셋
        await file.seek(0)