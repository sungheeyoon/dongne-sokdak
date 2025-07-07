from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, text
from typing import List, Optional, Dict, Any
from datetime import datetime, date
import uuid

from app.db.supabase_client import supabase
from app.middleware.admin_auth import get_admin_user, get_super_admin_user, log_admin_activity
from app.api.admin.schemas import (
    AdminDashboardStats,
    UserManagementResponse,
    UserRoleUpdate,
    AdminActivityResponse,
    BulkUserAction,
    ReportManagementResponse,
    ReportStatusUpdate,
    ReportActionRequest,
    BulkReportAction,
    ReportDetailResponse
)

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/dashboard/stats", response_model=AdminDashboardStats)
async def get_admin_dashboard_stats(
    admin_user: dict = Depends(get_admin_user)
):
    """관리자 대시보드 통계 정보 조회"""
    
    try:
        # 사용자 통계
        profiles_response = supabase.table("profiles").select("id,role,is_active,created_at,last_login_at").execute()
        profiles = profiles_response.data or []
        
        active_users = len([p for p in profiles if p.get("is_active", True)])
        admin_count = len([p for p in profiles if p.get("role") == "admin"])
        moderator_count = len([p for p in profiles if p.get("role") == "moderator"])
        total_users = len(profiles)
        
        # 오늘 가입한 사용자 수
        today = date.today().isoformat()
        today_users = len([p for p in profiles if p.get("created_at", "").startswith(today)])
        
        # 최근 로그인 사용자 (최근 7일) - 간단히 계산
        recent_logins = len([p for p in profiles if p.get("last_login_at")])
        
        # 관리자 활동 통계
        try:
            admin_logs_response = supabase.table("admin_activity_logs").select("created_at").execute()
            admin_logs = admin_logs_response.data or []
            today_admin_actions = len([log for log in admin_logs if log.get("created_at", "").startswith(today)])
        except:
            today_admin_actions = 0
        
        # 보고서 통계
        try:
            reports_response = supabase.table("reports").select("status,created_at").execute()
            reports = reports_response.data or []
            print(f"📊 Found {len(reports)} reports")
            open_reports = len([r for r in reports if r.get("status") == "OPEN"])
            resolved_reports = len([r for r in reports if r.get("status") == "RESOLVED"])
            today_reports = len([r for r in reports if r.get("created_at", "").startswith(today)])
            print(f"📊 Report stats: open={open_reports}, resolved={resolved_reports}, today={today_reports}")
        except Exception as e:
            print(f"❌ Error fetching reports: {e}")
            open_reports = resolved_reports = today_reports = 0
        
        # 댓글 및 투표 통계
        try:
            comments_response = supabase.table("comments").select("created_at").execute()
            comments = comments_response.data or []
            today_comments = len([c for c in comments if c.get("created_at", "").startswith(today)])
        except:
            today_comments = 0
            
        try:
            votes_response = supabase.table("votes").select("created_at").execute()
            votes = votes_response.data or []
            today_votes = len([v for v in votes if v.get("created_at", "").startswith(today)])
        except:
            today_votes = 0
            
    except Exception as e:
        print(f"❌ Error fetching dashboard stats: {e}")
        # 기본값 반환
        active_users = admin_count = moderator_count = total_users = 0
        today_users = recent_logins = today_admin_actions = 0
        open_reports = resolved_reports = today_reports = 0
        today_comments = today_votes = 0
    
    return AdminDashboardStats(
        active_users=active_users,
        admin_count=admin_count,
        moderator_count=moderator_count,
        total_users=total_users,
        today_users=today_users,
        recent_logins=recent_logins,
        open_reports=open_reports,
        resolved_reports=resolved_reports,
        today_reports=today_reports,
        today_comments=today_comments,
        today_votes=today_votes,
        today_admin_actions=today_admin_actions
    )


