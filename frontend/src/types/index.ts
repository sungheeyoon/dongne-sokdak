// 제보 카테고리
export enum ReportCategory {
  NOISE = 'NOISE',
  TRASH = 'TRASH',
  FACILITY = 'FACILITY',
  TRAFFIC = 'TRAFFIC',
  OTHER = 'OTHER'
}

// 제보 상태
export enum ReportStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED'
}

// 제보 타입
export interface Report {
  id: string;
  userId: string;
  title: string;
  description: string;
  imageUrl?: string;
  location: {
    lat: number;
    lng: number;
  };
  address?: string;
  category: ReportCategory;
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
  voteCount?: number;
  commentCount?: number;
  userVoted?: boolean;
}

// 댓글 타입
export interface Comment {
  id: string;
  reportId: string;
  userId: string;
  parentCommentId?: string;  // 대댓글용
  userNickname?: string;
  userAvatarUrl?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  replies?: Comment[];  // 답글 목록
}

// 내 동네 정보 타입
export interface NeighborhoodInfo {
  place_name: string;  // 동네 이름 (예: "부평역", "강남구청")
  address: string;     // 주소 (예: "인천광역시 부평구 부평동")
  lat: number;         // 위도
  lng: number;         // 경도
}

// 프로필 통계 타입
export interface ProfileStats {
  report_count: number;
  comment_count: number;
  vote_count: number;
  joined_at: string;
}

// 사용자 프로필 타입
export interface Profile {
  id: string;
  user_id: string;
  nickname: string;
  avatar_url?: string;
  location?: {
    lat: number;
    lng: number;
  };
  neighborhood?: NeighborhoodInfo;  // 내 동네 설정
  created_at: string;
  updated_at: string;
  stats?: ProfileStats;
}

// 프로필 업데이트 타입
export interface ProfileUpdate {
  nickname?: string;
  location?: {
    lat: number;
    lng: number;
  };
  neighborhood?: NeighborhoodInfo;  // 내 동네 설정/수정
}

// 내 동네 업데이트 타입
export interface NeighborhoodUpdate {
  neighborhood: NeighborhoodInfo;
}

// API 응답 타입
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

// 아바타 업데이트 응답 타입
export interface AvatarUpdateResponse {
  message: string;
  avatar_url: string;
}
