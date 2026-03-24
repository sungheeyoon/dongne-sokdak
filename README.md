#  동네속닥 (Dongne Sokdak)

**우리 동네의 불편사항과 이슈를 쉽게 제보하고 공유하는 커뮤니티 플랫폼**

##  프로젝트 소개

동네속닥은 지역 주민들이 일상에서 마주치는 불편사항이나 문제점을 간편하게 제보하고 공유할 수 있는 웹 서비스입니다. 기존의 공식 민원 채널은 절차가 복잡하고 무거운 반면, 동네속닥은 가볍고 직관적인 사용자 경험을 제공합니다.

##  주요 기능

###  **위치 기반 제보**
- **카카오맵 연동**: 정확한 위치 선택 및 지도 표시
- **행정동 매핑**: 법정동을 실제 행정동으로 자동 변환
- **지역 필터링**: 내 동네 중심의 제보 확인

###  **간편한 제보 시스템**
- **이미지 업로드**: 현장 사진과 함께 상황 공유
- **카테고리별 분류**: 소음, 쓰레기, 시설물 고장, 교통, 기타
- **상태 관리**: 접수됨 → 처리중 → 해결됨 단계별 진행 상황

### 👥 **커뮤니티 기능**
- **공감과 투표**: 다른 주민들의 의견 및 공감 표시
- **댓글 시스템**: 실시간 의견 교환 및 정보 공유
- **소셜 로그인**: 카카오 및 구글 계정으로 간편 로그인 (백엔드 인증 방식)

###  **관리자 시스템**
- **실시간 대시보드**: 통계 시각화 및 현황 모니터링
- **제보 관리**: 상태 변경, 담당자 배정, 일괄 처리
- **사용자 관리**: 권한 변경, 계정 관리, 역할 기반 접근 제어
- **활동 로그**: 모든 관리자 활동 추적 및 CSV 내보내기
- **시스템 설정**: 공지사항, 카테고리 관리, 백업 및 모니터링

## 🛠️ 기술 스택

### **프론트엔드**
- **Framework**: Next.js 16 (App Router) + TypeScript
- **Styling**: TailwindCSS + 반응형 디자인
- **State Management**: Zustand (UI 상태), TanStack Query (서버 상태)
- **Maps**: Kakao Map API (위치 기반 서비스)
- **Authentication**: Supabase Auth + 소셜 로그인 (카카오, 구글)

### **백엔드**
- **API**: FastAPI (Python) + Pydantic
- **Authentication**: JWT + Supabase Auth + OAuth2 Code Exchange
- **Database**: PostgreSQL (Supabase) + PostGIS (위치 정보)
- **Storage**: Supabase Storage (이미지 저장)
- **Security**: RBAC (역할 기반 접근 제어) + RLS (행 수준 보안)

### **배포**
- **Frontend**: Vercel (배포 준비 완료)
- **Backend**: FastAPI 서버 (Render/Railway 배포 예정)
- **Database**: Supabase (클라우드 PostgreSQL)

## 💾 데이터 모델

### **주요 데이터 구조**

```typescript
// 사용자 프로필
interface Profile {
  id: string;
  nickname: string;
  email: string;
  avatar_url?: string;
  role: 'user' | 'moderator' | 'admin';
  is_active: boolean;
  neighborhood?: {
    name: string;
    coordinates: [number, number];
  };
  created_at: Date;
  last_login_at?: Date;
}

// 제보
interface Report {
  id: string;
  user_id: string;
  title: string;
  description: string;
  image_url?: string;
  location: {
    lat: number;
    lng: number;
  };
  address: string;
  category: 'NOISE' | 'TRASH' | 'FACILITY' | 'TRAFFIC' | 'OTHER';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  admin_comment?: string;
  assigned_admin_id?: string;
  created_at: Date;
  updated_at: Date;
}

// 댓글
interface Comment {
  id: string;
  report_id: string;
  user_id: string;
  content: string;
  created_at: Date;
  updated_at: Date;
}

// 투표 (공감)
interface Vote {
  id: string;
  user_id: string;
  report_id: string;
  created_at: Date;
}

// 관리자 활동 로그
interface AdminActivityLog {
  id: string;
  admin_id: string;
  action: string;
  target_type: 'user' | 'report';
  target_id: string;
  details: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}
```

## 🚀 시작하기

### 필수 조건
- Node.js 18+
- Python 3.8+
- PostgreSQL (Supabase 사용)

### 1. 리포지토리 클론
```bash
git clone https://github.com/sungheeyoon/dongne-sokdak.git
cd dongne-sokdak
```

### 2. 환경 변수 설정
```bash
# 프론트엔드
cp frontend/.env.example frontend/.env.local
# 실제 API 키들로 변경

# 백엔드  
cp backend/.env.example backend/.env
# 실제 데이터베이스 정보로 변경
```

### 3. 의존성 설치 및 실행

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

#### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### 4. 접속
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API 문서: http://localhost:8000/docs

## 📁 프로젝트 구조

```
dongne-sokdak/
├── frontend/                 # Next.js 프론트엔드
│   ├── src/
│   │   ├── app/             # App Router 페이지
│   │   ├── components/      # React 컴포넌트
│   │   ├── hooks/           # 커스텀 훅
│   │   ├── lib/             # 유틸리티 및 설정
│   │   └── styles/          # 스타일 파일
│   ├── public/              # 정적 파일
│   └── package.json
│
├── backend/                  # FastAPI 백엔드
│   ├── app/
│   │   ├── api/             # API 라우터
│   │   ├── core/            # 핵심 설정
│   │   ├── db/              # 데이터베이스 설정
│   │   ├── middleware/      # 미들웨어
│   │   ├── schemas/         # Pydantic 스키마
│   │   └── services/        # 비즈니스 로직
│   ├── config/              # 환경별 설정
│   ├── supabase/migrations/ # 데이터베이스 마이그레이션
│   └── requirements.txt
│
├── docs/                     # 문서
├── .gitignore
└── README.md
```

## 🔐 보안 및 환경 설정

상세한 보안 설정은 [README_SECURITY.md](./README_SECURITY.md)를 참조하세요.

### 주요 보안 기능
- JWT 기반 인증 시스템
- Role-Based Access Control (RBAC)
- Row Level Security (RLS) 
- 관리자 활동 로깅
- CORS 보안 설정

## 🎨 주요 특징

### 📱 모바일 최적화
- 반응형 디자인
- 터치 친화적 인터페이스
- 모바일 카카오맵 최적화

### 🗺️ 지도 기능
- 카카오맵 API 통합
- 실시간 위치 표시
- 행정동 기반 지역 관리

### 📊 관리자 대시보드
- 실시간 통계 시각화
- CSV 데이터 내보내기
- 자동 새로고침 기능
- 상세 활동 추적


## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

