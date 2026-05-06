from typing import Dict, Any
from datetime import date
from supabase import Client
from fastapi import HTTPException, status
from app.core.logging import get_logger

logger = get_logger(__name__)

async def get_dashboard_stats(supabase: Client) -> Dict[str, Any]:
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
        
        # 최근 로그인 사용자 (최근 7일)
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
            open_reports = len([r for r in reports if r.get("status") == "OPEN"])
            resolved_reports = len([r for r in reports if r.get("status") == "RESOLVED"])
            today_reports = len([r for r in reports if r.get("created_at", "").startswith(today)])
        except Exception as e:
            logger.error(f"❌ Error fetching reports: {e}")
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
            
        return {
            "active_users": active_users,
            "admin_count": admin_count,
            "moderator_count": moderator_count,
            "total_users": total_users,
            "today_users": today_users,
            "recent_logins": recent_logins,
            "open_reports": open_reports,
            "resolved_reports": resolved_reports,
            "today_reports": today_reports,
            "today_comments": today_comments,
            "today_votes": today_votes,
            "today_admin_actions": today_admin_actions
        }
    except Exception as e:
        logger.error(f"❌ Error fetching dashboard stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="대시보드 통계 정보를 가져오는 중 오류가 발생했습니다"
        )
