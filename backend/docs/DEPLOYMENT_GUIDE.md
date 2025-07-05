# 🚀 동네속닥 배포 가이드

## 📋 배포 전 체크리스트

### 1. 환경별 설정 준비
- [ ] 스테이징/운영 환경 Supabase 프로젝트 생성
- [ ] 환경별 JWT 시크릿키 생성
- [ ] 도메인별 CORS 설정
- [ ] Sentry 프로젝트 생성 및 DSN 확보

### 2. 보안 설정 확인
- [ ] 모든 환경변수에 실제 값 설정
- [ ] JWT 시크릿키 안전성 확인
- [ ] 데이터베이스 접근 권한 설정
- [ ] API 키 및 시크릿 보안 저장소 이관

### 3. 인프라 준비
- [ ] 서버 환경 구성
- [ ] 도메인 및 SSL 인증서 설정
- [ ] 로드 밸런서 구성 (필요시)
- [ ] 백업 시스템 구축

## 🔧 환경별 배포 설정

### 개발 환경
```bash
# 설정 파일 복사
cp config/development.env .env

# 의존성 설치
pip install -r requirements.txt

# 서버 실행
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 스테이징 환경
```bash
# 설정 파일 복사 및 수정
cp config/staging.env .env
# 실제 값으로 환경변수 수정 필요

# 의존성 설치
pip install -r requirements.txt

# 서버 실행
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 운영 환경
```bash
# 설정 파일 복사 및 수정
cp config/production.env .env
# 모든 환경변수를 실제 운영 값으로 수정

# 의존성 설치
pip install -r requirements.txt

# 프로덕션 서버 실행 (Gunicorn 추천)
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

## 🔐 환경변수 설정 가이드

### 필수 설정 항목

#### 1. 환경 구분
```env
ENVIRONMENT=production  # development, staging, production
```

#### 2. 데이터베이스 설정
```env
DATABASE_URL=postgresql://user:password@host:5432/database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
```

#### 3. 보안 설정
```env
JWT_SECRET=your-very-secure-jwt-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

#### 4. CORS 설정
```env
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

#### 5. 모니터링 설정
```env
LOG_LEVEL=ERROR
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

## 📊 모니터링 및 로깅

### Sentry 설정
1. [Sentry.io](https://sentry.io) 계정 생성
2. 새 프로젝트 생성 (Python/FastAPI)
3. DSN 복사하여 환경변수에 설정
4. 에러 트래킹 및 성능 모니터링 활성화

### 로그 확인
```bash
# 실시간 로그 확인
tail -f logs/app.log

# JSON 형식 로그 파싱
cat logs/app.log | jq '.'
```

## 🛡️ 보안 권장사항

### 1. JWT 시크릿키 생성
```python
import secrets
print(secrets.token_urlsafe(32))
```

### 2. 환경변수 보안 관리
- AWS Systems Manager Parameter Store
- HashiCorp Vault
- Kubernetes Secrets
- Docker Secrets

### 3. 네트워크 보안
- 방화벽 설정
- VPN 접근 제한
- API Rate Limiting
- DDoS 보호

## 📈 성능 최적화

### 1. 데이터베이스 최적화
- 인덱스 설정
- 쿼리 최적화
- 연결 풀링 설정

### 2. 캐싱 전략
- Redis 캐시 도입
- CDN 설정
- 정적 파일 최적화

### 3. 서버 최적화
- Gunicorn worker 수 조정
- 메모리 사용량 모니터링
- CPU 사용률 최적화

## 🔄 CI/CD 파이프라인

### GitHub Actions 예시
```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Deploy to server
      run: |
        # 배포 스크립트 실행
        ./deploy.sh production
```

## 📋 배포 후 확인사항

### 1. 서비스 상태 확인
```bash
curl https://api.yourdomain.com/health
```

### 2. 로그 확인
```bash
# 에러 로그 확인
grep "ERROR" logs/app.log

# 성능 로그 확인
grep "response_time" logs/app.log
```

### 3. 모니터링 대시보드 확인
- Sentry 대시보드
- 서버 메트릭
- 데이터베이스 성능

## 🆘 트러블슈팅

### 자주 발생하는 문제들

#### 1. CORS 에러
```
해결: CORS_ORIGINS 환경변수에 프론트엔드 도메인 추가
```

#### 2. 데이터베이스 연결 실패
```
해결: DATABASE_URL 및 방화벽 설정 확인
```

#### 3. JWT 토큰 에러
```
해결: JWT_SECRET 설정 및 토큰 만료 시간 확인
```

## 📞 지원 및 문의

배포 관련 문제가 발생하면 다음을 확인해주세요:
1. 에러 로그 확인
2. Sentry 대시보드 확인
3. 환경변수 설정 재확인
4. 서버 리소스 상태 확인