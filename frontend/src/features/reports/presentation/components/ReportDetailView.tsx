'use client'

import { ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { MapPin, Pencil, Trash2 } from 'lucide-react'
import { Report, ReportCategory, ReportStatus } from '@/types'
import { parseReportLocation } from '@/lib/utils/locationDisplayUtils'
import { UiButton as Button, UiCard as Card } from '@/shared/ui'
import { SkeletonLoader } from '@/shared/ui/LoadingSpinner'
import { cn } from '@/lib/utils'

const MapComponent = dynamic(() => import('@/features/map/presentation/components/MapComponent'), {
    ssr: false,
    loading: () => <div className="h-[240px] w-full animate-pulse bg-surface-muted" />,
})

/**
 * 실제 상세 화면과 스켈레톤이 공유하는 구역 이름 (ADR-0009).
 * 미디어는 이미지가 있을 때만 존재한다 — 카드와 달리 상세는 행 정렬 제약이 없다.
 */
export const REPORT_DETAIL_REGIONS = {
    header: 'report-detail-header',
    meta: 'report-detail-meta',
    media: 'report-detail-media',
    body: 'report-detail-body',
    location: 'report-detail-location',
    participation: 'report-detail-participation',
    ownerActions: 'report-detail-owner-actions',
} as const

const categoryLabels: Record<ReportCategory, string> = {
    [ReportCategory.NOISE]: '소음',
    [ReportCategory.TRASH]: '쓰레기',
    [ReportCategory.FACILITY]: '시설물',
    [ReportCategory.TRAFFIC]: '교통',
    [ReportCategory.OTHER]: '기타',
}

const statusLabels: Record<ReportStatus, string> = {
    [ReportStatus.OPEN]: '접수됨',
    [ReportStatus.IN_PROGRESS]: '처리중',
    [ReportStatus.RESOLVED]: '해결됨',
}

// 목록 카드와 같은 의미, 같은 색 (UI_V2_CONTRACT.md §1.3)
const statusStyles: Record<ReportStatus, string> = {
    [ReportStatus.OPEN]: 'bg-status-open text-status-open-foreground',
    [ReportStatus.IN_PROGRESS]: 'bg-status-progress text-status-progress-foreground',
    [ReportStatus.RESOLVED]: 'bg-status-resolved text-status-resolved-foreground',
}

const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('ko-KR', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })

interface ReportDetailViewProps {
    report: Report
    isOwner: boolean
    onEdit: () => void
    onDelete: () => void
    /** 공감 등 모든 주민의 참여 행동 */
    participation: ReactNode
}

/**
 * 제보 상세 — 읽기 → 위치 이해 → 참여 순서 (UI_V2_CONTRACT.md §7.4, 레퍼런스 §9).
 *
 * 모바일 첫 화면에서 제목과 핵심 메타데이터가 보이도록 지도와 장식이
 * 본문을 밀어내지 않게 한다.
 */
