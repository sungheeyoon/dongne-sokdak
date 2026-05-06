from typing import List, Optional, Dict, Any
from datetime import datetime, date
import uuid
from supabase import Client
from fastapi import HTTPException, status
from app.middleware.admin_auth import log_admin_activity

class AdminService:
    @staticmethod
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
            print(f"❌ Error fetching dashboard stats: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="대시보드 통계 정보를 가져오는 중 오류가 발생했습니다"
            )

    @staticmethod
    async def get_users(
        supabase: Client,
        skip: int = 0,
        limit: int = 50,
        role: Optional[str] = None,
        is_active: Optional[bool] = None,
        search: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """사용자 관리 목록 조회"""
        try:
            response = supabase.table("profiles").select("*").execute()
            profiles = response.data or []
            
            if role:
                profiles = [p for p in profiles if p.get("role") == role]
            if is_active is not None:
                profiles = [p for p in profiles if p.get("is_active") == is_active]
            if search:
                profiles = [p for p in profiles if 
                           search.lower() in p.get("nickname", "").lower() or 
                           search.lower() in p.get("email", "").lower()]
            
            profiles = profiles[skip:skip+limit]
            return profiles
        except Exception as e:
            print(f"❌ Error fetching users: {e}")
            return []

    @staticmethod
    async def update_user_role(
        supabase: Client,
        user_id: str,
        role: str,
        reason: Optional[str],
        admin_id: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Dict[str, Any]:
        """사용자 역할 변경"""
        try:
            target_response = supabase.table("profiles").select("*").eq("id", user_id).single().execute()
            if not target_response.data:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="사용자를 찾을 수 없습니다")
            
            target_user = target_response.data
            old_role = target_user.get("role", "user")
            
            if user_id == admin_id:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="자신의 역할은 변경할 수 없습니다")
            
            update_response = supabase.table("profiles").update({
                "role": role,
                "updated_at": datetime.now().isoformat()
            }).eq("id", user_id).execute()
            
            if not update_response.data:
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="역할 변경에 실패했습니다")
            
            await log_admin_activity(
                admin_id=admin_id,
                action="ROLE_CHANGE",
                target_type="user",
                target_id=user_id,
                details={
                    "old_role": old_role,
                    "new_role": role,
                    "reason": reason,
                    "target_email": target_user.get("email"),
                    "target_nickname": target_user.get("nickname")
                },
                ip_address=ip_address,
                user_agent=user_agent
            )
            
            return {
                "user_id": user_id,
                "old_role": old_role,
                "new_role": role
            }
        except Exception as e:
            if isinstance(e, HTTPException): raise e
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="역할 변경 중 오류가 발생했습니다")

    @staticmethod
    async def set_user_active_status(
        supabase: Client,
        user_id: str,
        is_active: bool,
        admin_id: str,
        admin_role: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Dict[str, Any]:
        """사용자 계정 활성화/비활성화"""
        try:
            target_response = supabase.table("profiles").select("*").eq("id", user_id).single().execute()
            if not target_response.data:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="사용자를 찾을 수 없습니다")
            
            target_user = target_response.data
            if target_user.get("is_active", True) == is_active:
                return {"user_id": user_id, "is_active": is_active, "message": f"이미 {'활성화' if is_active else '비활성화'}된 계정입니다"}
            
            if user_id == admin_id:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="자신의 계정 상태는 변경할 수 없습니다")
            
            if not is_active: # Deactivating
                target_role = target_user.get("role", "user")
                if target_role in ["admin", "moderator"] and admin_role != "admin":
                    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="관리자 계정은 최고관리자만 비활성화할 수 있습니다")
            
            update_response = supabase.table("profiles").update({
                "is_active": is_active,
                "updated_at": datetime.now().isoformat()
            }).eq("id", user_id).execute()
            
            if not update_response.data:
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="계정 상태 변경에 실패했습니다")
            
            action = "ACTIVATE_USER" if is_active else "DEACTIVATE_USER"
            await log_admin_activity(
                admin_id=admin_id,
                action=action,
                target_type="user",
                target_id=user_id,
                details={
                    "target_email": target_user.get("email"),
                    "target_nickname": target_user.get("nickname"),
                    "previous_status": "inactive" if is_active else "active"
                },
                ip_address=ip_address,
                user_agent=user_agent
            )
            
            return {"user_id": user_id, "is_active": is_active}
        except Exception as e:
            if isinstance(e, HTTPException): raise e
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="계정 상태 변경 중 오류가 발생했습니다")

    @staticmethod
    async def bulk_user_action(
        supabase: Client,
        user_ids: List[str],
        action: str,
        reason: Optional[str],
        role: Optional[str],
        admin_id: str,
        admin_role: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Dict[str, Any]:
        """사용자 일괄 작업"""
        results = []
        success_count = 0
        error_count = 0
        
        for user_id in user_ids:
            try:
                if user_id == admin_id:
                    results.append({"user_id": user_id, "status": "skipped", "message": "자신의 계정은 변경할 수 없습니다"})
                    continue
                
                target_response = supabase.table("profiles").select("*").eq("id", user_id).single().execute()
                if not target_response.data:
                    results.append({"user_id": user_id, "status": "error", "message": "사용자를 찾을 수 없습니다"})
                    error_count += 1
                    continue
                
                target_user = target_response.data
                
                if action == "activate":
                    if target_user.get("is_active", True):
                        results.append({"user_id": user_id, "status": "skipped", "message": "이미 활성화된 계정입니다"})
                        continue
                    supabase.table("profiles").update({"is_active": True, "updated_at": datetime.now().isoformat()}).eq("id", user_id).execute()
                    action_detail = "BULK_ACTIVATE"
                    message = "계정이 활성화되었습니다"
                elif action == "deactivate":
                    if not target_user.get("is_active", True):
                        results.append({"user_id": user_id, "status": "skipped", "message": "이미 비활성화된 계정입니다"})
                        continue
                    target_role = target_user.get("role", "user")
                    if target_role in ["admin", "moderator"] and admin_role != "admin":
                        results.append({"user_id": user_id, "status": "error", "message": "관리자 계정은 최고관리자만 비활성화할 수 있습니다"})
                        error_count += 1
                        continue
                    supabase.table("profiles").update({"is_active": False, "updated_at": datetime.now().isoformat()}).eq("id", user_id).execute()
                    action_detail = "BULK_DEACTIVATE"
                    message = "계정이 비활성화되었습니다"
                elif action == "change_role":
                    if admin_role != "admin":
                        results.append({"user_id": user_id, "status": "error", "message": "역할 변경은 최고관리자만 가능합니다"})
                        error_count += 1
                        continue
                    if not role:
                        results.append({"user_id": user_id, "status": "error", "message": "변경할 역할이 지정되지 않았습니다"})
                        error_count += 1
                        continue
                    old_role = target_user.get("role", "user")
                    if old_role == role:
                        results.append({"user_id": user_id, "status": "skipped", "message": f"이미 {role} 역할입니다"})
                        continue
                    supabase.table("profiles").update({"role": role, "updated_at": datetime.now().isoformat()}).eq("id", user_id).execute()
                    action_detail = "BULK_ROLE_CHANGE"
                    message = f"역할이 {old_role}에서 {role}로 변경되었습니다"
                else:
                    results.append({"user_id": user_id, "status": "error", "message": f"지원하지 않는 액션입니다: {action}"})
                    error_count += 1
                    continue
                
                results.append({"user_id": user_id, "status": "success", "message": message})
                success_count += 1
                await log_admin_activity(
                    admin_id=admin_id, action=action_detail, target_type="user", target_id=user_id,
                    details={"target_email": target_user.get("email"), "target_nickname": target_user.get("nickname"), "bulk_action": action, "reason": reason},
                    ip_address=ip_address, user_agent=user_agent
                )
            except Exception as e:
                results.append({"user_id": user_id, "status": "error", "message": str(e)})
                error_count += 1
        
        return {"success_count": success_count, "error_count": error_count, "results": results}

    @staticmethod
    async def get_admin_activity_logs(
        supabase: Client,
        skip: int = 0,
        limit: int = 50,
        action: Optional[str] = None,
        admin_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """관리자 활동 로그 조회"""
        try:
            query = supabase.table("admin_activity_logs").select("*, admin:admin_id(nickname)")
            if action: query = query.eq("action", action)
            if admin_id: query = query.eq("admin_id", admin_id)
            response = query.order("created_at", desc=True).range(skip, skip + limit - 1).execute()
            return response.data or []
        except Exception as e:
            print(f"❌ Error fetching admin activity logs: {e}")
            return []

    @staticmethod
    async def get_reports(
        supabase: Client,
        skip: int = 0,
        limit: int = 50,
        status: Optional[str] = None,
        category: Optional[str] = None,
        assigned_admin_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """제보 관리 목록 조회"""
        try:
            query = supabase.table("reports").select("""
                *,
                user:user_id(id, email),
                profiles!reports_user_id_fkey(nickname),
                votes_count:votes(count),
                comments_count:comments(count)
            """)
            if status: query = query.eq("status", status)
            if category: query = query.eq("category", category)
            if assigned_admin_id: query = query.eq("assigned_admin_id", assigned_admin_id)
            response = query.order("created_at", desc=True).range(skip, skip + limit - 1).execute()
            return response.data or []
        except Exception as e:
            print(f"❌ Error fetching reports: {e}")
            return []

    @staticmethod
    async def get_report_detail(supabase: Client, report_id: str) -> Dict[str, Any]:
        """제보 상세 조회"""
        try:
            response = supabase.table("reports").select("""
                *,
                user:user_id(id, email),
                profiles!reports_user_id_fkey(nickname),
                votes(*),
                comments(*, profiles!comments_user_id_fkey(nickname))
            """).eq("id", report_id).single().execute()
            
            if not response.data:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="제보를 찾을 수 없습니다")
            return response.data
        except Exception as e:
            if isinstance(e, HTTPException): raise e
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="제보 상세 조회 중 오류가 발생했습니다")

    @staticmethod
    async def update_report_status(
        supabase: Client,
        report_id: str,
        status_val: str,
        admin_comment: Optional[str],
        assigned_admin_id: Optional[str],
        admin_id: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Dict[str, Any]:
        """제보 상태 변경"""
        try:
            report_response = supabase.table("reports").select("*").eq("id", report_id).single().execute()
            if not report_response.data:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="제보를 찾을 수 없습니다")
            
            report = report_response.data
            old_status = report.get("status", "OPEN")
            
            update_data = {"status": status_val, "updated_at": datetime.now().isoformat()}
            if admin_comment: update_data["admin_comment"] = admin_comment
            if assigned_admin_id: update_data["assigned_admin_id"] = assigned_admin_id
            
            update_response = supabase.table("reports").update(update_data).eq("id", report_id).execute()
            if not update_response.data:
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="제보 상태 변경에 실패했습니다")
            
            await log_admin_activity(
                admin_id=admin_id, action="REPORT_STATUS_CHANGE", target_type="report", target_id=report_id,
                details={"old_status": old_status, "new_status": status_val, "admin_comment": admin_comment, "assigned_admin_id": assigned_admin_id, "report_title": report.get("title", "")},
                ip_address=ip_address, user_agent=user_agent
            )
            return {"report_id": report_id, "old_status": old_status, "new_status": status_val}
        except Exception as e:
            if isinstance(e, HTTPException): raise e
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="제보 상태 변경 중 오류가 발생했습니다")

    @staticmethod
    async def perform_report_action(
        supabase: Client,
        report_id: str,
        action: str,
        admin_comment: Optional[str],
        reason: Optional[str],
        new_status: Optional[str],
        assigned_admin_id: Optional[str],
        admin_id: str,
        admin_role: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Dict[str, Any]:
        """제보에 대한 관리자 액션 수행"""
        try:
            report_response = supabase.table("reports").select("*").eq("id", report_id).single().execute()
            if not report_response.data:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="제보를 찾을 수 없습니다")
            
            report = report_response.data
            action_detail = ""
            message = ""
            
            if action == "delete":
                if admin_role != "admin":
                    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="제보 삭제는 최고관리자만 가능합니다")
                supabase.table("reports").delete().eq("id", report_id).execute()
                message = "제보가 삭제되었습니다"
                action_detail = "REPORT_DELETE"
            elif action == "assign":
                if not assigned_admin_id: raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="담당자 ID가 필요합니다")
                update_data = {"assigned_admin_id": assigned_admin_id, "updated_at": datetime.now().isoformat()}
                if admin_comment: update_data["admin_comment"] = admin_comment
                supabase.table("reports").update(update_data).eq("id", report_id).execute()
                message = "담당자가 배정되었습니다"
                action_detail = "REPORT_ASSIGN"
            elif action == "update_status":
                if not new_status: raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="새로운 상태가 필요합니다")
                update_data = {"status": new_status, "updated_at": datetime.now().isoformat()}
                if admin_comment: update_data["admin_comment"] = admin_comment
                supabase.table("reports").update(update_data).eq("id", report_id).execute()
                message = f"제보 상태가 {new_status}로 변경되었습니다"
                action_detail = "REPORT_STATUS_UPDATE"
            else:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"지원하지 않는 액션입니다: {action}")
            
            await log_admin_activity(
                admin_id=admin_id, action=action_detail, target_type="report", target_id=report_id,
                details={"action": action, "admin_comment": admin_comment, "reason": reason, "new_status": new_status, "assigned_admin_id": assigned_admin_id, "report_title": report.get("title", "")},
                ip_address=ip_address, user_agent=user_agent
            )
            return {"report_id": report_id, "action": action, "message": message}
        except Exception as e:
            if isinstance(e, HTTPException): raise e
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="제보 액션 수행 중 오류가 발생했습니다")

    @staticmethod
    async def bulk_report_action(
        supabase: Client,
        report_ids: List[str],
        action: str,
        new_status: Optional[str],
        assigned_admin_id: Optional[str],
        admin_comment: Optional[str],
        reason: Optional[str],
        admin_id: str,
        admin_role: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Dict[str, Any]:
        """제보 일괄 작업"""
        results = []
        success_count = 0
        error_count = 0
        
        for report_id in report_ids:
            try:
                report_response = supabase.table("reports").select("*").eq("id", report_id).single().execute()
                if not report_response.data:
                    results.append({"report_id": report_id, "status": "error", "message": "제보를 찾을 수 없습니다"})
                    error_count += 1
                    continue
                
                report = report_response.data
                if action == "change_status":
                    if not new_status:
                        results.append({"report_id": report_id, "status": "error", "message": "새로운 상태가 지정되지 않았습니다"})
                        error_count += 1
                        continue
                    update_data = {"status": new_status, "updated_at": datetime.now().isoformat()}
                    if admin_comment: update_data["admin_comment"] = admin_comment
                    supabase.table("reports").update(update_data).eq("id", report_id).execute()
                    message = f"상태가 {new_status}로 변경되었습니다"
                    action_detail = "BULK_REPORT_STATUS_CHANGE"
                elif action == "assign":
                    if not assigned_admin_id:
                        results.append({"report_id": report_id, "status": "error", "message": "담당자가 지정되지 않았습니다"})
                        error_count += 1
                        continue
                    update_data = {"assigned_admin_id": assigned_admin_id, "updated_at": datetime.now().isoformat()}
                    if admin_comment: update_data["admin_comment"] = admin_comment
                    supabase.table("reports").update(update_data).eq("id", report_id).execute()
                    message = "담당자가 배정되었습니다"
                    action_detail = "BULK_REPORT_ASSIGN"
                elif action == "delete":
                    if admin_role != "admin":
                        results.append({"report_id": report_id, "status": "error", "message": "제보 삭제는 최고관리자만 가능합니다"})
                        error_count += 1
                        continue
                    supabase.table("reports").delete().eq("id", report_id).execute()
                    message = "제보가 삭제되었습니다"
                    action_detail = "BULK_REPORT_DELETE"
                else:
                    results.append({"report_id": report_id, "status": "error", "message": f"지원하지 않는 액션입니다: {action}"})
                    error_count += 1
                    continue
                
                results.append({"report_id": report_id, "status": "success", "message": message})
                success_count += 1
                await log_admin_activity(
                    admin_id=admin_id, action=action_detail, target_type="report", target_id=report_id,
                    details={"bulk_action": action, "admin_comment": admin_comment, "reason": reason, "new_status": new_status, "assigned_admin_id": assigned_admin_id, "report_title": report.get("title", "")},
                    ip_address=ip_address, user_agent=user_agent
                )
            except Exception as e:
                results.append({"report_id": report_id, "status": "error", "message": str(e)})
                error_count += 1
        
        return {"success_count": success_count, "error_count": error_count, "results": results}
