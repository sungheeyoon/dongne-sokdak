# 🗺️ 카카오 지도 API 설정 가이드

## 📋 개요
동네속닥 프로젝트에서 카카오 지도 API를 사용하기 위한 설정 가이드입니다.

## 🔑 API 키 발급 방법

### 1단계: 카카오 개발자 계정 생성
1. [카카오 개발자 사이트](https://developers.kakao.com) 접속
2. 카카오 계정으로 로그인
3. "개발자 등록" 진행

### 2단계: 애플리케이션 등록
1. **내 애플리케이션 > 애플리케이션 추가하기** 클릭
2. 앱 정보 입력:
   - **앱 이름**: `동네속닥`
   - **사업자명**: 개인 또는 회사명 입력
3. **저장** 클릭

### 3단계: 플랫폼 설정
1. 생성된 앱 클릭 → **플랫폼** 탭
2. **Web 플랫폼 등록** 클릭
3. 사이트 도메인 등록:
   ```
   http://localhost:3000    (개발환경)
   https://yourdomain.com   (프로덕션환경)
   ```

### 4단계: API 키 확인
1. **앱 키** 탭에서 다음 키들 확인:
   - **JavaScript 키** (지도 표시용)
   - **REST API 키** (주소 검색용)

### 5단계: 환경변수 설정
프로젝트의 `.env.local` 파일에 발급받은 키 입력:

```bash
# 카카오 지도 API 키
NEXT_PUBLIC_KAKAO_MAP_API_KEY=your_javascript_key_here
NEXT_PUBLIC_KAKAO_REST_API_KEY=your_rest_api_key_here
```

## 🚀 실행 방법

### 1. 패키지 설치
```bash
cd frontend
npm install react-kakao-maps-sdk kakao.maps.d.ts
```

### 2. 개발 서버 실행
```bash
npm run dev
```

### 3. 브라우저에서 확인
http://localhost:3000 접속하여 지도가 정상적으로 표시되는지 확인

## ⚠️ 주의사항

### 도메인 등록 필수
- 카카오 지도 API는 등록된 도메인에서만 작동합니다
- 개발 시: `http://localhost:3000`
- 배포 시: 실제 도메인 주소 추가 등록 필요

### API 키 보안
- API 키는 절대 GitHub 등에 공개하지 마세요
- `.env.local` 파일은 `.gitignore`에 포함되어 있습니다

### 사용량 제한
- 카카오 지도 API는 월 30만 호출까지 무료
- 초과 시 과금 발생 가능

## 🔧 문제 해결

### 지도가 표시되지 않는 경우
1. **API 키 확인**: `.env.local` 파일의 키가 정확한지 확인
2. **도메인 등록**: 현재 접속 중인 도메인이 등록되어 있는지 확인
3. **브라우저 콘솔**: 개발자 도구에서 오류 메시지 확인

### 주소 검색이 안 되는 경우
1. **REST API 키 확인**: JavaScript 키와 다른 키입니다
2. **Places API 권한**: 카카오 개발자 사이트에서 권한 확인

## 📚 추가 리소스

- [카카오 지도 API 공식 문서](https://apis.map.kakao.com/web/)
- [react-kakao-maps-sdk 문서](https://react-kakao-maps-sdk.jaeseokim.dev/)
- [카카오 개발자 센터](https://developers.kakao.com/)

## 🎯 주요 기능

### ✅ 구현 완료
- [x] 카카오 지도 표시
- [x] 제보 마커 표시 및 클러스터링
- [x] 주소 검색 및 자동완성
- [x] 현재 위치 감지
- [x] 동네 범위 설정 (1km/3km/6km)
- [x] 거리 기반 필터링
- [x] 지도 클릭으로 위치 선택
- [x] 역지오코딩 (좌표 → 주소)

### 🔄 향후 개선사항
- [ ] 지도 스타일 커스터마이징
- [ ] 실시간 위치 추적
- [ ] 경로 안내 기능
- [ ] POI(관심 지점) 표시

---

**🎉 설정 완료 후 동네속닥의 강력한 지도 기능을 체험해보세요!**