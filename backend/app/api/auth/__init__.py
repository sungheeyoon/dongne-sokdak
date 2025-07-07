from fastapi import APIRouter
from app.api.auth.routes import router as auth_router

router = APIRouter()
router.include_router(auth_router, tags=["auth"])