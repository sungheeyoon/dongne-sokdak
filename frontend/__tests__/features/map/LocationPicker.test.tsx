import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { useEffect, useRef } from 'react'
import LocationPicker from '@/features/map/presentation/components/LocationPicker'

vi.mock('react-kakao-maps-sdk', () => ({
  Map: ({ children, onCreate }: any) => {
    const fakeMap = useRef({})
    useEffect(() => {
      onCreate?.(fakeMap.current)
    }, [onCreate])
    return <div data-testid="kakao-map">{children}</div>
  },
  MapMarker: () => null
}))

vi.mock('@/features/map/presentation/hooks/useLocationViewModel', () => ({
  useLocationViewModel: () => ({ reverseGeocode: vi.fn().mockResolvedValue('테스트 주소') })
}))

describe('LocationPicker', () => {
  afterEach(() => {
    delete (window as any).kakao
  })

  it('renders the map once the injected adapter reports the SDK is ready, without touching window.kakao', async () => {
    const adapter = { ready: vi.fn().mockResolvedValue(true), addListener: vi.fn(), removeListener: vi.fn() }

    render(<LocationPicker onLocationSelect={vi.fn()} adapter={adapter as any} />)

    expect(screen.getByText('지도를 불러오는 중...')).toBeInTheDocument()

    await waitFor(() => expect(screen.getByTestId('kakao-map')).toBeInTheDocument(), { timeout: 3000 })
    expect(adapter.ready).toHaveBeenCalled()
  }, 10000)

  it('registers center_changed/dragend listeners via the adapter and removes them on unmount', async () => {
    const adapter = { ready: vi.fn().mockResolvedValue(true), addListener: vi.fn(), removeListener: vi.fn() }

    const { unmount } = render(<LocationPicker onLocationSelect={vi.fn()} adapter={adapter as any} />)

    await waitFor(() => expect(screen.getByTestId('kakao-map')).toBeInTheDocument(), { timeout: 3000 })
    await waitFor(() => expect(adapter.addListener).toHaveBeenCalledWith(expect.anything(), 'center_changed', expect.any(Function)))
    expect(adapter.addListener).toHaveBeenCalledWith(expect.anything(), 'dragend', expect.any(Function))

    unmount()

    expect(adapter.removeListener).toHaveBeenCalledWith(expect.anything(), 'center_changed', expect.any(Function))
    expect(adapter.removeListener).toHaveBeenCalledWith(expect.anything(), 'dragend', expect.any(Function))
  }, 10000)

  it('recenters via adapter.setCenter when going to the current location', async () => {
    const adapter = {
      ready: vi.fn().mockResolvedValue(true),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      setCenter: vi.fn()
    }

    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (success: PositionCallback) => {
          success({ coords: { latitude: 37.55, longitude: 127.05 } } as GeolocationPosition)
        }
      }
    })

    render(<LocationPicker onLocationSelect={vi.fn()} adapter={adapter as any} />)

    // "kakao-map" appears as soon as <Map> mounts, but the map instance itself
    // (and LocationPicker's `map` state) is only set once its onCreate effect
    // fires a tick later — wait for that, or the click below races a null map.
    await waitFor(() => expect(adapter.addListener).toHaveBeenCalledWith(expect.anything(), 'center_changed', expect.any(Function)), { timeout: 3000 })

    const button = screen.getByTitle('현재 위치로 이동')
    fireEvent.click(button)

    await waitFor(() => expect(adapter.setCenter).toHaveBeenCalledWith(expect.anything(), 37.55, 127.05), { timeout: 3000 })
  }, 10000)
})
