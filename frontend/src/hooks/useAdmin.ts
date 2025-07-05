import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
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
  const { user, getToken } = useAuth();
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserManagement[]>([]);
  const [activities, setActivities] = useState<AdminActivity[]>([]);
  const [adminInfo, setAdminInfo] = useState<AdminInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
    try {
      console.log('🔄 Admin API Request:', endpoint);
      const response = await authenticatedRequest(createApiUrl(endpoint), options);
      console.log('✅ Admin API Success:', endpoint);
      return response;
    } catch (error) {
      console.error('❌ Admin API Error:', endpoint, error);
      throw error;
    }
  };

  // 관리자 정보 확인
  const checkAdminAccess = async (): Promise<boolean> => {
    try {
      const info = await apiRequest('/admin/my-info');
      setAdminInfo(info);
      return info.role === 'admin' || info.role === 'moderator';
    } catch (error) {
      console.error('관리자 접근 확인 실패:', error);
      return false;
    }
  };

  // 대시보드 통계 조회
  const fetchAdminStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const stats = await apiRequest('/admin/dashboard/stats');
      setAdminStats(stats);
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
      setUsers(users);
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
        body: JSON.stringify({ user_ids: userIds, action, reason }),
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
      
      setActivities(activities);
      if (users.length === 0) {
        setUsers(usersList);
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

  // 컴포넌트 마운트 시 관리자 정보 확인
  useEffect(() => {
    if (user) {
      checkAdminAccess();
    }
  }, [user]);

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
    checkAdminAccess,
    isAdmin,
    isSuperAdmin,
  };
}