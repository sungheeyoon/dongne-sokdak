import { createApiUrl, authenticatedRequest } from '@/lib/api/config'
import { ProfileRepository } from '../domain/repositories'
import { Profile, ProfileUpdate, NeighborhoodInfo, ProfileStats } from '../domain/entities'
import { supabase } from '@/lib/supabase'

const mapNeighborhood = (data: any): NeighborhoodInfo => ({
    placeName: data.place_name,
    address: data.address,
    lat: data.lat,
    lng: data.lng
})

const mapProfileStats = (data: any): ProfileStats => ({
    reportCount: data.report_count,
    commentCount: data.comment_count,
    voteCount: data.vote_count,
    joinedAt: data.joined_at
})

const mapProfile = (data: any): Profile => ({
    id: data.id,
    userId: data.user_id,
    nickname: data.nickname,
    avatarUrl: data.avatar_url,
    location: data.location,
    neighborhood: data.neighborhood ? mapNeighborhood(data.neighborhood) : undefined,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    stats: data.stats ? mapProfileStats(data.stats) : undefined
})

export const apiProfileRepository: ProfileRepository = {
    async getMyProfile(): Promise<Profile> {
        const url = createApiUrl('/profiles/me')
        const res = await authenticatedRequest(url)
        return mapProfile(res)
    },

    async updateMyProfile(data: ProfileUpdate): Promise<Profile> {
        const url = createApiUrl('/profiles/me')
        const payload: any = { nickname: data.nickname, location: data.location }
        if (data.neighborhood) {
            payload.neighborhood = {
                place_name: data.neighborhood.placeName,
                address: data.neighborhood.address,
                lat: data.neighborhood.lat,
                lng: data.neighborhood.lng
            }
        }
        const res = await authenticatedRequest(url, {
            method: 'PUT',
            body: JSON.stringify(payload),
        })
        return mapProfile(res)
    },

    async getUserProfile(userId: string): Promise<Profile> {
        const url = createApiUrl(`/profiles/${userId}`)
        const res = await authenticatedRequest(url)
        return mapProfile(res)
    },

    async updateAvatar(avatarFile: File): Promise<{ avatarUrl: string }> {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            throw new Error('사용자 인증이 필요합니다.')
        }

        // 파일명 생성
        const fileExt = avatarFile.name.split('.').pop()
        const fileName = `${user.id}/avatar.${fileExt}`

        // 기존 아바타 파일 삭제 시도
        await supabase.storage.from('avatars').remove([fileName])

        // Supabase Storage에 업로드
        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, avatarFile, {
                cacheControl: '3600',
                upsert: true
            })

        if (uploadError) {
            throw new Error(`업로드 실패: ${uploadError.message}`)
        }

        // 공개 URL 생성
        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName)

        if (!publicUrl) {
            throw new Error('공개 URL 생성에 실패했습니다.')
        }

        // 백엔드 API 업데이트
        const url = createApiUrl('/profiles/avatar')
        await authenticatedRequest(url, {
            method: 'PUT',
            body: JSON.stringify({ avatar_url: publicUrl }),
        })

        return { avatarUrl: publicUrl }
    },

    async updateMyNeighborhood(neighborhood: NeighborhoodInfo): Promise<NeighborhoodInfo> {
        const url = createApiUrl('/profiles/neighborhood')
        const payload = {
            place_name: neighborhood.placeName,
            address: neighborhood.address,
            lat: neighborhood.lat,
            lng: neighborhood.lng
        }
        const response = await authenticatedRequest(url, {
            method: 'PUT',
            body: JSON.stringify({ neighborhood: payload }),
        }) as any
        return mapNeighborhood(response.neighborhood)
    },

    async deleteMyNeighborhood(): Promise<void> {
        const url = createApiUrl('/profiles/neighborhood')
        await authenticatedRequest(url, {
            method: 'DELETE',
        })
    }
}
