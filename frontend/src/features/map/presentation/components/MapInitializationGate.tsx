'use client'

import { ReactNode } from 'react'
import { MapPinOff, RotateCcw } from 'lucide-react'
import LoadingSpinner from '@/shared/ui/LoadingSpinner'
import { UiButton } from '@/shared/ui'
import { KakaoMapAdapter } from '@/features/map/data/kakaoMapAdapter'
import { useMapInitializationViewModel } from '@/features/map/presentation/hooks/useMapInitializationViewModel'

interface MapInitializationGateProps {
    isAuthInitialized: boolean
    isLoadingProfile: boolean
    adapter?: KakaoMapAdapter
    /** 최종 지도 크기 — placeholder가 같은 높이를 써서 레이아웃 점프를 없앤다 */
    height?: string
    /** 축소형 안내를 쓸지 (모바일). 지도 오류가 피드를 접힌 영역 아래로 밀어내지 않게 한다 */
    compact?: boolean
    children: ReactNode
}

/**
 * Next.js dynamic() 청크 로딩 fallback과 이 게이트의 로딩 상태가 같은 박스를
 * 쓰도록 공유 — 두 단계가 시각적으로 이어 붙어 하나의 로딩 경험으로 보이게 한다.
 */
export function MapLoadingFallback({ height = '450px' }: { height?: string }) {
    return (
        <div style={{ height }} className="flex flex-col items-center justify-center bg-surface-muted">
            <LoadingSpinner message="지도를 불러오는 중..." />
        </div>
    )
}

/**
 * 지도를 표시할 수 없을 때의 안내 (UI_V2_CONTRACT.md §4.7).
 *
 * 지도가 실패해도 제보 피드는 계속 동작한다 — 이 안내는 지도 영역 안에만
 * 머물고, 모바일에서는 피드를 밀어내지 않도록 한 줄로 접힌다.
 * 사용자 문구에는 SDK 이름도, 환경 변수 이름도, 상태 코드도 넣지 않는다.
 */
export function MapUnavailableNotice({
    onRetry,
    compact = false,
}: {
    onRetry: () => void
    compact?: boolean
}) {
    if (compact) {
        return (
            <div
                role="status"
                className="flex items-center justify-between gap-3 bg-surface-muted px-4 py-3"
            >
                <span className="flex min-w-0 items-center gap-2 type-body-sm text-muted-foreground">
                    <MapPinOff className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">지금은 지도를 표시할 수 없어요</span>
                </span>
                <UiButton variant="outline" size="sm" className="shrink-0" onClick={onRetry}>
                    다시 시도
                </UiButton>
            </div>
        )
    }

    return (
        <div
            role="status"
            style={{ height: '240px' }}
            className="flex flex-col items-center justify-center gap-3 bg-surface-muted px-6 text-center"
        >
            <MapPinOff className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
            <div>
                <p className="type-h3">지금은 지도를 표시할 수 없어요</p>
                <p className="mt-1 type-body-sm text-muted-foreground">
                    아래 제보 목록은 그대로 확인할 수 있어요
                </p>
            </div>
            <UiButton variant="outline" size="sm" className="gap-2" onClick={onRetry}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                지도 다시 시도
            </UiButton>
        </div>
    )
}

/**
 * 지도를 마운트하기 전 단일 게이트 — 카카오 SDK 준비와 내 동네 좌표 확정을
 * 여기서 다 기다린 뒤에만 children(MapComponent)을 마운트한다.
 *
 * 지도 상태는 제보 데이터 상태와 독립적이다. 이 게이트가 실패해도 바깥의
 * 피드·검색·필터·제보하기는 계속 동작한다 (UI_V2_CONTRACT.md §8).
 */
export default function MapInitializationGate({
    isAuthInitialized,
    isLoadingProfile,
    adapter,
    height = '450px',
    compact = false,
    children,
}: MapInitializationGateProps) {
    const { status, retry } = useMapInitializationViewModel({
        isAuthInitialized,
        isLoadingProfile,
        adapter,
    })

    if (status === 'error') {
        return <MapUnavailableNotice onRetry={retry} compact={compact} />
    }

    if (status === 'loading') {
        return <MapLoadingFallback height={height} />
    }

    return <>{children}</>
}
