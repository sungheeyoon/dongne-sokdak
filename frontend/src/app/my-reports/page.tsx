'use client'

import { useState, useEffect } from 'react'
import { useAuthViewModel } from '@/features/auth/presentation/hooks/useAuthViewModel'
import { useMyReportsViewModel } from '@/features/reports/presentation/hooks/useReportsViewModel'
import { Report } from '@/types'
import Header from '@/components/Header'
import { AuthDialog } from '@/features/auth/presentation/components/AuthDialog'
import AuthRequiredGate from '@/features/auth/presentation/components/AuthRequiredGate'
import ReportModal from '@/features/reports/presentation/components/ReportModal'
import EditReportModal from '@/features/reports/presentation/components/EditReportModal'
import ReportList from '@/features/reports/presentation/components/ReportList'
import StatusFilterChips, { STATUS_FILTERS } from '@/features/reports/presentation/components/StatusFilterChips'
import MyActivitySkeleton from '@/features/profile/presentation/components/MyActivitySkeleton'
import { useUIStore } from '@/shared/stores/useUIStore'
import { UiEmptyState, UiErrorState } from '@/shared/ui'
import { FileText, AlertTriangle } from 'lucide-react'

/**
 * 내 활동 — 내가 작성한 제보.
 *
 * 인증 초기화 / 익명 / 로딩 / 정상 / 빈 상태 / 오류를 서로 다른 화면으로
 * 그린다 (UI_V2_CONTRACT.md §8). 어느 상태에서도 전체 페이지 새로고침이나
 * 직접 location 변경에 의존하지 않는다.
 */
function MyReportsContent() {
  const { user } = useAuthViewModel()
  const { openReportModal } = useUIStore()
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [editingReport, setEditingReport] = useState<Report | null>(null)
  const [paginationPage, setPaginationPage] = useState<number>(1)

  // 상태 변경 시 페이징 리셋
  useEffect(() => {
    setPaginationPage(1)
  }, [selectedStatus])

  const {
    reports,
    totalCount,
    totalPages,
    isLoading,
    error,
    refetch,
  } = useMyReportsViewModel({
    userId: user?.id,
    status: selectedStatus,
    page: paginationPage,
    limit: 9,
  })

  if (isLoading) {
    return <MyActivitySkeleton />
  }

  // 서버 실패는 "작성한 제보가 없다"와 다른 사실이다 — 같은 빈 상태로 합치지 않는다.
  if (error) {
    return (
      <UiErrorState
        icon={<AlertTriangle className="h-7 w-7" aria-hidden="true" />}
        title="제보를 불러오지 못했어요"
        description="잠시 후 다시 시도해주세요. 선택한 상태 필터는 그대로 유지됩니다."
        primaryAction={{ label: '다시 시도', onClick: () => refetch() }}
      />
    )
  }

  const statusLabel = STATUS_FILTERS.find((option) => option.value === selectedStatus)?.label

  return (
    <>
      <EditReportModal
        report={editingReport}
        isOpen={!!editingReport}
        onClose={() => setEditingReport(null)}
      />

      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <p className="type-body-sm text-muted-foreground" aria-live="polite">
            제보 {totalCount}건
          </p>
          <StatusFilterChips value={selectedStatus} onChange={setSelectedStatus} />
        </div>

        <ReportList
          reports={reports}
          isLoading={false}
          currentPage={paginationPage}
          totalPages={totalPages}
          onPageChange={setPaginationPage}
          emptyMessage={
            <UiEmptyState
              icon={<FileText className="h-7 w-7" aria-hidden="true" />}
              title={selectedStatus === 'all' ? '아직 작성한 제보가 없어요' : `${statusLabel} 제보가 없어요`}
              description={
                selectedStatus === 'all'
                  ? '동네에서 발견한 일을 이웃에게 알려보세요'
                  : '다른 상태를 골라보면 작성한 제보를 볼 수 있어요'
              }
              primaryAction={{ label: '제보하기', onClick: openReportModal }}
            />
          }
        />
      </div>
    </>
  )
}

export default function MyReportsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <AuthDialog />
      <ReportModal />

      <main className="container mx-auto max-w-5xl px-4 py-6 lg:py-8">
        <div className="mb-6">
          <h1 className="type-h1">내 제보</h1>
          <p className="mt-1 type-body-sm text-muted-foreground">
            내가 작성한 제보와 처리 상태를 확인할 수 있어요
          </p>
        </div>

        <AuthRequiredGate
          title="로그인하면 내 제보를 볼 수 있어요"
          description="내가 작성한 제보와 처리 상태는 본인만 볼 수 있어요"
          skeleton={<MyActivitySkeleton />}
        >
          <MyReportsContent />
        </AuthRequiredGate>
      </main>
    </div>
  )
}
