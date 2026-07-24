"""배선 스모크 — 라우트가 기본 인스턴스를 제대로 배선했는지만 확인한다.

캐시 히트/무효화/user_voted 오버레이 시나리오는 전부 서비스 interface
단위 테스트(test_report_service.py)에 있다. 여기에 다시 쓰지 않는다.
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock
from datetime import datetime
from uuid import uuid4

from app.main import app
import app.api.v1.reports as reports_routes
from app.services.report_service import ReportService, report_service
from app.services.admin.report_service import admin_report_service
from tests.fakes import FakeSpatialReportCache

client = TestClient(app)


@pytest.fixture
def mock_supabase(monkeypatch):
    """Swap the routes' default ReportService for one built on fakes (ADR-0002)."""
    supabase = MagicMock()
    monkeypatch.setattr(
        reports_routes, "report_service",
        ReportService(supabase, FakeSpatialReportCache())
    )
    return supabase


def create_mock_report():
    return {
        "id": str(uuid4()),
        "user_id": str(uuid4()),
        "title": "Test Report",
        "description": "Test Description",
        "location": "0101000000703D0AD7A3BF5F40B0726891EDC84240", # POINT(126.9780 37.5665)
        "address": "Seoul",
        "category": "OTHER",
        "status": "OPEN",
        "image_url": None,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
        "vote_count": 0,
        "comment_count": 0,
        "user_voted": False
    }


def test_routes_use_default_report_service_instance():
    assert reports_routes.report_service is report_service


def test_admin_default_shares_map_cache_with_report_default():
    # 배선 검증: admin 상태 변경이 지도 조회 무효화에 합류하려면 두 기본
    # 인스턴스가 같은 캐시여야 한다. 내부 속성 접근은 이 배선 테스트에 한정.
    assert admin_report_service._cache is report_service.cache


def test_get_nearby_reports_smoke(mock_supabase):
    report_data = create_mock_report()
    report_data["distance_meters"] = 100
    mock_rpc_call = MagicMock()
    mock_rpc_call.execute.side_effect = [MagicMock(data=1), MagicMock(data=[report_data])]
    mock_supabase.rpc.return_value = mock_rpc_call

    response = client.get("/api/v1/reports/nearby?lat=37.5665&lng=126.9780")

    assert response.status_code == 200
    body = response.json()
    assert body["items"][0]["id"] == report_data["id"]
    assert body["totalCount"] == 1


def test_get_bounds_reports_smoke(mock_supabase):
    report_data = create_mock_report()
    mock_rpc_call = MagicMock()
    mock_rpc_call.execute.return_value = MagicMock(
        data={"items": [report_data], "total_count": 1}
    )
    mock_supabase.rpc.return_value = mock_rpc_call

    response = client.get("/api/v1/reports/bounds?north=37.6&south=37.5&east=127.0&west=126.9")

    assert response.status_code == 200
    body = response.json()
    assert body["items"][0]["id"] == report_data["id"]
    assert body["totalCount"] == 1
    assert mock_supabase.rpc.call_count == 1
