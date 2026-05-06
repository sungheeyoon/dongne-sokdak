from fastapi import APIRouter
from app.api.admin.routes_dashboard import router as dashboard_router
from app.api.admin.routes_users import router as users_router
from app.api.admin.routes_reports import router as reports_router
from app.api.admin.routes_settings import router as settings_router

router = APIRouter(prefix="/admin", tags=["admin"])

router.include_router(dashboard_router)
router.include_router(users_router)
router.include_router(reports_router)
router.include_router(settings_router)
