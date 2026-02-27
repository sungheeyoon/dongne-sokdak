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

    // Pure logic functions
    isAdmin(adminInfo: { role: string } | null): boolean {
        return adminInfo?.role === 'admin' || adminInfo?.role === 'moderator';
    }

    isSuperAdmin(adminInfo: { role: string } | null): boolean {
        return adminInfo?.role === 'admin';
    }
}
