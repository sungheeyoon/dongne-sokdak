# 동네속닥 백엔드

_Last verified: 2026-07-24_

FastAPI와 Supabase client를 사용해 제보·댓글·투표·프로필·관리자 기능을 제공합니다. DB는 PostgreSQL/PostGIS이며, 성능이 중요한 읽기는 `supabase/migrations/`의 SQL RPC로 처리합니다. SQLAlchemy ORM은 사용하지 않습니다.

## 현재 지도 조회

| 경로 | 상태 | DB 경계 |
| --- | --- | --- |
| `GET /api/v1/reports/bounds` | 프론트엔드 활성 경로 | `get_reports_in_bounds_page` 1회 |
| `GET /api/v1/reports/nearby` | 백엔드 호환용, 프론트 미사용 | 반경 get/count RPC |
| `GET /api/v1/reports/benchmark/nearby-rest` | 과거 방식 비교용 | REST + Python Haversine |

활성 bounds RPC는 공간 인덱스 후보 검색과 페이지·전체 개수 반환을 한 호출에 처리합니다. category/search 술어는 실행계획 검증 결과에 따라 RPC 안에 인라인되어 있습니다.

- [ADR-0010](../docs/adr/0010-inline-active-bounds-filters.md)
- [bounds 부하 테스트 보고서](results/locust/BOUNDS_RPC_BENCHMARK_20260724.md)

## 구조

```text
backend/
├── app/
│   ├── api/             # FastAPI 라우트
│   ├── services/        # 애플리케이션 로직
│   ├── schemas/         # Pydantic v2
│   ├── db/              # Supabase client
│   ├── core/            # 설정·로깅·보안
│   └── middleware/
├── scripts/             # 시드·부하 테스트·결과 요약
├── supabase/migrations/ # PostgreSQL/PostGIS RPC와 정책
├── tests/               # pytest
└── requirements-dev.txt
```

라우트는 서비스 기본 인스턴스에 위임합니다. 서비스는 Supabase client와 캐시를 생성자로 주입받으며, 테스트는 fake client/cache로 외부 경계를 격리합니다.

## 실행

```bash
python -m venv .venv
pip install -r requirements-dev.txt
uvicorn app.main:app --reload
```

Windows PowerShell에서는 가상환경 Python을 직접 실행할 수 있습니다.

```powershell
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

API 문서는 서버 실행 후 `/docs`와 `/redoc`에서 확인합니다.

## 환경 변수

`backend/.env.example`을 기준으로 `.env`를 구성합니다. 주요 항목은 다음과 같습니다.

- `SUPABASE_URL`
- `SUPABASE_KEY`
- `JWT_SECRET`
- `CORS_ORIGINS`
- OAuth 제공자 자격 증명
- `DATABASE_URL` — 직접 PostgreSQL 연결이 필요한 유지보수 스크립트에서 사용

환경별 예시는 [`config/README.md`](config/README.md)를 참고하되 실제 시크릿은 커밋하지 않습니다.

## 검증

```bash
python -m pytest -q
python -m locust -f scripts/locustfile_bounds.py --list
python scripts/summarize_bounds_benchmark.py --help
```

GitHub Actions도 Python 3.12에서 `requirements-dev.txt`를 설치하고 전체 pytest를 실행합니다.
