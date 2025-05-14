# 동네속닥 (Dongne Sokdak)

> 우리 동네의 불편사항과 이슈를 쉽게 제보하고 공유하는 커뮤니티 플랫폼

## 📌 프로젝트 소개

**동네속닥**은 지역 주민들이 일상에서 마주치는 불편사항이나 문제점을 간편하게 제보하고 공유할 수 있는 웹 서비스입니다. 기존의 공식 민원 채널은 절차가 복잡하고 무거운 반면, 동네속닥은 가볍고 직관적인 사용자 경험을 제공합니다.

### 주요 기능
- 📍 **위치 기반 제보**: 지도에서 위치를 선택하고 문제점 제보
- 📸 **이미지 업로드**: 현장 사진과 함께 상황 공유
- 👍 **공감과 댓글**: 다른 주민들의 의견 및 공감 표시
- 🏷️ **카테고리별 분류**: 소음, 쓰레기, 시설물 고장 등 카테고리별 관리
- 🔔 **상태 업데이트**: 해결 진행 상황 공유 및 업데이트

## 🛠️ 기술 스택

### 프론트엔드
- **Framework**: Next.js + TypeScript
- **Styling**: TailwindCSS
- **State Management**: Zustand (UI 상태), TanStack Query (서버 상태)
- **Maps**: react-leaflet / Mapbox

### 백엔드
- **API**: FastAPI
- **Authentication**: Supabase Auth
- **Database**: PostgreSQL (Supabase)
- **Storage**: Supabase Storage (이미지 저장)

### 배포
- **Frontend**: Vercel
- **Backend**: Render / Railway

## 💾 데이터 모델

```typescript
// 주요 데이터 모델 구조

interface User {
  id: string;
  nickname: string;
  email: string;
  location?: {
    lat: number;
    lng: number;
  };
}

interface Report {
  id: string;
  userId: string;
  title: string;
  description: string;
  imageUrl?: string;
  location: {
    lat: number;
    lng: number;
  };
  category: 'NOISE' | 'TRASH' | 'FACILITY' | 'TRAFFIC' | 'OTHER';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  createdAt: Date;
  updatedAt: Date;
}

interface Comment {
  id: string;
  reportId: string;
  userId: string;
  content: string;
  createdAt: Date;
}

interface Vote {
  id: string;
  userId: string;
  reportId: string;
  createdAt: Date;
}
