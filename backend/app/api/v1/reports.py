from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Any, List, Optional
from uuid import UUID
from app.schemas.report import (
    Report, ReportCreate, ReportUpdate, ReportCategory, ReportStatus
)
from app.api.deps import get_current_active_user, get_supabase
from app.utils.wkb_parser import convert_wkb_to_location
from supabase.client import Client
import json

router = APIRouter()

def calculate_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """
    두 지점 간 거리 계산 (Haversine 공식) - 미터 단위 반환
    """
    import math
    
    R = 6371000  # 지구 반지름 (미터)
    
    # 라디안으로 변환
    lat1_rad = math.radians(lat1)
    lng1_rad = math.radians(lng1)
    lat2_rad = math.radians(lat2)
    lng2_rad = math.radians(lng2)
    
    # 차이 계산
    dlat = lat2_rad - lat1_rad
    dlng = lng2_rad - lng1_rad
    
    # Haversine 공식
    a = (math.sin(dlat / 2) ** 2 + 
         math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlng / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c

@router.post("/", response_model=Report)
async def create_report(
    report_in: ReportCreate,
    current_user_id: str = Depends(get_current_active_user),
    supabase: Client = Depends(get_supabase)
) -> Any:
    """
    새 제보 생성
    """
    try:
        # 위치 정보를 PostgreSQL Geography 타입으로 변환
        location_point = f"POINT({report_in.location.lng} {report_in.location.lat})"
        
        report_data = {
            "user_id": current_user_id,
            "title": report_in.title,
            "description": report_in.description,
            "location": location_point,
            "address": report_in.address,
            "category": report_in.category.value,
            "image_url": report_in.image_url,
            "status": ReportStatus.OPEN.value
        }
        
        response = supabase.table("reports").insert(report_data).execute()
        
        if len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="제보 생성 중 오류가 발생했습니다",
            )
        
        # PostgreSQL에서 반환한 데이터를 사용하기 좋게 변환
        report = response.data[0]
        
        # 보고서의 위치 정보를 구조화된 형식으로 변환 (PostGIS POINT 형식에서)
        # 실제 환경에서는 좌표 파싱이 필요할 수 있음
        # 임시로 원래 입력된 위치 정보를 사용
        report["location"] = {
            "lat": report_in.location.lat,
            "lng": report_in.location.lng
        }
        
        return report
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"제보 생성 중 오류가 발생했습니다: {str(e)}",
        )
@router.get("/", response_model=List[Report])
async def get_reports(
    skip: int = 0,
    limit: int = 100,
    category: Optional[ReportCategory] = None,
    status: Optional[ReportStatus] = None,
    user_id: Optional[str] = None,  # 사용자별 제보 조회 추가
    search: Optional[str] = None,   # 검색 기능 추가
    supabase: Client = Depends(get_supabase)
) -> Any:
    """
    제보 목록 조회 (검색, 사용자별 조회 포함)
    """
    try:
        # 기본 제보 데이터 조회 (PostGIS 함수 사용하지 않음)
        query = supabase.table("reports").select("*").order("created_at", desc=True)
        
        # 필터링 조건들
        if category:
            query = query.eq("category", category.value)
        if status:
            query = query.eq("status", status.value)
        if user_id:
            query = query.eq("user_id", user_id)
        
        # 검색 기능 (제목과 설명에서 검색)
        if search:
            search_term = f"%{search}%"
            query = query.ilike("title", search_term)
        
        if limit:
            query = query.limit(limit)
            
        response = query.execute()
        reports = response.data
        
        print(f"Search results: {len(reports)} reports (search: {search}, user: {user_id})")
        
        # 위치 데이터 파싱 (PostGIS WKB 형식)
        for report in reports:
            # location 필드가 PostGIS WKB 형식인 경우 파싱
            if report.get("location"):
                try:
                    location_str = str(report["location"])
                    # WKB 형식인지 확인 (16진수 문자열)
                    if len(location_str) > 20 and all(c in '0123456789ABCDEFabcdef' for c in location_str):
                        # WKB 파싱 사용
                        report["location"] = convert_wkb_to_location(location_str)
                    elif "POINT(" in location_str:
                        # "POINT(lng lat)" 형식에서 좌표 추출
                        coords = location_str.replace("POINT(", "").replace(")", "").split()
                        if len(coords) == 2:
                            lng, lat = float(coords[0]), float(coords[1])
                            report["location"] = {"lat": lat, "lng": lng}
                        else:
                            report["location"] = {"lat": 37.5665, "lng": 126.9780}
                    else:
                        # 이미 dict 형태인 경우
                        if isinstance(report["location"], dict) and "lat" in report["location"]:
                            pass  # 이미 올바른 형태
                        else:
                            report["location"] = {"lat": 37.5665, "lng": 126.9780}
                except Exception as parse_error:
                    print(f"Location parsing failed: {parse_error}")
                    report["location"] = {"lat": 37.5665, "lng": 126.9780}
            else:
                # 기본값 설정
                report["location"] = {"lat": 37.5665, "lng": 126.9780}
            
            report["vote_count"] = 0  # TODO: 실제 투표 수 계산
            report["comment_count"] = 0  # TODO: 실제 댓글 수 계산
            report["user_voted"] = False
        
        return reports
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Query error: {str(e)}")

