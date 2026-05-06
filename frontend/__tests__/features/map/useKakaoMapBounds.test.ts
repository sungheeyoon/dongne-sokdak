import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useKakaoMapBounds } from '@/features/map/presentation/hooks/useKakaoMapBounds'

describe('useKakaoMapBounds', () => {
    let mockMap: any
    let onBoundsChange: any

    beforeEach(() => {
        vi.useFakeTimers()
        onBoundsChange = vi.fn()
        mockMap = {
            getBounds: vi.fn().mockReturnValue({
                getSouthWest: () => ({ getLat: () => 37.4, getLng: () => 126.9 }),
                getNorthEast: () => ({ getLat: () => 37.6, getLng: () => 127.1 })
            }),
            getLevel: vi.fn().mockReturnValue(3),
            getCenter: vi.fn().mockReturnValue({
                getLat: () => 37.5,
                getLng: () => 127.0
            })
        }
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('should dispatch bounds update correctly', () => {
        const { result } = renderHook(() => useKakaoMapBounds(mockMap, onBoundsChange))
        
        act(() => {
            result.current.dispatchBoundsUpdate(true)
        })

        expect(onBoundsChange).toHaveBeenCalledWith(
            expect.objectContaining({
                south: 37.4,
                west: 126.9,
                north: 37.6,
                east: 127.1
            }),
            expect.objectContaining({
                lat: 37.5,
                lng: 127.0
            })
        )
    })

    it('should debounce non-immediate updates', () => {
        const { result } = renderHook(() => useKakaoMapBounds(mockMap, onBoundsChange))
        
        act(() => {
            result.current.handleMapBoundsChange()
        })

        expect(onBoundsChange).not.toHaveBeenCalled()

        act(() => {
            vi.advanceTimersByTime(200)
        })

        expect(onBoundsChange).toHaveBeenCalled()
    })

    it('should normalize coordinates based on zoom level', () => {
        // High zoom level (low precision)
        mockMap.getLevel.mockReturnValue(10)
        mockMap.getBounds.mockReturnValue({
            getSouthWest: () => ({ getLat: () => 37.444444, getLng: () => 126.999999 }),
            getNorthEast: () => ({ getLat: () => 37.666666, getLng: () => 127.111111 })
        })

        const { result } = renderHook(() => useKakaoMapBounds(mockMap, onBoundsChange))
        
        act(() => {
            result.current.dispatchBoundsUpdate(true)
        })

        // Level 10 should use precision 4
        expect(onBoundsChange).toHaveBeenCalledWith(
            expect.objectContaining({
                south: 37.4444,
                west: 127.0, // rounded
                north: 37.6667,
                east: 127.1111
            }),
            expect.anything()
        )
    })
})
