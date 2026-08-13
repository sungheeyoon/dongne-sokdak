'use client';

import React from 'react';
import Link from 'next/link';
import { MapPin, ThumbsUp, MessageCircle, Volume2, Trash2, Wrench, Car, CircleDot } from 'lucide-react';
import Image from 'next/image';
import { formatReportCardAddress } from '@/lib/utils/addressUtils';
import { UiCard as Card } from '@/shared/ui';
import { SkeletonLoader } from '@/shared/ui/LoadingSpinner';
import { cn } from '@/lib/utils';

export type ReportCardCategory = 'NOISE' | 'TRASH' | 'FACILITY' | 'TRAFFIC' | 'OTHER';
export type ReportCardStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';

export interface ReportCardProps {
  id: string;
  /** 카드 전체가 이 목적지로 가는 링크가 된다 */
  href: string;
  title: string;
  description: string;
  category: ReportCardCategory;
  status: ReportCardStatus;
  imageUrl?: string;
  address?: string;
  location?: { lat: number; lng: number };
  voteCount?: number;
  commentCount?: number;
  createdAt: string;
  className?: string;
}

/**
 * 실제 카드와 스켈레톤이 공유하는 구역 이름 (ADR-0009).
 * 한쪽에만 구역이 생기면 계약 테스트가 깨진다.
 */
export const REPORT_CARD_REGIONS = {
  status: 'report-card-status',
  title: 'report-card-title',
  description: 'report-card-description',
  media: 'report-card-media',
  location: 'report-card-location',
  meta: 'report-card-meta',
} as const;

const categoryLabels: Record<ReportCardCategory, string> = {
  NOISE: '소음', TRASH: '쓰레기', FACILITY: '시설물', TRAFFIC: '교통', OTHER: '기타'
};

const categoryIcons: Record<ReportCardCategory, typeof Volume2> = {
  NOISE: Volume2, TRASH: Trash2, FACILITY: Wrench, TRAFFIC: Car, OTHER: CircleDot
};

const statusLabels: Record<ReportCardStatus, string> = {
  OPEN: '접수됨', IN_PROGRESS: '처리중', RESOLVED: '해결됨'
};

