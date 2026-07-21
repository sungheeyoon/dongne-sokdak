import { useEffect, useState } from 'react'
import { KakaoMapAdapter, defaultKakaoMapAdapter } from '@/features/map/data/kakaoMapAdapter'

export type MapInitializationStatus = 'loading' | 'ready' | 'error'

type SdkState =
    | { status: 'loading' }
    | { status: 'ready' }
    | { status: 'error'; errorMessage: string }

/**
 * 지도를 마운트하기 전에 통과해야 하는 단일 게이트 — 카카오 SDK 준비와 내 동네
 * 좌표(프로필) 확정을 병렬로 기다린다. 이 훅이 'ready'를 반환하기 전까지는
 * MapComponent를 마운트하지 않음으로써, 지도가 뜬 뒤 좌표가 다시 튀는 것을
 * 막는다 — 좌표 자체는 useMapFocusViewModel(ADR-0003)이 이미 동결해 둔 값을 쓴다.
 */
export function useMapInitializationViewModel({
    isAuthInitialized,
    isLoadingProfile,
    adapter = defaultKakaoMapAdapter,
}: {
    isAuthInitialized: boolean
    isLoadingProfile: boolean
    adapter?: KakaoMapAdapter
}): { status: MapInitializationStatus; errorMessage: string | null } {
    const [sdkState, setSdkState] = useState<SdkState>({ status: 'loading' })

    useEffect(() => {
        let cancelled = false

        const apiKey = process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY
        if (!apiKey) {
            setSdkState({ status: 'error', errorMessage: '카카오맵 API 키가 설정되지 않았습니다' })
            return
        }

        const initialize = async () => {
            try {
                const isReady = await adapter.ready()
                if (cancelled) return
                setSdkState(
                    isReady
                        ? { status: 'ready' }
                        : { status: 'error', errorMessage: '카카오 SDK 로딩 실패' }
                )
            } catch {
                if (!cancelled) setSdkState({ status: 'error', errorMessage: '카카오맵 초기화 오류' })
            }
        }

        const timer = setTimeout(initialize, 1000)
        return () => {
            cancelled = true
            clearTimeout(timer)
        }
    }, [adapter])

    if (sdkState.status === 'error') {
        return { status: 'error', errorMessage: sdkState.errorMessage }
    }

    const profileReady = isAuthInitialized && !isLoadingProfile
    if (sdkState.status === 'ready' && profileReady) {
        return { status: 'ready', errorMessage: null }
    }

    return { status: 'loading', errorMessage: null }
}
