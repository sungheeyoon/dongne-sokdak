'use client'

import { ReactNode } from 'react'
import LoadingSpinner from '@/shared/ui/LoadingSpinner'
import ErrorDisplay from '@/shared/ui/ErrorDisplay'
import { KakaoMapAdapter } from '@/features/map/data/kakaoMapAdapter'
import { useMapInitializationViewModel } from '@/features/map/presentation/hooks/useMapInitializationViewModel'

interface MapInitializationGateProps {
    isAuthInitialized: boolean
    isLoadingProfile: boolean
    adapter?: KakaoMapAdapter
    height?: string
    children: ReactNode
}

/**
 * Next.js dynamic() 청크 로딩 fallback과 이 게이트의 로딩 상태가 같은 박스를
 * 쓰도록 공유 — 두 단계가 시각적으로 이어 붙어 하나의 로딩 경험으로 보이게 한다.
 */
export function MapLoadingFallback({ height = '450px' }: { height?: string }) {
    return (
        <div style={{ height }} className="bg-gray-100 rounded-b-lg flex flex-col items-center justify-center">
            <LoadingSpinner message="지도를 불러오는 중..." />
        </div>
    )
}

/**
 * 지도를 마운트하기 전 단일 게이트 — 카카오 SDK 준비와 내 동네 좌표 확정을
 * 여기서 다 기다린 뒤에만 children(MapComponent)을 마운트한다. Next.js
 * dynamic() 청크 로딩 fallback과 동일한 LoadingSpinner/문구를 써서, 사용자
 * 눈에는 처음부터 끝까지 하나의 로딩 경험으로 보이게 한다.
 */
export default function MapInitializationGate({
    isAuthInitialized,
    isLoadingProfile,
    adapter,
    height = '450px',
    children,
}: MapInitializationGateProps) {
    const { status, errorMessage } = useMapInitializationViewModel({
        isAuthInitialized,
        isLoadingProfile,
        adapter,
    })

    if (status === 'error') {
        return (
            <div style={{ height }} className="rounded-b-lg overflow-hidden flex items-center justify-center bg-gray-50">
                <ErrorDisplay error={errorMessage ?? '지도를 불러오지 못했습니다'} title="지도를 불러올 수 없습니다" />
            </div>
        )
    }

    if (status === 'loading') {
        return <MapLoadingFallback height={height} />
    }

    return <>{children}</>
}
