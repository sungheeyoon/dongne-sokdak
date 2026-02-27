import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthViewModel } from '@/features/auth/presentation/hooks/useAuthViewModel';
import { AdminUseCases } from '../../domain/usecases';
import { apiAdminRepository } from '../../data/apiAdminRepository';
import { AdminStats, UserManagement, AdminActivity, AdminInfo } from '../../domain/entities';

export type { AdminStats, UserManagement, AdminActivity, AdminInfo };

const adminUseCases = new AdminUseCases(apiAdminRepository);

export function useAdminViewModel() {
    const { user } = useAuthViewModel();
    const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
    const [users, setUsers] = useState<UserManagement[]>([]);
    const [activities, setActivities] = useState<AdminActivity[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 캐싱된 Admin 정보 쿼리
    const {
        data: adminInfo,
        isLoading: isAdminLoading,
        error: adminError
    } = useQuery<AdminInfo | null>({
        queryKey: ['adminInfo', user?.id],
        queryFn: async (): Promise<AdminInfo | null> => {
            if (!user) return null;
            return await adminUseCases.getAdminInfo();
        },
        enabled: !!user,
        staleTime: 10 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        retry: 1
    });

    const fetchAdminStats = async () => {
        try {
            setLoading(true);
            setError(null);
            const stats = await adminUseCases.getDashboardStats();
            setAdminStats(stats);
        } catch (err) {
            setError(err instanceof Error ? err.message : '통계 조회 실패');
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async (params?: {
        skip?: number;
        limit?: number;
        role?: string;
        isActive?: boolean;
        search?: string;
    }) => {
        try {
            setLoading(true);
            setError(null);
            const _users = await adminUseCases.getUsers(params);
            setUsers(_users);
        } catch (err) {
            setError(err instanceof Error ? err.message : '사용자 목록 조회 실패');
        } finally {
            setLoading(false);
        }
    };

    const updateUserRole = async (userId: string, role: string, reason?: string) => {
        try {
            setLoading(true);
            setError(null);
            await adminUseCases.updateUserRole(userId, role, reason);
            await fetchUsers(); // 새로고침
        } catch (err) {
            setError(err instanceof Error ? err.message : '역할 변경 실패');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const toggleUserActive = async (userId: string, activate: boolean) => {
        try {
            setLoading(true);
            setError(null);
            await adminUseCases.toggleUserActive(userId, activate);
            await fetchUsers(); // 새로고침
        } catch (err) {
            setError(err instanceof Error ? err.message : '계정 상태 변경 실패');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const bulkUserAction = async (userIds: string[], action: string, reason?: string) => {
        try {
            setLoading(true);
            setError(null);
            const result = await adminUseCases.bulkUserAction(userIds, action, reason);
            await fetchUsers(); // 새로고침
            return result;
        } catch (err) {
            setError(err instanceof Error ? err.message : '일괄 작업 실패');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const fetchAdminActivities = async (params?: {
        skip?: number;
        limit?: number;
        action?: string;
        adminId?: string;
    }) => {
        try {
            setLoading(true);
            setError(null);
            const [_activities, usersList] = await Promise.all([
                adminUseCases.getActivityLogs(params),
                users.length === 0 ? adminUseCases.getUsers({ limit: 100 }) : Promise.resolve(users)
            ]);
            setActivities(_activities);
            if (users.length === 0) {
                setUsers(usersList);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : '활동 로그 조회 실패');
        } finally {
            setLoading(false);
        }
    };

    const isAdmin = (): boolean => adminUseCases.isAdmin(adminInfo || null);
    const isSuperAdmin = (): boolean => adminUseCases.isSuperAdmin(adminInfo || null);

    return {
        adminStats,
        users,
        activities,
        adminInfo,
        loading: loading || isAdminLoading,
        error: error || (adminError ? adminError.message : null),
        fetchAdminStats,
        fetchUsers,
        updateUserRole,
        toggleUserActive,
        bulkUserAction,
        fetchAdminActivities,
        isAdmin,
        isSuperAdmin,
    };
}
