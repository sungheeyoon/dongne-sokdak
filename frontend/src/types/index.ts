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

export * from '@/features/profile/domain/entities';

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
