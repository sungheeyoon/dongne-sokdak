import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useKakaoMapBounds } from '@/features/map/presentation/hooks/useKakaoMapBounds'

describe('useKakaoMapBounds', () => {
    let mockMap: any
    let onBoundsChange: any
    let adapter: any

    beforeEach(() => {
        vi.useFakeTimers()
        onBoundsChange = vi.fn()
        mockMap = {}
        adapter = {
            getBounds: vi.fn().mockReturnValue({ south: 37.4, west: 126.9, north: 37.6, east: 127.1 }),
            getLevel: vi.fn().mockReturnValue(3)
        }
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('should commit bounds via dispatchBoundsUpdate', () => {
        const { result } = renderHook(() => useKakaoMapBounds(mockMap, onBoundsChange, undefined, adapter))

        act(() => {
            result.current.dispatchBoundsUpdate(true)
        })

        expect(onBoundsChange).toHaveBeenCalledWith(
            expect.objectContaining({
                south: 37.4,
                west: 126.9,
                north: 37.6,
                east: 127.1
            })
        )
        expect(result.current.isDirty).toBe(false)
    })

    it('should normalize coordinates based on zoom level', () => {
        // High zoom level (low precision)
        adapter.getLevel.mockReturnValue(10)
        adapter.getBounds.mockReturnValue({
            south: 37.444444, west: 126.999999, north: 37.666666, east: 127.111111
        })

        const { result } = renderHook(() => useKakaoMapBounds(mockMap, onBoundsChange, undefined, adapter))

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
            })
        )
    })

    it('should test precisionByZoom for mid level', () => {
        adapter.getLevel.mockReturnValue(5)
        const { result } = renderHook(() => useKakaoMapBounds(mockMap, onBoundsChange, undefined, adapter))

        act(() => {
            result.current.dispatchBoundsUpdate(true)
        })

        // Level 5 should use precision 5
        expect(result.current.precisionByZoom(5)).toBe(5)
    })

    it('handleDragEnd only marks the area dirty — it must not commit or refetch', () => {
        const { result } = renderHook(() => useKakaoMapBounds(mockMap, onBoundsChange, undefined, adapter))

        // 최초 커밋(예: map-ready)이 있었다고 가정
        act(() => {
            result.current.dispatchBoundsUpdate(true)
        })
        onBoundsChange.mockClear()

        // 사용자가 드래그해서 다른 영역으로 이동
        adapter.getBounds.mockReturnValue({ south: 38.4, west: 127.9, north: 38.6, east: 128.1 })

        act(() => {
            result.current.handleDragEnd()
        })

        expect(onBoundsChange).not.toHaveBeenCalled()
        expect(result.current.isDirty).toBe(true)
        // currentBounds(뷰포트 컬링 기준)도 커밋 전까지는 그대로 얼어 있어야 한다
        expect(result.current.currentBounds).toEqual(
            expect.objectContaining({ south: 37.4, west: 126.9, north: 37.6, east: 127.1 })
        )
    })

    it('dragging back to the last committed area clears the dirty flag without a fetch', () => {
        const { result } = renderHook(() => useKakaoMapBounds(mockMap, onBoundsChange, undefined, adapter))

        act(() => {
            result.current.dispatchBoundsUpdate(true)
        })
        onBoundsChange.mockClear()

        adapter.getBounds.mockReturnValue({ south: 38.4, west: 127.9, north: 38.6, east: 128.1 })
        act(() => {
            result.current.handleDragEnd()
        })
        expect(result.current.isDirty).toBe(true)

        // 다시 원래 영역으로 드래그해 돌아옴
        adapter.getBounds.mockReturnValue({ south: 37.4, west: 126.9, north: 37.6, east: 127.1 })
        act(() => {
            result.current.handleDragEnd()
        })

        expect(result.current.isDirty).toBe(false)
        expect(onBoundsChange).not.toHaveBeenCalled()
    })

    it('should debounce handleMapBoundsChange (generic bounds_changed) and only mark dirty, never commit', () => {
        const { result } = renderHook(() => useKakaoMapBounds(mockMap, onBoundsChange, undefined, adapter))

        act(() => {
            result.current.dispatchBoundsUpdate(true)
        })
        onBoundsChange.mockClear()

        adapter.getBounds.mockReturnValue({ south: 38.4, west: 127.9, north: 38.6, east: 128.1 })

        act(() => {
            result.current.handleMapBoundsChange()
        })

        expect(result.current.isDirty).toBe(false)

        act(() => {
            vi.advanceTimersByTime(200)
        })

        expect(result.current.isDirty).toBe(true)
        expect(onBoundsChange).not.toHaveBeenCalled()
    })

    it('should call onZoomChange and mark dirty on handleZoomChange without committing', () => {
        const onZoomChange = vi.fn()
        const { result } = renderHook(() => useKakaoMapBounds(mockMap, onBoundsChange, onZoomChange, adapter))

        act(() => {
            result.current.dispatchBoundsUpdate(true)
        })
        onBoundsChange.mockClear()

        adapter.getBounds.mockReturnValue({ south: 38.4, west: 127.9, north: 38.6, east: 128.1 })

        act(() => {
            result.current.handleZoomChange()
        })

        // Should be debounced by 200ms
        expect(onZoomChange).not.toHaveBeenCalled()

        act(() => {
            vi.advanceTimersByTime(200)
        })

        expect(onZoomChange).toHaveBeenCalledWith(3)
        expect(result.current.isDirty).toBe(true)
        expect(onBoundsChange).not.toHaveBeenCalled()
    })

    it('should handle errors in dispatchBoundsUpdate without crashing', () => {
        adapter.getBounds.mockImplementation(() => { throw new Error('Bounds error') })
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

        const { result } = renderHook(() => useKakaoMapBounds(mockMap, onBoundsChange, undefined, adapter))

        expect(() => {
            act(() => {
                result.current.dispatchBoundsUpdate(true)
            })
        }).not.toThrow()

        expect(consoleErrorSpy).toHaveBeenCalledWith('Map bounds calculation error:', expect.any(Error))
        consoleErrorSpy.mockRestore()
    })

    it('should handle errors in handleDragEnd without crashing', () => {
        adapter.getBounds.mockImplementation(() => { throw new Error('Bounds error') })
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

        const { result } = renderHook(() => useKakaoMapBounds(mockMap, onBoundsChange, undefined, adapter))

        expect(() => {
            act(() => {
                result.current.handleDragEnd()
            })
        }).not.toThrow()

        expect(consoleErrorSpy).toHaveBeenCalledWith('Map bounds calculation error:', expect.any(Error))
        consoleErrorSpy.mockRestore()
    })

    it('should handle errors in handleZoomChange without crashing', () => {
        adapter.getLevel.mockImplementation(() => { throw new Error('Zoom error') })
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

        const { result } = renderHook(() => useKakaoMapBounds(mockMap, onBoundsChange, undefined, adapter))

        act(() => {
            result.current.handleZoomChange()
        })

        act(() => {
            vi.advanceTimersByTime(200)
        })

        expect(consoleErrorSpy).toHaveBeenCalledWith('Zoom level calculation error:', expect.any(Error))
        consoleErrorSpy.mockRestore()
    })

    it('defaults isFarFromHome to false when no homeLocation is given', () => {
        const { result } = renderHook(() => useKakaoMapBounds(mockMap, onBoundsChange, undefined, adapter))

        act(() => {
            result.current.dispatchBoundsUpdate(true)
        })

        expect(result.current.isFarFromHome).toBe(false)
    })

    it('marks isFarFromHome true once the committed bounds center is over 500m from home', () => {
        // bounds center ≈ (37.5, 127.0); home far away in Busan
        const home = { lat: 35.1796, lng: 129.0756 }
        const { result } = renderHook(() => useKakaoMapBounds(mockMap, onBoundsChange, undefined, adapter, home))

        act(() => {
            result.current.dispatchBoundsUpdate(true)
        })

        expect(result.current.isFarFromHome).toBe(true)
    })

    it('keeps isFarFromHome false when the committed bounds center is within 500m of home', () => {
        // bounds: south 37.4, west 126.9, north 37.6, east 127.1 → center (37.5, 127.0)
        const home = { lat: 37.5, lng: 127.0 }
        const { result } = renderHook(() => useKakaoMapBounds(mockMap, onBoundsChange, undefined, adapter, home))

        act(() => {
            result.current.dispatchBoundsUpdate(true)
        })

        expect(result.current.isFarFromHome).toBe(false)
    })

    it('recomputes isFarFromHome on drag (handleDragEnd) without requiring a commit', () => {
        const home = { lat: 37.5, lng: 127.0 }
        const { result } = renderHook(() => useKakaoMapBounds(mockMap, onBoundsChange, undefined, adapter, home))

        act(() => {
            result.current.dispatchBoundsUpdate(true)
        })
        expect(result.current.isFarFromHome).toBe(false)

        // 사용자가 홈에서 먼 지역(부산 인근)으로 드래그
        adapter.getBounds.mockReturnValue({ south: 35.08, west: 128.98, north: 35.28, east: 129.18 })

        act(() => {
            result.current.handleDragEnd()
        })

        expect(result.current.isFarFromHome).toBe(true)
    })

    it('should not do anything if map is missing', () => {
        const { result } = renderHook(() => useKakaoMapBounds(null, onBoundsChange, undefined, adapter))

        act(() => {
            result.current.dispatchBoundsUpdate(true)
            result.current.handleMapBoundsChange()
            result.current.handleDragEnd()
            result.current.handleZoomChange()
        })

        act(() => {
            vi.advanceTimersByTime(200)
        })

        expect(onBoundsChange).not.toHaveBeenCalled()
        expect(result.current.isDirty).toBe(false)
    })
})
