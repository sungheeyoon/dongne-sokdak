import os

import pytest

# Set dummy environment variables for testing before anything else is loaded
os.environ["SUPABASE_URL"] = "https://example.supabase.co"
os.environ["SUPABASE_KEY"] = "dummy-key"
os.environ["JWT_SECRET"] = "test-secret"
os.environ["ENVIRONMENT"] = "testing"


@pytest.fixture
def make_service(mocker):
    """ADR-0002 서비스 인스턴스 팩토리: 클래스를 받아 (service, mock_supabase)를 돌려준다."""
    def _make(service_cls):
        mock_supabase = mocker.Mock()
        return service_cls(mock_supabase), mock_supabase
    return _make
