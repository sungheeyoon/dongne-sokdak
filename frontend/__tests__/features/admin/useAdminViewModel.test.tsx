import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useAdminViewModel } from '@/features/admin/presentation/hooks/useAdminViewModel'
import { useAuthViewModel } from '@/features/auth/presentation/hooks/useAuthViewModel'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { apiAdminRepository } from '@/features/admin/data/apiAdminRepository'
import React from 'react'

vi.mock('@/features/auth/presentation/hooks/useAuthViewModel')
vi.mock('@/features/admin/data/apiAdminRepository', () => ({
  apiAdminRepository: {
    getMyAdminInfo: vi.fn(),
    getDashboardStats: vi.fn(),
    getUsers: vi.fn(),
    updateUserRole: vi.fn(),
    toggleUserActive: vi.fn(),
    bulkUserAction: vi.fn(),
    getActivityLogs: vi.fn(),
  }
}))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
})

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

describe('useAdminViewModel', () => {
  const mockUser = { id: 'admin-1', email: 'admin@test.com' }
  const mockAdminInfo = { id: 'admin-1', role: 'admin', nickname: 'Admin' }

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient.clear()
    ;(useAuthViewModel as any).mockReturnValue({ user: mockUser })
    vi.mocked(apiAdminRepository.getMyAdminInfo).mockResolvedValue(mockAdminInfo as any)
  })

  it('should fetch admin info on mount', async () => {
    const { result } = renderHook(() => useAdminViewModel(), { wrapper })
    await waitFor(() => expect(result.current.adminInfo).toEqual(mockAdminInfo))
  })

  it('should identify admin correctly', async () => {
    const { result } = renderHook(() => useAdminViewModel(), { wrapper })
    await waitFor(() => {
      expect(result.current.isAdmin()).toBe(true)
    })
  })

  it('should fetch stats', async () => {
    const mockStats = { total_users: 100 }
    vi.mocked(apiAdminRepository.getDashboardStats).mockResolvedValue(mockStats as any)
    const { result } = renderHook(() => useAdminViewModel(), { wrapper })
    
    await act(async () => {
      await result.current.fetchAdminStats()
    })
    
    expect(result.current.adminStats).toEqual(mockStats)
  })

  it('should handle fetch stats error', async () => {
    vi.mocked(apiAdminRepository.getDashboardStats).mockRejectedValue(new Error('Failed stat'))
    const { result } = renderHook(() => useAdminViewModel(), { wrapper })
    
    await act(async () => {
      await result.current.fetchAdminStats()
    })
    
    expect(result.current.error).toBe('Failed stat')
  })

  it('should fetch users', async () => {
    const mockUsers = [{ id: '1', email: 'u1@t.com' }]
    vi.mocked(apiAdminRepository.getUsers).mockResolvedValue(mockUsers as any)
    const { result } = renderHook(() => useAdminViewModel(), { wrapper })
    
    await act(async () => {
      await result.current.fetchUsers()
    })
    
    expect(result.current.users).toEqual(mockUsers)
  })

  it('should update user role and fetch users', async () => {
    vi.mocked(apiAdminRepository.updateUserRole).mockResolvedValue(undefined)
    vi.mocked(apiAdminRepository.getUsers).mockResolvedValue([])
    
    const { result } = renderHook(() => useAdminViewModel(), { wrapper })
    
    await act(async () => {
      await result.current.updateUserRole('1', 'admin')
    })
    
    expect(apiAdminRepository.updateUserRole).toHaveBeenCalledWith('1', 'admin', undefined)
    expect(apiAdminRepository.getUsers).toHaveBeenCalled()
  })

  it('should toggle user active and fetch users', async () => {
    vi.mocked(apiAdminRepository.toggleUserActive).mockResolvedValue(undefined)
    vi.mocked(apiAdminRepository.getUsers).mockResolvedValue([])
    
    const { result } = renderHook(() => useAdminViewModel(), { wrapper })
    
    await act(async () => {
      await result.current.toggleUserActive('1', true)
    })
    
    expect(apiAdminRepository.toggleUserActive).toHaveBeenCalledWith('1', true)
    expect(apiAdminRepository.getUsers).toHaveBeenCalled()
  })

  it('should handle bulk user action', async () => {
    vi.mocked(apiAdminRepository.bulkUserAction).mockResolvedValue({ success: true })
    vi.mocked(apiAdminRepository.getUsers).mockResolvedValue([])
    
    const { result } = renderHook(() => useAdminViewModel(), { wrapper })
    
    await act(async () => {
      await result.current.bulkUserAction(['1'], 'delete')
    })
    
    expect(apiAdminRepository.bulkUserAction).toHaveBeenCalledWith(['1'], 'delete', undefined)
    expect(apiAdminRepository.getUsers).toHaveBeenCalled()
  })

  it('should fetch activities and also users if user array is empty', async () => {
    const mockActivities = [{ id: 'act-1' }]
    vi.mocked(apiAdminRepository.getActivityLogs).mockResolvedValue(mockActivities as any)
    vi.mocked(apiAdminRepository.getUsers).mockResolvedValue([{ id: '2' }] as any)
    
    const { result } = renderHook(() => useAdminViewModel(), { wrapper })
    
    await act(async () => {
      await result.current.fetchAdminActivities()
    })
    
    expect(result.current.activities).toEqual(mockActivities)
    expect(result.current.users).toEqual([{ id: '2' }])
  })
})