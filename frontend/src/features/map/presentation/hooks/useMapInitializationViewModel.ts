import { useCallback, useEffect, useState } from 'react'
import { KakaoMapAdapter, defaultKakaoMapAdapter } from '@/features/map/data/kakaoMapAdapter'
import { debugLog } from '@/lib/utils/logger'

export type MapInitializationStatus = 'loading' | 'ready' | 'error'

type SdkState =
    | { status: 'loading' }
    | { status: 'ready' }
    | { status: 'error'; technicalReason: string }

export interface MapInitializationState {
    status: MapInitializationStatus
    /**
     * 실패 원인의 기술 상세. 개발 로그용이며 사용자 화면에 그대로 쓰지 않는다
     * (UI_V2_CONTRACT.md §4.7) — 주민에게 'Kakao SDK 로딩 실패'는 아무 의미도,
     * 다음 행동도 주지 못한다.
     */
    technicalReason: string | null
    /** 지도 초기화만 다시 시도한다 — 제보 조회 상태와 검색·필터 조건은 건드리지 않는다. */
    retry: () => void
}

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
}): MapInitializationState {
    const [sdkState, setSdkState] = useState<SdkState>({ status: 'loading' })
    const [attempt, setAttempt] = useState(0)

    const retry = useCallback(() => {
        setSdkState({ status: 'loading' })
        setAttempt((previous) => previous + 1)
    }, [])

    useEffect(() => {
        let cancelled = false

        const fail = (technicalReason: string) => {
            if (cancelled) return
            debugLog('🗺️ 지도 초기화 실패:', technicalReason)
            setSdkState({ status: 'error', technicalReason })
        }

        const apiKey = process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY
        if (!apiKey) {
            fail('NEXT_PUBLIC_KAKAO_MAP_API_KEY가 설정되지 않음')
            return
        }

        const initialize = async () => {
            try {
                const isReady = await adapter.ready()
                if (cancelled) return
                if (isReady) {
                    setSdkState({ status: 'ready' })
                    return
                }
                fail('Kakao SDK ready()가 false를 반환')
            } catch (error) {
                fail(`Kakao SDK 초기화 예외: ${error instanceof Error ? error.message : String(error)}`)
            }
        }

        const timer = setTimeout(initialize, 1000)
        return () => {
            cancelled = true
            clearTimeout(timer)
        }
    }, [adapter, attempt])

    if (sdkState.status === 'error') {
        return { status: 'error', technicalReason: sdkState.technicalReason, retry }
    }

    const profileReady = isAuthInitialized && !isLoadingProfile
    if (sdkState.status === 'ready' && profileReady) {
        return { status: 'ready', technicalReason: null, retry }
    }

    return { status: 'loading', technicalReason: null, retry }
}
