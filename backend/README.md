# 🏘️ 동네속닥 백엔드 (FastAPI)

동네속닥의 비즈니스 로직과 데이터 처리를 담당하는 FastAPI 기반 백엔드 서버입니다.

## 🚀 주요 기능

- **RESTful API**: FastAPI를 사용한 고성능 비동기 API
- **인증 및 보안**:
  - Supabase Auth 연동
  - 소셜 로그인 (카카오, 구글) 지원 (Backend-Centric Flow)
  - RBAC (역할 기반 접근 제어)
- **위치 기반 서비스**:
  - PostGIS를 이용한 지리 정보 처리
  - 행정동 기반 제보 관리
- **관리자 시스템**: 제보 상태 관리 및 활동 로그 기록

## 🛠️ 기술 스택

- **Framework**: FastAPI
- **Database**: PostgreSQL + PostGIS
- **ORM**: SQLAlchemy 2.0
- **Validation**: Pydantic v2
- **Auth**: Supabase Auth + JWT
- **Language**: Python 3.12+

## ⚙️ 시작하기

### 1. 가상환경 설정
```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
```

### 2. 의존성 설치
```bash
pip install -r requirements.txt
```

### 3. 환경 변수 설정
`.env.example` 파일을 복사하여 `.env` 파일을 생성하고 필요한 값을 입력합니다.

```bash
cp .env.example .env
```

### 4. 서버 실행
```bash
uvicorn app.main:app --reload
```
서버가 실행되면 `http://localhost:8000/docs`에서 API 문서를 확인할 수 있습니다.

## 🔑 소셜 로그인 설정 (중요)

본 프로젝트는 보안 강화를 위해 **백엔드 중심의 소셜 로그인 흐름**을 사용합니다.

1. 프론트엔드에서 인가 코드(Authorization Code)를 획득합니다.
2. 백엔드의 `/api/v1/auth/social/[provider]` 엔드포인트로 코드를 전송합니다.
3. 백엔드에서 코드를 토큰으로 교환하고 Supabase에 세션을 생성하여 반환합니다.

### Redirect URI 설정
- **Kakao**: `http://localhost:3000/auth/callback/kakao`
- **Google**: `http://localhost:3000/auth/callback/google`

## 📁 프로젝트 구조

```
backend/
├── app/
│   ├── api/            # 라우터 엔드포인트
│   ├── core/           # 설정 및 보안 (JWT, Config)
│   ├── db/             # 데이터베이스 연결 및 Supabase 클라이언트
│   ├── middleware/     # 인증 및 로깅 미들웨어
│   ├── schemas/        # Pydantic 모델
│   ├── services/       # 비즈니스 로직 (소셜 인증 등)
│   └── main.py         # 애플리케이션 진입점
├── config/             # 환경별 설정 파일
├── supabase/           # 마이그레이션 SQL
└── .env.example        # 환경 변수 템플릿
```

## 📜 API 문서

- **Swagger UI**: `/docs`
- **ReDoc**: `/redoc`
