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

  it('fetchReportDetail handles error', async () => {
    const errorMessage = 'fetch error';
    vi.mocked(apiAdminRepository.getReportDetail).mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useReportManagementViewModel());

    let caughtError: any;
    await act(async () => {
      try {
        await result.current.fetchReportDetail('1');
      } catch (e) {
        caughtError = e;
      }
    });

    expect(caughtError).toBeInstanceOf(Error);
    expect(caughtError.message).toBe(errorMessage);
    expect(result.current.error).toBe(errorMessage);
  });

  it('fetchReports handles error', async () => {
    const errorMessage = 'fetch error';
    vi.mocked(apiAdminRepository.getReports).mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useReportManagementViewModel());

    await act(async () => {
      await result.current.fetchReports();
    });

    expect(result.current.error).toBe(errorMessage);
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

  it('updateReportStatus handles error', async () => {
    const errorMessage = 'update error';
    vi.mocked(apiAdminRepository.updateReportStatus).mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useReportManagementViewModel());

    let caughtError: any;
    await act(async () => {
      try {
        await result.current.updateReportStatus('1', 'RESOLVED');
      } catch (e) {
        caughtError = e;
      }
    });

    expect(caughtError).toBeInstanceOf(Error);
    expect(caughtError.message).toBe(errorMessage);
    expect(result.current.error).toBe(errorMessage);
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

  it('performReportAction handles error', async () => {
    const errorMessage = 'action error';
    vi.mocked(apiAdminRepository.performReportAction).mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useReportManagementViewModel());

    let caughtError: any;
    await act(async () => {
      try {
        await result.current.deleteReport('1', 'reason');
      } catch (e) {
        caughtError = e;
      }
    });

    expect(caughtError).toBeInstanceOf(Error);
    expect(caughtError.message).toBe(errorMessage);
    expect(result.current.error).toBe(errorMessage);
  });

  it('bulkReportAction works correctly', async () => {
    vi.mocked(apiAdminRepository.bulkReportAction).mockResolvedValue({});
    vi.mocked(apiAdminRepository.getReports).mockResolvedValue([]);

    const { result } = renderHook(() => useReportManagementViewModel());

    await act(async () => {
      await result.current.bulkReportAction(['1', '2'], 'delete');
    });

    expect(apiAdminRepository.bulkReportAction).toHaveBeenCalledWith(['1', '2'], 'delete', undefined);
    expect(apiAdminRepository.getReports).toHaveBeenCalled();
  });

  it('bulkReportAction handles error', async () => {
    const errorMessage = 'bulk error';
    vi.mocked(apiAdminRepository.bulkReportAction).mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useReportManagementViewModel());

    let caughtError: any;
    await act(async () => {
      try {
        await result.current.bulkReportAction(['1', '2'], 'delete');
      } catch (e) {
        caughtError = e;
      }
    });

    expect(caughtError).toBeInstanceOf(Error);
    expect(caughtError.message).toBe(errorMessage);
    expect(result.current.error).toBe(errorMessage);
  });

  it('assignReport works correctly', async () => {
    vi.mocked(apiAdminRepository.performReportAction).mockResolvedValue({});
    vi.mocked(apiAdminRepository.getReports).mockResolvedValue([]);

    const { result } = renderHook(() => useReportManagementViewModel());

    await act(async () => {
      await result.current.assignReport('1', 'admin-1', 'comment');
    });

    expect(apiAdminRepository.performReportAction).toHaveBeenCalledWith('1', 'assign', {
      assignedAdminId: 'admin-1',
      adminComment: 'comment'
    });
    expect(apiAdminRepository.getReports).toHaveBeenCalled();
  });
});