@router.get("/nearby", response_model=List[Report])
async def get_nearby_reports(
    lat: float,
    lng: float,
    radius_km: float = 3.0,
    category: Optional[ReportCategory] = None,
    limit: int = 50,
    supabase: Client = Depends(get_supabase)
) -> Any:
    """
    특정 위치 기준 근처 제보 조회 (Python에서 거리 계산)
    """
    try:
        # 모든 제보 데이터 가져오기
        query = supabase.table("reports").select("*")
        
        if category:
            query = query.eq("category", category.value)
        
        response = query.execute()
        all_reports = response.data
        
        # Python에서 거리 계산 및 필터링
        nearby_reports = []
        
        for report in all_reports:
            # 위치 정보 파싱 (WKB 형식)
            report_lat, report_lng = None, None
            
            if report.get("location"):
                try:
                    location_str = str(report["location"])
                    if len(location_str) > 20 and all(c in '0123456789ABCDEFabcdef' for c in location_str):
                        # WKB 파싱 사용
                        location_dict = convert_wkb_to_location(location_str)
                        report_lat = location_dict.get("lat")
                        report_lng = location_dict.get("lng")
                    elif "POINT(" in location_str:
                        coords = location_str.replace("POINT(", "").replace(")", "").split()
                        if len(coords) == 2:
                            report_lng, report_lat = float(coords[0]), float(coords[1])
                    elif isinstance(report["location"], dict):
                        report_lat = report["location"].get("lat")
                        report_lng = report["location"].get("lng")
                except Exception:
                    continue
            
            if report_lat is None or report_lng is None:
                continue
            
            # 거리 계산 (Haversine 공식)
            distance = calculate_distance(lat, lng, report_lat, report_lng)
            
            # 반경 내에 있는지 확인
            if distance <= radius_km * 1000:  # km를 m로 변환
                # 제보에 거리 정보와 정리된 위치 정보 추가
                report["location"] = {"lat": report_lat, "lng": report_lng}
                report["distance"] = distance
                report["distance_km"] = round(distance / 1000, 2)
                report["vote_count"] = 0
                report["comment_count"] = 0
                report["user_voted"] = False
                
                nearby_reports.append(report)
        
        # 거리순으로 정렬
        nearby_reports.sort(key=lambda x: x["distance"])
        
        # 제한 적용
        if limit:
            nearby_reports = nearby_reports[:limit]
        
        print(f"Nearby reports: {len(nearby_reports)} found (center: {lat}, {lng}, radius: {radius_km}km)")
        return nearby_reports
        
    except Exception as e:
        print(f"Nearby reports error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"근처 제보 조회 중 오류가 발생했습니다: {str(e)}",
        )

