'use client'

import { UiCard as Card } from '@/shared/ui'
import { SkeletonLoader } from '@/shared/ui/LoadingSpinner'

/**
 * 내 활동 여정(내 제보 · 프로필)이 공유하는 로딩 표현.
 *
 * 요약 카드 + 필터 + 목록이라는 실제 화면 구조를 그대로 따라 그린다 —
 * 로드가 끝났을 때 레이아웃이 점프하지 않게 하기 위해서다 (ADR-0009).
 */
export default function MyActivitySkeleton() {
    return (
        <div data-testid="my-activity-skeleton" aria-busy="true" className="space-y-6">
            <Card className="p-6">
                <div className="flex items-center gap-4">
                    <SkeletonLoader className="h-16 w-16 rounded-full" />
                    <div className="flex-1 space-y-2">
                        <SkeletonLoader className="h-5 w-32" />
                        <SkeletonLoader className="h-4 w-48" />
                    </div>
                </div>
                <div className="mt-6 grid grid-cols-3 gap-3">
                    {[0, 1, 2].map((i) => (
                        <SkeletonLoader key={i} className="h-20 w-full rounded-lg" />
                    ))}
                </div>
            </Card>

            <div className="flex gap-2">
                {[0, 1, 2, 3].map((i) => (
                    <SkeletonLoader key={i} className="h-11 w-20 rounded-full" />
                ))}
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3 lg:gap-5">
                {[0, 1, 2].map((i) => (
                    <SkeletonLoader key={i} className="h-64 w-full rounded-lg" />
                ))}
            </div>
        </div>
    )
}
