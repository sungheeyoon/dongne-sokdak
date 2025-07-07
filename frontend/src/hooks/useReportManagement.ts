import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { createApiUrl } from '../lib/api/config';

export interface ReportManagement {
  id: string;
  title: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  category: 'NOISE' | 'TRASH' | 'FACILITY' | 'TRAFFIC' | 'OTHER';
  user_id: string;
  user_nickname: string;
  user_email: string;
  address: string | null;
  image_url: string | null;
  votes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
  admin_comment: string | null;
  assigned_admin_id: string | null;
  assigned_admin_nickname: string | null;
}

export interface ReportDetail extends ReportManagement {
  location: { lat: number; lng: number } | null;
  view_count: number;
  recent_comments: Array<{
    id: string;
    content: string;
    user_nickname: string;
    created_at: string;
  }>;
  status_history: Array<{
    status: string;
    changed_at: string;
    admin_nickname: string;
  }>;
}

export interface ReportFilters {
  skip?: number;
  limit?: number;
  status?: string;
  category?: string;
  search?: string;
  assigned_admin_id?: string;
}

export function useReportManagement() {
  const { getToken } = useAuth();
  const [reports, setReports] = useState<ReportManagement[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
    const token = await getToken();
    if (!token) {
      throw new Error('인증이 필요합니다');
    }

    const response = await fetch(createApiUrl(endpoint), {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('API Error Details:', {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        errorData
      });
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  };

  // 제보 목록 조회
  const fetchReports = async (filters?: ReportFilters) => {
    try {
      setLoading(true);
      setError(null);
      
      const queryParams = new URLSearchParams();
      if (filters?.skip) queryParams.append('skip', filters.skip.toString());
      if (filters?.limit) queryParams.append('limit', filters.limit.toString());
      if (filters?.status) queryParams.append('status', filters.status);
      if (filters?.category) queryParams.append('category', filters.category);
      if (filters?.search) queryParams.append('search', filters.search);
      if (filters?.assigned_admin_id) queryParams.append('assigned_admin_id', filters.assigned_admin_id);

      const reports = await apiRequest(`/admin/reports?${queryParams.toString()}`);
      setReports(reports);
    } catch (err) {
      setError(err instanceof Error ? err.message : '제보 목록 조회 실패');
    } finally {
      setLoading(false);
    }
  };

  // 제보 상세 조회
  const fetchReportDetail = async (reportId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const report = await apiRequest(`/admin/reports/${reportId}`);
      setSelectedReport(report);
      return report;
    } catch (err) {
      setError(err instanceof Error ? err.message : '제보 상세 조회 실패');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 제보 상태 변경
  const updateReportStatus = async (
    reportId: string, 
    status: string, 
    adminComment?: string, 
    assignedAdminId?: string
  ) => {
    try {
      setLoading(true);
      setError(null);
      
      await apiRequest(`/admin/reports/${reportId}/status`, {
        method: 'PUT',
        body: JSON.stringify({
          status,
          admin_comment: adminComment,
          assigned_admin_id: assignedAdminId
        }),
      });
      
      // 목록 새로고침
      await fetchReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : '제보 상태 변경 실패');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 제보 액션 수행
  const performReportAction = async (
    reportId: string,
    action: string,
    options?: {
      adminComment?: string;
      reason?: string;
      newStatus?: string;
      assignedAdminId?: string;
    }
  ) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await apiRequest(`/admin/reports/${reportId}/action`, {
        method: 'POST',
        body: JSON.stringify({
          action,
          admin_comment: options?.adminComment,
          reason: options?.reason,
          new_status: options?.newStatus,
          assigned_admin_id: options?.assignedAdminId
        }),
      });
      
      // 목록 새로고침
      await fetchReports();
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : '제보 액션 수행 실패');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 제보 일괄 작업
  const bulkReportAction = async (
    reportIds: string[],
    action: string,
    options?: {
      adminComment?: string;
      reason?: string;
      newStatus?: string;
      assignedAdminId?: string;
    }
  ) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await apiRequest('/admin/reports/bulk-action', {
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
      
      // 목록 새로고침
      await fetchReports();
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : '일괄 작업 실패');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 제보 삭제
  const deleteReport = async (reportId: string, reason?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      await performReportAction(reportId, 'delete', { reason });
    } catch (err) {
      setError(err instanceof Error ? err.message : '제보 삭제 실패');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 담당자 배정
  const assignReport = async (reportId: string, adminId: string, comment?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      await performReportAction(reportId, 'assign', {
        assignedAdminId: adminId,
        adminComment: comment
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '담당자 배정 실패');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    reports,
    selectedReport,
    loading,
    error,
    fetchReports,
    fetchReportDetail,
    updateReportStatus,
    performReportAction,
    bulkReportAction,
    deleteReport,
    assignReport,
    setSelectedReport,
    setError
  };
}