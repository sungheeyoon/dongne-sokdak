'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAuthViewModel } from '@/features/auth/presentation/hooks/useAuthViewModel'
import { useReportViewModel } from '@/features/reports/presentation/hooks/useReportsViewModel'
import { useMutateReportViewModel } from '@/features/reports/presentation/hooks/useMutateReportViewModel'
import Header from '@/components/Header'
import { AuthDialog } from '@/features/auth/presentation/components/AuthDialog'
import ReportModal from '@/features/reports/presentation/components/ReportModal'
import EditReportModal from '@/features/reports/presentation/components/EditReportModal'
import Comments from '@/features/reports/presentation/components/Comments'
import VoteButton from '@/features/reports/presentation/components/VoteButton'
import ReportDetailView, { ReportDetailSkeleton } from '@/features/reports/presentation/components/ReportDetailView'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import {
  UiButton as Button,
  UiDialog as Dialog,
  UiDialogContent as DialogContent,
  UiDialogHeader as DialogHeader,
  UiDialogTitle as DialogTitle,
  UiDialogFooter as DialogFooter,
  UiDialogDescription as DialogDescription,
  UiErrorState,
} from '@/shared/ui'

export default function ReportDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuthViewModel()
  const reportId = params.id as string
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const { report, isLoading, error, refetch } = useReportViewModel(reportId)
  const { deleteReport } = useMutateReportViewModel()

  const handleDeleteConfirm = async () => {
    try {
      await deleteReport(reportId)
      setShowDeleteDialog(false)
      router.push('/')
    } catch (err) {
      console.error(err)
    }
  }

  const isOwner = Boolean(user && report && user.id === report.userId)

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <AuthDialog />
      <ReportModal />
      {report && (
        <EditReportModal
          report={report}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
        />
      )}

      <main className="container mx-auto max-w-3xl px-4 py-6 lg:py-8">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 -ml-2 gap-1 text-muted-foreground"
          onClick={() => router.push('/')}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          목록으로
        </Button>

        {isLoading && <ReportDetailSkeleton />}

        {!isLoading && (error || !report) && (
          <UiErrorState
            icon={<AlertTriangle className="h-7 w-7" aria-hidden="true" />}
            title="제보를 불러오지 못했어요"
            description="삭제되었거나 일시적으로 불러올 수 없는 제보예요"
            primaryAction={{ label: '다시 시도', onClick: () => refetch() }}
            secondaryAction={{ label: '목록으로', onClick: () => router.push('/') }}
          />
        )}

        {!isLoading && !error && report && (
          <>
            <ReportDetailView
              report={report}
              isOwner={isOwner}
              onEdit={() => setIsEditModalOpen(true)}
              onDelete={() => setShowDeleteDialog(true)}
              participation={<VoteButton reportId={report.id} initialCount={report.voteCount} />}
            />

            <div className="mt-6">
              <Comments reportId={report.id} reportAuthorId={report.userId} />
            </div>
          </>
        )}
      </main>

      {/* 삭제 확인 — 초기 포커스는 취소, 확인 라벨에는 대상을 쓴다 (UI_V2_CONTRACT.md §4.5) */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>제보를 삭제할까요?</DialogTitle>
            <DialogDescription>
              삭제한 제보와 댓글은 되돌릴 수 없어요.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" autoFocus onClick={() => setShowDeleteDialog(false)}>
              취소
            </Button>
            <Button variant="danger" onClick={handleDeleteConfirm}>
              제보 삭제하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
