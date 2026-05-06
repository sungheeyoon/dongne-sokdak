from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from supabase import Client
from fastapi import HTTPException, status
from app.middleware.admin_auth import log_admin_activity
from app.core.logging import get_logger

logger = get_logger(__name__)

async def get_reports(
    supabase: Client,
    skip: int = 0,
    limit: int = 50,
    status_filter: Optional[str] = None,
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
        if status_filter: query = query.eq("status", status_filter)
        if category: query = query.eq("category", category)
        if assigned_admin_id: query = query.eq("assigned_admin_id", assigned_admin_id)
        response = query.order("created_at", desc=True).range(skip, skip + limit - 1).execute()
        return response.data or []
    except Exception as e:
        logger.error(f"Error fetching reports: {e}")
        return []

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
        
        update_data = {"status": status_val, "updated_at": datetime.now(timezone.utc).isoformat()}
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
            update_data = {"assigned_admin_id": assigned_admin_id, "updated_at": datetime.now(timezone.utc).isoformat()}
            if admin_comment: update_data["admin_comment"] = admin_comment
            supabase.table("reports").update(update_data).eq("id", report_id).execute()
            message = "담당자가 배정되었습니다"
            action_detail = "REPORT_ASSIGN"
        elif action == "update_status":
            if not new_status: raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="새로운 상태가 필요합니다")
            update_data = {"status": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}
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
    """제보 일괄 작업 (Batch Update 최적화)"""
    if not report_ids:
        return {"success_count": 0, "error_count": 0, "results": []}

    results = []
    success_count = 0
    error_count = 0
    
    try:
        targets_res = supabase.table("reports").select("*").in_("id", report_ids).execute()
        targets = {t["id"]: t for t in targets_res.data}
        
        missing_ids = set(report_ids) - set(targets.keys())
        for uid in missing_ids:
            results.append({"report_id": uid, "status": "error", "message": "제보를 찾을 수 없습니다"})
            error_count += 1

        if not targets:
            return {"success_count": 0, "error_count": error_count, "results": results}

        ids_to_update = []
        update_payload = {"updated_at": datetime.now(timezone.utc).isoformat()}
        
        if action == "change_status":
            if not new_status:
                return {"success_count": 0, "error_count": error_count + len(targets), "results": results + [{"report_id": rid, "status": "error", "message": "새로운 상태가 지정되지 않았습니다"} for rid in targets]}
            
            ids_to_update = list(targets.keys())
            update_payload["status"] = new_status
            if admin_comment: update_payload["admin_comment"] = admin_comment
            action_detail = "BULK_REPORT_STATUS_CHANGE"
            success_msg = f"상태가 {new_status}로 변경되었습니다"
            
        elif action == "assign":
            if not assigned_admin_id:
                return {"success_count": 0, "error_count": error_count + len(targets), "results": results + [{"report_id": rid, "status": "error", "message": "담당자가 지정되지 않았습니다"} for rid in targets]}
            
            ids_to_update = list(targets.keys())
            update_payload["assigned_admin_id"] = assigned_admin_id
            if admin_comment: update_payload["admin_comment"] = admin_comment
            action_detail = "BULK_REPORT_ASSIGN"
            success_msg = "담당자가 배정되었습니다"
            
        elif action == "delete":
            if admin_role != "admin":
                return {"success_count": 0, "error_count": error_count + len(targets), "results": results + [{"report_id": rid, "status": "error", "message": "제보 삭제는 최고관리자만 가능합니다"} for rid in targets]}
            
            supabase.table("reports").delete().in_("id", list(targets.keys())).execute()
            for rid in targets:
                success_count += 1
                results.append({"report_id": rid, "status": "success", "message": "제보가 삭제되었습니다"})
                await log_admin_activity(
                    admin_id=admin_id, action="BULK_REPORT_DELETE", target_type="report", target_id=rid,
                    details={"bulk_action": action, "reason": reason, "report_title": targets[rid].get("title", "")},
                    ip_address=ip_address, user_agent=user_agent
                )
            return {"success_count": success_count, "error_count": error_count, "results": results}
            
        else:
            return {"success_count": 0, "error_count": error_count + len(targets), "results": results + [{"report_id": rid, "status": "error", "message": f"지원하지 않는 액션입니다: {action}"} for rid in targets]}

        if ids_to_update:
            supabase.table("reports").update(update_payload).in_("id", ids_to_update).execute()
            
            for rid in ids_to_update:
                success_count += 1
                results.append({"report_id": rid, "status": "success", "message": success_msg})
                await log_admin_activity(
                    admin_id=admin_id, action=action_detail, target_type="report", target_id=rid,
                    details={"bulk_action": action, "admin_comment": admin_comment, "reason": reason, "new_status": new_status, "assigned_admin_id": assigned_admin_id, "report_title": targets[rid].get("title", "")},
                    ip_address=ip_address, user_agent=user_agent
                )
                
    except Exception as e:
        logger.error(f"Error in bulk_report_action: {e}")
        return {"success_count": success_count, "error_count": error_count + (len(report_ids) - success_count), "results": results}
    
    return {"success_count": success_count, "error_count": error_count, "results": results}