@router.get("/users", response_model=List[UserManagementResponse])
async def get_users_for_management(
    skip: int = 0,
    limit: int = 50,
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    admin_user: dict = Depends(get_admin_user)
):
    """사용자 관리 목록 조회"""
    
    try:
        # Supabase에서 사용자 목록 조회
        response = supabase.table("profiles").select("*").execute()
        profiles = response.data or []
        
        # 필터 적용
        if role:
            profiles = [p for p in profiles if p.get("role") == role]
        if is_active is not None:
            profiles = [p for p in profiles if p.get("is_active") == is_active]
        if search:
            profiles = [p for p in profiles if 
                       search.lower() in p.get("nickname", "").lower() or 
                       search.lower() in p.get("email", "").lower()]
        
        # 정렬 및 페이징 (간단히)
        profiles = profiles[skip:skip+limit]
        
        return [
            UserManagementResponse(
                id=user.get("id"),
                email=user.get("email", ""),
                nickname=user.get("nickname", ""),
                role=user.get("role", "user"),
                is_active=user.get("is_active", True),
                last_login_at=user.get("last_login_at"),
                login_count=user.get("login_count", 0),
                created_at=user.get("created_at")
            )
            for user in profiles
        ]
    except Exception as e:
        print(f"❌ Error fetching users: {e}")
        return []


@router.put("/users/{user_id}/role")
async def update_user_role(
    user_id: uuid.UUID,
    role_update: UserRoleUpdate,
    request: Request,
    admin_user: dict = Depends(get_super_admin_user)
):
    """사용자 역할 변경 (최고관리자만 가능)"""
    
    try:
        # 대상 사용자 조회
        target_response = supabase.table("profiles").select("*").eq("id", str(user_id)).single().execute()
        
        if not target_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="사용자를 찾을 수 없습니다"
            )
        
        target_user = target_response.data
        old_role = target_user.get("role", "user")
        
        # 자기 자신의 역할은 변경할 수 없음
        if str(user_id) == admin_user.get("id"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="자신의 역할은 변경할 수 없습니다"
            )
        
        # 역할 변경 실행
        update_response = supabase.table("profiles").update({
            "role": role_update.role,
            "updated_at": datetime.now().isoformat()
        }).eq("id", str(user_id)).execute()
        
        if not update_response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="역할 변경에 실패했습니다"
            )
        
        # 관리자 활동 로그 기록
        await log_admin_activity(
            admin_id=admin_user.get("id"),
            action="ROLE_CHANGE",
            target_type="user",
            target_id=str(user_id),
            details={
                "old_role": old_role,
                "new_role": role_update.role,
                "reason": role_update.reason,
                "target_email": target_user.get("email"),
                "target_nickname": target_user.get("nickname")
            },
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent")
        )
        
        return {
            "message": f"사용자 역할이 {old_role}에서 {role_update.role}로 변경되었습니다",
            "user_id": str(user_id),
            "old_role": old_role,
            "new_role": role_update.role
        }
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        print(f"❌ Role update error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="역할 변경 중 오류가 발생했습니다"
        )


@router.put("/users/{user_id}/activate")
async def activate_user(
    user_id: uuid.UUID,
    request: Request,
    admin_user: dict = Depends(get_admin_user)
):
    """사용자 계정 활성화"""
    
    try:
        # 대상 사용자 조회
        target_response = supabase.table("profiles").select("*").eq("id", str(user_id)).single().execute()
        
        if not target_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="사용자를 찾을 수 없습니다"
            )
        
        target_user = target_response.data
        
        # 이미 활성화된 경우
        if target_user.get("is_active", True):
            return {"message": "이미 활성화된 계정입니다"}
        
        # 자기 자신의 계정은 비활성화할 수 없음 (혹시 모를 경우 대비)
        if str(user_id) == admin_user.get("id"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="자신의 계정 상태는 변경할 수 없습니다"
            )
        
        # 계정 활성화
        update_response = supabase.table("profiles").update({
            "is_active": True,
            "updated_at": datetime.now().isoformat()
        }).eq("id", str(user_id)).execute()
        
        if not update_response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="계정 활성화에 실패했습니다"
            )
        
        # 관리자 활동 로그 기록
        await log_admin_activity(
            admin_id=admin_user.get("id"),
            action="ACTIVATE_USER",
            target_type="user",
            target_id=str(user_id),
            details={
                "target_email": target_user.get("email"),
                "target_nickname": target_user.get("nickname"),
                "previous_status": "inactive"
            },
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent")
        )
        
        return {
            "message": "사용자 계정이 활성화되었습니다",
            "user_id": str(user_id),
            "is_active": True
        }
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        print(f"❌ User activation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="계정 활성화 중 오류가 발생했습니다"
        )


