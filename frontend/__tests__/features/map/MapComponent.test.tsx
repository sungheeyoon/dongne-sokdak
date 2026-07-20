import { describe, it, expect, vi, afterEach } from 'vitest'
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

vi.mock('@/features/map/presentation/hooks/useKakaoMapBounds', () => ({
  useKakaoMapBounds: () => ({
    currentBounds: null,
    dispatchBoundsUpdate: vi.fn(),
    handleMapBoundsChange: vi.fn(),
    handleDragEnd: vi.fn(),
    handleZoomChange: vi.fn()
  })
}))

vi.mock('@/features/map/presentation/components/MapMarkerLayer', () => ({
  MapMarkerLayer: () => <div data-testid="marker-layer" />
}))

describe('MapComponent', () => {
  afterEach(() => {
    delete (window as any).kakao
  })

  it('renders the map once the injected adapter reports the SDK is ready, without touching window.kakao', async () => {
    process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY = 'test-key'
    const adapter = { ready: vi.fn().mockResolvedValue(true), panTo: vi.fn() }

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
})
