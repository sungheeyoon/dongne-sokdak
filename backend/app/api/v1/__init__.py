from fastapi import APIRouter
from app.api.v1 import reports, comments, votes, uploads, profiles

router = APIRouter()
router.include_router(reports.router, prefix="/reports", tags=["reports"])
router.include_router(comments.router, prefix="/comments", tags=["comments"])
router.include_router(votes.router, prefix="/votes", tags=["votes"])
router.include_router(uploads.router, prefix="/uploads", tags=["uploads"])
router.include_router(profiles.router, prefix="/profiles", tags=["profiles"])