@router.put("/users/{user_id}/deactivate")
async def deactivate_user(
    user_id: uuid.UUID,
    request: Request,
    admin_user: dict = Depends(get_admin_user)
):
    """사용자 계정 비활성화"""
    
    try:
        # 대상 사용자 조회
        target_response = supabase.table("profiles").select("*").eq("id", str(user_id)).single().execute()
        
        if not target_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="사용자를 찾을 수 없습니다"
            )
        
        target_user = target_response.data
        
        # 이미 비활성화된 경우
        if not target_user.get("is_active", True):
            return {"message": "이미 비활성화된 계정입니다"}
        
        # 자기 자신의 계정은 비활성화할 수 없음
        if str(user_id) == admin_user.get("id"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="자신의 계정은 비활성화할 수 없습니다"
            )
        
        # 다른 관리자 계정 비활성화 시 주의
        target_role = target_user.get("role", "user")
        if target_role in ["admin", "moderator"] and admin_user.get("role") != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="관리자 계정은 최고관리자만 비활성화할 수 있습니다"
            )
        
        # 계정 비활성화
        update_response = supabase.table("profiles").update({
            "is_active": False,
            "updated_at": datetime.now().isoformat()
        }).eq("id", str(user_id)).execute()
        
        if not update_response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="계정 비활성화에 실패했습니다"
            )
        
        # 관리자 활동 로그 기록
        await log_admin_activity(
            admin_id=admin_user.get("id"),
            action="DEACTIVATE_USER",
            target_type="user",
            target_id=str(user_id),
            details={
                "target_email": target_user.get("email"),
                "target_nickname": target_user.get("nickname"),
                "target_role": target_role,
                "previous_status": "active"
            },
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent")
        )
        
        return {
            "message": "사용자 계정이 비활성화되었습니다",
            "user_id": str(user_id),
            "is_active": False
        }
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        print(f"❌ User deactivation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="계정 비활성화 중 오류가 발생했습니다"
        )


@router.post("/users/bulk-action")
async def bulk_user_action(
    bulk_action: BulkUserAction,
    request: Request,
    admin_user: dict = Depends(get_admin_user)
):
    """사용자 일괄 작업"""
    
    if not bulk_action.user_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="선택된 사용자가 없습니다"
        )
    
    results = []
    success_count = 0
    error_count = 0
    
    for user_id in bulk_action.user_ids:
        try:
            # 자기 자신은 제외
            if user_id == admin_user.get("id"):
                results.append({
                    "user_id": user_id,
                    "status": "skipped",
                    "message": "자신의 계정은 변경할 수 없습니다"
                })
                continue
            
            # 대상 사용자 조회
            target_response = supabase.table("profiles").select("*").eq("id", user_id).single().execute()
            
            if not target_response.data:
                results.append({
                    "user_id": user_id,
                    "status": "error",
                    "message": "사용자를 찾을 수 없습니다"
                })
                error_count += 1
                continue
            
            target_user = target_response.data
            
            # 액션별 처리
            if bulk_action.action == "activate":
                if target_user.get("is_active", True):
                    results.append({
                        "user_id": user_id,
                        "status": "skipped",
                        "message": "이미 활성화된 계정입니다"
                    })
                    continue
                
                # 계정 활성화
                supabase.table("profiles").update({
                    "is_active": True,
                    "updated_at": datetime.now().isoformat()
                }).eq("id", user_id).execute()
                
                action_detail = "BULK_ACTIVATE"
                message = "계정이 활성화되었습니다"
                
            elif bulk_action.action == "deactivate":
                if not target_user.get("is_active", True):
                    results.append({
                        "user_id": user_id,
                        "status": "skipped",
                        "message": "이미 비활성화된 계정입니다"
                    })
                    continue
                
                # 관리자 계정 비활성화 권한 확인
                target_role = target_user.get("role", "user")
                if target_role in ["admin", "moderator"] and admin_user.get("role") != "admin":
                    results.append({
                        "user_id": user_id,
                        "status": "error",
                        "message": "관리자 계정은 최고관리자만 비활성화할 수 있습니다"
                    })
                    error_count += 1
                    continue
                
                # 계정 비활성화
                supabase.table("profiles").update({
                    "is_active": False,
                    "updated_at": datetime.now().isoformat()
                }).eq("id", user_id).execute()
                
                action_detail = "BULK_DEACTIVATE"
                message = "계정이 비활성화되었습니다"
                
            elif bulk_action.action == "change_role":
                # 역할 변경은 최고관리자만 가능
                if admin_user.get("role") != "admin":
                    results.append({
                        "user_id": user_id,
                        "status": "error",
                        "message": "역할 변경은 최고관리자만 가능합니다"
                    })
                    error_count += 1
                    continue
                
                if not bulk_action.role:
                    results.append({
                        "user_id": user_id,
                        "status": "error",
                        "message": "변경할 역할이 지정되지 않았습니다"
                    })
                    error_count += 1
                    continue
                
                old_role = target_user.get("role", "user")
                if old_role == bulk_action.role:
                    results.append({
                        "user_id": user_id,
                        "status": "skipped",
                        "message": f"이미 {bulk_action.role} 역할입니다"
                    })
                    continue
                
                # 역할 변경
                supabase.table("profiles").update({
                    "role": bulk_action.role,
                    "updated_at": datetime.now().isoformat()
                }).eq("id", user_id).execute()
                
                action_detail = "BULK_ROLE_CHANGE"
                message = f"역할이 {old_role}에서 {bulk_action.role}로 변경되었습니다"
                
            else:
                results.append({
                    "user_id": user_id,
                    "status": "error",
                    "message": f"지원하지 않는 액션입니다: {bulk_action.action}"
                })
                error_count += 1
                continue
            
            # 성공 처리
            results.append({
                "user_id": user_id,
                "status": "success",
                "message": message
            })
            success_count += 1
            
            # 관리자 활동 로그 기록
            await log_admin_activity(
                admin_id=admin_user.get("id"),
                action=action_detail,
                target_type="user",
                target_id=user_id,
                details={
                    "target_email": target_user.get("email"),
                    "target_nickname": target_user.get("nickname"),
                    "bulk_action": bulk_action.action,
                    "reason": bulk_action.reason
                },
                ip_address=request.client.host if request.client else None,
                user_agent=request.headers.get("user-agent")
            )
            
        except Exception as e:
            print(f"❌ Bulk action error for user {user_id}: {e}")
            results.append({
                "user_id": user_id,
                "status": "error",
                "message": f"처리 중 오류가 발생했습니다: {str(e)}"
            })
            error_count += 1
    
    return {
        "message": f"일괄 작업 완료 - 성공: {success_count}, 실패: {error_count}",
        "total_processed": len(bulk_action.user_ids),
        "success_count": success_count,
        "error_count": error_count,
        "results": results
    }


