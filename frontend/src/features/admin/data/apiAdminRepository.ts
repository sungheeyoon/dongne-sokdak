import { createApiUrl, authenticatedRequest } from '@/lib/api/config';
import { AdminRepository } from '../domain/repositories';
import { AdminStats, UserManagement, AdminActivity, AdminInfo, ReportManagement, ReportDetail, ReportFilters } from '../domain/entities';

const mapAdminStats = (data: any): AdminStats => ({
    activeUsers: data.active_users,
    adminCount: data.admin_count,
    moderatorCount: data.moderator_count,
    totalUsers: data.total_users,
    todayUsers: data.today_users,
    recentLogins: data.recent_logins,
    openReports: data.open_reports,
    resolvedReports: data.resolved_reports,
    todayReports: data.today_reports,
    todayComments: data.today_comments,
    todayVotes: data.today_votes,
    todayAdminActions: data.today_admin_actions,
});

const mapUserManagement = (data: any): UserManagement => ({
    id: data.id,
    email: data.email,
    nickname: data.nickname,
    role: data.role,
    isActive: data.is_active,
    lastLoginAt: data.last_login_at,
    loginCount: data.login_count,
    createdAt: data.created_at,
});

const mapAdminActivity = (data: any): AdminActivity => ({
    id: data.id,
    adminId: data.admin_id,
    adminNickname: data.admin_nickname,
    action: data.action,
    targetType: data.target_type,
    targetId: data.target_id,
    details: data.details,
    ipAddress: data.ip_address,
    userAgent: data.user_agent,
    createdAt: data.created_at,
});

const mapAdminInfo = (data: any): AdminInfo => ({
    id: data.id,
    email: data.email,
    nickname: data.nickname,
    role: data.role,
    isActive: data.is_active,
    lastLoginAt: data.last_login_at,
    loginCount: data.login_count,
    createdAt: data.created_at,
});

const mapReportManagement = (data: any): ReportManagement => ({
    id: data.id,
    title: data.title,
    description: data.description,
    status: data.status,
    category: data.category,
    userId: data.userId,
    userNickname: data.user_nickname,
    userEmail: data.user_email,
    address: data.address,
    imageUrl: data.image_url,
    votesCount: data.votes_count,
    commentsCount: data.comments_count,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    adminComment: data.admin_comment,
    assignedAdminId: data.assigned_admin_id,
    assignedAdminNickname: data.assigned_admin_nickname,
});

const mapReportDetail = (data: any): ReportDetail => ({
    ...mapReportManagement(data),
    location: data.location,
    viewCount: data.view_count,
    recentComments: (data.recent_comments || []).map((c: any) => ({
        id: c.id,
        content: c.content,
        userNickname: c.user_nickname,
        createdAt: c.created_at,
    })),
    statusHistory: (data.status_history || []).map((h: any) => ({
        status: h.status,
        changedAt: h.changed_at,
        adminNickname: h.admin_nickname,
    })),
});

export const apiAdminRepository: AdminRepository = {
    async getMyAdminInfo(): Promise<AdminInfo> {
        const res = await authenticatedRequest(createApiUrl('/admin/my-info'))
        return mapAdminInfo(res);
    },

    async getDashboardStats(): Promise<AdminStats> {
        const res = await authenticatedRequest(createApiUrl('/admin/dashboard/stats'))
        return mapAdminStats(res);
    },

    async getUsers(params): Promise<UserManagement[]> {
        const queryParams = new URLSearchParams()
        if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString())
        if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString())
        if (params?.role) queryParams.append('role', params.role)
        if (params?.isActive !== undefined) queryParams.append('is_active', params.isActive.toString())
        if (params?.search) queryParams.append('search', params.search)

        const url = createApiUrl(`/admin/users?${queryParams.toString()}`)
        const res = await authenticatedRequest(url) as any[]
        return res.map(mapUserManagement);
    },

    async updateUserRole(userId: string, role: string, reason?: string): Promise<void> {
        await authenticatedRequest(createApiUrl(`/admin/users/${userId}/role`), {
            method: 'PUT',
            body: JSON.stringify({ role, reason }),
        });
    },

    async toggleUserActive(userId: string, activate: boolean): Promise<void> {
        const endpoint = activate ? 'activate' : 'deactivate';
        await authenticatedRequest(createApiUrl(`/admin/users/${userId}/${endpoint}`), {
            method: 'PUT',
        });
    },

    async bulkUserAction(userIds: string[], action: string, reason?: string): Promise<any> {
        return authenticatedRequest(createApiUrl('/admin/users/bulk-action'), {
            method: 'POST',
            body: JSON.stringify({ userIds, action, reason }),
        });
    },

    async getActivityLogs(params): Promise<AdminActivity[]> {
        const queryParams = new URLSearchParams();
        if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
        if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
        if (params?.action) queryParams.append('action', params.action);
        if (params?.adminId) queryParams.append('admin_id', params.adminId);

        const url = createApiUrl(`/admin/activity-logs?${queryParams.toString()}`)
        const res = await authenticatedRequest(url) as any[]
        return res.map(mapAdminActivity);
    },

    async getReports(filters: ReportFilters): Promise<ReportManagement[]> {
        const queryParams = new URLSearchParams();
        if (filters?.skip !== undefined) queryParams.append('skip', filters.skip.toString());
        if (filters?.limit !== undefined) queryParams.append('limit', filters.limit.toString());
        if (filters?.status) queryParams.append('status', filters.status);
        if (filters?.category) queryParams.append('category', filters.category);
        if (filters?.search) queryParams.append('search', filters.search);
        if (filters?.assignedAdminId) queryParams.append('assigned_admin_id', filters.assignedAdminId);

        const url = createApiUrl(`/admin/reports?${queryParams.toString()}`)
        const res = await authenticatedRequest(url) as any[]
        return res.map(mapReportManagement);
    },

    async getReportDetail(reportId: string): Promise<ReportDetail> {
        const res = await authenticatedRequest(createApiUrl(`/admin/reports/${reportId}`))
        return mapReportDetail(res);
    },

    async updateReportStatus(reportId: string, status: string, adminComment?: string, assignedAdminId?: string): Promise<void> {
        await authenticatedRequest(createApiUrl(`/admin/reports/${reportId}/status`), {
            method: 'PUT',
            body: JSON.stringify({
                status,
                admin_comment: adminComment,
                assigned_admin_id: assignedAdminId
            }),
        });
    },

    async performReportAction(reportId: string, action: string, options?: any): Promise<any> {
        return authenticatedRequest(createApiUrl(`/admin/reports/${reportId}/action`), {
            method: 'POST',
            body: JSON.stringify({
                action,
                admin_comment: options?.adminComment,
                reason: options?.reason,
                new_status: options?.newStatus,
                assigned_admin_id: options?.assignedAdminId
            }),
        });
    },

    async bulkReportAction(reportIds: string[], action: string, options?: any): Promise<any> {
        return authenticatedRequest(createApiUrl('/admin/reports/bulk-action'), {
            method: 'POST',
            body: JSON.stringify({
                report_ids: reportIds,
                action,
                admin_comment: options?.adminComment,
                reason: options?.reason,
                new_status: options?.newStatus,
                assigned_admin_id: options?.assignedAdminId
            }),
        });
    }
};
