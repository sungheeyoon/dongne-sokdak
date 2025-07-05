'use client'

import { useState } from 'react'
import { useMyProfile } from '@/hooks/useProfile'
import Avatar from '@/components/Avatar'
import ProfileEditModal from '@/components/ProfileEditModal'
import { Edit, MapPin, Calendar, MessageCircle, Heart, FileText, Loader2 } from 'lucide-react'

export default function ProfilePage() {
  const { data: profile, isLoading, error } = useMyProfile()
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" size={32} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">프로필을 불러오는데 실패했습니다.</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
          >
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">프로필을 찾을 수 없습니다.</p>
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* 프로필 헤더 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <Avatar
                src={profile.avatar_url}
                size="xl"
                alt={profile.nickname}
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {profile.nickname}
                </h1>
                <div className="flex items-center text-gray-500 mt-1">
                  <Calendar size={16} className="mr-1" />
                  <span className="text-sm">
                    {formatDate(profile.stats?.joined_at || profile.created_at)} 가입
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="flex items-center bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
            >
              <Edit size={16} className="mr-2" />
              편집
            </button>
          </div>

          {/* 활동 통계 */}
          {profile.stats && (
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  <FileText className="text-blue-500" size={24} />
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {profile.stats.report_count}
                </div>
                <div className="text-sm text-gray-500">작성한 제보</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  <MessageCircle className="text-green-500" size={24} />
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {profile.stats.comment_count}
                </div>
                <div className="text-sm text-gray-500">작성한 댓글</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  <Heart className="text-red-500" size={24} />
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {profile.stats.vote_count}
                </div>
                <div className="text-sm text-gray-500">누른 공감</div>
              </div>
            </div>
          )}
        </div>

        {/* 편집 모달 */}
        <ProfileEditModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
        />
      </div>
    </div>
  )
}