export default function ReportDetailView({ report, isOwner, onEdit, onDelete, participation }: ReportDetailViewProps) {
    const locationInfo = parseReportLocation(report.address)

    return (
        <article className="space-y-6">
            <Card className="p-5 md:p-6">
                <div data-testid={REPORT_DETAIL_REGIONS.header} className="flex flex-wrap items-center gap-2">
                    <span className={cn('inline-flex h-6 items-center rounded-sm px-2 type-label', statusStyles[report.status])}>
                        {statusLabels[report.status]}
                    </span>
                    <span className="inline-flex h-6 items-center rounded-full bg-surface-muted px-2 type-label text-muted-foreground">
                        {categoryLabels[report.category]}
                    </span>
                </div>

                <h1 className="type-h1 mt-3">{report.title}</h1>

                <p data-testid={REPORT_DETAIL_REGIONS.meta} className="mt-2 type-caption text-muted-foreground">
                    {formatDate(report.createdAt)}
                </p>

                {report.imageUrl && (
                    <div
                        data-testid={REPORT_DETAIL_REGIONS.media}
                        className="mt-5 overflow-hidden rounded-lg bg-surface-muted"
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={report.imageUrl}
                            alt={`${report.title} 사진`}
                            className="mx-auto max-h-[480px] w-full object-contain"
                        />
                    </div>
                )}

                <div data-testid={REPORT_DETAIL_REGIONS.body} className="mt-5 border-t border-border pt-5">
                    <h2 className="type-h2">상세 내용</h2>
                    <p className="mt-3 type-body-lg whitespace-pre-wrap">{report.description}</p>
                </div>

                <div data-testid={REPORT_DETAIL_REGIONS.location} className="mt-5 border-t border-border pt-5">
                    <h2 className="type-h2 flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-brand" aria-hidden="true" />
                        위치
                    </h2>
                    <p className="mt-2 type-body-sm text-muted-foreground break-keep">
                        {locationInfo.showSeparate && locationInfo.placeName ? `${locationInfo.placeName} · ` : ''}
                        {locationInfo.address || '주소 정보가 없습니다'}
                    </p>
                    <div className="mt-3 overflow-hidden rounded-lg border border-border">
                        <MapComponent reports={[report]} center={report.location} zoom={3} height="240px" />
                    </div>
                </div>

                <div
                    data-testid={REPORT_DETAIL_REGIONS.participation}
                    className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-5"
                >
                    {participation}

                    {isOwner && (
                        <div data-testid={REPORT_DETAIL_REGIONS.ownerActions} className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={onEdit} aria-label="제보 수정">
                                <Pencil className="h-4 w-4" aria-hidden="true" />
                                수정
                            </Button>
                            <Button variant="ghost" size="sm" className="text-danger" onClick={onDelete} aria-label="제보 삭제">
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                                삭제
                            </Button>
                        </div>
                    )}
                </div>
            </Card>
        </article>
    )
}

/**
 * 실제 상세 화면과 같은 구역을 같은 순서·크기로 그린다 (ADR-0009).
 * 지도 자리에는 240px 블록을 둬서 로드 후 점프를 없앤다.
 */
export function ReportDetailSkeleton() {
    return (
        <div aria-busy="true" className="space-y-6">
            <Card className="p-5 md:p-6">
                <div data-testid={REPORT_DETAIL_REGIONS.header} className="flex gap-2">
                    <SkeletonLoader className="h-6 w-16 rounded-sm" />
                    <SkeletonLoader className="h-6 w-14 rounded-full" />
                </div>

                <SkeletonLoader className="mt-3 h-8 w-3/4" />

                <div data-testid={REPORT_DETAIL_REGIONS.meta} className="mt-2">
                    <SkeletonLoader className="h-4 w-40" />
                </div>

                <div data-testid={REPORT_DETAIL_REGIONS.media} className="mt-5 overflow-hidden rounded-lg">
                    <SkeletonLoader className="h-[280px] w-full rounded-lg" />
                </div>

                <div data-testid={REPORT_DETAIL_REGIONS.body} className="mt-5 space-y-2 border-t border-border pt-5">
                    <SkeletonLoader className="h-6 w-28" />
                    <SkeletonLoader className="h-4 w-full" />
                    <SkeletonLoader className="h-4 w-full" />
                    <SkeletonLoader className="h-4 w-2/3" />
                </div>

                <div data-testid={REPORT_DETAIL_REGIONS.location} className="mt-5 space-y-3 border-t border-border pt-5">
                    <SkeletonLoader className="h-6 w-20" />
                    <SkeletonLoader className="h-4 w-56" />
                    <SkeletonLoader className="h-[240px] w-full rounded-lg" />
                </div>

                {/* 소유자 행동 자리는 그리지 않는다 — 로딩 중에는 소유 여부를 모른다 */}
                <div
                    data-testid={REPORT_DETAIL_REGIONS.participation}
                    className="mt-5 flex items-center justify-between border-t border-border pt-5"
                >
                    <SkeletonLoader className="h-11 w-28 rounded-md" />
                </div>
            </Card>
        </div>
    )
}
