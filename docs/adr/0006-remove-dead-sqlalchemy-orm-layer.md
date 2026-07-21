# 죽은 SQLAlchemy ORM 레이어를 제거한다 — DB 접근은 Supabase client 하나로

candidate 6 작업 중 `backend/app/models.py`의 `ReportStatus`/`ReportCategory`가 `schemas/report.py`의 동명 enum과 중복 정의된 것을 발견했는데, 감사해보니 `models.py`의 ORM 클래스(`Profile`, `Report`, `Comment`, `Vote`, `AdminActivityLog`) 전체와 `db/database.py`의 SQLAlchemy 엔진·세션(`get_db`)이 실제로는 어디서도 쿼리되지 않는 죽은 코드였다. `api/deps.py`는 `get_db`를 import만 하고 어떤 라우트도 `Depends(get_db)`로 쓰지 않는다 — 이 프로젝트는 이미 Supabase client로 완전히 전환됐다(CLAUDE.md: "DB access goes through Supabase client"). 유일하게 살아있는 조각은 `models.py`의 `UserRole` enum(`api/admin/schemas.py`가 순수 타입으로 import)뿐이라, `models.py`는 `UserRole` 하나만 남기고 나머지를 삭제하고, `db/database.py`·`schemas/base.py`(0-import 중복 enum 정의)를 통째로 삭제한다. 부수적으로 `requirements.txt`의 `SQLAlchemy`/`GeoAlchemy2`, `core/sentry.py`의 `SqlalchemyIntegration()`도 제거한다.

## Considered Options

- **나중에 쓸 수도 있으니 남겨둔다**: deletion test — `models.py`의 ORM 클래스와 `db/database.py`를 지워도 백엔드 테스트 146개가 전부 그대로 통과한다. 죽은 코드가 "이 프로젝트는 SQLAlchemy ORM도 쓴다"는 잘못된 인상을 줘서, 실제 DB 접근 경로를 파악하려는 사람이 Supabase client와 SQLAlchemy 두 경로를 다 읽어야 하는 비용이 계속 쌓인다 — 기각.
- **enum 중복만 해소하고 나머지 죽은 ORM 코드는 손대지 않는다**: candidate 6의 원래 범위(Report 타입 통합)에는 더 가깝지만, 같은 감사 과정에서 이미 죽은 코드임을 확인한 상태라 남겨두면 다음 사람이 또 같은 조사를 반복해야 한다 — 기각.

## Consequences

`models.py`는 `UserRole` enum 하나만 남은 5줄짜리 파일이 된다 — 파일명이 더는 실제 내용과 맞지 않지만, 이번 범위에서는 리네임하지 않고 후속 과제로 남긴다(admin schemas.py의 import 한 줄만 바꾸면 되는 작은 일이라 별도 PR로 충분하다). `psycopg2-binary`·`greenlet`은 SQLAlchemy 전용 의존성으로 보이지만 이번 감사 범위 밖이라 `requirements.txt`에 그대로 남겨뒀다 — 실제로 다른 패키지가 필요로 하는지 `pip`로 별도 확인이 필요하다.
