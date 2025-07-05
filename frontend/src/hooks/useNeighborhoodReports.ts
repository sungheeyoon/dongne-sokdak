import { useQuery } from '@tanstack/react-query'
import { getNearbyReports, getMyNeighborhoodReports } from '@/lib/api/reports'
import { ReportCategory } from '@/types'
import { useAuth } from './useAuth'

// 근처 제보 조회 훅
export const useNearbyReports = (params: {
  lat: number
  lng: number
  radius_km?: number
  category?: ReportCategory
  limit?: number
}) => {
  return useQuery({
    queryKey: ['reports', 'nearby', params],
    queryFn: () => getNearbyReports(params),
    enabled: !!(params.lat && params.lng), // 위치가 있을 때만 실행
    staleTime: 2 * 60 * 1000, // 2분 (더 자주 업데이트)
    gcTime: 5 * 60 * 1000, // 5분
    retry: 1,
  })
}

// 내 동네 제보 조회 훅
export const useMyNeighborhoodReports = (params?: {
  radius_km?: number
  category?: ReportCategory
  limit?: number
}) => {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ['reports', 'my-neighborhood', params],
    queryFn: () => getMyNeighborhoodReports(params),
    enabled: !!user, // 로그인된 사용자만 실행
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분
    retry: (failureCount, error: any) => {
      // 내 동네가 설정되지 않은 경우 재시도하지 않음
      if (error?.message?.includes('내 동네가 설정되지 않았습니다')) {
        return false
      }
      return failureCount < 3
    }
  })
}
