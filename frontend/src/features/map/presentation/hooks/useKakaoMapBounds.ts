import { useCallback, useRef, useState } from 'react'
import { KakaoMapAdapter, defaultKakaoMapAdapter } from '@/features/map/data/kakaoMapAdapter'

export interface MapBounds {
    north: number
    south: number
    east: number
    west: number
}

export function useKakaoMapBounds(
    map: any,
    onBoundsChange?: (bounds: MapBounds) => void,
    onZoomChange?: (zoom: number) => void,
    adapter: KakaoMapAdapter = defaultKakaoMapAdapter
) {
    const [currentBounds, setCurrentBounds] = useState<MapBounds | null>(null)
    // 마지막으로 "커밋"(재조회로 반영)된 영역과 지금 화면이 다른지 — true면 재검색 버튼을 노출한다
    const [isDirty, setIsDirty] = useState(false)
    const lastCommittedKeyRef = useRef<string | null>(null)
    const timeoutRefs = useRef<{ [key: string]: NodeJS.Timeout }>({})

    // Zoom에 따른 동적 정밀도 지원
    const precisionByZoom = useCallback((level: number) => {
        if (level <= 3) return 6
        if (level <= 6) return 5
        return 4
    }, [])

    const readBoundsKey = useCallback(() => {
        const bounds = adapter.getBounds(map)
        if (!bounds) return null

        const currentZoomLevel = adapter.getLevel(map)
        const precision = precisionByZoom(currentZoomLevel)
        const { south, west, north, east } = bounds
        const key = `${south.toFixed(precision)},${west.toFixed(precision)},${north.toFixed(precision)},${east.toFixed(precision)}`

        return { bounds, precision, key }
    }, [map, adapter, precisionByZoom])

    // 커밋: 실제로 상위(store)에 반영해 재조회를 일으킨다.
    // 최초 로드, 명시적 지도 초점 이동(검색·내 동네 복귀), "이 지역 재검색" 버튼 클릭에서만 호출된다 — ADR-0007 참고.
    const dispatchBoundsUpdate = useCallback((isImmediate = false) => {
        if (!map) return

        try {
            const read = readBoundsKey()
            if (!read) return
            const { bounds, precision, key: newKey } = read

            if (lastCommittedKeyRef.current === newKey) {
                setIsDirty(false)
                return
            }
            lastCommittedKeyRef.current = newKey

            const { south, west, north, east } = bounds
            const newBounds = {
                south: Number(south.toFixed(precision)),
                west: Number(west.toFixed(precision)),
                north: Number(north.toFixed(precision)),
                east: Number(east.toFixed(precision))
            }

            if (process.env.NODE_ENV === 'development') console.log(`🗺️ MapBounds: committed (${isImmediate ? 'immediate' : 'debounced'})`)

            setCurrentBounds(newBounds)
            setIsDirty(false)

            if (onBoundsChange) {
                onBoundsChange(newBounds)
            }
        } catch (error) {
            console.error('Map bounds calculation error:', error)
        }
    }, [map, onBoundsChange, readBoundsKey])

    // 추적: 드래그/줌으로 화면이 마지막 커밋 지점과 다른지만 표시한다. store는 건드리지 않는다 — 재조회는 일으키지 않는다.
    // 사용자가 드래그로 원래 커밋된 영역까지 되돌아오면 dirty도 다시 꺼진다.
    const markAreaDirty = useCallback(() => {
        if (!map) return

        try {
            const read = readBoundsKey()
            if (!read) return

            setIsDirty(read.key !== lastCommittedKeyRef.current)
        } catch (error) {
            console.error('Map bounds calculation error:', error)
        }
    }, [map, readBoundsKey])

    const handleMapBoundsChange = useCallback(() => {
        if (!map) return
        if (timeoutRefs.current.bounds) {
            clearTimeout(timeoutRefs.current.bounds)
        }
        timeoutRefs.current.bounds = setTimeout(() => {
            markAreaDirty()
        }, 200)
    }, [map, markAreaDirty])

    const handleDragEnd = useCallback(() => {
        markAreaDirty()
    }, [markAreaDirty])

    const handleZoomChange = useCallback(() => {
        if (!map) return

        if (timeoutRefs.current.zoom) {
            clearTimeout(timeoutRefs.current.zoom)
        }

        timeoutRefs.current.zoom = setTimeout(() => {
            try {
                const currentZoomLevel = adapter.getLevel(map)
                if (onZoomChange) {
                    onZoomChange(currentZoomLevel)
                }
                markAreaDirty()
            } catch (error) {
                console.error('Zoom level calculation error:', error)
            }
        }, 200)
    }, [map, onZoomChange, markAreaDirty, adapter])

    return {
        currentBounds,
        isDirty,
        dispatchBoundsUpdate,
        handleMapBoundsChange,
        handleDragEnd,
        handleZoomChange,
        precisionByZoom
    }
}
