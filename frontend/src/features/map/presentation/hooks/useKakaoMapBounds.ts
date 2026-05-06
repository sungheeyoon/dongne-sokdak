import { useCallback, useRef, useState } from 'react'

export interface MapBounds {
    north: number
    south: number
    east: number
    west: number
}

export function useKakaoMapBounds(
    map: any,
    onBoundsChange?: (bounds: MapBounds, center: { lat: number; lng: number }) => void,
    onZoomChange?: (zoom: number) => void
) {
    const [currentBounds, setCurrentBounds] = useState<MapBounds | null>(null)
    const lastBoundsKeyRef = useRef<string | null>(null)
    const timeoutRefs = useRef<{ [key: string]: NodeJS.Timeout }>({})

    // Zoom에 따른 동적 정밀도 지원
    const precisionByZoom = useCallback((level: number) => {
        if (level <= 3) return 6
        if (level <= 6) return 5
        return 4
    }, [])

    const dispatchBoundsUpdate = useCallback((isImmediate = false) => {
        if (!map) return

        try {
            const bounds = map.getBounds()
            if (!bounds) return

            const swLatLng = bounds.getSouthWest()
            const neLatLng = bounds.getNorthEast()

            const currentZoomLevel = map.getLevel()
            const precision = precisionByZoom(currentZoomLevel)

            const south = swLatLng.getLat()
            const west = swLatLng.getLng()
            const north = neLatLng.getLat()
            const east = neLatLng.getLng()

            const newKey = `${south.toFixed(precision)},${west.toFixed(precision)},${north.toFixed(precision)},${east.toFixed(precision)}`

            if (lastBoundsKeyRef.current === newKey) return
            lastBoundsKeyRef.current = newKey

            const newBounds = {
                south: Number(south.toFixed(precision)),
                west: Number(west.toFixed(precision)),
                north: Number(north.toFixed(precision)),
                east: Number(east.toFixed(precision))
            }

            const mapCenter = map.getCenter()
            const newCenter = {
                lat: mapCenter.getLat(),
                lng: mapCenter.getLng()
            }

            if (process.env.NODE_ENV === 'development') {
                console.log(`🗺️ MapBounds: updated (${isImmediate ? 'immediate' : 'debounced'}) [Zoom: ${currentZoomLevel}]`)
            }

            setCurrentBounds(newBounds)

            if (onBoundsChange) {
                onBoundsChange(newBounds, newCenter)
            }
        } catch (error) {
            console.error('Map bounds calculation error:', error)
        }
    }, [map, onBoundsChange, precisionByZoom])

    const handleMapBoundsChange = useCallback(() => {
        if (!map) return
        if (timeoutRefs.current.bounds) {
            clearTimeout(timeoutRefs.current.bounds)
        }
        timeoutRefs.current.bounds = setTimeout(() => {
            dispatchBoundsUpdate(false)
        }, 200)
    }, [map, dispatchBoundsUpdate])

    const handleDragEnd = useCallback(() => {
        dispatchBoundsUpdate(true)
    }, [dispatchBoundsUpdate])

    const handleZoomChange = useCallback(() => {
        if (!map) return

        if (timeoutRefs.current.zoom) {
            clearTimeout(timeoutRefs.current.zoom)
        }

        timeoutRefs.current.zoom = setTimeout(() => {
            try {
                const currentZoomLevel = map.getLevel()
                if (onZoomChange) {
                    onZoomChange(currentZoomLevel)
                }
                dispatchBoundsUpdate(true)
            } catch (error) {
                console.error('Zoom level calculation error:', error)
            }
        }, 200)
    }, [map, onZoomChange, dispatchBoundsUpdate])

    return {
        currentBounds,
        dispatchBoundsUpdate,
        handleMapBoundsChange,
        handleDragEnd,
        handleZoomChange,
        precisionByZoom
    }
}
