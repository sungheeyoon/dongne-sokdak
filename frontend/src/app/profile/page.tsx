'use client'

import { useState } from 'react'
import { useMyProfile } from '@/hooks/useProfile'
import { useAuth } from '@/hooks/useAuth'
import Header from '@/components/Header'
import Avatar from '@/components/Avatar'
import ProfileEditModal from '@/components/ProfileEditModal'
import { Edit, Calendar, MessageCircle, Heart, FileText, Loader2, Mail, Shield, MapPin } from 'lucide-react'
import { 
  UiButton as Button, 
  UiCard as Card, 
  UiCardContent as CardContent, 
  UiCardHeader as CardHeader, 
  UiCardTitle as CardTitle,
  UiBadge as Badge
} from '@/components/ui'

export default function ProfilePage() {
  const { data: profile, isLoading, error } = useMyProfile()
  const { user } = useAuth()
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-primary h-8 w-8" />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-20">
          <Card className="max-w-md mx-auto text-center p-8 border-dashed shadow-none bg-transparent">
            <p className="text-muted-foreground mb-6">프로필 정보를 불러올 수 없습니다.</p>
            <Button onClick={() => window.location.reload()}>다시 시도</Button>
          </Card>
        </main>
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      <Header />
      
      <main className="container mx-auto px-4 py-10">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Profile Header Card */}
          <Card className="overflow-hidden border-0 shadow-sm ring-1 ring-black/5 bg-white">
            <div className="h-40 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10" />
            <CardContent className="relative px-8 pb-8">
              <div className="flex flex-col md:flex-row items-start md:items-end gap-6 -mt-16 mb-6">
                <div className="relative group">
                  <div className="rounded-full ring-4 ring-white shadow-lg overflow-hidden bg-white">
                    <Avatar
                      src={profile.avatar_url}
                      size="xl"
                      alt={profile.nickname}
                    />
                  </div>
                </div>
                
                <div className="flex-1 space-y-2 mb-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{profile.nickname}</h1>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 font-medium">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(profile.created_at)} 가입</span>
                    </div>
                    {profile.neighborhood && (
                      <div className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                        <MapPin className="w-3.5 h-3.5" />
                        {profile.neighborhood.place_name}
                      </div>
                    )}
                  </div>
                </div>

                <Button 
                  onClick={() => setIsEditModalOpen(true)}
                  variant="outline"
                  className="w-full md:w-auto gap-2 font-medium shadow-sm"
                >
                  <Edit className="w-4 h-4" />
                  프로필 수정
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Activity Stats */}
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="border-0 shadow-sm ring-1 ring-black/5 hover:shadow-md transition-shadow">
                <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0 text-blue-600">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">작성한 제보</p>
                    <p className="text-3xl font-bold text-gray-900">{profile.stats?.report_count || 0}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm ring-1 ring-black/5 hover:shadow-md transition-shadow">
                <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0 text-emerald-600">
                    <MessageCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">작성한 댓글</p>
                    <p className="text-3xl font-bold text-gray-900">{profile.stats?.comment_count || 0}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm ring-1 ring-black/5 hover:shadow-md transition-shadow">
                <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center shrink-0 text-rose-600">
                    <Heart className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">누른 공감</p>
                    <p className="text-3xl font-bold text-gray-900">{profile.stats?.vote_count || 0}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Additional Info / Settings Links */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="border-0 shadow-sm ring-1 ring-black/5 h-full">
                <CardHeader className="pb-3 border-b border-gray-100">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Shield className="w-4 h-4 text-gray-500" />
                    계정 정보
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-1">
                      <Mail className="w-4 h-4" /> 이메일
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg text-sm font-medium text-gray-900 break-all">
                      {user?.email || '이메일 정보 없음'}
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t border-gray-100">
                    <Button variant="link" className="px-0 h-auto text-gray-500 hover:text-primary font-medium text-sm">
                      비밀번호 변경하기
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* 편집 모달 */}
        <ProfileEditModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
        />
      </main>
    </div>
  )
}
