import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthViewModel } from '@/features/auth/presentation/hooks/useAuthViewModel';
import { createApiUrl, authenticatedRequest } from '../lib/api/config';

export interface AdminStats {
  active_users: number;
  admin_count: number;
  moderator_count: number;
  total_users: number;
  today_users: number;
  recent_logins: number;
  open_reports: number;
  resolved_reports: number;
  today_reports: number;
  today_comments: number;
  today_votes: number;
  today_admin_actions: number;
}

export interface UserManagement {
  id: string;
  email: string;
  nickname: string;
  role: 'user' | 'moderator' | 'admin';
  is_active: boolean;
  last_login_at: string | null;
  login_count: number;
  created_at: string;
}

export interface AdminActivity {
  id: string;
  admin_id: string;
  admin_nickname: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AdminInfo {
  id: string;
  email: string;
  nickname: string;
  role: 'user' | 'moderator' | 'admin';
  is_active: boolean;
  last_login_at: string | null;
  login_count: number;
  created_at: string;
}

export function useAdmin() {
  const { user } = useAuthViewModel();
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserManagement[]>([]);
  const [activities, setActivities] = useState<AdminActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // React Query로 관리자 정보 캐싱 (전역 캐시)
  const { 
    data: adminInfo, 
    isLoading: isAdminLoading,
    error: adminError 
  } = useQuery<AdminInfo | null>({
    queryKey: ['adminInfo', user?.id],
    queryFn: async (): Promise<AdminInfo | null> => {
      if (!user) return null;
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 Admin Info Query 실행');
      }
      
      const response = await authenticatedRequest(createApiUrl('/admin/my-info')) as AdminInfo;
      
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Admin Info Query 성공:', response.role);
      }
      
      return response;
    },
    enabled: !!user, // 사용자가 있을 때만 실행
    staleTime: 10 * 60 * 1000, // 10분간 신선함 유지
    gcTime: 30 * 60 * 1000, // 30분간 캐시 보관
    refetchOnWindowFocus: false,
    refetchOnMount: false, // 마운트 시 캐시 우선 사용
    retry: 1
  });

  const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 Admin API Request:', endpoint);
      }
      const response = await authenticatedRequest(createApiUrl(endpoint), options);
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Admin API Success:', endpoint);
      }
      return response;
    } catch (error) {
      console.error('❌ Admin API Error:', endpoint, error);
      throw error;
    }
  };

  // 관리자 정보 확인 (React Query로 대체됨)

  // 대시보드 통계 조회
  const fetchAdminStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const stats = await apiRequest('/admin/dashboard/stats');
      setAdminStats(stats as AdminStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : '통계 조회 실패');
    } finally {
      setLoading(false);
    }
  };

  // 사용자 목록 조회
  const fetchUsers = async (params?: {
    skip?: number;
    limit?: number;
    role?: string;
    is_active?: boolean;
    search?: string;
  }) => {
    try {
      setLoading(true);
      setError(null);
      const queryParams = new URLSearchParams();
      
      if (params?.skip) queryParams.append('skip', params.skip.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.role) queryParams.append('role', params.role);
      if (params?.is_active !== undefined) queryParams.append('is_active', params.is_active.toString());
      if (params?.search) queryParams.append('search', params.search);

      const users = await apiRequest(`/admin/users?${queryParams.toString()}`);
      setUsers(users as UserManagement[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : '사용자 목록 조회 실패');
    } finally {
      setLoading(false);
    }
  };

  // 사용자 역할 변경
  const updateUserRole = async (userId: string, role: string, reason?: string) => {
    try {
      setLoading(true);
      setError(null);
      await apiRequest(`/admin/users/${userId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role, reason }),
      });
      // 사용자 목록 새로고침
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : '역할 변경 실패');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 사용자 활성화/비활성화
  const toggleUserActive = async (userId: string, activate: boolean) => {
    try {
      setLoading(true);
      setError(null);
      const endpoint = activate ? 'activate' : 'deactivate';
      await apiRequest(`/admin/users/${userId}/${endpoint}`, {
        method: 'PUT',
      });
      // 사용자 목록 새로고침
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : '계정 상태 변경 실패');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 사용자 일괄 작업
  const bulkUserAction = async (userIds: string[], action: string, reason?: string) => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiRequest('/admin/users/bulk-action', {
        method: 'POST',
        body: JSON.stringify({ userIds: userIds, action, reason }),
      });
      // 사용자 목록 새로고침
      await fetchUsers();
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : '일괄 작업 실패');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 관리자 활동 로그 조회
  const fetchAdminActivities = async (params?: {
    skip?: number;
    limit?: number;
    action?: string;
    admin_id?: string;
  }) => {
    try {
      setLoading(true);
      setError(null);
      const queryParams = new URLSearchParams();
      
      if (params?.skip) queryParams.append('skip', params.skip.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.action) queryParams.append('action', params.action);
      if (params?.admin_id) queryParams.append('admin_id', params.admin_id);

      // 활동 로그와 사용자 목록을 함께 조회
      const [activities, usersList] = await Promise.all([
        apiRequest(`/admin/activity-logs?${queryParams.toString()}`),
        users.length === 0 ? apiRequest('/admin/users?limit=100') : Promise.resolve(users)
      ]);
      
      setActivities(activities as AdminActivity[]);
      if (users.length === 0) {
        setUsers(usersList as UserManagement[]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '활동 로그 조회 실패');
    } finally {
      setLoading(false);
    }
  };

  // 관리자 권한 확인
  const isAdmin = (): boolean => {
    return adminInfo?.role === 'admin' || adminInfo?.role === 'moderator';
  };

  const isSuperAdmin = (): boolean => {
    return adminInfo?.role === 'admin';
  };

  // React Query로 자동 관리되므로 useEffect 제거

  return {
    adminStats,
    users,
    activities,
    adminInfo,
    loading,
    error,
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