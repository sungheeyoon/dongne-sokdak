import { AdminRepository } from './repositories';

export class AdminUseCases {
    constructor(private repository: AdminRepository) { }

    async getAdminInfo() {
        return this.repository.getMyAdminInfo();
    }

    async getDashboardStats() {
        return this.repository.getDashboardStats();
    }

    async getUsers(params?: Parameters<AdminRepository['getUsers']>[0]) {
        return this.repository.getUsers(params);
    }

    async updateUserRole(userId: string, role: string, reason?: string) {
        if (!userId || !role) throw new Error("Invalid arguments for updating user role.");
        return this.repository.updateUserRole(userId, role, reason);
    }

    async toggleUserActive(userId: string, activate: boolean) {
        if (!userId) throw new Error("User ID is required.");
        return this.repository.toggleUserActive(userId, activate);
    }

    async bulkUserAction(userIds: string[], action: string, reason?: string) {
        if (!userIds || userIds.length === 0) throw new Error("No users selected.");
        return this.repository.bulkUserAction(userIds, action, reason);
    }

    async getActivityLogs(params?: Parameters<AdminRepository['getActivityLogs']>[0]) {
        return this.repository.getActivityLogs(params);
    }

    // Report Management
    async getReports(filters?: Parameters<AdminRepository['getReports']>[0]) {
        return this.repository.getReports(filters);
    }

    async getReportDetail(reportId: string) {
        if (!reportId) throw new Error("Report ID is required.");
        return this.repository.getReportDetail(reportId);
    }

    async updateReportStatus(reportId: string, status: string, adminComment?: string, assignedAdminId?: string) {
        if (!reportId || !status) throw new Error("Report ID and status are required.");
        return this.repository.updateReportStatus(reportId, status, adminComment, assignedAdminId);
    }

    async performReportAction(reportId: string, action: string, options?: Parameters<AdminRepository['performReportAction']>[2]) {
        if (!reportId || !action) throw new Error("Report ID and action are required.");
        return this.repository.performReportAction(reportId, action, options);
    }

    async bulkReportAction(reportIds: string[], action: string, options?: Parameters<AdminRepository['bulkReportAction']>[2]) {
        if (!reportIds || reportIds.length === 0 || !action) throw new Error("Report IDs and action are required.");
        return this.repository.bulkReportAction(reportIds, action, options);
    }

    // Pure logic functions
    isAdmin(adminInfo: { role: string } | null): boolean {
        return adminInfo?.role === 'admin' || adminInfo?.role === 'moderator';
    }

    isSuperAdmin(adminInfo: { role: string } | null): boolean {
        return adminInfo?.role === 'admin';
    }
}
