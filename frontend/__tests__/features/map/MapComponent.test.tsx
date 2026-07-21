import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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
      dispatchBoundsUpdate: vi.fn(),
      handleMapBoundsChange: vi.fn(),
      handleDragEnd: vi.fn(),
      handleZoomChange: vi.fn()
    })
  })

  afterEach(() => {
    delete (window as any).kakao
  })

  it('renders the map once the injected adapter reports the SDK is ready, without touching window.kakao', async () => {
    process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY = 'test-key'
    const adapter = { ready: vi.fn().mockResolvedValue(true), panTo: vi.fn(), getCenter: vi.fn(() => ({ lat: 0, lng: 0 })) }

    render(<MapComponent reports={[]} adapter={adapter as any} />)

    expect(screen.getByText(/지도.*로딩 중/)).toBeInTheDocument()

    await waitFor(() => expect(screen.getByTestId('kakao-map')).toBeInTheDocument(), { timeout: 3000 })
    expect(adapter.ready).toHaveBeenCalled()
  }, 10000)

  it('shows an error when the injected adapter reports the SDK failed to load', async () => {
    process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY = 'test-key'
    const adapter = { ready: vi.fn().mockResolvedValue(false) }

    render(<MapComponent reports={[]} adapter={adapter as any} />)

    await waitFor(() => expect(screen.getByText('지도 로드 실패')).toBeInTheDocument(), { timeout: 3000 })
  }, 10000)

  it('re-pans when the requested center matches the last requested one but the user dragged the map away in between (내 동네로 돌아가기)', async () => {
    process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY = 'test-key'
    const neighborhood = { lat: 37.5, lng: 127.0 }
    let actualMapCenter = { ...neighborhood }
    const adapter = {
      ready: vi.fn().mockResolvedValue(true),
      panTo: vi.fn((_map: any, lat: number, lng: number) => { actualMapCenter = { lat, lng } }),
      getCenter: vi.fn(() => actualMapCenter)
    }

    const { rerender } = render(<MapComponent reports={[]} center={neighborhood} adapter={adapter as any} />)
    await waitFor(() => expect(screen.getByTestId('kakao-map')).toBeInTheDocument(), { timeout: 3000 })
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

  it('shows the floating "이 지역 재검색" button only when the area is dirty, and commits on click', async () => {
    process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY = 'test-key'
    const adapter = { ready: vi.fn().mockResolvedValue(true), panTo: vi.fn(), getCenter: vi.fn(() => ({ lat: 0, lng: 0 })) }
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
    await waitFor(() => expect(screen.getByTestId('kakao-map')).toBeInTheDocument(), { timeout: 3000 })

    const button = screen.getByRole('button', { name: /이 지역 재검색/ })
    expect(button).toBeInTheDocument()

    button.click()
    expect(dispatchBoundsUpdate).toHaveBeenCalledWith(true)
  }, 10000)

  it('hides the floating re-search button when the area is not dirty', async () => {
    process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY = 'test-key'
    const adapter = { ready: vi.fn().mockResolvedValue(true), panTo: vi.fn(), getCenter: vi.fn(() => ({ lat: 0, lng: 0 })) }

    render(<MapComponent reports={[]} adapter={adapter as any} />)
    await waitFor(() => expect(screen.getByTestId('kakao-map')).toBeInTheDocument(), { timeout: 3000 })

    expect(screen.queryByRole('button', { name: /이 지역 재검색/ })).not.toBeInTheDocument()
  }, 10000)
})
