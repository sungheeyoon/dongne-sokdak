# 백엔드 서비스 계층은 클래스 + 완전한 생성자 주입

백엔드 서비스 계층(report / comment / vote / profile / admin 4종)을 모듈 함수 스타일에서 클래스로 전면 전환한다. 의존성(supabase 클라이언트, 캐시 등)은 전부 생성자로 주입하고(`ReportService(supabase, cache)`), 각 module이 module-level 기본 인스턴스를 export하며, 라우트는 그 인스턴스를 import해 쓴다. FastAPI `Depends`는 서비스 주입에 쓰지 않는다 — 기존 전역 supabase 클라이언트와 같은 wiring 수준을 유지해 라우트 signature가 의존성을 모르게 한다.

## Considered Options

- **캐시만 파라미터 기본값으로 주입, 함수 스타일 유지**: 변경 표면은 최소지만 호출부 signature가 그대로라 depth 이득이 없음 — 기각.
- **상태를 가진 `ReportService`만 클래스로**: "상태를 소유할 때만 클래스"라는 규칙은 명확하나, 계층 내 두 스타일 공존을 감수해야 함 — 일관성을 택해 기각.

## Consequences

호출부에서 `supabase` 인자가 사라진다. 테스트는 module 전역 상태를 몰래 clear하는 대신 `Service(fake_supabase, fake_cache)`로 인스턴스를 새로 만든다. 라우트·테스트 전체가 함께 이동해야 하는 계층 전체 규모의 수술이다.
