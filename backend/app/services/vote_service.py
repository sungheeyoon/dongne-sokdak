from fastapi import HTTPException, status
from typing import Any, Dict
from supabase.client import Client
from app.schemas.vote import VoteCreate
from app.db.supabase_client import supabase as default_supabase


class VoteService:
    """공감(투표) CRUD. 주입 관용구는 ADR-0002.

    투표 변이는 지도 조회 캐시를 무효화하지 않는다(ADR-0001) — 캐시를 주입받지 않는다.
    """

    def __init__(self, supabase: Client) -> None:
        self._supabase = supabase

    async def create_vote(
        self,
        vote_in: VoteCreate,
        current_user_id: str
    ) -> Dict[str, Any]:
        """Create a vote for a report."""
        # Check if report exists
        report_response = self._supabase.table("reports").select("id").eq("id", str(vote_in.report_id)).execute()
        if not report_response.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")

        # Check duplicate
        vote_response = self._supabase.table("votes").select("id").eq("report_id", str(vote_in.report_id)).eq("user_id", current_user_id).execute()
        if vote_response.data:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Already voted")

        vote_data = {
            "report_id": str(vote_in.report_id),
            "user_id": current_user_id
        }

        response = self._supabase.table("votes").insert(vote_data).execute()
        if not response.data:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to create vote")

        return response.data[0]

    async def delete_vote(
        self,
        report_id: str,
        current_user_id: str
    ) -> None:
        """Delete a vote for a report."""
        res = self._supabase.table("votes").select("id").eq("report_id", report_id).eq("user_id", current_user_id).execute()
        if not res.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vote not found")

        vote_id = res.data[0]["id"]
        response = self._supabase.table("votes").delete().eq("id", vote_id).execute()
        if not response.data:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Delete failed")

    async def get_vote_count(
        self,
        report_id: str
    ) -> int:
        """Get the number of votes for a report."""
        response = self._supabase.table("votes").select("id", count="exact").eq("report_id", report_id).execute()
        return response.count or 0

    async def check_vote(
        self,
        report_id: str,
        current_user_id: str
    ) -> bool:
        """Check if a user has voted for a report."""
        response = self._supabase.table("votes").select("id").eq("report_id", report_id).eq("user_id", current_user_id).execute()
        return len(response.data) > 0


vote_service = VoteService(default_supabase)
