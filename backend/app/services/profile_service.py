from fastapi import HTTPException, status
from typing import Any, List, Optional, Dict
from supabase.client import Client
from app.schemas.profile import ProfileUpdate, AvatarUpdate, NeighborhoodUpdate
from datetime import datetime, timezone

async def get_my_profile(
    supabase: Client,
    current_user_id: str
) -> Dict[str, Any]:
    """Fetch current user's profile and stats using RPC for efficiency."""
    response = supabase.rpc("get_profile_with_stats", {"target_user_id": current_user_id}).execute()
    
    if not response.data:
        # Create default profile if not exists
        try:
            user_response = supabase.auth.admin.get_user_by_id(current_user_id)
            nickname = user_response.user.email.split("@")[0] if user_response.user and user_response.user.email else "사용자"
        except Exception:
            nickname = "사용자"
        
        default_profile = {
            "id": current_user_id,
            "nickname": nickname,
            "avatar_url": None
        }
        supabase.table("profiles").insert(default_profile).execute()
        
        # After creation, fetch again with stats
        response = supabase.rpc("get_profile_with_stats", {"target_user_id": current_user_id}).execute()
        profile = response.data
    else:
        profile = response.data
        
    profile["user_id"] = profile["id"]
    return profile

async def update_profile(
    supabase: Client,
    current_user_id: str,
    profile_in: ProfileUpdate
) -> Dict[str, Any]:
    """Update profile information."""
    update_data = {}
    if profile_in.nickname is not None:
        # Check nickname
        existing = supabase.table("profiles").select("id").neq("id", current_user_id).eq("nickname", profile_in.nickname).execute()
        if existing.data:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nickname already in use")
        update_data["nickname"] = profile_in.nickname
        
    if profile_in.location is not None:
        update_data["location"] = f"POINT({profile_in.location['lng']} {profile_in.location['lat']})"
        
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    response = supabase.table("profiles").update(update_data).eq("id", current_user_id).execute()
    if not response.data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Update failed")
        
    profile = response.data[0]
    profile["user_id"] = profile["id"]
    return profile

async def get_user_profile(
    supabase: Client,
    user_id: str
) -> Dict[str, Any]:
    """Fetch another user's public profile and stats using RPC."""
    response = supabase.rpc("get_profile_with_stats", {"target_user_id": user_id}).execute()
    if not response.data:
        return None
        
    profile = response.data
    profile["user_id"] = profile["id"]
    return profile

async def update_avatar(
    supabase: Client,
    current_user_id: str,
    avatar_url: str
) -> Dict[str, Any]:
    """Update user's avatar URL."""
    update_data = {
        "avatar_url": avatar_url,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    response = supabase.table("profiles").update(update_data).eq("id", current_user_id).execute()
    if not response.data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Update failed")
    return {"avatar_url": avatar_url}

async def update_neighborhood(
    supabase: Client,
    current_user_id: str,
    neighborhood_data: NeighborhoodUpdate
) -> Dict[str, Any]:
    """Update user's neighborhood settings."""
    neighborhood_json = {
        "place_name": neighborhood_data.neighborhood.place_name,
        "address": neighborhood_data.neighborhood.address,
        "lat": neighborhood_data.neighborhood.lat,
        "lng": neighborhood_data.neighborhood.lng
    }
    update_data = {
        "neighborhood": neighborhood_json,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    response = supabase.table("profiles").update(update_data).eq("id", current_user_id).execute()
    if not response.data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Update failed")
    return neighborhood_json

async def delete_neighborhood(
    supabase: Client,
    current_user_id: str
) -> bool:
    """Delete user's neighborhood settings."""
    update_data = {
        "neighborhood": None,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    response = supabase.table("profiles").update(update_data).eq("id", current_user_id).execute()
    return len(response.data) > 0

