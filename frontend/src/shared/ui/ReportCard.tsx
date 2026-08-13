'use client';

import React from 'react';
import Link from 'next/link';
import { MapPin, ThumbsUp, MessageCircle, Volume2, Trash2, Wrench, Car, CircleDot } from 'lucide-react';
import Image from 'next/image';
import { formatToAdministrativeAddress } from '@/lib/utils/addressUtils';
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
 * 미디어 슬롯 (UI_V2_CONTRACT.md §7).
 *
 * 슬롯은 이미지가 없어도 항상 같은 자리·같은 비율을 지킨다 — 같은 그리드 행의
 * 카드 높이가 이미지 유무로 갈리지 않게 하는 핵심 규칙이다.
 *
 * 다만 빈 자리에 카테고리 아이콘만 놓으면 **없음을 그리게 된다** — 회색 상자가
 * 구멍처럼 읽히고, 사진 있는 카드 옆에서 미완성으로 보인다. 그래서 이미지가
 * 없을 때는 그 자리를 제보 본문으로 채운다. 부재가 아니라 콘텐츠가 놓이므로
 * 리듬은 유지되면서 카드가 의도된 '글 제보'로 읽힌다.
 *
 * 로드 실패는 이미지 없음과 똑같이 다뤄서 깨진 아이콘과 alt 텍스트가 노출되지 않게 한다.
 */
function ReportCardMedia({
  imageUrl,
  category,
  description,
  showImage,
  onImageError,
}: Pick<ReportCardProps, 'imageUrl' | 'category' | 'description'> & {
  showImage: boolean
  onImageError: () => void
}) {
  const CategoryIcon = categoryIcons[category] ?? CircleDot;

  return (
    <div
      data-testid={REPORT_CARD_REGIONS.media}
      className="relative mb-3 aspect-video w-full overflow-hidden rounded-md bg-surface-muted"
    >
      {showImage ? (
        <Image
          src={imageUrl!}
          alt=""
          fill
          className="object-cover transition-transform duration-200 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          onError={onImageError}
        />
      ) : (
        <div className="flex h-full w-full items-center gap-3 border-l-2 border-brand/30 px-4 py-3">
          <CategoryIcon className="h-5 w-5 shrink-0 self-start text-muted-foreground/70" aria-hidden="true" />
          <p
            data-testid={REPORT_CARD_REGIONS.description}
            className="type-body line-clamp-4 text-foreground/80"
          >
            {description}
          </p>
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
    // 로드 실패는 이미지 없음과 똑같이 다룬다 — 판정을 카드가 들고 있어야
    // 요약 문단과 미디어 슬롯이 같은 결론을 쓴다 (본문이 두 번 나오지 않게).
    const [imageFailed, setImageFailed] = React.useState(false);
    const showImage = Boolean(imageUrl) && !imageFailed;

    return (
      <Link
        ref={ref}
        href={href}
        className={cn('group block rounded-lg', className)}
      >
        <Card className="h-full overflow-hidden p-4 transition-shadow group-hover:border-border-strong group-hover:shadow-e1 group-active:bg-surface-muted">
          <div
            data-testid={REPORT_CARD_REGIONS.status}
            className={cn('mb-2 inline-flex h-6 items-center rounded-sm px-2 type-label', statusStyles[status])}
          >
            {statusLabel}
          </div>

          <h3
            data-testid={REPORT_CARD_REGIONS.title}
            className="type-h3 line-clamp-2 transition-colors group-hover:text-brand"
          >
            {title}
          </h3>

          {/* 사진이 있을 때만 요약을 따로 둔다 — 사진이 없으면 본문이 미디어 슬롯을 채우므로
              여기서 또 보여주면 같은 문장이 두 번 나온다. */}
          {showImage && (
            <p
              data-testid={REPORT_CARD_REGIONS.description}
              className="mt-1 mb-3 type-body-sm text-muted-foreground line-clamp-2"
            >
              {description}
            </p>
          )}

          <ReportCardMedia
            imageUrl={imageUrl || undefined}
            category={category}
            description={description}
            showImage={showImage}
            onImageError={() => setImageFailed(true)}
          />

          <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
            <span className="flex min-w-0 items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-brand" aria-hidden="true" />
              <span
                data-testid={REPORT_CARD_REGIONS.location}
                className="type-caption text-muted-foreground truncate"
              >
                {address ? formatToAdministrativeAddress(address) : '위치 정보 없음'}
              </span>
            </span>
            <span className="shrink-0 rounded-full bg-surface-muted px-2 py-0.5 type-caption text-muted-foreground">
              {categoryLabel}
            </span>
          </div>

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
        </Card>
      </Link>
    );
  }
);

ReportCard.displayName = 'ReportCard';

/**
 * 실제 카드와 같은 파일, 같은 구역, 같은 미디어 정책을 공유한다 (ADR-0009).
 */
export function ReportCardSkeleton() {
  return (
    <Card className="h-full overflow-hidden p-4">
      <div data-testid={REPORT_CARD_REGIONS.status} className="mb-2">
        <SkeletonLoader className="h-6 w-14 rounded-sm" />
      </div>

      <div data-testid={REPORT_CARD_REGIONS.title}>
        <SkeletonLoader className="h-5 w-3/4" />
      </div>

      <div data-testid={REPORT_CARD_REGIONS.description} className="mt-1 mb-3 space-y-1.5">
        <SkeletonLoader className="h-4 w-full" />
        <SkeletonLoader className="h-4 w-2/3" />
      </div>

      <div
        data-testid={REPORT_CARD_REGIONS.media}
        className="relative mb-3 aspect-video w-full overflow-hidden rounded-md"
      >
        <SkeletonLoader className="h-full w-full rounded-md" />
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
        <div data-testid={REPORT_CARD_REGIONS.location} className="min-w-0 flex-1">
          <SkeletonLoader className="h-3.5 w-24" />
        </div>
        <SkeletonLoader className="h-3.5 w-12" />
      </div>

      <div data-testid={REPORT_CARD_REGIONS.meta} className="mt-2 flex items-center gap-3">
        <SkeletonLoader className="h-3.5 w-16" />
        <SkeletonLoader className="ml-auto h-3.5 w-8" />
        <SkeletonLoader className="h-3.5 w-8" />
      </div>
    </Card>
  );
}
