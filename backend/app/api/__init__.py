from fastapi import APIRouter
from app.api.v1 import router as v1_router
from app.api.auth import router as auth_router
from app.api.admin import routes as admin_router
from app.core.config import settings

router = APIRouter()
router.include_router(v1_router, prefix=settings.API_V1_STR)
router.include_router(auth_router, prefix=f"{settings.API_V1_STR}/auth")
router.include_router(admin_router.router, prefix=f"{settings.API_V1_STR}")