import { AdminStats, UserManagement, AdminActivity, AdminInfo, ReportManagement, ReportDetail, ReportFilters } from './entities';

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

    // Report Management
    getReports(filters?: ReportFilters): Promise<ReportManagement[]>;
    getReportDetail(reportId: string): Promise<ReportDetail>;
    updateReportStatus(reportId: string, status: string, adminComment?: string, assignedAdminId?: string): Promise<void>;
    performReportAction(reportId: string, action: string, options?: {
        adminComment?: string;
        reason?: string;
        newStatus?: string;
        assignedAdminId?: string;
    }): Promise<any>;
    bulkReportAction(reportIds: string[], action: string, options?: {
        adminComment?: string;
        reason?: string;
        newStatus?: string;
        assignedAdminId?: string;
    }): Promise<any>;
}
