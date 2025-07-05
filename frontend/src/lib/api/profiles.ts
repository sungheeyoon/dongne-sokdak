import { createApiUrl, authenticatedRequest } from './config'
import { Profile, ProfileUpdate, AvatarUpdateResponse, NeighborhoodInfo, NeighborhoodUpdate } from '@/types'

// 내 프로필 조회
export const getMyProfile = async (): Promise<Profile> => {
  const url = createApiUrl('/profiles/me')
  return authenticatedRequest(url)
}

// 내 프로필 수정
export const updateMyProfile = async (data: ProfileUpdate): Promise<Profile> => {
  const url = createApiUrl('/profiles/me')
  return authenticatedRequest(url, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

// 다른 사용자 프로필 조회
export const getUserProfile = async (userId: string): Promise<Profile> => {
  const url = createApiUrl(`/profiles/${userId}`)
  return authenticatedRequest(url)
}

// 아바타 업데이트
export const updateAvatar = async (avatarUrl: string): Promise<AvatarUpdateResponse> => {
  const url = createApiUrl('/profiles/avatar')
  return authenticatedRequest(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ avatar_url: avatarUrl }),
  })
}

// 내 동네 설정
export const updateMyNeighborhood = async (neighborhood: NeighborhoodInfo): Promise<{ message: string; neighborhood: NeighborhoodInfo }> => {
  const url = createApiUrl('/profiles/neighborhood')
  return authenticatedRequest(url, {
    method: 'PUT',
    body: JSON.stringify({ neighborhood }),
  })
}

// 내 동네 설정 삭제
export const deleteMyNeighborhood = async (): Promise<{ message: string }> => {
  const url = createApiUrl('/profiles/neighborhood')
  return authenticatedRequest(url, {
    method: 'DELETE',
  })
}
