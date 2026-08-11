'use client'

import { useState } from 'react'
import { useProfileViewModel } from '@/features/profile/presentation/hooks/useProfileViewModel'
import Header from '@/components/Header'
import Avatar from '@/components/Avatar'
import ProfileEditModal from '@/components/ProfileEditModal'
import { AuthDialog } from '@/features/auth/presentation/components/AuthDialog'
import AuthRequiredGate from '@/features/auth/presentation/components/AuthRequiredGate'
import MyActivitySkeleton from '@/features/profile/presentation/components/MyActivitySkeleton'
import { useAuthViewModel } from '@/features/auth/presentation/hooks/useAuthViewModel'
import { isNotFoundError } from '@/lib/api/config'
import { Edit, Calendar, MessageCircle, Heart, FileText, Mail, Shield, MapPin, UserPlus, AlertTriangle } from 'lucide-react'
import {
  UiButton as Button,
  UiCard as Card,
  UiCardContent as CardContent,
  UiCardHeader as CardHeader,
  UiCardTitle as CardTitle,
  UiEmptyState,
  UiErrorState,
} from '@/shared/ui'

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })

function ProfileStatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card className="p-5 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-surface-muted text-muted-foreground">
        {icon}
      </div>
      <p className="type-caption text-muted-foreground">{label}</p>
      <p className="type-h1 mt-1">{value}</p>
    </Card>
  )
}

/**
 * 프로필 — 내 활동 여정의 계정 쪽 화면.
 *
 * "프로필이 아직 없다"와 "프로필을 못 불러왔다"는 다른 사실이므로 다른
 * 화면과 다른 행동을 준다 (UI_V2_CONTRACT.md §8).
 */
function ProfileContent({ onEdit }: { onEdit: () => void }) {
  const { profile, isLoading, error, refetch } = useProfileViewModel()
  const { user } = useAuthViewModel()

  if (isLoading) {
    return <MyActivitySkeleton />
  }

  if (!profile) {
    if (isNotFoundError(error)) {
      return (
        <UiEmptyState
          icon={<UserPlus className="h-7 w-7" aria-hidden="true" />}
          title="프로필을 아직 만들지 않았어요"
          description="닉네임과 내 동네를 정하면 이웃에게 내 제보가 어떻게 보이는지 확인할 수 있어요"
          primaryAction={{ label: '프로필 만들기', onClick: onEdit }}
        />
      )
    }

    return (
      <UiErrorState
        icon={<AlertTriangle className="h-7 w-7" aria-hidden="true" />}
        title="프로필을 불러오지 못했어요"
        description="잠시 후 다시 시도해주세요"
        primaryAction={{ label: '다시 시도', onClick: () => refetch() }}
      />
    )
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar src={profile.avatarUrl} size="xl" alt={profile.nickname} />

          <div className="min-w-0 flex-1 space-y-2">
            <h2 className="type-h1 truncate">{profile.nickname}</h2>
            <div className="flex flex-wrap items-center gap-3 type-caption text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" aria-hidden="true" />
                {formatDate(profile.createdAt)} 가입
              </span>
              {profile.neighborhood && (
                <span className="flex items-center gap-1.5 rounded-full bg-brand-subtle px-2 py-0.5 text-brand">
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  {profile.neighborhood.placeName}
                </span>
              )}
            </div>
          </div>

          <Button variant="outline" className="gap-2 sm:w-auto" onClick={onEdit}>
            <Edit className="h-4 w-4" aria-hidden="true" />
            프로필 수정
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ProfileStatCard
          icon={<FileText className="h-6 w-6" aria-hidden="true" />}
          label="작성한 제보"
          value={profile.stats?.reportCount || 0}
        />
        <ProfileStatCard
          icon={<MessageCircle className="h-6 w-6" aria-hidden="true" />}
          label="작성한 댓글"
          value={profile.stats?.commentCount || 0}
        />
        <ProfileStatCard
          icon={<Heart className="h-6 w-6" aria-hidden="true" />}
          label="누른 공감"
          value={profile.stats?.voteCount || 0}
        />
      </div>

      <Card>
        <CardHeader className="border-b border-border pb-3">
          <CardTitle className="type-h3 flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            계정 정보
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div>
            <div className="mb-1 flex items-center gap-2 type-label text-muted-foreground">
              <Mail className="h-4 w-4" aria-hidden="true" /> 이메일
            </div>
            <div className="rounded-md bg-surface-muted p-3 type-body-sm break-all">
              {user?.email || '이메일 정보 없음'}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ProfilePage() {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <AuthDialog />

      <main className="container mx-auto max-w-5xl px-4 py-6 lg:py-8">
        <div className="mb-6">
          <h1 className="type-h1">프로필</h1>
          <p className="mt-1 type-body-sm text-muted-foreground">
            이웃에게 보이는 내 정보와 활동 기록이에요
          </p>
        </div>

        <AuthRequiredGate
          title="로그인하면 프로필을 볼 수 있어요"
          description="닉네임, 내 동네, 활동 기록은 본인만 볼 수 있어요"
          skeleton={<MyActivitySkeleton />}
        >
          <ProfileContent onEdit={() => setIsEditModalOpen(true)} />
        </AuthRequiredGate>
      </main>

      <ProfileEditModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} />
    </div>
  )
}
