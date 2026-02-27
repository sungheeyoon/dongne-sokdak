import { AdminStats, UserManagement, AdminActivity, AdminInfo, AdminRole } from './entities';

export interface AdminRepository {
    getMyAdminInfo(): Promise<AdminInfo>;
    getDashboardStats(): Promise<AdminStats>;
    getUsers(params?: {
        skip?: number;
        limit?: number;
        role?: string;
        isActive?: boolean;
        search?: string;
    }): Promise<UserManagement[]>;
    updateUserRole(userId: string, role: string, reason?: string): Promise<void>;
    toggleUserActive(userId: string, activate: boolean): Promise<void>;
    bulkUserAction(userIds: string[], action: string, reason?: string): Promise<any>;
    getActivityLogs(params?: {
        skip?: number;
        limit?: number;
        action?: string;
        adminId?: string;
    }): Promise<AdminActivity[]>;
}
