import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useAdminViewModel } from '@/features/admin/presentation/hooks/useAdminViewModel'
import { useAuthViewModel } from '@/features/auth/presentation/hooks/useAuthViewModel'
import { AdminUseCases } from '@/features/admin/domain/usecases'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// Mock dependencies
vi.mock('@/features/auth/presentation/hooks/useAuthViewModel')
vi.mock('@/features/admin/data/apiAdminRepository')

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
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
  })

  it('should fetch admin info on mount', async () => {
    const spy = vi.spyOn(AdminUseCases.prototype, 'getAdminInfo').mockResolvedValue(mockAdminInfo as any)
    
    const { result } = renderHook(() => useAdminViewModel(), { wrapper })

    await waitFor(() => expect(result.current.adminInfo).toEqual(mockAdminInfo))
    expect(spy).toHaveBeenCalled()
  })

  it('should identify admin and superadmin correctly', async () => {
    vi.spyOn(AdminUseCases.prototype, 'getAdminInfo').mockResolvedValue(mockAdminInfo as any)
    
    const { result } = renderHook(() => useAdminViewModel(), { wrapper })

    await waitFor(() => {
      expect(result.current.isAdmin()).toBe(true)
      expect(result.current.isSuperAdmin()).toBe(true)
    })
  })

  it('should fetch stats when fetchAdminStats is called', async () => {
    const mockStats = { total_users: 100, open_reports: 5 }
    const spy = vi.spyOn(AdminUseCases.prototype, 'getDashboardStats').mockResolvedValue(mockStats as any)
    
    const { result } = renderHook(() => useAdminViewModel(), { wrapper })

    result.current.fetchAdminStats()

    await waitFor(() => expect(result.current.adminStats).toEqual(mockStats))
    expect(spy).toHaveBeenCalled()
  })
})
