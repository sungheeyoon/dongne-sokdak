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

export interface ReportManagement {
  id: string;
  title: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  category: 'NOISE' | 'TRASH' | 'FACILITY' | 'TRAFFIC' | 'OTHER';
  userId: string;
  userNickname: string;
  userEmail: string;
  address: string | null;
  imageUrl: string | null;
  votesCount: number;
  commentsCount: number;
  createdAt: string;
  updatedAt: string;
  adminComment: string | null;
  assignedAdminId: string | null;
  assignedAdminNickname: string | null;
}

export interface ReportDetail extends ReportManagement {
  location: { lat: number; lng: number } | null;
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