@router.get("/activity-logs", response_model=List[AdminActivityResponse])
async def get_admin_activity_logs(
    skip: int = 0,
    limit: int = 50,
    action: Optional[str] = None,
    admin_id: Optional[uuid.UUID] = None,
    admin_user: dict = Depends(get_admin_user)
):
    """관리자 활동 로그 조회"""
    
    try:
        # 관리자 활동 로그 조회
        query = supabase.table("admin_activity_logs").select("""
            *,
            admin:admin_id(nickname)
        """)
        
        # 필터 적용
        if action:
            query = query.eq("action", action)
        if admin_id:
            query = query.eq("admin_id", str(admin_id))
        
        # 정렬 및 페이징
        response = query.order("created_at", desc=True).range(skip, skip + limit - 1).execute()
        
        if not response.data:
            return []
        
        # 응답 데이터 변환
        activity_logs = []
        for log in response.data:
            activity_logs.append(AdminActivityResponse(
                id=log.get("id"),
                admin_id=log.get("admin_id"),
                admin_nickname=log.get("admin", {}).get("nickname", "알 수 없음") if log.get("admin") else "알 수 없음",
                action=log.get("action"),
                target_type=log.get("target_type"),
                target_id=log.get("target_id"),
                details=log.get("details", {}),
                ip_address=log.get("ip_address"),
                user_agent=log.get("user_agent"),
                created_at=log.get("created_at")
            ))
        
        return activity_logs
        
    except Exception as e:
        print(f"❌ Error fetching admin activity logs: {e}")
        return []


@router.get("/my-info")
async def get_admin_info(
    admin_user: dict = Depends(get_admin_user)
):
    """현재 관리자 정보 조회"""
    
    return {
        "id": admin_user.get("id"),
        "email": admin_user.get("email"),
        "nickname": admin_user.get("nickname"),
        "role": admin_user.get("role"),
        "is_active": admin_user.get("is_active"),
        "last_login_at": admin_user.get("last_login_at"),
        "login_count": admin_user.get("login_count"),
        "created_at": admin_user.get("created_at")
    }


