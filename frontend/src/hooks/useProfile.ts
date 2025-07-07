import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMyProfile, updateMyProfile, getUserProfile, updateAvatar, updateMyNeighborhood, deleteMyNeighborhood } from '@/lib/api/profiles'
import { Profile } from '@/types'
import { useAuth } from './useAuth'

// 내 프로필 조회 훅
export const useMyProfile = () => {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ['profile', 'me'],
    queryFn: getMyProfile,
    enabled: !!user, // 로그인된 사용자만 프로필 조회
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분
    retry: false, // 인증 오류 시 재시도하지 않음
  })
}

// 다른 사용자 프로필 조회 훅
export const useUserProfile = (userId: string) => {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: () => getUserProfile(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분
  })
}

// 프로필 업데이트 훅
export const useUpdateProfile = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateMyProfile,
    onSuccess: (data: Profile) => {
      // 캐시 업데이트
      queryClient.setQueryData(['profile', 'me'], data)
      alert('프로필이 성공적으로 업데이트되었습니다')
    },
    onError: (error: Error) => {
      alert(error.message || '프로필 업데이트에 실패했습니다')
    },
  })
}

// 아바타 업데이트 훅
export const useUpdateAvatar = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateAvatar,
    onSuccess: (data) => {
      // 프로필 캐시를 새로고침
      queryClient.invalidateQueries({ queryKey: ['profile', 'me'] })
      alert(data.message)
    },
    onError: (error: Error) => {
      alert(error.message || '아바타 업데이트에 실패했습니다')
    },
  })
}

// 내 동네 설정 훅
export const useUpdateNeighborhood = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateMyNeighborhood,
    onSuccess: (data) => {
      // 프로필 캐시를 새로고침
      queryClient.invalidateQueries({ queryKey: ['profile', 'me'] })
      alert(`내 동네가 '${data.neighborhood.place_name}'로 설정되었습니다!`)
    },
    onError: (error: Error) => {
      alert(error.message || '내 동네 설정에 실패했습니다')
    },
  })
}

// 내 동네 설정 삭제 훅
export const useDeleteNeighborhood = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteMyNeighborhood,
    onSuccess: (data) => {
      // 프로필 캐시를 새로고침
      queryClient.invalidateQueries({ queryKey: ['profile', 'me'] })
      alert(data.message)
    },
    onError: (error: Error) => {
      alert(error.message || '내 동네 삭제에 실패했습니다')
    },
  })
}
