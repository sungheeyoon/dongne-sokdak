from fastapi import APIRouter, Depends, Request, HTTPException, status
from typing import List, Optional
import uuid
from app.db.supabase_client import supabase
from app.middleware.admin_auth import get_admin_user
from app.services import admin_report_service
from app.api.admin.schemas import (
    ReportManagementResponse, ReportDetailResponse, 
    ReportStatusUpdate, ReportActionRequest, BulkReportAction
)

router = APIRouter(tags=["admin"])

@router.get("/reports", response_model=List[ReportManagementResponse])
async def get_reports_for_management(
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = None,
    category: Optional[str] = None,
    assigned_admin_id: Optional[uuid.UUID] = None,
    admin_user: dict = Depends(get_admin_user)
):
    """제보 관리 목록 조회"""
    data = await admin_report_service.get_reports(supabase, skip, limit, status, category, str(assigned_admin_id) if assigned_admin_id else None)
    
    reports = []
    for report in data:
        user_data = report.get("user") or {}
        profile_data = report.get("profiles", [])
        user_nickname = profile_data[0].get("nickname", "알 수 없음") if profile_data else "알 수 없음"
        
        votes_data = report.get("votes_count", [])
        comments_data = report.get("comments_count", [])
        votes_count = len(votes_data) if isinstance(votes_data, list) else 0
        comments_count = len(comments_data) if isinstance(comments_data, list) else 0
        
        reports.append(ReportManagementResponse(
            id=report.get("id"),
            title=report.get("title", ""),
            description=report.get("description", ""),
            status=report.get("status", "OPEN"),
            category=report.get("category", "OTHER"),
            user_id=report.get("user_id"),
            user_nickname=user_nickname,
            user_email=user_data.get("email", ""),
            address=report.get("address"),
            image_url=report.get("image_url"),
            votes_count=votes_count,
            comments_count=comments_count,
            created_at=report.get("created_at"),
            updated_at=report.get("updated_at"),
            admin_comment=report.get("admin_comment"),
            assigned_admin_id=report.get("assigned_admin_id"),
            assigned_admin_nickname=None
        ))
    return reports

@router.get("/reports/{report_id}", response_model=ReportDetailResponse)
async def get_report_detail(
    report_id: uuid.UUID,
    admin_user: dict = Depends(get_admin_user)
):
    """제보 상세 조회"""
    report = await admin_report_service.get_report_detail(supabase, str(report_id))
    
    user_data = report.get("user") or {}
    profile_data = report.get("profiles", [])
    user_nickname = profile_data[0].get("nickname", "알 수 없음") if profile_data else "알 수 없음"
    
    location = None
    if report.get("location"):
        location = {"lat": 0.0, "lng": 0.0}
    
    comments = report.get("comments", [])
    recent_comments = []
    for comment in comments[-5:]:
        comment_profile = comment.get("profiles", [])
        comment_nickname = comment_profile[0].get("nickname", "알 수 없음") if comment_profile else "알 수 없음"
        recent_comments.append({
            "id": comment.get("id"),
            "content": comment.get("content", ""),
            "user_nickname": comment_nickname,
            "created_at": comment.get("created_at")
        })
    
    votes = report.get("votes", [])
    votes_count = len(votes) if isinstance(votes, list) else 0
    comments_count = len(comments) if isinstance(comments, list) else 0
    
    return ReportDetailResponse(
        id=report.get("id"),
        title=report.get("title", ""),
        description=report.get("description", ""),
        status=report.get("status", "OPEN"),
        category=report.get("category", "OTHER"),
        user_id=report.get("user_id"),
        user_nickname=user_nickname,
        user_email=user_data.get("email", ""),
        address=report.get("address"),
        image_url=report.get("image_url"),
        location=location,
        created_at=report.get("created_at"),
        updated_at=report.get("updated_at"),
        votes_count=votes_count,
        comments_count=comments_count,
        view_count=0,
        admin_comment=report.get("admin_comment"),
        assigned_admin_id=report.get("assigned_admin_id"),
        assigned_admin_nickname=None,
        recent_comments=recent_comments,
        status_history=[]
    )

@router.put("/reports/{report_id}/status")
async def update_report_status(
    report_id: uuid.UUID,
    status_update: ReportStatusUpdate,
    request: Request,
    admin_user: dict = Depends(get_admin_user)
):
    """제보 상태 변경"""
    result = await admin_report_service.update_report_status(
        supabase, str(report_id), status_update.status, status_update.admin_comment,
        str(status_update.assigned_admin_id) if status_update.assigned_admin_id else None,
        admin_user.get("id"), request.client.host if request.client else None,
        request.headers.get("user-agent")
    )
    return {
        "message": f"제보 상태가 {result['old_status']}에서 {result['new_status']}로 변경되었습니다",
        **result
    }

@router.post("/reports/{report_id}/action")
async def perform_report_action(
    report_id: uuid.UUID,
    action_request: ReportActionRequest,
    request: Request,
    admin_user: dict = Depends(get_admin_user)
):
    """제보에 대한 관리자 액션 수행"""
    result = await admin_report_service.perform_report_action(
        supabase, str(report_id), action_request.action, action_request.admin_comment,
        action_request.reason, action_request.new_status,
        str(action_request.assigned_admin_id) if action_request.assigned_admin_id else None,
        admin_user.get("id"), admin_user.get("role"),
        request.client.host if request.client else None, request.headers.get("user-agent")
    )
    return result

@router.post("/reports/bulk-action")
async def bulk_report_action(
    bulk_action: BulkReportAction,
    request: Request,
    admin_user: dict = Depends(get_admin_user)
):
    """제보 일괄 작업"""
    if not bulk_action.report_ids:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="선택된 제보가 없습니다")
    
    result = await admin_report_service.bulk_report_action(
        supabase, [str(rid) for rid in bulk_action.report_ids], bulk_action.action,
        bulk_action.new_status, str(bulk_action.assigned_admin_id) if bulk_action.assigned_admin_id else None,
        bulk_action.admin_comment, bulk_action.reason, admin_user.get("id"), admin_user.get("role"),
        request.client.host if request.client else None, request.headers.get("user-agent")
    )
    return {
        "message": f"일괄 작업 완료 - 성공: {result['success_count']}, 실패: {result['error_count']}",
        "total_processed": len(bulk_action.report_ids),
        **result
    }