@router.get("/bounds", response_model=List[Report])
async def get_reports_in_bounds(
    north: float,  # 북쪽 위도
    south: float,  # 남쪽 위도 
    east: float,   # 동쪽 경도
    west: float,   # 서쪽 경도
    category: Optional[ReportCategory] = None,
    limit: int = 100,
    supabase: Client = Depends(get_supabase)
) -> Any:
    """
    맵 영역(bounds) 기준 제보 조회 - 카카오맵 방식
    """
    try:
        # 모든 제보 데이터 가져오기
        query = supabase.table("reports").select("*")
        
        if category:
            query = query.eq("category", category.value)
        
        response = query.execute()
        all_reports = response.data
        
        # 영역 내 제보 필터링
        bounded_reports = []
        
        for report in all_reports:
            # 위치 정보 파싱 (WKB 형식)
            report_lat, report_lng = None, None
            
            if report.get("location"):
                try:
                    location_str = str(report["location"])
                    if len(location_str) > 20 and all(c in '0123456789ABCDEFabcdef' for c in location_str):
                        # WKB 파싱 사용
                        location_dict = convert_wkb_to_location(location_str)
                        report_lat = location_dict.get("lat")
                        report_lng = location_dict.get("lng")
                    elif "POINT(" in location_str:
                        coords = location_str.replace("POINT(", "").replace(")", "").split()
                        if len(coords) == 2:
                            report_lng, report_lat = float(coords[0]), float(coords[1])
                    elif isinstance(report["location"], dict):
                        report_lat = report["location"].get("lat")
                        report_lng = report["location"].get("lng")
                except Exception:
                    continue
            
            if report_lat is None or report_lng is None:
                continue
            
            # 영역 내에 있는지 확인
            if (south <= report_lat <= north and west <= report_lng <= east):
                # 제보에 정리된 위치 정보 추가
                report["location"] = {"lat": report_lat, "lng": report_lng}
                report["vote_count"] = 0
                report["comment_count"] = 0
                report["user_voted"] = False
                
                bounded_reports.append(report)
        
        # 생성일 기준 정렬 (최신순)
        bounded_reports.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        
        # 제한 적용
        if limit:
            bounded_reports = bounded_reports[:limit]
        
        print(f"📍 맵 영역 제보 조회: {len(bounded_reports)}개 (영역: {north},{south},{east},{west})")
        return bounded_reports
        
    except Exception as e:
        print(f"❌ 맵 영역 제보 조회 오류: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"맵 영역 제보 조회 중 오류가 발생했습니다: {str(e)}",
        )

@router.get("/my-neighborhood", response_model=List[Report])
async def get_my_neighborhood_reports(
    radius_km: float = 3.0,
    category: Optional[ReportCategory] = None,
    limit: int = 50,
    current_user_id: str = Depends(get_current_active_user),
    supabase: Client = Depends(get_supabase)
) -> Any:
    """
    내 설정된 동네 기준 제보 조회
    """
    try:
        # 사용자 프로필에서 내 동네 정보 가져오기
        profile_response = supabase.table("profiles").select("neighborhood").eq("id", current_user_id).execute()
        
        if not profile_response.data or not profile_response.data[0].get("neighborhood"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="내 동네가 설정되지 않았습니다. 먼저 내 동네를 설정해주세요.",
            )
        
        neighborhood = profile_response.data[0]["neighborhood"]
        lat = neighborhood["lat"]
        lng = neighborhood["lng"]
        
        print(f"My neighborhood reports: {neighborhood['place_name']} ({lat}, {lng})")
        
        # 내 동네 기준 근처 제보 조회 (수정된 함수 사용)
        return await get_nearby_reports(lat, lng, radius_km, category, limit, supabase)
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"My neighborhood reports error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"내 동네 제보 조회 중 오류가 발생했습니다: {str(e)}",
        )

@router.get("/{report_id}", response_model=Report)
async def get_report(
    report_id: UUID,
    supabase: Client = Depends(get_supabase),
) -> Any:
    """
    특정 제보 상세 조회
    """
    try:
        # 기본 제보 데이터 조회
        response = supabase.table("reports").select("*").eq("id", str(report_id)).execute()
        
        if len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="제보를 찾을 수 없습니다",
            )
        
        report = response.data[0]
        
        # 위치 정보 파싱 (WKB 형식)
        if report.get("location"):
            try:
                location_str = str(report["location"])
                if len(location_str) > 20 and all(c in '0123456789ABCDEFabcdef' for c in location_str):
                    # WKB 파싱 사용
                    report["location"] = convert_wkb_to_location(location_str)
                elif "POINT(" in location_str:
                    coords = location_str.replace("POINT(", "").replace(")", "").split()
                    if len(coords) == 2:
                        lng, lat = float(coords[0]), float(coords[1])
                        report["location"] = {"lat": lat, "lng": lng}
                    else:
                        report["location"] = {"lat": 37.5665, "lng": 126.9780}
                else:
                    if isinstance(report["location"], dict) and "lat" in report["location"]:
                        pass  # 이미 올바른 형태
                    else:
                        report["location"] = {"lat": 37.5665, "lng": 126.9780}
            except Exception as parse_error:
                print(f"Location parsing failed: {parse_error}")
                report["location"] = {"lat": 37.5665, "lng": 126.9780}
        else:
            report["location"] = {"lat": 37.5665, "lng": 126.9780}
        
        # 투표 수 계산
        votes_response = supabase.table("votes").select("id").eq("report_id", report["id"]).execute()
        report["vote_count"] = len(votes_response.data)
        
        # 댓글 수 계산
        comments_response = supabase.table("comments").select("id").eq("report_id", report["id"]).execute()
        report["comment_count"] = len(comments_response.data)
        
        report["user_voted"] = False  # 로그인 없이는 투표 정보 없음
        
        return report
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"제보 조회 중 오류가 발생했습니다: {str(e)}",
        )

