from fastapi import HTTPException, status
from typing import Any, List, Optional, Dict
from supabase.client import Client
from app.schemas.vote import VoteCreate

async def create_vote(
    supabase: Client,
    vote_in: VoteCreate,
    current_user_id: str
) -> Dict[str, Any]:
    """Create a vote for a report."""
    # Check if report exists
    report_response = supabase.table("reports").select("id").eq("id", str(vote_in.report_id)).execute()
    if not report_response.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    
    # Check duplicate
    vote_response = supabase.table("votes").select("id").eq("report_id", str(vote_in.report_id)).eq("user_id", current_user_id).execute()
    if vote_response.data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Already voted")
        
    vote_data = {
        "report_id": str(vote_in.report_id),
        "user_id": current_user_id
    }
    
    response = supabase.table("votes").insert(vote_data).execute()
    if not response.data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to create vote")
        
    return response.data[0]

async def delete_vote(
    supabase: Client,
    report_id: str,
    current_user_id: str
) -> None:
    """Delete a vote for a report."""
    res = supabase.table("votes").select("id").eq("report_id", report_id).eq("user_id", current_user_id).execute()
    if not res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vote not found")
        
    vote_id = res.data[0]["id"]
    response = supabase.table("votes").delete().eq("id", vote_id).execute()
    if not response.data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Delete failed")


async def get_vote_count(
    supabase: Client,
    report_id: str
) -> int:
    """Get the number of votes for a report."""
    response = supabase.table("votes").select("id", count="exact").eq("report_id", report_id).execute()
    return response.count or 0

async def check_vote(
    supabase: Client,
    report_id: str,
    current_user_id: str
) -> bool:
    """Check if a user has voted for a report."""
    response = supabase.table("votes").select("id").eq("report_id", report_id).eq("user_id", current_user_id).execute()
    return len(response.data) > 0
