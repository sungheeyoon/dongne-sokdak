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

    it('should test precisionByZoom for mid level', () => {
        mockMap.getLevel.mockReturnValue(5)
        const { result } = renderHook(() => useKakaoMapBounds(mockMap, onBoundsChange))
        
        act(() => {
            result.current.dispatchBoundsUpdate(true)
        })

        // Level 5 should use precision 5
        expect(result.current.precisionByZoom(5)).toBe(5)
    })

    it('should call onZoomChange and dispatch update on handleZoomChange', () => {
        const onZoomChange = vi.fn()
        const { result } = renderHook(() => useKakaoMapBounds(mockMap, onBoundsChange, onZoomChange))
        
        act(() => {
            result.current.handleZoomChange()
        })

        // Should be debounced by 200ms
        expect(onZoomChange).not.toHaveBeenCalled()

        act(() => {
            vi.advanceTimersByTime(200)
        })

        expect(onZoomChange).toHaveBeenCalledWith(3)
        expect(onBoundsChange).toHaveBeenCalled()
    })

    it('should handle drag end', () => {
        const { result } = renderHook(() => useKakaoMapBounds(mockMap, onBoundsChange))
        
        act(() => {
            result.current.handleDragEnd()
        })

        expect(onBoundsChange).toHaveBeenCalled()
    })

    it('should handle errors in dispatchBoundsUpdate without crashing', () => {
        mockMap.getBounds.mockImplementation(() => { throw new Error('Bounds error') })
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

        const { result } = renderHook(() => useKakaoMapBounds(mockMap, onBoundsChange))
        
        expect(() => {
            act(() => {
                result.current.dispatchBoundsUpdate(true)
            })
        }).not.toThrow()

        expect(consoleErrorSpy).toHaveBeenCalledWith('Map bounds calculation error:', expect.any(Error))
        consoleErrorSpy.mockRestore()
    })

    it('should handle errors in handleZoomChange without crashing', () => {
        mockMap.getLevel.mockImplementation(() => { throw new Error('Zoom error') })
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

        const { result } = renderHook(() => useKakaoMapBounds(mockMap, onBoundsChange))
        
        act(() => {
            result.current.handleZoomChange()
        })

        act(() => {
            vi.advanceTimersByTime(200)
        })

        expect(consoleErrorSpy).toHaveBeenCalledWith('Zoom level calculation error:', expect.any(Error))
        consoleErrorSpy.mockRestore()
    })

    it('should not do anything if map is missing', () => {
        const { result } = renderHook(() => useKakaoMapBounds(null, onBoundsChange))
        
        act(() => {
            result.current.dispatchBoundsUpdate(true)
            result.current.handleMapBoundsChange()
            result.current.handleZoomChange()
        })

        act(() => {
            vi.advanceTimersByTime(200)
        })

        expect(onBoundsChange).not.toHaveBeenCalled()
    })
})
