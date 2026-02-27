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