# =============================================================================
# 제보 관리 API 엔드포인트
# =============================================================================

@router.get("/reports", response_model=List[ReportManagementResponse])
async def get_reports_for_management(
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    assigned_admin_id: Optional[uuid.UUID] = None,
    admin_user: dict = Depends(get_admin_user)
):
    """제보 관리 목록 조회"""
    
    try:
        # 제보 목록 조회 (사용자 정보와 함께)
        query = supabase.table("reports").select("""
            *,
            user:user_id(id, email),
            profiles!reports_user_id_fkey(nickname),
            votes_count:votes(count),
            comments_count:comments(count)
        """)
        
        # 필터 적용
        if status:
            query = query.eq("status", status)
        if category:
            query = query.eq("category", category)
        if assigned_admin_id:
            query = query.eq("assigned_admin_id", str(assigned_admin_id))
        
        # 정렬 및 페이징
        response = query.order("created_at", desc=True).range(skip, skip + limit - 1).execute()
        
        if not response.data:
            return []
        
        # 응답 데이터 변환
        reports = []
        for report in response.data:
            # 사용자 정보 추출
            user_data = report.get("user") or {}
            profile_data = report.get("profiles", [])
            user_nickname = profile_data[0].get("nickname", "알 수 없음") if profile_data else "알 수 없음"
            
            # 통계 정보 추출
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
                assigned_admin_nickname=None  # TODO: 담당 관리자 닉네임 조회
            ))
        
        return reports
        
    except Exception as e:
        print(f"❌ Error fetching reports: {e}")
        return []


@router.get("/reports/{report_id}", response_model=ReportDetailResponse)
async def get_report_detail(
    report_id: uuid.UUID,
    admin_user: dict = Depends(get_admin_user)
):
    """제보 상세 조회"""
    
    try:
        # 제보 상세 정보 조회
        response = supabase.table("reports").select("""
            *,
            user:user_id(id, email),
            profiles!reports_user_id_fkey(nickname),
            votes(*),
            comments(*, profiles!comments_user_id_fkey(nickname))
        """).eq("id", str(report_id)).single().execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="제보를 찾을 수 없습니다"
            )
        
        report = response.data
        user_data = report.get("user") or {}
        profile_data = report.get("profiles", [])
        user_nickname = profile_data[0].get("nickname", "알 수 없음") if profile_data else "알 수 없음"
        
        # 위치 정보 변환
        location = None
        if report.get("location"):
            # PostGIS POINT를 파싱해야 할 수도 있음
            location = {"lat": 0.0, "lng": 0.0}  # TODO: 실제 위치 파싱 구현
        
        # 최근 댓글 (최대 5개)
        comments = report.get("comments", [])
        recent_comments = []
        for comment in comments[-5:]:  # 최근 5개
            comment_profile = comment.get("profiles", [])
            comment_nickname = comment_profile[0].get("nickname", "알 수 없음") if comment_profile else "알 수 없음"
            recent_comments.append({
                "id": comment.get("id"),
                "content": comment.get("content", ""),
                "user_nickname": comment_nickname,
                "created_at": comment.get("created_at")
            })
        
        # 투표 및 댓글 수
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
            view_count=0,  # TODO: 조회수 구현
            admin_comment=report.get("admin_comment"),
            assigned_admin_id=report.get("assigned_admin_id"),
            assigned_admin_nickname=None,  # TODO: 담당 관리자 닉네임 조회
            recent_comments=recent_comments,
            status_history=[]  # TODO: 상태 변경 이력 구현
        )
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        print(f"❌ Error fetching report detail: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="제보 상세 조회 중 오류가 발생했습니다"
        )


