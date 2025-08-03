# 🔧 카카오 로그인 문제 해결 가이드

## 🚨 발생한 문제
1. **React Error #185**: Next.js 15에서 useSearchParams 훅 사용 시 Suspense 경계 오류
2. **리다이렉트 URL 불일치**: localhost:3000 → dongne-sokdak.vercel.app URL 변경 시 문제
3. **환경별 설정 부족**: 로컬/프로덕션 환경에서 동일한 설정 사용

## ✅ 해결 방법

### 1. React Error #185 해결 (useSearchParams Suspense 래핑)

**문제**: Next.js 15에서 useSearchParams 사용 시 Suspense 경계 필요

**해결**: `callback/page.tsx`에서 Suspense로 컴포넌트 래핑

```tsx
// Before
export default function KakaoCallbackPage() {
  const searchParams = useSearchParams() // Error #185 발생
  // ...
}

// After  
function KakaoCallbackContent() {
  const searchParams = useSearchParams() // 안전하게 사용
  // ...
}

export default function KakaoCallbackPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <KakaoCallbackContent />
    </Suspense>
  )
}
```

### 2. 환경별 카카오 리다이렉트 URL 자동 설정

**문제**: 하드코딩된 localhost:3000 URL

**해결**: 환경별 동적 URL 설정

```python
# backend/app/core/config.py
@property
def KAKAO_REDIRECT_URI(self) -> str:
    if self.ENVIRONMENT == "production":
        return "https://dongne-sokdak.vercel.app/auth/kakao/callback"
    elif self.ENVIRONMENT == "staging":
        return "https://dongne-sokdak-staging.vercel.app/auth/kakao/callback"
    else:
        return "http://localhost:3000/auth/kakao/callback"
```

### 3. CORS 설정 개선

**문제**: 프로덕션 도메인 CORS 미허용

**해결**: 환경별 동적 CORS 설정

```python
@property 
def CORS_ORIGINS(self) -> List[str]:
    origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    if self.ENVIRONMENT == "production":
        origins.extend([
            "https://dongne-sokdak.vercel.app",
            "https://dongne-sokdak-backend.onrender.com"
        ])
    
    return list(set(origins))
```

## 🔧 카카오 개발자 콘솔 설정

### 1. 리다이렉트 URI 등록
카카오 개발자 콘솔 → 앱 설정 → 카카오 로그인 → Redirect URI:

- **개발**: `http://localhost:3000/auth/kakao/callback`
- **운영**: `https://dongne-sokdak.vercel.app/auth/kakao/callback`

### 2. 웹 플랫폼 도메인 등록
카카오 개발자 콘솔 → 앱 설정 → 플랫폼 → Web:

- **개발**: `http://localhost:3000`  
- **운영**: `https://dongne-sokdak.vercel.app`

## 🚀 배포 시 환경변수 설정

### Vercel (프론트엔드)
```bash
NEXT_PUBLIC_API_URL=https://dongne-sokdak-backend.onrender.com
NEXT_PUBLIC_KAKAO_MAP_API_KEY=your_kakao_map_key
```

### Render (백엔드)
```bash
ENVIRONMENT=production
KAKAO_CLIENT_ID=your_kakao_client_id
KAKAO_CLIENT_SECRET=your_kakao_client_secret
CORS_ORIGINS=https://dongne-sokdak.vercel.app
```

## 🧪 테스트 방법

### 1. 로컬 환경 테스트
```bash
# 백엔드 실행
cd backend && uvicorn app.main:app --reload

# 프론트엔드 실행  
cd frontend && npm run dev

# 카카오 로그인 테스트
# → http://localhost:3000에서 카카오 로그인 버튼 클릭
```

### 2. 프로덕션 환경 테스트
```bash
# 실제 배포된 사이트에서 테스트
# → https://dongne-sokdak.vercel.app에서 카카오 로그인 테스트
```

## ⚠️ 주의사항

1. **환경변수 동기화**: 카카오 앱키와 시크릿이 프론트/백엔드에 정확히 설정되어야 함
2. **HTTPS 필수**: 프로덕션에서는 반드시 HTTPS 사용
3. **도메인 정확성**: 카카오 콘솔의 등록된 도메인과 실제 배포 도메인 일치 필수
4. **캐시 클리어**: 설정 변경 후 브라우저 캐시 및 Vercel/Render 재배포 필요

## 🎯 예상 결과

✅ **수정 후**:
- React Error #185 완전 해결
- 로컬/프로덕션 환경에서 모두 정상 작동
- 환경별 자동 URL 설정으로 배포 시 추가 설정 불필요
- CORS 오류 해결로 API 통신 정상화

---
**마지막 업데이트**: 2025-08-03  
**관련 파일**: `callback/page.tsx`, `config.py`