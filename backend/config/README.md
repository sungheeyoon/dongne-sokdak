# 환경별 설정 파일 관리

## 설정 파일 설명

- `development.env`: 개발 환경 설정
- `staging.env`: 스테이징 환경 설정  
- `production.env`: 운영 환경 설정

## 사용 방법

### 개발 환경
```bash
cp config/development.env .env
```

### 스테이징 환경
```bash
cp config/staging.env .env
```

### 운영 환경
```bash
cp config/production.env .env
# 실제 운영 값으로 수정 필요
```

## 보안 주의사항

1. **절대 실제 시크릿을 Git에 커밋하지 말 것**
2. 운영 환경에서는 반드시 강력한 JWT 시크릿 사용
3. 데이터베이스 비밀번호는 환경변수나 시크릿 관리 도구 사용
4. CORS 설정은 실제 도메인만 허용

## 환경 변수 설정 필수 항목

### 스테이징/운영 환경 설정 시 반드시 변경해야 할 항목:

1. `DATABASE_URL` - 각 환경별 데이터베이스 URL
2. `SUPABASE_URL` - 각 환경별 Supabase 프로젝트 URL  
3. `SUPABASE_KEY` - 각 환경별 Supabase 서비스 키
4. `JWT_SECRET` - 환경별 고유한 강력한 시크릿
5. `CORS_ORIGINS` - 각 환경별 허용 도메인