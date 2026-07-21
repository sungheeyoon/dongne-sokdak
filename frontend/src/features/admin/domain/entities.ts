import type { Report } from '@/types';

export type AdminRole = 'user' | 'moderator' | 'admin';

export interface AdminStats {
    activeUsers: number;
    adminCount: number;
    moderatorCount: number;
    totalUsers: number;
    todayUsers: number;
    recentLogins: number;
    openReports: number;
    resolvedReports: number;
    todayReports: number;
    todayComments: number;
    todayVotes: number;
    todayAdminActions: number;
}

export interface UserManagement {
    id: string;
    email: string;
    nickname: string;
    role: AdminRole;
    isActive: boolean;
    lastLoginAt: string | null;
    loginCount: number;
    createdAt: string;
}

export interface AdminActivity {
    id: string;
    adminId: string;
    adminNickname: string;
    action: string;
    targetType: string | null;
    targetId: string | null;
    details: any;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: string;
}

export interface AdminInfo {
    id: string;
    email: string;
    nickname: string;
    role: AdminRole;
    isActive: boolean;
    lastLoginAt: string | null;
    loginCount: number;
    createdAt: string;
}

// 제보(Report) 도메인 개념의 canonical 타입은 @/types의 Report다.
// admin 목록 응답에는 location이 없어 이것만 Omit하고, admin 전용 필드를 확장한다.
export interface ReportManagement extends Omit<Report, 'location'> {
  userNickname: string;
  userEmail: string;
  adminComment: string | null;
  assignedAdminId: string | null;
  assignedAdminNickname: string | null;
}

export interface ReportDetail extends ReportManagement {
  location: Report['location'] | null;
  viewCount: number;
  recentComments: Array<{
    id: string;
    content: string;
    userNickname: string;
    createdAt: string;
  }>;
  statusHistory: Array<{
    status: string;
    changedAt: string;
    adminNickname: string;
  }>;
}

export interface ReportFilters {
  skip?: number;
  limit?: number;
  status?: string;
  category?: string;
  search?: string;
  assignedAdminId?: string;
}
