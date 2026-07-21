import { useEffect, useMemo, useState } from 'react'
import { getActiveLocation } from '@/lib/map/getActiveLocation'

type LatLng = { lat: number; lng: number }

const DEFAULT_CENTER: LatLng = { lat: 37.5665, lng: 126.9780 }

/**
 * 지도 초점(mapFocus) 계산 — CONTEXT.md, ADR-0003 참고.
 * "최초 로드 1회 → 내 동네" fallback은 프로필 로딩이 끝난 시점이 아니라
 * auth 세션 복구가 끝난 시점을 기준으로 얼려야 한다 — 그 전에는 profile
 * 쿼리가 enabled: false로 대기 중이라 isLoadingProfile이 false로 뜨는 것을
 * "로딩 완료"로 오인하기 때문 (ADR-0003 Consequences 참고).
 */
export function useMapFocusViewModel({
    focusedLocation,
    myNeighborhoodLocation,
    userCurrentLocation,
    isAuthInitialized,
    isLoadingProfile,
}: {
    focusedLocation: LatLng | null
    myNeighborhoodLocation: LatLng | null
    userCurrentLocation: LatLng | null
    isAuthInitialized: boolean
    isLoadingProfile: boolean
}): LatLng {
    const [isInitialLoadDone, setIsInitialLoadDone] = useState(false)
    const [frozenFallbackCenter, setFrozenFallbackCenter] = useState<LatLng | null>(null)

    useEffect(() => {
        if (!isInitialLoadDone && isAuthInitialized && !isLoadingProfile) {
            setFrozenFallbackCenter(myNeighborhoodLocation)
            setIsInitialLoadDone(true)
        }
    }, [isAuthInitialized, isLoadingProfile, myNeighborhoodLocation, isInitialLoadDone])

    return useMemo(() => getActiveLocation({
        focusedLocation,
        isInitialLoadDone,
        myNeighborhoodLocation,
        userCurrentLocation,
        fallbackCenter: frozenFallbackCenter || DEFAULT_CENTER,
    }), [focusedLocation, isInitialLoadDone, myNeighborhoodLocation, userCurrentLocation, frozenFallbackCenter])
}