@router.put("/reports/{report_id}/status")
async def update_report_status(
    report_id: uuid.UUID,
    status_update: ReportStatusUpdate,
    request: Request,
    admin_user: dict = Depends(get_admin_user)
):
    """제보 상태 변경"""
    
    try:
        # 제보 존재 확인
        report_response = supabase.table("reports").select("*").eq("id", str(report_id)).single().execute()
        
        if not report_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="제보를 찾을 수 없습니다"
            )
        
        report = report_response.data
        old_status = report.get("status", "OPEN")
        
        # 상태 변경 실행
        update_data = {
            "status": status_update.status,
            "updated_at": datetime.now().isoformat()
        }
        
        if status_update.admin_comment:
            update_data["admin_comment"] = status_update.admin_comment
        
        if status_update.assigned_admin_id:
            update_data["assigned_admin_id"] = str(status_update.assigned_admin_id)
        
        update_response = supabase.table("reports").update(update_data).eq("id", str(report_id)).execute()
        
        if not update_response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="제보 상태 변경에 실패했습니다"
            )
        
        # 관리자 활동 로그 기록
        await log_admin_activity(
            admin_id=admin_user.get("id"),
            action="REPORT_STATUS_CHANGE",
            target_type="report",
            target_id=str(report_id),
            details={
                "old_status": old_status,
                "new_status": status_update.status,
                "admin_comment": status_update.admin_comment,
                "assigned_admin_id": str(status_update.assigned_admin_id) if status_update.assigned_admin_id else None,
                "report_title": report.get("title", "")
            },
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent")
        )
        
        return {
            "message": f"제보 상태가 {old_status}에서 {status_update.status}로 변경되었습니다",
            "report_id": str(report_id),
            "old_status": old_status,
            "new_status": status_update.status
        }
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        print(f"❌ Report status update error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="제보 상태 변경 중 오류가 발생했습니다"
        )


@router.post("/reports/{report_id}/action")
async def perform_report_action(
    report_id: uuid.UUID,
    action_request: ReportActionRequest,
    request: Request,
    admin_user: dict = Depends(get_admin_user)
):
    """제보에 대한 관리자 액션 수행"""
    
    try:
        # 제보 존재 확인
        report_response = supabase.table("reports").select("*").eq("id", str(report_id)).single().execute()
        
        if not report_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="제보를 찾을 수 없습니다"
            )
        
        report = report_response.data
        action = action_request.action
        
        if action == "delete":
            # 제보 삭제 (실제로는 상태를 변경하거나 soft delete)
            if admin_user.get("role") != "admin":  # 최고관리자만 삭제 가능
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="제보 삭제는 최고관리자만 가능합니다"
                )
            
            delete_response = supabase.table("reports").delete().eq("id", str(report_id)).execute()
            
            if not delete_response.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="제보 삭제에 실패했습니다"
                )
            
            message = "제보가 삭제되었습니다"
            action_detail = "REPORT_DELETE"
            
        elif action == "assign":
            # 담당자 배정
            if not action_request.assigned_admin_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="담당자 ID가 필요합니다"
                )
            
            update_data = {
                "assigned_admin_id": str(action_request.assigned_admin_id),
                "updated_at": datetime.now().isoformat()
            }
            
            if action_request.admin_comment:
                update_data["admin_comment"] = action_request.admin_comment
            
            update_response = supabase.table("reports").update(update_data).eq("id", str(report_id)).execute()
            
            if not update_response.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="담당자 배정에 실패했습니다"
                )
            
            message = "담당자가 배정되었습니다"
            action_detail = "REPORT_ASSIGN"
            
        elif action == "update_status":
            # 상태 업데이트
            if not action_request.new_status:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="새로운 상태가 필요합니다"
                )
            
            update_data = {
                "status": action_request.new_status,
                "updated_at": datetime.now().isoformat()
            }
            
            if action_request.admin_comment:
                update_data["admin_comment"] = action_request.admin_comment
            
            update_response = supabase.table("reports").update(update_data).eq("id", str(report_id)).execute()
            
            if not update_response.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="상태 업데이트에 실패했습니다"
                )
            
            message = f"제보 상태가 {action_request.new_status}로 변경되었습니다"
            action_detail = "REPORT_STATUS_UPDATE"
            
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"지원하지 않는 액션입니다: {action}"
            )
        
        # 관리자 활동 로그 기록
        await log_admin_activity(
            admin_id=admin_user.get("id"),
            action=action_detail,
            target_type="report",
            target_id=str(report_id),
            details={
                "action": action,
                "admin_comment": action_request.admin_comment,
                "reason": action_request.reason,
                "new_status": action_request.new_status,
                "assigned_admin_id": str(action_request.assigned_admin_id) if action_request.assigned_admin_id else None,
                "report_title": report.get("title", "")
            },
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent")
        )
        
        return {
            "message": message,
            "report_id": str(report_id),
            "action": action
        }
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        print(f"❌ Report action error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="제보 액션 수행 중 오류가 발생했습니다"
        )


