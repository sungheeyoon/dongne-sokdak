'use client'

import { useCallback, useSyncExternalStore } from 'react'

/**
 * 미디어 쿼리를 JS에서 읽는다.
 *
 * 홈은 모바일에서 지도를 아예 마운트하지 않는다 (UI_V2_CONTRACT.md §7.3) —
 * CSS로 숨기기만 하면 보이지 않는 지도가 SDK를 초기화하고 고정 높이 패널을
 * 그대로 차지하기 때문이다. 그래서 표현 분기를 CSS가 아니라 여기서 한다.
 *
 * 서버 스냅샷은 항상 false다. 모바일 우선 레이아웃이 먼저 그려지고,
 * 데스크톱에서는 하이드레이션 직후 한 번 넓은 레이아웃으로 확정된다.
 */
export function useMediaQuery(query: string): boolean {
    const subscribe = useCallback(
        (onStoreChange: () => void) => {
            if (typeof window === 'undefined' || !window.matchMedia) return () => undefined

            const list = window.matchMedia(query)
            list.addEventListener('change', onStoreChange)
            return () => list.removeEventListener('change', onStoreChange)
        },
        [query]
    )

    const getSnapshot = useCallback(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return false
        return window.matchMedia(query).matches
    }, [query])

    return useSyncExternalStore(subscribe, getSnapshot, () => false)
}

/** 데스크톱 브레이크포인트 — UI_V2_CONTRACT.md §7.1 */
export function useIsDesktop(): boolean {
    return useMediaQuery('(min-width: 1024px)')
}
