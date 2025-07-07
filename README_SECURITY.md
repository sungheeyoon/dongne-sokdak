# 🔐 보안 설정 가이드

## 환경 변수 설정

### 1. 프론트엔드 설정
```bash
cp frontend/.env.example frontend/.env.local
```

다음 변수들을 실제 값으로 변경하세요:

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase 프로젝트 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon 키
- `NEXT_PUBLIC_API_URL`: 백엔드 API URL
- `NEXT_PUBLIC_KAKAO_MAP_API_KEY`: 카카오맵 API 키
- `NEXT_PUBLIC_KAKAO_REST_API_KEY`: 카카오 REST API 키

### 2. 백엔드 설정
```bash
cp backend/.env.example backend/.env
```

다음 변수들을 실제 값으로 변경하세요:

- `DATABASE_URL`: PostgreSQL 데이터베이스 URL
- `SUPABASE_URL`: Supabase 프로젝트 URL
- `SUPABASE_KEY`: Supabase service role 키
- `JWT_SECRET`: 강력한 JWT 시크릿 키 (최소 32자)

### 3. JWT 시크릿 키 생성
```bash
# Python으로 생성
python -c "import secrets; print(secrets.token_urlsafe(32))"

# OpenSSL로 생성
openssl rand -base64 32
```

## 보안 체크리스트

### ✅ 환경 변수
- [ ] `.env` 파일이 `.gitignore`에 포함되어 있음
- [ ] 모든 API 키가 환경 변수로 분리됨
- [ ] JWT 시크릿이 강력하게 설정됨
- [ ] 프로덕션과 개발 환경 분리됨

### ✅ 데이터베이스
- [ ] RLS(Row Level Security) 정책 적용됨
- [ ] 관리자 권한 시스템 구현됨
- [ ] 모든 민감한 작업이 로깅됨

### ✅ API
- [ ] CORS 설정이 운영 도메인으로 제한됨
- [ ] Rate limiting 구현됨 (필요시)
- [ ] 입력 값 검증 및 sanitization

### ✅ 프론트엔드
- [ ] API 키가 public 키만 노출됨
- [ ] XSS 방지 처리됨
- [ ] 민감한 정보가 클라이언트에 노출되지 않음

## 프로덕션 배포 전 체크

### 1. 환경 변수 업데이트
- CORS_ORIGINS를 실제 도메인으로 변경
- API_URL을 프로덕션 URL로 변경
- 모든 키를 프로덕션용으로 교체

### 2. 보안 강화
- HTTPS 적용
- 보안 헤더 설정
- 로그 모니터링 시스템 구축

### 3. 모니터링
- Sentry 연동 (에러 트래킹)
- 로그 분석 시스템
- 성능 모니터링