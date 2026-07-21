import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { useEffect, useRef } from 'react'
import MapComponent from '@/features/map/presentation/components/MapComponent'

vi.mock('react-kakao-maps-sdk', () => ({
  Map: ({ children, onCreate }: any) => {
    const fakeMap = useRef({})
    useEffect(() => {
      onCreate?.(fakeMap.current)
    }, [onCreate])
    return <div data-testid="kakao-map">{children}</div>
  }
}))

vi.mock('@/features/map/presentation/hooks/useLocationViewModel', () => ({
  useLocationViewModel: () => ({ reverseGeocode: vi.fn() })
}))

const mockUseKakaoMapBounds = vi.fn()
vi.mock('@/features/map/presentation/hooks/useKakaoMapBounds', () => ({
  useKakaoMapBounds: (...args: any[]) => mockUseKakaoMapBounds(...args)
}))

vi.mock('@/features/map/presentation/components/MapMarkerLayer', () => ({
  MapMarkerLayer: () => <div data-testid="marker-layer" />
}))

describe('MapComponent', () => {
  beforeEach(() => {
    mockUseKakaoMapBounds.mockReturnValue({
      currentBounds: null,
      isDirty: false,
      isFarFromHome: false,
      dispatchBoundsUpdate: vi.fn(),
      handleMapBoundsChange: vi.fn(),
      handleDragEnd: vi.fn(),
      handleZoomChange: vi.fn()
    })
  })

  afterEach(() => {
    delete (window as any).kakao
  })

  it('renders the map immediately — SDK readiness is handled upstream by MapInitializationGate', async () => {
    const adapter = { ready: vi.fn(), panTo: vi.fn(), getCenter: vi.fn(() => ({ lat: 0, lng: 0 })) }

    render(<MapComponent reports={[]} adapter={adapter as any} />)

    expect(screen.getByTestId('kakao-map')).toBeInTheDocument()
    expect(adapter.ready).not.toHaveBeenCalled()
  })

  it('re-pans when the requested center matches the last requested one but the user dragged the map away in between (내 동네로 돌아가기)', async () => {
    const neighborhood = { lat: 37.5, lng: 127.0 }
    let actualMapCenter = { ...neighborhood }
    const adapter = {
      panTo: vi.fn((_map: any, lat: number, lng: number) => { actualMapCenter = { lat, lng } }),
      getCenter: vi.fn(() => actualMapCenter)
    }

    const { rerender } = render(<MapComponent reports={[]} center={neighborhood} adapter={adapter as any} />)
    expect(screen.getByTestId('kakao-map')).toBeInTheDocument()
    // 마운트 단계의 center-effect가 최소 한 번 실행될 때까지 기다려 baseline을 확정한다
    // (getCenter 호출은 effect가 실제로 돌았다는 결정적 신호 — panTo 호출 여부와 무관하게 항상 일어난다).
    await waitFor(() => expect(adapter.getCenter).toHaveBeenCalled())
    adapter.panTo.mockClear()

    // 사용자가 지도를 드래그해서 다른 곳으로 이동 — center prop(요청값)은 그대로,
    // 실제 지도 위치만 바뀐다.
    actualMapCenter = { lat: 37.6, lng: 127.1 }

    // "내 동네로 돌아가기" 클릭 — 동일한 동네 좌표로 다시 focus (새 객체 참조, 값은 동일)
    rerender(<MapComponent reports={[]} center={{ ...neighborhood }} adapter={adapter as any} />)

    await waitFor(() => expect(adapter.panTo).toHaveBeenCalledWith(expect.anything(), neighborhood.lat, neighborhood.lng))
  }, 10000)

  it('cancels a stale pending commit when the center changes again before it settles (repeated "내 동네로 돌아가기" clicks)', async () => {
    vi.useFakeTimers()
    try {
      const home = { lat: 37.5, lng: 127.0 }
      // 실제 Kakao panTo는 비동기 애니메이션이라 호출 직후에도 getCenter는 여전히 이전 위치를
      // 반환한다 — 그래서 patTo를 호출해도 지도의 실제 중심은 즉시 바뀌지 않는다고 가정한다.
      const actualMapCenter = { lat: 37.9, lng: 127.4 } // 사용자가 드래그로 멀어져 있는 상태
      const adapter = {
        panTo: vi.fn(),
        getCenter: vi.fn(() => actualMapCenter)
      }
      const dispatchBoundsUpdate = vi.fn()
      mockUseKakaoMapBounds.mockReturnValue({
        currentBounds: null,
        isDirty: false,
        isFarFromHome: true,
        dispatchBoundsUpdate,
        handleMapBoundsChange: vi.fn(),
        handleDragEnd: vi.fn(),
        handleZoomChange: vi.fn()
      })

      const { rerender } = render(<MapComponent reports={[]} center={home} adapter={adapter as any} />)

      // 마운트 시 "최초 1회 커밋" effect(map ready)가 별도로 dispatchBoundsUpdate를 호출한다 —
      // 이 시나리오와 무관하므로 걷어내고, 여기서부터 center-effect의 pan-settle 타이머만 관찰한다.
      await act(async () => { await Promise.resolve() })
      dispatchBoundsUpdate.mockClear()
      adapter.panTo.mockClear()

      // 300ms 뒤(아직 애니메이션 도중), 사용자가 다시 클릭 — 같은 좌표지만 새 객체 참조
      act(() => { vi.advanceTimersByTime(300) })
      rerender(<MapComponent reports={[]} center={{ ...home }} adapter={adapter as any} />)
      expect(adapter.panTo).toHaveBeenCalledTimes(1)

      // 1차 타이머가 원래 만료됐을 시점(총 500ms)에도 아직 커밋되면 안 된다 — cleanup으로 취소됐어야 함
      act(() => { vi.advanceTimersByTime(200) }) // 총 500ms 경과
      expect(dispatchBoundsUpdate).not.toHaveBeenCalled()

      // 2차 타이머(재실행 시점 기준 500ms)가 만료되면 정확히 한 번만 커밋된다
      act(() => { vi.advanceTimersByTime(300) }) // 2차 기준 총 500ms 경과
      expect(dispatchBoundsUpdate).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('bubbles isFarFromHome up via onFarFromHomeChange for the page-level "내 동네로 돌아가기" button', () => {
    mockUseKakaoMapBounds.mockReturnValue({
      currentBounds: null,
      isDirty: false,
      isFarFromHome: true,
      dispatchBoundsUpdate: vi.fn(),
      handleMapBoundsChange: vi.fn(),
      handleDragEnd: vi.fn(),
      handleZoomChange: vi.fn()
    })
    const adapter = { panTo: vi.fn(), getCenter: vi.fn(() => ({ lat: 0, lng: 0 })) }
    const onFarFromHomeChange = vi.fn()

    render(<MapComponent reports={[]} adapter={adapter as any} onFarFromHomeChange={onFarFromHomeChange} />)

    expect(onFarFromHomeChange).toHaveBeenCalledWith(true)
  })

  it('passes myNeighborhoodLocation through to useKakaoMapBounds as the home coordinate', () => {
    const adapter = { panTo: vi.fn(), getCenter: vi.fn(() => ({ lat: 0, lng: 0 })) }
    const home = { lat: 37.1, lng: 127.2 }

    render(<MapComponent reports={[]} adapter={adapter as any} myNeighborhoodLocation={home} />)

    expect(mockUseKakaoMapBounds).toHaveBeenCalledWith(
      expect.anything(),
      undefined,
      undefined,
      adapter,
      home
    )
  })

  it('shows the floating "이 지역 재검색" button only when the area is dirty, and commits on click', () => {
    const adapter = { panTo: vi.fn(), getCenter: vi.fn(() => ({ lat: 0, lng: 0 })) }
    const dispatchBoundsUpdate = vi.fn()

    mockUseKakaoMapBounds.mockReturnValue({
      currentBounds: null,
      isDirty: true,
      dispatchBoundsUpdate,
      handleMapBoundsChange: vi.fn(),
      handleDragEnd: vi.fn(),
      handleZoomChange: vi.fn()
    })

    render(<MapComponent reports={[]} adapter={adapter as any} />)

    const button = screen.getByRole('button', { name: /이 지역 재검색/ })
    expect(button).toBeInTheDocument()

    button.click()
    expect(dispatchBoundsUpdate).toHaveBeenCalledWith(true)
  })

  it('hides the floating re-search button when the area is not dirty', () => {
    const adapter = { panTo: vi.fn(), getCenter: vi.fn(() => ({ lat: 0, lng: 0 })) }

    render(<MapComponent reports={[]} adapter={adapter as any} />)

    expect(screen.queryByRole('button', { name: /이 지역 재검색/ })).not.toBeInTheDocument()
  })
})