@router.post("/reports/bulk-action")
async def bulk_report_action(
    bulk_action: BulkReportAction,
    request: Request,
    admin_user: dict = Depends(get_admin_user)
):
    """제보 일괄 작업"""
    
    if not bulk_action.report_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="선택된 제보가 없습니다"
        )
    
    results = []
    success_count = 0
    error_count = 0
    
    for report_id in bulk_action.report_ids:
        try:
            # 제보 존재 확인
            report_response = supabase.table("reports").select("*").eq("id", str(report_id)).single().execute()
            
            if not report_response.data:
                results.append({
                    "report_id": str(report_id),
                    "status": "error",
                    "message": "제보를 찾을 수 없습니다"
                })
                error_count += 1
                continue
            
            report = report_response.data
            
            # 액션별 처리
            if bulk_action.action == "change_status":
                if not bulk_action.new_status:
                    results.append({
                        "report_id": str(report_id),
                        "status": "error",
                        "message": "새로운 상태가 지정되지 않았습니다"
                    })
                    error_count += 1
                    continue
                
                update_data = {
                    "status": bulk_action.new_status,
                    "updated_at": datetime.now().isoformat()
                }
                
                if bulk_action.admin_comment:
                    update_data["admin_comment"] = bulk_action.admin_comment
                
                supabase.table("reports").update(update_data).eq("id", str(report_id)).execute()
                message = f"상태가 {bulk_action.new_status}로 변경되었습니다"
                action_detail = "BULK_REPORT_STATUS_CHANGE"
                
            elif bulk_action.action == "assign":
                if not bulk_action.assigned_admin_id:
                    results.append({
                        "report_id": str(report_id),
                        "status": "error",
                        "message": "담당자가 지정되지 않았습니다"
                    })
                    error_count += 1
                    continue
                
                update_data = {
                    "assigned_admin_id": str(bulk_action.assigned_admin_id),
                    "updated_at": datetime.now().isoformat()
                }
                
                if bulk_action.admin_comment:
                    update_data["admin_comment"] = bulk_action.admin_comment
                
                supabase.table("reports").update(update_data).eq("id", str(report_id)).execute()
                message = "담당자가 배정되었습니다"
                action_detail = "BULK_REPORT_ASSIGN"
                
            elif bulk_action.action == "delete":
                # 삭제는 최고관리자만 가능
                if admin_user.get("role") != "admin":
                    results.append({
                        "report_id": str(report_id),
                        "status": "error",
                        "message": "제보 삭제는 최고관리자만 가능합니다"
                    })
                    error_count += 1
                    continue
                
                supabase.table("reports").delete().eq("id", str(report_id)).execute()
                message = "제보가 삭제되었습니다"
                action_detail = "BULK_REPORT_DELETE"
                
            else:
                results.append({
                    "report_id": str(report_id),
                    "status": "error",
                    "message": f"지원하지 않는 액션입니다: {bulk_action.action}"
                })
                error_count += 1
                continue
            
            # 성공 처리
            results.append({
                "report_id": str(report_id),
                "status": "success",
                "message": message
            })
            success_count += 1
            
            # 관리자 활동 로그 기록
            await log_admin_activity(
                admin_id=admin_user.get("id"),
                action=action_detail,
                target_type="report",
                target_id=str(report_id),
                details={
                    "bulk_action": bulk_action.action,
                    "admin_comment": bulk_action.admin_comment,
                    "reason": bulk_action.reason,
                    "new_status": bulk_action.new_status,
                    "assigned_admin_id": str(bulk_action.assigned_admin_id) if bulk_action.assigned_admin_id else None,
                    "report_title": report.get("title", "")
                },
                ip_address=request.client.host if request.client else None,
                user_agent=request.headers.get("user-agent")
            )
            
        except Exception as e:
            print(f"❌ Bulk report action error for report {report_id}: {e}")
            results.append({
                "report_id": str(report_id),
                "status": "error",
                "message": f"처리 중 오류가 발생했습니다: {str(e)}"
            })
            error_count += 1
    
    return {
        "message": f"일괄 작업 완료 - 성공: {success_count}, 실패: {error_count}",
        "total_processed": len(bulk_action.report_ids),
        "success_count": success_count,
        "error_count": error_count,
        "results": results
    }