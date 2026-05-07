import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useReportManagementViewModel } from '@/features/admin/presentation/hooks/useReportManagementViewModel';
import { apiAdminRepository } from '@/features/admin/data/apiAdminRepository';

vi.mock('@/features/admin/data/apiAdminRepository', () => ({
  apiAdminRepository: {
    getReports: vi.fn(),
    getReportDetail: vi.fn(),
    updateReportStatus: vi.fn(),
    performReportAction: vi.fn(),
    bulkReportAction: vi.fn(),
  }
}));

describe('useReportManagementViewModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchReports fetches and sets reports', async () => {
    const mockReports = [{ id: '1', title: 'Test Report' }];
    vi.mocked(apiAdminRepository.getReports).mockResolvedValue(mockReports as any);

    const { result } = renderHook(() => useReportManagementViewModel());

    await act(async () => {
      await result.current.fetchReports();
    });

    expect(apiAdminRepository.getReports).toHaveBeenCalled();
    expect(result.current.reports).toEqual(mockReports);
    expect(result.current.error).toBeNull();
  });

  it('fetchReportDetail fetches and sets selected report', async () => {
    const mockReportDetail = { id: '1', title: 'Test Report Detail' };
    vi.mocked(apiAdminRepository.getReportDetail).mockResolvedValue(mockReportDetail as any);

    const { result } = renderHook(() => useReportManagementViewModel());

    await act(async () => {
      await result.current.fetchReportDetail('1');
    });

    expect(apiAdminRepository.getReportDetail).toHaveBeenCalledWith('1');
    expect(result.current.selectedReport).toEqual(mockReportDetail);
  });

  it('updateReportStatus updates status and re-fetches reports', async () => {
    vi.mocked(apiAdminRepository.updateReportStatus).mockResolvedValue(undefined);
    vi.mocked(apiAdminRepository.getReports).mockResolvedValue([]);

    const { result } = renderHook(() => useReportManagementViewModel());

    await act(async () => {
      await result.current.updateReportStatus('1', 'RESOLVED');
    });

    expect(apiAdminRepository.updateReportStatus).toHaveBeenCalledWith('1', 'RESOLVED', undefined, undefined);
    expect(apiAdminRepository.getReports).toHaveBeenCalled();
  });

  it('performReportAction and deleteReport work correctly', async () => {
    vi.mocked(apiAdminRepository.performReportAction).mockResolvedValue({});
    vi.mocked(apiAdminRepository.getReports).mockResolvedValue([]);

    const { result } = renderHook(() => useReportManagementViewModel());

    await act(async () => {
      await result.current.deleteReport('1', 'reason');
    });

    expect(apiAdminRepository.performReportAction).toHaveBeenCalledWith('1', 'delete', { reason: 'reason' });
    expect(apiAdminRepository.getReports).toHaveBeenCalled();
  });
});