@router.put("/{report_id}", response_model=Report)
async def update_report(
    report_id: UUID,
    report_in: ReportUpdate,
    current_user_id: str = Depends(get_current_active_user),
    supabase: Client = Depends(get_supabase)
) -> Any:
    """
    제보 수정
    """
    try:
        # 제보가 존재하는지 확인
        report_response = supabase.table("reports").select("*").eq("id", str(report_id)).execute()
        
        if len(report_response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="제보를 찾을 수 없습니다",
            )
        
        report = report_response.data[0]
        
        # 제보 작성자만 수정 가능하도록 확인
        if report["user_id"] != current_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="이 제보를 수정할 권한이 없습니다",
            )
        
        # 업데이트할 데이터 준비
        update_data = {}
        if report_in.title is not None:
            update_data["title"] = report_in.title
        if report_in.description is not None:
            update_data["description"] = report_in.description
        if report_in.image_url is not None:
            update_data["image_url"] = report_in.image_url
        if report_in.status is not None:
            update_data["status"] = report_in.status.value
        if report_in.category is not None:
            update_data["category"] = report_in.category.value
        
        # 업데이트 실행
        response = supabase.table("reports").update(update_data).eq("id", str(report_id)).execute()
        
        if len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="제보 수정 중 오류가 발생했습니다",
            )
        
        updated_report = response.data[0]
        
        # 위치 정보 변환 (WKB 파싱)
        if updated_report.get("location"):
            location_str = str(updated_report["location"])
            if len(location_str) > 20 and all(c in '0123456789ABCDEFabcdef' for c in location_str):
                updated_report["location"] = convert_wkb_to_location(location_str)
            else:
                updated_report["location"] = {"lat": 37.5665, "lng": 126.9780}
        else:
            updated_report["location"] = {"lat": 37.5665, "lng": 126.9780}
        
        # 투표 및 댓글 정보 추가
        votes_response = supabase.table("votes").select("id").eq("report_id", updated_report["id"]).execute()
        updated_report["vote_count"] = len(votes_response.data)
        
        comments_response = supabase.table("comments").select("id").eq("report_id", updated_report["id"]).execute()
        updated_report["comment_count"] = len(comments_response.data)
        
        user_voted_response = supabase.table("votes").select("id").eq("report_id", updated_report["id"]).eq("user_id", current_user_id).execute()
        updated_report["user_voted"] = len(user_voted_response.data) > 0
        
        return updated_report
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"제보 수정 중 오류가 발생했습니다: {str(e)}",
        )

@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_report(
    report_id: UUID,
    current_user_id: str = Depends(get_current_active_user),
    supabase: Client = Depends(get_supabase)
):
    """
    제보 삭제
    """
    try:
        # 제보가 존재하는지 확인
        report_response = supabase.table("reports").select("*").eq("id", str(report_id)).execute()
        
        if len(report_response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="제보를 찾을 수 없습니다",
            )
        
        report = report_response.data[0]
        
        # 제보 작성자만 삭제 가능하도록 확인
        if report["user_id"] != current_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="이 제보를 삭제할 권한이 없습니다",
            )
        
        # 삭제 실행
        response = supabase.table("reports").delete().eq("id", str(report_id)).execute()
        
        if len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="제보 삭제 중 오류가 발생했습니다",
            )
        
        return
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"제보 삭제 중 오류가 발생했습니다: {str(e)}",
        )

