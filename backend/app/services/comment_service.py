from fastapi import HTTPException, status
from typing import Any, List, Optional, Dict
from datetime import datetime, timezone
from supabase.client import Client
from app.schemas.comment import CommentCreate, CommentUpdate

async def create_comment(
    supabase: Client,
    comment_in: CommentCreate,
    current_user_id: str
) -> Dict[str, Any]:
    """Create a new comment or reply."""
    # Check if report exists
    report_response = supabase.table("reports").select("id").eq("id", str(comment_in.report_id)).execute()
    if not report_response.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    
    # Handle reply logic
    if comment_in.parent_comment_id:
        parent_response = supabase.table("comments").select("id, parent_comment_id").eq("id", str(comment_in.parent_comment_id)).execute()
        if not parent_response.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent comment not found")
        
        parent_comment = parent_response.data[0]
        if parent_comment.get("parent_comment_id"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nested replies are not supported")
            
    comment_data = {
        "report_id": str(comment_in.report_id),
        "user_id": current_user_id,
        "content": comment_in.content,
        "parent_comment_id": str(comment_in.parent_comment_id) if comment_in.parent_comment_id else None
    }
    
    response = supabase.table("comments").insert(comment_data).execute()
    if not response.data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to create comment")
        
    comment = response.data[0]
    
    # Fetch user info
    profile_response = supabase.table("profiles").select("nickname, avatar_url").eq("id", current_user_id).execute()
    if profile_response.data:
        profile = profile_response.data[0]
        comment["user_nickname"] = profile.get("nickname") or "사용자"
        comment["user_avatar_url"] = profile.get("avatar_url")
    else:
        comment["user_nickname"] = "사용자"
        comment["user_avatar_url"] = None
        
    comment["replies"] = []
    return comment

async def get_comments_by_report(
    supabase: Client,
    report_id: str,
    skip: int = 0,
    limit: int = 100
) -> List[Dict[str, Any]]:
    """Fetch comments for a report in hierarchical structure."""
    # Check report
    report_response = supabase.table("reports").select("id").eq("id", report_id).execute()
    if not report_response.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
        
    response = supabase.table("comments") \
        .select("*, profiles!comments_user_id_fkey(nickname, avatar_url)") \
        .eq("report_id", report_id) \
        .order("created_at", desc=False) \
        .execute()
    
    all_comments = response.data
    
    # User info enrichment
    for comment in all_comments:
        profile = comment.get("profiles")
        if profile:
            comment["user_nickname"] = profile.get("nickname") or "알 수 없음"
            comment["user_avatar_url"] = profile.get("avatar_url")
        else:
            comment["user_nickname"] = "알 수 없음"
            comment["user_avatar_url"] = None
        comment["replies"] = []
        
    parent_comments = [c for c in all_comments if not c.get("parent_comment_id")]
    reply_comments = [c for c in all_comments if c.get("parent_comment_id")]
    
    for reply in reply_comments:
        for parent in parent_comments:
            if parent["id"] == reply["parent_comment_id"]:
                parent["replies"].append(reply)
                break
                
    return parent_comments[skip:skip + limit]

async def update_comment(
    supabase: Client,
    comment_id: str,
    comment_in: CommentUpdate,
    current_user_id: str
) -> Dict[str, Any]:
    """Update a comment's content."""
    res = supabase.table("comments").select("*").eq("id", comment_id).execute()
    if not res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")
        
    comment = res.data[0]
    if comment["user_id"] != current_user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
        
    update_data = {
        "content": comment_in.content,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    response = supabase.table("comments").update(update_data).eq("id", comment_id).execute()
    if not response.data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Update failed")
        
    updated_comment = response.data[0]
    profile_response = supabase.table("profiles").select("nickname, avatar_url").eq("id", current_user_id).execute()
    if profile_response.data:
        profile = profile_response.data[0]
        updated_comment["user_nickname"] = profile.get("nickname")
        updated_comment["user_avatar_url"] = profile.get("avatar_url")
        
    return updated_comment

async def delete_comment(
    supabase: Client,
    comment_id: str,
    current_user_id: str
) -> None:
    """Delete a comment."""
    res = supabase.table("comments").select("user_id").eq("id", comment_id).execute()
    if not res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")
        
    if res.data[0]["user_id"] != current_user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
        
    response = supabase.table("comments").delete().eq("id", comment_id).execute()
    if not response.data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Delete failed")
