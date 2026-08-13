"""처리되지 않은 예외도 CORS 헤더를 달고 나가야 한다.

핸들러가 없으면 Starlette가 CORSMiddleware 바깥에서 500을 만들어
Access-Control-Allow-Origin 없이 응답한다. 그러면 브라우저는 본문을 읽지 못하고
fetch를 "Failed to fetch"로 실패시켜, 프론트엔드가 '서버가 꺼졌다'고 오진한다 —
실제로는 서버가 살아서 500을 돌려준 상황이다.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app

ORIGIN = "http://localhost:3000"


@pytest.fixture
def client():
    # raise_server_exceptions=False 여야 실제 배포처럼 500 응답을 관찰할 수 있다
    return TestClient(app, raise_server_exceptions=False)


@pytest.fixture
def boom_route():
    @app.get("/__test__/boom")
    async def boom():
        raise RuntimeError("terrible internal detail")

    yield
    app.router.routes = [
        route for route in app.router.routes
        if getattr(route, "path", None) != "/__test__/boom"
    ]


def test_unhandled_exception_keeps_cors_headers(client, boom_route):
    response = client.get("/__test__/boom", headers={"Origin": ORIGIN})

    assert response.status_code == 500
    assert response.headers.get("access-control-allow-origin") == ORIGIN


def test_unhandled_exception_body_hides_internal_detail(client, boom_route):
    response = client.get("/__test__/boom", headers={"Origin": ORIGIN})

    assert "terrible internal detail" not in response.text
    assert response.json() == {"detail": "서버에서 요청을 처리하지 못했습니다"}
