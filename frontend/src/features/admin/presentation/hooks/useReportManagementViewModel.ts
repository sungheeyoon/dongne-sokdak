import { useState } from 'react';
import { AdminUseCases } from '../../domain/usecases';
import { apiAdminRepository } from '../../data/apiAdminRepository';
import { ReportManagement, ReportDetail, ReportFilters } from '../../domain/entities';

const adminUseCases = new AdminUseCases(apiAdminRepository);

export function useReportManagementViewModel() {
  const [reports, setReports] = useState<ReportManagement[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 제보 목록 조회
  const fetchReports = async (filters?: ReportFilters) => {
    try {
      setLoading(true);
      setError(null);
      const _reports = await adminUseCases.getReports(filters);
      setReports(_reports);
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
      const report = await adminUseCases.getReportDetail(reportId);
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
      await adminUseCases.updateReportStatus(reportId, status, adminComment, assignedAdminId);
      await fetchReports(); // 목록 새로고침
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
      const result = await adminUseCases.performReportAction(reportId, action, options);
      await fetchReports(); // 목록 새로고침
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
      const result = await adminUseCases.bulkReportAction(reportIds, action, options);
      await fetchReports(); // 목록 새로고침
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : '일괄 작업 실패');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 제보 삭제 (Helper)
  const deleteReport = async (reportId: string, reason?: string) => {
    return performReportAction(reportId, 'delete', { reason });
  };

  // 담당자 배정 (Helper)
  const assignReport = async (reportId: string, adminId: string, comment?: string) => {
    return performReportAction(reportId, 'assign', {
      assignedAdminId: adminId,
      adminComment: comment
    });
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