// UI_V2_CONTRACT.md §1.3 — 중성 → 앰버 → 초록 진행. 빨강은 오류·파괴적 행동 전용이다.
const statusStyles: Record<ReportCardStatus, string> = {
  OPEN: 'bg-status-open text-status-open-foreground',
  IN_PROGRESS: 'bg-status-progress text-status-progress-foreground',
  RESOLVED: 'bg-status-resolved text-status-resolved-foreground',
};

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('ko-KR', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

/**
 * 카드의 콘텐츠 미리보기 (UI_V2_CONTRACT.md §7).
 *
 * 본문을 카드의 주인공으로 두고 이미지는 있을 때만 작은 보조 썸네일로 붙인다.
 * 이미지가 없다는 이유로 큰 빈 면을 만들지 않으며, 최소 높이로 그리드 리듬만
 * 맞춘다. 로드 실패 시에는 썸네일만 걷어내고 본문이 전체 폭을 사용한다.
 */
function ReportCardPreview({
  imageUrl,
  description,
  showImage,
  onImageError,
}: Pick<ReportCardProps, 'imageUrl' | 'description'> & {
  showImage: boolean
  onImageError: () => void
}) {
  return (
    <div
      data-testid={REPORT_CARD_REGIONS.media}
      className="mt-3 mb-4 flex min-h-24 items-start gap-3"
    >
      <p
        data-testid={REPORT_CARD_REGIONS.description}
        className="type-body-sm line-clamp-3 min-w-0 flex-1 text-muted-foreground"
      >
        {description}
      </p>

      {showImage && (
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md bg-surface-muted">
          <Image
            src={imageUrl!}
            alt=""
            fill
            className="object-cover transition-transform duration-200 group-hover:scale-105"
            sizes="96px"
            onError={onImageError}
          />
        </div>
      )}
    </div>
  );
}

export const ReportCard = React.forwardRef<HTMLAnchorElement, ReportCardProps>(
  ({
    href, title, description, category, status, imageUrl, address,
    voteCount = 0, commentCount = 0, createdAt, className
  }, ref) => {
    const statusLabel = statusLabels[status];
    const categoryLabel = categoryLabels[category];
    const CategoryIcon = categoryIcons[category] ?? CircleDot;
    // 실패 판정을 카드가 들고 있어야 썸네일만 걷어내고 본문을 그대로 유지할 수 있다.
    const [imageFailed, setImageFailed] = React.useState(false);
    const showImage = Boolean(imageUrl) && !imageFailed;

    return (
      <Link
        ref={ref}
        href={href}
        className={cn('group block rounded-lg', className)}
      >
        <Card className="flex h-full flex-col overflow-hidden p-4 transition-shadow group-hover:border-border-strong group-hover:shadow-e1 group-active:bg-surface-muted">
          <div className="flex items-center justify-between gap-2">
            <span
              data-testid={REPORT_CARD_REGIONS.status}
              className={cn('inline-flex h-6 items-center rounded-sm px-2 type-label', statusStyles[status])}
            >
              {statusLabel}
            </span>
            <span className="inline-flex h-6 items-center gap-1 rounded-full bg-surface-muted px-2 type-caption text-muted-foreground">
              <CategoryIcon className="h-3.5 w-3.5" aria-hidden="true" />
              {categoryLabel}
            </span>
          </div>

          <h3
            data-testid={REPORT_CARD_REGIONS.title}
            className="type-h3 mt-3 min-h-[3.25rem] line-clamp-2 transition-colors group-hover:text-brand"
          >
            {title}
          </h3>

          <ReportCardPreview
            imageUrl={imageUrl || undefined}
            description={description}
            showImage={showImage}
            onImageError={() => setImageFailed(true)}
          />

          <div className="mt-auto border-t border-border pt-3">
            <span className="flex min-w-0 items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-brand" aria-hidden="true" />
              <span
                data-testid={REPORT_CARD_REGIONS.location}
                className="type-caption text-muted-foreground truncate"
              >
                {address ? formatReportCardAddress(address) : '위치 정보 없음'}
              </span>
            </span>

            <div
              data-testid={REPORT_CARD_REGIONS.meta}
              className="mt-2 flex items-center gap-3 type-caption text-muted-foreground"
            >
              <span>{formatDate(createdAt)}</span>
              <span className="ml-auto flex items-center gap-1" aria-label={`공감 ${voteCount}`}>
                <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
                {voteCount}
              </span>
              <span className="flex items-center gap-1" aria-label={`댓글 ${commentCount}`}>
                <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                {commentCount}
              </span>
            </div>
          </div>
        </Card>
      </Link>
    );
  }
);

ReportCard.displayName = 'ReportCard';

/**
 * 실제 카드와 같은 파일, 같은 구역, 같은 컴팩트 미리보기 정책을 공유한다 (ADR-0009).
 */
export function ReportCardSkeleton() {
  return (
    <Card className="flex h-full flex-col overflow-hidden p-4">
      <div className="flex items-center justify-between gap-2">
        <div data-testid={REPORT_CARD_REGIONS.status}>
          <SkeletonLoader className="h-6 w-14 rounded-sm" />
        </div>
        <SkeletonLoader className="h-6 w-16 rounded-full" />
      </div>

      <div data-testid={REPORT_CARD_REGIONS.title} className="mt-3 min-h-[3.25rem] space-y-2">
        <SkeletonLoader className="h-5 w-3/4" />
        <SkeletonLoader className="h-5 w-1/2" />
      </div>

      <div
        data-testid={REPORT_CARD_REGIONS.media}
        className="mt-3 mb-4 min-h-24 space-y-2"
      >
        <div data-testid={REPORT_CARD_REGIONS.description} className="space-y-2">
          <SkeletonLoader className="h-4 w-full" />
          <SkeletonLoader className="h-4 w-full" />
          <SkeletonLoader className="h-4 w-2/3" />
        </div>
      </div>

      <div className="mt-auto border-t border-border pt-3">
        <div data-testid={REPORT_CARD_REGIONS.location} className="min-w-0 flex-1">
          <SkeletonLoader className="h-3.5 w-24" />
        </div>

        <div data-testid={REPORT_CARD_REGIONS.meta} className="mt-2 flex items-center gap-3">
          <SkeletonLoader className="h-3.5 w-16" />
          <SkeletonLoader className="ml-auto h-3.5 w-8" />
          <SkeletonLoader className="h-3.5 w-8" />
        </div>
      </div>
    </Card>
  );
}
